"""Double authentification par e-mail : le code envoyé remplace le secret de l'application."""
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None

MODIFICATION = """ALTER TABLE double_auth
    DROP COLUMN secret,
    DROP COLUMN codes_secours,
    DROP COLUMN derniere_etape,
    ADD COLUMN code_empreinte text,
    ADD COLUMN code_expire_le timestamp with time zone,
    ADD COLUMN essais integer NOT NULL DEFAULT 0"""


def upgrade() -> None:
    op.execute(MODIFICATION)


def downgrade() -> None:
    op.execute("""ALTER TABLE double_auth
    DROP COLUMN code_empreinte,
    DROP COLUMN code_expire_le,
    DROP COLUMN essais,
    ADD COLUMN secret text NOT NULL DEFAULT '',
    ADD COLUMN codes_secours text NOT NULL DEFAULT '[]',
    ADD COLUMN derniere_etape bigint NOT NULL DEFAULT 0""")
