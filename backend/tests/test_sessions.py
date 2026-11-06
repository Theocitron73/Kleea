"""Appareils connectés : révocation, isolation entre comptes, anciens jetons et absence de la table."""
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

os.environ["DATABASE_URL"] = "postgresql://test:test@127.0.0.1:1/test"
os.environ["JWT_SECRET_KEY"] = "secret-de-test-suffisamment-long-pour-hs256"
os.environ["GEMINI_API_KEY"] = "test"
os.environ.pop("IBAN_ENCRYPTION_KEY", None)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.stdout.reconfigure(encoding="utf-8")

import jwt  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, event, text  # noqa: E402
from sqlalchemy.exc import OperationalError  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import aide  # noqa: E402
from aide import partout  # noqa: E402
import main  # noqa: E402

SESSIONS = "/api/sessions"
AUTRES = "/api/sessions/revoquer-autres"
DECONNEXION = "/api/sessions/deconnexion"
SONDE = "/auth/test-token"
CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1"
MOT_DE_PASSE = "motdepasse1"


def ancien_jeton(utilisateur):
    """Un jeton tel qu'émis avant cette fonction : aucun identifiant de session."""
    return {"Authorization": f"Bearer {aide.create_access_token({'sub': utilisateur, 'role': 'user'})}"}


class Base(unittest.TestCase):
    TABLE = True

    def setUp(self):
        self.moteur = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        empreinte = aide.hash_password(MOT_DE_PASSE)
        with self.moteur.begin() as conn:
            conn.execute(text("CREATE TABLE banned_ips (ip TEXT, banned_until TIMESTAMP)"))
            conn.execute(text("CREATE TABLE login_failed_attempts (ip TEXT, attempted_at TIMESTAMP)"))
            conn.execute(text("CREATE TABLE users (username TEXT, email TEXT, password TEXT, role TEXT, name TEXT, powens_token TEXT, import_mode TEXT)"))
            conn.execute(text("CREATE TABLE streamdeck_tokens (utilisateur TEXT, token_hash TEXT, created_at TEXT)"))
            for nom in ("Theo", "aude"):
                conn.execute(
                    text("INSERT INTO users (username, email, password, role) VALUES (:n, :e, :p, 'user')"),
                    {"n": nom, "e": f"{nom}@kleea.test", "p": empreinte},
                )
            if self.TABLE:
                conn.execute(text("""
                    CREATE TABLE sessions_connexion (
                        id TEXT PRIMARY KEY, utilisateur TEXT NOT NULL, appareil TEXT NOT NULL, cree_le TIMESTAMP NOT NULL,
                        derniere_activite TIMESTAMP NOT NULL, revoquee_le TIMESTAMP
                    )
                """))
        patcher = partout("engine", self.moteur)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = TestClient(main.app)

    def connexion(self, nom="Theo", navigateur=CHROME):
        reponse = self.client.post("/login", json={"nom": nom, "password": MOT_DE_PASSE}, headers={"User-Agent": navigateur})
        self.assertEqual(reponse.status_code, 200, reponse.text)
        return {"Authorization": f"Bearer {reponse.json()['access_token']}"}

    def sessions(self, entetes):
        return self.client.get(SESSIONS, headers=entetes).json()["sessions"]

    def identifiants(self, entetes):
        return {s["appareil"]: s["id"] for s in self.sessions(entetes)}

    def accepte(self, entetes):
        return self.client.get(SONDE, headers=entetes).status_code == 200


class Liste(Base):
    def test_sans_jeton_tout_est_refuse(self):
        self.assertEqual(self.client.get(SESSIONS).status_code, 401)
        self.assertEqual(self.client.post(AUTRES).status_code, 401)
        self.assertEqual(self.client.post(DECONNEXION).status_code, 401)
        self.assertEqual(self.client.delete(f"{SESSIONS}/x").status_code, 401)

    def test_la_connexion_ouvre_une_session_signalee_comme_actuelle(self):
        ici = self.connexion()
        self.connexion(navigateur=IPHONE)
        reponse = self.client.get(SESSIONS, headers=ici).json()
        self.assertTrue(reponse["disponible"])
        self.assertTrue(reponse["session_suivie"])
        self.assertEqual(
            [(s["appareil"], s["actuelle"]) for s in reponse["sessions"]],
            [("Chrome sur Windows", True), ("Safari sur iPhone", False)],
        )

    def test_l_inscription_ouvre_aussi_une_session(self):
        reponse = self.client.post("/register", json={
            "nom": "Nina", "email": "nina@kleea.test", "password": MOT_DE_PASSE, "first_name": "N", "last_name": "A",
        }, headers={"User-Agent": IPHONE})
        self.assertEqual(reponse.status_code, 200, reponse.text)
        entetes = {"Authorization": f"Bearer {reponse.json()['access_token']}"}
        self.assertEqual([s["appareil"] for s in self.sessions(entetes)], ["Safari sur iPhone"])

    def test_seul_le_minimum_est_conserve(self):
        reponse = self.client.post(
            "/login", json={"nom": "Theo", "password": MOT_DE_PASSE},
            headers={"User-Agent": CHROME, "X-Forwarded-For": "203.0.113.42"},
        )
        jeton = reponse.json()["access_token"]
        with self.moteur.connect() as conn:
            ligne = conn.execute(text("SELECT * FROM sessions_connexion")).mappings().one()
        self.assertEqual(set(ligne), {"id", "utilisateur", "appareil", "cree_le", "derniere_activite", "revoquee_le"})
        contenu = " ".join(str(v) for v in ligne.values())
        self.assertNotIn(jeton, contenu)
        self.assertNotIn("203.0.113", contenu)
        self.assertNotIn("Mozilla", contenu)

    def test_les_sessions_expirees_ne_sont_plus_listees(self):
        ici = self.connexion()
        self.connexion(navigateur=IPHONE)
        vieux = datetime.now(timezone.utc) - timedelta(days=aide.ACCESS_TOKEN_EXPIRE_DAYS + 1)
        with self.moteur.begin() as conn:
            conn.execute(text("UPDATE sessions_connexion SET cree_le = :v WHERE appareil = 'Safari sur iPhone'"), {"v": vieux})
        self.assertEqual([s["appareil"] for s in self.sessions(ici)], ["Chrome sur Windows"])

    def test_la_purge_retire_les_lignes_expirees_seulement(self):
        self.connexion()
        self.connexion(navigateur=IPHONE)
        vieux = datetime.now(timezone.utc) - timedelta(days=aide.ACCESS_TOKEN_EXPIRE_DAYS + 2)
        with self.moteur.begin() as conn:
            conn.execute(text("UPDATE sessions_connexion SET cree_le = :v WHERE appareil = 'Safari sur iPhone'"), {"v": vieux})
        aide.purger_sessions_expirees()
        with self.moteur.connect() as conn:
            self.assertEqual([r[0] for r in conn.execute(text("SELECT appareil FROM sessions_connexion"))], ["Chrome sur Windows"])


class Revocation(Base):
    def test_une_session_revoquee_est_refusee_des_la_requete_suivante(self):
        ici = self.connexion()
        ailleurs = self.connexion(navigateur=IPHONE)
        self.assertTrue(self.accepte(ailleurs))

        cible = self.identifiants(ici)["Safari sur iPhone"]
        self.assertEqual(self.client.delete(f"{SESSIONS}/{cible}", headers=ici).status_code, 200)

        refus = self.client.get(SONDE, headers=ailleurs)
        self.assertEqual(refus.status_code, 401)
        self.assertEqual(refus.json()["detail"], aide.SESSION_DECONNECTEE)
        self.assertTrue(self.accepte(ici))
        self.assertEqual([s["appareil"] for s in self.sessions(ici)], ["Chrome sur Windows"])

    def test_revoquer_toutes_les_autres_garde_la_session_actuelle(self):
        ici = self.connexion()
        autres = [self.connexion(navigateur=IPHONE), self.connexion(navigateur=IPHONE)]
        reponse = self.client.post(AUTRES, headers=ici)
        self.assertEqual(reponse.json()["revoquees"], 2)
        self.assertTrue(self.accepte(ici))
        for entetes in autres:
            self.assertFalse(self.accepte(entetes))

    def test_revoquer_deux_fois_repond_introuvable(self):
        ici = self.connexion()
        self.connexion(navigateur=IPHONE)
        cible = self.identifiants(ici)["Safari sur iPhone"]
        self.assertEqual(self.client.delete(f"{SESSIONS}/{cible}", headers=ici).status_code, 200)
        self.assertEqual(self.client.delete(f"{SESSIONS}/{cible}", headers=ici).status_code, 404)

    def test_se_deconnecter_revoque_sa_propre_session(self):
        ici = self.connexion()
        self.assertEqual(self.client.post(DECONNEXION, headers=ici).status_code, 200)
        self.assertFalse(self.accepte(ici))

    def test_une_session_inconnue_est_refusee(self):
        # Par exemple après la suppression du compte : le jeton est valide, mais sa ligne n'existe plus.
        entetes = {"Authorization": f"Bearer {aide.create_access_token({'sub': 'theo', 'sid': 'inconnue'})}"}
        self.assertEqual(self.client.get(SONDE, headers=entetes).status_code, 401)

    def test_supprimer_le_compte_coupe_ses_sessions_et_efface_ses_lignes(self):
        ici = self.connexion()
        ailleurs = self.connexion(navigateur=IPHONE)
        aude = self.connexion("aude")
        self.assertEqual(self.client.delete("/profile/theo", headers=ici).status_code, 200)
        self.assertFalse(self.accepte(ailleurs))
        self.assertTrue(self.accepte(aude))
        with self.moteur.connect() as conn:
            self.assertEqual([r[0] for r in conn.execute(text("SELECT utilisateur FROM sessions_connexion"))], ["aude"])

    def test_une_session_d_un_autre_nom_est_refusee(self):
        self.connexion("aude")
        with self.moteur.connect() as conn:
            sid_aude = conn.execute(text("SELECT id FROM sessions_connexion")).scalar()
        entetes = {"Authorization": f"Bearer {aide.create_access_token({'sub': 'theo', 'sid': sid_aude})}"}
        self.assertEqual(self.client.get(SONDE, headers=entetes).status_code, 401)


class IsolationEntreComptes(Base):
    def setUp(self):
        super().setUp()
        self.theo = self.connexion("Theo")
        self.aude = self.connexion("aude", navigateur=IPHONE)
        self.sid_aude = self.sessions(self.aude)[0]["id"]

    def test_la_liste_ne_montre_que_ses_propres_sessions(self):
        self.assertEqual([s["appareil"] for s in self.sessions(self.theo)], ["Chrome sur Windows"])
        self.assertEqual([s["appareil"] for s in self.sessions(self.aude)], ["Safari sur iPhone"])

    def test_on_ne_peut_pas_revoquer_la_session_d_un_autre(self):
        self.assertEqual(self.client.delete(f"{SESSIONS}/{self.sid_aude}", headers=self.theo).status_code, 404)
        self.assertTrue(self.accepte(self.aude))

    def test_tout_revoquer_ne_touche_pas_les_autres_comptes(self):
        self.client.post(AUTRES, headers=self.theo)
        self.assertTrue(self.accepte(self.aude))
        self.assertEqual(len(self.sessions(self.aude)), 1)


class AnciensJetons(Base):
    def test_un_jeton_sans_identifiant_reste_accepte(self):
        self.assertTrue(self.accepte(ancien_jeton("theo")))

    def test_un_ancien_jeton_ne_touche_pas_la_table(self):
        requetes = []
        event.listen(self.moteur, "before_cursor_execute", lambda _c, _cur, sql, *_: requetes.append(sql))
        self.client.get(SONDE, headers=ancien_jeton("theo"))
        self.assertFalse([sql for sql in requetes if "sessions_connexion" in sql])

    def test_un_ancien_jeton_peut_lister_et_tout_deconnecter(self):
        suivie = self.connexion()
        ancien = ancien_jeton("theo")
        reponse = self.client.get(SESSIONS, headers=ancien).json()
        self.assertFalse(reponse["session_suivie"])
        self.assertEqual([s["actuelle"] for s in reponse["sessions"]], [False])
        self.assertEqual(self.client.post(AUTRES, headers=ancien).json()["revoquees"], 1)
        self.assertFalse(self.accepte(suivie))
        self.assertTrue(self.accepte(ancien))

    def test_un_ancien_jeton_expire_reste_refuse(self):
        expire = jwt.encode(
            {"sub": "theo", "exp": datetime.now(timezone.utc) - timedelta(seconds=1)}, aide.SECRET_KEY, algorithm=aide.ALGORITHM,
        )
        self.assertEqual(self.client.get(SONDE, headers={"Authorization": f"Bearer {expire}"}).status_code, 401)

    def test_un_jeton_mal_signe_avec_identifiant_est_refuse(self):
        faux = jwt.encode({"sub": "theo", "sid": "x"}, "autre-secret-suffisamment-long-pour-hs256", algorithm="HS256")
        self.assertEqual(self.client.get(SONDE, headers={"Authorization": f"Bearer {faux}"}).status_code, 401)


class TableAbsente(Base):
    TABLE = False

    def test_la_connexion_fonctionne_et_le_jeton_n_a_pas_d_identifiant(self):
        reponse = self.client.post("/login", json={"nom": "Theo", "password": MOT_DE_PASSE})
        self.assertEqual(reponse.status_code, 200, reponse.text)
        contenu = jwt.decode(reponse.json()["access_token"], aide.SECRET_KEY, algorithms=[aide.ALGORITHM])
        self.assertNotIn("sid", contenu)
        self.assertEqual(contenu["sub"], "Theo")
        self.assertEqual(reponse.json()["user"], "Theo")

    def test_le_jeton_obtenu_ouvre_les_routes(self):
        self.assertTrue(self.accepte(self.connexion()))

    def test_l_inscription_fonctionne(self):
        reponse = self.client.post("/register", json={
            "nom": "Nina", "email": "nina@kleea.test", "password": MOT_DE_PASSE, "first_name": "N", "last_name": "A",
        })
        self.assertEqual(reponse.status_code, 200, reponse.text)

    def test_les_anciens_jetons_passent(self):
        self.assertTrue(self.accepte(ancien_jeton("theo")))

    def test_les_routes_repondent_proprement(self):
        ici = self.connexion()
        self.assertEqual(self.client.get(SESSIONS, headers=ici).json(), {"disponible": False, "session_suivie": False, "sessions": []})
        self.assertEqual(self.client.post(AUTRES, headers=ici).status_code, 503)
        self.assertEqual(self.client.delete(f"{SESSIONS}/x", headers=ici).status_code, 503)
        self.assertEqual(self.client.post(DECONNEXION, headers=ici).status_code, 200)

    def test_un_jeton_avec_identifiant_passe_si_la_table_a_disparu(self):
        # Par exemple après un retour en arrière de la migration : personne n'est enfermé dehors.
        entetes = {"Authorization": f"Bearer {aide.create_access_token({'sub': 'theo', 'sid': 'abc'})}"}
        self.assertTrue(self.accepte(entetes))

    def test_supprimer_le_compte_reste_possible(self):
        ici = self.connexion()
        self.assertEqual(self.client.delete("/profile/theo", headers=ici).status_code, 200)

    def test_la_purge_ne_leve_pas_d_erreur(self):
        aide.purger_sessions_expirees()


class PanneDeLaBase(Base):
    def test_une_panne_pendant_la_verification_ne_deconnecte_personne(self):
        ici = self.connexion()
        panne = mock.MagicMock()
        panne.connect.side_effect = OperationalError("SELECT", {}, Exception("panne"))
        with partout("engine", panne):
            self.assertTrue(self.accepte(ici))


class DerniereActivite(Base):
    def ecritures(self):
        ecritures = []

        def noter(_conn, _curseur, sql, *_):
            if sql.lstrip().upper().startswith("UPDATE SESSIONS_CONNEXION"):
                ecritures.append(sql)

        event.listen(self.moteur, "before_cursor_execute", noter)
        return ecritures

    def activite(self):
        with self.moteur.connect() as conn:
            return aide.en_utc(conn.execute(text("SELECT derniere_activite FROM sessions_connexion")).scalar())

    def vieillir(self, minutes):
        date = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        with self.moteur.begin() as conn:
            conn.execute(text("UPDATE sessions_connexion SET derniere_activite = :d"), {"d": date})
        return date

    def test_une_session_recente_n_ecrit_rien(self):
        ici = self.connexion()
        ecritures = self.ecritures()
        for _ in range(10):
            self.assertTrue(self.accepte(ici))
        self.assertEqual(ecritures, [])

    def test_une_seule_ecriture_apres_le_delai(self):
        ici = self.connexion()
        ancienne = self.vieillir(6)
        ecritures = self.ecritures()
        for _ in range(10):
            self.assertTrue(self.accepte(ici))
        self.assertEqual(len(ecritures), 1)
        self.assertGreater(self.activite(), ancienne)

    def test_juste_avant_le_delai_rien_n_est_ecrit(self):
        ici = self.connexion()
        ancienne = self.vieillir(4)
        self.assertTrue(self.accepte(ici))
        self.assertEqual(self.activite(), ancienne)


class Appareil(unittest.TestCase):
    def test_noms_lisibles(self):
        cas = {
            CHROME: "Chrome sur Windows",
            IPHONE: "Safari sur iPhone",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15": "Safari sur macOS",
            "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0": "Firefox sur Linux",
            "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36 Edg/120.0": "Edge sur Windows",
            "Mozilla/5.0 (Linux; Android 14) Chrome/120.0 Mobile Safari/537.36": "Chrome sur Android",
            "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) CriOS/120.0 Mobile Safari/604.1": "Chrome sur iPad",
            "curl/8.0": "Appareil inconnu",
            "": "Appareil inconnu",
            None: "Appareil inconnu",
        }
        for agent, attendu in cas.items():
            self.assertEqual(aide.appareil_lisible(agent), attendu, agent)

    def test_le_nom_tient_dans_la_colonne(self):
        noms = [f"{n} sur {s}" for _, n in aide.NAVIGATEURS for _, s in aide.SYSTEMES]
        self.assertLessEqual(max(len(nom) for nom in noms), 80)


class AccesIndependants(Base):
    """Les jetons Stream Deck et la route de maintenance ne dépendent pas des sessions."""

    def test_revoquer_les_sessions_laisse_le_jeton_stream_deck_valide(self):
        ici = self.connexion()
        jeton = self.client.post("/api/streamdeck/token", headers=ici).json()["token"]
        self.assertEqual(self.client.post(DECONNEXION, headers=ici).status_code, 200)
        self.assertEqual(aide.get_streamdeck_user(jeton), "theo")

    def test_le_jeton_stream_deck_n_ouvre_pas_les_routes_de_session(self):
        ici = self.connexion()
        jeton = self.client.post("/api/streamdeck/token", headers=ici).json()["token"]
        self.assertEqual(self.client.get(SESSIONS, headers={"X-Streamdeck-Token": jeton}).status_code, 401)
        self.assertEqual(self.client.get(SESSIONS, headers={"Authorization": f"Bearer {jeton}"}).status_code, 401)

    def test_la_route_de_maintenance_ne_demande_pas_de_session(self):
        with mock.patch.dict(os.environ, {"MAINTENANCE_API_KEY": "le-bon-secret"}):
            bonne_cle = self.client.post("/maintenance/sync-all", headers={"X-Maintenance-Key": "le-bon-secret"})
            jeton_seul = self.client.post("/maintenance/sync-all", headers=self.connexion())
        self.assertNotIn(bonne_cle.status_code, {401, 403}, bonne_cle.text)
        self.assertIn(jeton_seul.status_code, {401, 403})


if __name__ == "__main__":
    unittest.main()
