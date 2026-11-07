"""Double authentification par e-mail : facultative, impossible à contourner, sans risque de s'enfermer dehors."""
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
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import aide  # noqa: E402
from aide import partout  # noqa: E402
import main  # noqa: E402
from routes import double_auth as da  # noqa: E402

MOT_DE_PASSE = "motdepasse1"
ETAT = "/api/double-auth"
PREPARER = "/api/double-auth/preparer"
ACTIVER = "/api/double-auth/activer"
DESACTIVER = "/api/double-auth/desactiver"
SECOND = "/login/double-auth"
RENVOI = "/login/double-auth/renvoyer"
SONDE = "/auth/test-token"


class Calcul(unittest.TestCase):
    def test_adresse_masquee(self):
        self.assertEqual(da.masquer_email("theo@kleea.test"), "t***@kleea.test")

    def test_empreinte_propre_au_compte(self):
        self.assertNotEqual(da.empreinte_code("theo", "123456"), da.empreinte_code("aude", "123456"))


class Base(unittest.TestCase):
    TABLE = True

    def setUp(self):
        self.moteur = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        with self.moteur.begin() as conn:
            conn.execute(text("CREATE TABLE banned_ips (ip TEXT, banned_until TIMESTAMP, reason TEXT, created_at TIMESTAMP)"))
            conn.execute(text("CREATE TABLE login_failed_attempts (ip TEXT, attempted_at TIMESTAMP)"))
            conn.execute(text("CREATE TABLE security_rate_limits (key TEXT, action TEXT, attempted_at TIMESTAMP)"))
            conn.execute(text("CREATE TABLE users (username TEXT, email TEXT, password TEXT, role TEXT, name TEXT, import_mode TEXT)"))
            conn.execute(text("CREATE TABLE streamdeck_tokens (utilisateur TEXT, token_hash TEXT, created_at TIMESTAMP)"))
            for nom, email in (("Theo", "theo@kleea.test"), ("aude", "aude@kleea.test"), ("sansmail", None)):
                conn.execute(
                    text("INSERT INTO users (username, email, password, role) VALUES (:n, :e, :p, 'user')"),
                    {"n": nom, "e": email, "p": aide.hash_password(MOT_DE_PASSE)},
                )
            if self.TABLE:
                conn.execute(text("""
                    CREATE TABLE double_auth (
                        utilisateur TEXT PRIMARY KEY, active BOOLEAN NOT NULL DEFAULT 0, created_at TIMESTAMP,
                        code_empreinte TEXT, code_expire_le TIMESTAMP, essais INTEGER NOT NULL DEFAULT 0
                    )
                """))
        patcher = partout("engine", self.moteur)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.envois = []
        envoi = mock.patch.object(da, "envoyer_code", side_effect=lambda email, code: self.envois.append((email, code)))
        envoi.start()
        self.addCleanup(envoi.stop)
        self.client = TestClient(main.app)
        self.entetes = self.connexion()

    def premiere_etape(self, nom="Theo"):
        reponse = self.client.post("/login", json={"nom": nom, "password": MOT_DE_PASSE})
        self.assertEqual(reponse.status_code, 200, reponse.text)
        return reponse.json()

    def connexion(self, nom="Theo"):
        return {"Authorization": f"Bearer {self.premiere_etape(nom)['access_token']}"}

    def activer(self):
        self.assertEqual(self.client.post(PREPARER, json={"password": MOT_DE_PASSE}, headers=self.entetes).status_code, 200)
        reponse = self.client.post(ACTIVER, json={"code": self.envois[-1][1]}, headers=self.entetes)
        self.assertEqual(reponse.status_code, 200, reponse.text)


class Facultative(Base):
    def test_desactivee_par_defaut_la_connexion_ne_change_pas(self):
        donnees = self.premiere_etape()
        self.assertIn("access_token", donnees)
        self.assertNotIn("double_auth_requise", donnees)
        self.assertEqual(self.envois, [])
        self.assertEqual(self.client.get(ETAT, headers=self.entetes).json(), {"disponible": True, "active": False})

    def test_preparer_sans_confirmer_n_active_rien(self):
        self.client.post(PREPARER, json={"password": MOT_DE_PASSE}, headers=self.entetes)
        self.assertIn("access_token", self.premiere_etape())

    def test_un_compte_n_impose_rien_aux_autres(self):
        self.activer()
        self.assertIn("access_token", self.premiere_etape("aude"))


class Activation(Base):
    def test_routes_protegees(self):
        for route in (PREPARER, ACTIVER, DESACTIVER):
            self.assertEqual(self.client.post(route, json={"password": "x", "code": "1"}).status_code, 401)
        self.assertEqual(self.client.get(ETAT).status_code, 401)

    def test_preparer_exige_le_mot_de_passe(self):
        self.assertEqual(self.client.post(PREPARER, json={"password": "faux"}, headers=self.entetes).status_code, 400)
        self.assertEqual(self.envois, [])

    def test_le_code_part_a_l_adresse_du_compte_et_n_est_pas_renvoye(self):
        reponse = self.client.post(PREPARER, json={"password": MOT_DE_PASSE}, headers=self.entetes)
        self.assertEqual(reponse.json(), {"email_masque": "t***@kleea.test"})
        self.assertEqual(self.envois[0][0], "theo@kleea.test")
        self.assertRegex(self.envois[0][1], r"^\d{6}$")

    def test_le_code_n_est_jamais_stocke_en_clair(self):
        self.client.post(PREPARER, json={"password": MOT_DE_PASSE}, headers=self.entetes)
        with self.moteur.connect() as conn:
            stocke = conn.execute(text("SELECT code_empreinte FROM double_auth")).scalar()
        self.assertNotIn(self.envois[0][1], stocke)

    def test_mauvais_code_n_active_pas(self):
        self.client.post(PREPARER, json={"password": MOT_DE_PASSE}, headers=self.entetes)
        self.assertEqual(self.client.post(ACTIVER, json={"code": "abcdef"}, headers=self.entetes).status_code, 400)
        self.assertFalse(self.client.get(ETAT, headers=self.entetes).json()["active"])

    def test_sans_adresse_pas_d_activation(self):
        entetes = self.connexion("sansmail")
        self.assertEqual(self.client.post(PREPARER, json={"password": MOT_DE_PASSE}, headers=entetes).status_code, 400)

    def test_envoi_impossible_pas_d_activation(self):
        with mock.patch.object(da, "envoyer_code", side_effect=RuntimeError("panne")):
            self.assertEqual(self.client.post(PREPARER, json={"password": MOT_DE_PASSE}, headers=self.entetes).status_code, 503)
        self.assertFalse(self.client.get(ETAT, headers=self.entetes).json()["active"])
        self.assertIn("access_token", self.premiere_etape())

    def test_deja_active_preparer_refuse(self):
        self.activer()
        self.assertEqual(self.client.post(PREPARER, json={"password": MOT_DE_PASSE}, headers=self.entetes).status_code, 409)


class Connexion(Base):
    def etape_active(self):
        self.activer()
        self.envois.clear()
        return self.premiere_etape()

    def test_le_mot_de_passe_seul_ne_donne_plus_de_session(self):
        donnees = self.etape_active()
        self.assertTrue(donnees["double_auth_requise"])
        self.assertNotIn("access_token", donnees)
        self.assertEqual(donnees["email_masque"], "t***@kleea.test")
        self.assertEqual(len(self.envois), 1)

    def test_mauvais_mot_de_passe_n_envoie_rien(self):
        self.activer()
        self.envois.clear()
        self.assertEqual(self.client.post("/login", json={"nom": "Theo", "password": "faux"}).status_code, 401)
        self.assertEqual(self.envois, [])

    def test_le_jeton_intermediaire_n_ouvre_aucune_route(self):
        entetes = {"Authorization": f"Bearer {self.etape_active()['jeton_double_auth']}"}
        self.assertEqual(self.client.get(SONDE, headers=entetes).status_code, 401)
        self.assertEqual(self.client.get(ETAT, headers=entetes).status_code, 401)

    def test_un_jeton_de_session_ne_remplace_pas_le_jeton_intermediaire(self):
        self.etape_active()
        jeton = self.entetes["Authorization"].split()[1]
        self.assertEqual(self.client.post(SECOND, json={"jeton": jeton, "code": self.envois[-1][1]}).status_code, 401)

    def test_bon_code_ouvre_une_session_qui_marche(self):
        etape = self.etape_active()
        donnees = self.client.post(SECOND, json={"jeton": etape["jeton_double_auth"], "code": self.envois[-1][1]}).json()
        self.assertEqual((donnees["user"], donnees["role"]), ("Theo", "user"))
        self.assertEqual(self.client.get(SONDE, headers={"Authorization": f"Bearer {donnees['access_token']}"}).status_code, 200)

    def test_un_code_ne_sert_qu_une_fois(self):
        etape = self.etape_active()
        corps = {"jeton": etape["jeton_double_auth"], "code": self.envois[-1][1]}
        self.assertEqual(self.client.post(SECOND, json=corps).status_code, 200)
        self.assertEqual(self.client.post(SECOND, json=corps).status_code, 401)

    def test_le_code_d_un_compte_ne_sert_pas_pour_un_autre(self):
        etape = self.etape_active()
        jeton = da.jeton_etape_connexion("aude")
        self.assertEqual(self.client.post(SECOND, json={"jeton": jeton, "code": self.envois[-1][1]}).status_code, 401)
        self.assertIn("jeton_double_auth", etape)

    def test_code_expire_refuse(self):
        etape = self.etape_active()
        passe = datetime.now(timezone.utc) - timedelta(minutes=1)
        with self.moteur.begin() as conn:
            conn.execute(text("UPDATE double_auth SET code_expire_le = :f"), {"f": passe})
        self.assertEqual(self.client.post(SECOND, json={"jeton": etape["jeton_double_auth"], "code": self.envois[-1][1]}).status_code, 401)

    def test_le_bon_code_ne_passe_plus_apres_trop_d_essais(self):
        etape = self.etape_active()
        jeton, bon = etape["jeton_double_auth"], self.envois[-1][1]
        with partout("check_and_record_failed_attempt", return_value=(False, 3)):
            for _ in range(da.ESSAIS_PAR_CODE):
                self.assertEqual(self.client.post(SECOND, json={"jeton": jeton, "code": "abcdef"}).status_code, 401)
            self.assertEqual(self.client.post(SECOND, json={"jeton": jeton, "code": bon}).status_code, 401)

    def test_renvoi_remplace_l_ancien_code(self):
        etape = self.etape_active()
        ancien = self.envois[-1][1]
        with mock.patch.object(da.secrets, "randbelow", return_value=(int(ancien) + 1) % 1_000_000):
            self.assertEqual(self.client.post(RENVOI, json={"jeton": etape["jeton_double_auth"]}).status_code, 200)
        self.assertEqual(self.client.post(SECOND, json={"jeton": etape["jeton_double_auth"], "code": ancien}).status_code, 401)
        self.assertEqual(self.client.post(SECOND, json={"jeton": etape["jeton_double_auth"], "code": self.envois[-1][1]}).status_code, 200)

    def test_renvoi_limite(self):
        etape = self.etape_active()
        statuts = [self.client.post(RENVOI, json={"jeton": etape["jeton_double_auth"]}).status_code for _ in range(6)]
        self.assertIn(429, statuts)

    def test_renvoi_exige_le_jeton_intermediaire(self):
        self.etape_active()
        self.assertEqual(self.client.post(RENVOI, json={"jeton": self.entetes["Authorization"].split()[1]}).status_code, 401)

    def test_jeton_expire_refuse(self):
        self.etape_active()
        jeton = jwt.encode({"double_auth": "Theo", "exp": 1}, aide.SECRET_KEY, algorithm=aide.ALGORITHM)
        self.assertEqual(self.client.post(SECOND, json={"jeton": jeton, "code": self.envois[-1][1]}).status_code, 401)

    def test_panne_d_envoi_bloque_sans_ouvrir_de_session(self):
        self.activer()
        with mock.patch.object(da, "envoyer_code", side_effect=RuntimeError("panne")):
            reponse = self.client.post("/login", json={"nom": "Theo", "password": MOT_DE_PASSE})
        self.assertEqual(reponse.status_code, 503)
        self.assertNotIn("access_token", reponse.text)


class Desactivation(Base):
    def test_il_faut_le_mot_de_passe(self):
        self.activer()
        self.assertEqual(self.client.post(DESACTIVER, json={"password": "faux"}, headers=self.entetes).status_code, 400)
        self.assertTrue(self.client.get(ETAT, headers=self.entetes).json()["active"])

    def test_desactiver_retablit_la_connexion_simple(self):
        self.activer()
        self.assertEqual(self.client.post(DESACTIVER, json={"password": MOT_DE_PASSE}, headers=self.entetes).status_code, 200)
        self.assertIn("access_token", self.premiere_etape())

    def test_suppression_du_compte_efface_la_ligne(self):
        self.activer()
        self.assertEqual(self.client.delete("/profile/Theo", headers=self.entetes).status_code, 200)
        with self.moteur.connect() as conn:
            self.assertEqual(conn.execute(text("SELECT COUNT(*) FROM double_auth")).scalar(), 0)


class SansTable(Base):
    TABLE = False

    def test_la_connexion_marche_et_la_carte_le_sait(self):
        self.assertIn("access_token", self.premiere_etape())
        self.assertFalse(self.client.get(ETAT, headers=self.entetes).json()["disponible"])
        self.assertEqual(self.client.post(PREPARER, json={"password": MOT_DE_PASSE}, headers=self.entetes).status_code, 503)


if __name__ == "__main__":
    unittest.main()
