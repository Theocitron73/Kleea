"""Routes des dépenses récurrentes ignorées : authentification et isolation entre comptes."""
import os
import sys
import unittest
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

URL = "/api/abonnements/ignores"


def entetes(utilisateur):
    return {"Authorization": f"Bearer {aide.create_access_token({'sub': utilisateur})}"}


class Ignores(unittest.TestCase):
    def setUp(self):
        moteur = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        with moteur.begin() as conn:
            conn.execute(text("CREATE TABLE banned_ips (ip TEXT, banned_until TIMESTAMP)"))
            conn.execute(text("""
                CREATE TABLE abonnements_ignores (
                    utilisateur TEXT NOT NULL, abonnement_id TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (utilisateur, abonnement_id)
                )
            """))
        patcher = partout("engine", moteur)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = TestClient(main.app)
        self.theo = entetes("theo")
        self.aude = entetes("aude")

    def lire(self, session):
        return self.client.get(URL, headers=session).json()

    def test_sans_session_tout_est_refuse(self):
        self.assertEqual(self.client.get(URL).status_code, 401)
        self.assertEqual(self.client.post(URL, json={"id": "x"}).status_code, 401)
        self.assertEqual(self.client.delete(URL, params={"id": "x"}).status_code, 401)

    def test_ajouter_lire_puis_retirer(self):
        identifiant = "NETFLIX|15"
        self.assertEqual(self.lire(self.theo), [])
        self.assertEqual(self.client.post(URL, json={"id": identifiant}, headers=self.theo).status_code, 200)
        self.assertEqual(self.lire(self.theo), [identifiant])
        self.assertEqual(self.client.delete(URL, params={"id": identifiant}, headers=self.theo).status_code, 200)
        self.assertEqual(self.lire(self.theo), [])

    def test_ajouter_deux_fois_ne_cree_pas_de_doublon(self):
        for _ in range(2):
            self.assertEqual(self.client.post(URL, json={"id": "SFR|20"}, headers=self.theo).status_code, 200)
        self.assertEqual(self.lire(self.theo), ["SFR|20"])

    def test_un_compte_ne_voit_ni_ne_retire_les_lignes_d_un_autre(self):
        self.client.post(URL, json={"id": "SFR|20"}, headers=self.theo)
        self.assertEqual(self.lire(self.aude), [])
        self.client.delete(URL, params={"id": "SFR|20"}, headers=self.aude)
        self.assertEqual(self.lire(self.theo), ["SFR|20"])

    def test_un_identifiant_invalide_est_refuse(self):
        self.assertEqual(self.client.post(URL, json={"id": ""}, headers=self.theo).status_code, 422)
        self.assertEqual(self.client.post(URL, json={"id": "x" * 201}, headers=self.theo).status_code, 422)


if __name__ == "__main__":
    unittest.main()
