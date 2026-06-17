import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "service/http";
import type { NodeType } from "types/Node";

export type NodeSettings = {
  min_node_version: string;
  certificate: string;
};

export type NodeCertificate = {
  id: number;
  node_id: number;
  domain: string;
  certificate: string;
  certificate_file: string;
  key_file: string;
  expires_at?: string | null;
  active: boolean;
  inbound_tags: string[];
  created_at: string;
  updated_at: string;
};

export const nodeSettingsQueryKey = ["node-settings"] as const;
export const nodesQueryKey = ["nodes"] as const;
export const nodeQueryKey = (nodeId: number) =>
  [...nodesQueryKey, nodeId] as const;
export const nodeCertificatesQueryKey = (nodeId: number) =>
  ["node-certificates", nodeId] as const;

export function useNodesPageQuery() {
  return useQuery({
    queryKey: nodesQueryKey,
    queryFn: () => api.get<NodeType[]>("/nodes"),
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useNodeQuery(
  nodeId?: number | null,
  enabled = true,
  placeholderData?: NodeType,
) {
  return useQuery({
    queryKey: nodeQueryKey(nodeId ?? 0),
    queryFn: () => api.get<NodeType>(`/node/${nodeId}`),
    enabled: Boolean(nodeId) && enabled,
    placeholderData,
    refetchInterval: enabled
      ? ({ state }) => (state.data?.restart_required ? 3_000 : 10_000)
      : false,
    refetchOnWindowFocus: false,
  });
}

export function useNodeSettingsQuery(enabled: boolean) {
  return useQuery({
    queryKey: nodeSettingsQueryKey,
    queryFn: () => api.get<NodeSettings>("/node/settings"),
    enabled,
    staleTime: Infinity,
  });
}

export function useNodeCertificatesQuery(
  nodeId?: number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: nodeCertificatesQueryKey(nodeId ?? 0),
    queryFn: () => api.get<NodeCertificate[]>(`/node/${nodeId}/certificates`),
    enabled: Boolean(nodeId) && enabled,
  });
}

function useInvalidateNodes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: nodesQueryKey });
}

export function useCreateNodeMutation() {
  const invalidate = useInvalidateNodes();
  return useMutation({
    mutationFn: (node: NodeType) => api.post("/node", node),
    onSuccess: invalidate,
  });
}

export function useUpdateNodeMutation() {
  const invalidate = useInvalidateNodes();
  return useMutation({
    mutationFn: (node: NodeType) => api.put(`/node/${node.id}`, node),
    onSuccess: invalidate,
  });
}

export function useReconnectNodeMutation() {
  const invalidate = useInvalidateNodes();
  return useMutation({
    mutationFn: (node: NodeType) => api.post(`/node/${node.id}/reconnect`),
    onSuccess: invalidate,
  });
}

export function useRestartNodeMutation() {
  const invalidate = useInvalidateNodes();
  return useMutation({
    mutationFn: (nodeId: number) => api.post(`/node/${nodeId}/restart`),
    onSuccess: invalidate,
  });
}

export function useDeleteNodeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: number) => api.delete(`/node/${nodeId}`),
    onSuccess: (_, nodeId) => {
      queryClient.removeQueries({
        queryKey: nodeQueryKey(nodeId),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: nodesQueryKey,
        exact: true,
      });
    },
  });
}

export function useIssueCertificateMutation(nodeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      domain,
      email,
      force = false,
    }: {
      domain: string;
      email?: string;
      force?: boolean;
    }) =>
      api.post<NodeCertificate>(`/node/${nodeId}/certificates/issue`, {
        domain,
        email: email || null,
        force,
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: nodeCertificatesQueryKey(nodeId),
        }),
        queryClient.invalidateQueries({ queryKey: nodesQueryKey }),
      ]),
  });
}

export function useDeleteCertificateMutation(nodeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (certificateId: number) =>
      api.delete(`/node/${nodeId}/certificates/${certificateId}`),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: nodeCertificatesQueryKey(nodeId),
        }),
        queryClient.invalidateQueries({ queryKey: nodesQueryKey }),
      ]),
  });
}
