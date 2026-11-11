"""Valeur nette : échéancier des crédits, remboursements anticipés, biens, et routes du compte."""
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
from unittest import mock  # noqa: E402
from routes import patrimoine as routes_patrimoine  # noqa: E402
import main  # noqa: E402
import patrimoine_calculs as calc  # noqa: E402

CREDIT = {"montant": 200000, "taux": 3.5, "duree_mois": 240, "debut": date(2021, 4, 5), "anticipes": []}


def entetes(utilisateur):
    return {"Authorization": f"Bearer {aide.create_access_token({'sub': utilisateur})}"}


class Echeancier(unittest.TestCase):
    def test_mensualite_connue(self):
        self.assertAlmostEqual(calc.mensualite(200000, 3.5, 240), 1159.92, places=2)
        self.assertAlmostEqual(calc.mensualite(12000, 0, 24), 500)

    def test_le_tableau_rembourse_tout_le_capital_a_la_date_prevue(self):
        lignes = calc.tableau(200000, 3.5, 240, date(2021, 4, 5))
        self.assertEqual(len(lignes), 240)
        self.assertAlmostEqual(sum(l["capital"] for l in lignes), 200000, places=2)
        self.assertEqual((lignes[-1]["date"], round(lignes[-1]["restant"], 2)), (date(2041, 3, 5), 0))

    def test_le_31_devient_le_dernier_jour_du_mois(self):
        self.assertEqual(calc.ajouter_mois(date(2026, 1, 31), 1), date(2026, 2, 28))
        self.assertEqual(calc.ajouter_mois(date(2026, 11, 30), 3), date(2027, 2, 28))

    def test_etat_a_une_date(self):
        etat = calc.etat_dette(CREDIT, date(2026, 11, 18))
        self.assertEqual(etat["echeances_payees"], 68)
        self.assertEqual(etat["fin"], date(2041, 3, 5))
        self.assertTrue(150000 < etat["capital_restant"] < 160000)
        avant_debut = calc.etat_dette(CREDIT, date(2021, 1, 1))
        self.assertEqual((avant_debut["capital_restant"], avant_debut["rembourse_pct"]), (200000, 0))

    def test_un_anticipe_en_duree_raccourcit_le_credit(self):
        simulation = calc.simuler_anticipe(CREDIT, 10000, "duree", date(2026, 11, 18))
        self.assertGreater(simulation["mois_gagnes"], 0)
        self.assertGreater(simulation["interets_economises"], 0)
        self.assertAlmostEqual(simulation["apres"]["mensualite"], simulation["avant"]["mensualite"], places=2)

    def test_un_anticipe_en_mensualite_garde_la_fin(self):
        simulation = calc.simuler_anticipe(CREDIT, 10000, "mensualite", date(2026, 11, 18))
        self.assertEqual(simulation["apres"]["fin"], simulation["avant"]["fin"])
        self.assertLess(simulation["apres"]["mensualite"], simulation["avant"]["mensualite"])
        self.assertAlmostEqual(simulation["apres"]["capital_restant"], simulation["avant"]["capital_restant"] - 10000, places=2)

    def test_un_anticipe_qui_solde_le_credit(self):
        etat = calc.etat_dette({**CREDIT, "anticipes": [{"date": date(2026, 1, 1), "montant": 10**7, "effet": "duree"}]}, date(2026, 11, 18))
        self.assertEqual((etat["capital_restant"], etat["fin"]), (0, date(2026, 1, 1)))

    def test_une_mensualite_trop_faible_ne_boucle_pas_sans_fin(self):
        self.assertEqual(calc.tableau(1000, 0, 0, date(2026, 1, 1))[-1]["restant"], 0)


class Biens(unittest.TestCase):
    def test_decote_annuelle(self):
        voiture = {"valeur": 16000, "date_valeur": date(2024, 11, 18), "decote": 15}
        self.assertAlmostEqual(calc.valeur_bien(voiture, date(2026, 11, 18)), 16000 * 0.85 ** 2, delta=20)

    def test_versements_relies_apres_la_saisie(self):
        pea = {"valeur": 18000, "date_valeur": date(2026, 10, 1), "libelle_lien": "VIR PEA"}
        operations = [
            {"id": 1, "date": date(2026, 9, 5), "nom": "VIR PEA BOURSO", "montant": -200},
            {"id": 2, "date": date(2026, 10, 5), "nom": "vir pea bourso", "montant": -200},
            {"id": 3, "date": date(2026, 10, 6), "nom": "VIR PEA BOURSO", "montant": 50},
        ]
        self.assertEqual(calc.versements_lies(pea, operations), 200)

    def test_la_performance_d_un_placement_ne_compte_pas_les_versements(self):
        pea = {"valeur": 11500, "date_valeur": date(2026, 6, 1), "libelle_lien": "VIR PEA",
               "valeurs": [{"date": date(2026, 1, 1), "valeur": 10000}, {"date": date(2026, 6, 1), "valeur": 11500}]}
        operations = [
            {"id": 1, "date": date(2026, 3, 1), "nom": "VIR PEA", "montant": -1000},
            {"id": 2, "date": date(2026, 7, 1), "nom": "VIR PEA", "montant": -500},
            {"id": 3, "date": date(2025, 12, 1), "nom": "VIR PEA", "montant": -999},
        ]
        suivi = calc.suivi_placement(pea, operations, date(2026, 11, 11))
        self.assertEqual([(p["valeur"], p["investi"]) for p in suivi["points"]], [(10000, 10000), (11500, 11000), (12000, 11500)])
        self.assertEqual((suivi["investi"], suivi["gain"], suivi["performance"]), (11500, 500, 4.35))

    def test_rapprochement_des_prelevements(self):
        dette = {**CREDIT, "libelle_lien": "PRLV CREDIT", "ignores": [7]}
        operations = [
            {"id": 1, "date": date(2026, 10, 5), "nom": "PRLV CREDIT IMMO", "montant": -1159.92},
            {"id": 2, "date": date(2026, 6, 20), "nom": "PRLV CREDIT IMMO", "montant": -10000},
            {"id": 7, "date": date(2026, 7, 20), "nom": "PRLV CREDIT IMMO", "montant": -5000},
        ]
        lien = calc.rapprocher(dette, operations, date(2026, 11, 18))
        vues = {str(e["date"])[:7]: e["vue"] for e in lien["echeances"]}
        self.assertEqual((vues["2026-10"], vues["2026-09"], vues["2026-11"]), (True, False, False))
        self.assertEqual([a["operation_id"] for a in lien["anticipes_detectes"]], [2])

    def test_sans_libelle_rien_n_est_rapproche(self):
        self.assertEqual(calc.rapprocher(CREDIT, [], date(2026, 11, 18)), {"echeances": [], "anticipes_detectes": []})


class Routes(unittest.TestCase):
    def setUp(self):
        self.moteur = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        with self.moteur.begin() as conn:
            conn.execute(text("CREATE TABLE banned_ips (ip TEXT, banned_until TIMESTAMP)"))
            conn.execute(text("CREATE TABLE transactions (id INTEGER PRIMARY KEY, date TIMESTAMP, nom TEXT, montant REAL, utilisateur TEXT, categorie TEXT)"))
            conn.execute(text("CREATE TABLE config_categories (categorie TEXT, mots_cles TEXT, utilisateur TEXT)"))
            conn.execute(text("""CREATE TABLE biens (id INTEGER PRIMARY KEY, utilisateur TEXT NOT NULL, type TEXT NOT NULL, nom TEXT NOT NULL, valeur REAL NOT NULL,
                date_valeur DATE NOT NULL, decote REAL, libelle_lien TEXT, profil TEXT, cree_le TIMESTAMP, quantite REAL, crypto_id TEXT, valeurs TEXT)"""))
            conn.execute(text("""CREATE TABLE dettes (id INTEGER PRIMARY KEY, utilisateur TEXT NOT NULL, type TEXT NOT NULL, nom TEXT NOT NULL, montant REAL NOT NULL,
                taux REAL NOT NULL, duree_mois INTEGER, debut DATE NOT NULL, libelle_lien TEXT, profil TEXT, anticipes TEXT, ignores TEXT, cree_le TIMESTAMP,
                powens_compte_id TEXT, capital_banque REAL, capital_banque_le TIMESTAMP)"""))
        patcher = partout("engine", self.moteur)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = TestClient(main.app)
        self.theo = entetes("theo")

    def appel(self, methode, url, attendu=200, session=None, **kwargs):
        reponse = self.client.request(methode, url, headers=session or self.theo, **kwargs)
        self.assertEqual(reponse.status_code, attendu, reponse.text)
        return reponse.json()

    def operation(self, jour, nom, montant, utilisateur="theo"):
        with self.moteur.begin() as conn:
            return conn.execute(text("INSERT INTO transactions (date, nom, montant, utilisateur) VALUES (:d, :n, :m, :u) RETURNING id"),
                                {"d": f"{jour} 00:00:00", "n": nom, "m": montant, "u": utilisateur}).scalar()

    def test_biens_et_dettes_font_la_valeur_nette(self):
        self.appel("POST", "/api/biens", json={"type": "immobilier", "nom": "Appartement", "valeur": 245000})
        self.appel("POST", "/api/dettes", json={"type": "immobilier", "nom": "Crédit immo", "montant": 200000, "taux": 3.5, "duree_mois": 240, "debut": "2021-04-05"})
        patrimoine = self.appel("GET", "/api/patrimoine")
        self.assertEqual(patrimoine["total_biens"], 245000)
        dette = patrimoine["dettes"][0]
        self.assertEqual((dette["mensualite"], dette["fin"]), (1159.92, "2041-03-05"))
        self.assertEqual(patrimoine["total_dettes"], dette["capital_restant"])

    def test_les_virements_relies_deviennent_des_virements_internes(self):
        self.operation("2026-02-05", "VIR PEA BOURSO", -300)
        deja = self.operation("2026-03-05", "VIR PEA BOURSO", -300)
        with self.moteur.begin() as conn:
            conn.execute(text("UPDATE transactions SET categorie = 'Virement : CCP vers LDDS' WHERE id = :i"), {"i": deja})
        self.operation("2026-02-06", "VIR PEA BOURSO", 50)
        self.operation("2026-02-05", "VIR PEA BOURSO", -300, utilisateur="aude")
        bien = self.appel("POST", "/api/biens", json={"type": "placement", "nom": "PEA", "valeur": 18000, "libelle_lien": "VIR PEA"})
        self.assertEqual(bien["virements_reclasses"], 1)
        with self.moteur.connect() as conn:
            categories = conn.execute(text("SELECT utilisateur, montant, categorie FROM transactions ORDER BY id")).all()
            regles = conn.execute(text("SELECT categorie, mots_cles, utilisateur FROM config_categories")).all()
        self.assertEqual([c for _, _, c in categories], ["Virement : vers PEA", "Virement : CCP vers LDDS", None, None])
        self.assertEqual(regles, [("Virement : vers PEA", '{"VIR PEA"}', "theo")])

        self.appel("PUT", f"/api/biens/{bien['id']}", json={"libelle_lien": ""})
        with self.moteur.connect() as conn:
            self.assertEqual(conn.execute(text("SELECT COUNT(*) FROM config_categories")).scalar(), 0)
        self.appel("PUT", f"/api/biens/{bien['id']}", json={"libelle_lien": "VIR PEA"})
        self.appel("DELETE", f"/api/biens/{bien['id']}")
        with self.moteur.connect() as conn:
            self.assertEqual(conn.execute(text("SELECT COUNT(*) FROM config_categories")).scalar(), 0)
            self.assertEqual(conn.execute(text("SELECT categorie FROM transactions WHERE id = 1")).scalar(), "Virement : vers PEA")

    def test_un_placement_relie_suit_les_virements(self):
        bien = self.appel("POST", "/api/biens", json={"type": "placement", "nom": "PEA", "valeur": 18000, "date_valeur": "2026-01-01", "libelle_lien": "VIR PEA"})["id"]
        self.operation("2026-02-05", "VIR PEA BOURSO", -300)
        self.operation("2026-02-05", "VIR PEA BOURSO", -300, utilisateur="aude")
        self.assertEqual(self.appel("GET", "/api/patrimoine")["biens"][0]["valeur"], 18300)
        # Une nouvelle valeur saisie repart d'aujourd'hui : le virement déjà compté ne s'ajoute plus.
        self.appel("PUT", f"/api/biens/{bien}", json={"valeur": 18900})
        self.appel("PUT", f"/api/biens/{bien}", json={"valeur": 19000})
        placement = self.appel("GET", "/api/patrimoine")["biens"][0]
        self.assertEqual(placement["valeur"], 19000)
        # Une valeur par jour dans la courbe ; la performance retire le virement de 300 €.
        self.assertEqual([p["valeur"] for p in placement["suivi"]["points"]], [18000, 19000])
        self.assertEqual((placement["suivi"]["investi"], placement["suivi"]["gain"]), (18300, 700))

    def test_remboursement_anticipe_detecte_puis_confirme_ou_ignore(self):
        dette = self.appel("POST", "/api/dettes", json={"type": "immobilier", "nom": "Crédit", "montant": 200000, "taux": 3.5, "duree_mois": 240, "debut": "2021-04-05", "libelle_lien": "PRLV CREDIT"})["id"]
        gros = self.operation("2025-06-20", "PRLV CREDIT IMMO", -10000)
        autre = self.operation("2025-07-20", "PRLV CREDIT IMMO", -5000)
        detectes = self.appel("GET", "/api/patrimoine")["dettes"][0]["anticipes_detectes"]
        self.assertEqual({d["operation_id"] for d in detectes}, {gros, autre})
        avant = self.appel("GET", "/api/patrimoine")["dettes"][0]["capital_restant"]

        self.appel("POST", f"/api/dettes/{dette}/anticipes", json={"montant": 10000, "date": "2025-06-20", "effet": "duree", "operation_id": gros})
        self.appel("POST", f"/api/dettes/{dette}/anticipes", json={"montant": 10000, "date": "2025-06-20", "effet": "duree", "operation_id": gros})
        self.appel("POST", f"/api/dettes/{dette}/ignorer/{autre}")
        apres = self.appel("GET", "/api/patrimoine")["dettes"][0]
        self.assertEqual(apres["anticipes_detectes"], [])
        self.assertEqual(len(apres["anticipes"]), 1)
        self.assertLess(apres["capital_restant"], avant - 9000)

    def test_simulation(self):
        dette = self.appel("POST", "/api/dettes", json={"type": "auto", "nom": "Prêt auto", "montant": 12000, "taux": 4, "duree_mois": 60, "debut": "2025-01-10"})["id"]
        resultat = self.appel("GET", f"/api/dettes/{dette}/simulation", params={"montant": 2000, "effet": "duree"})
        self.assertGreater(resultat["mois_gagnes"], 0)
        self.assertGreater(resultat["interets_economises"], 0)
        self.appel("GET", f"/api/dettes/{dette}/simulation", attendu=400, params={"montant": 0})

    def test_un_autre_compte_ne_voit_ni_ne_modifie_rien(self):
        bien = self.appel("POST", "/api/biens", json={"type": "vehicule", "nom": "Voiture", "valeur": 16000, "decote": 15})["id"]
        dette = self.appel("POST", "/api/dettes", json={"type": "auto", "nom": "Prêt", "montant": 6000, "taux": 3, "duree_mois": 36, "debut": "2026-01-01"})["id"]
        aude = entetes("aude")
        self.assertEqual(self.appel("GET", "/api/patrimoine", session=aude)["biens"], [])
        self.appel("PUT", f"/api/biens/{bien}", attendu=404, session=aude, json={"valeur": 1})
        self.appel("DELETE", f"/api/dettes/{dette}", attendu=404, session=aude)
        self.appel("GET", f"/api/dettes/{dette}/simulation", attendu=404, session=aude, params={"montant": 100})
        self.appel("POST", f"/api/dettes/{dette}/anticipes", attendu=404, session=aude, json={"montant": 100, "date": "2026-05-01", "effet": "duree"})

    def test_saisies_invalides_refusees(self):
        self.appel("POST", "/api/biens", attendu=422, json={"type": "yacht", "nom": "X", "valeur": 1})
        self.appel("POST", "/api/dettes", attendu=422, json={"type": "auto", "nom": "X", "montant": -5, "taux": 3, "duree_mois": 12, "debut": "2026-01-01"})
        self.appel("POST", "/api/dettes", attendu=422, json={"type": "auto", "nom": "X", "montant": 5, "taux": 3, "duree_mois": 0, "debut": "2026-01-01"})

    def test_supprimer(self):
        bien = self.appel("POST", "/api/biens", json={"type": "autre", "nom": "Montre", "valeur": 900})["id"]
        self.appel("DELETE", f"/api/biens/{bien}")
        self.assertEqual(self.appel("GET", "/api/patrimoine")["total_biens"], 0)

    def test_modifier_le_taux_et_la_duree_recalcule_l_echeancier(self):
        dette = self.appel("POST", "/api/dettes", json={"type": "immobilier", "nom": "Crédit", "montant": 200000, "taux": 3.5, "duree_mois": 240, "debut": "2021-04-05"})["id"]
        self.appel("PUT", f"/api/dettes/{dette}", json={"taux": 2.9, "duree_mois": 300})
        apres = self.appel("GET", "/api/patrimoine")["dettes"][0]
        self.assertEqual((apres["taux"], apres["duree_mois"], apres["fin"]), (2.9, 300, "2046-03-05"))
        self.assertLess(apres["mensualite"], 1159.92)
        self.appel("PUT", f"/api/dettes/{dette}", attendu=422, json={"duree_mois": 0})
        self.appel("PUT", f"/api/dettes/{dette}", attendu=400, json={})

    def test_crypto_au_cours_du_jour(self):
        with mock.patch.object(routes_patrimoine, "cours_crypto", return_value={"bitcoin": 80000.0}):
            self.appel("POST", "/api/biens", json={"type": "crypto", "nom": "Bitcoin", "crypto_id": "bitcoin", "quantite": 0.05})
            self.assertEqual(self.appel("GET", "/api/patrimoine")["biens"][0]["valeur"], 4000)
        with mock.patch.object(routes_patrimoine, "cours_crypto", return_value={"bitcoin": 90000.0}):
            self.assertEqual(self.appel("GET", "/api/patrimoine")["biens"][0]["valeur"], 4500)
        # Service injoignable : la crypto garde sa dernière valeur connue.
        with mock.patch.object(routes_patrimoine, "cours_crypto", return_value={}):
            self.assertEqual(self.appel("GET", "/api/patrimoine")["biens"][0]["valeur"], 4000)
            self.appel("POST", "/api/biens", attendu=400, json={"type": "crypto", "nom": "Ether", "crypto_id": "ethereum", "quantite": 1})
        self.appel("POST", "/api/biens", attendu=400, json={"type": "crypto", "nom": "Inconnue", "crypto_id": "../evil", "quantite": 1, "valeur": 10})

    def test_historique_de_l_annee(self):
        self.appel("POST", "/api/biens", json={"type": "immobilier", "nom": "Appartement", "valeur": 245000, "date_valeur": f"{date.today().year}-01-01"})
        self.appel("POST", "/api/dettes", json={"type": "immobilier", "nom": "Crédit", "montant": 200000, "taux": 3.5, "duree_mois": 240, "debut": "2021-04-05"})
        historique = self.appel("GET", "/api/patrimoine", params={"annee": date.today().year})["historique"]
        self.assertEqual(len(historique), date.today().month)
        self.assertTrue(all(p["biens"] == 245000 for p in historique))
        self.assertTrue(all(a["dettes"] > b["dettes"] for a, b in zip(historique, historique[1:])))

    def test_credits_de_la_banque(self):
        comptes = [
            {"id": 77, "name": "PRET IMMO", "balance": -150000.5, "loan": {"type": "mortgage", "total_amount": 200000, "rate": 3.5, "duration": 240,
             "start_repayment_date": "2021-04-05", "maturity_date": "2041-03-05", "next_payment_amount": 1159.92}},
            {"id": 78, "name": "Compte courant", "balance": 1200, "loan": None},
        ]
        with mock.patch.object(routes_patrimoine, "comptes_powens", return_value=comptes):
            credits = self.appel("GET", "/api/dettes/banque")
            self.assertEqual([(c["nom"], c["type"], c["complet"], c["deja_ajoute"]) for c in credits], [("PRET IMMO", "immobilier", True, False)])
            c = credits[0]
            self.appel("POST", "/api/dettes", json={k: c[k] for k in ("type", "nom", "montant", "taux", "duree_mois", "debut", "powens_compte_id")})
            self.assertTrue(self.appel("GET", "/api/dettes/banque")[0]["deja_ajoute"])
        dette = self.appel("GET", "/api/patrimoine")["dettes"][0]
        self.assertEqual(dette["capital_restant"], 150000.5)
        self.assertNotEqual(dette["capital_calcule"], dette["capital_restant"])

    def test_sans_session_tout_est_refuse(self):
        self.assertEqual(self.client.get("/api/patrimoine").status_code, 401)


if __name__ == "__main__":
    unittest.main()
