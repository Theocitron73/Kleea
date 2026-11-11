"""Changer de mot de passe : l'actuel est exigé, puis les autres appareils sont déconnectés."""
import unittest

from sqlalchemy import text

import aide
from test_sessions import CHROME, IPHONE, MOT_DE_PASSE, SONDE, Base

NOUVEAU = "NouveauMotDePasse1!"


class ChangerMotDePasse(Base):
    def setUp(self):
        super().setUp()
        with self.moteur.begin() as conn:
            aide.creer_tables_manquantes(conn)

    def connecter(self, mot_de_passe=MOT_DE_PASSE, navigateur=CHROME):
        reponse = self.client.post("/login", json={"nom": "Theo", "password": mot_de_passe}, headers={"User-Agent": navigateur})
        self.assertEqual(reponse.status_code, 200, reponse.text)
        return {"Authorization": f"Bearer {reponse.json()['access_token']}"}

    def changer(self, session, actuel):
        return self.client.put("/profile/theo/password", json={"current_password": actuel, "new_password": NOUVEAU}, headers=session)

    def test_sans_le_bon_mot_de_passe_actuel_rien_ne_change(self):
        session = self.connecter()
        reponse = self.changer(session, "pas-le-bon")
        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(reponse.json()["detail"], "Mot de passe actuel incorrect.")
        self.connecter()  # L'ancien mot de passe marche toujours.
        self.assertEqual(self.client.put("/profile/theo/password", json={"new_password": NOUVEAU}, headers=session).status_code, 422)

    def test_le_changement_deconnecte_les_autres_appareils_et_garde_celui_ci(self):
        ici = self.connecter()
        ailleurs = self.connecter(navigateur=IPHONE)
        reponse = self.changer(ici, MOT_DE_PASSE)
        self.assertEqual(reponse.status_code, 200, reponse.text)
        self.assertEqual(reponse.json()["sessions_coupees"], 1)
        self.assertEqual(self.client.get(SONDE, headers=ici).status_code, 200)
        self.assertEqual(self.client.get(SONDE, headers=ailleurs).status_code, 401)
        self.connecter(NOUVEAU)

    def test_par_le_lien_e_mail_toutes_les_sessions_tombent(self):
        session = self.connecter()
        with self.moteur.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN reset_token TEXT"))
            conn.execute(text("UPDATE users SET reset_token = 'lien' WHERE username = 'Theo'"))
        self.assertEqual(self.client.post("/reset-password-confirm", json={"token": "lien", "new_password": NOUVEAU}).status_code, 200)
        self.assertEqual(self.client.get(SONDE, headers=session).status_code, 401)


if __name__ == "__main__":
    unittest.main()
