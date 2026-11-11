"""Journal des événements de sécurité : connexions, échecs, mots de passe, double authentification et partages."""
from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None

CREATIONS = [
    """CREATE TABLE journal_securite (
    id serial NOT NULL,
    utilisateur text NOT NULL,
    evenement character varying(40) NOT NULL,
    detail text,
    appareil text,
    ip text,
    cree_le timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT journal_securite_pkey PRIMARY KEY (id)
)""",
    "CREATE INDEX journal_securite_utilisateur_idx ON journal_securite (utilisateur, cree_le)",
]


def upgrade() -> None:
    for instruction in CREATIONS:
        op.execute(instruction)


def downgrade() -> None:
    op.execute("DROP TABLE journal_securite")
