import type { MonacoJsonSchema } from "@/components/MonacoJsonEditor";
import { xrayInboundSchema } from "@/lib/xray-schemas/inbound";
import { xrayOutboundSchema } from "@/lib/xray-schemas/outbound";

const stringList = (
  description: string,
  examples?: string[],
): MonacoJsonSchema => ({
  type: "array",
  description,
  items: {
    type: "string",
    examples,
  },
});

const routingRuleSchema: MonacoJsonSchema = {
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
    domain: stringList("Domain names and geosite expressions matched by the rule.", [
      "geosite:category-ads-all",
      "domain:example.com",
    ]),
    ip: stringList("IP addresses, CIDR ranges, and geoip expressions.", [
      "geoip:private",
      "10.0.0.0/8",
    ]),
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
    source: stringList("Source IP addresses or CIDR ranges."),
    user: stringList("User emails matched by the rule."),
    inboundTag: stringList("Inbound tags matched by the rule."),
    protocol: stringList("Detected protocols matched by the rule.", [
      "http",
      "tls",
      "bittorrent",
    ]),
    attrs: {
      type: "string",
      description: "Attribute expression evaluated by Xray.",
    },
    outboundTag: {
      type: "string",
      description: "Outbound selected when the rule matches.",
    },
    balancerTag: {
      type: "string",
      description: "Balancer selected when the rule matches.",
    },
  },
};

const dnsServerSchema: MonacoJsonSchema = {
  anyOf: [
    {
      type: "string",
      description: "DNS server address or a built-in DNS mode.",
      examples: ["1.1.1.1", "https://1.1.1.1/dns-query", "localhost"],
    },
    {
      type: "object",
      required: ["address"],
      additionalProperties: true,
      properties: {
        address: {
          type: "string",
          description: "DNS server address.",
        },
        port: {
          type: "integer",
          minimum: 1,
          maximum: 65535,
          description: "DNS server port.",
        },
        domains: stringList("Domains resolved through this server."),
        expectIPs: stringList("Expected IP ranges returned by this server."),
        skipFallback: {
          type: "boolean",
          description: "Excludes this server from fallback queries.",
        },
        queryStrategy: {
          type: "string",
          enum: ["UseIP", "UseIPv4", "UseIPv6"],
          description: "IP family used for DNS queries.",
        },
        tag: {
          type: "string",
          description: "Optional DNS server tag.",
        },
      },
    },
  ],
};

const xrayCoreInboundSchema: MonacoJsonSchema = {
  ...xrayInboundSchema,
  description: "Xray-core inbound listener.",
  properties: {
    ...xrayInboundSchema.properties,
    protocol: {
      type: "string",
      enum: [
        "dokodemo-door",
        "http",
        "shadowsocks",
        "socks",
        "trojan",
        "vless",
        "vmess",
        "wireguard",
      ],
      description: "Inbound protocol implemented by Xray-core.",
    },
  },
};

export const xrayCoreSchema: MonacoJsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Xray-core configuration",
  description:
    "Complete Xray-core configuration used by Marzban as the base configuration.",
  type: "object",
  additionalProperties: true,
  properties: {
    log: {
      type: "object",
      description: "Xray logging configuration.",
      additionalProperties: true,
      properties: {
        access: {
          type: "string",
          description: "Access log file path. Empty writes to standard output.",
        },
        error: {
          type: "string",
          description: "Error log file path. Empty writes to standard output.",
        },
        loglevel: {
          type: "string",
          enum: ["debug", "info", "warning", "error", "none"],
          default: "warning",
          description: "Minimum error log level.",
        },
        dnsLog: {
          type: "boolean",
          description: "Enables DNS query logging.",
        },
        maskAddress: {
          type: "string",
          enum: ["quarter", "half", "full"],
          description: "Masks client addresses in logs.",
        },
      },
    },
    api: {
      type: "object",
      description: "Xray gRPC API configuration.",
      additionalProperties: true,
      properties: {
        tag: {
          type: "string",
          description: "Inbound tag used by the Xray API.",
        },
        listen: {
          type: "string",
          description: "API listen address.",
        },
        services: {
          type: "array",
          uniqueItems: true,
          items: {
            type: "string",
            enum: [
              "HandlerService",
              "LoggerService",
              "RoutingService",
              "StatsService",
              "ObservatoryService",
            ],
          },
          description: "Enabled Xray API services.",
        },
      },
    },
    dns: {
      type: "object",
      description: "Built-in DNS client configuration.",
      additionalProperties: true,
      properties: {
        hosts: {
          type: "object",
          description: "Static domain-to-address mappings.",
          additionalProperties: {
            anyOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } },
            ],
          },
        },
        servers: {
          type: "array",
          description: "Ordered DNS server list.",
          items: dnsServerSchema,
        },
        clientIp: {
          type: "string",
          description: "Client IP used for EDNS Client Subnet.",
        },
        queryStrategy: {
          type: "string",
          enum: ["UseIP", "UseIPv4", "UseIPv6"],
          description: "Default IP family used for DNS queries.",
        },
        disableCache: {
          type: "boolean",
          description: "Disables the built-in DNS cache.",
        },
        disableFallback: {
          type: "boolean",
          description: "Disables fallback DNS queries.",
        },
        disableFallbackIfMatch: {
          type: "boolean",
          description: "Disables fallback when a domain rule matches.",
        },
        tag: {
          type: "string",
          description: "Outbound tag used by DNS traffic.",
        },
      },
    },
    routing: {
      type: "object",
      description: "Traffic routing configuration.",
      additionalProperties: true,
      properties: {
        domainStrategy: {
          type: "string",
          enum: ["AsIs", "IPIfNonMatch", "IPOnDemand"],
          default: "AsIs",
          description: "Controls when domains are resolved for routing.",
        },
        domainMatcher: {
          type: "string",
          enum: ["linear", "mph", "hybrid"],
          description: "Domain matching implementation.",
        },
        rules: {
          type: "array",
          description: "Routing rules evaluated from top to bottom.",
          items: routingRuleSchema,
        },
        balancers: {
          type: "array",
          description: "Outbound load balancers.",
          items: {
            type: "object",
            required: ["tag", "selector"],
            additionalProperties: true,
            properties: {
              tag: { type: "string", description: "Unique balancer tag." },
              selector: stringList("Outbound tag prefixes included in the balancer."),
              fallbackTag: {
                type: "string",
                description: "Outbound used when no selector is available.",
              },
              strategy: {
                type: "object",
                required: ["type"],
                additionalProperties: true,
                properties: {
                  type: {
                    type: "string",
                    enum: [
                      "random",
                      "roundRobin",
                      "leastPing",
                      "leastLoad",
                    ],
                    description: "Balancer selection strategy.",
                  },
                },
              },
            },
          },
        },
      },
    },
    inbounds: {
      type: "array",
      description: "Inbound listeners. Supported managed protocols are synchronized with Marzban.",
      items: xrayCoreInboundSchema,
    },
    outbounds: {
      type: "array",
      description: "Outbound connection definitions.",
      items: xrayOutboundSchema,
    },
    policy: {
      type: "object",
      description: "User-level and system-level statistics policy.",
      additionalProperties: true,
      properties: {
        levels: {
          type: "object",
          description: "Policies keyed by user level.",
          additionalProperties: {
            type: "object",
            additionalProperties: true,
            properties: {
              handshake: { type: "integer", minimum: 0 },
              connIdle: { type: "integer", minimum: 0 },
              uplinkOnly: { type: "integer", minimum: 0 },
              downlinkOnly: { type: "integer", minimum: 0 },
              statsUserUplink: { type: "boolean" },
              statsUserDownlink: { type: "boolean" },
              bufferSize: { type: "integer" },
            },
          },
        },
        system: {
          type: "object",
          additionalProperties: true,
          properties: {
            statsInboundUplink: { type: "boolean" },
            statsInboundDownlink: { type: "boolean" },
            statsOutboundUplink: { type: "boolean" },
            statsOutboundDownlink: { type: "boolean" },
          },
        },
      },
    },
    stats: {
      type: "object",
      description: "Enables Xray statistics collection.",
      additionalProperties: true,
    },
    metrics: {
      type: "object",
      description: "Prometheus-compatible metrics endpoint.",
      additionalProperties: true,
      properties: {
        tag: { type: "string", description: "Metrics outbound tag." },
        listen: {
          type: "string",
          description: "Metrics listen address in host:port format.",
        },
      },
    },
    reverse: {
      type: "object",
      description: "Reverse proxy bridge and portal configuration.",
      additionalProperties: true,
      properties: {
        bridges: {
          type: "array",
          items: {
            type: "object",
            required: ["tag", "domain"],
            properties: {
              tag: { type: "string" },
              domain: { type: "string" },
            },
          },
        },
        portals: {
          type: "array",
          items: {
            type: "object",
            required: ["tag", "domain"],
            properties: {
              tag: { type: "string" },
              domain: { type: "string" },
            },
          },
        },
      },
    },
    observatory: {
      type: "object",
      description: "Outbound connectivity probing configuration.",
      additionalProperties: true,
      properties: {
        subjectSelector: stringList("Outbound tag prefixes to probe."),
        probeUrl: {
          type: "string",
          format: "uri",
          description: "URL used for connectivity probes.",
        },
        probeInterval: {
          type: "string",
          description: "Probe interval as an Xray duration.",
          examples: ["10s"],
        },
        enableConcurrency: { type: "boolean" },
      },
    },
    burstObservatory: {
      type: "object",
      description: "Burst outbound probing configuration.",
      additionalProperties: true,
      properties: {
        subjectSelector: stringList("Outbound tag prefixes to probe."),
        pingConfig: {
          type: "object",
          additionalProperties: true,
          properties: {
            destination: {
              type: "string",
              description: "Probe destination URL.",
            },
            connectivity: {
              type: "string",
              description: "Connectivity check URL.",
            },
            interval: {
              type: "string",
              description: "Interval between probe bursts.",
            },
            timeout: {
              type: "string",
              description: "Probe timeout.",
            },
            sampling: {
              type: "integer",
              minimum: 1,
              description: "Number of samples in a burst.",
            },
          },
        },
      },
    },
    fakedns: {
      type: "array",
      description: "FakeDNS address pools.",
      items: {
        type: "object",
        required: ["ipPool"],
        properties: {
          ipPool: {
            type: "string",
            description: "CIDR range used for synthetic DNS responses.",
            examples: ["198.18.0.0/15"],
          },
          poolSize: {
            type: "integer",
            minimum: 1,
            description: "Maximum number of cached fake DNS records.",
          },
        },
      },
    },
    transport: {
      type: "object",
      description: "Global transport defaults.",
      additionalProperties: true,
      properties: {
        tcpSettings: { type: "object", additionalProperties: true },
        kcpSettings: { type: "object", additionalProperties: true },
        wsSettings: { type: "object", additionalProperties: true },
        httpupgradeSettings: { type: "object", additionalProperties: true },
        splithttpSettings: { type: "object", additionalProperties: true },
        grpcSettings: { type: "object", additionalProperties: true },
      },
    },
  },
};
