export interface InboundModel {
  listen: string;
  port: number | string;
  protocol:
    | "dokodemo-door"
    | "http"
    | "shadowsocks"
    | "socks"
    | "trojan"
    | "vless"
    | "vmess"
    | "wireguard"
    | "hysteria"
    | "tun";
  settings?: {
    client: any[];
    decryption?: "none" | string;
  };
  streamSettings?: {
    network:
      | "tcp"
      | "raw"
      | "kcp"
      | "mkcp"
      | "ws"
      | "websocket"
      | "httpupgrade"
      | "splithttp"
      | "xhttp"
      | "grpc"
      | "hysteria";
    security: "none" | "tls" | "reality";
    tlsSettings?: {
      serverName?: string;
      certificates?: Array<{
        certificateFile?: string;
        keyFile?: string;
      }>;
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
