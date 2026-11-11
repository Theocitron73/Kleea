"""Suppression d'un compte : aucune ligne restante, aucun autre compte touché, et un inventaire qui reste complet."""
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

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
from aide import creer_tables_manquantes, partout, schema_des_revisions  # noqa: E402
import main  # noqa: E402
from suppression_compte import ACTION_PAR_EMAIL, TABLE_DES_LIMITES, TABLES_DES_PARTAGES, TABLES_DU_COMPTE, TABLES_SANS_COMPTE  # noqa: E402

COLONNES_DE_COMPTE = {"utilisateur", "user", "username", "email"}
ROUTES = ("/profile/theo", "/profile/me")
INSCRIPTION = {"nom": "theo", "email": "theo@exemple.fr", "password": "motdepasse1", "first_name": "T", "last_name": "L"}


def tables_a_classer(schema: dict) -> set:
    return set(schema) - set(TABLES_DU_COMPTE) - set(TABLES_SANS_COMPTE) - set(TABLES_DES_PARTAGES) - {TABLE_DES_LIMITES}


def entetes(utilisateur="theo"):
    return {"Authorization": f"Bearer {aide.create_access_token({'sub': utilisateur})}"}


class Inventaire(unittest.TestCase):
    def setUp(self):
        self.schema = schema_des_revisions()

    def test_le_releve_lit_bien_les_revisions(self):
        self.assertIn("user", self.schema["theme"])
        self.assertIn("loyer", self.schema["annonces_logement"])  # Après un numeric(10,2).
        self.assertIn("synchro_etat", self.schema)
        self.assertNotIn("CONSTRAINT", self.schema["theme"])
        self.assertNotIn("constraint_theme", self.schema["theme"])

    def test_chaque_table_des_revisions_est_classee(self):
        self.assertEqual(
            tables_a_classer(self.schema), set(),
            "Nouvelle table : la classer dans suppression_compte.py, sinon ses lignes survivront à la suppression du compte.",
        )

    def test_l_inventaire_ne_cite_que_des_tables_et_colonnes_existantes(self):
        classees = {*TABLES_DU_COMPTE, *TABLES_SANS_COMPTE, *TABLES_DES_PARTAGES, TABLE_DES_LIMITES}
        self.assertEqual(classees - set(self.schema), set())
        for table, colonne in TABLES_DU_COMPTE.items():
            self.assertIn(colonne, self.schema[table], table)

    def test_une_table_avec_une_colonne_de_compte_n_est_pas_ecartee(self):
        for table in TABLES_SANS_COMPTE:
            self.assertEqual(self.schema[table] & COLONNES_DE_COMPTE, set(), table)

    def test_le_garde_fou_voit_une_table_ajoutee_par_une_revision(self):
        with tempfile.TemporaryDirectory() as dossier:
            for nom, contenu in (
                ("0001.py", 'op.execute("""CREATE TABLE nouvelle (\n  utilisateur text NOT NULL,\n  somme numeric(10,2),\n  CONSTRAINT c PRIMARY KEY (utilisateur)\n)""")\n'),
                ("0002.py", 'op.execute("ALTER TABLE nouvelle ADD COLUMN note text")\nCREATION = "CREATE TABLE ephemere (a text)"\ndef downgrade():\n    op.execute("DROP TABLE nouvelle")\n'),
                ("0003.py", 'op.execute("ALTER TABLE ephemere RENAME TO renommee")\nop.execute("DROP TABLE renommee")\n'),
            ):
                Path(dossier, nom).write_text(contenu, encoding="utf-8")
            schema = schema_des_revisions(dossier)
        self.assertEqual(schema, {"nouvelle": {"utilisateur", "somme", "note"}})
        self.assertEqual(tables_a_classer(schema), {"nouvelle"})

    def test_une_revision_illisible_echoue_au_lieu_d_etre_oubliee(self):
        with tempfile.TemporaryDirectory() as dossier:
            Path(dossier, "0001.py").write_text('op.create_table("nouvelle")\n', encoding="utf-8")
            with self.assertRaises(ValueError):
                schema_des_revisions(dossier)


class Suppression(unittest.TestCase):
    def setUp(self):
        self.moteur = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        self.addCleanup(self.moteur.dispose)
        with self.moteur.begin() as conn:
            creer_tables_manquantes(conn)
            # Les trois graphies existent en base, et un identifiant qui commence pareil ne doit pas être touché.
            for table, colonne in TABLES_DU_COMPTE.items():
                for valeur in ("Theo", "THEO", "theo", "aude", "theodore"):
                    conn.execute(text(f'INSERT INTO "{table}" ("{colonne}") VALUES (:v)'), {"v": valeur})
            conn.execute(text("UPDATE users SET email = 'Theo@Exemple.fr' WHERE username = 'theo'"))
            conn.execute(text("UPDATE users SET email = 'aude@exemple.fr' WHERE username = 'aude'"))
            conn.execute(text("UPDATE tricount SET token_partage = 'lien-' || utilisateur"))
            for cle, action in (
                ("theo", "gemini_chat"), ("theo@exemple.fr", ACTION_PAR_EMAIL),
                ("aude", "gemini_chat"), ("aude@exemple.fr", ACTION_PAR_EMAIL),
                ("theo", ACTION_PAR_EMAIL),  # L'e-mail d'un autre compte peut être égal à cet identifiant.
            ):
                conn.execute(text(f"INSERT INTO {TABLE_DES_LIMITES} (key, action) VALUES (:k, :a)"), {"k": cle, "a": action})
            conn.execute(text("INSERT INTO banned_ips (ip) VALUES ('203.0.113.1')"))
            conn.execute(text("INSERT INTO login_failed_attempts (ip) VALUES ('203.0.113.1')"))
        patcher = partout("engine", self.moteur)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = TestClient(main.app)

    def valeurs(self, table, colonne):
        with self.moteur.connect() as conn:
            return sorted(r[0] for r in conn.execute(text(f'SELECT "{colonne}" FROM "{table}"')))

    def donner_un_jeton_powens(self, jeton="jeton-theo"):
        with self.moteur.begin() as conn:
            conn.execute(text("UPDATE users SET powens_token = :j WHERE username = 'theo'"), {"j": aide.chiffrer_jeton(jeton)})

    def verifier_compte_efface(self):
        for table, colonne in TABLES_DU_COMPTE.items():
            self.assertEqual(self.valeurs(table, colonne), ["aude", "theodore"], table)

    def test_il_ne_reste_aucune_ligne_et_les_autres_comptes_sont_intacts(self):
        for route in ROUTES:
            with self.subTest(route=route):
                self.setUp()
                reponse = self.client.delete(route, headers=entetes())
                self.assertEqual(reponse.status_code, 200, reponse.text)
                self.assertEqual(reponse.json()["powens"], "absent")
                self.verifier_compte_efface()

    def test_les_liens_de_partage_disparaissent(self):
        self.client.delete("/profile/theo", headers=entetes())
        self.assertEqual(self.valeurs("tricount", "token_partage"), ["lien-aude", "lien-theodore"])

    def test_les_partages_du_compte_sont_effaces_et_son_nom_retire_des_lignes_partagees(self):
        with self.moteur.begin() as conn:
            conn.execute(text("""INSERT INTO partages (id, proprietaire, invite, invite_email, etat) VALUES
                (1, 'Theo', 'aude', 'aude@exemple.fr', 'arrete'),
                (2, 'aude', NULL, 'theo@exemple.fr', 'arrete'),
                (3, 'aude', 'theodore', 'theodore@exemple.fr', 'arrete')"""))
            for ident in (1, 2, 3):
                conn.execute(text("INSERT INTO partages_comptes (partage_id, compte) VALUES (:i, 'Joint')"), {"i": ident})
                conn.execute(text("INSERT INTO partages_journal (partage_id, auteur, action) VALUES (:i, 'aude', 'arret')"), {"i": ident})
            conn.execute(text("UPDATE transactions SET auteur = 'theo' WHERE utilisateur = 'aude'"))
            conn.execute(text("UPDATE previsions SET auteur = 'theodore' WHERE utilisateur = 'aude'"))
        self.client.delete("/profile/theo", headers=entetes())
        self.assertEqual(self.valeurs("partages", "id"), [3])
        self.assertEqual(self.valeurs("partages_comptes", "partage_id"), [3])
        self.assertEqual(self.valeurs("partages_journal", "partage_id"), [3])
        with self.moteur.connect() as conn:
            self.assertIsNone(conn.execute(text("SELECT auteur FROM transactions WHERE utilisateur = 'aude'")).scalar())
            self.assertEqual(conn.execute(text("SELECT auteur FROM previsions WHERE utilisateur = 'aude'")).scalar(), "theodore")

    def test_les_limites_de_debit_du_compte_sont_effacees(self):
        self.client.delete("/profile/theo", headers=entetes())
        with self.moteur.connect() as conn:
            lignes = {tuple(l) for l in conn.execute(text(f"SELECT key, action FROM {TABLE_DES_LIMITES}"))}
        self.assertEqual(lignes, {("aude", "gemini_chat"), ("aude@exemple.fr", ACTION_PAR_EMAIL), ("theo", ACTION_PAR_EMAIL)})

    def test_les_tables_de_securite_du_site_restent(self):
        self.client.delete("/profile/theo", headers=entetes())
        self.assertEqual(self.valeurs("banned_ips", "ip"), ["203.0.113.1"])
        self.assertEqual(self.valeurs("login_failed_attempts", "ip"), ["203.0.113.1"])

    def test_une_reinscription_repart_d_un_compte_vide(self):
        self.donner_un_jeton_powens()
        with mock.patch.object(aide.requests, "delete", return_value=mock.Mock(ok=True, status_code=204)):
            self.client.delete("/profile/theo", headers=entetes())

        reponse = self.client.post("/register", json=INSCRIPTION)
        self.assertEqual(reponse.status_code, 200, reponse.text)
        session = {"Authorization": f"Bearer {reponse.json()['access_token']}"}

        self.assertEqual(self.client.get("/note/theo", headers=session).json(), {"texte": ""})
        self.assertEqual(self.client.get("/api/pages-masquees/theo", headers=session).json(), [])
        for table, colonne in TABLES_DU_COMPTE.items():
            with self.moteur.connect() as conn:
                # La réinscription crée le compte et ouvre sa première session.
                attendu = 1 if table in ("users", "sessions_connexion") else 0
                compte = conn.execute(text(f'SELECT COUNT(*) FROM "{table}" WHERE LOWER("{colonne}") = \'theo\'')).scalar()
            self.assertEqual(compte, attendu, table)
        with self.moteur.connect() as conn:
            jeton = conn.execute(text("SELECT powens_token FROM users WHERE username = 'theo'")).scalar()
        self.assertIsNone(jeton)

    def test_une_erreur_de_base_n_efface_rien(self):
        # Une panne après l'effacement des tables du compte : tout doit être annulé avec elle.
        client = TestClient(main.app, raise_server_exceptions=False)
        with mock.patch("suppression_compte.purger_partages", side_effect=RuntimeError("panne")):
            self.assertEqual(client.delete("/profile/theo", headers=entetes()).status_code, 500)
        for table, colonne in TABLES_DU_COMPTE.items():
            self.assertEqual(self.valeurs(table, colonne), sorted(["Theo", "THEO", "theo", "aude", "theodore"]), table)

    def test_une_table_absente_n_empeche_pas_la_suppression(self):
        with self.moteur.begin() as conn:
            conn.execute(text("DROP TABLE sessions_connexion"))
        self.assertEqual(self.client.delete("/profile/theo", headers=entetes()).status_code, 200)
        self.assertEqual(self.valeurs("users", "username"), ["aude", "theodore"])

    def test_un_autre_compte_ne_peut_pas_supprimer(self):
        self.assertEqual(self.client.delete("/profile/aude", headers=entetes()).status_code, 403)
        self.assertEqual(self.client.delete("/profile/theo").status_code, 401)
        self.assertEqual(self.client.delete("/profile/me").status_code, 401)
        self.assertEqual(self.valeurs("users", "username").count("aude"), 1)

    def test_un_compte_inconnu_renvoie_404(self):
        for route in ("/profile/inconnu", "/profile/me"):
            self.assertEqual(self.client.delete(route, headers=entetes("inconnu")).status_code, 404)

    def test_powens_est_revoque_avec_le_jeton_du_compte(self):
        self.donner_un_jeton_powens()
        with mock.patch.object(aide.requests, "delete", return_value=mock.Mock(ok=True, status_code=204)) as appel:
            reponse = self.client.delete("/profile/theo", headers=entetes())
        self.assertEqual(reponse.json()["powens"], "revoque")
        appel.assert_called_once()
        self.assertTrue(appel.call_args.args[0].endswith("/users/me"))
        self.assertEqual(appel.call_args.kwargs["headers"]["Authorization"], "Bearer jeton-theo")
        self.assertIn("timeout", appel.call_args.kwargs)
        self.verifier_compte_efface()

    def test_sans_jeton_powens_n_est_pas_appele(self):
        with mock.patch.object(aide.requests, "delete") as appel:
            self.client.delete("/profile/theo", headers=entetes())
        appel.assert_not_called()

    def test_une_panne_de_powens_n_empeche_pas_la_suppression_et_est_signalee(self):
        pannes = (
            {"side_effect": aide.requests.ConnectionError("detail-interne jeton-theo")},
            {"return_value": mock.Mock(ok=False, status_code=503)},
        )
        for panne in pannes:
            with self.subTest(panne=panne):
                self.setUp()
                self.donner_un_jeton_powens()
                with mock.patch.object(aide.requests, "delete", **panne):
                    reponse = self.client.delete("/profile/theo", headers=entetes())
                self.assertEqual(reponse.status_code, 200, reponse.text)
                self.assertEqual(reponse.json()["powens"], "echec")
                self.assertIn("Powens", reponse.json()["message"])
                self.assertNotIn("jeton-theo", reponse.text)
                self.verifier_compte_efface()

    def test_la_panne_de_powens_ne_journalise_ni_jeton_ni_detail(self):
        self.donner_un_jeton_powens()
        with mock.patch.object(aide.requests, "delete", side_effect=aide.requests.ConnectionError("detail jeton-theo")), \
                self.assertLogs(aide.logger, level="WARNING") as journaux:
            self.client.delete("/profile/theo", headers=entetes())
        self.assertNotIn("jeton-theo", "\n".join(journaux.output))


if __name__ == "__main__":
    unittest.main()
