"""hosts v2 position inbound id

Revision ID: 9a3b7c1d2e4f
Revises: 8b12d4f6a901
Create Date: 2026-06-17 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "9a3b7c1d2e4f"
down_revision = "8b12d4f6a901"
branch_labels = None
depends_on = None


hosts_table = sa.table(
    "hosts",
    sa.column("id", sa.Integer),
    sa.column("inbound_tag", sa.String(256)),
    sa.column("inbound_id", sa.Integer),
    sa.column("position", sa.Integer),
)
inbounds_table = sa.table(
    "inbounds",
    sa.column("id", sa.Integer),
    sa.column("tag", sa.String(256)),
)


def _find_fk_name(table_name: str, constrained_columns: list[str]) -> str | None:
    inspector = sa.inspect(op.get_bind())
    for foreign_key in inspector.get_foreign_keys(table_name):
        if foreign_key.get("constrained_columns") == constrained_columns:
            return foreign_key.get("name")
    return None


def _drop_fk_if_named(table_name: str, constrained_columns: list[str]) -> None:
    name = _find_fk_name(table_name, constrained_columns)
    if not name:
        return
    with op.batch_alter_table(table_name) as batch_op:
        batch_op.drop_constraint(name, type_="foreignkey")


def upgrade() -> None:
    connection = op.get_bind()

    with op.batch_alter_table("hosts") as batch_op:
        batch_op.add_column(sa.Column("inbound_id", sa.Integer(), nullable=True))
        batch_op.add_column(
            sa.Column("position", sa.Integer(), nullable=False, server_default="0")
        )

    connection.execute(
        hosts_table.update().values(
            inbound_id=sa.select(inbounds_table.c.id)
            .where(inbounds_table.c.tag == hosts_table.c.inbound_tag)
            .scalar_subquery()
        )
    )

    host_ids = [
        row[0]
        for row in connection.execute(
            sa.select(hosts_table.c.id).order_by(
                hosts_table.c.inbound_tag,
                hosts_table.c.id,
            )
        )
    ]
    for position, host_id in enumerate(host_ids):
        connection.execute(
            hosts_table.update()
            .where(hosts_table.c.id == host_id)
            .values(position=position)
        )

    connection.execute(hosts_table.delete().where(hosts_table.c.inbound_id.is_(None)))

    _drop_fk_if_named("hosts", ["inbound_tag"])

    with op.batch_alter_table("hosts") as batch_op:
        batch_op.alter_column(
            "inbound_id",
            existing_type=sa.Integer(),
            existing_nullable=True,
            nullable=False,
        )
        batch_op.create_foreign_key(
            "fk_hosts_inbound_id_inbounds",
            "inbounds",
            ["inbound_id"],
            ["id"],
        )
        batch_op.drop_column("inbound_tag")

    op.create_index(op.f("ix_hosts_position"), "hosts", ["position"], unique=False)


def downgrade() -> None:
    connection = op.get_bind()

    op.drop_index(op.f("ix_hosts_position"), table_name="hosts")

    with op.batch_alter_table("hosts") as batch_op:
        batch_op.add_column(sa.Column("inbound_tag", sa.String(256), nullable=True))

    connection.execute(
        hosts_table.update().values(
            inbound_tag=sa.select(inbounds_table.c.tag)
            .where(inbounds_table.c.id == hosts_table.c.inbound_id)
            .scalar_subquery()
        )
    )

    connection.execute(hosts_table.delete().where(hosts_table.c.inbound_tag.is_(None)))

    _drop_fk_if_named("hosts", ["inbound_id"])

    with op.batch_alter_table("hosts") as batch_op:
        batch_op.alter_column(
            "inbound_tag",
            existing_type=sa.String(length=256),
            existing_nullable=True,
            nullable=False,
        )
        batch_op.create_foreign_key(
            "fk_hosts_inbound_tag_inbounds",
            "inbounds",
            ["inbound_tag"],
            ["tag"],
        )
        batch_op.drop_column("inbound_id")
        batch_op.drop_column("position")
