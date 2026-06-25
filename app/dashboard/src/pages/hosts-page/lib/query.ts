import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useInboundsListQuery } from "hooks/useInboundsQuery";
import type {
  HostGroupType,
  HostGroupPayload,
  HostGroupUpdatePayload,
  HostPayload,
  HostType,
  HostsSchema,
} from "../types";
import { api } from "service/http";

export const hostsQueryKey = ["hosts", "v2"] as const;
export const hostGroupsQueryKey = ["host-groups"] as const;

export function useHostsQuery(groupIds: string[] = [], search = "") {
  return useQuery({
    queryKey: [...hostsQueryKey, groupIds, search],
    queryFn: () => {
      const params = new URLSearchParams();
      groupIds.forEach((groupId) => {
        params.append("group_ids", groupId);
      });
      const trimmedSearch = search.trim();
      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      }
      return api.get<HostsSchema>("/hosts/v2", {
        params: params.size ? params : undefined,
      });
    },
  });
}

export function useHostGroupsQuery() {
  return useQuery({
    queryKey: hostGroupsQueryKey,
    queryFn: () => api.get<HostGroupType[]>("/host-groups"),
  });
}

export function useCreateHostGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (group: HostGroupPayload) =>
      api.post<HostGroupType>("/host-groups", group),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: hostGroupsQueryKey }),
  });
}

export function useUpdateHostGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      group,
    }: {
      id: string;
      group: HostGroupUpdatePayload;
    }) => api.put<HostGroupType>(`/host-groups/${id}`, group),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: hostsQueryKey }),
        queryClient.invalidateQueries({ queryKey: hostGroupsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["users"] }),
      ]),
  });
}

export function useDeleteHostGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/host-groups/${id}`),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: hostsQueryKey }),
        queryClient.invalidateQueries({ queryKey: hostGroupsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["users"] }),
      ]),
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
        queryClient.invalidateQueries({ queryKey: hostGroupsQueryKey }),
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

export function useAttachHostGroupsMutation() {
  return useHostsMutation(
    ({ hostId, groupIds }: { hostId: number; groupIds: string[] }) =>
      api.post<HostType>(`/hosts/v2/${hostId}/groups`, {
        group_ids: groupIds,
      }),
  );
}

export function useDetachHostGroupsMutation() {
  return useHostsMutation(
    ({ hostId, groupIds }: { hostId: number; groupIds: string[] }) =>
      api.delete<HostType>(`/hosts/v2/${hostId}/groups`, {
        data: { group_ids: groupIds },
      }),
  );
}

export { useInboundsListQuery as useInboundsQuery };
