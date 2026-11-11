"""Double authentification par application : la méthode choisie, le secret chiffré et le dernier code accepté."""
from alembic import op

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None

# Les comptes déjà protégés restent sur le code par e-mail.
MODIFICATION = """ALTER TABLE double_auth
    ADD COLUMN methode character varying(20) NOT NULL DEFAULT 'email',
    ADD COLUMN secret text,
    ADD COLUMN derniere_etape bigint"""


def upgrade() -> None:
    op.execute(MODIFICATION)


def downgrade() -> None:
    op.execute("""ALTER TABLE double_auth
    DROP COLUMN methode,
    DROP COLUMN secret,
    DROP COLUMN derniere_etape""")
