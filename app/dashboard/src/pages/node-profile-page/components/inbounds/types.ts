export interface InboundModel {
  listen: string;
  port: number | string;
  protocol: "vless" | "vmess" | "trojan" | "shadowsocks";
  settings?: {
    client: any[];
    decryption?: "none" | string;
  };
  streamSettings?: {
    network:
      | "tcp"
      | "kcp"
      | "ws"
      | "httpupgrade"
      | "splithttp"
      | "xhttp"
      | "grpc";
    security: "none" | "tls" | "reality";
    tlsSettings?: {
      serverName: string;
    };
    realitySettings?: {
      show: boolean;
      xver: number;
      target: string;
      publicKey: string;
      privateKey: string;
      serverNames: string[];
      shortIds: string[];
    };
  };
}
