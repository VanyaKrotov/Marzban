export type HostType = {
  id: number;
  inbound_id: number;
  inbound_tag: string;
  position: number;
  remark: string;
  address: string;
  port: number | null;
  path: string | null;
  sni: string | null;
  host: string | null;
  mux_enable: boolean;
  allowinsecure: boolean | null;
  is_disabled: boolean;
  fragment_setting: string | null;
  noise_setting: string | null;
  random_user_agent: boolean;
  security: string;
  alpn: string;
  fingerprint: string;
  use_sni_as_host: boolean;
};

export type HostPayload = Omit<
  HostType,
  "id" | "inbound_id" | "inbound_tag" | "position"
> & {
  inbound_tag: string;
  position?: number | null;
};

export type HostsSchema = HostType[];
