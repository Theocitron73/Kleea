"""Outils communs des tests : le backend est réparti en plusieurs modules qui importent les mêmes noms."""
import os
import re
import sys
from pathlib import Path
from unittest import mock

from sqlalchemy import text

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


def _colonnes_ou_clauses(corps: str) -> list:
    """Découpe aux virgules qui ne sont pas entre parenthèses."""
    morceaux, profondeur, courant = [], 0, ""
    for caractere in corps:
        profondeur += (caractere == "(") - (caractere == ")")
        if caractere == "," and profondeur == 0:
            morceaux.append(courant)
            courant = ""
        else:
            courant += caractere
    return [m.strip() for m in [*morceaux, courant] if m.strip()]


def _colonnes(corps: str) -> set:
    """Les noms de colonnes d'un CREATE TABLE, sans les contraintes."""
    noms = (morceau.split()[0].strip('"') for morceau in _colonnes_ou_clauses(corps))
    return {nom for nom in noms if nom.upper() not in {"CONSTRAINT", "PRIMARY", "UNIQUE", "CHECK", "FOREIGN"}}


def schema_des_revisions(dossier=None) -> dict:
    """Table -> colonnes, d'après le SQL des révisions Alembic, dans l'ordre. Ne demande aucune base."""
    schema = {}
    for fichier in sorted(Path(dossier or BACKEND / "migrations" / "versions").glob("*.py")):
        source = fichier.read_text(encoding="utf-8").split("def downgrade")[0]
        if re.search(r"\bop\.(create_table|rename_table|drop_table|add_column|drop_column)\b", source):
            raise ValueError(f"{fichier.name} : ce relevé ne lit que le SQL de op.execute. L'écrire ainsi, ou étendre schema_des_revisions.")
        for trouve in re.finditer(r'(?i)create\s+table\s+(?:if\s+not\s+exists\s+)?"?(\w+)"?\s*\(', source):
            debut, profondeur = trouve.end(), 1
            fin = debut
            while profondeur:
                profondeur += (source[fin] == "(") - (source[fin] == ")")
                fin += 1
            schema[trouve.group(1)] = _colonnes(source[debut:fin - 1])
        # Un ALTER TABLE peut enchaîner plusieurs clauses séparées par des virgules, jusqu'à la fin de la chaîne SQL.
        for table, clauses in re.findall(r'(?i)alter\s+table\s+"?(\w+)"?\s+([^"]*)', source):
            for clause in _colonnes_ou_clauses(clauses):
                mots = clause.replace('"', "").split()
                if len(mots) >= 3 and mots[0].lower() == "rename" and mots[1].lower() == "to":
                    schema[mots[2]] = schema.pop(table)
                    continue
                mots = [m for m in mots if m.lower() not in {"column", "if", "not", "exists"}]
                if len(mots) >= 2 and mots[0].lower() == "add":
                    schema[table].add(mots[1])
                elif len(mots) >= 2 and mots[0].lower() == "drop":
                    schema[table].discard(mots[1])
        for table in re.findall(r'(?i)drop\s+table\s+(?:if\s+exists\s+)?"?(\w+)"?', source):
            schema.pop(table, None)
    return schema


def creer_tables_manquantes(conn) -> None:
    """Pour SQLite : ajoute les tables des révisions qu'un test n'a pas créées, sans contrainte, avec leurs seules colonnes."""
    for table, colonnes in schema_des_revisions().items():
        liste = ", ".join(f'"{colonne}"' for colonne in sorted(colonnes))
        conn.execute(text(f'CREATE TABLE IF NOT EXISTS "{table}" ({liste})'))


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
