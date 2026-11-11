"""E-mails d'alerte : nouvel appareil, mot de passe changé, compte commun. Aucun e-mail réel ne part."""
import os
import unittest
from unittest import mock

from sqlalchemy import text

import alertes_email
from test_sessions import CHROME, IPHONE, MOT_DE_PASSE, Base


class Alertes(Base):
    def setUp(self):
        super().setUp()
        cle = mock.patch.dict(os.environ, {"RESEND_API_KEY": "re_test"})
        cle.start()
        self.addCleanup(cle.stop)
        envoi = mock.patch.object(alertes_email.resend.Emails, "send")
        self.envoi = envoi.start()
        self.addCleanup(envoi.stop)

    def sujets(self):
        return [appel.args[0]["subject"] for appel in self.envoi.call_args_list]

    def connecter(self, navigateur=CHROME):
        reponse = self.client.post("/login", json={"nom": "Theo", "password": MOT_DE_PASSE}, headers={"User-Agent": navigateur})
        self.assertEqual(reponse.status_code, 200, reponse.text)
        return {"Authorization": f"Bearer {reponse.json()['access_token']}"}

    def test_seul_un_nouvel_appareil_declenche_une_alerte(self):
        self.connecter()
        self.connecter()
        self.connecter(IPHONE)
        self.assertEqual(self.sujets(), ["Kleea - Connexion depuis un nouvel appareil"] * 2)
        destinataires = {appel.args[0]["to"][0] for appel in self.envoi.call_args_list}
        self.assertEqual(destinataires, {"Theo@kleea.test"})
        self.assertIn("Safari sur iPhone", self.envoi.call_args_list[-1].args[0]["html"])

    def test_un_mot_de_passe_change_previent_le_titulaire(self):
        session = self.connecter()
        self.envoi.reset_mock()
        reponse = self.client.put("/profile/theo/password", json={"current_password": MOT_DE_PASSE, "new_password": "NouveauMotDePasse1!"}, headers=session)
        self.assertEqual(reponse.status_code, 200, reponse.text)
        self.assertEqual(self.sujets(), ["Kleea - Mot de passe changé"])

    def test_la_reinitialisation_par_e_mail_previent_aussi(self):
        with self.moteur.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN reset_token TEXT"))
            conn.execute(text("UPDATE users SET reset_token = 'lien-secret' WHERE username = 'aude'"))
        reponse = self.client.post("/reset-password-confirm", json={"token": "lien-secret", "new_password": "NouveauMotDePasse1!"})
        self.assertEqual(reponse.status_code, 200, reponse.text)
        self.assertEqual(self.envoi.call_args.args[0]["to"], ["aude@kleea.test"])
        self.assertEqual(self.client.post("/reset-password-confirm", json={"token": "lien-secret", "new_password": "AutreMotDePasse1!"}).status_code, 400)
        self.assertEqual(self.envoi.call_count, 1)

    def test_le_texte_est_echappe(self):
        alertes_email.prevenir("Theo", "Essai", ["<script>alert(1)</script>"])
        html = self.envoi.call_args.args[0]["html"]
        self.assertNotIn("<script>", html)
        self.assertIn("&lt;script&gt;", html)

    def test_une_panne_d_envoi_ne_bloque_pas_la_connexion(self):
        self.envoi.side_effect = RuntimeError("Resend indisponible")
        self.connecter(IPHONE)

    def test_sans_cle_ni_adresse_rien_ne_part(self):
        with mock.patch.dict(os.environ, {"RESEND_API_KEY": ""}):
            self.assertFalse(alertes_email.prevenir("Theo", "Essai", ["x"]))
        self.assertFalse(alertes_email.prevenir("inconnu", "Essai", ["x"]))
        self.envoi.assert_not_called()


if __name__ == "__main__":
    unittest.main()
