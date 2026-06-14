import { z } from "zod";

import type { HostType } from "../../../types";

export const hostFormSchema = z.object({
  inboundTag: z.string().min(1),
  remark: z.string().min(1),
  address: z.string().min(1),
  port: z.number().nullable(),
  path: z.string().nullable(),
  sni: z.string().nullable(),
  host: z.string().nullable(),
  mux_enable: z.boolean(),
  allowinsecure: z.boolean().nullable(),
  is_disabled: z.boolean(),
  fragment_setting: z.string().nullable(),
  noise_setting: z.string().nullable(),
  random_user_agent: z.boolean(),
  security: z.string(),
  alpn: z.string(),
  fingerprint: z.string(),
  use_sni_as_host: z.boolean(),
});

export type HostFormValues = z.infer<typeof hostFormSchema>;

export function getHostFormValues(
  inboundTag: string,
  host?: HostType | null,
): HostFormValues {
  return {
    inboundTag,
    ...(host ?? {
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
    }),
  };
}
