"""Accès à Powens, sur une base SQLite en mémoire : aucun appel réseau, aucun accès à la vraie base."""
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock
from urllib.parse import parse_qs, urlparse

# Valeurs factices posées AVANT l'import : load_dotenv() ne les écrase pas.
os.environ["DATABASE_URL"] = "postgresql://test:test@127.0.0.1:1/test"
os.environ["JWT_SECRET_KEY"] = "secret-de-test-suffisamment-long-pour-hs256"
os.environ["GEMINI_API_KEY"] = "test"
os.environ.pop("IBAN_ENCRYPTION_KEY", None)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.stdout.reconfigure(encoding="utf-8")

import jwt  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import aide  # noqa: E402
from aide import partout  # noqa: E402
import main  # noqa: E402


def reponse_http(status=200, corps=None):
    return mock.Mock(status_code=status, text="detail-interne-powens", json=lambda: corps or {})


def entetes(utilisateur):
    return {"Authorization": "Bearer " + aide.create_access_token(data={"sub": utilisateur})}


class Base(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        with self.engine.begin() as conn:
            conn.execute(text("CREATE TABLE banned_ips (ip TEXT, banned_until TIMESTAMP)"))
            conn.execute(text("CREATE TABLE users (username TEXT, email TEXT, powens_token TEXT)"))
            conn.execute(text("INSERT INTO users VALUES ('theo', 'theo@exemple.fr', 'jeton-theo')"))
            conn.execute(text("INSERT INTO users VALUES ('aude', 'aude@exemple.fr', NULL)"))
            conn.execute(text("CREATE TABLE transactions (utilisateur TEXT)"))
            conn.execute(text("INSERT INTO transactions VALUES ('theo'), ('theo'), ('aude')"))
        for nom, valeur in (("engine", self.engine), ("POWENS_DOMAIN", "https://demo.biapi.pro"), ("POWENS_DOMAIN_HOST", "demo.biapi.pro")):
            patcher = partout(nom, valeur)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.get = self.demarrer(aide.requests, "get")
        self.post = self.demarrer(aide.requests, "post")
        self.client = TestClient(main.app)
        self.theo = entetes("theo")
        self.aude = entetes("aude")

    def demarrer(self, cible, nom):
        patcher = mock.patch.object(cible, nom)
        objet = patcher.start()
        self.addCleanup(patcher.stop)
        return objet

    def jeton_en_base(self, utilisateur):
        with self.engine.connect() as conn:
            return conn.execute(text("SELECT powens_token FROM users WHERE username = :u"), {"u": utilisateur}).scalar()


class CompteurDeTransactions(Base):
    def test_acces_reserve_au_compte(self):
        url = "/transactions/stats/count/theo"
        self.assertEqual(self.client.get(url).status_code, 401)
        self.assertEqual(self.client.get(url, headers=self.aude).status_code, 403)
        reponse = self.client.get(url, headers=self.theo)
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.json()["user_transactions_count"], 2)


class JetonHorsDesUrl(Base):
    def test_toutes_les_routes_exigent_une_connexion(self):
        for url in ("/powens/connect-url?redirect_url=x", "/powens/accounts", "/powens/connections-and-accounts", "/import-powens", "/powens/connexion-active"):
            self.assertEqual(self.client.get(url).status_code, 401, url)
        self.get.assert_not_called()

    def test_un_jeton_passe_dans_l_url_est_ignore(self):
        self.get.return_value = reponse_http(200, {"accounts": []})
        self.client.get("/powens/accounts?user_token=jeton-pirate", headers=self.theo)
        self.assertEqual(self.get.call_args.kwargs["headers"]["Authorization"], "Bearer jeton-theo")

    def test_chaque_compte_utilise_son_jeton(self):
        with self.engine.begin() as conn:
            conn.execute(text("UPDATE users SET powens_token = 'jeton-aude' WHERE username = 'aude'"))
        self.get.return_value = reponse_http(200, {"accounts": []})
        self.client.get("/powens/accounts", headers=self.aude)
        self.assertEqual(self.get.call_args.kwargs["headers"]["Authorization"], "Bearer jeton-aude")

    def test_sans_banque_aucun_appel_a_powens(self):
        self.assertEqual(self.client.get("/powens/accounts", headers=self.aude).json(), [])
        vide = self.client.get("/powens/connections-and-accounts", headers=self.aude).json()
        self.assertEqual(vide["connections_count"], 0)
        self.assertEqual(self.client.get("/import-powens", headers=self.aude).status_code, 409)
        self.get.assert_not_called()

    def test_le_jeton_n_est_jamais_renvoye(self):
        self.assertEqual(self.client.get("/powens/connexion-active", headers=self.theo).json(), {"connecte": True})
        self.assertEqual(self.client.get("/powens/connexion-active", headers=self.aude).json(), {"connecte": False})

    def test_les_anciennes_routes_ont_disparu(self):
        self.assertEqual(self.client.get("/powens/recuperer-token?utilisateur=theo", headers=self.theo).status_code, 404)
        self.assertEqual(self.client.post("/powens/sauvegarder-token", json={"utilisateur": "theo", "user_token": "x"}, headers=self.theo).status_code, 404)
        self.assertEqual(self.client.get("/powens/transactions?user_token=x").status_code, 404)
        self.assertEqual(self.client.get("/powens/callback?code=x&state=theo").status_code, 405)

    def test_un_jeton_bancaire_expire_ne_deconnecte_pas_de_kleea(self):
        self.get.return_value = reponse_http(401)
        reponse = self.client.get("/powens/accounts", headers=self.theo)
        self.assertEqual(reponse.status_code, 502)
        self.assertNotIn("detail-interne-powens", reponse.text)


class StateSigne(Base):
    def state_de(self, entetes_compte):
        self.get.return_value = reponse_http(200, {"code": "code-temporaire"})
        url = self.client.get("/powens/connect-url?redirect_url=https://app/", headers=entetes_compte).json()["url"]
        return parse_qs(urlparse(url).query), url

    def echanger(self, state, entetes_compte, code="code-recu"):
        self.post.return_value = reponse_http(200, {"access_token": "nouveau-jeton"})
        return self.client.post("/powens/callback", json={"code": code, "state": state, "redirect_uri": "https://app/"}, headers=entetes_compte)

    def verifier_refus(self, reponse, utilisateur="aude", avant=None):
        self.assertEqual(reponse.status_code, 400)
        self.post.assert_not_called()
        self.assertEqual(self.jeton_en_base(utilisateur), avant)

    def test_le_lien_contient_un_state_signe_et_pas_le_jeton(self):
        params, url = self.state_de(self.theo)
        contenu = jwt.decode(params["state"][0], aide.SECRET_KEY, algorithms=[aide.ALGORITHM])
        self.assertEqual(contenu["sub"], "theo")
        self.assertEqual(params["code"], ["code-temporaire"])
        self.assertNotIn("jeton-theo", url)
        self.assertEqual(self.get.call_args.kwargs["headers"]["Authorization"], "Bearer jeton-theo")

    def test_sans_banque_le_lien_ne_demande_pas_de_code(self):
        params, _ = self.state_de(self.aude)
        self.assertNotIn("code", params)
        self.get.assert_not_called()

    def test_retour_valide_enregistre_le_jeton_sans_le_renvoyer(self):
        params, _ = self.state_de(self.aude)
        reponse = self.echanger(params["state"][0], self.aude)
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.json(), {"status": "success"})
        self.assertEqual(self.jeton_en_base("aude"), "nouveau-jeton")

    def test_le_state_d_un_autre_compte_est_refuse(self):
        params, _ = self.state_de(self.theo)
        self.verifier_refus(self.echanger(params["state"][0], self.aude))

    def test_impossible_de_viser_un_compte_avec_son_nom(self):
        self.verifier_refus(self.echanger("aude", self.theo), "theo", "jeton-theo")

    def test_state_falsifie_refuse(self):
        faux = jwt.encode({"sub": "aude", "usage": aide.POWENS_STATE_USAGE, "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}, "autre-secret-suffisamment-long-pour-hs256", algorithm="HS256")
        self.verifier_refus(self.echanger(faux, self.aude))

    def test_state_expire_refuse(self):
        expire = jwt.encode({"sub": "aude", "usage": aide.POWENS_STATE_USAGE, "exp": datetime.now(timezone.utc) - timedelta(seconds=1)}, aide.SECRET_KEY, algorithm=aide.ALGORITHM)
        self.verifier_refus(self.echanger(expire, self.aude))

    def test_un_jeton_de_session_ne_vaut_pas_state(self):
        session = aide.create_access_token(data={"sub": "aude"})
        self.verifier_refus(self.echanger(session, self.aude))

    def test_retour_sans_connexion_refuse(self):
        params, _ = self.state_de(self.aude)
        reponse = self.client.post("/powens/callback", json={"code": "x", "state": params["state"][0]})
        self.assertEqual(reponse.status_code, 401)
        self.post.assert_not_called()

    def test_refus_de_powens_sans_fuite(self):
        params, _ = self.state_de(self.aude)
        self.post.return_value = reponse_http(400)
        reponse = self.client.post("/powens/callback", json={"code": "x", "state": params["state"][0]}, headers=self.aude)
        self.assertEqual(reponse.status_code, 502)
        self.assertNotIn("detail-interne-powens", reponse.text)
        self.assertIsNone(self.jeton_en_base("aude"))


class JetonChiffre(Base):
    def setUp(self):
        super().setUp()
        patcher = partout("cipher", aide.Fernet(aide.Fernet.generate_key()))
        patcher.start()
        self.addCleanup(patcher.stop)

    def connecter_aude(self):
        self.post.return_value = reponse_http(200, {"access_token": "nouveau-jeton"})
        self.get.return_value = reponse_http(200, {"code": "code-temporaire"})
        lien = self.client.get("/powens/connect-url?redirect_url=https://app/", headers=self.aude).json()["url"]
        state = parse_qs(urlparse(lien).query)["state"][0]
        reponse = self.client.post("/powens/callback", json={"code": "c", "state": state, "redirect_uri": "https://app/"}, headers=self.aude)
        self.assertEqual(reponse.status_code, 200, reponse.text)

    def test_un_nouveau_jeton_est_chiffre_en_base_et_relu_en_clair(self):
        self.connecter_aude()
        self.assertNotIn("nouveau-jeton", self.jeton_en_base("aude"))
        self.assertEqual(aide.jeton_powens_du_compte("aude"), "nouveau-jeton")
        self.get.return_value = reponse_http(200, {"accounts": []})
        self.client.get("/powens/accounts", headers=self.aude)
        self.assertEqual(self.get.call_args.kwargs["headers"]["Authorization"], "Bearer nouveau-jeton")

    def test_un_ancien_jeton_en_clair_reste_valable(self):
        self.assertEqual(self.jeton_en_base("theo"), "jeton-theo")
        self.assertEqual(aide.jeton_powens_du_compte("theo"), "jeton-theo")

    def test_le_chiffrement_est_lu_par_toutes_les_routes(self):
        with self.engine.begin() as conn:
            conn.execute(text("UPDATE users SET powens_token = :j WHERE username = 'theo'"), {"j": aide.chiffrer_jeton("jeton-theo")})
        self.get.return_value = reponse_http(200, {"accounts": []})
        self.assertEqual(self.client.get("/powens/connexion-active", headers=self.theo).status_code, 200)
        self.client.get("/powens/accounts", headers=self.theo)
        self.assertEqual(self.get.call_args.kwargs["headers"]["Authorization"], "Bearer jeton-theo")

    def test_aucune_lecture_directe_du_jeton_ne_reste_dans_le_code(self):
        source = aide.source_du_backend()
        self.assertNotIn("user_token = res[0]\n", source.replace("\r\n", "\n"))
        self.assertNotIn('{"token": access_token,', source)

    def test_sans_cle_le_comportement_ne_change_pas(self):
        with partout("cipher", None):
            self.assertEqual(aide.chiffrer_jeton("abc"), "abc")
            self.assertEqual(aide.dechiffrer_jeton("abc"), "abc")
            self.assertIsNone(aide.dechiffrer_jeton(None))


if __name__ == "__main__":
    unittest.main()
