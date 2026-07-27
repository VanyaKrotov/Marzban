from unittest import TestCase
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.crud import routing as routing_crud
from app.db.models.nodes import Node
from app.db.models.proxies import ProxyInbound, ProxyOutbound
from app.db.models.routing import RoutingRule
from app.services import routing_service, system_service
from app.xray.config import _merge_managed_configs


def config_payload(prefix: str, *, updated: bool = False) -> dict:
    suffix = "updated" if updated else "initial"
    return {
        "inbounds": [
            {
                "tag": f"{prefix}-inbound",
                "protocol": "vless",
                "port": 443 if updated else 8443,
            }
        ],
        "outbounds": [
            {
                "tag": f"{prefix}-outbound",
                "protocol": "freedom",
                "sendThrough": suffix,
            }
        ],
        "routing": {
            "rules": [
                {
                    "ruleTag": f"{prefix}-rule",
                    "type": "field",
                    "outboundTag": f"{prefix}-outbound",
                    "domain": [f"full:{suffix}.example"],
                }
            ]
        },
    }


class NodeConfigSyncTests(TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.first = Node(
            name="first",
            address="127.0.0.1",
            port=62050,
            api_port=62051,
        )
        self.second = Node(
            name="second",
            address="127.0.0.2",
            port=62050,
            api_port=62051,
        )
        self.db.add_all([self.first, self.second])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_syncs_template_entities_only_to_the_current_node(self):
        routing_crud.sync_readonly_node_config(self.db, self.first, config_payload("first"))
        routing_crud.sync_readonly_node_config(self.db, self.second, config_payload("second"))

        self.assertEqual(
            [
                item.tag
                for item in system_service.get_inbound_configs(
                    node_id=None,
                    db=self.db,
                    admin=None,
                )
            ],
            ["first-inbound", "second-inbound"],
        )
        self.assertEqual(
            [
                item.tag
                for item in system_service.get_inbound_configs(
                    node_id=self.first.id,
                    db=self.db,
                    admin=None,
                )
            ],
            ["first-inbound"],
        )
        self.assertEqual(
            [
                item.tag
                for item in system_service.get_outbound_configs(
                    node_id=self.second.id,
                    db=self.db,
                    admin=None,
                )
            ],
            ["second-outbound"],
        )
        self.assertEqual(
            [
                item.name
                for item in routing_service.get_routing_rules(
                    node_id=self.first.id,
                    db=self.db,
                    _=None,
                )
            ],
            ["first-rule"],
        )

        runtime_payload = {"inbounds": [], "outbounds": [], "routing": {}}
        with patch("app.xray.config.engine", self.engine):
            _merge_managed_configs(runtime_payload, node_id=self.first.id)
        self.assertEqual(
            [inbound["tag"] for inbound in runtime_payload["inbounds"]],
            ["first-inbound"],
        )
        self.assertEqual(
            [outbound["tag"] for outbound in runtime_payload["outbounds"]],
            ["first-outbound"],
        )
        self.assertEqual(
            [rule["ruleTag"] for rule in runtime_payload["routing"]["rules"]],
            ["first-rule"],
        )

        routing_crud.sync_readonly_node_config(
            self.db,
            self.first,
            config_payload("first", updated=True),
        )
        first_inbound = self.db.query(ProxyInbound).filter_by(tag="first-inbound").one()
        first_outbound = self.db.query(ProxyOutbound).filter_by(tag="first-outbound").one()
        first_rule = self.db.query(RoutingRule).filter_by(name="first-rule").one()
        self.assertEqual(first_inbound.content["port"], 443)
        self.assertEqual(first_outbound.content["sendThrough"], "updated")
        self.assertEqual(first_rule.content["domain"], ["full:updated.example"])

        routing_crud.sync_readonly_node_config(
            self.db,
            self.first,
            {"inbounds": [], "outbounds": [], "routing": {"rules": []}},
        )
        self.assertEqual(
            [
                item.tag
                for item in system_service.get_inbound_configs(
                    node_id=None,
                    db=self.db,
                    admin=None,
                )
            ],
            ["second-inbound"],
        )
        self.assertEqual(
            [
                item.tag
                for item in system_service.get_outbound_configs(
                    node_id=None,
                    db=self.db,
                    admin=None,
                )
            ],
            ["second-outbound"],
        )
        self.assertEqual(
            [
                item.name
                for item in routing_service.get_routing_rules(
                    node_id=None,
                    db=self.db,
                    _=None,
                )
            ],
            ["second-rule"],
        )

    def test_keeps_shared_readonly_entities_until_the_last_node_detaches(self):
        payload = config_payload("shared")
        routing_crud.sync_readonly_node_config(self.db, self.first, payload)
        routing_crud.sync_readonly_node_config(self.db, self.second, payload)

        routing_crud.sync_readonly_node_config(
            self.db,
            self.first,
            {"inbounds": [], "outbounds": [], "routing": {"rules": []}},
        )

        inbound = self.db.query(ProxyInbound).filter_by(tag="shared-inbound").one()
        outbound = self.db.query(ProxyOutbound).filter_by(tag="shared-outbound").one()
        rule = self.db.query(RoutingRule).filter_by(name="shared-rule").one()
        self.assertEqual([node.id for node in inbound.nodes], [self.second.id])
        self.assertEqual([node.id for node in outbound.nodes], [self.second.id])
        self.assertEqual([node.id for node in rule.nodes], [self.second.id])

    def test_rejects_conflicting_content_for_a_globally_unique_tag(self):
        routing_crud.sync_readonly_node_config(self.db, self.first, config_payload("shared"))
        conflicting = config_payload("shared", updated=True)

        with self.assertRaisesRegex(ValueError, "used by another node"):
            routing_crud.sync_readonly_node_config(self.db, self.second, conflicting)
