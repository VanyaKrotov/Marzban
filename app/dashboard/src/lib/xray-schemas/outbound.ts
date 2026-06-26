import type { MonacoJsonSchema } from "@/components/MonacoJsonEditor";

const legacySupport =
  "Supported by Xray-core's inherited V2Ray-compatible outbound schema.";
const modernDirectFormat =
  "The direct settings format is supported by current Xray-core releases.";
const hysteriaSupport =
  "Hysteria v2 outbound support was introduced upstream by Xray-core PR #5508 and refined by PR #5537; it is available in the v26 release line.";
const httpUpgradeSupport =
  "HTTPUpgrade transport was added upstream by Xray-core commit 173b034.";
const splitHttpSupport =
  "SplitHTTP transport was added upstream by Xray-core commit c10bd28.";
const xhttpSupport =
  "XHTTP is the SplitHTTP alias added upstream by Xray-core commit b30e05d.";
const realitySupport =
  "REALITY support was added upstream by Xray-core commit 4d2e2b.";
const wireGuardSupport =
  "WireGuard outbound support was added upstream by Xray-core commit e18b52a.";

const serverAddressProperties: Record<string, MonacoJsonSchema> = {
  address: {
    type: "string",
    minLength: 1,
    description: `Remote server hostname or IP address. ${legacySupport}`,
  },
  port: {
    type: "integer",
    minimum: 1,
    maximum: 65535,
    description: `Remote server port. ${legacySupport}`,
  },
};

const usersProperty: MonacoJsonSchema = {
  type: "array",
  minItems: 1,
  description: `Accounts used to authenticate to the server. ${legacySupport}`,
  items: {
    type: "object",
    additionalProperties: true,
  },
};

const directProxyProperties: Record<string, MonacoJsonSchema> = {
  ...serverAddressProperties,
  user: {
    type: "string",
    description: `Username for HTTP or Socks authentication. ${legacySupport}`,
  },
  pass: {
    type: "string",
    description: `Password for HTTP or Socks authentication. ${legacySupport}`,
  },
  password: {
    type: "string",
    description: `Password or pre-shared key used by this outbound. ${legacySupport}`,
  },
  method: {
    type: "string",
    description: `Shadowsocks encryption method. ${legacySupport}`,
  },
  level: {
    type: "integer",
    minimum: 0,
    description: `User level used for local policy selection. ${legacySupport}`,
  },
  email: {
    type: "string",
    description: `Optional account email used for traffic statistics. ${legacySupport}`,
  },
  headers: {
    type: "object",
    additionalProperties: { type: "string" },
    description: `HTTP headers sent to the remote HTTP proxy. ${legacySupport}`,
  },
};

const legacyServerItemSchema: MonacoJsonSchema = {
  type: "object",
  required: ["address", "port"],
  additionalProperties: true,
  properties: directProxyProperties,
};

const legacyVnextItemSchema: MonacoJsonSchema = {
  type: "object",
  required: ["address", "port", "users"],
  additionalProperties: true,
  properties: {
    ...serverAddressProperties,
    users: usersProperty,
  },
};

const directVlessVmessProperties: Record<string, MonacoJsonSchema> = {
  ...serverAddressProperties,
  id: {
    type: "string",
    minLength: 1,
    description: `VLESS or VMess user ID. ${legacySupport}`,
  },
  encryption: {
    type: "string",
    description: `VLESS encryption setting. ${legacySupport}`,
  },
  security: {
    type: "string",
    description: `VMess security setting. ${legacySupport}`,
  },
  flow: {
    type: "string",
    description: `VLESS flow control mode. ${legacySupport}`,
  },
  level: directProxyProperties.level,
  alterId: {
    type: "integer",
    minimum: 0,
    description: `Legacy VMess alterId. ${legacySupport}`,
  },
  experiments: {
    type: "string",
    description: `VMess experiments setting. ${legacySupport}`,
  },
  reverse: {
    type: "object",
    additionalProperties: true,
    description: `VLESS minimalist reverse proxy configuration. ${legacySupport}`,
  },
};

const rangeSchema: MonacoJsonSchema = {
  anyOf: [
    { type: "integer" },
    { type: "string" },
    {
      type: "object",
      additionalProperties: true,
      properties: {
        from: { type: "integer" },
        to: { type: "integer" },
      },
    },
  ],
};

const hysteriaTransportSettings: MonacoJsonSchema = {
  type: "object",
  required: ["version"],
  additionalProperties: true,
  properties: {
    version: {
      type: "integer",
      enum: [2],
      default: 2,
      description: `Hysteria transport protocol version. Xray currently supports v2. ${hysteriaSupport}`,
    },
    auth: {
      type: "string",
      minLength: 1,
      description: `Hysteria v2 authentication string sent in the transport handshake. ${hysteriaSupport}`,
    },
    congestion: {
      type: "string",
      enum: ["", "reno", "bbr", "brutal", "force-brutal"],
      description:
        `Legacy Hysteria congestion option. Newer Xray-core configs prefer finalmask.quicParams.congestion. ${hysteriaSupport}`,
    },
    up: {
      type: "string",
      description:
        `Legacy Hysteria upload bandwidth such as "100mbps". Newer Xray-core configs prefer finalmask.quicParams.brutalUp. ${hysteriaSupport}`,
    },
    down: {
      type: "string",
      description:
        `Legacy Hysteria download bandwidth such as "100mbps". Newer Xray-core configs prefer finalmask.quicParams.brutalDown. ${hysteriaSupport}`,
    },
    udphop: {
      type: "object",
      additionalProperties: true,
      description:
        `Legacy Hysteria UDP port hopping settings. Newer Xray-core configs prefer finalmask.quicParams.udpHop. ${hysteriaSupport}`,
      properties: {
        ports: {
          type: "string",
          description: "UDP port list or range, for example 20000-50000.",
        },
        port: {
          type: "string",
          description:
            "Compatibility spelling used by early Hysteria examples.",
        },
        interval: rangeSchema,
      },
    },
    udpIdleTimeout: {
      type: "integer",
      minimum: 2,
      maximum: 600,
      description: `UDP idle timeout in seconds. ${hysteriaSupport}`,
    },
    masquerade: {
      type: "object",
      additionalProperties: true,
      description: `Server-side Hysteria masquerade settings. ${hysteriaSupport}`,
    },
  },
};

const finalMaskSchema: MonacoJsonSchema = {
  type: "object",
  additionalProperties: true,
  description:
    "FinalMask transport wrapping settings used by current Hysteria/XHTTP QUIC transports.",
  properties: {
    udp: {
      type: "array",
      description:
        "UDP masks such as Salamander. Added with the Hysteria v2 transport work in Xray-core PR #5508.",
      items: {
        type: "object",
        required: ["type"],
        additionalProperties: true,
        properties: {
          type: {
            type: "string",
            enum: ["salamander"],
            description: "UDP mask type.",
          },
          settings: {
            type: "object",
            additionalProperties: true,
            properties: {
              password: {
                type: "string",
                description: "Salamander mask password.",
              },
              packetSize: {
                type: "object",
                additionalProperties: true,
                properties: {
                  from: { type: "integer", minimum: 1 },
                  to: { type: "integer", minimum: 1, maximum: 2048 },
                },
              },
            },
          },
        },
      },
    },
    quicParams: {
      type: "object",
      additionalProperties: true,
      description:
        "QUIC tuning parameters used by Hysteria and XHTTP/3 transports in current Xray-core releases.",
      properties: {
        congestion: {
          type: "string",
          enum: ["", "reno", "bbr", "brutal", "force-brutal"],
          description:
            "QUIC congestion controller. force-brutal requires brutalUp.",
        },
        bbrProfile: {
          type: "string",
          enum: ["", "conservative", "standard", "aggressive"],
          description: "BBR profile used when congestion is bbr.",
        },
        brutalUp: {
          type: "string",
          description: "Brutal upload bandwidth such as 100mbps.",
        },
        brutalDown: {
          type: "string",
          description: "Brutal download bandwidth such as 100mbps.",
        },
        udpHop: {
          type: "object",
          additionalProperties: true,
          properties: {
            ports: {
              type: "string",
              description: "UDP port list or range, for example 20000-50000.",
            },
            interval: rangeSchema,
          },
        },
        maxIdleTimeout: {
          type: "integer",
          minimum: 4,
          maximum: 120,
          description: "QUIC max idle timeout in seconds.",
        },
        keepAlivePeriod: {
          type: "integer",
          minimum: 2,
          maximum: 60,
          description: "QUIC keep-alive period in seconds.",
        },
        disablePathMTUDiscovery: {
          type: "boolean",
          description: "Disables QUIC path MTU discovery.",
        },
      },
    },
  },
};

export const xrayOutboundSchema: MonacoJsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Xray outbound",
  description:
    "Configuration for a managed Xray-core outbound. Version notes describe the first known upstream support point for newer Xray-specific entities.",
  type: "object",
  required: ["tag", "protocol"],
  additionalProperties: true,
  properties: {
    tag: {
      type: "string",
      minLength: 1,
      description:
        "Unique managed outbound tag used by MarzbanNext and Xray routing.",
    },
    protocol: {
      type: "string",
      enum: [
        "blackhole",
        "dns",
        "freedom",
        "hysteria",
        "http",
        "loopback",
        "shadowsocks",
        "socks",
        "trojan",
        "vless",
        "vmess",
        "wireguard",
      ],
      enumDescriptions: [
        `Drops traffic selected for this outbound. ${legacySupport}`,
        `Forwards DNS requests to the configured DNS service. ${legacySupport}`,
        `Sends traffic directly to its destination. ${legacySupport}`,
        `Forwards traffic through a Hysteria server. ${hysteriaSupport}`,
        `Forwards traffic through an HTTP proxy. ${legacySupport}`,
        `Redirects traffic back to another inbound. ${legacySupport}`,
        `Forwards traffic through a Shadowsocks server. ${legacySupport}`,
        `Forwards traffic through a SOCKS proxy. ${legacySupport}`,
        `Forwards traffic through a Trojan server. ${legacySupport}`,
        `Forwards traffic through a VLESS server. ${legacySupport}`,
        `Forwards traffic through a VMess server. ${legacySupport}`,
        `Sends traffic through a WireGuard tunnel. ${wireGuardSupport}`,
      ],
      description: "Outbound protocol implemented by Xray-core.",
    },
    settings: {
      type: "object",
      description: "Protocol-specific outbound settings.",
      additionalProperties: true,
    },
    streamSettings: {
      type: "object",
      description: "Transport and security settings for proxy outbounds.",
      additionalProperties: true,
      properties: {
        network: {
          type: "string",
          enum: [
            "raw",
            "tcp",
            "kcp",
            "ws",
            "httpupgrade",
            "splithttp",
            "xhttp",
            "grpc",
            "hysteria",
          ],
          enumDescriptions: [
            `Raw TCP transport. ${legacySupport}`,
            `TCP transport alias. ${legacySupport}`,
            `mKCP transport. ${legacySupport}`,
            `WebSocket transport. ${legacySupport}`,
            httpUpgradeSupport,
            splitHttpSupport,
            xhttpSupport,
            `gRPC transport. ${legacySupport}`,
            `Hysteria v2 QUIC transport. ${hysteriaSupport}`,
          ],
          description: "Transport protocol used by the outbound.",
        },
        security: {
          type: "string",
          enum: ["none", "tls", "reality"],
          enumDescriptions: [
            `No transport security. ${legacySupport}`,
            `TLS transport security. ${legacySupport}`,
            realitySupport,
          ],
          description: "Transport security mode.",
        },
        tlsSettings: {
          type: "object",
          description: `TLS configuration used when security is set to tls. ${legacySupport}`,
          additionalProperties: true,
        },
        realitySettings: {
          type: "object",
          description:
            `REALITY configuration used when security is set to reality. ${realitySupport}`,
          additionalProperties: true,
        },
        hysteriaSettings: hysteriaTransportSettings,
        finalmask: finalMaskSchema,
        sockopt: {
          type: "object",
          description: `Socket options applied to outbound connections. ${legacySupport}`,
          additionalProperties: true,
        },
      },
    },
    mux: {
      type: "object",
      description: "Connection multiplexing settings.",
      additionalProperties: true,
      properties: {
        enabled: {
          type: "boolean",
          description: "Enables connection multiplexing.",
        },
        concurrency: {
          type: "integer",
          description: "Maximum number of multiplexed connections.",
        },
        xudpConcurrency: {
          type: "integer",
          description: "Maximum number of multiplexed XUDP connections.",
        },
        xudpProxyUDP443: {
          type: "string",
          enum: ["reject", "allow", "skip"],
          description: "Controls how XUDP handles UDP traffic on port 443.",
        },
      },
    },
  },
  allOf: [
    {
      if: {
        properties: { protocol: { const: "freedom" } },
        required: ["protocol"],
      },
      then: {
        properties: {
          settings: {
            type: "object",
            additionalProperties: true,
            properties: {
              domainStrategy: {
                type: "string",
                enum: ["AsIs", "UseIP", "UseIPv4", "UseIPv6"],
                description: `Controls destination domain resolution. ${legacySupport}`,
              },
              redirect: {
                type: "string",
                description: `Overrides the destination in host:port format. ${legacySupport}`,
              },
            },
          },
        },
      },
    },
    {
      if: {
        properties: { protocol: { const: "blackhole" } },
        required: ["protocol"],
      },
      then: {
        properties: {
          settings: {
            type: "object",
            additionalProperties: true,
            properties: {
              response: {
                type: "object",
                additionalProperties: true,
                properties: {
                  type: {
                    type: "string",
                    enum: ["none", "http"],
                    description: `Optional response sent before closing traffic. ${legacySupport}`,
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      if: {
        properties: {
          protocol: {
            enum: ["http", "shadowsocks", "socks", "trojan"],
          },
        },
        required: ["protocol"],
      },
      then: {
        properties: {
          settings: {
            type: "object",
            additionalProperties: true,
            anyOf: [
              { required: ["servers"] },
              { required: ["address", "port"] },
            ],
            properties: {
              ...directProxyProperties,
              users: usersProperty,
              servers: {
                type: "array",
                minItems: 1,
                description:
                  `Legacy remote proxy servers list. ${modernDirectFormat}`,
                items: legacyServerItemSchema,
              },
            },
          },
        },
      },
    },
    {
      if: {
        properties: {
          protocol: {
            enum: ["vless", "vmess"],
          },
        },
        required: ["protocol"],
      },
      then: {
        properties: {
          settings: {
            type: "object",
            additionalProperties: true,
            anyOf: [
              { required: ["vnext"] },
              { required: ["address", "port", "id"] },
            ],
            properties: {
              ...directVlessVmessProperties,
              address: {
                ...directVlessVmessProperties.address,
                description:
                  `Remote server hostname or IP address for the direct VLESS or VMess settings format. ${modernDirectFormat}`,
              },
              port: {
                ...directVlessVmessProperties.port,
                description:
                  `Remote server port for the direct VLESS or VMess settings format. ${modernDirectFormat}`,
              },
              vnext: {
                type: "array",
                minItems: 1,
                description:
                  `Legacy remote VLESS or VMess servers list. ${modernDirectFormat}`,
                items: legacyVnextItemSchema,
              },
            },
          },
        },
      },
    },
    {
      if: {
        properties: { protocol: { const: "loopback" } },
        required: ["protocol"],
      },
      then: {
        properties: {
          settings: {
            type: "object",
            required: ["inboundTag"],
            additionalProperties: true,
            properties: {
              inboundTag: {
                type: "string",
                minLength: 1,
                description: `Inbound tag that receives looped-back traffic. ${legacySupport}`,
              },
            },
          },
        },
      },
    },
    {
      if: {
        properties: { protocol: { const: "hysteria" } },
        required: ["protocol"],
      },
      then: {
        properties: {
          settings: {
            type: "object",
            required: ["version", "address", "port"],
            additionalProperties: true,
            properties: {
              version: {
                type: "integer",
                enum: [2],
                default: 2,
                description: `Hysteria outbound protocol version. Xray currently supports v2. ${hysteriaSupport}`,
              },
              address: {
                type: "string",
                minLength: 1,
                description: `Remote Hysteria server hostname or IP address. ${hysteriaSupport}`,
              },
              port: {
                type: "integer",
                minimum: 1,
                maximum: 65535,
                description: `Remote Hysteria server port. ${hysteriaSupport}`,
              },
            },
          },
        },
      },
    },
  ],
};
