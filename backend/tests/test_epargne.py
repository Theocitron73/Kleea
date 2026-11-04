"""Tests des projets et enveloppes d'épargne, sur une base SQLite en mémoire (aucun accès à la vraie base)."""
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
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import main  # noqa: E402

PROJET = {"profil": "Theo", "nom": "Voiture", "cout": 1000, "date": "2027-01-01", "capa": 100, "apport": 250, "date_debut": "2026-01-01"}


class BaseEpargne(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        with self.engine.begin() as conn:
            conn.execute(text("CREATE TABLE banned_ips (ip TEXT, banned_until TIMESTAMP)"))
            conn.execute(text("""
                CREATE TABLE projets (
                    id INTEGER PRIMARY KEY, utilisateur TEXT, profil TEXT, nom TEXT, cout REAL, date TEXT, capa REAL,
                    apport_epargne REAL DEFAULT 0, mode_epargne TEXT, date_debut TEXT,
                    utiliser_capa_stricte BOOLEAN DEFAULT 0, ordre INTEGER
                )
            """))
            conn.execute(text("""
                CREATE TABLE allocations (
                    id INTEGER PRIMARY KEY, utilisateur TEXT, profil TEXT, projet TEXT, montant_alloue REAL,
                    date_allocation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
        patcher = mock.patch.object(main, "engine", self.engine)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.utilisateur = "theo"
        main.app.dependency_overrides[main.get_current_user] = lambda: self.utilisateur
        self.addCleanup(main.app.dependency_overrides.clear)
        self.client = TestClient(main.app)

    def projets(self):
        return self.client.get("/get-projets/Theo").json()

    def creer(self, **champs):
        reponse = self.client.post("/save-projet", json={**PROJET, **champs})
        self.assertEqual(reponse.status_code, 200, reponse.text)
        return next(p for p in self.projets() if p["nom"] == champs.get("nom", PROJET["nom"]))


class Projets(BaseEpargne):
    def test_l_apport_est_enregistre_et_modifiable(self):
        projet = self.creer()
        self.assertEqual(projet["apport_epargne"], 250)
        reponse = self.client.post(f"/update-projet/{projet['id']}", json={**PROJET, "apport": 400})
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(self.projets()[0]["apport_epargne"], 400)

    def test_l_ordre_est_conserve(self):
        a = self.creer(nom="A", date="2027-01-01")
        b = self.creer(nom="B", date="2028-01-01")
        c = self.creer(nom="C", date="2029-01-01")
        self.assertEqual([p["nom"] for p in self.projets()], ["A", "B", "C"])
        self.client.post("/reorder-projets", json={"ids": [c["id"], a["id"], b["id"]]})
        self.assertEqual([p["nom"] for p in self.projets()], ["C", "A", "B"])

    def test_un_nouveau_projet_arrive_apres_ceux_deja_classes(self):
        a = self.creer(nom="A", date="2029-01-01")
        self.client.post("/reorder-projets", json={"ids": [a["id"]]})
        self.creer(nom="B", date="2027-01-01")
        self.assertEqual([p["nom"] for p in self.projets()], ["A", "B"])

    def test_deux_projets_ne_peuvent_pas_porter_le_meme_nom(self):
        self.creer()
        self.assertEqual(self.client.post("/save-projet", json={**PROJET, "nom": " voiture "}).status_code, 409)
        autre = self.creer(nom="Autre")
        self.assertEqual(self.client.post(f"/update-projet/{autre['id']}", json=PROJET).status_code, 409)
        self.assertEqual(self.client.post(f"/update-projet/{autre['id']}", json={**PROJET, "nom": "Autre"}).status_code, 200)

    def test_aucun_parametre_null_envoye_a_postgres(self):
        # psycopg 3 (production) ne sait pas typer un parametre NULL dans "IS NULL OR id <> :x" ; SQLite ne le voit pas.
        conn = mock.Mock()
        conn.execute.return_value.first.return_value = None
        main.verifier_nom_projet_libre(conn, "A", "Theo", "theo")
        requete, params = conn.execute.call_args.args
        self.assertNotIn(":sauf", str(requete))
        self.assertNotIn("sauf", params)
        main.verifier_nom_projet_libre(conn, "A", "Theo", "theo", sauf_id=3)
        requete, params = conn.execute.call_args.args
        self.assertIn(":sauf", str(requete))
        self.assertEqual(params["sauf"], 3)

    def test_les_valeurs_invalides_sont_refusees(self):
        for champs in ({"cout": -1}, {"capa": -1}, {"apport": -1}, {"nom": "   "}, {"date": "demain"}, {"date": "2026-13-45"}, {"date_debut": "nope"}):
            self.assertEqual(self.client.post("/save-projet", json={**PROJET, **champs}).status_code, 422, champs)
        self.assertEqual(self.projets(), [])

    def test_modifier_ou_supprimer_un_projet_absent_le_signale(self):
        self.assertEqual(self.client.post("/update-projet/999", json=PROJET).status_code, 404)
        self.assertEqual(self.client.delete("/delete-projet/999").status_code, 404)

    def test_un_autre_compte_ne_peut_rien_toucher(self):
        projet = self.creer()
        self.utilisateur = "aude"
        self.assertEqual(self.client.delete(f"/delete-projet/{projet['id']}").status_code, 404)
        self.assertEqual(self.client.post(f"/update-projet/{projet['id']}", json={**PROJET, "cout": 1}).status_code, 404)
        self.client.post("/reorder-projets", json={"ids": [projet["id"]]})
        self.utilisateur = "theo"
        restant = self.projets()[0]
        self.assertEqual((restant["cout"], restant["ordre"]), (1000, None))

    def test_la_suppression_ne_touche_qu_un_projet(self):
        a = self.creer(nom="A")
        self.creer(nom="B")
        self.assertEqual(self.client.delete(f"/delete-projet/{a['id']}").status_code, 200)
        self.assertEqual([p["nom"] for p in self.projets()], ["B"])


class Enveloppes(BaseEpargne):
    ENVELOPPE = {"profil": "Theo", "projet": "Vacances", "montant_alloue": 500}

    def lignes(self):
        return self.client.get("/get-allocations/Theo").json()

    def test_pas_de_doublon_de_nom(self):
        self.assertEqual(self.client.post("/save-allocation", json=self.ENVELOPPE).status_code, 200)
        self.assertEqual(self.client.post("/save-allocation", json={**self.ENVELOPPE, "projet": "VACANCES"}).status_code, 409)
        self.assertEqual(len(self.lignes()), 1)

    def test_montant_negatif_refuse(self):
        self.assertEqual(self.client.post("/save-allocation", json={**self.ENVELOPPE, "montant_alloue": -1}).status_code, 422)
        self.client.post("/save-allocation", json=self.ENVELOPPE)
        reponse = self.client.put("/update-enveloppe-montant", params={"projet": "Vacances", "profil": "Theo", "nouveau_montant": -5})
        self.assertEqual(reponse.status_code, 422)
        self.assertEqual(self.lignes()[0]["montant_alloue"], 500)

    def test_enveloppe_absente_signalee_sans_creer_de_ligne(self):
        self.assertEqual(self.client.delete("/delete-enveloppe/Rien", params={"profil": "Theo"}).status_code, 404)
        reponse = self.client.put("/update-enveloppe-montant", params={"projet": "Rien", "profil": "Theo", "nouveau_montant": 5})
        self.assertEqual(reponse.status_code, 404)
        self.assertEqual(self.lignes(), [])

    def test_modification_et_suppression(self):
        self.client.post("/save-allocation", json=self.ENVELOPPE)
        self.client.put("/update-enveloppe-montant", params={"projet": "vacances", "profil": "Theo", "nouveau_montant": 700})
        self.assertEqual([(l["projet"], l["montant_alloue"]) for l in self.lignes()], [("vacances", 700)])
        self.assertEqual(self.client.delete("/delete-enveloppe/Vacances", params={"profil": "Theo"}).status_code, 200)
        self.assertEqual(self.lignes(), [])


class LignesSansProprietaire(BaseEpargne):
    """Une ligne sans vrai propriétaire n'est plus accessible à aucun compte."""

    def setUp(self):
        super().setUp()
        with self.engine.begin() as conn:
            for utilisateur in ("System", "Anonyme", None):
                conn.execute(text(
                    "INSERT INTO allocations (utilisateur, profil, projet, montant_alloue) VALUES (:u, 'Theo', 'Ancienne', 10)"
                ), {"u": utilisateur})
                conn.execute(text(
                    "INSERT INTO projets (utilisateur, profil, nom, cout, date) VALUES (:u, 'Theo', 'Ancien', 10, '2027-01-01')"
                ), {"u": utilisateur})

    def nb_lignes(self, table):
        with self.engine.connect() as conn:
            return conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()

    def test_ni_lisibles_ni_modifiables(self):
        self.assertEqual(self.client.get("/get-allocations/Theo").json(), [])
        self.assertEqual(self.projets(), [])
        self.assertEqual(self.client.delete("/delete-enveloppe/Ancienne", params={"profil": "Theo"}).status_code, 404)
        reponse = self.client.put("/update-enveloppe-montant", params={"projet": "Ancienne", "profil": "Theo", "nouveau_montant": 1})
        self.assertEqual(reponse.status_code, 404)
        self.assertEqual((self.nb_lignes("allocations"), self.nb_lignes("projets")), (3, 3))

    def test_elles_ne_bloquent_pas_le_nom_pour_un_compte(self):
        reponse = self.client.post("/save-allocation", json={"profil": "Theo", "projet": "Ancienne", "montant_alloue": 5})
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual([l["montant_alloue"] for l in self.client.get("/get-allocations/Theo").json()], [5])


if __name__ == "__main__":
    unittest.main()
