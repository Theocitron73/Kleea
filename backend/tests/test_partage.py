"""Compte commun : invitation, accès limité aux comptes partagés, écriture chez le propriétaire, arrêt avec copie."""
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
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
from aide import partout  # noqa: E402
import main  # noqa: E402
from routes import partage  # noqa: E402

SCHEMA = [
    "CREATE TABLE banned_ips (ip TEXT, banned_until TIMESTAMP)",
    "CREATE TABLE streamdeck_tokens (utilisateur TEXT PRIMARY KEY, token_hash TEXT, created_at TEXT)",
    "CREATE TABLE users (username TEXT PRIMARY KEY, email TEXT, password TEXT, role TEXT, name TEXT)",
    "CREATE TABLE configuration (compte TEXT, groupe TEXT, objectif REAL, solde REAL, utilisateur TEXT, couleur TEXT, taux REAL, powens_name TEXT, PRIMARY KEY (compte, utilisateur))",
    """CREATE TABLE transactions (id INTEGER PRIMARY KEY, date TEXT, nom TEXT, montant REAL, categorie TEXT, utilisateur TEXT, mois TEXT, annee INTEGER,
       compte TEXT, enveloppe TEXT, prevision_id INTEGER, split_id TEXT, auteur TEXT, UNIQUE (date, nom, montant, utilisateur))""",
    "CREATE TABLE budgets (id INTEGER PRIMARY KEY, utilisateur TEXT, mois TEXT, annee INTEGER, compte TEXT, type TEXT, nom TEXT, somme REAL, regle_id INTEGER)",
    """CREATE TABLE previsions (id INTEGER PRIMARY KEY, date DATE, nom TEXT, montant REAL, categorie TEXT, compte TEXT, mois TEXT, annee INTEGER,
       utilisateur TEXT, actif BOOLEAN, regle_id INTEGER, auteur TEXT)""",
    "CREATE TABLE split_sources (id INTEGER PRIMARY KEY, utilisateur TEXT, date TEXT, nom TEXT, montant REAL, compte TEXT, categorie TEXT, split_id TEXT, created_at TEXT)",
    """CREATE TABLE partages (id INTEGER PRIMARY KEY, proprietaire TEXT NOT NULL, invite_email TEXT NOT NULL, invite TEXT, etat TEXT NOT NULL,
       jeton_empreinte TEXT, jeton_expire_le TIMESTAMP, cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP, accepte_le TIMESTAMP, arrete_le TIMESTAMP, arrete_par TEXT)""",
    "CREATE TABLE partages_comptes (partage_id INTEGER NOT NULL, compte TEXT NOT NULL, PRIMARY KEY (partage_id, compte))",
    "CREATE TABLE partages_journal (id INTEGER PRIMARY KEY, partage_id INTEGER NOT NULL, auteur TEXT NOT NULL, action TEXT NOT NULL, detail TEXT, cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
]


def entetes(utilisateur):
    return {"Authorization": f"Bearer {aide.create_access_token({'sub': utilisateur})}"}


class Base(unittest.TestCase):
    def setUp(self):
        self.moteur = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        with self.moteur.begin() as conn:
            for instruction in SCHEMA:
                conn.execute(text(instruction))
            for nom, email in (("theo", "theo@kleea.test"), ("aude", "aude@kleea.test"), ("intrus", "intrus@kleea.test")):
                conn.execute(text("INSERT INTO users (username, email, password, role) VALUES (:n, :e, 'x', 'user')"), {"n": nom, "e": email})
            for compte, utilisateur, solde in (("Compte joint", "theo", 500), ("CCP", "theo", 1000), ("CCP", "aude", 200)):
                conn.execute(text("INSERT INTO configuration (compte, groupe, solde, utilisateur, couleur, taux, powens_name) VALUES (:c, 'Perso', :s, :u, '#123456', 0, 'IBAN-SECRET')"),
                             {"c": compte, "s": solde, "u": utilisateur})
        patcher = partout("engine", self.moteur)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.liens = []
        envoi = mock.patch.object(partage, "envoyer_invitation", side_effect=lambda email, proprietaire, lien: self.liens.append((email, lien)))
        envoi.start()
        self.addCleanup(envoi.stop)
        self.client = TestClient(main.app)
        self.theo, self.aude, self.intrus = entetes("theo"), entetes("aude"), entetes("intrus")

    def appel(self, methode, url, session, attendu=200, **kwargs):
        reponse = self.client.request(methode, url, headers=session, **kwargs)
        self.assertEqual(reponse.status_code, attendu, reponse.text)
        return reponse.json()

    def operation(self, utilisateur, compte, nom, montant=-10.0, jour="2026-11-05"):
        with self.moteur.begin() as conn:
            return conn.execute(text("INSERT INTO transactions (date, nom, montant, categorie, utilisateur, mois, annee, compte) VALUES (:d, :n, :m, 'Courses', :u, 'Novembre', 2026, :c) RETURNING id"),
                                {"d": jour, "n": nom, "m": montant, "u": utilisateur, "c": compte}).scalar()

    def prevision(self, utilisateur, compte, nom):
        with self.moteur.begin() as conn:
            return conn.execute(text("INSERT INTO previsions (date, nom, montant, categorie, compte, mois, annee, utilisateur, actif) VALUES ('2026-11-20', :n, -50, 'Courses', :c, 'Novembre', 2026, :u, 1) RETURNING id"),
                                {"n": nom, "c": compte, "u": utilisateur}).scalar()

    def inviter_et_accepter(self, comptes=("Compte joint",)):
        ident = self.appel("POST", "/api/partages", self.theo, json={"email": "aude@kleea.test", "comptes": list(comptes)})["id"]
        jeton = self.liens[-1][1].split("partage=")[1]
        self.appel("POST", "/api/partages/accepter", self.aude, json={"jeton": jeton})
        return ident, jeton

    def lignes(self, sql, **params):
        with self.moteur.connect() as conn:
            return [dict(l) for l in conn.execute(text(sql), params).mappings()]

    def lignes_ecrites(self, sql, **params):
        with self.moteur.begin() as conn:
            conn.execute(text(sql), params)


class Invitation(Base):
    def test_le_lien_seul_ne_suffit_pas_il_faut_le_bon_compte(self):
        self.appel("POST", "/api/partages", self.theo, json={"email": "Aude@Kleea.test", "comptes": ["Compte joint"]})
        jeton = self.liens[-1][1].split("partage=")[1]
        self.appel("POST", "/api/partages/accepter", self.intrus, attendu=400, json={"jeton": jeton})
        self.appel("POST", "/api/partages/accepter", self.theo, attendu=400, json={"jeton": jeton})
        self.appel("POST", "/api/partages/accepter", self.aude, json={"jeton": jeton})
        # Usage unique.
        self.appel("POST", "/api/partages/accepter", self.aude, attendu=400, json={"jeton": jeton})

    def test_une_invitation_expiree_est_refusee(self):
        self.appel("POST", "/api/partages", self.theo, json={"email": "aude@kleea.test", "comptes": ["Compte joint"]})
        jeton = self.liens[-1][1].split("partage=")[1]
        with self.moteur.begin() as conn:
            conn.execute(text("UPDATE partages SET jeton_expire_le = :t"), {"t": datetime.now(timezone.utc) - timedelta(minutes=1)})
        self.appel("POST", "/api/partages/accepter", self.aude, attendu=400, json={"jeton": jeton})

    def test_on_ne_partage_que_ses_propres_comptes(self):
        self.appel("POST", "/api/partages", self.theo, attendu=400, json={"email": "aude@kleea.test", "comptes": ["Compte inventé"]})
        self.appel("POST", "/api/partages", self.theo, attendu=400, json={"email": "theo@kleea.test", "comptes": ["Compte joint"]})

    def test_la_reponse_ne_dit_pas_si_l_adresse_a_un_compte(self):
        inconnue = self.appel("POST", "/api/partages", self.theo, json={"email": "personne@ailleurs.test", "comptes": ["Compte joint"]})
        connue = self.appel("POST", "/api/partages", self.theo, json={"email": "aude@kleea.test", "comptes": ["Compte joint"]})
        self.assertEqual(set(inconnue), set(connue))

    def test_trop_d_invitations(self):
        for _ in range(partage.INVITATIONS_PAR_HEURE):
            self.appel("POST", "/api/partages", self.theo, json={"email": "x@kleea.test", "comptes": ["Compte joint"]})
        self.appel("POST", "/api/partages", self.theo, attendu=429, json={"email": "x@kleea.test", "comptes": ["Compte joint"]})


class Acces(Base):
    def setUp(self):
        super().setUp()
        self.joint = self.operation("theo", "Compte joint", "Courses joint")
        self.prive = self.operation("theo", "CCP", "Achat privé de Théo")
        self.prevision_jointe = self.prevision("theo", "Compte joint", "[PRÉVI] Loyer")
        self.prevision_privee = self.prevision("theo", "CCP", "[PRÉVI] Salle de sport")
        self.partage_id, _ = self.inviter_et_accepter()

    def test_aude_voit_le_compte_partage_et_rien_d_autre(self):
        comptes = self.appel("GET", "/config-comptes/aude", self.aude)
        partages = [c for c in comptes if c.get("partage")]
        self.assertEqual([(c["compte"], c["groupe"], c["solde"], c["powens_name"]) for c in partages], [("Compte joint · theo", "Commun · theo", 500, None)])
        operations = self.appel("GET", "/transactions/aude", self.aude)
        self.assertEqual({o["nom"] for o in operations if o.get("partage")}, {"Courses joint"})
        self.assertNotIn("Achat privé de Théo", {o["nom"] for o in operations})
        previsions = self.appel("GET", "/previsions/aude/ALL/2026", self.aude)
        self.assertEqual([p["nom"] for p in previsions], ["[PRÉVI] Loyer"])

    def test_aude_ecrit_chez_theo_et_signe(self):
        self.appel("POST", "/transactions", self.aude, json={"date": "2026-11-06", "nom": "Électricité", "montant": -78, "categorie": "Énergie", "mois": "Novembre", "annee": 2026, "compte": "Compte joint · theo", "utilisateur": "aude"})
        ligne = self.lignes("SELECT utilisateur, compte, auteur FROM transactions WHERE nom = 'Électricité'")
        self.assertEqual(ligne, [{"utilisateur": "theo", "compte": "Compte joint", "auteur": "aude"}])
        # Théo la voit dans son compte, sous son vrai nom.
        self.assertIn("Électricité", {o["nom"] for o in self.appel("GET", "/transactions/theo", self.theo) if o["compte"] == "Compte joint"})
        journal = self.appel("GET", f"/api/partages/{self.partage_id}/journal", self.theo)
        self.assertEqual(journal[0]["action"], "ajout")

    def test_aude_modifie_et_supprime_une_operation_partagee(self):
        corps = {"date": "2026-11-05", "nom": "Courses joint", "montant": -12, "categorie": "Courses", "mois": "Novembre", "annee": 2026, "compte": "Compte joint · theo", "utilisateur": "aude"}
        self.appel("PUT", f"/transactions/{self.joint}", self.aude, json=corps)
        self.assertEqual(self.lignes("SELECT montant, auteur FROM transactions WHERE id = :i", i=self.joint), [{"montant": -12, "auteur": "aude"}])
        # Elle ne peut pas la déplacer vers ses propres comptes.
        self.appel("PUT", f"/transactions/{self.joint}", self.aude, attendu=400, json={**corps, "compte": "CCP"})
        self.assertEqual(self.appel("DELETE", "/transactions/batch", self.aude, json=[self.joint])["deleted_count"], 1)

    def test_rien_de_prive_n_est_accessible(self):
        """Avec la session d'Aude, chaque route sur une ligne privée de Théo est refusée et ne change rien."""
        corps = {"date": "2026-11-05", "nom": "Piraté", "montant": -1, "categorie": "X", "mois": "Novembre", "annee": 2026, "compte": "CCP", "utilisateur": "theo"}
        self.appel("PUT", f"/transactions/{self.prive}", self.aude, attendu=404, json=corps)
        self.assertEqual(self.appel("DELETE", "/transactions/batch", self.aude, json=[self.prive])["deleted_count"], 0)
        self.appel("POST", f"/transactions/{self.prive}/split", self.aude, attendu=404,
                   json={"parts": [{"nom": "a", "montant": -5, "categorie": "X"}, {"nom": "b", "montant": -5, "categorie": "X"}]})
        self.appel("PUT", f"/previsions/{self.prevision_privee}", self.aude, attendu=404, json={"montant": -1})
        self.appel("DELETE", f"/previsions/{self.prevision_privee}", self.aude)
        # Écrire vers un compte de Théo par son vrai nom reste chez Aude, dans son propre compte.
        self.appel("POST", "/transactions", self.aude, json={**corps, "nom": "Tentative", "compte": "CCP"})
        self.assertEqual(self.lignes("SELECT utilisateur FROM transactions WHERE nom = 'Tentative'"), [{"utilisateur": "aude"}])
        self.assertEqual(self.lignes("SELECT nom FROM transactions WHERE id = :i", i=self.prive), [{"nom": "Achat privé de Théo"}])
        self.assertEqual(len(self.lignes("SELECT id FROM previsions WHERE id = :i", i=self.prevision_privee)), 1)
        # Le journal et le partage ne sont lisibles que par ses deux membres.
        self.appel("GET", f"/api/partages/{self.partage_id}/journal", self.intrus, attendu=404)
        self.appel("DELETE", f"/api/partages/{self.partage_id}", self.intrus, attendu=404)
        self.appel("PUT", f"/api/partages/{self.partage_id}/comptes", self.aude, attendu=403, json={"comptes": ["CCP"]})

    def test_les_mois_des_comptes_partages_permettent_de_naviguer(self):
        self.operation("theo", "Compte joint", "Ancienne", jour="2025-03-04")
        with self.moteur.begin() as conn:
            conn.execute(text("UPDATE transactions SET mois = 'Mars', annee = 2025 WHERE nom = 'Ancienne'"))
        periodes = self.appel("GET", "/dashboard/periodes/aude", self.aude)
        self.assertEqual({(p["annee"], p["mois"]) for p in periodes}, {(2026, "Novembre"), (2025, "Mars")})
        # Les mois d'un compte privé de Théo n'apparaissent pas.
        self.operation("theo", "CCP", "Privée ancienne", jour="2024-01-04")
        with self.moteur.begin() as conn:
            conn.execute(text("UPDATE transactions SET mois = 'Janvier', annee = 2024 WHERE nom = 'Privée ancienne'"))
        self.assertNotIn(2024, {p["annee"] for p in self.appel("GET", "/dashboard/periodes/aude", self.aude)})

    def test_une_personne_tierce_ne_voit_rien(self):
        self.assertEqual(self.appel("GET", "/transactions/intrus", self.intrus), [])
        self.assertEqual([c for c in self.appel("GET", "/config-comptes/intrus", self.intrus) if c.get("partage")], [])

    def test_previsions_partagees(self):
        self.appel("PUT", f"/previsions/{self.prevision_jointe}", self.aude, json={"montant": -900})
        self.assertEqual(self.lignes("SELECT montant FROM previsions WHERE id = :i", i=self.prevision_jointe), [{"montant": -900}])
        self.appel("POST", "/previsions", self.aude, json={"nom": "Assurance", "montant": -40, "categorie": "Assurance", "compte": "Compte joint · theo", "utilisateur": "aude", "mois": "Novembre", "annee": 2026, "date": "2026-11-25"})
        self.assertEqual(self.lignes("SELECT utilisateur, compte, auteur FROM previsions WHERE nom = '[PRÉVI] Assurance'"), [{"utilisateur": "theo", "compte": "Compte joint", "auteur": "aude"}])

    def test_retirer_un_compte_du_partage_coupe_son_acces(self):
        self.appel("PUT", f"/api/partages/{self.partage_id}/comptes", self.theo, json={"comptes": ["CCP"]})
        operations = self.appel("GET", "/transactions/aude", self.aude)
        self.assertEqual({o["nom"] for o in operations if o.get("partage")}, {"Achat privé de Théo"})
        self.appel("PUT", f"/transactions/{self.joint}", self.aude, attendu=404,
                   json={"date": "2026-11-05", "nom": "x", "montant": -1, "categorie": "X", "mois": "Novembre", "annee": 2026, "compte": "Compte joint · theo", "utilisateur": "aude"})


class Synchronisation(Base):
    def setUp(self):
        super().setUp()
        self.partage_id, _ = self.inviter_et_accepter()
        self.lancees = []
        self.vraie_synchro = partage.lancer_synchro_du_proprietaire
        lancer = mock.patch.object(partage, "lancer_synchro_du_proprietaire", side_effect=lambda proprietaire, *_: self.lancees.append(proprietaire))
        lancer.start()
        self.addCleanup(lancer.stop)

    def test_la_personne_invitee_declenche_la_synchro_du_proprietaire(self):
        with mock.patch("routes.powens.jeton_powens_du_compte", return_value="jeton"):
            self.appel("POST", f"/api/partages/{self.partage_id}/synchroniser", self.aude)
            # Une demande au plus toutes les 15 minutes.
            self.appel("POST", f"/api/partages/{self.partage_id}/synchroniser", self.aude, attendu=429)
        self.assertEqual(self.lancees, ["theo"])
        self.assertEqual(self.appel("GET", f"/api/partages/{self.partage_id}/journal", self.theo)[0]["action"], "synchro")

    def test_la_fin_de_la_synchro_est_notee_pour_prevenir_la_personne_invitee(self):
        with mock.patch("routes.powens.synchroniser_et_noter", return_value={"status": "success", "added": 3}):
            self.vraie_synchro("theo", self.partage_id)
        with mock.patch("routes.powens.synchroniser_et_noter", side_effect=RuntimeError("banque indisponible")):
            self.vraie_synchro("theo", self.partage_id)
        journal = self.appel("GET", f"/api/partages/{self.partage_id}/journal", self.aude)
        self.assertEqual([l["action"] for l in journal[:2]], ["synchro_echec", "synchro_fin"])

    def test_seule_la_personne_invitee_peut_la_demander(self):
        with mock.patch("routes.powens.jeton_powens_du_compte", return_value="jeton"):
            self.appel("POST", f"/api/partages/{self.partage_id}/synchroniser", self.theo, attendu=403)
            self.appel("POST", f"/api/partages/{self.partage_id}/synchroniser", self.intrus, attendu=404)
        self.assertEqual(self.lancees, [])

    def test_sans_banque_connectee_chez_le_proprietaire(self):
        with mock.patch("routes.powens.jeton_powens_du_compte", return_value=None):
            self.appel("POST", f"/api/partages/{self.partage_id}/synchroniser", self.aude, attendu=400)
        self.assertEqual(self.lancees, [])


class Objectifs(Base):
    """Les objectifs budgétaires d'un compte partagé : visibles et modifiables par l'autre personne, rangés chez le propriétaire."""

    def setUp(self):
        super().setUp()
        for compte, nom in (("Compte joint", "Courses"), ("Compte perso", "Loisirs")):
            self.lignes_ecrites(f"INSERT INTO budgets (utilisateur, mois, annee, compte, type, nom, somme) VALUES ('theo', 'Novembre', 2026, '{compte}', 'Categorie', '{nom}', 300)")
        self.partage_id, _ = self.inviter_et_accepter()

    def budget(self, nom, mois="Novembre", annee=2026, compte="Compte joint · theo", somme=300):
        return {"utilisateur": "aude", "mois": mois, "annee": annee, "compte": compte, "type": "Categorie", "nom": nom, "somme": somme}

    def test_aude_voit_seulement_l_objectif_du_compte_partage(self):
        budgets = self.appel("GET", "/get-budgets/aude", self.aude)
        self.assertEqual([(b["nom"], b["compte"]) for b in budgets], [("Courses", "Compte joint · theo")])

    def test_aude_ajoute_modifie_et_supprime_chez_theo(self):
        self.appel("POST", "/save-budget", self.aude, json=self.budget("Resto", somme=80))
        self.appel("POST", "/update-budget?old_name=Courses", self.aude, json=self.budget("Courses", somme=350))
        # Même nom sur un compte privé de Théo : intouché.
        self.lignes_ecrites("INSERT INTO budgets (utilisateur, mois, annee, compte, type, nom, somme) VALUES ('theo', 'Novembre', 2026, 'Compte perso', 'Categorie', 'Resto', 50)")
        self.appel("DELETE", "/delete-budget/Resto/aude/Novembre/2026?compte=Compte joint · theo", self.aude)
        lignes = self.lignes("SELECT utilisateur, compte, nom, somme FROM budgets ORDER BY compte, nom")
        self.assertEqual(lignes, [
            {"utilisateur": "theo", "compte": "Compte joint", "nom": "Courses", "somme": 350},
            {"utilisateur": "theo", "compte": "Compte perso", "nom": "Loisirs", "somme": 300},
            {"utilisateur": "theo", "compte": "Compte perso", "nom": "Resto", "somme": 50},
        ])
        actions = [l["action"] for l in self.appel("GET", f"/api/partages/{self.partage_id}/journal", self.theo)]
        self.assertEqual(actions[:3], ["suppression", "modification", "ajout"])


class Arret(Base):
    def setUp(self):
        super().setUp()
        self.joint = self.operation("theo", "Compte joint", "Courses joint")
        self.prevision("theo", "Compte joint", "[PRÉVI] Loyer")
        self.lignes_ecrites("INSERT INTO budgets (utilisateur, mois, annee, compte, type, nom, somme) VALUES ('theo', 'Novembre', 2026, 'Compte joint', 'Categorie', 'Courses', 300)")
        self.partage_id, _ = self.inviter_et_accepter()

    def verifier_copie_et_fin_d_acces(self):
        self.assertEqual([o for o in self.appel("GET", "/transactions/aude", self.aude) if o.get("partage")], [])
        self.appel("DELETE", "/transactions/batch", self.aude, json=[self.joint])
        self.assertEqual(len(self.lignes("SELECT id FROM transactions WHERE id = :i", i=self.joint)), 1)
        copie = self.lignes("SELECT compte, groupe, solde FROM configuration WHERE utilisateur = 'aude' AND compte LIKE 'Compte joint%'")
        self.assertEqual(copie, [{"compte": "Compte joint (copie de theo)", "groupe": "Commun (copie)", "solde": 500}])
        self.assertEqual([o["nom"] for o in self.lignes("SELECT nom FROM transactions WHERE utilisateur = 'aude'")], ["Courses joint"])
        self.assertEqual([p["nom"] for p in self.lignes("SELECT nom FROM previsions WHERE utilisateur = 'aude'")], ["[PRÉVI] Loyer"])
        self.assertEqual(self.lignes("SELECT compte, nom FROM budgets WHERE utilisateur = 'aude'"), [{"compte": "Compte joint (copie de theo)", "nom": "Courses"}])
        self.assertEqual(self.appel("GET", "/api/partages", self.aude), [])

    def test_aude_arrete_et_garde_une_copie(self):
        self.assertEqual(self.appel("DELETE", f"/api/partages/{self.partage_id}", self.aude)["copiees"], 1)
        self.verifier_copie_et_fin_d_acces()

    def test_theo_arrete_et_aude_garde_une_copie(self):
        self.appel("DELETE", f"/api/partages/{self.partage_id}", self.theo)
        self.verifier_copie_et_fin_d_acces()

    def test_la_suppression_du_compte_de_theo_arrete_le_partage(self):
        self.appel("DELETE", "/profile/theo", self.theo)
        self.assertEqual(self.lignes("SELECT etat FROM partages"), [{"etat": "arrete"}])
        self.assertEqual(len(self.lignes("SELECT compte FROM configuration WHERE utilisateur = 'aude' AND compte LIKE '%copie%'")), 1)

    def test_une_invitation_non_acceptee_arretee_ne_copie_rien(self):
        ident = self.appel("POST", "/api/partages", self.theo, json={"email": "intrus@kleea.test", "comptes": ["CCP"]})["id"]
        self.assertEqual(self.appel("DELETE", f"/api/partages/{ident}", self.theo)["copiees"], 0)


if __name__ == "__main__":
    unittest.main()
