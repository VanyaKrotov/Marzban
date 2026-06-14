import type { HostType, HostsSchema } from "../types";

export type HostRow = {
  id: string;
  inboundTag: string;
  index: number;
  host: HostType;
};

export const getDefaultHost = (): HostType => ({
  remark: "",
  address: "",
  port: null,
  path: "",
  sni: "",
  host: "",
  mux_enable: false,
  allowinsecure: false,
  is_disabled: false,
  fragment_setting: "",
  noise_setting: "",
  random_user_agent: false,
  security: "inbound_default",
  alpn: "",
  fingerprint: "",
  use_sni_as_host: false,
});

export function flattenHosts(hosts: HostsSchema): HostRow[] {
  return Object.entries(hosts).flatMap(([inboundTag, inboundHosts]) =>
    inboundHosts.map((host, index) => ({
      id: `${inboundTag}:${index}`,
      inboundTag,
      index,
      host,
    })),
  );
}

export function updateHost(
  hosts: HostsSchema,
  sourceInbound: string,
  sourceIndex: number,
  targetInbound: string,
  host: HostType,
): HostsSchema {
  const next = cloneHosts(hosts);
  next[sourceInbound].splice(sourceIndex, 1);
  next[targetInbound] ??= [];
  if (sourceInbound === targetInbound) {
    next[targetInbound].splice(sourceIndex, 0, host);
  } else {
    next[targetInbound].push(host);
  }
  return next;
}

export function insertHost(
  hosts: HostsSchema,
  inboundTag: string,
  index: number,
  host: HostType,
): HostsSchema {
  const next = cloneHosts(hosts);
  next[inboundTag] ??= [];
  next[inboundTag].splice(index, 0, host);
  return next;
}

export function removeHost(
  hosts: HostsSchema,
  inboundTag: string,
  index: number,
): HostsSchema {
  const next = cloneHosts(hosts);
  next[inboundTag].splice(index, 1);
  return next;
}

export function reorderHost(
  hosts: HostsSchema,
  inboundTag: string,
  fromIndex: number,
  toIndex: number,
): HostsSchema {
  if (fromIndex === toIndex) return hosts;

  const next = cloneHosts(hosts);
  const [host] = next[inboundTag].splice(fromIndex, 1);
  next[inboundTag].splice(toIndex, 0, host);
  return next;
}

export function cloneHosts(hosts: HostsSchema): HostsSchema {
  return Object.fromEntries(
    Object.entries(hosts).map(([tag, inboundHosts]) => [
      tag,
      inboundHosts.map((host) => ({ ...host })),
    ]),
  );
}
