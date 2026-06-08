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
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    if not inspector.has_table('node_inbounds_association'):
        node_id_type = next(
            column['type']
            for column in inspector.get_columns('nodes')
            if column['name'] == 'id'
        )
        inbound_tag_type = next(
            column['type']
            for column in inspector.get_columns('inbounds')
            if column['name'] == 'tag'
        )

        # Reusing the reflected types preserves MySQL attributes such as
        # collation, which must match exactly for foreign keys.
        op.create_table(
            'node_inbounds_association',
            sa.Column('node_id', node_id_type, nullable=False),
            sa.Column('inbound_tag', inbound_tag_type, nullable=False),
            sa.ForeignKeyConstraint(['inbound_tag'], ['inbounds.tag']),
            sa.ForeignKeyConstraint(['node_id'], ['nodes.id']),
            sa.PrimaryKeyConstraint('node_id', 'inbound_tag'),
        )

    association = sa.Table(
        'node_inbounds_association',
        sa.MetaData(),
        autoload_with=connection,
    )
    node_ids = [row[0] for row in connection.execute(sa.text('SELECT id FROM nodes'))]
    inbound_tags = [row[0] for row in connection.execute(sa.text('SELECT tag FROM inbounds'))]
    existing_assignments = {
        (row.node_id, row.inbound_tag)
        for row in connection.execute(
            sa.select(association.c.node_id, association.c.inbound_tag)
        )
    }
    assignments = [
        {'node_id': node_id, 'inbound_tag': inbound_tag}
        for node_id in node_ids
        for inbound_tag in inbound_tags
        if (node_id, inbound_tag) not in existing_assignments
    ]
    if assignments:
        op.bulk_insert(
            association,
            assignments,
        )


def downgrade() -> None:
    op.drop_table('node_inbounds_association')
