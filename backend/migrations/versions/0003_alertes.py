"""Centre d'alertes : résultat de la dernière synchronisation de chaque compte, et alertes masquées."""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

CREATIONS = [
    """CREATE TABLE synchro_etat (
    utilisateur text NOT NULL,
    derniere_tentative timestamp with time zone,
    dernier_succes timestamp with time zone,
    dernier_echec timestamp with time zone,
    code_erreur character varying(60),
    CONSTRAINT synchro_etat_pkey PRIMARY KEY (utilisateur)
)""",
    """CREATE TABLE alertes_masquees (
    utilisateur text NOT NULL,
    alerte_id character varying(200) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT alertes_masquees_pkey PRIMARY KEY (utilisateur, alerte_id)
)""",
]


def upgrade() -> None:
    for instruction in CREATIONS:
        op.execute(instruction)


def downgrade() -> None:
    op.execute("DROP TABLE alertes_masquees")
    op.execute("DROP TABLE synchro_etat")
