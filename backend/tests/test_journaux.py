"""Journaux sans secret ni donnée bancaire, et erreurs renvoyées sans détail interne."""
import ast
import logging
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

# Valeurs factices posées AVANT l'import : load_dotenv() ne les écrase pas.
os.environ["DATABASE_URL"] = "postgresql://test:test@127.0.0.1:1/test"
os.environ["JWT_SECRET_KEY"] = "secret-de-test-suffisamment-long-pour-hs256"
os.environ["GEMINI_API_KEY"] = "test"
os.environ.pop("IBAN_ENCRYPTION_KEY", None)
RACINE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RACINE))
sys.stdout.reconfigure(encoding="utf-8")

from fastapi import HTTPException  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import aide  # noqa: E402
from aide import partout  # noqa: E402
import main  # noqa: E402


class MasquageDesSecrets(unittest.TestCase):
    def test_les_secrets_sont_masques(self):
        for texte, secret in (
            ("Authorization: Bearer abc.def-123", "abc.def-123"),
            ("user_token=_HCN5gOVfGbX52Dt8B5K", "_HCN5gOVfGbX52Dt8B5K"),
            ("?auth_key=cle-secrete&x=1", "cle-secrete"),
            ('{"access_token": "valeur-secrete"}', "valeur-secrete"),
            ("password=monmotdepasse", "monmotdepasse"),
            ("kleea_sd_abcdef123456", "abcdef123456"),
            ("jeton eyJhbGciOi.eyJzdWIiOi.signature-1", "signature-1"),
            ("IBAN FR76 3000 4000 0312 3456 7890 143", "3456"),
            ("compte theo.dupont@exemple.fr", "dupont@exemple.fr"),
        ):
            with self.subTest(texte=texte):
                self.assertNotIn(secret, aide.masquer_secrets(texte))

    def test_un_texte_ordinaire_reste_lisible(self):
        texte = "Erreur Powens 502 à la lecture des comptes"
        self.assertEqual(aide.masquer_secrets(texte), texte)

    def test_le_formateur_masque_aussi_la_trace(self):
        try:
            raise ValueError("user_token=secret-dans-la-trace")
        except ValueError:
            enregistrement = logging.LogRecord("kleea", logging.ERROR, __file__, 1, "panne", None, sys.exc_info())
        sortie = aide.FormateurSansSecrets().format(enregistrement)
        self.assertIn("panne", sortie)
        self.assertNotIn("secret-dans-la-trace", sortie)


class JournalAcces(unittest.TestCase):
    def lire(self, chemin):
        enregistrement = logging.LogRecord("uvicorn.access", logging.INFO, __file__, 1, '%s - "%s %s HTTP/%s" %d', ("1.2.3.4:0", "GET", chemin, "1.1", 200), None)
        self.assertTrue(aide.FiltreJournalAcces().filter(enregistrement))
        return enregistrement.getMessage()

    def test_les_parametres_d_url_disparaissent(self):
        message = self.lire("/powens/accounts?user_token=secret&x=1")
        self.assertIn("/powens/accounts", message)
        self.assertNotIn("secret", message)
        self.assertNotIn("?", message)

    def test_les_jetons_de_partage_sont_masques(self):
        for route in ("get-shared-tricount", "save-shared-transaction", "download-shared-pdf"):
            message = self.lire(f"/{route}/jeton-de-partage?sujet=x")
            self.assertIn(f"/{route}/***", message)
            self.assertNotIn("jeton-de-partage", message)
        self.assertIn("/delete-shared-transaction/***/12", self.lire("/delete-shared-transaction/abc/12"))

    def test_un_message_d_un_autre_format_passe_intact(self):
        enregistrement = logging.LogRecord("uvicorn.access", logging.INFO, __file__, 1, "texte", None, None)
        self.assertTrue(aide.FiltreJournalAcces().filter(enregistrement))
        self.assertEqual(enregistrement.getMessage(), "texte")


class CodeDuServeur(unittest.TestCase):
    def test_plus_aucun_print(self):
        arbre = ast.parse(aide.source_du_backend())
        appels = [n.lineno for n in ast.walk(arbre) if isinstance(n, ast.Call) and getattr(n.func, "id", "") == "print"]
        self.assertEqual(appels, [])

    def test_aucune_erreur_brute_renvoyee_au_navigateur(self):
        arbre = ast.parse(aide.source_du_backend())
        fautifs = []
        for noeud in ast.walk(arbre):
            if isinstance(noeud, ast.Call) and getattr(noeud.func, "id", "") == "HTTPException":
                for argument in noeud.keywords:
                    if argument.arg == "detail":
                        code = ast.unparse(argument.value)
                        if "str(e" in code or "str(err" in code or ".text" in code:
                            fautifs.append((noeud.lineno, code))
        self.assertEqual(fautifs, [])

    def test_aucune_erreur_brute_dans_une_reponse(self):
        source = aide.source_du_backend()
        self.assertNotIn('"message": str(e)', source)
        self.assertNotIn('"error": str(e)', source)

    def test_les_valeurs_sql_sont_cachees_des_erreurs(self):
        source = aide.source_du_backend()
        self.assertIn("hide_parameters=True", source)


class DetailErreur(unittest.TestCase):
    def test_message_generique_et_cause_journalisee(self):
        with self.assertLogs("kleea", level="ERROR") as journal:
            detail = aide.detail_erreur(RuntimeError("cause-interne"), "Erreur de test")
        self.assertTrue(detail.startswith("Erreur de test. Référence : "))
        self.assertNotIn("cause-interne", detail)
        reference = detail.rsplit(" ", 1)[1]
        self.assertIn(reference, journal.output[0])
        self.assertIn("cause-interne", journal.output[0])

    def test_une_erreur_deja_prevue_garde_son_message(self):
        self.assertEqual(aide.detail_erreur(HTTPException(status_code=400, detail="Lisible")), "Lisible")


class ErreurNonGeree(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        @main.app.get("/__test_panne")
        def panne():
            raise RuntimeError("cause-interne")

    def setUp(self):
        self.client = TestClient(main.app, raise_server_exceptions=False)
        patcher = partout("origins", ["https://kleea.test"])
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_reponse_propre_avec_reference(self):
        with self.assertLogs("kleea", level="ERROR") as journal:
            reponse = self.client.get("/__test_panne")
        self.assertEqual(reponse.status_code, 500)
        corps = reponse.json()
        self.assertNotIn("cause-interne", reponse.text)
        self.assertIn(corps["reference"], corps["detail"])
        self.assertIn(corps["reference"], journal.output[0])
        self.assertIn("cause-interne", "\n".join(journal.output))

    def test_le_navigateur_peut_lire_l_erreur(self):
        with self.assertLogs("kleea", level="ERROR"):
            autorisee = self.client.get("/__test_panne", headers={"Origin": "https://kleea.test"})
            inconnue = self.client.get("/__test_panne", headers={"Origin": "https://pirate.test"})
        self.assertEqual(autorisee.headers.get("Access-Control-Allow-Origin"), "https://kleea.test")
        self.assertNotIn("Access-Control-Allow-Origin", inconnue.headers)


class SuiviErreurs(unittest.TestCase):
    def test_inactif_sans_dsn(self):
        with mock.patch.dict(os.environ):
            os.environ.pop("SENTRY_DSN", None)
            self.assertFalse(aide.demarrer_suivi_erreurs())

    def test_rien_d_identifiant_ne_part(self):
        evenement = aide.nettoyer_evenement_sentry({
            "user": {"email": "t@x.fr"},
            "breadcrumbs": {"values": [{"message": "solde 1200"}]},
            "server_name": "machine",
            "extra": {"montant": 12},
            "request": {
                "method": "GET",
                "url": "https://api/get-shared-tricount/jeton?user_token=secret",
                "headers": {"Authorization": "Bearer secret"},
                "data": {"montant": 12},
                "query_string": "user_token=secret",
                "cookies": "session=secret",
            },
            "logentry": {"message": "échec user_token=secret", "formatted": "échec user_token=secret", "params": ["12,50"]},
            "exception": {"values": [{"value": "password=secret", "stacktrace": {"frames": [{"vars": {"solde": 12}, "context_line": "solde = 12", "pre_context": ["solde"], "post_context": ["solde"], "function": "f"}]}}]},
        })
        texte = str(evenement)
        for interdit in ("secret", "t@x.fr", "solde", "montant", "machine", "12,50"):
            self.assertNotIn(interdit, texte, interdit)
        self.assertEqual(evenement["request"]["method"], "GET")
        self.assertEqual(evenement["exception"]["values"][0]["stacktrace"]["frames"], [{"function": "f"}])


if __name__ == "__main__":
    unittest.main()
