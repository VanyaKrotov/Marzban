import ipaddress
from collections.abc import Iterable

import grpc

from .base import XRayBase
from .exceptions import RelatedError, XrayError
from .proto.app.router import config_pb2 as router_config_pb2
from .proto.app.router.command import command_pb2, command_pb2_grpc
from .proto.common.net import network_pb2, port_pb2
from .types.message import Message

DOMAIN_TYPE_PLAIN = 0
DOMAIN_TYPE_REGEX = 1
DOMAIN_TYPE_DOMAIN = 2
DOMAIN_TYPE_FULL = 3


class UnsupportedRoutingRule(XrayError):
    def __init__(self, details: str):
        super().__init__(details)


class Routing(XRayBase):
    def add_routing_rule(
        self,
        config: dict,
        geo_resources: dict[str, bytes] | None = None,
        should_append: bool = True,
        timeout: int = None,
    ) -> bool:
        stub = command_pb2_grpc.RoutingServiceStub(self._channel)
        try:
            stub.AddRule(
                command_pb2.AddRuleRequest(
                    config=Message(_routing_rule_from_json(config, geo_resources)),
                    shouldAppend=should_append,
                ),
                timeout=timeout,
            )
            return True
        except grpc.RpcError as e:
            raise RelatedError(e)

    def remove_routing_rule(self, rule_tag: str, timeout: int = None) -> bool:
        stub = command_pb2_grpc.RoutingServiceStub(self._channel)
        try:
            stub.RemoveRule(
                command_pb2.RemoveRuleRequest(ruleTag=rule_tag),
                timeout=timeout,
            )
            return True
        except grpc.RpcError as e:
            raise RelatedError(e)

    @staticmethod
    def validate_routing_rule(
        config: dict,
        geo_resources: dict[str, bytes] | None = None,
    ) -> None:
        _routing_rule_from_json(config, geo_resources)


def collect_geo_resource_filenames(configs: Iterable[dict]) -> set[str]:
    filenames = set()
    for config in configs:
        for domain in _string_list(config.get("domain")):
            if domain.startswith("geosite:"):
                filenames.add("geosite.dat")
            elif domain.startswith("ext:"):
                filename, _ = _parse_ext_resource(domain)
                filenames.add(filename)

        for field in ("ip", "source"):
            for value in _string_list(config.get(field)):
                if value.startswith("geoip:"):
                    filenames.add("geoip.dat")
                elif value.startswith("ext:"):
                    filename, _ = _parse_ext_resource(value)
                    filenames.add(filename)
    return filenames


def _routing_rule_from_json(
    config: dict,
    geo_resources: dict[str, bytes] | None = None,
) -> router_config_pb2.RoutingRule:
    if config.get("attrs"):
        raise UnsupportedRoutingRule("attrs routing rules require config reload")

    rule = router_config_pb2.RoutingRule(
        rule_tag=str(config.get("ruleTag") or ""),
        domain_matcher=str(config.get("domainMatcher") or ""),
    )

    if outbound_tag := config.get("outboundTag"):
        rule.tag = str(outbound_tag)
    if balancer_tag := config.get("balancerTag"):
        rule.balancing_tag = str(balancer_tag)

    rule.inbound_tag.extend(_string_list(config.get("inboundTag")))
    rule.user_email.extend(_string_list(config.get("user")))
    rule.protocol.extend(_string_list(config.get("protocol")))

    geo_resources = geo_resources or {}

    for domain in _string_list(config.get("domain")):
        rule.domain.extend(_domain_rules(domain, geo_resources))

    for ip in _string_list(config.get("ip")):
        geoip, cidr = _ip_rule(ip, geo_resources)
        if geoip is not None:
            rule.geoip.append(geoip)
        else:
            rule.cidr.append(cidr)

    for source in _string_list(config.get("source")):
        geoip, cidr = _ip_rule(source, geo_resources)
        if geoip is not None:
            rule.source_geoip.append(geoip)
        else:
            rule.source_cidr.append(cidr)

    networks = _network_list(config.get("network"))
    if networks:
        rule.networks.extend(networks)

    if port := config.get("port"):
        rule.port_list.CopyFrom(_port_list(str(port)))

    if source_port := config.get("sourcePort"):
        rule.source_port_list.CopyFrom(_port_list(str(source_port)))

    return rule


def _string_list(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, Iterable):
        return [str(item) for item in value if item is not None]
    return [str(value)]


def _parse_ext_resource(value: str) -> tuple[str, str]:
    parts = value.split(":", 2)
    if len(parts) != 3 or not parts[1] or not parts[2]:
        raise UnsupportedRoutingRule(f"{value} ext routing rule is invalid")
    return parts[1], parts[2]


def _domain_rules(
    value: str,
    geo_resources: dict[str, bytes],
) -> list[router_config_pb2.Domain]:
    if value.startswith("geosite:"):
        return _geosite_domains("geosite.dat", value.split(":", 1)[1], geo_resources)
    if value.startswith("ext:"):
        filename, code = _parse_ext_resource(value)
        return _geosite_domains(filename, code, geo_resources)
    if value.startswith("dotless:"):
        raise UnsupportedRoutingRule("dotless routing rules require config reload")

    domain_type = DOMAIN_TYPE_PLAIN
    domain_value = value
    if ":" in value:
        prefix, suffix = value.split(":", 1)
        if prefix == "domain":
            domain_type = DOMAIN_TYPE_DOMAIN
            domain_value = suffix
        elif prefix == "full":
            domain_type = DOMAIN_TYPE_FULL
            domain_value = suffix
        elif prefix == "regexp":
            domain_type = DOMAIN_TYPE_REGEX
            domain_value = suffix
        elif prefix == "keyword":
            domain_value = suffix
        else:
            raise UnsupportedRoutingRule(
                f"{prefix} routing rules require config reload"
            )

    return [router_config_pb2.Domain(type=domain_type, value=domain_value)]


def _ip_rule(
    value: str,
    geo_resources: dict[str, bytes],
) -> tuple[router_config_pb2.GeoIP | None, router_config_pb2.CIDR | None]:
    if value.startswith("geoip:"):
        return _geoip_entry("geoip.dat", value.split(":", 1)[1], geo_resources), None
    if value.startswith("ext:"):
        filename, code = _parse_ext_resource(value)
        return _geoip_entry(filename, code, geo_resources), None

    try:
        network = ipaddress.ip_network(value, strict=False)
    except ValueError:
        raise UnsupportedRoutingRule(
            f"{value} IP routing rules require config reload"
        )
    return None, router_config_pb2.CIDR(
        ip=network.network_address.packed,
        prefix=network.prefixlen,
    )


def _geo_resource_content(
    filename: str,
    geo_resources: dict[str, bytes],
) -> bytes:
    try:
        return geo_resources[filename]
    except KeyError:
        raise UnsupportedRoutingRule(
            f"{filename} is not available on this node"
        )


def _geosite_domains(
    filename: str,
    code: str,
    geo_resources: dict[str, bytes],
) -> list[router_config_pb2.Domain]:
    geosite_list = router_config_pb2.GeoSiteList()
    geosite_list.ParseFromString(_geo_resource_content(filename, geo_resources))
    code = code.lower()
    for entry in geosite_list.entry:
        if entry.country_code.lower() == code:
            return list(entry.domain)
    raise UnsupportedRoutingRule(f"{code} not found in {filename}")


def _geoip_entry(
    filename: str,
    code: str,
    geo_resources: dict[str, bytes],
) -> router_config_pb2.GeoIP:
    geoip_list = router_config_pb2.GeoIPList()
    geoip_list.ParseFromString(_geo_resource_content(filename, geo_resources))
    code = code.lower()
    for entry in geoip_list.entry:
        if entry.country_code.lower() == code:
            geoip = router_config_pb2.GeoIP()
            geoip.CopyFrom(entry)
            return geoip
    raise UnsupportedRoutingRule(f"{code} not found in {filename}")


def _network_list(value) -> list[int]:
    mapping = {
        "tcp": network_pb2.TCP,
        "raw": network_pb2.RawTCP,
        "udp": network_pb2.UDP,
        "unix": network_pb2.UNIX,
    }
    networks = []
    for item in _string_list(value):
        for name in item.split(","):
            name = name.strip().lower()
            if not name:
                continue
            if name not in mapping:
                raise UnsupportedRoutingRule(
                    f"{name} network routing rules require config reload"
                )
            networks.append(mapping[name])
    return networks


def _port_list(value: str) -> port_pb2.PortList:
    ports = port_pb2.PortList()
    for item in value.split(","):
        item = item.strip()
        if not item:
            continue
        if "-" in item:
            start, end = item.split("-", 1)
        else:
            start = end = item
        try:
            ports.range.append(
                port_pb2.PortRange(From=int(start), To=int(end))
            )
        except ValueError:
            raise UnsupportedRoutingRule(
                f"{item} port routing rules require config reload"
            )
    return ports
