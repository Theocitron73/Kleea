"""Double authentification facultative : une ligne par compte qui l'a préparée ou activée."""
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None

CREATION = """CREATE TABLE double_auth (
    utilisateur text NOT NULL,
    secret text NOT NULL,
    active boolean NOT NULL DEFAULT false,
    codes_secours text NOT NULL DEFAULT '[]',
    derniere_etape bigint NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT double_auth_pkey PRIMARY KEY (utilisateur)
)"""


def upgrade() -> None:
    op.execute(CREATION)


def downgrade() -> None:
    op.execute("DROP TABLE double_auth")
