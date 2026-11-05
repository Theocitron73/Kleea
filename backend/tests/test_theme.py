"""Tests du thème, sur une base SQLite en mémoire (aucun accès à la vraie base)."""
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

# Valeurs factices posées AVANT l'import : load_dotenv() ne les écrase pas.
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

COLONNES = "bg_site TEXT, primary_color TEXT, secondary_color TEXT, text_main TEXT, radius TEXT, glass_blur TEXT, glass_bg TEXT"
THEME = {
    "bg_site": "#111111", "primary_color": "#222222", "text_main": "#ffffff",
    "radius": "1rem", "glass_blur": "8px", "glass_bg": "rgba(0, 0, 0, 0.1)",
}


class CouleurSecondaire(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        with self.engine.begin() as conn:
            conn.execute(text("CREATE TABLE banned_ips (ip TEXT, banned_until TIMESTAMP)"))
            conn.execute(text(f"CREATE TABLE user_theme (utilisateur TEXT PRIMARY KEY, {COLONNES})"))
            conn.execute(text(f"""
                CREATE TABLE theme_presets (
                    id INTEGER PRIMARY KEY, utilisateur TEXT, nom TEXT, {COLONNES},
                    gradient_style TEXT, gradient_intensity TEXT, gradient_color TEXT,
                    gradient_angle TEXT, gradient_shape TEXT, gradient_center TEXT, gradient_spread TEXT, is_active BOOLEAN,
                    UNIQUE (utilisateur, nom)
                )
            """))
        patcher = partout("engine", self.engine)
        patcher.start()
        self.addCleanup(patcher.stop)
        main.app.dependency_overrides[aide.get_current_user] = lambda: "theo"
        self.addCleanup(main.app.dependency_overrides.clear)
        self.client = TestClient(main.app)

    def secondaire_active(self):
        return self.client.get("/get-theme/theo").json()["secondary_color"]

    def test_le_choix_est_conserve_puis_peut_revenir_en_auto(self):
        self.client.post("/save-theme", json={**THEME, "utilisateur": "theo", "secondary_color": "#abcdef"})
        self.assertEqual(self.secondaire_active(), "#abcdef")
        self.client.post("/save-theme", json={**THEME, "utilisateur": "theo", "secondary_color": None})
        self.assertIsNone(self.secondaire_active())

    def test_un_client_qui_ne_l_envoie_pas_reste_accepte(self):
        reponse = self.client.post("/save-theme", json={**THEME, "utilisateur": "theo"})
        self.assertEqual(reponse.status_code, 200)
        self.assertIsNone(self.secondaire_active())

    def test_un_preset_applique_sa_secondaire(self):
        self.client.post("/api/themes/presets", json={**THEME, "nom": "Test", "secondary_color": "#abcdef"})
        preset = self.client.get("/api/themes/presets").json()[0]
        self.assertEqual(preset["secondary_color"], "#abcdef")
        self.client.post(f"/api/themes/presets/{preset['id']}/apply")
        self.assertEqual(self.secondaire_active(), "#abcdef")

    def test_un_ancien_preset_remet_la_secondaire_en_auto(self):
        self.client.post("/save-theme", json={**THEME, "utilisateur": "theo", "secondary_color": "#abcdef"})
        self.client.post("/api/themes/presets", json={**THEME, "nom": "Ancien"})
        preset = self.client.get("/api/themes/presets").json()[0]
        self.client.post(f"/api/themes/presets/{preset['id']}/apply")
        self.assertIsNone(self.secondaire_active())

    def test_un_preset_garde_la_forme_du_degrade(self):
        reglages = {"gradient_style": "conic", "gradient_angle": "45", "gradient_center": "30 70", "gradient_spread": "20", "gradient_shape": "ellipse"}
        self.client.post("/api/themes/presets", json={**THEME, "nom": "Forme", **reglages})
        preset = self.client.get("/api/themes/presets").json()[0]
        self.assertEqual({cle: preset[cle] for cle in reglages}, reglages)
        self.client.post("/api/themes/presets", json={**THEME, "nom": "Forme", "gradient_style": "linear", "gradient_angle": "90"})
        preset = self.client.get("/api/themes/presets").json()[0]
        self.assertEqual((preset["gradient_angle"], preset["gradient_center"]), ("90", None))

    def test_reenregistrer_un_preset_met_a_jour_tous_les_reglages(self):
        self.client.post("/api/themes/presets", json={**THEME, "nom": "Test"})
        self.client.post("/api/themes/presets", json={**THEME, "nom": "Test", "radius": "2rem", "secondary_color": "#abcdef"})
        presets = self.client.get("/api/themes/presets").json()
        self.assertEqual(len(presets), 1)
        self.assertEqual((presets[0]["radius"], presets[0]["secondary_color"]), ("2rem", "#abcdef"))


class AccesAuTheme(unittest.TestCase):
    """Sans remplacer l'authentification : ces tests passent par un vrai jeton signé."""

    def setUp(self):
        self.engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        with self.engine.begin() as conn:
            conn.execute(text("CREATE TABLE banned_ips (ip TEXT, banned_until TIMESTAMP)"))
            conn.execute(text(f"CREATE TABLE user_theme (utilisateur TEXT PRIMARY KEY, {COLONNES})"))
            conn.execute(text('CREATE TABLE theme ("user" TEXT, element TEXT, couleur TEXT, UNIQUE ("user", element))'))
            conn.execute(text("INSERT INTO user_theme (utilisateur, primary_color) VALUES ('aude', '#000001')"))
            conn.execute(text("""INSERT INTO theme ("user", element, couleur) VALUES ('aude', 'color_jauge', '#000002')"""))
        patcher = partout("engine", self.engine)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = TestClient(main.app)
        jeton = aide.create_access_token(data={"sub": "Theo"})
        self.theo = {"Authorization": f"Bearer {jeton}"}

    def theme_d_aude(self):
        with self.engine.connect() as conn:
            return (
                conn.execute(text("SELECT primary_color FROM user_theme WHERE utilisateur = 'aude'")).scalar(),
                conn.execute(text("""SELECT couleur FROM theme WHERE "user" = 'aude'""")).scalar(),
            )

    def appels(self, cible, headers):
        couleur = {"user": cible, "element": "color_jauge", "couleur": "#ffffff"}
        return {
            "get-theme": self.client.get(f"/get-theme/{cible}", headers=headers),
            "get-user-theme": self.client.get(f"/get-user-theme/{cible}", headers=headers),
            "save-theme": self.client.post("/save-theme", json={**THEME, "utilisateur": cible}, headers=headers),
            "save-user-theme": self.client.post("/save-user-theme", json=couleur, headers=headers),
        }

    def test_sans_jeton_tout_est_refuse(self):
        for route, reponse in self.appels("aude", {}).items():
            self.assertEqual(reponse.status_code, 401, route)
        self.assertEqual(self.theme_d_aude(), ("#000001", "#000002"))

    def test_jeton_invalide_refuse(self):
        for route, reponse in self.appels("aude", {"Authorization": "Bearer faux"}).items():
            self.assertEqual(reponse.status_code, 401, route)

    def test_le_compte_d_un_autre_est_refuse(self):
        for route, reponse in self.appels("aude", self.theo).items():
            self.assertEqual(reponse.status_code, 403, route)
        self.assertEqual(self.theme_d_aude(), ("#000001", "#000002"))

    def test_son_propre_compte_fonctionne_quelle_que_soit_la_casse(self):
        for route, reponse in self.appels("THEO", self.theo).items():
            self.assertEqual(reponse.status_code, 200, route)
        self.assertEqual(self.client.get("/get-theme/theo", headers=self.theo).json()["primary_color"], "#222222")
        self.assertEqual(self.client.get("/get-user-theme/theo", headers=self.theo).json(), {"color_jauge": "#ffffff"})
        self.assertEqual(self.theme_d_aude(), ("#000001", "#000002"))


if __name__ == "__main__":
    unittest.main()
