from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.models.nodes import Node
from app.db.models.proxies import ProxyInbound
from app.services import system_service


class InboundFilteringTests(TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

        node = Node(name="Node A", address="127.0.0.1", port=62050, api_port=62051)
        self.assigned = ProxyInbound(tag="assigned", content={"tag": "assigned"}, nodes=[node])
        self.unassigned = ProxyInbound(tag="unassigned", content={"tag": "unassigned"})
        self.db.add_all([self.assigned, self.unassigned])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def get_inbounds(self, **kwargs):
        registry = SimpleNamespace(
            inbounds_by_protocol={
                "vless": [
                    {"tag": "assigned", "protocol": "vless", "network": "tcp", "tls": "tls"},
                    {"tag": "unassigned", "protocol": "vless", "network": "tcp", "tls": "tls"},
                ]
            }
        )
        with patch.object(system_service, "get_enabled_inbound_registry", return_value=registry):
            return system_service.get_inbounds(db=self.db, admin=None, **kwargs)

    def test_default_response_keeps_unassigned_inbounds(self):
        response = self.get_inbounds()

        self.assertEqual([inbound["tag"] for inbound in response["vless"]], ["assigned", "unassigned"])

    def test_assigned_only_response_excludes_unassigned_inbounds(self):
        response = self.get_inbounds(assigned_only=True)

        self.assertEqual([inbound["tag"] for inbound in response["vless"]], ["assigned"])
        self.assertEqual(response["vless"][0]["nodes"], [{"id": 1, "name": "Node A"}])

    def test_include_tag_keeps_current_unassigned_inbound_in_edit_form(self):
        response = self.get_inbounds(assigned_only=True, include_tag="unassigned")

        self.assertEqual([inbound["tag"] for inbound in response["vless"]], ["assigned", "unassigned"])

