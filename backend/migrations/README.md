# Migrations de la base

Alembic garde l'historique des changements de structure (tables, colonnes). Vos données restent sur Neon.

## Rien n'est encore appliqué sur Neon

La révision `0001` est volontairement vide : la structure de production n'a pas pu être lue pour la décrire.
Les `CREATE TABLE IF NOT EXISTS` et `ALTER TABLE` lancés au démarrage de `backend/main.py` continuent de fonctionner comme avant.

## Pour l'activer sur Neon

1. Tester sur une branche Neon plutôt que sur la production.
2. Vérifier que `DATABASE_URL` vise bien la base voulue.
3. Marquer la base comme étant au point de départ. Cette commande crée seulement la table `alembic_version` :

   ```bash
   alembic stamp 0001
   ```

## Ajouter un changement

```bash
alembic revision -m "ajout colonne exemple"
```

Écrire `upgrade()` et `downgrade()` dans le fichier créé, puis, après l'avoir testé sur une branche Neon :

```bash
alembic upgrade head
```

Le projet n'a pas de modèles SQLAlchemy : `alembic revision --autogenerate` ne détecterait rien.

## Pour aller plus loin

Pour qu'Alembic sache reconstruire une base vide, remplir `0001` à partir de `pg_dump --schema-only`, puis retirer
progressivement les créations de tables du démarrage de `main.py`.
