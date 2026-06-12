import { useQuery } from "react-query";
import { api } from "service/http";
import { z } from "zod";
import { create } from "zustand";
import { FilterUsageType, useDashboard } from "./DashboardContext";

export const NodeSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  port: z
    .number()
    .min(1)
    .or(z.string().transform((v) => parseFloat(v))),
  api_port: z
    .number()
    .min(1)
    .or(z.string().transform((v) => parseFloat(v))),
  xray_version: z.string().nullable().optional(),
  id: z.number().nullable().optional(),
  status: z
    .enum(["connected", "connecting", "error", "disabled"])
    .nullable()
    .optional(),
  message: z.string().nullable().optional(),
  add_as_new_host: z.boolean().optional(),
  usage_coefficient: z.number().or(z.string().transform((v) => parseFloat(v))),
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

export const FetchNodesQueryKey = "fetch-nodes-query-key";

export type NodeStore = {
  nodes: NodeType[];
  addNode: (node: NodeType) => Promise<unknown>;
  fetchNodes: () => Promise<NodeType[]>;
  fetchNodesUsage: (query: FilterUsageType) => Promise<void>;
  updateNode: (node: NodeType) => Promise<unknown>;
  reconnectNode: (node: NodeType) => Promise<unknown>;
  deletingNode?: NodeType | null;
  deleteNode: () => Promise<unknown>;
  setDeletingNode: (node: NodeType | null) => void;
};

export const useNodesQuery = () => {
  const { isEditingNodes } = useDashboard();
  return useQuery({
    queryKey: FetchNodesQueryKey,
    queryFn: useNodes.getState().fetchNodes,
    refetchInterval: isEditingNodes ? 3000 : undefined,
    refetchOnWindowFocus: false,
  });
};

export const useNodes = create<NodeStore>((set, get) => ({
  nodes: [],
  addNode(body) {
    return api.post("/node", body);
  },
  fetchNodes() {
    return api.get<NodeType[]>("/nodes");
  },
  fetchNodesUsage(query: FilterUsageType) {
    return api.get("/nodes/usage", { params: query });
  },
  updateNode(body) {
    return api.put(`/node/${body.id}`, body);
  },
  setDeletingNode(node) {
    set({ deletingNode: node });
  },
  reconnectNode(body) {
    return api.post(`/node/${body.id}/reconnect`);
  },
  deleteNode: () => {
    return api.delete(`/node/${get().deletingNode?.id}`);
  },
}));
