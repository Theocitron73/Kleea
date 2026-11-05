"""Le Stream Deck (Python) et l'application (JavaScript) doivent calculer la même chose.

Les cas sont partagés avec frontend/src/utils/finance.test.js.
"""
import json
import os
import sys
import unittest
from datetime import date
from pathlib import Path

# Valeurs factices posées AVANT l'import : load_dotenv() ne les écrase pas.
os.environ["DATABASE_URL"] = "postgresql://test:test@127.0.0.1:1/test"
os.environ["JWT_SECRET_KEY"] = "secret-de-test-suffisamment-long-pour-hs256"
os.environ["GEMINI_API_KEY"] = "test"
os.environ.pop("IBAN_ENCRYPTION_KEY", None)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.stdout.reconfigure(encoding="utf-8")

import main  # noqa: E402

CAS = json.loads((Path(__file__).parent / "fixtures" / "calculs_finances.json").read_text(encoding="utf-8"))


class CalculsPartages(unittest.TestCase):
    def test_detection_des_virements(self):
        for cas in CAS["transferts"]:
            with self.subTest(nom=cas["nom"], categorie=cas["categorie"]):
                self.assertEqual(main._sd_est_transfert(cas["nom"], cas["categorie"]), cas["attendu"])

    def test_compte_destinataire(self):
        comptes = CAS["comptes_cibles"]["comptes"]
        groupes = {c["compte"].upper(): c["groupe"].upper() for c in comptes}
        for cas in CAS["comptes_cibles"]["cas"]:
            with self.subTest(texte=cas["texte"], source=cas["source"]):
                self.assertEqual(main._sd_compte_cible(cas["texte"].upper(), cas["source"].upper(), groupes), cas["attendu"])

    def test_soldes_revenus_et_depenses(self):
        cas = CAS["soldes"]
        vues = main.calculer_vues_streamdeck(cas["comptes"], cas["transactions"], date(cas["annee"], cas["mois"], 15))
        comptes = {c["nom"].upper(): c for c in vues["comptes"]}
        attendu = cas["attendu"]
        self.assertEqual({nom: c["solde"] for nom, c in comptes.items()}, attendu["soldes"])
        self.assertEqual({nom: c["revenus_mois"] for nom, c in comptes.items()}, attendu["revenus_du_mois"])
        self.assertEqual({nom: c["depenses_mois"] for nom, c in comptes.items()}, attendu["depenses_du_mois"])


if __name__ == "__main__":
    unittest.main()
