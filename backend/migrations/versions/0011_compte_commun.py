"""Compte commun : partager certains comptes avec une autre personne, chacune avec sa connexion."""
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None

CREATIONS = [
    """CREATE TABLE partages (
    id serial NOT NULL,
    proprietaire text NOT NULL,
    invite_email text NOT NULL,
    invite text,
    etat character varying(20) NOT NULL,
    jeton_empreinte text,
    jeton_expire_le timestamp with time zone,
    cree_le timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    accepte_le timestamp with time zone,
    arrete_le timestamp with time zone,
    arrete_par text,
    CONSTRAINT partages_pkey PRIMARY KEY (id)
)""",
    """CREATE TABLE partages_comptes (
    partage_id integer NOT NULL,
    compte text NOT NULL,
    CONSTRAINT partages_comptes_pkey PRIMARY KEY (partage_id, compte)
)""",
    """CREATE TABLE partages_journal (
    id serial NOT NULL,
    partage_id integer NOT NULL,
    auteur text NOT NULL,
    action character varying(20) NOT NULL,
    detail text,
    cree_le timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT partages_journal_pkey PRIMARY KEY (id)
)""",
    "CREATE INDEX partages_proprietaire_idx ON partages (proprietaire)",
    "CREATE INDEX partages_invite_idx ON partages (invite)",
    "CREATE INDEX partages_journal_partage_idx ON partages_journal (partage_id)",
    "ALTER TABLE transactions ADD COLUMN auteur text",
    "ALTER TABLE previsions ADD COLUMN auteur text",
]


def upgrade() -> None:
    for instruction in CREATIONS:
        op.execute(instruction)


def downgrade() -> None:
    op.execute("ALTER TABLE previsions DROP COLUMN auteur")
    op.execute("ALTER TABLE transactions DROP COLUMN auteur")
    op.execute("DROP TABLE partages_journal")
    op.execute("DROP TABLE partages_comptes")
    op.execute("DROP TABLE partages")
