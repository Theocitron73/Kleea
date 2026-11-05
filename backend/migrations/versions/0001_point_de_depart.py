"""Point de départ : la base de production telle qu'elle existe déjà.

Cette révision ne crée rien. Elle marque la structure actuelle comme référence : les changements suivants
s'ajoutent après elle. Une base vide n'est donc pas reconstruite par Alembic : voir README.md.
"""

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
