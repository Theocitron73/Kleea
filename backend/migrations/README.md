# Migrations de la base

Alembic garde l'historique des changements de structure (tables, colonnes). Vos données restent sur Neon.

## État actuel

La production Neon est marquée à la révision `0001` depuis le 5 novembre 2026 (table `alembic_version`).

La révision `0001` décrit les 28 tables de l'application, relevées sur la production. Le schéma `neon_auth` est géré par Neon et n'en fait pas partie.

- Sur une base vide, `alembic upgrade head` reconstruit la structure.
- Sur une base qui a déjà ces tables, `upgrade` échoue sans rien modifier : il faut utiliser `alembic stamp 0001`.
- `downgrade` de `0001` est refusé, car il supprimerait toutes les tables. Pour revenir en arrière, restaurer une branche Neon.

`backend/main.py` ne crée ni ne modifie plus aucune table : toute base neuve doit passer par `alembic upgrade head` avant de démarrer l'application.

## Ajouter un changement

```bash
alembic revision -m "ajout colonne exemple"
```

Écrire `upgrade()` et `downgrade()` dans le fichier créé, puis, après l'avoir testé sur une branche Neon et avec `DATABASE_URL` visant la base voulue :

```bash
alembic upgrade head
```

Le déploiement sur Render ne lance pas les migrations : `alembic upgrade head` reste une étape manuelle.

Le projet n'a pas de modèles SQLAlchemy : `alembic revision --autogenerate` ne détecterait rien.
