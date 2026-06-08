"""assign inbounds to nodes

Revision ID: 6f8c2d1a4b70
Revises: 2b231de97dc3
Create Date: 2026-06-08 00:00:00.000000

"""
import sqlalchemy as sa
from alembic import op


revision = '6f8c2d1a4b70'
down_revision = '2b231de97dc3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    association = op.create_table(
        'node_inbounds_association',
        sa.Column('node_id', sa.Integer(), nullable=False),
        sa.Column('inbound_tag', sa.String(length=256), nullable=False),
        sa.ForeignKeyConstraint(['inbound_tag'], ['inbounds.tag']),
        sa.ForeignKeyConstraint(['node_id'], ['nodes.id']),
        sa.PrimaryKeyConstraint('node_id', 'inbound_tag'),
    )

    connection = op.get_bind()
    node_ids = [row[0] for row in connection.execute(sa.text('SELECT id FROM nodes'))]
    inbound_tags = [row[0] for row in connection.execute(sa.text('SELECT tag FROM inbounds'))]
    if node_ids and inbound_tags:
        op.bulk_insert(
            association,
            [
                {'node_id': node_id, 'inbound_tag': inbound_tag}
                for node_id in node_ids
                for inbound_tag in inbound_tags
            ],
        )


def downgrade() -> None:
    op.drop_table('node_inbounds_association')
