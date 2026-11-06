"""Dépenses récurrentes qu'un compte a choisi d'ignorer dans l'onglet Abonnements."""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

CREATION = """CREATE TABLE abonnements_ignores (
    utilisateur text NOT NULL,
    abonnement_id character varying(200) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT abonnements_ignores_pkey PRIMARY KEY (utilisateur, abonnement_id)
)"""


def upgrade() -> None:
    op.execute(CREATION)


def downgrade() -> None:
    op.execute("DROP TABLE abonnements_ignores")
