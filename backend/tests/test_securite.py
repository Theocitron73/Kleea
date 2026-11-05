"""Accès aux routes sensibles, sur une base SQLite en mémoire (aucun accès à la vraie base, aucun appel à l'IA)."""
import json
import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

# Valeurs factices posées AVANT l'import : load_dotenv() ne les écrase pas.
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


class Base(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        with self.engine.begin() as conn:
            conn.execute(text("CREATE TABLE banned_ips (ip TEXT, banned_until TIMESTAMP)"))
            conn.execute(text("CREATE TABLE users (username TEXT, powens_token TEXT, import_mode TEXT)"))
            conn.execute(text("INSERT INTO users VALUES ('theo', 'jeton', 'auto')"))
            conn.execute(text("CREATE TABLE security_rate_limits (key TEXT, action TEXT, attempted_at TIMESTAMP)"))
        for cible, valeur in ((main, {"engine": self.engine}),):
            for nom, objet in valeur.items():
                patcher = partout(nom, objet)
                patcher.start()
                self.addCleanup(patcher.stop)
        self.client = TestClient(main.app)


class SynchroMaintenance(Base):
    URL = "/maintenance/sync-all"

    def setUp(self):
        super().setUp()
        for nom in ("exec_sync_user_transactions", "exec_recalculate_balances"):
            patcher = partout(nom)
            setattr(self, nom, patcher.start())
            self.addCleanup(patcher.stop)

    def cle(self, valeur):
        env = {} if valeur is None else {"MAINTENANCE_API_KEY": valeur}
        patcher = mock.patch.dict(os.environ, env)
        patcher.start()
        self.addCleanup(patcher.stop)
        if valeur is None:
            os.environ.pop("MAINTENANCE_API_KEY", None)

    def verifier_refus(self, reponse):
        self.assertEqual(reponse.status_code, 401)
        self.exec_sync_user_transactions.assert_not_called()

    def test_sans_cle_configuree_tout_est_refuse(self):
        self.cle(None)
        self.verifier_refus(self.client.post(self.URL))
        self.verifier_refus(self.client.post(self.URL, params={"auth_key": ""}))
        self.verifier_refus(self.client.post(self.URL, headers={"X-Maintenance-Key": "None"}))

    def test_cle_configuree_vide_tout_est_refuse(self):
        self.cle("")
        self.verifier_refus(self.client.post(self.URL))
        self.verifier_refus(self.client.post(self.URL, params={"auth_key": ""}))

    def test_mauvaise_cle_refusee(self):
        self.cle("le-bon-secret")
        self.verifier_refus(self.client.post(self.URL))
        self.verifier_refus(self.client.post(self.URL, headers={"X-Maintenance-Key": "faux"}))
        self.verifier_refus(self.client.post(self.URL, params={"auth_key": "faux"}))
        self.verifier_refus(self.client.post(self.URL, headers={"X-Maintenance-Key": "é".encode("latin-1")}))

    def test_bonne_cle_acceptee_par_en_tete(self):
        self.cle("le-bon-secret")
        reponse = self.client.post(self.URL, headers={"X-Maintenance-Key": "le-bon-secret"})
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.json()["synchronized_users"], ["theo"])

    def test_bonne_cle_encore_acceptee_dans_l_url(self):
        self.cle("le-bon-secret")
        reponse = self.client.post(self.URL, params={"auth_key": "le-bon-secret"})
        self.assertEqual(reponse.status_code, 200)


class AnalyseEconomies(Base):
    URL = "/api/indicators/savings-analysis"
    CORPS = {"mois": "Novembre", "annee": 2026, "total_depenses": 100, "categories": []}
    REPONSE_IA = {"potentiel_total": 10, "score_sante_budget": "Bon", "conseils": []}

    def setUp(self):
        super().setUp()
        patcher = partout("client")
        self.ia = patcher.start()
        self.addCleanup(patcher.stop)
        self.ia.models.generate_content.return_value = SimpleNamespace(text=json.dumps(self.REPONSE_IA))
        self.theo = {"Authorization": "Bearer " + aide.create_access_token(data={"sub": "Theo"})}

    def test_sans_jeton_l_ia_n_est_pas_appelee(self):
        self.assertEqual(self.client.post(self.URL, json=self.CORPS).status_code, 401)
        reponse = self.client.post(self.URL, json=self.CORPS, headers={"Authorization": "Bearer faux"})
        self.assertEqual(reponse.status_code, 401)
        self.ia.models.generate_content.assert_not_called()

    def test_avec_jeton_l_analyse_fonctionne(self):
        reponse = self.client.post(self.URL, json=self.CORPS, headers=self.theo)
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.json()["potentiel_total"], 10)

    def test_le_nombre_d_appels_est_limite_par_compte(self):
        for _ in range(aide.LIMITE_ANALYSES_ECONOMIES):
            self.assertEqual(self.client.post(self.URL, json=self.CORPS, headers=self.theo).status_code, 200)
        self.assertEqual(self.client.post(self.URL, json=self.CORPS, headers=self.theo).status_code, 429)
        self.assertEqual(self.ia.models.generate_content.call_count, aide.LIMITE_ANALYSES_ECONOMIES)
        aude = {"Authorization": "Bearer " + aide.create_access_token(data={"sub": "Aude"})}
        self.assertEqual(self.client.post(self.URL, json=self.CORPS, headers=aude).status_code, 200)

    def test_une_erreur_de_l_ia_ne_fuit_pas(self):
        self.ia.models.generate_content.side_effect = RuntimeError("secret-interne")
        reponse = self.client.post(self.URL, json=self.CORPS, headers=self.theo)
        self.assertEqual(reponse.status_code, 500)
        self.assertNotIn("secret-interne", reponse.text)


if __name__ == "__main__":
    unittest.main()
