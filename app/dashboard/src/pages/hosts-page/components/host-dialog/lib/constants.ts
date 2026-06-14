import type { HostFormValues } from "./form";

export const HOST_VARIABLES = [
  "SERVER_IP",
  "SERVER_IPV6",
  "USERNAME",
  "DATA_USAGE",
  "DATA_LEFT",
  "DATA_LIMIT",
  "DAYS_LEFT",
  "EXPIRE_DATE",
  "TIME_LEFT",
  "STATUS_TEXT",
  "STATUS_EMOJI",
  "PROTOCOL",
  "TRANSPORT",
] as const;

export const HOST_BOOLEAN_FIELDS = [
  ["use_sni_as_host", "hostsDialog.useSniAsHost"],
  ["allowinsecure", "hostsDialog.allowinsecure"],
  ["mux_enable", "hostsDialog.muxEnable"],
  ["random_user_agent", "hostsDialog.randomUserAgent"],
] as const satisfies ReadonlyArray<
  readonly [keyof HostFormValues, string]
>;
