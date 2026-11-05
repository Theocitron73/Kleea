"""Alembic : une seule tête de révisions, et l'application réelle sur la base de test locale de la CI."""
import importlib.util
import os
import subprocess
import sys
import unittest
from pathlib import Path
from urllib.parse import urlsplit

RACINE = Path(__file__).resolve().parents[2]
URL = os.getenv("TEST_DATABASE_URL")


@unittest.skipUnless(importlib.util.find_spec("alembic"), "Alembic n'est pas installé")
class Migrations(unittest.TestCase):
    def test_une_seule_tete_de_revisions(self):
        from alembic.config import Config
        from alembic.script import ScriptDirectory

        config = Config(str(RACINE / "alembic.ini"))
        config.set_main_option("script_location", str(RACINE / "backend" / "migrations"))
        self.assertEqual(len(ScriptDirectory.from_config(config).get_heads()), 1)

    @unittest.skipUnless(URL, "TEST_DATABASE_URL n'est pas défini")
    def test_monter_puis_descendre_sur_la_base_de_test(self):
        morceaux = urlsplit(URL)
        self.assertIn(morceaux.hostname, {"127.0.0.1", "localhost"})
        self.assertIn("test", morceaux.path)
        # DATABASE_URL explicite : load_dotenv() ne l'écrase pas, le .env local n'est donc jamais utilisé.
        env = {**os.environ, "DATABASE_URL": URL, "PYTHONIOENCODING": "utf-8"}
        for commande in (["upgrade", "head"], ["current"], ["downgrade", "base"]):
            resultat = subprocess.run(
                [sys.executable, "-m", "alembic", *commande], cwd=RACINE, env=env, capture_output=True, text=True,
                encoding="utf-8", stdin=subprocess.DEVNULL, timeout=60,
            )
            self.assertEqual(resultat.returncode, 0, resultat.stdout + resultat.stderr)


if __name__ == "__main__":
    unittest.main()
