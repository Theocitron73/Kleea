"""Liens de partage du Tricount : expiration, révocation et historique des changements faits par le lien."""
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

CREATIONS = [
    # Un jeton absent de cette table reste valable sans limite : ce sont les liens déjà partagés avant cette révision.
    """CREATE TABLE tricount_liens (
    token text NOT NULL,
    utilisateur text NOT NULL,
    groupe text NOT NULL,
    expire_le timestamp with time zone,
    revoque_le timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tricount_liens_pkey PRIMARY KEY (token)
)""",
    "CREATE INDEX tricount_liens_groupe_idx ON tricount_liens (utilisateur, groupe)",
    """CREATE TABLE tricount_historique (
    id SERIAL NOT NULL,
    utilisateur text NOT NULL,
    groupe text NOT NULL,
    action character varying(20) NOT NULL,
    depense_id integer,
    auteur character varying(60),
    ancienne_valeur text,
    nouvelle_valeur text,
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tricount_historique_pkey PRIMARY KEY (id)
)""",
    "CREATE INDEX tricount_historique_groupe_idx ON tricount_historique (utilisateur, groupe, created_at)",
]


def upgrade() -> None:
    for instruction in CREATIONS:
        op.execute(instruction)


def downgrade() -> None:
    op.execute("DROP TABLE tricount_historique")
    op.execute("DROP TABLE tricount_liens")
