import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useInboundsListQuery } from "hooks/useInboundsQuery";
import type { HostPayload, HostType, HostsSchema } from "../types";
import { api } from "service/http";

export const hostsQueryKey = ["hosts", "v2"] as const;

export function useHostsQuery() {
  return useQuery({
    queryKey: hostsQueryKey,
    queryFn: () => api.get<HostsSchema>("/hosts/v2"),
  });
}

function useHostsMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: hostsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["users"] }),
      ]),
  });
}

export function useCreateHostMutation() {
  return useHostsMutation((host: HostPayload) =>
    api.post<HostType>("/hosts/v2", host),
  );
}

export function useUpdateHostMutation() {
  return useHostsMutation(
    ({ id, host }: { id: number; host: HostPayload }) =>
      api.put<HostType>(`/hosts/v2/${id}`, host),
  );
}

export function useDeleteHostMutation() {
  return useHostsMutation((id: number) => api.delete(`/hosts/v2/${id}`));
}

export function useReorderHostsMutation() {
  return useHostsMutation((hostIds: number[]) =>
    api.put<HostsSchema>("/hosts/v2/reorder", { host_ids: hostIds }),
  );
}

export { useInboundsListQuery as useInboundsQuery };
