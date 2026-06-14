export type ProtocolType = "vmess" | "vless" | "trojan" | "shadowsocks";

export type InboundType = {
  tag: string;
  protocol: ProtocolType;
  network: string;
  tls: string;
  port?: number;
};

export type InboundsResponse = Record<ProtocolType, InboundType[]>;
export type InboundsMap = Map<ProtocolType, InboundType[]>;
