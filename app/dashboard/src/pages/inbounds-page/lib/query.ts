import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { NodeType } from "types/Node";
import { api } from "service/http";

export type InboundConfig = {
  tag: string;
  enabled: boolean;
  readonly: boolean;
  content: Record<string, unknown>;
  node_ids: number[];
};

export type InboundPayload = Pick<
  InboundConfig,
  "tag" | "enabled" | "content" | "node_ids"
>;
export type InboundUpdate = Partial<
  Pick<InboundConfig, "enabled" | "content" | "node_ids">
>;

export const inboundConfigsQueryKey = ["inbound-configs"] as const;
export const inboundNodesQueryKey = ["inbound-page-nodes"] as const;

export function useInboundConfigsQuery() {
  return useQuery({
    queryKey: inboundConfigsQueryKey,
    queryFn: () => api.get<InboundConfig[]>("/inbounds/configs"),
  });
}

export function useInboundNodesQuery() {
  return useQuery({
    queryKey: inboundNodesQueryKey,
    queryFn: () => api.get<NodeType[]>("/nodes"),
  });
}

function useInvalidateInbounds() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: inboundConfigsQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["inbounds"] }),
      queryClient.invalidateQueries({ queryKey: ["hosts"] }),
    ]);
}

export function useCreateInboundMutation() {
  const invalidate = useInvalidateInbounds();
  return useMutation({
    mutationFn: (payload: InboundPayload) =>
      api.post<InboundConfig>("/inbounds/configs", payload),
    onSuccess: invalidate,
  });
}

export function useUpdateInboundMutation() {
  const invalidate = useInvalidateInbounds();
  return useMutation({
    mutationFn: ({
      tag,
      payload,
    }: {
      tag: string;
      payload: InboundUpdate;
    }) => api.put<InboundConfig>(`/inbounds/configs/${tag}`, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteInboundMutation() {
  const invalidate = useInvalidateInbounds();
  return useMutation({
    mutationFn: (tag: string) => api.delete(`/inbounds/configs/${tag}`),
    onSuccess: invalidate,
  });
}
