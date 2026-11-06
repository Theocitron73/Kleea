"""Sessions de connexion : chaque jeton émis correspond à une ligne qu'on peut révoquer. Ni jeton ni adresse IP."""
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None

CREATIONS = [
    """CREATE TABLE sessions_connexion (
    id character varying(64) NOT NULL,
    utilisateur text NOT NULL,
    appareil character varying(80) NOT NULL,
    cree_le timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    derniere_activite timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoquee_le timestamp with time zone,
    CONSTRAINT sessions_connexion_pkey PRIMARY KEY (id)
)""",
    "CREATE INDEX sessions_connexion_utilisateur_idx ON sessions_connexion (utilisateur)",
]


def upgrade() -> None:
    for instruction in CREATIONS:
        op.execute(instruction)


def downgrade() -> None:
    op.execute("DROP TABLE sessions_connexion")
