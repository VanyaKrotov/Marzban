import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/service/http";

export type SubscriptionBalancerStrategy =
  | "least_ping"
  | "least_load"
  | "random"
  | "round_robin";

export type SubscriptionBalancer = {
  id: number;
  name: string;
  enabled: boolean;
  strategy: SubscriptionBalancerStrategy;
  probe_url: string;
  probe_interval: number;
  host_ids: number[];
  created_at: string;
  updated_at: string;
};

export type SubscriptionBalancerPayload = Omit<
  SubscriptionBalancer,
  "id" | "created_at" | "updated_at"
>;

export const subscriptionBalancersQueryKey = ["subscription-balancers"] as const;

export function useSubscriptionBalancersQuery() {
  return useQuery({
    queryKey: subscriptionBalancersQueryKey,
    queryFn: () =>
      api.get<SubscriptionBalancer[]>("/settings/subscription-balancers"),
  });
}

function useSubscriptionBalancerMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<SubscriptionBalancer>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: subscriptionBalancersQueryKey }),
  });
}

export function useCreateSubscriptionBalancerMutation() {
  return useSubscriptionBalancerMutation((balancer: SubscriptionBalancerPayload) =>
    api.post<SubscriptionBalancer>("/settings/subscription-balancers", balancer),
  );
}

export function useUpdateSubscriptionBalancerMutation() {
  return useSubscriptionBalancerMutation(
    ({ id, balancer }: { id: number; balancer: SubscriptionBalancerPayload }) =>
      api.put<SubscriptionBalancer>(
        `/settings/subscription-balancers/${id}`,
        balancer,
      ),
  );
}

export function useDeleteSubscriptionBalancerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/settings/subscription-balancers/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: subscriptionBalancersQueryKey }),
  });
}

export function useReorderSubscriptionBalancersMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (balancerIds: number[]) =>
      api.put<SubscriptionBalancer[]>(
        "/settings/subscription-balancers/reorder",
        { balancer_ids: balancerIds },
      ),
    onSuccess: (balancers) =>
      queryClient.setQueryData(subscriptionBalancersQueryKey, balancers),
  });
}
