"""Valeur nette : les biens (immobilier, placements, véhicules…) et les dettes avec leur échéancier."""
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None

CREATIONS = [
    """CREATE TABLE biens (
    id serial NOT NULL,
    utilisateur text NOT NULL,
    type character varying(20) NOT NULL,
    nom text NOT NULL,
    valeur double precision NOT NULL,
    date_valeur date NOT NULL,
    decote double precision,
    libelle_lien text,
    profil text,
    cree_le timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT biens_pkey PRIMARY KEY (id)
)""",
    """CREATE TABLE dettes (
    id serial NOT NULL,
    utilisateur text NOT NULL,
    type character varying(20) NOT NULL,
    nom text NOT NULL,
    montant double precision NOT NULL,
    taux double precision NOT NULL,
    duree_mois integer,
    debut date NOT NULL,
    libelle_lien text,
    profil text,
    anticipes text,
    ignores text,
    cree_le timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT dettes_pkey PRIMARY KEY (id)
)""",
    "CREATE INDEX biens_utilisateur_idx ON biens (utilisateur)",
    "CREATE INDEX dettes_utilisateur_idx ON dettes (utilisateur)",
]


def upgrade() -> None:
    for instruction in CREATIONS:
        op.execute(instruction)


def downgrade() -> None:
    op.execute("DROP TABLE dettes")
    op.execute("DROP TABLE biens")
