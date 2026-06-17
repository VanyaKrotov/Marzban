"""add socks proxy type

Revision ID: b4d6a8e1c9f2
Revises: 9a3b7c1d2e4f
Create Date: 2026-06-17 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "b4d6a8e1c9f2"
down_revision = "9a3b7c1d2e4f"
branch_labels = None
depends_on = None


enum_name = "proxytypes"
temp_enum_name = f"temp_{enum_name}"
old_values = ("VMess", "VLESS", "Trojan", "Shadowsocks", "Hysteria")
new_values = (*old_values, "Socks")
old_type = sa.Enum(*old_values, name=enum_name)
new_type = sa.Enum(*new_values, name=enum_name)
temp_type = sa.Enum(*new_values, name=temp_enum_name)

table_name = "proxies"
column_name = "type"

proxies_table = sa.table(
    table_name,
    sa.column("id", sa.Integer),
    sa.column(column_name, new_type),
)
excluded_inbounds_table = sa.table(
    "exclude_inbounds_association",
    sa.column("proxy_id", sa.Integer),
)


def _alter_enum(existing_type, target_type, target_name):
    with op.batch_alter_table(table_name) as batch_op:
        batch_op.alter_column(
            column_name,
            existing_type=existing_type,
            type_=target_type,
            existing_nullable=False,
            postgresql_using=f"{column_name}::text::{target_name}",
        )


def upgrade() -> None:
    temp_type.create(op.get_bind(), checkfirst=False)
    _alter_enum(old_type, temp_type, temp_enum_name)
    old_type.drop(op.get_bind(), checkfirst=False)
    new_type.create(op.get_bind(), checkfirst=False)
    _alter_enum(temp_type, new_type, enum_name)
    temp_type.drop(op.get_bind(), checkfirst=False)


def downgrade() -> None:
    connection = op.get_bind()
    socks_proxy_ids = [
        row[0]
        for row in connection.execute(
            sa.select(proxies_table.c.id).where(proxies_table.c.type == "Socks")
        )
    ]
    if socks_proxy_ids:
        connection.execute(
            excluded_inbounds_table.delete().where(
                excluded_inbounds_table.c.proxy_id.in_(socks_proxy_ids)
            )
        )
        connection.execute(
            proxies_table.delete().where(proxies_table.c.id.in_(socks_proxy_ids))
        )

    temp_type.create(op.get_bind(), checkfirst=False)
    _alter_enum(new_type, temp_type, temp_enum_name)
    new_type.drop(op.get_bind(), checkfirst=False)
    old_type.create(op.get_bind(), checkfirst=False)
    _alter_enum(temp_type, old_type, enum_name)
    temp_type.drop(op.get_bind(), checkfirst=False)
