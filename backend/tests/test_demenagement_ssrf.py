"""Scraper d'annonces : seules les URL des sites reconnus et résolvant vers une IP publique sont joignables.

Sans ce garde-fou, un compte pourrait forcer le serveur à requêter n'importe quelle adresse (127.0.0.1,
169.254.169.254, services internes) — une faille SSRF. Aucun test ne fait d'appel réseau réel.
"""
import os
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

from fastapi.testclient import TestClient  # noqa: E402

import aide  # noqa: E402
import main  # noqa: E402
from routes import demenagement  # noqa: E402

URL = "/api/demenagement/scrape-listing"


def getaddrinfo_fixe(adresse):
    return lambda hote, *a, **k: [(2, 1, 6, "", (adresse, 0))]


class Helpers(unittest.TestCase):
    def test_seuls_les_domaines_d_annonces_sont_autorises(self):
        for bon in ("www.seloger.com", "seloger.com", "m.leboncoin.fr", "pap.fr"):
            self.assertTrue(demenagement._hote_autorise(bon), bon)
        for mauvais in ("evil.com", "seloger.com.evil.com", "127.0.0.1", "localhost", "notseloger.com", ""):
            self.assertFalse(demenagement._hote_autorise(mauvais), mauvais)

    def test_une_ip_interne_est_refusee(self):
        for interne in ("127.0.0.1", "169.254.169.254", "10.0.0.5", "192.168.1.1", "::1"):
            with mock.patch("socket.getaddrinfo", getaddrinfo_fixe(interne)):
                self.assertFalse(demenagement._ips_toutes_publiques("www.seloger.com"), interne)
        with mock.patch("socket.getaddrinfo", getaddrinfo_fixe("93.184.216.34")):
            self.assertTrue(demenagement._ips_toutes_publiques("www.seloger.com"))

    def test_url_sure_combine_schema_hote_et_ip(self):
        with mock.patch("socket.getaddrinfo", getaddrinfo_fixe("93.184.216.34")):
            self.assertTrue(demenagement.url_annonce_sure("https://www.seloger.com/annonce/1"))
            self.assertFalse(demenagement.url_annonce_sure("https://seloger.com.evil.com/x"))  # hôte non listé
            self.assertFalse(demenagement.url_annonce_sure("ftp://www.seloger.com/x"))         # schéma interdit
            self.assertFalse(demenagement.url_annonce_sure("http://127.0.0.1/"))               # hôte non listé
        with mock.patch("socket.getaddrinfo", getaddrinfo_fixe("127.0.0.1")):
            self.assertFalse(demenagement.url_annonce_sure("https://www.seloger.com/x"))       # domaine listé mais IP interne


class FauxReponse:
    def __init__(self, status=200, texte="<html>ok</html>", location=None):
        self.status_code = status
        self.text = texte
        self.is_redirect = location is not None
        self.headers = {"location": location} if location else {}


class FauxClient:
    def __init__(self, reponses, *a, **k):
        self._reponses = list(reponses)
        self.demandes = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def get(self, url):
        self.demandes.append(url)
        return self._reponses.pop(0)


class Route(unittest.TestCase):
    def setUp(self):
        main.app.dependency_overrides[aide.get_current_user] = lambda: "theo"
        self.addCleanup(main.app.dependency_overrides.clear)
        self.client = TestClient(main.app)

    def scrape(self, url):
        return self.client.post(URL, json={"url": url})

    def test_une_url_interne_ou_inconnue_est_refusee_sans_requete(self):
        appels = []
        with mock.patch.object(demenagement.httpx, "AsyncClient", lambda *a, **k: appels.append(1)):
            with mock.patch("socket.getaddrinfo", getaddrinfo_fixe("93.184.216.34")):
                for url in ("http://169.254.169.254/latest/meta-data/", "http://localhost:8000/", "https://evil.com/x", "http://seloger.com@127.0.0.1/"):
                    self.assertEqual(self.scrape(url).status_code, 400, url)
        self.assertEqual(appels, [])  # aucune requête HTTP n'a été ouverte

    def test_une_redirection_vers_une_adresse_interne_est_bloquee(self):
        faux = FauxClient([FauxReponse(status=302, location="http://127.0.0.1/admin")])
        with mock.patch.object(demenagement.httpx, "AsyncClient", lambda *a, **k: faux):
            with mock.patch("socket.getaddrinfo", getaddrinfo_fixe("93.184.216.34")):
                reponse = self.scrape("https://www.seloger.com/annonce/1")
        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(faux.demandes, ["https://www.seloger.com/annonce/1"])  # la cible interne n'est jamais demandée

    def test_une_annonce_legitime_est_recuperee(self):
        faux = FauxClient([FauxReponse(texte="<html><title>Joli T2</title></html>")])
        with mock.patch.object(demenagement.httpx, "AsyncClient", lambda *a, **k: faux):
            with mock.patch("socket.getaddrinfo", getaddrinfo_fixe("93.184.216.34")):
                reponse = self.scrape("https://www.seloger.com/annonce/1")
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(faux.demandes, ["https://www.seloger.com/annonce/1"])


if __name__ == "__main__":
    unittest.main()
