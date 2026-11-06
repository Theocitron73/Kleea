"""Mêmes routes qu'en production, sur un vrai Postgres via psycopg 3 : SQLite ne voit pas les erreurs de typage.

Ces tests ne tournent que si TEST_DATABASE_URL est défini (voir .github/workflows/ci.yml) et ils effacent la base visée :
ils refusent donc tout ce qui n'est pas une base de test locale. Le schéma vient du code, pas de la production.
"""
import importlib.util
import json
import os
import sys
import unittest
from pathlib import Path
from unittest import mock
from urllib.parse import urlsplit

# Valeurs factices posées AVANT l'import : load_dotenv() ne les écrase pas.
os.environ["DATABASE_URL"] = "postgresql://test:test@127.0.0.1:1/test"
os.environ["JWT_SECRET_KEY"] = "secret-de-test-suffisamment-long-pour-hs256"
os.environ["GEMINI_API_KEY"] = "test"
os.environ.pop("IBAN_ENCRYPTION_KEY", None)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402

import aide  # noqa: E402
from aide import partout  # noqa: E402
import main  # noqa: E402

URL = os.getenv("TEST_DATABASE_URL")
VERSIONS = Path(__file__).resolve().parents[1] / "migrations" / "versions"
PROJET = {"profil": "Theo", "nom": "Voiture", "cout": 1000, "date": "2027-01-01", "capa": 100, "apport": 250}


def aide_noter():
    from routes.alertes import noter_synchro
    return noter_synchro


def charger_revision(nom: str):
    spec = importlib.util.spec_from_file_location(nom, VERSIONS / f"{nom}.py")
    revision = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(revision)
    return revision


def instructions_de_schema() -> list:
    """Les instructions des révisions : les tests tournent sur la structure relevée en production."""
    depart = charger_revision("0001_point_de_depart")
    return depart.TABLES + depart.INDEX + [charger_revision("0002_abonnements_ignores").CREATION] + charger_revision("0003_alertes").CREATIONS + charger_revision("0004_tricount_liens").CREATIONS


def verifier_base_de_test(url: str) -> None:
    morceaux = urlsplit(url)
    if morceaux.hostname not in {"127.0.0.1", "localhost"} or "test" not in morceaux.path:
        raise RuntimeError("TEST_DATABASE_URL doit viser une base de test locale : ces tests l'effacent.")


@unittest.skipUnless(URL, "TEST_DATABASE_URL n'est pas défini")
class RoutesSurPostgres(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        verifier_base_de_test(URL)
        cls.engine = create_engine(URL)
        cls.addClassCleanup(cls.engine.dispose)

    def setUp(self):
        with self.engine.begin() as conn:
            conn.execute(text("DROP SCHEMA public CASCADE"))
            conn.execute(text("CREATE SCHEMA public"))
            for instruction in instructions_de_schema():
                conn.execute(text(instruction))
        patcher = partout("engine", self.engine)
        patcher.start()
        self.addCleanup(patcher.stop)
        main.app.dependency_overrides[aide.get_current_user] = lambda: "theo"
        self.addCleanup(main.app.dependency_overrides.clear)
        self.client = TestClient(main.app)

    def projets(self):
        return self.client.get("/get-projets/Theo").json()

    def test_le_pilote_est_bien_psycopg_3(self):
        self.assertEqual(self.engine.dialect.driver, "psycopg")

    def test_creer_un_projet(self):
        # La panne de production : un paramètre NULL que psycopg 3 ne pouvait pas typer.
        reponse = self.client.post("/save-projet", json=PROJET)
        self.assertEqual(reponse.status_code, 200, reponse.text)
        self.assertEqual([p["nom"] for p in self.projets()], ["Voiture"])

    def test_un_nom_deja_pris_est_refuse(self):
        self.client.post("/save-projet", json=PROJET)
        self.assertEqual(self.client.post("/save-projet", json={**PROJET, "nom": " voiture "}).status_code, 409)

    def test_modifier_sans_date_de_debut_la_conserve(self):
        self.client.post("/save-projet", json={**PROJET, "date_debut": "2026-01-01"})
        projet = self.projets()[0]
        reponse = self.client.post(f"/update-projet/{projet['id']}", json={**PROJET, "apport": 400})
        self.assertEqual(reponse.status_code, 200, reponse.text)
        self.assertEqual(self.projets()[0]["apport_epargne"], 400)
        self.assertEqual(self.projets()[0]["date_debut"], "2026-01-01")

    def test_classer_puis_supprimer(self):
        self.client.post("/save-projet", json={**PROJET, "nom": "A"})
        self.client.post("/save-projet", json={**PROJET, "nom": "B"})
        a, b = self.projets()
        self.assertEqual(self.client.post("/reorder-projets", json={"ids": [b["id"], a["id"]]}).status_code, 200)
        self.assertEqual([p["id"] for p in self.projets()], [b["id"], a["id"]])
        self.assertEqual(self.client.delete(f"/delete-projet/{a['id']}").status_code, 200)
        self.assertEqual(self.client.delete(f"/delete-projet/{a['id']}").status_code, 404)

    def test_enveloppes(self):
        enveloppe = {"profil": "Theo", "projet": "Urgence", "montant_alloue": 500}
        self.assertEqual(self.client.post("/save-allocation", json=enveloppe).status_code, 200)
        self.assertEqual(self.client.post("/save-allocation", json=enveloppe).status_code, 409)
        self.assertEqual(self.client.get("/get-allocations/Theo").json()[0]["montant_alloue"], 500)
        self.assertEqual(self.client.delete("/delete-enveloppe/Urgence", params={"profil": "Theo"}).status_code, 200)

    def test_les_routes_qui_creaient_leur_table_fonctionnent_sur_le_schema_alembic(self):
        self.assertEqual(self.client.post("/api/notes-demenagement", json={"utilisateur": "theo", "contenu": "Cartons"}).status_code, 200)
        self.assertEqual(self.client.get("/api/notes-demenagement/theo").json(), {"contenu": "Cartons"})
        self.assertEqual(self.client.post("/api/pages-masquees", json={"pages": ["tricount"]}).status_code, 200)
        self.assertEqual(self.client.get("/api/pages-masquees/theo").json(), ["tricount"])
        self.assertFalse(self.client.get("/api/streamdeck/token").json()["active"])
        self.assertEqual(self.client.post("/api/streamdeck/token").status_code, 200)
        self.assertTrue(self.client.get("/api/streamdeck/token").json()["active"])

    def test_modifier_une_depense_par_le_lien_de_partage(self):
        with self.engine.begin() as conn:
            for token, libelle in (("jeton-a", "A"), ("jeton-b", "B")):
                conn.execute(text("""
                    INSERT INTO tricount (date, libelle, paye_par, pour_qui, montant, groupe, utilisateur, token_partage)
                    VALUES ('2026-11-02', :l, 'Aude', 'Aude:10,Theo:20', 30, 'Vacances', 'theo', :t)
                """), {"l": libelle, "t": token})
            id_a, id_b = [r[0] for r in conn.execute(text("SELECT id FROM tricount ORDER BY libelle"))]
        corps = {"id": id_a, "date": "2026-11-03", "libelle": "Train", "paye_par": "Theo", "pour_qui": "Aude:10,Theo:25.5", "montant": 35.5}

        reponse = self.client.put("/update-shared-transaction/jeton-a", json=corps)
        self.assertEqual(reponse.status_code, 200, reponse.text)
        with self.engine.connect() as conn:
            ligne = conn.execute(text("SELECT libelle, paye_par, pour_qui, montant FROM tricount WHERE id = :i"), {"i": id_a}).one()
        self.assertEqual(tuple(ligne), ("Train", "Theo", "Aude:10,Theo:25.5", 35.5))

        # Un lien ne donne accès qu'aux dépenses de son propre groupe partagé.
        refus = self.client.put("/update-shared-transaction/jeton-a", json={**corps, "id": id_b})
        self.assertEqual(refus.status_code, 403)

    def test_cycle_de_vie_d_un_lien_de_partage(self):
        with self.engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO tricount (date, libelle, paye_par, pour_qui, montant, groupe, utilisateur)
                VALUES ('2026-11-02', 'Courses', 'Aude', 'Aude:30', 30, 'Vacances', 'theo')
            """))
            identifiant = conn.execute(text("SELECT id FROM tricount")).scalar()
        lien = self.client.post("/share-group/theo/Vacances", json={"duree_jours": 7}).json()
        self.assertEqual(lien["statut"], "actif")
        jeton = lien["token"]
        self.assertIsNotNone(lien["expire_le"])
        self.assertEqual(self.client.get(f"/get-shared-tricount/{jeton}").json()["groupe"], "Vacances")

        corps = {"id": identifiant, "date": "2026-11-03", "libelle": "Train", "paye_par": "Aude", "pour_qui": "Aude:35", "montant": 35, "auteur": "Zoé"}
        self.assertEqual(self.client.put(f"/update-shared-transaction/{jeton}", json=corps).status_code, 200)
        entree = self.client.get("/share-history/theo/Vacances").json()["historique"][0]
        self.assertEqual((entree["action"], entree["auteur"]), ("modification", "Zoé"))
        self.assertEqual(entree["ancienne_valeur"]["date"], "2026-11-02")
        self.assertEqual(entree["nouvelle_valeur"]["montant"], 35)
        self.assertIn("+00:00", entree["date"])

        with self.engine.begin() as conn:
            conn.execute(text("UPDATE tricount_liens SET expire_le = CURRENT_TIMESTAMP - INTERVAL '1 hour' WHERE token = :t"), {"t": jeton})
        self.assertEqual(self.client.get(f"/get-shared-tricount/{jeton}").status_code, 410)
        self.assertEqual(self.client.get("/get-share-token/theo/Vacances").json()["statut"], "expire")

        nouveau = self.client.post("/regenerate-share/theo/Vacances", json={"duree_jours": 30}).json()["token"]
        self.assertEqual(self.client.get(f"/get-shared-tricount/{nouveau}").status_code, 200)
        self.assertEqual(self.client.get(f"/get-shared-tricount/{jeton}").json()["detail"]["code"], "lien_revoque")
        self.assertEqual(self.client.post("/revoke-share/theo/Vacances").json()["token"], None)
        self.assertEqual(self.client.get(f"/download-shared-pdf/{nouveau}").status_code, 410)

    def test_alertes_sur_le_schema_alembic(self):
        main_noter = aide_noter()
        main_noter("theo")
        main_noter("theo", RuntimeError("secret"))
        etat = self.client.get("/api/alertes/etat").json()
        self.assertIsNotNone(etat["synchro"]["dernier_succes"])
        self.assertEqual(etat["synchro"]["code_erreur"], "RuntimeError")
        for _ in range(2):
            self.assertEqual(self.client.post("/api/alertes/masquees", json={"id": "a"}).status_code, 200)
        self.assertEqual(self.client.get("/api/alertes/etat").json()["masquees"], ["a"])
        self.assertEqual(self.client.delete("/api/alertes/masquees").status_code, 200)
        self.assertEqual(self.client.get("/api/alertes/etat").json()["masquees"], [])

    def test_lignes_ignorees_sur_le_schema_alembic(self):
        url = "/api/abonnements/ignores"
        identifiant = "ORANGE|16"
        for _ in range(2):
            self.assertEqual(self.client.post(url, json={"id": identifiant}).status_code, 200)
        self.assertEqual(self.client.get(url).json(), [identifiant])
        self.assertEqual(self.client.delete(url, params={"id": identifiant}).status_code, 200)
        self.assertEqual(self.client.get(url).json(), [])

    def test_sauvegarde_sur_le_schema_alembic(self):
        from routes import sauvegarde
        from test_sauvegarde import VALEURS, ligne_type

        with self.engine.begin() as conn:
            conn.execute(text("INSERT INTO users (username, email, password, name) VALUES ('theo', 't@exemple.test', 'x', 'Théo')"))
            conn.execute(text("INSERT INTO split_sources (utilisateur, date, nom, montant, compte, split_id) VALUES ('aude', '2026-01-01', 'x', 1, 'x', 'split_pris')"))
            conn.execute(text("INSERT INTO tricount (date, libelle, montant, groupe, utilisateur, token_partage) VALUES ('2026-01-01', 'x', 1, 'Ski', 'theo', 'lien-ski')"))
        donnees = {table.nom: [ligne_type(table)] for table in sauvegarde.TABLES}
        # Des colonnes entièrement vides dans un lot : psycopg 3 ne doit pas avoir à deviner leur type.
        donnees["transactions"] = [
            {**ligne_type(sauvegarde.PAR_NOM["transactions"]), "prevision_id": 3, "split_id": "split_pris"},
            {"date": VALEURS["instant"], "nom": "Sans détail", "montant": 2},
        ]
        donnees["split_sources"] = [{**ligne_type(sauvegarde.PAR_NOM["split_sources"]), "split_id": "split_pris"}]
        donnees["budgets"].append({"mois": "Mars", "compte": "CCP"})
        donnees["projets"].append({"nom": "Sans détail"})
        donnees["tricount"][0]["groupe"] = "Ski"
        fichier = {"format": "kleea-sauvegarde", "version": 1, "compte": "theo", "donnees": donnees}

        apercu = self.client.post("/api/sauvegarde/apercu", json=fichier)
        self.assertEqual(apercu.status_code, 200, apercu.text)
        reponse = self.client.post("/api/sauvegarde/import", json=fichier)
        self.assertEqual(reponse.status_code, 200, reponse.text)
        self.assertEqual(reponse.json()["total_a_ajouter"], apercu.json()["total_a_ajouter"])

        premier = self.client.get("/api/sauvegarde/export").json()
        self.assertTrue(all(premier["donnees"].values()))
        self.assertNotEqual(premier["donnees"]["split_sources"][0]["split_id"], "split_pris")
        self.assertEqual(self.client.post("/api/sauvegarde/import", json=premier).json()["total_a_ajouter"], 0)
        with self.engine.connect() as conn:
            jetons = {l[0]: l[1] for l in conn.execute(text("SELECT libelle, token_partage FROM tricount"))}
        self.assertEqual(jetons["Valeur"], "lien-ski")

        with self.engine.begin() as conn:
            for table in sauvegarde.TABLES:
                conn.execute(text(f'DELETE FROM {table.nom} WHERE "{table.utilisateur}" = \'theo\''))
            # Le décalage des identifiants vérifie que les liens suivent.
            conn.execute(text("INSERT INTO previsions (date, nom, montant, utilisateur) VALUES ('2026-01-01', 'Décalage', 1, 'aude')"))
        self.assertEqual(self.client.post("/api/sauvegarde/import", json=premier).status_code, 200)
        second = self.client.get("/api/sauvegarde/export").json()

        def comparable(export):
            contenu = json.loads(json.dumps(export["donnees"]))
            noms = {p.pop("id"): p["nom"] for p in contenu["previsions"]}
            for operation in contenu["transactions"]:
                operation["prevision_id"] = noms.get(operation["prevision_id"])
            return contenu

        self.assertEqual(comparable(second), comparable(premier))
        self.assertEqual(second["donnees"]["custom_stats"][0]["regles"], VALEURS["structure"])


class GardeFou(unittest.TestCase):
    def test_une_base_distante_est_refusee(self):
        for url in (
            "postgresql+psycopg://u:p@ep-exemple.eu-central-1.aws.neon.tech/test",
            "postgresql+psycopg://u:p@127.0.0.1:5432/kleea",
        ):
            with self.assertRaises(RuntimeError):
                verifier_base_de_test(url)
        verifier_base_de_test("postgresql+psycopg://u:p@127.0.0.1:5432/kleea_test")


if __name__ == "__main__":
    unittest.main()
