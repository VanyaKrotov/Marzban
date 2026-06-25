from unittest import TestCase

from sqlalchemy import create_engine, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app.db import crud
from app.db.base import Base
from app.db.models import ProxyInbound, host_group_hosts_association
from app.models.proxy import HostGroupCreate, HostGroupModify, ProxyHostCreate, ProxyHostV2


class HostGroupTests(TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()
        self.db.add_all([
            ProxyInbound(tag="VLESS TCP", content={"tag": "VLESS TCP"}),
            ProxyInbound(tag="VLESS WS", content={"tag": "VLESS WS"}),
        ])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def create_group(self, group_id="eu", name="Europe"):
        return crud.create_host_group(
            self.db,
            HostGroupCreate(id=group_id, name=name, description=None, tags=["premium"]),
        )

    def create_host(self, remark="Germany", group_ids=None):
        return crud.create_host_v2(
            self.db,
            ProxyHostCreate(
                inbound_tag="VLESS TCP",
                remark=remark,
                address="example.com",
                group_ids=group_ids or [],
            ),
        )

    def association_count(self):
        return self.db.query(func.count()).select_from(host_group_hosts_association).scalar()

    def test_create_update_delete_host_group(self):
        group = self.create_group()
        self.assertEqual(group.id, "eu")
        self.assertEqual(group.tags, ["premium"])

        updated = crud.update_host_group(
            self.db,
            group,
            HostGroupModify(name="Europe Premium", description="EU pool", tags=["eu"]),
        )
        self.assertEqual(updated.name, "Europe Premium")
        self.assertEqual(updated.description, "EU pool")
        self.assertEqual(updated.tags, ["eu"])

        crud.delete_host_group(self.db, updated)
        self.assertIsNone(crud.get_host_group(self.db, "eu"))

    def test_duplicate_group_id_raises_integrity_error(self):
        self.create_group()
        with self.assertRaises(IntegrityError):
            self.create_group(name="Duplicate")
        self.db.rollback()

    def test_host_round_trip_includes_groups_and_filters_by_group(self):
        self.create_group("eu", "Europe")
        self.create_group("us", "United States")
        host = self.create_host(group_ids=["eu"])
        self.create_host("Chicago", group_ids=["us"])

        response = ProxyHostV2.model_validate(host)
        self.assertEqual([group.id for group in response.groups], ["eu"])
        self.assertEqual([row.id for row in crud.get_hosts_v2(self.db, group_id="eu")], [host.id])
        self.assertEqual([row.id for row in crud.get_hosts(self.db, "VLESS TCP", group_id="eu")], [host.id])

    def test_attach_detach_and_missing_group(self):
        host = self.create_host()
        self.create_group("eu", "Europe")
        self.create_group("us", "United States")

        attached = crud.attach_host_groups(self.db, host, ["eu", "us"])
        self.assertEqual([group.id for group in attached.groups], ["eu", "us"])

        detached = crud.detach_host_groups(self.db, attached, ["eu"])
        self.assertEqual([group.id for group in detached.groups], ["us"])

        with self.assertRaises(ValueError):
            crud.attach_host_groups(self.db, detached, ["missing"])

    def test_delete_group_or_host_cleans_associations(self):
        group = self.create_group()
        host = self.create_host(group_ids=[group.id])
        self.assertEqual(self.association_count(), 1)

        crud.delete_host_group(self.db, group)
        self.assertEqual(self.association_count(), 0)

        group = self.create_group()
        host = crud.set_host_groups(self.db, host, [group.id])
        self.assertEqual(self.association_count(), 1)

        crud.remove_host_v2(self.db, host)
        self.assertEqual(self.association_count(), 0)
