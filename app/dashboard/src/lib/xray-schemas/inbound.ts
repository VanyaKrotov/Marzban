import type { MonacoJsonSchema } from "@/components/MonacoJsonEditor";

const stringArray = (
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

const portNumberPattern =
  "(?:[1-9]|[1-9][0-9]{1,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])";

const fallbackSchema: MonacoJsonSchema = {
  type: "object",
  required: ["dest"],
  additionalProperties: true,
  properties: {
    name: {
      type: "string",
      description: "Optional fallback name used for diagnostics.",
    },
    alpn: {
      type: "string",
      description: "ALPN value that must match before this fallback is selected.",
      examples: ["h2", "http/1.1"],
    },
    path: {
      type: "string",
      description:
        "HTTP path that must match before this fallback is selected.",
      examples: ["/websocket"],
    },
    dest: {
      anyOf: [{ type: "integer" }, { type: "string" }],
      description:
        "Fallback destination as a port, address:port, Unix socket, or another supported destination.",
      examples: [80, "127.0.0.1:8080", "/dev/shm/fallback.sock"],
    },
    xver: {
      type: "integer",
      enum: [0, 1, 2],
      default: 0,
      description:
        "PROXY protocol version sent to the fallback destination. Zero disables it.",
    },
  },
};

const userBaseProperties: Record<string, MonacoJsonSchema> = {
  level: {
    type: "integer",
    minimum: 0,
    default: 0,
    description: "Local policy level assigned to the static user.",
  },
  email: {
    type: "string",
    description:
      "Unique user identifier used by Xray logs and traffic statistics.",
  },
};

const idUserSchema: MonacoJsonSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: true,
  properties: {
    id: {
      type: "string",
      minLength: 1,
      description:
        "UUID or a custom identifier shorter than 30 bytes accepted by Xray.",
      examples: ["5783a3e7-e373-51cd-8642-c83782b807c5"],
    },
    ...userBaseProperties,
  },
};

const vlessUserSchema: MonacoJsonSchema = {
  ...idUserSchema,
  properties: {
    ...idUserSchema.properties,
    flow: {
      type: "string",
      enum: ["", "xtls-rprx-vision"],
      description:
        "XTLS flow control mode. Vision is intended for compatible TLS or REALITY transports.",
    },
    reverse: {
      type: "object",
      additionalProperties: true,
      properties: {
        tag: {
          type: "string",
          description: "Outbound tag used by the simplified reverse tunnel.",
        },
      },
    },
  },
};

const trojanUserSchema: MonacoJsonSchema = {
  type: "object",
  required: ["password"],
  additionalProperties: true,
  properties: {
    password: {
      type: "string",
      minLength: 1,
      description: "Trojan authentication password.",
    },
    ...userBaseProperties,
  },
};

const shadowsocksMethods = [
  "2022-blake3-aes-128-gcm",
  "2022-blake3-aes-256-gcm",
  "2022-blake3-chacha20-poly1305",
  "aes-128-gcm",
  "aes-256-gcm",
  "chacha20-poly1305",
  "chacha20-ietf-poly1305",
  "xchacha20-poly1305",
  "xchacha20-ietf-poly1305",
  "none",
  "plain",
];

const shadowsocksUserSchema: MonacoJsonSchema = {
  type: "object",
  required: ["password"],
  additionalProperties: true,
  properties: {
    password: {
      type: "string",
      minLength: 1,
      description:
        "Per-user password. With Shadowsocks 2022, clients use ServerPassword:UserPassword.",
    },
    method: {
      type: "string",
      enum: shadowsocksMethods,
      description:
        "Optional per-user method for legacy non-2022 multi-user configurations.",
    },
    ...userBaseProperties,
  },
};

const socksAccountsSchema: MonacoJsonSchema = {
  type: "object",
  additionalProperties: {
    type: "string",
    minLength: 1,
    description: "Password for this SOCKS username.",
  },
  description:
    "SOCKS username/password map. Managed Marzban users are injected here at runtime.",
};

const httpHeaderSchema: MonacoJsonSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    type: {
      type: "string",
      enum: ["none", "http"],
      default: "none",
      description: "RAW packet header camouflage type.",
    },
    request: {
      type: "object",
      additionalProperties: true,
      properties: {
        version: { type: "string", examples: ["1.1"] },
        method: { type: "string", examples: ["GET"] },
        path: stringArray("Possible HTTP request paths.", ["/"]),
        headers: {
          type: "object",
          description: "HTTP request headers.",
          additionalProperties: {
            anyOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } },
            ],
          },
        },
      },
    },
    response: {
      type: "object",
      description: "Optional HTTP response camouflage settings.",
      additionalProperties: true,
      properties: {
        version: {
          type: "string",
          default: "1.1",
          description: "HTTP response version.",
        },
        status: {
          type: "string",
          default: "200",
          description: "HTTP response status code.",
        },
        reason: {
          type: "string",
          default: "OK",
          description: "HTTP response reason phrase.",
        },
        headers: {
          type: "object",
          description: "HTTP response headers.",
          additionalProperties: {
            anyOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } },
            ],
          },
        },
      },
    },
  },
};

const tlsCertificateSchema: MonacoJsonSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    certificateFile: {
      type: "string",
      description: "Path to a PEM certificate chain on the Xray host.",
    },
    keyFile: {
      type: "string",
      description: "Path to the matching PEM private key on the Xray host.",
    },
    certificate: {
      anyOf: [
        { type: "string" },
        { type: "array", items: { type: "string" } },
      ],
      description:
        "Inline PEM certificate chain. Marzban injects assigned node certificates here.",
    },
    key: {
      anyOf: [
        { type: "string" },
        { type: "array", items: { type: "string" } },
      ],
      description:
        "Inline PEM private key. Marzban injects assigned node certificates here.",
    },
    ocspStapling: {
      type: "integer",
      minimum: 0,
      description: "OCSP stapling refresh interval in seconds.",
    },
    oneTimeLoading: {
      type: "boolean",
      description: "Loads certificate files only once during startup.",
    },
    buildChain: {
      type: "boolean",
      description: "Attempts to build a complete certificate chain.",
    },
  },
};

const fallbackLimitSchema: MonacoJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    afterBytes: {
      type: "integer",
      minimum: 0,
      description: "Bytes allowed before rate limiting starts.",
    },
    bytesPerSec: {
      type: "integer",
      minimum: 0,
      description: "Sustained fallback transfer limit in bytes per second.",
    },
    burstBytesPerSec: {
      type: "integer",
      minimum: 0,
      description: "Burst fallback transfer limit in bytes per second.",
    },
  },
};

const packetValueSchema: MonacoJsonSchema = {
  anyOf: [
    { type: "string" },
    { type: "array", items: { type: "integer", minimum: 0, maximum: 255 } },
  ],
  description:
    "Fixed packet data encoded according to type. It conflicts with rand.",
};

const maskPacketSchema: MonacoJsonSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    delay: {
      anyOf: [{ type: "integer", minimum: 0 }, { type: "string" }],
      description: "Delay before the next packet, in milliseconds.",
    },
    rand: {
      anyOf: [{ type: "integer", minimum: 0 }, { type: "string" }],
      description: "Number or range of random bytes. It conflicts with packet.",
    },
    randRange: {
      type: "string",
      default: "0-255",
      description: "Range of values used for generated random bytes.",
    },
    type: {
      type: "string",
      enum: ["array", "str", "hex", "base64"],
      default: "array",
      description: "Encoding of packet.",
    },
    packet: packetValueSchema,
  },
};

const finalMaskLayerSchema = (
  types: string[],
  description: string,
): MonacoJsonSchema => ({
  type: "object",
  required: ["type"],
  additionalProperties: true,
  properties: {
    type: {
      type: "string",
      enum: types,
      description,
    },
    settings: {
      type: "object",
      description: "Settings for the selected FinalMask layer.",
      additionalProperties: true,
      properties: {
        packets: {
          type: "string",
          description:
            "Packet selection for fragmentation, such as tlshello or 1-3.",
        },
        length: {
          type: "string",
          description: "Fragment length or range in bytes.",
          examples: ["100-200"],
        },
        delay: {
          type: "string",
          description: "Delay or range between fragments in milliseconds.",
          examples: ["10-20"],
        },
        maxSplit: {
          type: "string",
          description: "Maximum split count or range. Zero means unlimited.",
          examples: ["3-6"],
        },
        password: {
          type: "string",
          description: "Password used by masks such as salamander or sudoku.",
        },
        ascii: { type: "string" },
        customTable: { type: "string" },
        customTables: { type: "array", items: { type: "string" } },
        paddingMin: { type: "integer", minimum: 0 },
        paddingMax: { type: "integer", minimum: 0 },
        reset: {
          type: "string",
          description: "Noise reset interval or range in seconds.",
          examples: ["30-60"],
        },
        noise: {
          type: "array",
          items: maskPacketSchema,
        },
        clients: {
          type: "array",
          items: {
            type: "array",
            items: maskPacketSchema,
          },
        },
        servers: {
          type: "array",
          items: {
            type: "array",
            items: maskPacketSchema,
          },
        },
        errors: {
          type: "array",
          items: {
            type: "array",
            items: maskPacketSchema,
          },
        },
        client: {
          type: "array",
          items: maskPacketSchema,
        },
        server: {
          type: "array",
          items: maskPacketSchema,
        },
        header: { type: "string" },
        value: { type: "string" },
      },
    },
  },
});

const finalMaskSchema: MonacoJsonSchema = {
  type: "object",
  description:
    "Final traffic camouflage applied after transport security processing.",
  additionalProperties: true,
  properties: {
    tcp: {
      type: "array",
      description:
        "Ordered TCP camouflage layers. The first item is the outermost layer.",
      items: finalMaskLayerSchema(
        ["header-custom", "fragment", "sudoku"],
        "TCP FinalMask layer type.",
      ),
    },
    udp: {
      type: "array",
      description:
        "Ordered UDP camouflage layers. The first item is the outermost layer.",
      items: finalMaskLayerSchema(
        [
          "header-custom",
          "header-dns",
          "header-dtls",
          "header-srtp",
          "header-utp",
          "header-wechat",
          "header-wireguard",
          "mkcp-original",
          "mkcp-aes128gcm",
          "noise",
          "salamander",
          "sudoku",
          "xdns",
          "xicmp",
        ],
        "UDP FinalMask layer type.",
      ),
    },
    quicParams: {
      type: "object",
      description: "QUIC transport tuning shared by compatible transports.",
      additionalProperties: true,
      properties: {
        congestion: {
          type: "string",
          enum: ["", "bbr", "cubic", "new_reno", "force-brutal"],
        },
        bbrProfile: { type: "string", examples: ["standard"] },
        debug: { type: "boolean", default: false },
        brutalUp: {
          anyOf: [{ type: "integer", minimum: 0 }, { type: "string" }],
        },
        brutalDown: {
          anyOf: [{ type: "integer", minimum: 0 }, { type: "string" }],
        },
        udpHop: {
          type: "object",
          additionalProperties: true,
          properties: {
            ports: {
              type: "string",
              description: "UDP port or port range used for hopping.",
              examples: ["20000-50000"],
            },
            interval: {
              type: "string",
              description: "Port hopping interval or range in seconds.",
              examples: ["5-10"],
            },
          },
        },
        initStreamReceiveWindow: { type: "integer", minimum: 0 },
        maxStreamReceiveWindow: { type: "integer", minimum: 0 },
        initConnectionReceiveWindow: { type: "integer", minimum: 0 },
        maxConnectionReceiveWindow: { type: "integer", minimum: 0 },
        maxIdleTimeout: { type: "integer", minimum: 0 },
        keepAlivePeriod: { type: "integer", minimum: 0 },
        disablePathMTUDiscovery: { type: "boolean" },
        maxIncomingStreams: { type: "integer", minimum: 0 },
      },
    },
  },
};

export const xrayStreamSettingsSchema: MonacoJsonSchema = {
  type: "object",
  description: "Transport and transport-security settings for the inbound.",
  additionalProperties: true,
  properties: {
    network: {
      type: "string",
      enum: [
        "raw",
        "xhttp",
        "mkcp",
        "grpc",
        "websocket",
        "httpupgrade",
        "hysteria",
        "tcp",
        "kcp",
        "ws",
        "splithttp",
      ],
      enumDescriptions: [
        "Canonical RAW transport.",
        "XHTTP transport.",
        "Canonical mKCP transport.",
        "gRPC transport.",
        "Canonical WebSocket transport.",
        "HTTPUpgrade transport.",
        "Hysteria transport.",
        "Legacy alias for RAW used by existing Marzban configurations.",
        "Legacy alias for mKCP.",
        "Legacy alias for WebSocket.",
        "Legacy predecessor or alias used by older SplitHTTP configurations.",
      ],
      default: "raw",
      description:
        "Transport method. Canonical Xray names and legacy Marzban-compatible aliases are accepted.",
    },
    security: {
      type: "string",
      enum: ["none", "reality", "tls"],
      default: "none",
      description: "Transport security mode.",
    },
    rawSettings: {
      type: "object",
      description: "RAW transport settings used when network is raw.",
      additionalProperties: true,
      properties: {
        acceptProxyProtocol: {
          type: "boolean",
          default: false,
          description: "Accepts the PROXY protocol before the RAW stream.",
        },
        header: httpHeaderSchema,
      },
    },
    tcpSettings: {
      type: "object",
      description:
        "Legacy name for RAW settings used when network is tcp.",
      additionalProperties: true,
      properties: {
        acceptProxyProtocol: {
          type: "boolean",
          default: false,
        },
        header: httpHeaderSchema,
      },
    },
    xhttpSettings: {
      type: "object",
      description:
        "XHTTP transport settings. Keep client and server path, host, mode and advanced upload settings compatible.",
      additionalProperties: true,
      properties: {
        host: {
          type: "string",
          description:
            "HTTP host used by XHTTP. An empty inbound value accepts any host.",
        },
        path: {
          type: "string",
          default: "/",
          description:
            "HTTP request path. It must match the reverse proxy and client configuration.",
        },
        mode: {
          type: "string",
          enum: ["auto", "packet-up", "stream-up", "stream-one"],
          default: "auto",
          description:
            "XHTTP upload mode. auto lets the core choose a compatible mode.",
        },
        noSSEHeader: {
          type: "boolean",
          description: "Disables the Server-Sent Events response header.",
        },
        noGRPCHeader: {
          type: "boolean",
          description: "Disables the gRPC-compatible response header.",
        },
        xPaddingBytes: {
          type: "string",
          description: "Optional XHTTP padding byte range.",
          examples: ["100-1000"],
        },
        scMaxEachPostBytes: {
          type: "integer",
          minimum: 0,
        },
        scMinPostsIntervalMs: {
          type: "integer",
          minimum: 0,
        },
        extra: {
          type: "object",
          description:
            "Advanced XHTTP transport options. Unknown fields are preserved for forward compatibility.",
          additionalProperties: true,
          properties: {
            headers: {
              type: "object",
              description: "Additional HTTP headers.",
              additionalProperties: { type: "string" },
            },
            noSSEHeader: { type: "boolean" },
            xPaddingBytes: { type: "string" },
            scMaxEachPostBytes: { type: "integer", minimum: 0 },
            scMinPostsIntervalMs: { type: "integer", minimum: 0 },
            scMaxBufferedPosts: { type: "integer", minimum: 0 },
            scStreamUpServerSecs: { type: "string" },
          },
        },
      },
    },
    splithttpSettings: {
      type: "object",
      description: "Legacy SplitHTTP settings accepted for existing configs.",
      additionalProperties: true,
      properties: {
        host: { type: "string" },
        path: { type: "string", default: "/" },
        mode: {
          type: "string",
          enum: ["auto", "packet-up", "stream-up", "stream-one"],
        },
        extra: {
          type: "object",
          additionalProperties: true,
          properties: {
            headers: {
              type: "object",
              additionalProperties: { type: "string" },
            },
            xPaddingBytes: { type: "string" },
            scMaxEachPostBytes: { type: "integer", minimum: 0 },
            scMinPostsIntervalMs: { type: "integer", minimum: 0 },
          },
        },
      },
    },
    kcpSettings: {
      type: "object",
      description: "mKCP transport settings.",
      additionalProperties: true,
      properties: {
        mtu: {
          type: "integer",
          minimum: 576,
          maximum: 1460,
          default: 1350,
          description: "Maximum transmission unit in bytes.",
        },
        tti: {
          type: "integer",
          minimum: 10,
          maximum: 100,
          default: 50,
          description: "Transmission time interval in milliseconds.",
        },
        uplinkCapacity: {
          type: "integer",
          minimum: 0,
          default: 5,
          description: "Maximum upload capacity in megabytes per second.",
        },
        downlinkCapacity: {
          type: "integer",
          minimum: 0,
          default: 20,
          description: "Maximum download capacity in megabytes per second.",
        },
        congestion: {
          type: "boolean",
          default: false,
          description: "Enables mKCP congestion control.",
        },
        readBufferSize: {
          type: "integer",
          minimum: 0,
          default: 2,
          description: "Per-connection read buffer size in megabytes.",
        },
        writeBufferSize: {
          type: "integer",
          minimum: 0,
          default: 2,
          description: "Per-connection write buffer size in megabytes.",
        },
        seed: {
          type: "string",
          description:
            "Deprecated legacy mKCP obfuscation seed. Prefer FinalMask.",
        },
        header: {
          type: "object",
          description:
            "Deprecated legacy mKCP header camouflage. Prefer FinalMask.",
          additionalProperties: true,
          properties: {
            type: {
              type: "string",
              enum: [
                "none",
                "srtp",
                "utp",
                "wechat-video",
                "dtls",
                "wireguard",
              ],
            },
          },
        },
      },
    },
    grpcSettings: {
      type: "object",
      description: "gRPC transport settings.",
      additionalProperties: true,
      properties: {
        authority: {
          type: "string",
          description:
            "HTTP/2 authority value. It can be used as a Host equivalent.",
          examples: ["grpc.example.com"],
        },
        serviceName: {
          type: "string",
          description:
            "gRPC service name shared with the client. A leading slash enables custom path prefixes.",
        },
        multiMode: {
          type: "boolean",
          default: false,
          description:
            "Enables experimental multi-mode. Cross-version compatibility is not guaranteed.",
        },
        user_agent: {
          type: "string",
          description:
            "Client-side custom gRPC User-Agent. Usually omitted on an inbound.",
        },
        idle_timeout: {
          type: "integer",
          minimum: 10,
          description:
            "Idle period before a health check, in seconds. Values below 10 are treated as 10.",
        },
        health_check_timeout: {
          type: "integer",
          minimum: 0,
          default: 20,
          description: "Health-check timeout in seconds.",
        },
        permit_without_stream: {
          type: "boolean",
          default: false,
          description:
            "Allows health checks when no child streams are active.",
        },
        initial_windows_size: {
          type: "integer",
          minimum: 0,
          description: "Initial HTTP/2 flow-control window size.",
        },
      },
    },
    wsSettings: {
      type: "object",
      description:
        "WebSocket settings. The ws key is retained for Xray and Marzban compatibility.",
      additionalProperties: true,
      properties: {
        acceptProxyProtocol: { type: "boolean", default: false },
        path: {
          type: "string",
          default: "/",
          description: "WebSocket request path.",
        },
        host: {
          type: "string",
          description: "Legacy shortcut for the Host header.",
        },
        headers: {
          type: "object",
          description: "Additional WebSocket handshake headers.",
          additionalProperties: { type: "string" },
        },
        heartbeatPeriod: {
          type: "integer",
          minimum: 0,
          description: "WebSocket heartbeat interval in seconds.",
        },
      },
    },
    httpupgradeSettings: {
      type: "object",
      description: "HTTPUpgrade transport settings.",
      additionalProperties: true,
      properties: {
        acceptProxyProtocol: { type: "boolean", default: false },
        path: { type: "string", default: "/" },
        host: { type: "string" },
        headers: {
          type: "object",
          additionalProperties: { type: "string" },
        },
      },
    },
    hysteriaSettings: {
      type: "object",
      description: "Hysteria2-compatible QUIC transport settings.",
      additionalProperties: true,
      properties: {
        version: {
          type: "integer",
          enum: [2],
          default: 2,
          description: "Hysteria protocol version. Xray currently supports 2.",
        },
        auth: {
          type: "string",
          description:
            "Hysteria authentication password. It may be overridden by protocol users.",
        },
        udpIdleTimeout: {
          type: "integer",
          minimum: 0,
          default: 60,
          description: "QUIC native UDP idle timeout in seconds.",
        },
        masquerade: {
          type: "object",
          description: "HTTP/3 page masquerading configuration.",
          additionalProperties: true,
          properties: {
            type: {
              type: "string",
              enum: ["", "file", "proxy", "string"],
              description:
                "Masquerade source. Empty uses the built-in 404 response.",
            },
            dir: {
              type: "string",
              description: "Directory served when type is file.",
            },
            url: {
              type: "string",
              description: "Upstream URL used when type is proxy.",
            },
            rewriteHost: {
              type: "boolean",
              default: false,
              description: "Rewrites Host when proxying the masquerade page.",
            },
            insecure: {
              type: "boolean",
              default: false,
              description:
                "Skips upstream certificate verification for proxy masquerading.",
            },
            content: {
              type: "string",
              description: "Response body used when type is string.",
            },
            headers: {
              type: "object",
              description: "Response headers used when type is string.",
              additionalProperties: { type: "string" },
            },
            statusCode: {
              type: "integer",
              minimum: 100,
              maximum: 599,
              description: "HTTP status used when type is string.",
            },
          },
        },
      },
    },
    realitySettings: {
      type: "object",
      description:
        "Server-side REALITY configuration used when security is reality.",
      required: ["serverNames", "privateKey", "shortIds"],
      anyOf: [{ required: ["target"] }, { required: ["dest"] }],
      additionalProperties: true,
      properties: {
        show: {
          type: "boolean",
          default: false,
          description: "Prints REALITY debug information when enabled.",
        },
        target: {
          type: "string",
          description:
            "Required fallback target used to camouflage rejected or unauthenticated traffic.",
          examples: ["example.com:443"],
        },
        dest: {
          type: "string",
          description: "Legacy alias for target.",
          examples: ["example.com:443"],
        },
        xver: {
          type: "integer",
          enum: [0, 1, 2],
          default: 0,
          description:
            "PROXY protocol version sent to the REALITY target. Zero disables it.",
        },
        serverNames: stringArray(
          "Required SNI values accepted from REALITY clients. Wildcards are not supported.",
          ["example.com", "www.example.com"],
        ),
        privateKey: {
          type: "string",
          minLength: 43,
          maxLength: 43,
          description: "Server X25519 private key generated by xray x25519.",
        },
        publicKey: {
          type: "string",
          minLength: 43,
          maxLength: 43,
          description:
            "Derived X25519 public key stored by Marzban for generated client links.",
        },
        minClientVer: {
          type: "string",
          pattern: "^\\d+\\.\\d+\\.\\d+$",
          description: "Minimum accepted Xray client version.",
        },
        maxClientVer: {
          type: "string",
          pattern: "^\\d+\\.\\d+\\.\\d+$",
          description: "Maximum accepted Xray client version.",
        },
        maxTimeDiff: {
          type: "integer",
          minimum: 0,
          description: "Maximum accepted client time difference in milliseconds.",
        },
        shortIds: {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          description:
            "Client short IDs. Each value is an even-length hexadecimal string with at most 16 characters; an empty value is allowed.",
          items: {
            type: "string",
            pattern: "^(?:[0-9a-fA-F]{2}){0,8}$",
          },
          examples: [["", "0123456789abcdef"]],
        },
        mldsa65Seed: {
          type: "string",
          description:
            "Optional server ML-DSA-65 seed used for post-quantum certificate signatures.",
        },
        limitFallbackUpload: fallbackLimitSchema,
        limitFallbackDownload: fallbackLimitSchema,
      },
    },
    tlsSettings: {
      type: "object",
      description: "TLS configuration used when security is tls.",
      additionalProperties: true,
      properties: {
        serverName: {
          type: "string",
          description:
            "TLS server name. On inbound connections it is mainly used by certificate and SNI handling.",
        },
        verifyPeerCertByName: { type: "string" },
        rejectUnknownSni: {
          type: "boolean",
          default: false,
          description:
            "Rejects TLS handshakes whose SNI does not match a certificate domain.",
        },
        allowInsecure: {
          type: "boolean",
          default: false,
          description:
            "Deprecated client-side certificate verification bypass. Avoid enabling it.",
        },
        alpn: {
          type: "array",
          uniqueItems: true,
          description: "ALPN values advertised during the TLS handshake.",
          items: {
            type: "string",
            enum: ["h3", "h2", "http/1.1", "FromMitM"],
          },
          default: ["h2", "http/1.1"],
        },
        minVersion: {
          type: "string",
          enum: ["1.0", "1.1", "1.2", "1.3"],
        },
        maxVersion: {
          type: "string",
          enum: ["1.0", "1.1", "1.2", "1.3"],
        },
        cipherSuites: {
          type: "string",
          description: "Colon-separated Go TLS cipher-suite names.",
        },
        certificates: {
          type: "array",
          description:
            "TLS certificates. Assigned node certificates are injected by Marzban when node configuration is generated.",
          items: tlsCertificateSchema,
        },
        disableSystemRoot: { type: "boolean", default: false },
        enableSessionResumption: { type: "boolean", default: false },
        fingerprint: {
          type: "string",
          enum: [
            "",
            "chrome",
            "firefox",
            "safari",
            "ios",
            "android",
            "edge",
            "360",
            "qq",
            "random",
            "randomized",
            "unsafe",
          ],
          description:
            "Client Hello fingerprint. Native uTLS hello names are also accepted by Xray.",
        },
        pinnedPeerCertSha256: {
          type: "string",
          pattern:
            "^(?:[0-9a-fA-F]{2}:?){31}[0-9a-fA-F]{2}(?:,(?:[0-9a-fA-F]{2}:?){31}[0-9a-fA-F]{2})*$",
          description:
            "Comma-separated SHA-256 certificate hashes, with or without colons.",
        },
        curvePreferences: {
          type: "array",
          uniqueItems: true,
          items: {
            type: "string",
            enum: [
              "CurveP256",
              "CurveP384",
              "CurveP521",
              "X25519",
              "X25519MLKEM768",
              "SecP256r1MLKEM768",
              "SecP384r1MLKEM1024",
            ],
          },
          description: "Preferred ECDHE key-exchange curves.",
        },
        masterKeyLog: {
          type: "string",
          description:
            "Path for TLS master-secret logging used by packet analyzers.",
        },
        echServerKeys: {
          type: "string",
          description: "Server-side Encrypted Client Hello key material.",
        },
        echConfigList: {
          type: "string",
          description: "Client-side Encrypted Client Hello configuration.",
        },
        echSockopt: { type: "object", additionalProperties: true },
      },
    },
    finalmask: finalMaskSchema,
    sockopt: {
      type: "object",
      description:
        "Low-level socket behavior. Most options are platform-specific and should be changed deliberately.",
      additionalProperties: true,
      properties: {
        mark: {
          type: "integer",
          minimum: 0,
          description: "Linux SO_MARK value. Requires CAP_NET_ADMIN.",
        },
        tcpMaxSeg: {
          type: "integer",
          minimum: 0,
          description: "Maximum TCP segment size.",
        },
        tcpFastOpen: {
          anyOf: [{ type: "boolean" }, { type: "integer" }],
          description:
            "Enables TCP Fast Open. On inbound listeners a positive integer is the pending request limit.",
        },
        tproxy: {
          type: "string",
          enum: ["off", "redirect", "tproxy"],
          default: "off",
          description: "Linux transparent proxy mode.",
        },
        domainStrategy: {
          type: "string",
          enum: [
            "AsIs",
            "UseIP",
            "UseIPv6v4",
            "UseIPv6",
            "UseIPv4v6",
            "UseIPv4",
            "ForceIP",
            "ForceIPv6v4",
            "ForceIPv6",
            "ForceIPv4v6",
            "ForceIPv4",
          ],
          default: "AsIs",
          description:
            "Controls address resolution and IP-family preference for socket targets.",
        },
        happyEyeballs: {
          type: "object",
          description:
            "RFC 8305 address racing. It requires domainStrategy other than AsIs.",
          additionalProperties: false,
          properties: {
            tryDelayMs: {
              type: "integer",
              minimum: 0,
              default: 0,
              description:
                "Delay between connection attempts. A value of 250 is commonly recommended.",
            },
            prioritizeIPv6: {
              type: "boolean",
              default: false,
              description: "Places IPv6 addresses first after sorting.",
            },
            interleave: {
              type: "integer",
              minimum: 1,
              default: 1,
              description: "RFC 8305 first address family count.",
            },
            maxConcurrentTry: {
              type: "integer",
              minimum: 0,
              default: 4,
              description:
                "Maximum concurrent connection attempts. Zero disables Happy Eyeballs.",
            },
          },
        },
        dialerProxy: {
          type: "string",
          description:
            "Outbound tag used to establish this connection for chained forwarding.",
        },
        acceptProxyProtocol: {
          type: "boolean",
          default: false,
          description: "Accepts PROXY protocol on this inbound socket.",
        },
        trustedXForwardedFor: {
          type: "array",
          uniqueItems: true,
          items: { type: "string" },
          description:
            "Additional required HTTP header names before X-Forwarded-For is trusted.",
        },
        tcpKeepAliveInterval: {
          type: "integer",
          description: "Interval between TCP keep-alive probes in seconds.",
        },
        tcpKeepAliveIdle: {
          type: "integer",
          description:
            "Idle time before TCP keep-alive probes begin, in seconds.",
        },
        tcpUserTimeout: {
          type: "integer",
          description: "TCP user timeout in milliseconds.",
        },
        tcpcongestion: {
          type: "string",
          description:
            "Linux TCP congestion-control algorithm, for example bbr, cubic or reno.",
        },
        tcpCongestion: {
          type: "string",
          description:
            "Legacy casing retained for compatibility. Prefer tcpcongestion.",
        },
        interface: {
          type: "string",
          description: "Network interface to bind for outbound dialing.",
        },
        V6Only: {
          type: "boolean",
          default: false,
          description:
            "Makes an inbound listener on :: accept only IPv6 connections.",
        },
        v6only: {
          type: "boolean",
          description:
            "Legacy casing retained for compatibility. Prefer V6Only.",
        },
        tcpWindowClamp: {
          type: "integer",
          minimum: 0,
          description: "Advertised TCP receive-window clamp.",
        },
        tcpMptcp: {
          type: "boolean",
          default: false,
          description: "Enables Multipath TCP where supported.",
        },
        addressPortStrategy: {
          type: "string",
          enum: [
            "",
            "none",
            "SrvPortOnly",
            "SrvAddressOnly",
            "SrvPortAndAddress",
            "TxtPortOnly",
            "TxtAddressOnly",
            "TxtPortAndAddress",
          ],
          description:
            "Uses SRV or TXT records to rewrite the target address or port.",
        },
        customSockopt: {
          type: "array",
          description:
            "Advanced platform socket options. Use only with operating-system socket API knowledge.",
          items: {
            type: "object",
            required: ["type", "opt", "value"],
            additionalProperties: false,
            properties: {
              system: {
                type: "string",
                enum: ["", "linux", "windows", "darwin", "android"],
              },
              network: {
                type: "string",
                enum: ["", "tcp", "tcp4", "tcp6", "udp", "udp4", "udp6"],
              },
              type: {
                type: "string",
                enum: ["int", "str"],
              },
              level: {
                type: "string",
                default: "6",
                description: "Socket protocol level as a decimal string.",
              },
              opt: {
                type: "string",
                pattern: "^\\d+$",
                description: "Socket option number as a decimal string.",
              },
              value: {
                type: "string",
                description:
                  "Option value. It must be decimal when type is int.",
              },
            },
          },
        },
      },
    },
  },
  allOf: [
    {
      if: {
        properties: {
          security: { const: "reality" },
        },
        required: ["security"],
      },
      then: {
        required: ["realitySettings"],
        properties: {
          network: {
            enum: ["raw", "tcp", "xhttp", "splithttp", "grpc"],
            description:
              "REALITY is supported with RAW, XHTTP and gRPC. Legacy tcp and splithttp aliases remain accepted.",
          },
        },
      },
    },
    {
      if: {
        properties: {
          security: { const: "tls" },
        },
        required: ["security"],
      },
      then: {
        required: ["tlsSettings"],
      },
    },
  ],
};

export const xrayInboundSchema: MonacoJsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Xray inbound",
  description:
    "Managed Xray-core inbound configuration. The schema follows the official InboundObject while retaining legacy Marzban aliases.",
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
      description:
        "IP address or absolute Unix socket path. Unix sockets may include permissions, for example /dev/shm/xray.sock,0666.",
      examples: ["0.0.0.0", "::", "127.0.0.1", "/dev/shm/xray.sock"],
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
          pattern: `^(?:env:[A-Za-z_][A-Za-z0-9_]*|${portNumberPattern}(?:-${portNumberPattern})?(?:,${portNumberPattern}(?:-${portNumberPattern})?)*)$`,
          patternErrorMessage:
            "Use a port, env:VARIABLE, a range such as 443-449, or a comma-separated list.",
          examples: ["443", "443-449", "80,443,10000-10010", "env:PORT"],
        },
      ],
      description:
        "Listening port, environment variable, range, or comma-separated combination. Ignored for Unix sockets.",
    },
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
        "hysteria",
        "tun",
      ],
      enumDescriptions: [
        "Tunnel inbound, historically named dokodemo-door.",
        "HTTP proxy inbound.",
        "Shadowsocks inbound managed by Marzban.",
        "SOCKS proxy inbound.",
        "Trojan inbound managed by Marzban.",
        "VLESS inbound managed by Marzban.",
        "VMess inbound managed by Marzban.",
        "WireGuard inbound.",
        "Hysteria inbound.",
        "TUN inbound.",
      ],
      description:
        "Inbound protocol. User accounts are injected only for protocols supported by Marzban accounts.",
    },
    settings: {
      type: "object",
      description: "Protocol-specific inbound settings.",
      additionalProperties: true,
    },
    streamSettings: xrayStreamSettingsSchema,
    sniffing: {
      type: "object",
      description:
        "Inspects supported traffic to recover destination domains for routing or destination override.",
      required: ["enabled"],
      additionalProperties: true,
      properties: {
        enabled: {
          type: "boolean",
          description: "Enables traffic sniffing.",
        },
        destOverride: {
          type: "array",
          uniqueItems: true,
          description:
            "Detected protocols whose destination may be used for routing or replacement.",
          items: {
            type: "string",
            enum: ["http", "tls", "quic", "fakedns", "fakedns+others"],
          },
        },
        metadataOnly: {
          type: "boolean",
          default: false,
          description:
            "Uses only connection metadata. Payload-based sniffers are not activated.",
        },
        domainsExcluded: stringArray(
          "Domains whose sniffed destination must not replace the original destination.",
          ["courier.push.apple.com", "domain:example.com"],
        ),
        ipsExcluded: stringArray(
          "IP addresses or CIDR ranges whose sniffed destination must not replace the original destination.",
          ["10.0.0.0/8", "geoip:private"],
        ),
        routeOnly: {
          type: "boolean",
          default: false,
          description:
            "Uses the sniffed domain for routing without replacing the original proxy destination.",
        },
      },
    },
  },
  allOf: [
    {
      if: {
        properties: { protocol: { const: "vless" } },
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
                  "Marzban-compatible static client list. Managed users are injected here at runtime.",
                items: vlessUserSchema,
              },
              users: {
                type: "array",
                description:
                  "Official Xray static user list. Prefer clients for managed Marzban accounts.",
                items: vlessUserSchema,
              },
              decryption: {
                type: "string",
                minLength: 1,
                default: "none",
                description:
                  "VLESS encryption configuration. Use none unless advanced VLESS Encryption is intentionally configured.",
              },
              fallbacks: {
                type: "array",
                items: fallbackSchema,
              },
            },
          },
        },
      },
    },
    {
      if: {
        properties: { protocol: { const: "vmess" } },
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
                  "Marzban-compatible static client list. Managed users are injected here at runtime.",
                items: idUserSchema,
              },
              users: {
                type: "array",
                description: "Official Xray static VMess user list.",
                items: idUserSchema,
              },
              default: {
                type: "object",
                description:
                  "Default user settings used with dynamic port detours.",
                additionalProperties: true,
                properties: {
                  level: {
                    type: "integer",
                    minimum: 0,
                    default: 0,
                  },
                },
              },
              disableInsecureEncryption: {
                type: "boolean",
                description:
                  "Legacy compatibility option used by existing Xray configurations.",
              },
            },
          },
        },
      },
    },
    {
      if: {
        properties: { protocol: { const: "trojan" } },
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
                  "Marzban-compatible static client list. Managed users are injected here at runtime.",
                items: trojanUserSchema,
              },
              users: {
                type: "array",
                description: "Official Xray static Trojan user list.",
                items: trojanUserSchema,
              },
              fallbacks: {
                type: "array",
                items: fallbackSchema,
              },
            },
          },
        },
      },
    },
    {
      if: {
        properties: { protocol: { const: "shadowsocks" } },
        required: ["protocol"],
      },
      then: {
        properties: {
          settings: {
            type: "object",
            additionalProperties: true,
            properties: {
              network: {
                type: "string",
                enum: ["tcp", "udp", "tcp,udp"],
                default: "tcp",
                description:
                  "Native networks listened to by the Shadowsocks inbound.",
              },
              method: {
                type: "string",
                enum: shadowsocksMethods,
                description: "Shadowsocks encryption method.",
              },
              password: {
                type: "string",
                description:
                  "Server password. Required by Xray for single-user and Shadowsocks 2022 configurations.",
              },
              level: userBaseProperties.level,
              email: userBaseProperties.email,
              clients: {
                type: "array",
                description:
                  "Marzban-compatible static client list. Managed users are injected here at runtime.",
                items: shadowsocksUserSchema,
              },
              users: {
                type: "array",
                description: "Official Xray multi-user Shadowsocks list.",
                items: shadowsocksUserSchema,
              },
            },
          },
        },
      },
    },
    {
      if: {
        properties: { protocol: { const: "socks" } },
        required: ["protocol"],
      },
      then: {
        properties: {
          settings: {
            type: "object",
            additionalProperties: true,
            properties: {
              auth: {
                type: "string",
                enum: ["noauth", "password"],
                default: "password",
                description:
                  "SOCKS authentication mode. Managed Marzban accounts require password.",
              },
              accounts: socksAccountsSchema,
              udp: {
                type: "boolean",
                default: true,
                description: "Whether UDP relay is enabled for this SOCKS inbound.",
              },
              ip: {
                type: "string",
                description: "Optional listen IP override for SOCKS UDP relay.",
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
            additionalProperties: true,
            properties: {
              auth: {
                type: "string",
                description:
                  "Fallback Hysteria authentication secret used when per-user auth is not configured.",
              },
              users: {
                type: "array",
                description:
                  "Official Xray Hysteria user list. Managed users are injected here at restart.",
                items: {
                  type: "object",
                  required: ["auth"],
                  additionalProperties: true,
                  properties: {
                    auth: {
                      type: "string",
                      minLength: 1,
                      description: "Per-user Hysteria authentication secret.",
                    },
                    ...userBaseProperties,
                  },
                },
              },
            },
          },
        },
      },
    },
  ],
};
