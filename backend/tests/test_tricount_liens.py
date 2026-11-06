"""Liens de partage du Tricount : refus sur chaque route, gestion par le seul propriétaire et historique."""
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

os.environ["DATABASE_URL"] = "postgresql://test:test@127.0.0.1:1/test"
os.environ["JWT_SECRET_KEY"] = "secret-de-test-suffisamment-long-pour-hs256"
os.environ["GEMINI_API_KEY"] = "test"
os.environ.pop("IBAN_ENCRYPTION_KEY", None)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import aide  # noqa: E402
from aide import partout  # noqa: E402
import main  # noqa: E402

GROUPE = "Vacances"
DEPENSE = {"date": "2026-11-03", "libelle": "Train", "paye_par": "Aude", "pour_qui": "Aude:10,Theo:10", "montant": 20}
GESTION = [
    ("post", "/share-group/{u}/" + GROUPE),
    ("get", "/get-share-token/{u}/" + GROUPE),
    ("post", "/revoke-share/{u}/" + GROUPE),
    ("post", "/regenerate-share/{u}/" + GROUPE),
    ("get", "/share-history/{u}/" + GROUPE),
]


def entetes(utilisateur):
    return {"Authorization": f"Bearer {aide.create_access_token({'sub': utilisateur})}"}


class Base(unittest.TestCase):
    def setUp(self):
        self.moteur = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        with self.moteur.begin() as conn:
            conn.execute(text("CREATE TABLE banned_ips (ip TEXT, banned_until TIMESTAMP)"))
            conn.execute(text("""
                CREATE TABLE tricount (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, date TIMESTAMP, libelle TEXT, paye_par TEXT, pour_qui TEXT,
                    montant REAL, groupe TEXT, utilisateur TEXT, emoji TEXT, token_partage TEXT
                )
            """))
            conn.execute(text("""
                CREATE TABLE tricount_liens (
                    token TEXT PRIMARY KEY, utilisateur TEXT NOT NULL, groupe TEXT NOT NULL,
                    expire_le TIMESTAMP, revoque_le TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("""
                CREATE TABLE tricount_historique (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, utilisateur TEXT NOT NULL, groupe TEXT NOT NULL,
                    action TEXT NOT NULL, depense_id INTEGER, auteur TEXT, ancienne_valeur TEXT,
                    nouvelle_valeur TEXT, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))
        patcher = partout("engine", self.moteur)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = TestClient(main.app)
        self.theo = entetes("theo")
        self.aude = entetes("aude")
        self.depense_id = self.inserer("Courses")

    def inserer(self, libelle, groupe=GROUPE, utilisateur="theo", token=None):
        with self.moteur.begin() as conn:
            return conn.execute(text("""
                INSERT INTO tricount (date, libelle, paye_par, pour_qui, montant, groupe, utilisateur, token_partage)
                VALUES ('2026-11-02 00:00:00', :l, 'Aude', 'Aude:10,Theo:20', 30, :g, :u, :t) RETURNING id
            """), {"l": libelle, "g": groupe, "u": utilisateur, "t": token}).scalar()

    def lien(self, duree=30):
        reponse = self.client.post(f"/share-group/theo/{GROUPE}", json={"duree_jours": duree}, headers=self.theo)
        self.assertEqual(reponse.status_code, 200, reponse.text)
        return reponse.json()

    def expirer(self, token):
        passe = datetime.now(timezone.utc) - timedelta(minutes=1)
        with self.moteur.begin() as conn:
            conn.execute(text("UPDATE tricount_liens SET expire_le = :e WHERE token = :t"), {"e": passe, "t": token})

    def lignes(self, requete, **valeurs):
        with self.moteur.connect() as conn:
            return conn.execute(text(requete), valeurs).mappings().all()

    def historique(self):
        reponse = self.client.get(f"/share-history/theo/{GROUPE}", headers=self.theo)
        self.assertEqual(reponse.status_code, 200, reponse.text)
        return reponse.json()["historique"]

    def routes_partagees(self, token):
        """Chaque route accessible sans compte. Une route ajoutée ici doit refuser comme les autres."""
        return [
            ("lecture", lambda: self.client.get(f"/get-shared-tricount/{token}")),
            ("ajout", lambda: self.client.post(f"/save-shared-transaction/{token}", json=DEPENSE)),
            ("modification", lambda: self.client.put(f"/update-shared-transaction/{token}", json={**DEPENSE, "id": self.depense_id})),
            ("suppression", lambda: self.client.delete(f"/delete-shared-transaction/{token}/{self.depense_id}")),
            ("pdf", lambda: self.client.get(f"/download-shared-pdf/{token}")),
        ]

    def verifier_refus(self, token, statut, code):
        depenses = self.lignes("SELECT id, libelle, montant FROM tricount ORDER BY id")
        for nom, appel in self.routes_partagees(token):
            with self.subTest(route=nom):
                reponse = appel()
                self.assertEqual(reponse.status_code, statut, reponse.text)
                self.assertEqual(reponse.json()["detail"]["code"], code)
                # Rien ne fuite du groupe ni de son propriétaire.
                self.assertNotIn(GROUPE, reponse.text)
                self.assertNotIn("theo", reponse.text)
        self.assertEqual(self.lignes("SELECT id, libelle, montant FROM tricount ORDER BY id"), depenses)
        self.assertEqual(self.historique(), [])


class Refus(Base):
    def test_toutes_les_routes_fonctionnent_avec_un_lien_valide(self):
        token = self.lien()["token"]
        for nom, appel in self.routes_partagees(token):
            with self.subTest(route=nom):
                self.assertEqual(appel().status_code, 200)

    def test_mauvais_jeton(self):
        self.lien()
        self.verifier_refus("jeton-inconnu", 404, "lien_introuvable")

    def test_lien_expire(self):
        token = self.lien()["token"]
        self.expirer(token)
        self.verifier_refus(token, 410, "lien_expire")

    def test_lien_revoque(self):
        token = self.lien()["token"]
        self.assertEqual(self.client.post(f"/revoke-share/theo/{GROUPE}", headers=self.theo).json()["token"], None)
        self.verifier_refus(token, 410, "lien_revoque")

    def test_lien_remplace(self):
        ancien = self.lien()["token"]
        nouveau = self.client.post(f"/regenerate-share/theo/{GROUPE}", json={"duree_jours": 7}, headers=self.theo).json()["token"]
        self.assertNotEqual(ancien, nouveau)
        self.assertEqual(self.client.get(f"/get-shared-tricount/{nouveau}").status_code, 200)
        self.verifier_refus(ancien, 410, "lien_revoque")

    def test_une_depense_d_un_autre_groupe_reste_refusee(self):
        token = self.lien()["token"]
        autre = self.inserer("Autre", groupe="Autre", token="jeton-autre")
        self.assertEqual(self.client.put(f"/update-shared-transaction/{token}", json={**DEPENSE, "id": autre}).status_code, 403)
        self.assertEqual(self.client.delete(f"/delete-shared-transaction/{token}/{autre}").status_code, 403)
        self.assertEqual(self.lignes("SELECT libelle FROM tricount WHERE id = :i", i=autre)[0]["libelle"], "Autre")
        self.assertEqual(self.historique(), [])


class LiensDejaPartages(Base):
    """Un jeton posé avant les expirations n'a aucune règle : il reste valable jusqu'à ce que le propriétaire agisse."""

    def setUp(self):
        super().setUp()
        with self.moteur.begin() as conn:
            conn.execute(text("UPDATE tricount SET token_partage = 'ancien-jeton'"))

    def test_il_fonctionne_sur_toutes_les_routes_sans_expiration(self):
        lecture = self.client.get("/get-shared-tricount/ancien-jeton")
        self.assertEqual(lecture.status_code, 200)
        self.assertIsNone(lecture.json()["expire_le"])
        for nom, appel in self.routes_partagees("ancien-jeton"):
            with self.subTest(route=nom):
                self.assertEqual(appel().status_code, 200)

    def test_le_proprietaire_le_voit_sans_date_limite(self):
        etat = self.client.get(f"/get-share-token/theo/{GROUPE}", headers=self.theo).json()
        self.assertEqual(etat, {"token": "ancien-jeton", "expire_le": None, "statut": "actif"})
        # Rouvrir le partage sans rien choisir ne lui impose pas de durée.
        self.assertIsNone(self.client.post(f"/share-group/theo/{GROUPE}", headers=self.theo).json()["expire_le"])

    def test_une_duree_garde_le_meme_lien_et_l_expiration_s_applique(self):
        lien = self.lien(7)
        self.assertEqual(lien["token"], "ancien-jeton")
        self.assertIsNotNone(lien["expire_le"])
        self.expirer("ancien-jeton")
        self.verifier_refus("ancien-jeton", 410, "lien_expire")

    def test_il_peut_etre_revoque(self):
        self.client.post(f"/revoke-share/theo/{GROUPE}", headers=self.theo)
        self.verifier_refus("ancien-jeton", 410, "lien_revoque")


class Gestion(Base):
    def test_sans_session_tout_est_refuse(self):
        for methode, chemin in GESTION:
            with self.subTest(route=chemin):
                self.assertEqual(getattr(self.client, methode)(chemin.format(u="theo")).status_code, 401)

    def test_seul_le_proprietaire_gere_le_lien_et_lit_l_historique(self):
        token = self.lien()["token"]
        self.client.put(f"/update-shared-transaction/{token}", json={**DEPENSE, "id": self.depense_id})
        for methode, chemin in GESTION:
            with self.subTest(route=chemin):
                reponse = getattr(self.client, methode)(chemin.format(u="theo"), headers=self.aude)
                self.assertEqual(reponse.status_code, 403)
        self.assertEqual(self.client.get(f"/get-shared-tricount/{token}").status_code, 200)

    def test_un_autre_compte_n_atteint_pas_un_groupe_de_meme_nom(self):
        token = self.lien()["token"]
        self.client.put(f"/update-shared-transaction/{token}", json={**DEPENSE, "id": self.depense_id})
        self.assertEqual(self.client.post(f"/revoke-share/aude/{GROUPE}", headers=self.aude).status_code, 200)
        self.assertEqual(self.client.get(f"/get-shared-tricount/{token}").status_code, 200)
        self.assertEqual(self.client.get(f"/share-history/aude/{GROUPE}", headers=self.aude).json()["historique"], [])

    def test_le_jeton_du_lien_de_partage_ne_donne_pas_acces_a_la_gestion(self):
        token = self.lien()["token"]
        self.assertEqual(self.client.get(f"/share-history/theo/{GROUPE}", headers={"Authorization": f"Bearer {token}"}).status_code, 401)

    def test_la_duree_choisie_est_appliquee(self):
        for jours in (7, 30, 90, 365):
            with self.subTest(jours=jours):
                expire_le = datetime.fromisoformat(self.lien(jours)["expire_le"])
                ecart = expire_le - datetime.now(timezone.utc)
                self.assertLess(abs(ecart - timedelta(days=jours)), timedelta(minutes=1))

    def test_une_duree_hors_liste_est_refusee(self):
        for duree in (0, -1, 8, 100000, "toujours"):
            with self.subTest(duree=duree):
                reponse = self.client.post(f"/share-group/theo/{GROUPE}", json={"duree_jours": duree}, headers=self.theo)
                self.assertEqual(reponse.status_code, 422)

    def test_un_nouveau_lien_sans_duree_a_quand_meme_une_limite(self):
        lien = self.client.post(f"/share-group/theo/{GROUPE}", headers=self.theo).json()
        self.assertIsNotNone(lien["expire_le"])

    def test_changer_la_duree_garde_le_lien(self):
        premier = self.lien(7)
        second = self.lien(90)
        self.assertEqual(premier["token"], second["token"])
        self.assertGreater(second["expire_le"], premier["expire_le"])

    def test_un_lien_expire_ne_revit_pas(self):
        ancien = self.lien()["token"]
        self.expirer(ancien)
        etat = self.client.get(f"/get-share-token/theo/{GROUPE}", headers=self.theo).json()
        self.assertEqual((etat["token"], etat["statut"]), (ancien, "expire"))
        nouveau = self.lien(7)
        self.assertNotEqual(nouveau["token"], ancien)
        self.assertEqual(nouveau["statut"], "actif")
        self.assertEqual(self.client.get(f"/get-shared-tricount/{ancien}").status_code, 410)

    def test_apres_revocation_le_groupe_n_a_plus_de_lien(self):
        self.lien()
        self.client.post(f"/revoke-share/theo/{GROUPE}", headers=self.theo)
        self.assertEqual(self.client.get(f"/get-share-token/theo/{GROUPE}", headers=self.theo).json()["token"], None)
        self.assertEqual(self.lignes("SELECT token_partage FROM tricount")[0]["token_partage"], None)

    def test_une_depense_ajoutee_apres_revocation_ne_reprend_pas_l_ancien_jeton(self):
        token = self.lien()["token"]
        self.client.post(f"/revoke-share/theo/{GROUPE}", headers=self.theo)
        corps = {**DEPENSE, "utilisateur": "theo", "groupe": GROUPE, "token_partage": token}
        self.assertEqual(self.client.post("/save-tricount", json=corps, headers=self.theo).status_code, 200)
        self.assertEqual({l["token_partage"] for l in self.lignes("SELECT token_partage FROM tricount")}, {None})

    def test_un_compte_ne_peut_pas_se_greffer_sur_le_lien_d_un_autre(self):
        token = self.lien()["token"]
        corps = {**DEPENSE, "libelle": "Intrus", "utilisateur": "aude", "groupe": "Le sien", "token_partage": token}
        self.assertEqual(self.client.post("/save-tricount", json=corps, headers=self.aude).status_code, 200)
        libelles = [t["libelle"] for t in self.client.get(f"/get-shared-tricount/{token}").json()["transactions"]]
        self.assertNotIn("Intrus", libelles)

    def test_un_lien_ne_se_cree_pas_pour_un_groupe_inconnu(self):
        self.assertEqual(self.client.post("/share-group/theo/Inconnu", headers=self.theo).status_code, 404)
        self.assertEqual(self.client.post("/regenerate-share/theo/Inconnu", headers=self.theo).status_code, 404)
        self.assertEqual(self.lignes("SELECT * FROM tricount_liens WHERE groupe = 'Inconnu'"), [])

    def test_renommer_le_groupe_garde_le_lien_ses_regles_et_l_historique(self):
        token = self.lien()["token"]
        self.client.put(f"/update-shared-transaction/{token}", json={**DEPENSE, "id": self.depense_id})
        corps = {"userId": "theo", "oldName": GROUPE, "newName": "Été"}
        self.assertEqual(self.client.put("/rename-group", json=corps, headers=self.theo).status_code, 200)
        self.assertEqual(self.client.get(f"/get-shared-tricount/{token}").json()["groupe"], "Été")
        self.assertEqual(len(self.client.get("/share-history/theo/Été", headers=self.theo).json()["historique"]), 1)
        self.client.post("/revoke-share/theo/Été", headers=self.theo)
        self.assertEqual(self.client.get(f"/get-shared-tricount/{token}").status_code, 410)

    def test_supprimer_le_groupe_efface_ses_liens_et_son_historique(self):
        token = self.lien()["token"]
        self.client.put(f"/update-shared-transaction/{token}", json={**DEPENSE, "id": self.depense_id})
        self.client.delete(f"/delete-group/theo/{GROUPE}", headers=self.theo)
        self.assertEqual(self.lignes("SELECT * FROM tricount_liens"), [])
        self.assertEqual(self.lignes("SELECT * FROM tricount_historique"), [])
        self.inserer("Recréé")
        self.assertEqual(self.client.get(f"/get-shared-tricount/{token}").status_code, 404)
        self.assertEqual(self.historique(), [])

    def test_le_dernier_depart_d_un_groupe_vide_rend_le_lien_introuvable(self):
        token = self.lien()["token"]
        self.client.delete(f"/delete-shared-transaction/{token}/{self.depense_id}")
        self.assertEqual(self.client.get(f"/get-shared-tricount/{token}").status_code, 404)
        self.assertEqual(self.client.post(f"/save-shared-transaction/{token}", json=DEPENSE).status_code, 404)


class Historique(Base):
    def setUp(self):
        super().setUp()
        self.token = self.lien()["token"]

    def test_un_ajout_garde_la_nouvelle_valeur_et_le_nom(self):
        self.client.post(f"/save-shared-transaction/{self.token}", json={**DEPENSE, "auteur": "Zoé"})
        entree = self.historique()[0]
        self.assertEqual(entree["action"], "ajout")
        self.assertEqual(entree["auteur"], "Zoé")
        self.assertIsNone(entree["ancienne_valeur"])
        self.assertEqual(entree["nouvelle_valeur"], DEPENSE)
        self.assertTrue(entree["depense_id"])
        self.assertIsNotNone(datetime.fromisoformat(entree["date"]).tzinfo)

    def test_une_modification_garde_les_deux_valeurs(self):
        self.client.put(f"/update-shared-transaction/{self.token}", json={**DEPENSE, "id": self.depense_id, "auteur": "Zoé"})
        entree = self.historique()[0]
        self.assertEqual((entree["action"], entree["depense_id"], entree["auteur"]), ("modification", self.depense_id, "Zoé"))
        self.assertEqual(entree["ancienne_valeur"], {"date": "2026-11-02", "libelle": "Courses", "paye_par": "Aude", "pour_qui": "Aude:10,Theo:20", "montant": 30})
        self.assertEqual(entree["nouvelle_valeur"], DEPENSE)

    def test_une_suppression_garde_l_ancienne_valeur(self):
        self.client.request("DELETE", f"/delete-shared-transaction/{self.token}/{self.depense_id}", json={"auteur": "Zoé"})
        entree = self.historique()[0]
        self.assertEqual((entree["action"], entree["auteur"]), ("suppression", "Zoé"))
        self.assertEqual(entree["ancienne_valeur"]["libelle"], "Courses")
        self.assertIsNone(entree["nouvelle_valeur"])
        self.assertEqual(self.lignes("SELECT * FROM tricount WHERE id = :i", i=self.depense_id), [])

    def test_une_depense_sans_date_est_notee_sans_date(self):
        with self.moteur.begin() as conn:
            conn.execute(text("UPDATE tricount SET date = NULL WHERE id = :i"), {"i": self.depense_id})
        self.client.delete(f"/delete-shared-transaction/{self.token}/{self.depense_id}")
        self.assertIsNone(self.historique()[0]["ancienne_valeur"]["date"])

    def test_le_nom_est_facultatif(self):
        self.client.post(f"/save-shared-transaction/{self.token}", json=DEPENSE)
        self.client.post(f"/save-shared-transaction/{self.token}", json={**DEPENSE, "auteur": "   "})
        self.client.delete(f"/delete-shared-transaction/{self.token}/{self.depense_id}")
        self.assertEqual([e["auteur"] for e in self.historique()], [None, None, None])

    def test_le_nom_est_nettoye_et_borne_sans_bloquer_la_depense(self):
        reponse = self.client.post(f"/save-shared-transaction/{self.token}", json={**DEPENSE, "auteur": "  Zoé\n\tMartin\x00 " + "x" * 200})
        self.assertEqual(reponse.status_code, 200)
        auteur = self.historique()[0]["auteur"]
        self.assertTrue(auteur.startswith("Zoé Martin "))
        self.assertLessEqual(len(auteur), 60)

    def test_ni_jeton_ni_adresse_ip_ne_sont_gardes(self):
        self.client.post(f"/save-shared-transaction/{self.token}", json=DEPENSE, headers={"X-Forwarded-For": "203.0.113.9"})
        ligne = dict(self.lignes("SELECT * FROM tricount_historique")[0])
        self.assertEqual(set(ligne), {"id", "utilisateur", "groupe", "action", "depense_id", "auteur", "ancienne_valeur", "nouvelle_valeur", "created_at"})
        contenu = str(ligne) + str(self.historique())
        self.assertNotIn(self.token, contenu)
        self.assertNotIn("203.0.113.9", contenu)
        self.assertNotIn("testclient", contenu)

    def test_les_entrees_vont_de_la_plus_recente_a_la_plus_ancienne(self):
        self.client.post(f"/save-shared-transaction/{self.token}", json=DEPENSE)
        self.client.put(f"/update-shared-transaction/{self.token}", json={**DEPENSE, "id": self.depense_id})
        self.client.delete(f"/delete-shared-transaction/{self.token}/{self.depense_id}")
        self.assertEqual([e["action"] for e in self.historique()], ["suppression", "modification", "ajout"])

    def test_enregistrer_sans_rien_changer_n_ajoute_rien(self):
        corps = {"id": self.depense_id, "date": "2026-11-02", "libelle": "Courses", "paye_par": "Aude", "pour_qui": "Aude:10,Theo:20", "montant": 30}
        self.assertEqual(self.client.put(f"/update-shared-transaction/{self.token}", json=corps).status_code, 200)
        self.assertEqual(self.historique(), [])

    def test_les_changements_du_proprietaire_ne_sont_pas_notes(self):
        corps = {"id": self.depense_id, "date": "2026-11-02", "libelle": "Moi", "paye_par": "Aude", "pour_qui": "Aude:30", "montant": 30}
        self.assertEqual(self.client.put("/update-transaction", json=corps, headers=self.theo).status_code, 200)
        self.assertEqual(self.client.delete(f"/delete-transaction/{self.depense_id}", headers=self.theo).status_code, 200)
        self.assertEqual(self.historique(), [])

    def test_l_historique_survit_au_changement_de_lien(self):
        self.client.post(f"/save-shared-transaction/{self.token}", json=DEPENSE)
        nouveau = self.client.post(f"/regenerate-share/theo/{GROUPE}", headers=self.theo).json()["token"]
        self.client.post(f"/save-shared-transaction/{nouveau}", json=DEPENSE)
        self.assertEqual(len(self.historique()), 2)

    def test_la_limite_de_lecture_est_bornee(self):
        self.assertEqual(self.client.get(f"/share-history/theo/{GROUPE}", params={"limite": 501}, headers=self.theo).status_code, 422)
        for _ in range(3):
            self.client.post(f"/save-shared-transaction/{self.token}", json=DEPENSE)
        self.assertEqual(len(self.client.get(f"/share-history/theo/{GROUPE}", params={"limite": 2}, headers=self.theo).json()["historique"]), 2)

    def test_sans_trace_possible_le_changement_est_annule(self):
        with self.moteur.begin() as conn:
            conn.execute(text("DROP TABLE tricount_historique"))
        client = TestClient(main.app, raise_server_exceptions=False)
        self.assertEqual(client.put(f"/update-shared-transaction/{self.token}", json={**DEPENSE, "id": self.depense_id}).status_code, 500)
        self.assertEqual(client.post(f"/save-shared-transaction/{self.token}", json=DEPENSE).status_code, 500)
        self.assertEqual([l["libelle"] for l in self.lignes("SELECT libelle FROM tricount")], ["Courses"])


if __name__ == "__main__":
    unittest.main()
