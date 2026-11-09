"""Prévisions et budgets récurrents : une règle crée les mois à venir, sans doublon, sans toucher au passé."""
import os
import sys
import unittest
from datetime import date
from pathlib import Path

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
from routes import regles  # noqa: E402

AUJOURDHUI = date.today()
COURANT = AUJOURDHUI.replace(day=1)
SUIVANT = regles.mois_suivant(COURANT)
LOYER = {"type": "prevision", "nom": "Loyer", "montant": -850, "categorie": "Logement", "compte": "CCP", "jour": 31, "debut": str(COURANT)}


def entetes(utilisateur):
    return {"Authorization": f"Bearer {aide.create_access_token({'sub': utilisateur})}"}


class Calendrier(unittest.TestCase):
    def regle(self, **valeurs):
        return {"debut": date(2026, 3, 1), "genere_jusqu_a": None, "fin": None, **valeurs}

    def test_douze_mois_a_partir_du_mois_en_cours(self):
        mois = regles.mois_a_generer(self.regle(), date(2026, 11, 18))
        self.assertEqual((mois[0], mois[-1], len(mois)), (date(2026, 11, 1), date(2027, 10, 1), 12))

    def test_reprend_apres_le_dernier_mois_genere(self):
        mois = regles.mois_a_generer(self.regle(genere_jusqu_a=date(2027, 10, 1)), date(2026, 12, 2))
        self.assertEqual(mois, [date(2027, 11, 1)])

    def test_respecte_le_debut_et_la_fin(self):
        mois = regles.mois_a_generer(self.regle(debut=date(2027, 1, 1), fin=date(2027, 3, 1)), date(2026, 11, 18))
        self.assertEqual(mois, [date(2027, 1, 1), date(2027, 2, 1), date(2027, 3, 1)])

    def test_noms_de_mois_des_deux_tables(self):
        self.assertEqual([regles.numero_du_mois(n) for n in ("Fevrier", "Février", "Aout", "Août", "décembre")], [2, 2, 8, 8, 12])


class Routes(unittest.TestCase):
    def setUp(self):
        self.moteur = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        with self.moteur.begin() as conn:
            conn.execute(text("CREATE TABLE banned_ips (ip TEXT, banned_until TIMESTAMP)"))
            conn.execute(text("CREATE TABLE previsions (id INTEGER PRIMARY KEY, date DATE, nom TEXT, montant REAL, categorie TEXT, compte TEXT, mois TEXT, annee INTEGER, utilisateur TEXT, actif BOOLEAN, regle_id INTEGER)"))
            conn.execute(text("CREATE TABLE budgets (id INTEGER PRIMARY KEY, utilisateur TEXT, mois TEXT, annee INTEGER, compte TEXT, type TEXT, nom TEXT, somme REAL, regle_id INTEGER)"))
            conn.execute(text("CREATE TABLE transactions (id INTEGER PRIMARY KEY, utilisateur TEXT, prevision_id INTEGER)"))
            conn.execute(text("""CREATE TABLE regles_recurrentes (id INTEGER PRIMARY KEY, utilisateur TEXT NOT NULL, type TEXT NOT NULL, nom TEXT NOT NULL,
                montant REAL NOT NULL, categorie TEXT, compte TEXT, jour INTEGER, debut DATE NOT NULL, fin DATE, actif BOOLEAN DEFAULT 1, genere_jusqu_a DATE)"""))
        patcher = partout("engine", self.moteur)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = TestClient(main.app)
        self.theo = entetes("theo")

    def lignes(self, table, condition="1 = 1", **params):
        with self.moteur.connect() as conn:
            return [dict(l) for l in conn.execute(text(f"SELECT * FROM {table} WHERE {condition} ORDER BY id"), params).mappings()]

    def creer(self, **valeurs):
        reponse = self.client.post("/api/regles", json={**LOYER, **valeurs}, headers=self.theo)
        self.assertEqual(reponse.status_code, 200, reponse.text)
        return reponse.json()["id"]

    def modifier(self, regle_id, **valeurs):
        reponse = self.client.put(f"/api/regles/{regle_id}", json=valeurs, headers=self.theo)
        self.assertEqual(reponse.status_code, 200, reponse.text)

    def test_une_prevision_mensuelle_cree_douze_mois(self):
        self.creer()
        previsions = self.lignes("previsions")
        self.assertEqual(len(previsions), 12)
        self.assertTrue(all(p["nom"] == "[PRÉVI] Loyer" and p["montant"] == -850 for p in previsions))
        # Le 31 devient le dernier jour des mois plus courts, et le mois est écrit comme les autres prévisions.
        fevrier = next(p for p in previsions if p["mois"] == "Fevrier")
        self.assertIn(str(fevrier["date"])[8:10], ("28", "29"))

    def test_relire_ne_cree_pas_de_doublon_et_une_ligne_supprimee_ne_revient_pas(self):
        self.creer()
        premiere = self.lignes("previsions")[0]["id"]
        self.client.delete(f"/previsions/{premiere}", headers=self.theo)
        self.client.get(f"/previsions/theo/ALL/{AUJOURDHUI.year}", headers=self.theo)
        self.client.get("/api/regles", headers=self.theo)
        self.assertEqual(len(self.lignes("previsions")), 11)

    def test_un_budget_mensuel_garde_l_exception_d_un_mois(self):
        mois_suivant = regles.MOIS_BUDGETS[SUIVANT.month - 1]
        with self.moteur.begin() as conn:
            conn.execute(text("INSERT INTO budgets (utilisateur, mois, annee, compte, type, nom, somme) VALUES ('theo', :m, :a, 'tous', 'Categorie', 'Cadeaux', 450)"), {"m": mois_suivant, "a": SUIVANT.year})
        self.creer(type="budget", nom="Cadeaux", montant=120, jour=None, compte="tous")
        budgets = self.lignes("budgets")
        self.assertEqual(len(budgets), 12)
        self.assertEqual([b["somme"] for b in budgets if b["mois"] == mois_suivant], [450])
        self.assertIn(regles.MOIS_BUDGETS[COURANT.month - 1], {b["mois"] for b in budgets})

    def test_modifier_change_les_mois_a_venir_seulement(self):
        regle_id = self.creer()
        retouchee = self.lignes("previsions", "date >= :d", d=str(regles.ajouter_mois(COURANT, 2)))[0]
        self.client.put(f"/previsions/{retouchee['id']}", json={"montant": -900}, headers=self.theo)
        self.modifier(regle_id, montant=-870)
        previsions = self.lignes("previsions")
        self.assertEqual(len(previsions), 12)
        du_mois = [p["montant"] for p in previsions if str(p["date"]) < str(SUIVANT)]
        self.assertEqual(du_mois, [-850])
        self.assertEqual(sorted({p["montant"] for p in previsions if str(p["date"]) >= str(SUIVANT)}), [-900, -870])

    def test_enregistrer_sans_rien_changer_ne_detache_pas(self):
        self.creer()
        ligne = self.lignes("previsions")[1]
        self.client.put(f"/previsions/{ligne['id']}", json={"montant": -850, "nom": "[PRÉVI] Loyer"}, headers=self.theo)
        self.assertIsNotNone(self.lignes("previsions", "id = :i", i=ligne["id"])[0]["regle_id"])
        self.client.put(f"/previsions/{ligne['id']}", json={"montant": -900}, headers=self.theo)
        self.assertIsNone(self.lignes("previsions", "id = :i", i=ligne["id"])[0]["regle_id"])

    def test_une_prevision_a_venir_liee_a_une_operation_reste(self):
        regle_id = self.creer()
        liee = self.lignes("previsions", "date >= :d", d=str(SUIVANT))[0]["id"]
        with self.moteur.begin() as conn:
            conn.execute(text("INSERT INTO transactions (utilisateur, prevision_id) VALUES ('theo', :p)"), {"p": liee})
        self.modifier(regle_id, montant=-870)
        self.assertEqual(self.lignes("previsions", "id = :i", i=liee)[0]["montant"], -850)
        # Et la règle ne la double pas ce mois-là.
        self.assertEqual(len(self.lignes("previsions")), 12)

    def test_pause_puis_reprise(self):
        regle_id = self.creer()
        self.modifier(regle_id, actif=False)
        self.assertEqual(len(self.lignes("previsions")), 1)
        self.modifier(regle_id, actif=True)
        self.assertEqual(len(self.lignes("previsions")), 12)

    def test_une_fin_limite_les_mois(self):
        self.creer(fin=str(regles.ajouter_mois(COURANT, 2)))
        self.assertEqual(len(self.lignes("previsions")), 3)

    def test_supprimer_garde_le_mois_en_cours_et_le_detache(self):
        regle_id = self.creer()
        self.assertEqual(self.client.delete(f"/api/regles/{regle_id}", headers=self.theo).status_code, 200)
        restantes = self.lignes("previsions")
        self.assertEqual([(p["regle_id"], str(p["date"])[:7]) for p in restantes], [(None, str(COURANT)[:7])])
        self.assertEqual(self.lignes("regles_recurrentes"), [])

    def test_un_autre_compte_ne_voit_ni_ne_modifie_la_regle(self):
        regle_id = self.creer()
        aude = entetes("aude")
        self.assertEqual(self.client.get("/api/regles", headers=aude).json(), [])
        self.assertEqual(self.client.put(f"/api/regles/{regle_id}", json={"montant": 1}, headers=aude).status_code, 404)
        self.assertEqual(self.client.delete(f"/api/regles/{regle_id}", headers=aude).status_code, 404)
        self.assertEqual(len(self.lignes("previsions")), 12)

    def test_une_prevision_sans_jour_est_refusee(self):
        reponse = self.client.post("/api/regles", json={**LOYER, "jour": None}, headers=self.theo)
        self.assertEqual(reponse.status_code, 400)

    def test_sans_session_tout_est_refuse(self):
        self.assertEqual(self.client.get("/api/regles").status_code, 401)


if __name__ == "__main__":
    unittest.main()
