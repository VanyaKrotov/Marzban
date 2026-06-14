import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { NodeType } from "types/Node";
import { api } from "service/http";

export type RoutingRule = {
  id: number;
  create_at: string;
  name: string;
  content: Record<string, unknown>;
  enabled: boolean;
  readonly: boolean;
  node_ids: number[];
  position: number;
};

export type RoutingRulePayload = Pick<
  RoutingRule,
  "name" | "content" | "enabled" | "node_ids"
> & { position?: number };

type TaggedConfig = {
  tag: string;
};

export const routingRulesQueryKey = ["routing-rules"] as const;
const routingNodesQueryKey = ["routing-page-nodes"] as const;
const routingInboundsQueryKey = ["routing-page-inbounds"] as const;
const routingOutboundsQueryKey = ["routing-page-outbounds"] as const;

export function useRoutingRulesQuery() {
  return useQuery({
    queryKey: routingRulesQueryKey,
    queryFn: () => api.get<RoutingRule[]>("/routing/rules"),
  });
}

export function useRoutingNodesQuery() {
  return useQuery({
    queryKey: routingNodesQueryKey,
    queryFn: () => api.get<NodeType[]>("/nodes"),
  });
}

export function useRoutingInboundsQuery() {
  return useQuery({
    queryKey: routingInboundsQueryKey,
    queryFn: () => api.get<TaggedConfig[]>("/inbounds/configs"),
  });
}

export function useRoutingOutboundsQuery() {
  return useQuery({
    queryKey: routingOutboundsQueryKey,
    queryFn: () => api.get<TaggedConfig[]>("/outbounds/configs"),
  });
}

function useInvalidateRoutingRules() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: routingRulesQueryKey });
}

export function useCreateRoutingRuleMutation() {
  const invalidate = useInvalidateRoutingRules();
  return useMutation({
    mutationFn: (payload: RoutingRulePayload) =>
      api.post<RoutingRule>("/routing/rules", payload),
    onSuccess: invalidate,
  });
}

export function useUpdateRoutingRuleMutation() {
  const invalidate = useInvalidateRoutingRules();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<RoutingRulePayload>;
    }) => api.put<RoutingRule>(`/routing/rules/${id}`, payload),
    onSuccess: invalidate,
  });
}

export function useReorderRoutingRulesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleIds: number[]) =>
      api.put<RoutingRule[]>("/routing/rules/order", { rule_ids: ruleIds }),
    onMutate: async (ruleIds) => {
      await queryClient.cancelQueries({ queryKey: routingRulesQueryKey });
      const previousRules =
        queryClient.getQueryData<RoutingRule[]>(routingRulesQueryKey);
      const rulesById = new Map(
        (previousRules ?? []).map((rule) => [rule.id, rule]),
      );
      queryClient.setQueryData<RoutingRule[]>(
        routingRulesQueryKey,
        ruleIds.flatMap((id, position) => {
          const rule = rulesById.get(id);
          return rule ? [{ ...rule, position }] : [];
        }),
      );
      return { previousRules };
    },
    onError: (_error, _ruleIds, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData(
          routingRulesQueryKey,
          context.previousRules,
        );
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: routingRulesQueryKey }),
  });
}

export function useDeleteRoutingRuleMutation() {
  const invalidate = useInvalidateRoutingRules();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/routing/rules/${id}`),
    onSuccess: invalidate,
  });
}
