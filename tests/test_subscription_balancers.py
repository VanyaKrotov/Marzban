import json
from unittest import TestCase

from sqlalchemy import create_engine, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.crud import proxy_hosts as host_crud
from app.db.crud import subscription_balancers as balancer_crud
from app.db.models.associations import subscription_balancer_hosts_association
from app.db.models.proxies import ProxyInbound
from app.models.proxy import ProxyHostCreate
from app.models.settings import (
    SubscriptionBalancerCreate,
    SubscriptionBalancerModify,
    SubscriptionBalancerResponse,
)
from app.subscription.v2ray import V2rayJsonConfig


class SubscriptionBalancerTests(TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()
        self.db.add(ProxyInbound(tag="VLESS TCP", content={"tag": "VLESS TCP"}))
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def create_host(self, remark):
        return host_crud.create_host_v2(
            self.db,
            ProxyHostCreate(
                inbound_tag="VLESS TCP",
                remark=remark,
                address=f"{remark.lower()}.example.com",
            ),
        )

    def test_create_update_and_delete_balancer(self):
        first_host = self.create_host("First")
        second_host = self.create_host("Second")
        balancer = balancer_crud.create_subscription_balancer(
            self.db,
            SubscriptionBalancerCreate(
                name="Automatic",
                strategy="least_ping",
                probe_url="https://www.gstatic.com/generate_204",
                probe_interval=300,
                host_ids=[second_host.id, first_host.id],
            ),
        )
        self.assertEqual(set(balancer.host_ids), {second_host.id, first_host.id})
        self.assertEqual(
            set(SubscriptionBalancerResponse.model_validate(balancer).host_ids),
            {second_host.id, first_host.id},
        )

        updated = balancer_crud.update_subscription_balancer(
            self.db,
            balancer,
            SubscriptionBalancerModify(
                name="Automatic",
                enabled=False,
                strategy="round_robin",
                probe_url="https://cp.cloudflare.com",
                probe_interval=600,
                host_ids=[first_host.id],
            ),
        )
        self.assertFalse(updated.enabled)
        self.assertEqual(updated.strategy, "round_robin")
        self.assertEqual(updated.host_ids, [first_host.id])

        balancer_crud.delete_subscription_balancer(self.db, updated)
        self.assertEqual(balancer_crud.get_subscription_balancers(self.db), [])

    def test_rejects_missing_hosts_and_duplicate_names(self):
        host = self.create_host("First")
        with self.assertRaises(ValueError):
            balancer_crud.create_subscription_balancer(
                self.db,
                SubscriptionBalancerCreate(
                    name="Automatic",
                    probe_url="https://www.gstatic.com/generate_204",
                    host_ids=[999],
                ),
            )

        payload = SubscriptionBalancerCreate(
            name="Automatic",
            probe_url="https://www.gstatic.com/generate_204",
            host_ids=[host.id],
        )
        balancer_crud.create_subscription_balancer(self.db, payload)
        with self.assertRaises(IntegrityError):
            balancer_crud.create_subscription_balancer(self.db, payload)
        self.db.rollback()

    def test_host_associations_are_removed_with_balancer(self):
        host = self.create_host("First")
        balancer = balancer_crud.create_subscription_balancer(
            self.db,
            SubscriptionBalancerCreate(
                name="Automatic",
                probe_url="https://www.gstatic.com/generate_204",
                host_ids=[host.id],
            ),
        )
        self.assertEqual(
            self.db.query(func.count()).select_from(subscription_balancer_hosts_association).scalar(),
            1,
        )
        balancer_crud.delete_subscription_balancer(self.db, balancer)
        self.assertEqual(
            self.db.query(func.count()).select_from(subscription_balancer_hosts_association).scalar(),
            0,
        )

    def test_host_associations_are_removed_with_host(self):
        host = self.create_host("First")
        balancer_crud.create_subscription_balancer(
            self.db,
            SubscriptionBalancerCreate(
                name="Automatic",
                probe_url="https://www.gstatic.com/generate_204",
                host_ids=[host.id],
            ),
        )

        self.db.delete(host)
        self.db.commit()

        self.assertEqual(
            self.db.query(func.count()).select_from(subscription_balancer_hosts_association).scalar(),
            0,
        )

    def test_reorders_balancers(self):
        first = balancer_crud.create_subscription_balancer(
            self.db,
            SubscriptionBalancerCreate(
                name="First",
                probe_url="https://www.gstatic.com/generate_204",
            ),
        )
        second = balancer_crud.create_subscription_balancer(
            self.db,
            SubscriptionBalancerCreate(
                name="Second",
                probe_url="https://www.gstatic.com/generate_204",
            ),
        )

        reordered = balancer_crud.reorder_subscription_balancers(
            self.db, [second.id, first.id]
        )

        self.assertEqual([balancer.id for balancer in reordered], [second.id, first.id])
        with self.assertRaises(ValueError):
            balancer_crud.reorder_subscription_balancers(self.db, [first.id])

    def test_v2ray_balancer_rule_matches_tcp_and_udp(self):
        config = str.__new__(V2rayJsonConfig, "")
        config.template = json.dumps({"outbounds": [], "routing": {"rules": []}})
        config.balancer_configs = []
        config.add = lambda **kwargs: [{"tag": kwargs["outbound_tag"]}]

        added = config.add_balancer_config(
            balancer_id=1,
            name="Automatic",
            strategy="least_ping",
            probe_url="https://www.gstatic.com/generate_204",
            probe_interval=300,
            endpoints=[
                {
                    "host_id": 1,
                    "remark": "First",
                    "address": "first.example.com",
                    "inbound": {},
                    "settings": {},
                }
            ],
        )

        self.assertTrue(added)
        rule = config.balancer_configs[0]["routing"]["rules"][-1]
        self.assertEqual(rule["network"], "tcp,udp")
        self.assertEqual(rule["balancerTag"], "mb-balancer-1")
