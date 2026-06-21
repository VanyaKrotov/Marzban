import type { MonacoJsonSchema } from "@/components/MonacoJsonEditor";

const serverAddressProperties: Record<string, MonacoJsonSchema> = {
  address: {
    type: "string",
    minLength: 1,
    description: "Remote server hostname or IP address.",
  },
  port: {
    type: "integer",
    minimum: 1,
    maximum: 65535,
    description: "Remote server port.",
  },
};

const usersProperty: MonacoJsonSchema = {
  type: "array",
  minItems: 1,
  description: "Accounts used to authenticate to the server.",
  items: {
    type: "object",
    additionalProperties: true,
  },
};

const directProxyProperties: Record<string, MonacoJsonSchema> = {
  ...serverAddressProperties,
  user: {
    type: "string",
    description: "Username for HTTP or Socks authentication.",
  },
  pass: {
    type: "string",
    description: "Password for HTTP or Socks authentication.",
  },
  password: {
    type: "string",
    description: "Password or pre-shared key used by this outbound.",
  },
  method: {
    type: "string",
    description: "Shadowsocks encryption method.",
  },
  level: {
    type: "integer",
    minimum: 0,
    description: "User level used for local policy selection.",
  },
  email: {
    type: "string",
    description: "Optional account email used for traffic statistics.",
  },
  headers: {
    type: "object",
    additionalProperties: { type: "string" },
    description: "HTTP headers sent to the remote HTTP proxy.",
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
    description: "VLESS or VMess user ID.",
  },
  encryption: {
    type: "string",
    description: "VLESS encryption setting.",
  },
  security: {
    type: "string",
    description: "VMess security setting.",
  },
  flow: {
    type: "string",
    description: "VLESS flow control mode.",
  },
  level: directProxyProperties.level,
  alterId: {
    type: "integer",
    minimum: 0,
    description: "Legacy VMess alterId.",
  },
  experiments: {
    type: "string",
    description: "VMess experiments setting.",
  },
  reverse: {
    type: "object",
    additionalProperties: true,
    description: "VLESS minimalist reverse proxy configuration.",
  },
};

export const xrayOutboundSchema: MonacoJsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Xray outbound",
  description: "Configuration for a managed Xray-core outbound.",
  type: "object",
  required: ["protocol"],
  additionalProperties: true,
  properties: {
    tag: {
      type: "string",
      minLength: 1,
      description:
        "Unique outbound tag. MarzbanNext synchronizes this value with the tag field outside the editor.",
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
        "Drops traffic selected for this outbound.",
        "Forwards DNS requests to the configured DNS service.",
        "Sends traffic directly to its destination.",
        "Forwards traffic through a Hysteria server.",
        "Forwards traffic through an HTTP proxy.",
        "Redirects traffic back to another inbound.",
        "Forwards traffic through a Shadowsocks server.",
        "Forwards traffic through a SOCKS proxy.",
        "Forwards traffic through a Trojan server.",
        "Forwards traffic through a VLESS server.",
        "Forwards traffic through a VMess server.",
        "Sends traffic through a WireGuard tunnel.",
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
          ],
          description: "Transport protocol used by the outbound.",
        },
        security: {
          type: "string",
          enum: ["none", "tls", "reality"],
          description: "Transport security mode.",
        },
        tlsSettings: {
          type: "object",
          description: "TLS configuration used when security is set to tls.",
          additionalProperties: true,
        },
        realitySettings: {
          type: "object",
          description:
            "REALITY configuration used when security is set to reality.",
          additionalProperties: true,
        },
        sockopt: {
          type: "object",
          description: "Socket options applied to outbound connections.",
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
                description: "Controls destination domain resolution.",
              },
              redirect: {
                type: "string",
                description: "Overrides the destination in host:port format.",
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
                    description: "Optional response sent before closing traffic.",
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
                  "Legacy remote proxy servers list. Newer Xray-core versions also accept address and port directly in settings.",
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
                  "Remote server hostname or IP address for the direct VLESS or VMess settings format.",
              },
              port: {
                ...directVlessVmessProperties.port,
                description:
                  "Remote server port for the direct VLESS or VMess settings format.",
              },
              vnext: {
                type: "array",
                minItems: 1,
                description:
                  "Legacy remote VLESS or VMess servers list. Newer Xray-core versions also accept address, port and id directly in settings.",
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
                description: "Inbound tag that receives looped-back traffic.",
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
                description: "Hysteria protocol version. Xray currently supports 2.",
              },
              address: { type: "string", minLength: 1 },
              port: { type: "integer", minimum: 1, maximum: 65535 },
            },
          },
        },
      },
    },
  ],
};
