"""Centre d'alertes : état des synchronisations, alertes masquées et isolation entre comptes."""
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

os.environ["DATABASE_URL"] = "postgresql://test:test@127.0.0.1:1/test"
os.environ["JWT_SECRET_KEY"] = "secret-de-test-suffisamment-long-pour-hs256"
os.environ["GEMINI_API_KEY"] = "test"
os.environ.pop("IBAN_ENCRYPTION_KEY", None)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.stdout.reconfigure(encoding="utf-8")

from fastapi import HTTPException  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import aide  # noqa: E402
from aide import partout  # noqa: E402
import main  # noqa: E402

ETAT = "/api/alertes/etat"
MASQUEES = "/api/alertes/masquees"


def entetes(utilisateur):
    return {"Authorization": f"Bearer {aide.create_access_token({'sub': utilisateur})}"}


class Base(unittest.TestCase):
    TABLES = True

    def setUp(self):
        self.moteur = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        with self.moteur.begin() as conn:
            conn.execute(text("CREATE TABLE banned_ips (ip TEXT, banned_until TIMESTAMP)"))
            if self.TABLES:
                conn.execute(text("""
                    CREATE TABLE synchro_etat (
                        utilisateur TEXT PRIMARY KEY, derniere_tentative TIMESTAMP, dernier_succes TIMESTAMP,
                        dernier_echec TIMESTAMP, code_erreur TEXT
                    )
                """))
                conn.execute(text("""
                    CREATE TABLE alertes_masquees (
                        utilisateur TEXT NOT NULL, alerte_id TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (utilisateur, alerte_id)
                    )
                """))
        patcher = partout("engine", self.moteur)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = TestClient(main.app)
        self.theo = entetes("theo")
        self.aude = entetes("aude")


class Routes(Base):
    def test_sans_session_tout_est_refuse(self):
        self.assertEqual(self.client.get(ETAT).status_code, 401)
        self.assertEqual(self.client.post(MASQUEES, json={"id": "x"}).status_code, 401)
        self.assertEqual(self.client.delete(MASQUEES).status_code, 401)

    def test_etat_vide(self):
        self.assertEqual(self.client.get(ETAT, headers=self.theo).json(), {"synchro": None, "masquees": []})

    def test_masquer_sans_doublon_puis_tout_reafficher(self):
        for _ in range(2):
            self.assertEqual(self.client.post(MASQUEES, json={"id": "budget:Courses"}, headers=self.theo).status_code, 200)
        self.assertEqual(self.client.get(ETAT, headers=self.theo).json()["masquees"], ["budget:Courses"])
        self.assertEqual(self.client.delete(MASQUEES, headers=self.theo).status_code, 200)
        self.assertEqual(self.client.get(ETAT, headers=self.theo).json()["masquees"], [])

    def test_un_compte_ne_touche_pas_aux_alertes_d_un_autre(self):
        self.client.post(MASQUEES, json={"id": "a"}, headers=self.theo)
        self.assertEqual(self.client.get(ETAT, headers=self.aude).json()["masquees"], [])
        self.client.delete(MASQUEES, headers=self.aude)
        self.assertEqual(self.client.get(ETAT, headers=self.theo).json()["masquees"], ["a"])

    def test_un_identifiant_invalide_est_refuse(self):
        self.assertEqual(self.client.post(MASQUEES, json={"id": ""}, headers=self.theo).status_code, 422)
        self.assertEqual(self.client.post(MASQUEES, json={"id": "x" * 201}, headers=self.theo).status_code, 422)


class Synchro(Base):
    def etat(self):
        return self.client.get(ETAT, headers=self.theo).json()["synchro"]

    def test_un_succes_est_garde(self):
        aide.noter_synchro("Theo ")
        etat = self.etat()
        self.assertIsNotNone(etat["dernier_succes"])
        self.assertIsNone(etat["dernier_echec"])
        self.assertIsNone(etat["code_erreur"])

    def test_un_echec_garde_le_dernier_succes_et_jamais_le_texte_de_l_erreur(self):
        aide.noter_synchro("theo")
        succes = self.etat()["dernier_succes"]
        aide.noter_synchro("theo", RuntimeError("IBAN FR76 secret"))
        etat = self.etat()
        self.assertEqual(etat["dernier_succes"], succes)
        self.assertIsNotNone(etat["dernier_echec"])
        self.assertEqual(etat["code_erreur"], "RuntimeError")
        self.assertNotIn("secret", str(etat))

    def test_une_erreur_http_garde_son_code(self):
        aide.noter_synchro("theo", HTTPException(status_code=400, detail="Détail"))
        self.assertEqual(self.etat()["code_erreur"], "HTTP 400")

    def test_un_nouveau_succes_efface_le_code_d_erreur(self):
        aide.noter_synchro("theo", RuntimeError("x"))
        aide.noter_synchro("theo")
        self.assertIsNone(self.etat()["code_erreur"])

    def test_la_route_de_synchro_note_le_resultat_et_relaie_l_echec(self):
        with partout("exec_sync_user_transactions", return_value={"status": "success", "added": 1}):
            reponse = self.client.post("/powens/sync-user/theo", headers=self.theo)
        self.assertEqual(reponse.status_code, 200)
        self.assertIsNotNone(self.etat()["dernier_succes"])
        with partout("exec_sync_user_transactions", side_effect=HTTPException(status_code=502, detail="Powens")):
            reponse = self.client.post("/powens/sync-user/theo", headers=self.theo)
        self.assertEqual(reponse.status_code, 502)
        self.assertEqual(self.etat()["code_erreur"], "HTTP 502")


class SansTable(Base):
    TABLES = False

    def test_une_table_absente_n_empeche_pas_la_synchronisation(self):
        with partout("exec_sync_user_transactions", return_value={"status": "success", "added": 1}) as sync:
            reponse = self.client.post("/powens/sync-user/theo", headers=self.theo)
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.json()["added"], 1)
        self.assertIsInstance(sync, mock.MagicMock)


if __name__ == "__main__":
    unittest.main()
