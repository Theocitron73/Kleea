"""Sauvegarde personnelle : aller-retour, isolation entre comptes, absence de secrets et refus des fichiers douteux."""
import json
import os
import re
import sys
import unittest
from pathlib import Path
from unittest import mock

os.environ["DATABASE_URL"] = "postgresql://test:test@127.0.0.1:1/test"
os.environ["JWT_SECRET_KEY"] = "secret-de-test-suffisamment-long-pour-hs256"
os.environ["GEMINI_API_KEY"] = "test"
os.environ.pop("IBAN_ENCRYPTION_KEY", None)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.stdout.reconfigure(encoding="utf-8")

from cryptography.fernet import Fernet  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import aide  # noqa: E402
from aide import partout  # noqa: E402
import main  # noqa: E402
from routes import sauvegarde  # noqa: E402

EXPORT = "/api/sauvegarde/export"
APERCU = "/api/sauvegarde/apercu"
IMPORT = "/api/sauvegarde/import"
VERSIONS = Path(__file__).resolve().parents[1] / "migrations" / "versions"
IBAN = "FR7630001007941234567890185"

VALEURS = {
    "texte": "Valeur", "iban": "Livret", "nombre": 12.5, "entier": 3, "booleen": True,
    "instant": "2026-03-04T05:06:07", "jour": "2026-03-04", "structure": [{"champ": "nom", "valeur": "Orange"}],
}


def entetes(utilisateur):
    return {"Authorization": f"Bearer {aide.create_access_token({'sub': utilisateur})}"}


def ligne_type(table):
    return {c.nom: VALEURS[c.genre] for c in table.colonnes}


def pour_sql(valeur):
    return json.dumps(valeur) if isinstance(valeur, (list, dict)) else valeur


class Base(unittest.TestCase):
    def setUp(self):
        self.moteur = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        with self.moteur.begin() as conn:
            conn.execute(text("CREATE TABLE banned_ips (ip TEXT, banned_until TIMESTAMP)"))
            conn.execute(text("CREATE TABLE users (username TEXT PRIMARY KEY, email TEXT, password TEXT, name TEXT, reset_token TEXT, import_mode TEXT, powens_token TEXT, role TEXT)"))
            conn.execute(text("CREATE TABLE streamdeck_tokens (utilisateur TEXT PRIMARY KEY, token_hash TEXT, created_at TEXT)"))
            conn.execute(text("CREATE TABLE synchro_etat (utilisateur TEXT PRIMARY KEY, code_erreur TEXT)"))
            for table in sauvegarde.TABLES:
                colonnes = [f'"{c.nom}"' for c in table.colonnes if c.nom != "id"]
                suite = ['"token_partage"'] if table.nom == "tricount" else []
                unique = [f"UNIQUE ({', '.join(chr(34) + n + chr(34) for n in table.cle)}, \"{table.utilisateur}\")"] if table.cle else []
                conn.execute(text(f"CREATE TABLE {table.nom} ({', '.join(['id INTEGER PRIMARY KEY', f'\"{table.utilisateur}\"', *colonnes, *suite, *unique])})"))
            for nom in ("theo", "aude"):
                conn.execute(text("""
                    INSERT INTO users (username, email, password, name, reset_token, import_mode, powens_token, role)
                    VALUES (:n, :e, 'HACHE-DU-MOT-DE-PASSE', :n, 'JETON-DE-REINITIALISATION', 'auto', 'JETON-POWENS', 'admin')
                """), {"n": nom, "e": f"{nom}@exemple.test"})
        patcher = partout("engine", self.moteur)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = TestClient(main.app)
        self.theo = entetes("theo")
        self.aude = entetes("aude")

    def inserer(self, table, utilisateur="theo", **valeurs):
        description = sauvegarde.PAR_NOM[table]
        ligne = {**{k: v for k, v in ligne_type(description).items() if k != "id"}, **valeurs}
        colonnes = [description.utilisateur, *ligne]
        with self.moteur.begin() as conn:
            noms = ", ".join(f'"{c}"' for c in colonnes)
            marques = ", ".join(f":p{i}" for i in range(len(colonnes)))
            parametres = {"p0": utilisateur, **{f"p{i}": pour_sql(v) for i, v in enumerate(ligne.values(), start=1)}}
            return conn.execute(text(f"INSERT INTO {table} ({noms}) VALUES ({marques}) RETURNING id"), parametres).scalar()

    def remplir(self, utilisateur="theo"):
        """Une ligne dans chaque table, et de quoi vérifier les liens entre les prévisions, les divisions et les opérations."""
        for table in sauvegarde.TABLES:
            if table.nom not in ("transactions", "previsions", "split_sources"):
                self.inserer(table.nom, utilisateur)
        prevision = self.inserer("previsions", utilisateur, nom="Loyer")
        self.inserer("split_sources", utilisateur, split_id=f"split_{utilisateur}")
        self.inserer("transactions", utilisateur, nom="Sans lien", prevision_id=None, split_id=None)
        self.inserer("transactions", utilisateur, nom="Avec lien", prevision_id=prevision, split_id=f"split_{utilisateur}")

    def vider(self, utilisateur="theo"):
        with self.moteur.begin() as conn:
            for table in sauvegarde.TABLES:
                conn.execute(text(f'DELETE FROM {table.nom} WHERE LOWER("{table.utilisateur}") = :u'), {"u": utilisateur})

    def exporter(self, session=None):
        reponse = self.client.get(EXPORT, headers=session or self.theo)
        self.assertEqual(reponse.status_code, 200, reponse.text)
        return reponse.json()

    def importer(self, fichier, session=None, url=IMPORT):
        return self.client.post(url, content=json.dumps(fichier), headers=session or self.theo)

    def tout(self, utilisateur):
        """Toutes les lignes d'un compte, colonnes techniques comprises."""
        resultat = {}
        with self.moteur.connect() as conn:
            for table in sauvegarde.TABLES:
                lignes = conn.execute(text(f'SELECT * FROM {table.nom} WHERE LOWER("{table.utilisateur}") = :u ORDER BY id'), {"u": utilisateur}).mappings().all()
                resultat[table.nom] = [dict(l) for l in lignes]
        return resultat

    def fichier(self, compte="theo", **donnees):
        return {"format": "kleea-sauvegarde", "version": 1, "compte": compte, "donnees": donnees}

    def sans_identifiants(self, fichier):
        """Les identifiants de la base changent : ce qui compte, c'est le contenu, et vers quoi pointent les liens."""
        donnees = json.loads(json.dumps(fichier["donnees"]))
        noms = {p.pop("id"): p["nom"] for p in donnees["previsions"]}
        for operation in donnees["transactions"]:
            operation["prevision_id"] = noms.get(operation["prevision_id"])
        return donnees


class AllerRetour(Base):
    def test_toutes_les_tables_sont_exportees(self):
        self.remplir()
        donnees = self.exporter()["donnees"]
        self.assertEqual(set(donnees), {t.nom for t in sauvegarde.TABLES})
        self.assertEqual([t for t, lignes in donnees.items() if not lignes], [])

    def test_export_puis_import_sur_un_compte_vide_redonne_les_memes_donnees(self):
        self.remplir()
        avant = self.exporter()
        self.vider()
        # Une prévision d'un autre compte décale les identifiants : les liens doivent suivre.
        self.inserer("previsions", "aude", nom="Décalage")
        self.assertEqual(self.tout("theo")["transactions"], [])

        reponse = self.importer(avant)

        self.assertEqual(reponse.status_code, 200, reponse.text)
        self.assertEqual(reponse.json()["total_deja_presents"], 0)
        apres = self.exporter()
        self.assertEqual(self.sans_identifiants(apres), self.sans_identifiants(avant))
        lien = next(o for o in apres["donnees"]["transactions"] if o["nom"] == "Avec lien")
        cible = next(p for p in apres["donnees"]["previsions"] if p["id"] == lien["prevision_id"])
        self.assertEqual(cible["nom"], "Loyer")
        self.assertEqual(lien["split_id"], "split_theo")

    def test_importer_deux_fois_n_ajoute_rien_la_seconde_fois(self):
        self.remplir()
        fichier = self.exporter()
        avant = self.tout("theo")
        reponse = self.importer(fichier)
        self.assertEqual(reponse.status_code, 200, reponse.text)
        self.assertEqual(reponse.json()["total_a_ajouter"], 0)
        self.assertEqual(self.tout("theo"), avant)

    def test_des_lignes_identiques_sans_cle_sont_restaurees_une_a_une(self):
        for _ in range(2):
            self.inserer("budgets", nom="Courses")
        fichier = self.exporter()
        self.vider()
        self.inserer("budgets", nom="Courses")
        reponse = self.importer(fichier)
        self.assertEqual(reponse.json()["total_a_ajouter"], 1)
        self.assertEqual(len(self.tout("theo")["budgets"]), 2)

    def test_les_lignes_a_la_casse_ancienne_sont_exportees(self):
        self.inserer("transactions", "Theo", nom="Ancienne", prevision_id=None, split_id=None)
        self.assertEqual([o["nom"] for o in self.exporter()["donnees"]["transactions"]], ["Ancienne"])

    def test_plus_de_lignes_qu_un_lot(self):
        self.remplir()
        fichier = self.exporter()
        fichier["donnees"]["budgets"] = [{**ligne_type(sauvegarde.PAR_NOM["budgets"]), "nom": f"B{i}"} for i in range(sauvegarde.TAILLE_LOT + 5)]
        self.vider()
        self.assertEqual(self.importer(fichier).status_code, 200)
        self.assertEqual(len(self.tout("theo")["budgets"]), sauvegarde.TAILLE_LOT + 5)


class NonDestructif(Base):
    def test_l_apercu_annonce_ce_que_l_import_ajoute_et_n_ecrit_rien(self):
        self.remplir()
        fichier = self.exporter()
        self.vider()
        self.inserer("categories")

        apercu = self.importer(fichier, url=APERCU)

        self.assertEqual(apercu.status_code, 200, apercu.text)
        corps = apercu.json()
        lignes = {t["table"]: t for t in corps["tables"]}
        self.assertEqual(lignes["categories"]["deja_presents"], 1)
        self.assertEqual(lignes["categories"]["a_ajouter"], 0)
        self.assertEqual(lignes["transactions"]["a_ajouter"], 2)
        self.assertEqual(lignes["transactions"]["libelle"], "Opérations")
        self.assertTrue(corps["exporte_le"])
        self.assertEqual(self.tout("theo")["transactions"], [])
        self.assertEqual(self.importer(fichier).json()["total_a_ajouter"], corps["total_a_ajouter"])

    def test_ce_qui_existe_n_est_jamais_modifie(self):
        self.inserer("notes", texte="Ma note d'aujourd'hui")
        self.inserer("configuration", compte="CCP", solde=100.0)
        self.inserer("transactions", nom="Loyer", montant=-800.0, categorie="Corrigée", prevision_id=None, split_id=None)
        identifiant = self.tout("theo")["transactions"][0]["id"]
        fichier = self.fichier(
            notes=[{"texte": "Ancienne note"}],
            configuration=[{"compte": "CCP", "solde": 1.0}],
            transactions=[{"date": VALEURS["instant"], "nom": "Loyer", "montant": -800, "categorie": "Ancienne"}],
        )

        self.assertEqual(self.importer(fichier).json()["total_a_ajouter"], 0)

        tout = self.tout("theo")
        self.assertEqual(tout["notes"][0]["texte"], "Ma note d'aujourd'hui")
        self.assertEqual(tout["configuration"][0]["solde"], 100.0)
        self.assertEqual((tout["transactions"][0]["id"], tout["transactions"][0]["categorie"]), (identifiant, "Corrigée"))

    def test_le_profil_du_compte_ne_change_pas(self):
        fichier = {**self.fichier(), "profil": {"email": "pirate@exemple.test", "role": "admin", "mode_import": "manual"}}
        self.assertEqual(self.importer(fichier).status_code, 200)
        with self.moteur.connect() as conn:
            ligne = conn.execute(text("SELECT email, import_mode FROM users WHERE username = 'theo'")).one()
        self.assertEqual(tuple(ligne), ("theo@exemple.test", "auto"))

    def test_un_projet_deja_la_sous_une_autre_casse_n_est_pas_ajoute(self):
        self.inserer("projets", nom="Voiture", profil="Theo")
        fichier = self.fichier(projets=[{"nom": " voiture ", "profil": "theo"}])
        self.assertEqual(self.importer(fichier).json()["total_a_ajouter"], 0)

    def test_un_theme_actif_le_reste(self):
        self.inserer("theme_presets", nom="Actuel", is_active=True)
        ligne = {**ligne_type(sauvegarde.PAR_NOM["theme_presets"]), "nom": "Ancien", "is_active": True}
        self.importer(self.fichier(theme_presets=[ligne]))
        actifs = [t["nom"] for t in self.tout("theo")["theme_presets"] if t["is_active"]]
        self.assertEqual(actifs, ["Actuel"])

    def test_une_panne_en_cours_d_import_annule_tout(self):
        self.remplir()
        fichier = self.exporter()
        self.vider()
        with self.moteur.begin() as conn:
            # alertes_masquees est écrite en dernier : tout le reste a déjà été inséré.
            conn.execute(text("""
                CREATE TRIGGER panne BEFORE INSERT ON alertes_masquees
                BEGIN SELECT RAISE(ABORT, 'panne simulée'); END
            """))
        reponse = self.importer(fichier)
        self.assertEqual(reponse.status_code, 409, reponse.text)
        self.assertIn("rien n'a été modifié", reponse.json()["detail"])
        self.assertEqual([t for t, lignes in self.tout("theo").items() if lignes], [])


class Isolation(Base):
    def test_sans_session_tout_est_refuse(self):
        self.assertEqual(self.client.get(EXPORT).status_code, 401)
        self.assertEqual(self.client.post(APERCU, json={}).status_code, 401)
        self.assertEqual(self.client.post(IMPORT, json={}).status_code, 401)

    def test_l_export_ne_contient_que_le_compte_connecte(self):
        self.remplir("theo")
        self.remplir("aude")
        with self.moteur.begin() as conn:
            conn.execute(text("UPDATE notes SET texte = 'NOTE-D-AUDE' WHERE utilisateur = 'aude'"))
        corps = self.client.get(EXPORT, headers=self.theo).text
        self.assertNotIn("NOTE-D-AUDE", corps)
        self.assertNotIn("split_aude", corps)
        self.assertNotIn("aude@exemple.test", corps)
        self.assertEqual(json.loads(corps)["compte"], "theo")

    def test_le_fichier_d_un_autre_compte_est_refuse_avec_un_message_clair(self):
        self.remplir("aude")
        fichier = self.exporter(self.aude)
        for url in (APERCU, IMPORT):
            reponse = self.importer(fichier, url=url)
            self.assertEqual(reponse.status_code, 409)
            self.assertIn("appartient au compte « aude »", reponse.json()["detail"])
        self.assertEqual(self.tout("theo")["transactions"], [])

    def test_un_fichier_dont_le_compte_est_change_reste_rattache_a_la_session(self):
        self.remplir("aude")
        avant = self.tout("aude")
        fichier = {**self.exporter(self.aude), "compte": "theo"}
        self.assertEqual(self.importer(fichier).status_code, 200)
        self.assertEqual(self.tout("aude"), avant)
        self.assertEqual(len(self.tout("theo")["transactions"]), 2)

    def test_un_import_ne_touche_jamais_aux_lignes_d_un_autre_compte(self):
        self.remplir("theo")
        self.remplir("aude")
        avant = self.tout("aude")
        fichier = self.exporter()
        self.vider()
        self.importer(fichier)
        self.assertEqual(self.tout("aude"), avant)

    def test_le_champ_utilisateur_d_une_ligne_est_refuse(self):
        ligne = {**ligne_type(sauvegarde.PAR_NOM["memoire"]), "utilisateur": "aude"}
        reponse = self.importer(self.fichier(memoire=[ligne]))
        self.assertEqual(reponse.status_code, 400)
        self.assertIn("champ inconnu", reponse.json()["detail"])
        self.assertEqual(self.tout("aude")["memoire"], [])

    def test_un_lien_vers_la_prevision_d_un_autre_compte_est_retire(self):
        cible = self.inserer("previsions", "aude", nom="Secrète")
        operation = {"date": VALEURS["instant"], "nom": "Piège", "montant": 1, "prevision_id": cible}
        self.assertEqual(self.importer(self.fichier(transactions=[operation])).status_code, 200)
        self.assertIsNone(self.tout("theo")["transactions"][0]["prevision_id"])

    def test_une_division_qui_reprend_l_identifiant_d_un_autre_compte_en_recoit_un_nouveau(self):
        self.inserer("split_sources", "aude", split_id="split_pris")
        avant = self.tout("aude")["split_sources"]
        source = {**ligne_type(sauvegarde.PAR_NOM["split_sources"]), "split_id": "split_pris"}
        operation = {"date": VALEURS["instant"], "nom": "Partie", "montant": 1, "split_id": "split_pris"}

        reponse = self.importer(self.fichier(split_sources=[source], transactions=[operation]))

        self.assertEqual(reponse.status_code, 200, reponse.text)
        tout = self.tout("theo")
        nouveau = tout["split_sources"][0]["split_id"]
        self.assertNotEqual(nouveau, "split_pris")
        self.assertEqual(tout["transactions"][0]["split_id"], nouveau)
        self.assertEqual(self.tout("aude")["split_sources"], avant)

    def test_une_session_dont_le_compte_n_existe_plus_ne_peut_rien_faire(self):
        with self.moteur.begin() as conn:
            conn.execute(text("DELETE FROM users WHERE username = 'theo'"))
        self.assertEqual(self.client.get(EXPORT, headers=self.theo).status_code, 404)
        self.assertEqual(self.importer(self.fichier(notes=[{"texte": "x"}]), url=APERCU).status_code, 404)
        self.assertEqual(self.importer(self.fichier(notes=[{"texte": "x"}])).status_code, 404)
        self.assertEqual(self.tout("theo")["notes"], [])


class Secrets(Base):
    def remplir_avec_secrets(self):
        self.remplir()
        with self.moteur.begin() as conn:
            conn.execute(text("INSERT INTO streamdeck_tokens VALUES ('theo', 'EMPREINTE-STREAMDECK', '2026-01-01')"))
            conn.execute(text("INSERT INTO synchro_etat VALUES ('theo', 'HTTP 502')"))
            conn.execute(text("UPDATE tricount SET token_partage = 'JETON-DE-PARTAGE' WHERE utilisateur = 'theo'"))

    def test_aucun_secret_dans_l_export(self):
        self.remplir_avec_secrets()
        corps = self.client.get(EXPORT, headers=self.theo).text
        for secret in ("HACHE-DU-MOT-DE-PASSE", "JETON-DE-REINITIALISATION", "JETON-POWENS", "EMPREINTE-STREAMDECK", "JETON-DE-PARTAGE", "HTTP 502"):
            self.assertNotIn(secret, corps)
        for champ in ("password", "reset_token", "powens_token", "token_hash", "token_partage", "role"):
            self.assertNotIn(f'"{champ}"', corps)
        self.assertEqual(set(json.loads(corps)["profil"]), {"identifiant", "nom", "email", "mode_import"})

    def test_un_secret_glisse_dans_le_fichier_est_refuse(self):
        ligne = {**ligne_type(sauvegarde.PAR_NOM["tricount"]), "token_partage": "volé"}
        self.assertEqual(self.importer(self.fichier(tricount=[ligne])).status_code, 400)
        self.assertEqual(self.importer(self.fichier(streamdeck_tokens=[{"token_hash": "x"}])).status_code, 400)
        self.assertEqual(self.importer(self.fichier(users=[{"username": "theo", "role": "admin"}])).status_code, 400)
        self.assertEqual(self.tout("theo")["tricount"], [])

    def test_les_depenses_rejoignent_le_lien_deja_ouvert_de_leur_groupe(self):
        self.inserer("tricount", groupe="Ski")
        with self.moteur.begin() as conn:
            conn.execute(text("UPDATE tricount SET token_partage = 'LIEN-SKI'"))
        lignes = [
            {**ligne_type(sauvegarde.PAR_NOM["tricount"]), "groupe": "Ski", "libelle": "Forfait"},
            {**ligne_type(sauvegarde.PAR_NOM["tricount"]), "groupe": "Mer", "libelle": "Glace"},
        ]
        self.assertEqual(self.importer(self.fichier(tricount=lignes)).status_code, 200)
        jetons = {l["libelle"]: l["token_partage"] for l in self.tout("theo")["tricount"]}
        self.assertEqual(jetons["Forfait"], "LIEN-SKI")
        self.assertIsNone(jetons["Glace"])

    def test_l_iban_chiffre_est_exporte_en_clair_puis_rechiffre(self):
        chiffreur = Fernet(Fernet.generate_key())
        with partout("cipher", chiffreur):
            chiffre = aide.encrypt_iban(IBAN)
            self.assertNotEqual(chiffre, IBAN)
            self.inserer("configuration", compte="Livret", powens_name=chiffre)

            reponse = self.client.get(EXPORT, headers=self.theo)
            self.assertNotIn(chiffre, reponse.text)
            self.assertEqual(reponse.json()["donnees"]["configuration"][0]["powens_name"], IBAN)

            self.vider()
            self.assertEqual(self.importer(reponse.json()).status_code, 200)
            enregistre = self.tout("theo")["configuration"][0]["powens_name"]
            self.assertNotEqual(enregistre, IBAN)
            self.assertEqual(aide.decrypt_iban(enregistre), IBAN)

    def test_un_iban_chiffre_avec_une_autre_cle_n_est_pas_exporte(self):
        chiffre = Fernet(Fernet.generate_key()).encrypt(IBAN.encode()).decode()
        self.inserer("configuration", compte="Livret", powens_name=chiffre)
        with partout("cipher", Fernet(Fernet.generate_key())):
            reponse = self.client.get(EXPORT, headers=self.theo)
        self.assertNotIn(chiffre, reponse.text)
        self.assertIsNone(reponse.json()["donnees"]["configuration"][0]["powens_name"])

    def test_un_chiffre_dans_le_fichier_n_est_pas_enregistre(self):
        ligne = {"compte": "Livret", "powens_name": "gAAAAdu-chiffre-etranger"}
        self.assertEqual(self.importer(self.fichier(configuration=[ligne])).status_code, 200)
        self.assertIsNone(self.tout("theo")["configuration"][0]["powens_name"])

    def test_la_reponse_n_est_pas_mise_en_cache_et_se_telecharge(self):
        reponse = self.client.get(EXPORT, headers=self.theo)
        self.assertEqual(reponse.headers["cache-control"], "no-store")
        self.assertIn('attachment; filename="kleea-sauvegarde-theo.json"', reponse.headers["content-disposition"])


class FichiersRefuses(Base):
    def refus(self, fichier, attendu, statut=400):
        for url in (APERCU, IMPORT):
            reponse = self.importer(fichier, url=url)
            self.assertEqual(reponse.status_code, statut, reponse.text)
            self.assertIn(attendu, reponse.json()["detail"])

    def test_autre_version(self):
        self.refus({**self.fichier(), "version": 2}, "en version 2, et Kleea lit la version 1")
        self.refus({**self.fichier(), "version": "1"}, "version")
        self.refus({**self.fichier(), "version": True}, "version")

    def test_ce_n_est_pas_une_sauvegarde(self):
        self.refus({"bonjour": 1}, "n'est pas une sauvegarde Kleea")
        self.refus([1, 2], "n'est pas une sauvegarde Kleea")
        self.refus({**self.fichier(), "donnees": []}, "données lisibles")
        self.refus({"format": "kleea-sauvegarde", "version": 1, "donnees": {}}, "à quel compte")

    def test_ce_n_est_pas_du_json(self):
        for corps in (b"pas du json", b"\xff\xfe\x00", b'{"a": NaN}', b"[" * 200000):
            reponse = self.client.post(IMPORT, content=corps, headers=self.theo)
            self.assertEqual(reponse.status_code, 400, corps[:10])
            self.assertIn("JSON", reponse.json()["detail"])

    def test_une_rubrique_inconnue(self):
        self.refus(self.fichier(pirate=[]), "rubrique inconnue")
        self.refus(self.fichier(transactions={}), "illisible")
        self.refus(self.fichier(transactions=[1]), "illisible")

    def test_valeurs_invalides(self):
        base = {"date": VALEURS["instant"], "nom": "x", "montant": 1}
        cas = [
            ("transactions", {**base, "montant": "douze"}),
            ("transactions", {**base, "montant": True}),
            ("transactions", {**base, "montant": 10 ** 400}),
            ("transactions", {**base, "date": "hier"}),
            ("transactions", {**base, "date": 12}),
            ("transactions", {**base, "nom": "a\x00b"}),
            ("transactions", {**base, "nom": "\ud800"}),
            ("transactions", {**base, "split_id": "x" * 51}),
            ("transactions", {**base, "prevision_id": 2 ** 40}),
            ("budgets", {"compte": "CCP"}),
            ("budgets", {"mois": "Mars", "compte": "CCP", "annee": 70000}),
            ("split_sources", {**ligne_type(sauvegarde.PAR_NOM["split_sources"]), "montant": 1e9}),
            ("custom_stats", {**ligne_type(sauvegarde.PAR_NOM["custom_stats"]), "regles": "texte"}),
            ("custom_stats", {**ligne_type(sauvegarde.PAR_NOM["custom_stats"]), "regles": ["a\x00"]}),
            ("projets", {"nom": "x", "utiliser_capa_stricte": 1}),
        ]
        for table, ligne in cas:
            with self.subTest(table=table, ligne=str(ligne)[:60]):
                self.refus(self.fichier(**{table: [ligne]}), "valeur invalide")

    def test_un_nombre_non_fini_stocke_en_base_ne_rend_pas_le_fichier_inutilisable(self):
        self.inserer("transactions", nom="Bizarre", montant=float("inf"), prevision_id=None, split_id=None)
        self.inserer("previsions", nom="Sans montant", montant=float("inf"))
        fichier = self.exporter()
        self.assertIsNone(fichier["donnees"]["transactions"][0]["montant"])
        self.assertEqual(fichier["donnees"]["previsions"], [])
        self.vider()
        self.assertEqual(self.importer(fichier).status_code, 200)

    def test_une_seule_ligne_invalide_et_rien_n_est_ecrit(self):
        fichier = self.fichier(
            categories=[{"nom": "Bonne"}],
            transactions=[{"date": VALEURS["instant"], "nom": "x", "montant": "mauvais"}],
        )
        self.assertEqual(self.importer(fichier).status_code, 400)
        self.assertEqual(self.tout("theo")["categories"], [])

    def test_un_message_d_erreur_ne_cite_pas_les_valeurs(self):
        reponse = self.importer(self.fichier(transactions=[{"nom": 12345678, "montant": 1}]))
        self.assertEqual(reponse.status_code, 400)
        self.assertNotIn("12345678", reponse.json()["detail"])

    def test_limite_de_taille(self):
        with mock.patch.object(sauvegarde, "TAILLE_MAX", 100):
            for url in (APERCU, IMPORT):
                reponse = self.client.post(url, content=b" " * 101, headers=self.theo)
                self.assertEqual(reponse.status_code, 413)
                self.assertIn("limite", reponse.json()["detail"])
            sans_longueur = self.client.post(IMPORT, content=(b" " * 60 for _ in range(2)), headers=self.theo)
            self.assertEqual(sans_longueur.status_code, 413)


class Inventaire(unittest.TestCase):
    """Compare l'inventaire au schéma : une table ou une colonne ajoutée par une révision doit être classée."""

    @staticmethod
    def schema():
        tables = {}
        for fichier in sorted(VERSIONS.glob("*.py")):
            source = fichier.read_text(encoding="utf-8")
            for nom, corps in re.findall(r'CREATE TABLE (\w+) \((.*?)\n\)"""', source, flags=re.S):
                colonnes = (ligne.strip() for ligne in corps.splitlines() if ligne.strip())
                tables[nom] = {c.split()[0].strip('"') for c in colonnes if not c.startswith("CONSTRAINT")}
            for nom, colonne in re.findall(r"ALTER TABLE (\w+)\s+ADD COLUMN (?:IF NOT EXISTS )?\"?(\w+)", source, flags=re.I):
                tables.setdefault(nom, set()).add(colonne)
        return tables

    def test_le_schema_est_bien_relu(self):
        schema = self.schema()
        self.assertGreaterEqual(len(schema), 30)
        self.assertIn("token_partage", schema["tricount"])
        self.assertIn("user", schema["theme"])

    def test_chaque_table_est_sauvegardee_ou_ecartee(self):
        connues = {t.nom for t in sauvegarde.TABLES} | set(sauvegarde.TABLES_ECARTEES) | {"users"}
        self.assertEqual(set(self.schema()) - connues, set(), "Table à classer dans routes/sauvegarde.py")
        self.assertEqual(connues - set(self.schema()), set())

    def test_chaque_colonne_est_sauvegardee_ou_ecartee(self):
        schema = self.schema()
        for table in sauvegarde.TABLES:
            connues = {c.nom for c in table.colonnes} | {table.utilisateur} | set(sauvegarde.COLONNES_ECARTEES.get(table.nom, {}))
            if table.serie:
                connues.add("id")
            with self.subTest(table=table.nom):
                self.assertEqual(schema[table.nom], connues)
        self.assertEqual(schema["users"], set(sauvegarde.COLONNES_PROFIL) | set(sauvegarde.COLONNES_ECARTEES["users"]))

    def test_les_contraintes_reprennent_celles_du_schema(self):
        """Une longueur oubliée ferait échouer l'import sur Postgres au lieu de le refuser proprement."""
        for fichier in sorted(VERSIONS.glob("*.py")):
            source = fichier.read_text(encoding="utf-8")
            for nom, corps in re.findall(r'CREATE TABLE (\w+) \((.*?)\n\)"""', source, flags=re.S):
                if nom not in sauvegarde.PAR_NOM:
                    continue
                par_nom = {c.nom: c for c in sauvegarde.PAR_NOM[nom].colonnes}
                for ligne in corps.splitlines():
                    morceaux = ligne.split()
                    if not morceaux or morceaux[0] == "CONSTRAINT" or morceaux[0].strip('"') not in par_nom:
                        continue
                    colonne = par_nom[morceaux[0].strip('"')]
                    longueur = re.search(r"character varying\((\d+)\)", ligne)
                    with self.subTest(table=nom, colonne=colonne.nom):
                        self.assertEqual(colonne.longueur, int(longueur.group(1)) if longueur else None)
                        if colonne.nom != "id":
                            self.assertEqual(colonne.requis, "NOT NULL" in ligne)
                        if "numeric(10,2)" in ligne:
                            self.assertEqual(colonne.borne, 1e8)
                        if "numeric(5,2)" in ligne:
                            self.assertEqual(colonne.borne, 1e3)
                        if "smallint" in ligne:
                            self.assertEqual(colonne.borne, 32767)


if __name__ == "__main__":
    unittest.main()
