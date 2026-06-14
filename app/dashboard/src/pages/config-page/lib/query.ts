import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "service/http";

export type CoreStatus = {
  version: string;
  started: boolean;
  logs_websocket: string | null;
};

export const coreConfigQueryKey = ["core-config"] as const;
export const coreStatusQueryKey = ["core-status"] as const;

export function useCoreConfigQuery() {
  return useQuery({
    queryKey: coreConfigQueryKey,
    queryFn: () => api.get<Record<string, unknown>>("/core/config"),
  });
}

export function useCoreStatusQuery() {
  return useQuery({
    queryKey: coreStatusQueryKey,
    queryFn: () => api.get<CoreStatus>("/core"),
  });
}

export function useUpdateCoreConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: Record<string, unknown>) =>
      api.put<Record<string, unknown>>("/core/config", config),
    onSuccess: (config) => {
      queryClient.setQueryData(coreConfigQueryKey, config);
      return queryClient.invalidateQueries({ queryKey: coreStatusQueryKey });
    },
  });
}

export function useRestartCoreMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post("/core/restart"),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: coreStatusQueryKey }),
  });
}
