"""Effacement d'un compte : le schéma n'a ni clé étrangère ni cascade, cet inventaire est la seule liste des données.

test_suppression_compte.py le compare aux révisions Alembic : une nouvelle table doit être classée ici, sinon les tests échouent.
"""
from sqlalchemy import inspect, text


# Table -> colonne qui contient l'identifiant du compte.
TABLES_DU_COMPTE = {
    "abonnements_ignores": "utilisateur",
    "alertes_masquees": "utilisateur",
    "journal_securite": "utilisateur",
    "allocations": "utilisateur",
    "annonces_logement": "utilisateur",
    "biens": "utilisateur",
    "budgets": "utilisateur",
    "categories": "utilisateur",
    "categories_masquees": "utilisateur",
    "config_categories": "utilisateur",
    "configuration": "utilisateur",
    "conges": "utilisateur",
    "conges_profile": "utilisateur",
    "custom_stats": "utilisateur",
    "dettes": "utilisateur",
    "double_auth": "utilisateur",
    "memoire": "utilisateur",
    "notes": "utilisateur",
    "notes_demenagement": "utilisateur",
    "pages_masquees": "utilisateur",
    "previsions": "utilisateur",
    "projets": "utilisateur",
    "regles_recurrentes": "utilisateur",
    "sessions_connexion": "utilisateur",
    "simulations_demenagement": "utilisateur",
    "split_sources": "utilisateur",
    "streamdeck_tokens": "utilisateur",
    "synchro_etat": "utilisateur",
    "theme": "user",
    "theme_presets": "utilisateur",
    "transactions": "utilisateur",
    "tricount": "utilisateur",  # Les liens de partage (token_partage) disparaissent avec ces lignes.
    "tricount_historique": "utilisateur",
    "tricount_liens": "utilisateur",
    "user_theme": "utilisateur",
    "users": "username",
}


# Ces tables ne contiennent que des adresses IP.
TABLES_SANS_COMPTE = {
    "banned_ips": "sécurité du site, par adresse IP",
    "login_failed_attempts": "sécurité du site, par adresse IP",
}


# Compte commun : un partage relie deux comptes. Il est arrêté avant la purge (l'invité garde sa copie), puis effacé.
TABLES_DES_PARTAGES = ("partages", "partages_comptes", "partages_journal")
# Sur un compte partagé, les lignes de l'autre personne gardent qui les a saisies : ce nom est effacé, pas les lignes.
COLONNES_AUTEUR = {"transactions": "auteur", "previsions": "auteur"}


# La clé est l'e-mail pour cette action, et l'identifiant pour les autres : voir purger_compte.
TABLE_DES_LIMITES = "security_rate_limits"
ACTION_PAR_EMAIL = "password_reset"


def purger_compte(conn, utilisateur: str, emails) -> None:
    """Efface tout le compte dans la transaction de `conn`. D'anciennes lignes gardent la casse de l'identifiant.

    Les colonnes de compte ne sont jamais comparées à l'e-mail : l'identifiant d'un autre compte peut lui être égal.
    """
    # Une table absente (révision pas encore appliquée, ou défaite) ne contient rien à effacer.
    existantes = set(inspect(conn).get_table_names())
    for table, colonne in TABLES_DU_COMPTE.items():
        if table in existantes:
            conn.execute(text(f'DELETE FROM "{table}" WHERE LOWER("{colonne}") = LOWER(:u)'), {"u": utilisateur})

    emails = [e for e in emails if e]
    if "partages" in existantes:
        purger_partages(conn, utilisateur, emails, existantes)
    for table, colonne in COLONNES_AUTEUR.items():
        if table in existantes and colonne in {c["name"] for c in inspect(conn).get_columns(table)}:
            conn.execute(text(f'UPDATE "{table}" SET "{colonne}" = NULL WHERE LOWER("{colonne}") = LOWER(:u)'), {"u": utilisateur})

    if TABLE_DES_LIMITES not in existantes:
        return
    conn.execute(
        text(f"DELETE FROM {TABLE_DES_LIMITES} WHERE action <> :action AND LOWER(key) = LOWER(:u)"),
        {"action": ACTION_PAR_EMAIL, "u": utilisateur},
    )
    # Un e-mail absent n'est pas transmis : psycopg 3 ne sait pas typer un paramètre NULL dans LOWER().
    for email in filter(None, emails):
        conn.execute(
            text(f"DELETE FROM {TABLE_DES_LIMITES} WHERE action = :action AND LOWER(key) = LOWER(:e)"),
            {"action": ACTION_PAR_EMAIL, "e": email},
        )


def purger_partages(conn, utilisateur: str, emails: list, existantes: set) -> None:
    """Les partages du compte, et les invitations reçues à son adresse, avec leurs comptes et leur journal."""
    condition = "LOWER(proprietaire) = LOWER(:u) OR LOWER(invite) = LOWER(:u)" + "".join(f" OR LOWER(invite_email) = LOWER(:e{i})" for i in range(len(emails)))
    parametres = {"u": utilisateur, **{f"e{i}": e for i, e in enumerate(emails)}}
    for table in ("partages_comptes", "partages_journal"):
        if table in existantes:
            conn.execute(text(f"DELETE FROM {table} WHERE partage_id IN (SELECT id FROM partages WHERE {condition})"), parametres)
    conn.execute(text(f"DELETE FROM partages WHERE {condition}"), parametres)
