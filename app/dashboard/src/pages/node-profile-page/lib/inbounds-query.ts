import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  "enabled" | "content" | "node_ids"
> & {
  auto_assign_users?: boolean;
};
export type InboundUpdate = Partial<
  Pick<InboundConfig, "enabled" | "content" | "node_ids">
>;

export const inboundConfigsQueryKey = ["inbound-configs"] as const;

export function useInboundConfigsQuery(nodeId: number) {
  return useQuery({
    queryKey: [...inboundConfigsQueryKey, nodeId],
    queryFn: () =>
      api.get<InboundConfig[]>("/inbounds/configs", {
        params: { node_id: nodeId },
      }),
  });
}

function useInvalidateInbounds() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: inboundConfigsQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["inbounds"] }),
      queryClient.invalidateQueries({ queryKey: ["hosts"] }),
      queryClient.invalidateQueries({ queryKey: ["nodes"] }),
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
