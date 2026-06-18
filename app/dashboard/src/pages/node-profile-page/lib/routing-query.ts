import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  node_ids: number[];
  enabled: boolean;
};

export const routingRulesQueryKey = ["routing-rules"] as const;
const routingInboundsQueryKey = ["node-profile-routing-inbounds"] as const;
const routingOutboundsQueryKey = ["node-profile-routing-outbounds"] as const;

export function useRoutingRulesQuery() {
  return useQuery({
    queryKey: routingRulesQueryKey,
    queryFn: () => api.get<RoutingRule[]>("/routing/rules"),
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
    Promise.all([
      queryClient.invalidateQueries({ queryKey: routingRulesQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["nodes"] }),
    ]);
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
      Promise.all([
        queryClient.invalidateQueries({ queryKey: routingRulesQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["nodes"] }),
      ]),
  });
}

export function useDeleteRoutingRuleMutation() {
  const invalidate = useInvalidateRoutingRules();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/routing/rules/${id}`),
    onSuccess: invalidate,
  });
}
