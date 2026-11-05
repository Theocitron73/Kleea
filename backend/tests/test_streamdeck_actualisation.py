"""Actualisation bancaire depuis le Stream Deck, sur SQLite en mémoire : aucun appel réseau, aucun accès à la vraie base."""
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

import main  # noqa: E402

URL = "/api/streamdeck/powens/actualiser"


class PowensFictif:
    """Remplace httpx.AsyncClient : note les appels et répond comme demandé."""

    def __init__(self, connexions=None, statut_put=200, panne_get=False, panne_put=False):
        self.connexions = [{"id": 1}, {"id": 2}, {"id": 3, "deleted": "2026-01-01"}] if connexions is None else connexions
        self.statut_put = statut_put
        self.panne_get = panne_get
        self.panne_put = panne_put
        self.puts = []
        self.entetes = []

    def __call__(self, **_):
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return False

    async def get(self, _url, headers=None):
        self.entetes.append(headers)
        if self.panne_get:
            raise RuntimeError("detail-interne")
        return SimpleNamespace(status_code=200, json=lambda: {"connections": self.connexions})

    async def put(self, url, headers=None, params=None):
        self.puts.append((url, params))
        if self.panne_put:
            raise RuntimeError("detail-interne")
        statut = self.statut_put(url) if callable(self.statut_put) else self.statut_put
        return SimpleNamespace(status_code=statut)


class Actualisation(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        with self.engine.begin() as conn:
            conn.execute(text("CREATE TABLE banned_ips (ip TEXT, banned_until TIMESTAMP)"))
            conn.execute(text("CREATE TABLE streamdeck_tokens (utilisateur TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL)"))
            conn.execute(text("CREATE TABLE security_rate_limits (key TEXT, action TEXT, attempted_at TIMESTAMP)"))
            conn.execute(text("CREATE TABLE users (username TEXT, email TEXT, powens_token TEXT, import_mode TEXT)"))
            conn.execute(text("INSERT INTO users VALUES ('theo', 't@x', 'powens-secret', 'manual')"))
            conn.execute(text("INSERT INTO users VALUES ('aude', 'a@x', NULL, 'manual')"))
        for cible, nom, valeur in (
            (main, "engine", self.engine),
            (main, "POWENS_DOMAIN", "https://demo.biapi.pro"),
        ):
            patcher = mock.patch.object(cible, nom, valeur)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.check = self.demarrer("check_sync_status", return_value={"count": 4, "accounts": {"CCP T": {"count": 4}}})
        self.sync = self.demarrer("exec_sync_user_transactions")
        self.recalcul = self.demarrer("exec_recalculate_balances")
        self.client = TestClient(main.app)

    def demarrer(self, nom, **options):
        patcher = mock.patch.object(main, nom, **options)
        objet = patcher.start()
        self.addCleanup(patcher.stop)
        return objet

    def jeton(self, utilisateur="theo"):
        session = {"Authorization": "Bearer " + main.create_access_token({"sub": utilisateur})}
        return {"X-Streamdeck-Token": self.client.post("/api/streamdeck/token", headers=session).json()["token"]}

    def powens(self, **options):
        fictif = PowensFictif(**options)
        patcher = mock.patch.object(main.httpx, "AsyncClient", fictif)
        patcher.start()
        self.addCleanup(patcher.stop)
        return fictif

    def mode_auto(self):
        with self.engine.begin() as conn:
            conn.execute(text("UPDATE users SET import_mode = 'auto' WHERE username = 'theo'"))

    def test_exige_un_jeton_stream_deck_valide(self):
        banque = self.powens()
        self.assertEqual(self.client.post(URL).status_code, 401)
        self.assertEqual(self.client.post(URL, headers={"X-Streamdeck-Token": "kleea_sd_faux"}).status_code, 401)
        session = {"Authorization": "Bearer " + main.create_access_token({"sub": "theo"})}
        self.assertEqual(self.client.post(URL, headers=session).status_code, 401)
        self.assertEqual(banque.puts, [])

    def test_interroge_chaque_banque_active_avec_le_jeton_du_compte(self):
        banque = self.powens()
        reponse = self.client.post(URL, headers=self.jeton())
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(
            reponse.json(),
            {"connecte": True, "erreur": False, "count": 4, "comptes": {"CCP T": 4}, "actualisees": 2, "echecs": 0},
        )
        self.assertEqual(sorted(u.rsplit("/", 1)[1] for u, _ in banque.puts), ["1", "2"])
        self.assertTrue(all(params == {"psu_requested": "true"} for _, params in banque.puts))
        self.assertEqual(banque.entetes[0]["Authorization"], "Bearer powens-secret")
        self.assertNotIn("powens-secret", reponse.text)
        self.assertEqual(reponse.headers["Cache-Control"], "no-store")

    def test_le_nombre_est_lu_apres_l_interrogation(self):
        ordre = []
        self.powens(statut_put=lambda _u: ordre.append("banque") or 200)
        self.check.side_effect = lambda *_: ordre.append("comptage") or {"count": 0, "accounts": {}}
        self.client.post(URL, headers=self.jeton())
        self.assertEqual(ordre[-1], "comptage")
        self.assertIn("banque", ordre)

    def test_sans_banque_connectee_aucun_appel(self):
        banque = self.powens()
        reponse = self.client.post(URL, headers=self.jeton("aude"))
        self.assertEqual(reponse.json(), {"connecte": False, "erreur": False, "count": 0, "comptes": {}, "actualisees": 0, "echecs": 0})
        self.assertEqual(banque.entetes, [])

    def test_mode_manuel_n_importe_rien(self):
        self.powens()
        self.client.post(URL, headers=self.jeton())
        self.sync.assert_not_called()
        self.recalcul.assert_not_called()

    def test_mode_automatique_importe_comme_le_bouton(self):
        self.mode_auto()
        self.powens()
        self.client.post(URL, headers=self.jeton())
        self.sync.assert_called_once_with("theo")
        self.recalcul.assert_called_once_with("theo")

    def test_import_automatique_en_echec_est_signale_sans_detail(self):
        self.mode_auto()
        self.powens()
        self.sync.side_effect = RuntimeError("detail-interne")
        reponse = self.client.post(URL, headers=self.jeton())
        self.assertEqual(reponse.status_code, 200)
        self.assertTrue(reponse.json()["erreur"])
        self.assertNotIn("detail-interne", reponse.text)

    def test_une_banque_en_echec_est_comptee_et_bloque_l_import(self):
        self.mode_auto()
        self.powens(statut_put=lambda u: 200 if u.endswith("/1") else 428)
        corps = self.client.post(URL, headers=self.jeton()).json()
        self.assertEqual((corps["actualisees"], corps["echecs"], corps["count"]), (1, 1, 4))
        self.sync.assert_not_called()

    def test_powens_injoignable_n_est_pas_une_erreur_500(self):
        self.powens(panne_get=True)
        reponse = self.client.post(URL, headers=self.jeton())
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.json()["echecs"], 1)
        self.assertNotIn("detail-interne", reponse.text)

    def test_panne_sur_une_banque(self):
        self.powens(panne_put=True)
        corps = self.client.post(URL, headers=self.jeton()).json()
        self.assertEqual((corps["actualisees"], corps["echecs"]), (0, 2))

    def test_les_appuis_sont_limites_par_compte(self):
        banque = self.powens()
        theo, aude = self.jeton(), self.jeton("aude")
        for _ in range(main.LIMITE_ACTUALISATIONS_STREAMDECK):
            self.assertEqual(self.client.post(URL, headers=theo).status_code, 200)
        appels = len(banque.puts)
        self.assertEqual(self.client.post(URL, headers=theo).status_code, 429)
        self.assertEqual(len(banque.puts), appels)
        self.assertEqual(self.client.post(URL, headers=aude).status_code, 200)

    def test_le_bouton_de_la_page_importer_marche_toujours(self):
        banque = self.powens()
        session = {"Authorization": "Bearer " + main.create_access_token({"sub": "theo"})}
        reponse = self.client.post("/powens/refresh-bank-sync/theo", headers=session)
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.json()["status"], "success")
        self.assertEqual(len(reponse.json()["synced_connections"]), 2)
        self.assertEqual(len(banque.puts), 2)
        self.powens(connexions=[])
        self.assertEqual(self.client.post("/powens/refresh-bank-sync/theo", headers=session).json()["status"], "no_connections")
        self.assertEqual(self.client.post("/powens/refresh-bank-sync/aude", headers=session).status_code, 403)


if __name__ == "__main__":
    unittest.main()
