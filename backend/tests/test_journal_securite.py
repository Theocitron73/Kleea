"""Journal des événements de sécurité : ce qui est noté, qui le voit, combien de temps, et rien ne casse sans la table."""
import unittest
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

import aide
import journal_securite
from test_sessions import CHROME, IPHONE, MOT_DE_PASSE, Base

JOURNAL = "/api/securite/journal"


class Journal(Base):
    def setUp(self):
        super().setUp()
        with self.moteur.begin() as conn:
            aide.creer_tables_manquantes(conn)

    def connecter(self, nom="Theo", mot_de_passe=MOT_DE_PASSE, navigateur=CHROME, attendu=200):
        reponse = self.client.post("/login", json={"nom": nom, "password": mot_de_passe}, headers={"User-Agent": navigateur})
        self.assertEqual(reponse.status_code, attendu, reponse.text)
        return {"Authorization": f"Bearer {reponse.json()['access_token']}"} if attendu == 200 else None

    def journal(self, session):
        reponse = self.client.get(JOURNAL, headers=session).json()
        self.assertTrue(reponse["disponible"])
        return reponse["evenements"]

    def test_echec_puis_connexion_sont_notes_avec_l_appareil(self):
        self.connecter(mot_de_passe="mauvais", attendu=401)
        session = self.connecter(navigateur=IPHONE)
        evenements = self.journal(session)
        self.assertEqual([e["evenement"] for e in evenements], ["connexion", "echec_connexion"])
        self.assertEqual(evenements[0]["appareil"], "Safari sur iPhone")
        self.assertEqual(evenements[1]["libelle"], "Échec de connexion")
        self.assertTrue(evenements[1]["echec"])
        self.assertTrue(evenements[0]["ip"])

    def test_chacun_ne_voit_que_son_journal(self):
        self.connecter(nom="aude")
        session = self.connecter()
        self.assertEqual({e["evenement"] for e in self.journal(session)}, {"connexion"})
        self.assertEqual(len(self.journal(session)), 1)
        self.assertEqual(self.client.get(JOURNAL).status_code, 401)

    def test_mot_de_passe_et_deconnexion_d_appareil(self):
        session = self.connecter()
        ailleurs = self.connecter(navigateur=IPHONE)
        self.client.put("/profile/theo/password", json={"current_password": MOT_DE_PASSE, "new_password": "NouveauMotDePasse1!"}, headers=session)
        self.assertEqual(self.client.get(JOURNAL, headers=ailleurs).status_code, 401)
        evenements = self.journal(session)
        self.assertEqual(evenements[0]["evenement"], "mot_de_passe_change")
        self.assertEqual(evenements[0]["detail"], "Depuis le profil, 1 autre appareil déconnecté")
        # Plus rien à couper : « Tout déconnecter » ne note rien.
        self.assertEqual(self.client.post("/api/sessions/revoquer-autres", headers=session).json()["revoquees"], 0)
        self.assertEqual(self.journal(session)[0]["evenement"], "mot_de_passe_change")

    def test_les_evenements_de_plus_de_90_jours_sont_purges(self):
        session = self.connecter()
        with self.moteur.begin() as conn:
            conn.execute(text("UPDATE journal_securite SET cree_le = :t"), {"t": datetime.now(timezone.utc) - timedelta(days=91)})
        journal_securite.purger_journal()
        self.assertEqual(self.journal(session), [])

    def test_sans_la_table_la_connexion_marche_et_le_journal_le_dit(self):
        with self.moteur.begin() as conn:
            conn.execute(text("DROP TABLE journal_securite"))
        session = self.connecter()
        self.assertEqual(self.client.get(JOURNAL, headers=session).json(), {"disponible": False, "evenements": []})


if __name__ == "__main__":
    unittest.main()
