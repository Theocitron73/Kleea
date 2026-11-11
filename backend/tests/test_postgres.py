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
    return depart.TABLES + depart.INDEX + [charger_revision("0002_abonnements_ignores").CREATION] + charger_revision("0003_alertes").CREATIONS + charger_revision("0004_tricount_liens").CREATIONS + charger_revision("0005_sessions_connexion").CREATIONS + [charger_revision("0006_double_auth").CREATION, charger_revision("0007_double_auth_email").MODIFICATION] + charger_revision("0008_regles_recurrentes").CREATIONS + charger_revision("0009_valeur_nette").CREATIONS + charger_revision("0010_valeur_nette_suite").MODIFICATIONS + charger_revision("0011_compte_commun").CREATIONS


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

    def test_annuler_un_import_ne_retire_que_les_lignes_creees(self):
        ligne = {"date": "2026-11-05", "nom": "Achat", "montant": -10, "categorie": "Courses", "utilisateur": "theo", "mois": "Novembre", "annee": 2026, "compte": "CCP"}
        premier = self.client.post("/transactions/batch", json=[ligne]).json()
        self.assertEqual(len(premier["ids"]), 1)
        second = self.client.post("/transactions/batch", json=[ligne, {**ligne, "nom": "Autre"}]).json()
        self.assertEqual((second["added"], len(second["ids"])), (1, 1))
        self.assertTrue(second["warning"])
        self.assertEqual(self.client.request("DELETE", "/transactions/batch", json=second["ids"]).json()["status"], "success")
        with self.engine.connect() as conn:
            self.assertEqual(conn.execute(text("SELECT nom FROM transactions")).scalars().all(), ["Achat"])

    def test_double_auth_sur_le_schema_alembic(self):
        from routes import double_auth as da

        main.app.dependency_overrides.clear()  # Ici, le vrai contrôle du jeton est justement ce qu'on vérifie.
        with self.engine.begin() as conn:
            conn.execute(text("INSERT INTO users (username, email, password) VALUES ('theo', 't@kleea.test', :p)"), {"p": aide.hash_password("motdepasse1")})
        envois = []
        envoi = mock.patch.object(da, "envoyer_code", side_effect=lambda email, code: envois.append(code))
        envoi.start()
        self.addCleanup(envoi.stop)

        def login():
            reponse = self.client.post("/login", json={"nom": "theo", "password": "motdepasse1"})
            self.assertEqual(reponse.status_code, 200, reponse.text)
            return reponse.json()

        ici = {"Authorization": f"Bearer {login()['access_token']}"}
        for _ in range(2):  # Recommencer une activation inachevée reste possible.
            reponse = self.client.post("/api/double-auth/preparer", json={"password": "motdepasse1"}, headers=ici)
            self.assertEqual(reponse.status_code, 200, reponse.text)
        activation = self.client.post("/api/double-auth/activer", json={"code": envois[-1]}, headers=ici)
        self.assertEqual(activation.status_code, 200, activation.text)
        self.assertEqual(self.client.post("/api/double-auth/preparer", json={"password": "motdepasse1"}, headers=ici).status_code, 409)

        etape = login()
        self.assertNotIn("access_token", etape)
        with self.engine.connect() as conn:  # La date d'expiration revient du pilote réel, avec son fuseau.
            self.assertIsNotNone(conn.execute(text("SELECT code_expire_le FROM double_auth")).scalar().tzinfo)
        faux = "000000" if envois[-1] != "000000" else "000001"
        self.assertEqual(self.client.post("/login/double-auth", json={"jeton": etape["jeton_double_auth"], "code": faux}).status_code, 401)
        seconde = self.client.post("/login/double-auth", json={"jeton": etape["jeton_double_auth"], "code": envois[-1]})
        self.assertEqual(seconde.status_code, 200, seconde.text)
        self.assertEqual(self.client.post("/login/double-auth", json={"jeton": etape["jeton_double_auth"], "code": envois[-1]}).status_code, 401)

        self.assertEqual(self.client.post("/api/double-auth/desactiver", json={"password": "motdepasse1"}, headers=ici).status_code, 200)
        self.assertIn("access_token", login())

        # Sans la révision en production, la connexion ne doit pas tomber.
        with self.engine.begin() as conn:
            conn.execute(text("DROP TABLE double_auth"))
        self.assertIn("access_token", login())
        self.assertFalse(self.client.get("/api/double-auth", headers=ici).json()["disponible"])

    def test_sessions_sur_le_schema_alembic(self):
        main.app.dependency_overrides.clear()  # Ici, le vrai contrôle du jeton est justement ce qu'on vérifie.
        with self.engine.begin() as conn:
            conn.execute(text("INSERT INTO users (username, password) VALUES ('theo', :p)"), {"p": aide.hash_password("motdepasse1")})

        def connexion(navigateur):
            reponse = self.client.post("/login", json={"nom": "theo", "password": "motdepasse1"}, headers={"User-Agent": navigateur})
            self.assertEqual(reponse.status_code, 200, reponse.text)
            return {"Authorization": f"Bearer {reponse.json()['access_token']}"}

        ici = connexion("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36")
        ailleurs = connexion("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Safari/605.1")
        liste = self.client.get("/api/sessions", headers=ici).json()
        self.assertTrue(liste["session_suivie"])
        self.assertEqual([s["appareil"] for s in liste["sessions"]], ["Chrome sur Windows", "Safari sur iPhone"])

        # La dernière activité ancienne est rafraîchie : la comparaison de dates passe par le pilote réel.
        with self.engine.begin() as conn:
            conn.execute(text("UPDATE sessions_connexion SET derniere_activite = CURRENT_TIMESTAMP - INTERVAL '1 hour'"))
        self.assertEqual(self.client.get("/auth/test-token", headers=ailleurs).status_code, 200)
        with self.engine.connect() as conn:
            self.assertEqual(conn.execute(text("SELECT count(*) FROM sessions_connexion WHERE derniere_activite > CURRENT_TIMESTAMP - INTERVAL '1 minute'")).scalar(), 1)

        self.assertEqual(self.client.post("/api/sessions/revoquer-autres", headers=ici).json()["revoquees"], 1)
        self.assertEqual(self.client.get("/auth/test-token", headers=ailleurs).status_code, 401)
        self.assertEqual(self.client.get("/auth/test-token", headers=ici).status_code, 200)
        actuelle = self.client.get("/api/sessions", headers=ici).json()["sessions"][0]["id"]
        self.assertEqual(self.client.delete(f"/api/sessions/{actuelle}", headers=ici).status_code, 200)
        self.assertEqual(self.client.get("/auth/test-token", headers=ici).status_code, 401)

    def test_sans_la_table_des_sessions_la_connexion_reste_possible(self):
        # Sur Postgres, une table absente fait échouer la transaction : c'est le cas réel avant la migration.
        main.app.dependency_overrides.clear()
        with self.engine.begin() as conn:
            conn.execute(text("DROP TABLE sessions_connexion"))
            conn.execute(text("INSERT INTO users (username, password) VALUES ('theo', :p)"), {"p": aide.hash_password("motdepasse1")})
        reponse = self.client.post("/login", json={"nom": "theo", "password": "motdepasse1"})
        self.assertEqual(reponse.status_code, 200, reponse.text)
        entetes = {"Authorization": f"Bearer {reponse.json()['access_token']}"}
        self.assertEqual(self.client.get("/auth/test-token", headers=entetes).status_code, 200)
        self.assertFalse(self.client.get("/api/sessions", headers=entetes).json()["disponible"])

    def test_regles_recurrentes_sur_le_schema_alembic(self):
        from datetime import date
        debut = str(date.today().replace(day=1))
        loyer = {"type": "prevision", "nom": "Loyer", "montant": -850, "categorie": "Logement", "compte": "CCP", "jour": 31, "debut": debut}
        regle = self.client.post("/api/regles", json=loyer).json()["id"]
        self.client.post("/api/regles", json={"type": "budget", "nom": "Courses", "montant": 320, "compte": "tous", "debut": debut})
        self.assertEqual(len(self.client.get(f"/previsions/theo/ALL/{date.today().year}").json()) > 0, True)
        self.assertEqual(len(self.client.get("/api/regles").json()), 2)
        self.assertEqual(self.client.put(f"/api/regles/{regle}", json={"montant": -870, "sans_fin": True}).status_code, 200)
        with self.engine.connect() as conn:
            ligne, jour = conn.execute(text("SELECT id, date FROM previsions WHERE regle_id IS NOT NULL ORDER BY date DESC LIMIT 1")).one()
        self.assertEqual(self.client.put(f"/previsions/{ligne}", json={"montant": -870, "date": str(jour), "actif": True}).json()["status"], "success")
        with self.engine.connect() as conn:
            self.assertIsNotNone(conn.execute(text("SELECT regle_id FROM previsions WHERE id = :i"), {"i": ligne}).scalar())
        self.assertEqual(self.client.put(f"/api/regles/{regle}", json={"actif": False}).status_code, 200)
        self.assertEqual(self.client.put(f"/api/regles/{regle}", json={"actif": True}).status_code, 200)
        self.assertEqual(self.client.delete(f"/api/regles/{regle}").status_code, 200)
        with self.engine.connect() as conn:
            self.assertEqual(conn.execute(text("SELECT COUNT(*) FROM budgets WHERE regle_id IS NOT NULL")).scalar(), 12)
            self.assertEqual(conn.execute(text("SELECT COUNT(*) FROM previsions")).scalar(), 1)

    def test_valeur_nette_sur_le_schema_alembic(self):
        bien = self.client.post("/api/biens", json={"type": "placement", "nom": "PEA", "valeur": 18000, "date_valeur": "2026-01-01", "libelle_lien": "VIR PEA"}).json()["id"]
        dette = self.client.post("/api/dettes", json={"type": "immobilier", "nom": "Crédit", "montant": 200000, "taux": 3.5, "duree_mois": 240, "debut": "2021-04-05", "libelle_lien": "PRLV CREDIT"}).json()["id"]
        with self.engine.begin() as conn:
            conn.execute(text("INSERT INTO transactions (date, nom, montant, utilisateur) VALUES ('2026-02-05', 'VIR PEA BOURSO', -300, 'theo'), ('2025-06-20', 'PRLV CREDIT IMMO', -10000, 'theo')"))
        patrimoine = self.client.get("/api/patrimoine").json()
        self.assertEqual(patrimoine["biens"][0]["valeur"], 18300)
        operation = patrimoine["dettes"][0]["anticipes_detectes"][0]["operation_id"]
        self.assertEqual(self.client.post(f"/api/dettes/{dette}/anticipes", json={"montant": 10000, "date": "2025-06-20", "effet": "mensualite", "operation_id": operation}).status_code, 200)
        self.assertEqual(self.client.post(f"/api/dettes/{dette}/ignorer/{operation}").status_code, 200)
        self.assertEqual(self.client.get(f"/api/dettes/{dette}/simulation", params={"montant": 5000}).status_code, 200)
        self.assertEqual(self.client.put(f"/api/biens/{bien}", json={"valeur": 19000}).status_code, 200)
        self.assertEqual(self.client.put(f"/api/dettes/{dette}", json={"libelle_lien": ""}).status_code, 200)
        self.assertEqual(self.client.get("/api/patrimoine").json()["dettes"][0]["anticipes_detectes"], [])
        self.assertEqual(self.client.put(f"/api/dettes/{dette}", json={"taux": 2.9, "duree_mois": 300, "debut": "2021-05-05"}).status_code, 200)
        self.assertEqual(len(self.client.get("/api/patrimoine", params={"annee": 2026}).json()["historique"]) > 0, True)

    def test_compte_commun_sur_le_schema_alembic(self):
        from routes import partage as module_partage
        liens = []
        with self.engine.begin() as conn:
            conn.execute(text("INSERT INTO users (username, email) VALUES ('theo', 'theo@kleea.test'), ('aude', 'aude@kleea.test')"))
            conn.execute(text("INSERT INTO configuration (compte, groupe, solde, utilisateur) VALUES ('Compte joint', 'Perso', 500, 'theo'), ('CCP', 'Perso', 100, 'theo')"))
            conn.execute(text("INSERT INTO transactions (date, nom, montant, categorie, utilisateur, mois, annee, compte) VALUES ('2026-11-05', 'Courses', -10, 'Courses', 'theo', 'Novembre', 2026, 'Compte joint'), ('2026-11-05', 'Privé', -10, 'Courses', 'theo', 'Novembre', 2026, 'CCP')"))
        with mock.patch.object(module_partage, "envoyer_invitation", side_effect=lambda e, p, lien: liens.append(lien)):
            ident = self.client.post("/api/partages", json={"email": "aude@kleea.test", "comptes": ["Compte joint"]}).json()["id"]
        main.app.dependency_overrides[aide.get_current_user] = lambda: "aude"
        jeton = liens[0].split("partage=")[1]
        self.assertEqual(self.client.post("/api/partages/accepter", json={"jeton": jeton}).status_code, 200)
        noms = {o["nom"] for o in self.client.get("/transactions/aude").json()}
        self.assertEqual(noms, {"Courses"})
        self.assertEqual(self.client.post("/transactions", json={"date": "2026-11-06", "nom": "Gaz", "montant": -30, "categorie": "Énergie", "mois": "Novembre", "annee": 2026, "compte": "Compte joint · theo", "utilisateur": "aude"}).json()["status"], "success")
        prive = self.client.get("/transactions/aude").json()
        self.assertEqual(self.client.request("DELETE", "/transactions/batch", json=[o["id"] for o in prive]).json()["deleted_count"], 2)
        self.assertEqual(self.client.delete(f"/api/partages/{ident}").json()["copiees"], 0)
        with self.engine.connect() as conn:
            self.assertEqual(conn.execute(text("SELECT nom FROM transactions WHERE utilisateur = 'theo'")).scalars().all(), ["Privé"])
            self.assertEqual(conn.execute(text("SELECT COUNT(*) FROM partages_journal WHERE partage_id = :p"), {"p": ident}).scalar(), 5)

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
