import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { NodeType } from "types/Node";
import { api } from "service/http";

export type OutboundConfig = {
  tag: string;
  enabled: boolean;
  readonly: boolean;
  content: Record<string, unknown>;
  node_ids: number[];
};

export type OutboundPayload = Pick<
  OutboundConfig,
  "tag" | "enabled" | "content" | "node_ids"
>;
export type OutboundUpdate = Partial<
  Pick<OutboundConfig, "enabled" | "content" | "node_ids">
>;

export const outboundConfigsQueryKey = ["outbound-configs"] as const;
export const outboundNodesQueryKey = ["outbound-page-nodes"] as const;

export function useOutboundConfigsQuery() {
  return useQuery({
    queryKey: outboundConfigsQueryKey,
    queryFn: () => api.get<OutboundConfig[]>("/outbounds/configs"),
  });
}

export function useOutboundNodesQuery() {
  return useQuery({
    queryKey: outboundNodesQueryKey,
    queryFn: () => api.get<NodeType[]>("/nodes"),
  });
}

function useInvalidateOutbounds() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: outboundConfigsQueryKey });
}

export function useCreateOutboundMutation() {
  const invalidate = useInvalidateOutbounds();
  return useMutation({
    mutationFn: (payload: OutboundPayload) =>
      api.post<OutboundConfig>("/outbounds/configs", payload),
    onSuccess: invalidate,
  });
}

export function useUpdateOutboundMutation() {
  const invalidate = useInvalidateOutbounds();
  return useMutation({
    mutationFn: ({
      tag,
      payload,
    }: {
      tag: string;
      payload: OutboundUpdate;
    }) => api.put<OutboundConfig>(`/outbounds/configs/${tag}`, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteOutboundMutation() {
  const invalidate = useInvalidateOutbounds();
  return useMutation({
    mutationFn: (tag: string) => api.delete(`/outbounds/configs/${tag}`),
    onSuccess: invalidate,
  });
}
