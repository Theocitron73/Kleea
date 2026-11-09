"""Prévisions et budgets récurrents : une règle crée elle-même les lignes des mois à venir."""
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None

CREATIONS = [
    """CREATE TABLE regles_recurrentes (
    id serial NOT NULL,
    utilisateur text NOT NULL,
    type character varying(20) NOT NULL,
    nom text NOT NULL,
    montant double precision NOT NULL,
    categorie text,
    compte text,
    jour integer,
    debut date NOT NULL,
    fin date,
    actif boolean DEFAULT true,
    genere_jusqu_a date,
    CONSTRAINT regles_recurrentes_pkey PRIMARY KEY (id)
)""",
    "CREATE INDEX regles_recurrentes_utilisateur_idx ON regles_recurrentes (utilisateur)",
    "ALTER TABLE previsions ADD COLUMN regle_id integer",
    "ALTER TABLE budgets ADD COLUMN regle_id integer",
]


def upgrade() -> None:
    for instruction in CREATIONS:
        op.execute(instruction)


def downgrade() -> None:
    op.execute("ALTER TABLE budgets DROP COLUMN regle_id")
    op.execute("ALTER TABLE previsions DROP COLUMN regle_id")
    op.execute("DROP TABLE regles_recurrentes")
