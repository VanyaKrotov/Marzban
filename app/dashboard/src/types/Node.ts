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
});

export type NodeType = z.infer<typeof NodeSchema>;

export const getNodeDefaultValues = (): NodeType => ({
  name: "",
  address: "",
  port: 62050,
  api_port: 62051,
  xray_version: "",
  usage_coefficient: 1,
});
