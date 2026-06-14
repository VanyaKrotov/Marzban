import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useInboundsListQuery } from "hooks/useInboundsQuery";
import type { HostsSchema } from "../types";
import { api } from "service/http";

export const hostsQueryKey = ["hosts"] as const;

export function useHostsQuery() {
  return useQuery({
    queryKey: hostsQueryKey,
    queryFn: () => api.get<HostsSchema>("/hosts"),
  });
}

export function useSaveHostsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hosts: HostsSchema) => api.put<HostsSchema>("/hosts", hosts),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: hostsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["users"] }),
      ]),
  });
}

export { useInboundsListQuery as useInboundsQuery };
