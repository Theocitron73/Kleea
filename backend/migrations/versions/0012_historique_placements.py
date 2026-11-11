"""Historique des placements : chaque valeur saisie d'un bien est gardée, pour tracer sa courbe et sa performance."""
from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None

# Liste JSON de {date, valeur} ; vide pour les biens existants, qui partent de leur dernière valeur saisie.
MODIFICATION = "ALTER TABLE biens ADD COLUMN valeurs text"


def upgrade() -> None:
    op.execute(MODIFICATION)


def downgrade() -> None:
    op.execute("ALTER TABLE biens DROP COLUMN valeurs")
