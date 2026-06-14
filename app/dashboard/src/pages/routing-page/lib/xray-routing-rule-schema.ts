import type { MonacoJsonSchema } from "@/components/MonacoJsonEditor";

const stringArray = (
  description: string,
  values?: string[],
  examples?: string[],
): MonacoJsonSchema => ({
  type: "array",
  uniqueItems: true,
  description,
  items: {
    type: "string",
    ...(values?.length ? { enum: values } : {}),
    examples,
  },
});

export function createXrayRoutingRuleSchema(
  inboundTags: string[],
  outboundTags: string[],
): MonacoJsonSchema {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Xray routing rule",
    description: "A single Xray-core routing rule.",
    type: "object",
    required: ["type"],
    additionalProperties: true,
    properties: {
      type: {
        type: "string",
        enum: ["field", "balancer"],
        default: "field",
        description: "Routing rule type.",
      },
      domain: stringArray(
        "Domain names and geosite expressions matched by the rule.",
        undefined,
        ["geosite:category-ads-all", "domain:example.com"],
      ),
      ip: stringArray(
        "IP addresses, CIDR ranges, and geoip expressions.",
        undefined,
        ["geoip:private", "10.0.0.0/8"],
      ),
      port: {
        type: "string",
        description: "Destination ports or ranges.",
        examples: ["53,80,443", "1000-2000"],
      },
      sourcePort: {
        type: "string",
        description: "Source ports or ranges.",
      },
      network: {
        type: "string",
        enum: ["tcp", "udp", "tcp,udp"],
        description: "Network protocols matched by the rule.",
      },
      source: stringArray("Source IP addresses or CIDR ranges."),
      user: stringArray("User emails matched by the rule."),
      inboundTag: stringArray("Inbound tags matched by the rule.", inboundTags),
      protocol: stringArray("Detected protocols matched by the rule.", [
        "http",
        "tls",
        "quic",
        "bittorrent",
        "fakedns",
      ]),
      attrs: {
        type: "string",
        description: "Attribute expression evaluated by Xray.",
      },
      outboundTag: {
        type: "string",
        ...(outboundTags.length ? { enum: outboundTags } : {}),
        description: "Outbound selected when the rule matches.",
      },
      balancerTag: {
        type: "string",
        description: "Balancer selected when the rule matches.",
      },
    },
    anyOf: [{ required: ["outboundTag"] }, { required: ["balancerTag"] }],
  };
}
