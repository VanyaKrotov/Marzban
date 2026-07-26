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

const domainSchemeExamples = [
  "domain:example.com",
  "geosite:category-ads-all",
  "keyword:google",
  "full:www.example.com",
  "dotless:local",
  "regexp:^.*\\.example\\.com$",
];

const domainArray = (geoResourceFilenames: string[]): MonacoJsonSchema => {
  const extSuggestions = geoResourceFilenames.map(
    (filename) => `ext:${filename}:`,
  );

  return {
    type: "array",
    uniqueItems: true,
    description:
      "Domain names and Xray domain match expressions. Supports domain, geosite, keyword, full, dotless, regexp, and ext schemes.",
    items: {
      type: "string",
      anyOf: [
        ...(extSuggestions.length ? [{ enum: extSuggestions }] : []),
        { type: "string" },
      ],
      examples: [...domainSchemeExamples, ...extSuggestions],
    },
  };
};

const ipArray = (geoResourceFilenames: string[]): MonacoJsonSchema => {
  const extSuggestions = geoResourceFilenames.map(
    (filename) => `ext:${filename}:`,
  );

  return {
    type: "array",
    uniqueItems: true,
    description:
      "IP addresses, CIDR ranges, geoip expressions, and Xray ext resource expressions.",
    items: {
      type: "string",
      anyOf: [
        ...(extSuggestions.length ? [{ enum: extSuggestions }] : []),
        { type: "string" },
      ],
      examples: ["geoip:private", "10.0.0.0/8", ...extSuggestions],
    },
  };
};

export function createXrayRoutingRuleSchema(
  inboundTags: string[],
  outboundTags: string[],
  geoResourceFilenames: string[] = [],
): MonacoJsonSchema {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Xray routing rule",
    description: "A single Xray-core routing rule.",
    type: "object",
    required: ["ruleTag", "type"],
    additionalProperties: true,
    properties: {
      ruleTag: {
        type: "string",
        minLength: 1,
        maxLength: 128,
        description: "Unique routing rule tag used as the rule name.",
      },
      type: {
        type: "string",
        enum: ["field", "balancer"],
        default: "field",
        description: "Routing rule type.",
      },
      domain: domainArray(geoResourceFilenames),
      ip: ipArray(geoResourceFilenames),
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
