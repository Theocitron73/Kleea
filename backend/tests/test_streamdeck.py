"""Tests de l'API Stream Deck, sur une base SQLite en mémoire (aucun accès à la vraie base).

Lancer depuis la racine du dépôt : python -m unittest discover -s backend/tests
"""
import os
import subprocess
import sys
import unittest
from datetime import date
from pathlib import Path
from unittest import mock

# Valeurs factices posées AVANT l'import : load_dotenv() ne les écrase pas.
os.environ["DATABASE_URL"] = "postgresql://test:test@127.0.0.1:1/test"
os.environ["JWT_SECRET_KEY"] = "secret-de-test-suffisamment-long-pour-hs256"
os.environ["GEMINI_API_KEY"] = "test"
os.environ.pop("IBAN_ENCRYPTION_KEY", None)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
# main.py affiche des emojis à l'import : évite un plantage sur une console Windows en cp1252.
sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import main  # noqa: E402

AUJOURDHUI = date(2026, 11, 4)


def compte(nom, solde=0, groupe="Theo", couleur="#123456"):
    return {"compte": nom, "solde": solde, "groupe": groupe, "couleur": couleur}


def tx(compte_nom, montant, nom="Achat", categorie="Courses", mois="Novembre", annee=2026):
    return {
        "compte": compte_nom, "montant": montant, "nom": nom,
        "categorie": categorie, "mois": mois, "annee": annee, "date": None,
    }


def vue(comptes, transactions):
    resultat = main.calculer_vues_streamdeck(comptes, transactions, AUJOURDHUI)
    return {c["nom"]: c for c in resultat["comptes"]}


class CalculDesVues(unittest.TestCase):
    def test_solde_initial_plus_transactions(self):
        comptes = vue([compte("CCP T", 100)], [tx("CCP T", -30), tx("ccp t ", 10.5, mois="Octobre")])
        self.assertEqual(comptes["CCP T"]["solde"], 80.5)

    def test_ignore_les_mois_et_annees_futurs(self):
        comptes = vue(
            [compte("CCP T", 100)],
            [tx("CCP T", -30, mois="Décembre"), tx("CCP T", -5, mois="Janvier", annee=2027)],
        )
        self.assertEqual(comptes["CCP T"]["solde"], 100)

    def test_virement_sans_miroir_credite_le_compte_cible(self):
        comptes = vue(
            [compte("CCP T", 1000), compte("LEP", 0)],
            [tx("CCP T", -200, nom="Virement", categorie="🔄 Virement vers LEP")],
        )
        self.assertEqual(comptes["CCP T"]["solde"], 800)
        self.assertEqual(comptes["LEP"]["solde"], 200)

    def test_virement_avec_miroir_ne_compte_pas_double(self):
        comptes = vue(
            [compte("CCP T", 1000), compte("LEP", 0)],
            [
                tx("CCP T", -200, nom="Virement", categorie="🔄 Virement vers LEP"),
                tx("LEP", 200, nom="Virement recu", categorie="Epargne"),
            ],
        )
        self.assertEqual(comptes["LEP"]["solde"], 200)

    def test_virement_vers_un_autre_groupe_ne_credite_pas(self):
        comptes = vue(
            [compte("CCP T", 1000), compte("LEP", 0, groupe="Aude")],
            [tx("CCP T", -200, categorie="Virement vers LEP")],
        )
        self.assertEqual(comptes["LEP"]["solde"], 0)

    def test_stats_du_mois_excluent_transferts_et_autres_mois(self):
        comptes = vue(
            [compte("CCP T", 0)],
            [
                tx("CCP T", -40),
                tx("CCP T", 1500, nom="Salaire", categorie="Salaire"),
                tx("CCP T", -100, mois="Octobre"),
                tx("CCP T", -100, annee=2025),
                tx("CCP T", -200, categorie="Virement vers Livret"),
                tx("CCP T", -300, categorie="Transfert"),
                tx("CCP T", -400, nom="🔄 Interne", categorie="Autre"),
            ],
        )
        self.assertEqual(comptes["CCP T"]["depenses_mois"], 40)
        self.assertEqual(comptes["CCP T"]["revenus_mois"], 1500)

    def test_mois_avec_ou_sans_accent(self):
        resultat = main.calculer_vues_streamdeck(
            [compte("CCP T", 0)], [tx("CCP T", -10, mois="Août"), tx("CCP T", -5, mois="aout")], date(2026, 8, 20)
        )
        self.assertEqual(resultat["comptes"][0]["depenses_mois"], 15)
        self.assertEqual(resultat["periode"], {"mois": 8, "annee": 2026})


class RoutesStreamDeck(unittest.TestCase):
    def setUp(self):
        moteur = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        with moteur.begin() as conn:
            conn.execute(text("CREATE TABLE users (username TEXT PRIMARY KEY, powens_token TEXT)"))
            conn.execute(text("CREATE TABLE streamdeck_tokens (utilisateur TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL)"))
            conn.execute(text("CREATE TABLE configuration (compte TEXT, groupe TEXT, solde REAL, couleur TEXT, utilisateur TEXT, powens_name TEXT)"))
            conn.execute(text("CREATE TABLE transactions (date TEXT, nom TEXT, montant REAL, categorie TEXT, mois TEXT, annee INT, compte TEXT, utilisateur TEXT)"))
            conn.execute(text("INSERT INTO users VALUES ('theo', 'powens-secret'), ('aude', NULL)"))
            conn.execute(text("INSERT INTO configuration VALUES ('CCP T', 'Theo', 100, '#111111', 'theo', 'IBAN-SECRET')"))
            conn.execute(text("INSERT INTO configuration VALUES ('CCP A', 'Aude', 900, '#222222', 'aude', NULL)"))
            conn.execute(text("INSERT INTO transactions VALUES ('2026-01-05', 'Achat', -30, 'Courses', 'Janvier', 2026, 'CCP T', 'theo')"))
        patcher = mock.patch.object(main, "engine", moteur)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = TestClient(main.app)

    def entetes(self, utilisateur="theo"):
        return {"Authorization": f"Bearer {main.create_access_token({'sub': utilisateur})}"}

    def creer_jeton(self, utilisateur="theo"):
        return self.client.post("/api/streamdeck/token", headers=self.entetes(utilisateur)).json()["token"]

    def lire(self, jeton):
        return self.client.get("/api/streamdeck/data", headers={"X-Streamdeck-Token": jeton})

    def test_gestion_du_jeton_exige_une_session(self):
        for methode in ("get", "post", "delete"):
            self.assertIn(getattr(self.client, methode)("/api/streamdeck/token").status_code, (401, 403))

    def test_donnees_exigent_un_jeton_valide(self):
        self.assertEqual(self.client.get("/api/streamdeck/data").status_code, 401)
        self.assertEqual(self.lire("kleea_sd_faux").status_code, 401)

    def test_jwt_de_session_refuse_comme_jeton(self):
        jwt_session = self.entetes()["Authorization"].removeprefix("Bearer ")
        self.assertEqual(self.lire(jwt_session).status_code, 401)

    def test_jeton_refuse_sur_les_routes_de_session(self):
        jeton = self.creer_jeton()
        reponse = self.client.get("/transactions", headers={"Authorization": f"Bearer {jeton}"})
        self.assertEqual(reponse.status_code, 401)

    def test_donnees_limitees_a_l_utilisateur_et_sans_iban(self):
        reponse = self.lire(self.creer_jeton())
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.headers["cache-control"], "no-store")
        self.assertEqual([c["nom"] for c in reponse.json()["comptes"]], ["CCP T"])
        self.assertEqual(reponse.json()["comptes"][0]["solde"], 70)
        self.assertNotIn("IBAN-SECRET", reponse.text)

    def test_seule_l_empreinte_est_stockee(self):
        jeton = self.creer_jeton()
        with main.engine.connect() as conn:
            stocke = conn.execute(text("SELECT token_hash FROM streamdeck_tokens")).scalar()
        self.assertNotEqual(stocke, jeton)
        self.assertEqual(stocke, main.empreinte_jeton_streamdeck(jeton))

    def test_regenerer_invalide_l_ancien_jeton(self):
        ancien = self.creer_jeton()
        nouveau = self.creer_jeton()
        self.assertEqual(self.lire(ancien).status_code, 401)
        self.assertEqual(self.lire(nouveau).status_code, 200)

    def test_revocation(self):
        jeton = self.creer_jeton()
        statut = self.client.get("/api/streamdeck/token", headers=self.entetes()).json()
        self.assertTrue(statut["active"])
        self.assertNotIn("token", statut)
        self.client.delete("/api/streamdeck/token", headers=self.entetes())
        self.assertEqual(self.lire(jeton).status_code, 401)
        self.assertFalse(self.client.get("/api/streamdeck/token", headers=self.entetes()).json()["active"])

    def test_suppression_du_compte_revoque_le_jeton(self):
        jeton = self.creer_jeton()
        self.client.delete("/profile/theo", headers=self.entetes())
        self.assertEqual(self.lire(jeton).status_code, 401)

    def lire_powens(self, jeton):
        return self.client.get("/api/streamdeck/powens", headers={"X-Streamdeck-Token": jeton})

    def test_powens_exige_un_jeton_valide(self):
        self.assertEqual(self.client.get("/api/streamdeck/powens").status_code, 401)
        self.assertEqual(self.lire_powens("kleea_sd_faux").status_code, 401)

    def test_powens_non_connecte_n_appelle_pas_powens(self):
        with mock.patch.object(main, "check_sync_status") as verification:
            reponse = self.lire_powens(self.creer_jeton("aude"))
        verification.assert_not_called()
        self.assertEqual(reponse.json(), {"connecte": False, "erreur": False, "count": 0, "comptes": {}})

    def test_powens_ne_renvoie_que_les_compteurs(self):
        resultat = {
            "has_pending": True,
            "count": 3,
            "accounts": {
                "CCP T": {"count": 2, "amount": 120.5, "earliest_date": "2026-11-01"},
                "LEP": {"count": 1, "amount": 10.0, "earliest_date": "2026-11-02"},
            },
        }
        with mock.patch.object(main, "check_sync_status", return_value=resultat) as verification:
            reponse = self.lire_powens(self.creer_jeton())
        verification.assert_called_once_with("theo", "theo")
        self.assertEqual(reponse.headers["cache-control"], "no-store")
        self.assertEqual(reponse.json(), {"connecte": True, "erreur": False, "count": 3, "comptes": {"CCP T": 2, "LEP": 1}})

    def test_powens_en_erreur_est_signale_sans_detail(self):
        resultat = {"has_pending": False, "count": 0, "accounts": {}, "error": "detail-interne"}
        with mock.patch.object(main, "check_sync_status", return_value=resultat):
            reponse = self.lire_powens(self.creer_jeton())
        self.assertTrue(reponse.json()["erreur"])
        self.assertNotIn("detail-interne", reponse.text)

    def test_acces_powens_refuse_signale_une_erreur(self):
        refus = mock.Mock(status_code=401)
        with mock.patch.object(main.requests, "get", return_value=refus), \
                mock.patch.object(main, "get_powens_transactions") as transactions:
            resultat = main.check_sync_status("theo", "theo")
        transactions.assert_not_called()
        self.assertIn("error", resultat)
        self.assertFalse(resultat["has_pending"])

    def test_suppression_du_compte_ne_laisse_pas_de_jeton_powens_lisible(self):
        jeton = self.creer_jeton()
        self.client.delete("/profile/theo", headers=self.entetes())
        self.assertEqual(self.lire_powens(jeton).status_code, 401)


class JournauxWindows(unittest.TestCase):
    def test_print_emoji_ne_plante_pas_sur_une_sortie_cp1252(self):
        racine = Path(__file__).resolve().parents[1]
        resultat = subprocess.run(
            [sys.executable, "-c", "import main; print('\U0001f50d [CHECK-SYNC] test')"],
            cwd=racine,
            env={**os.environ, "PYTHONIOENCODING": "cp1252", "PYTHONUTF8": "0"},
            capture_output=True,
        )
        self.assertEqual(resultat.returncode, 0, resultat.stderr[-500:])


if __name__ == "__main__":
    unittest.main()
