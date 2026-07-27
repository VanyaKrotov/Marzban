import { z } from "zod";

export const NodeSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  port: z
    .number()
    .min(1)
    .or(z.string().transform((value) => parseFloat(value))),
  api_port: z
    .number()
    .min(1)
    .or(z.string().transform((value) => parseFloat(value))),
  xray_version: z.string().nullable().optional(),
  id: z.number().nullable().optional(),
  status: z
    .enum(["connected", "connecting", "error", "disabled"])
    .nullable()
    .optional(),
  message: z.string().nullable().optional(),
  restart_required: z.boolean().optional(),
  add_as_new_host: z.boolean().optional(),
  usage_coefficient: z
    .number()
    .or(z.string().transform((value) => parseFloat(value))),
  access_log_enabled: z.boolean().optional(),
  error_log_enabled: z.boolean().optional(),
  log_retention_days: z.number().int().positive().optional(),
  log_storage_limit_bytes: z.number().int().positive().nullable().optional(),
});

export type NodeType = z.infer<typeof NodeSchema>;

export const getNodeDefaultValues = (): NodeType => ({
  name: "",
  address: "",
  port: 62050,
  api_port: 62051,
  xray_version: "",
  usage_coefficient: 1,
  access_log_enabled: false,
  error_log_enabled: false,
  log_retention_days: 14,
  log_storage_limit_bytes: null,
});
