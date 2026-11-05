"""Alembic : une seule tête de révisions, et l'application réelle sur la base de test locale de la CI."""
import importlib.util
import os
import re
import subprocess
import sys
import unittest
from pathlib import Path
from urllib.parse import urlsplit

RACINE = Path(__file__).resolve().parents[2]
URL = os.getenv("TEST_DATABASE_URL")


def alembic(*commande):
    # DATABASE_URL explicite : load_dotenv() ne l'écrase pas, le .env local n'est donc jamais utilisé.
    env = {**os.environ, "DATABASE_URL": URL, "PYTHONIOENCODING": "utf-8"}
    return subprocess.run(
        [sys.executable, "-m", "alembic", *commande], cwd=RACINE, env=env, capture_output=True, text=True,
        encoding="utf-8", stdin=subprocess.DEVNULL, timeout=60,
    )


@unittest.skipUnless(importlib.util.find_spec("alembic"), "Alembic n'est pas installé")
class Migrations(unittest.TestCase):
    def test_une_seule_tete_de_revisions(self):
        from alembic.config import Config
        from alembic.script import ScriptDirectory

        config = Config(str(RACINE / "alembic.ini"))
        config.set_main_option("script_location", str(RACINE / "backend" / "migrations"))
        self.assertEqual(len(ScriptDirectory.from_config(config).get_heads()), 1)

    def test_la_structure_ne_change_que_par_une_revision(self):
        for fichier in [*(RACINE / "backend").glob("*.py"), *(RACINE / "backend" / "routes").glob("*.py")]:
            contenu = fichier.read_text(encoding="utf-8")
            self.assertIsNone(re.search(r"(?i)\b(create\s+(table|index)|alter\s+table|drop\s+(table|index))\b", contenu), fichier.name)


@unittest.skipUnless(importlib.util.find_spec("alembic"), "Alembic n'est pas installé")
@unittest.skipUnless(URL, "TEST_DATABASE_URL n'est pas défini")
class MigrationsSurBaseDeTest(unittest.TestCase):
    def setUp(self):
        from sqlalchemy import create_engine

        morceaux = urlsplit(URL)
        self.assertIn(morceaux.hostname, {"127.0.0.1", "localhost"})
        self.assertIn("test", morceaux.path)
        self.engine = create_engine(URL)
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.vider)
        self.vider()

    def vider(self):
        from sqlalchemy import text

        with self.engine.begin() as conn:
            conn.execute(text("DROP SCHEMA public CASCADE"))
            conn.execute(text("CREATE SCHEMA public"))

    def tables(self):
        from sqlalchemy import inspect

        return set(inspect(self.engine).get_table_names()) - {"alembic_version"}

    def reussit(self, *commande):
        resultat = alembic(*commande)
        self.assertEqual(resultat.returncode, 0, resultat.stdout + resultat.stderr)
        return resultat

    def test_une_base_vide_est_reconstruite(self):
        self.reussit("upgrade", "head")
        self.assertEqual(len(self.tables()), 28)
        self.assertIn("0001", self.reussit("current").stdout)
        self.reussit("upgrade", "head")

    def test_le_point_de_depart_ne_se_defait_pas(self):
        self.reussit("upgrade", "head")
        self.assertNotEqual(alembic("downgrade", "base").returncode, 0)
        self.assertEqual(len(self.tables()), 28)

    def test_une_base_existante_refuse_upgrade_puis_accepte_stamp(self):
        from sqlalchemy import text

        self.reussit("upgrade", "head")
        with self.engine.begin() as conn:
            conn.execute(text("DROP TABLE alembic_version"))
            conn.execute(text("INSERT INTO users (username) VALUES ('existant')"))

        self.assertNotEqual(alembic("upgrade", "head").returncode, 0)
        self.reussit("stamp", "0001")
        self.assertIn("0001", self.reussit("current").stdout)
        with self.engine.connect() as conn:
            self.assertEqual(conn.execute(text("SELECT count(*) FROM users")).scalar(), 1)


if __name__ == "__main__":
    unittest.main()
