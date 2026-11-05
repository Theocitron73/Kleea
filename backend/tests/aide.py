"""Outils communs des tests : le backend est réparti en plusieurs modules qui importent les mêmes noms."""
import os
import sys
from pathlib import Path
from unittest import mock

BACKEND = Path(__file__).resolve().parents[1]


def _modules_du_backend():
    # Une comparaison de texte : sys.modules contient des milliers de modules, résoudre leurs chemins serait trop lent.
    dossier = os.path.normcase(str(BACKEND)) + os.sep
    tests = dossier + "tests" + os.sep
    for module in list(sys.modules.values()):
        fichier = os.path.normcase(getattr(module, "__file__", None) or "")
        if fichier.startswith(dossier) and not fichier.startswith(tests):
            yield module


def source_du_backend() -> str:
    """Le code de tous les modules du backend, pour les vérifications qui lisent les sources."""
    fichiers = [*BACKEND.glob("*.py"), *(BACKEND / "routes").glob("*.py")]
    return "\n".join(f.read_text(encoding="utf-8") for f in sorted(fichiers)).replace("\r\n", "\n")


def __getattr__(nom):
    """aide.nom renvoie ce nom, dans le module du backend qui le définit."""
    for module in _modules_du_backend():
        if nom in vars(module):
            return vars(module)[nom]
    raise AttributeError(nom)


class partout:
    """Remplace un nom dans chaque module du backend qui l'a importé. S'utilise comme mock.patch.object."""

    def __init__(self, nom, valeur=mock.DEFAULT, **options):
        valeur = mock.MagicMock(**options) if valeur is mock.DEFAULT else valeur
        modules = [m for m in _modules_du_backend() if nom in vars(m)]
        if not modules:
            raise AttributeError(f"Aucun module du backend ne définit {nom}")
        self.valeur = valeur
        self.patchs = [mock.patch.object(m, nom, valeur) for m in modules]

    def start(self):
        for patch in self.patchs:
            patch.start()
        return self.valeur

    def stop(self):
        for patch in self.patchs:
            patch.stop()

    __enter__ = start

    def __exit__(self, *_):
        self.stop()
