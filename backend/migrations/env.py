"""Connexion d'Alembic à la base désignée par DATABASE_URL. Les migrations sont écrites à la main : le projet n'a pas de modèles."""
import os
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import create_engine, pool

load_dotenv()

if context.config.config_file_name:
    fileConfig(context.config.config_file_name, disable_existing_loggers=False)

url = os.getenv("DATABASE_URL")
if not url:
    raise RuntimeError("DATABASE_URL est obligatoire pour lancer Alembic.")


if context.is_offline_mode():
    context.configure(url=url, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = create_engine(url, poolclass=pool.NullPool, hide_parameters=True)
    with engine.connect() as connection:
        context.configure(connection=connection)
        with context.begin_transaction():
            context.run_migrations()
