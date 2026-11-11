"""Valeur nette, suite : cours automatique de la crypto et crédits remontés par la banque (Powens)."""
from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None

MODIFICATIONS = [
    "ALTER TABLE biens ADD COLUMN quantite double precision",
    "ALTER TABLE biens ADD COLUMN crypto_id text",
    "ALTER TABLE dettes ADD COLUMN powens_compte_id text",
    "ALTER TABLE dettes ADD COLUMN capital_banque double precision",
    "ALTER TABLE dettes ADD COLUMN capital_banque_le timestamp with time zone",
]


def upgrade() -> None:
    for instruction in MODIFICATIONS:
        op.execute(instruction)


def downgrade() -> None:
    for colonne in ("powens_compte_id", "capital_banque", "capital_banque_le"):
        op.execute(f"ALTER TABLE dettes DROP COLUMN {colonne}")
    for colonne in ("quantite", "crypto_id"):
        op.execute(f"ALTER TABLE biens DROP COLUMN {colonne}")
