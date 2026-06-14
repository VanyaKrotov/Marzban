import type { MonacoJsonSchema } from "@/components/MonacoJsonEditor";

export const xrayInboundSchema: MonacoJsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Xray inbound",
  description: "Configuration for a managed Xray-core inbound.",
  type: "object",
  required: ["protocol", "settings"],
  additionalProperties: true,
  properties: {
    tag: {
      type: "string",
      minLength: 1,
      description:
        "Unique inbound tag. Marzban synchronizes this value with the tag field outside the editor.",
    },
    listen: {
      type: "string",
      default: "0.0.0.0",
      description: "IP address or Unix socket on which the inbound listens.",
    },
    port: {
      anyOf: [
        {
          type: "integer",
          minimum: 1,
          maximum: 65535,
        },
        {
          type: "string",
          pattern:
            "^(?:[1-9]|[1-9][0-9]{1,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])-(?:[1-9]|[1-9][0-9]{1,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$",
          patternErrorMessage:
            "Port range must use the start-end format with values from 1 to 65535.",
          examples: ["443-449"],
        },
      ],
      description:
        "TCP or UDP port on which the inbound listens, or a port range such as 443-449.",
    },
    protocol: {
      type: "string",
      enum: ["vmess", "vless", "trojan", "shadowsocks"],
      enumDescriptions: [
        "VMess inbound protocol.",
        "VLESS inbound protocol.",
        "Trojan inbound protocol.",
        "Shadowsocks inbound protocol.",
      ],
      description: "Inbound protocol managed by Marzban.",
    },
    settings: {
      type: "object",
      description: "Protocol-specific inbound settings.",
      additionalProperties: true,
    },
    streamSettings: {
      type: "object",
      description: "Transport and security settings for the inbound.",
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
          description: "Transport protocol used by the inbound.",
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
      },
    },
    sniffing: {
      type: "object",
      description: "Traffic sniffing configuration.",
      additionalProperties: true,
      properties: {
        enabled: {
          type: "boolean",
          description: "Enables protocol sniffing.",
        },
        destOverride: {
          type: "array",
          uniqueItems: true,
          description: "Protocols whose detected destination may be overridden.",
          items: {
            type: "string",
            enum: ["http", "tls", "quic", "fakedns", "fakedns+others"],
          },
        },
        metadataOnly: {
          type: "boolean",
          description: "Uses connection metadata without reading payload data.",
        },
        routeOnly: {
          type: "boolean",
          description:
            "Uses the sniffed destination for routing without changing the request destination.",
        },
      },
    },
  },
  allOf: [
    {
      if: {
        properties: {
          protocol: { const: "vless" },
        },
        required: ["protocol"],
      },
      then: {
        properties: {
          settings: {
            type: "object",
            required: ["decryption"],
            additionalProperties: true,
            properties: {
              clients: {
                type: "array",
                description:
                  "Static clients. Marzban injects managed users at runtime.",
              },
              decryption: {
                type: "string",
                enum: ["none"],
                description: "VLESS decryption must be set to none.",
              },
            },
          },
        },
      },
    },
    {
      if: {
        properties: {
          protocol: { const: "vmess" },
        },
        required: ["protocol"],
      },
      then: {
        properties: {
          settings: {
            type: "object",
            additionalProperties: true,
            properties: {
              clients: {
                type: "array",
                description:
                  "Static clients. Marzban injects managed users at runtime.",
              },
              disableInsecureEncryption: {
                type: "boolean",
                description:
                  "Rejects clients that use legacy insecure VMess encryption.",
              },
            },
          },
        },
      },
    },
    {
      if: {
        properties: {
          protocol: { const: "trojan" },
        },
        required: ["protocol"],
      },
      then: {
        properties: {
          settings: {
            type: "object",
            additionalProperties: true,
            properties: {
              clients: {
                type: "array",
                description:
                  "Static clients. Marzban injects managed users at runtime.",
              },
            },
          },
        },
      },
    },
    {
      if: {
        properties: {
          protocol: { const: "shadowsocks" },
        },
        required: ["protocol"],
      },
      then: {
        properties: {
          settings: {
            type: "object",
            additionalProperties: true,
            properties: {
              method: {
                type: "string",
                enum: [
                  "aes-128-gcm",
                  "aes-256-gcm",
                  "chacha20-ietf-poly1305",
                ],
                description:
                  "Shadowsocks encryption method supported by Marzban accounts.",
              },
              network: {
                type: "string",
                enum: ["tcp", "udp", "tcp,udp"],
                description: "Network modes accepted by the inbound.",
              },
            },
          },
        },
      },
    },
  ],
};
