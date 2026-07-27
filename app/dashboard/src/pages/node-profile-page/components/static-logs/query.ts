import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "service/http";

export type NodeStaticLogFile = {
  type: "access" | "error";
  filename: string;
  size: number;
  modified_at: string;
  active: boolean;
};

export const nodeStaticLogsQueryKey = (nodeId: number) =>
  ["node-static-logs", nodeId] as const;

export function useNodeStaticLogsQuery(nodeId: number) {
  return useQuery({
    queryKey: nodeStaticLogsQueryKey(nodeId),
    queryFn: () => api.get<NodeStaticLogFile[]>(`/node/${nodeId}/static-logs`),
    refetchOnWindowFocus: false,
  });
}

export function useDeleteNodeStaticLogMutation(nodeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, filename }: Pick<NodeStaticLogFile, "type" | "filename">) =>
      api.delete(
        `/node/${nodeId}/static-logs/${type}/${encodeURIComponent(filename)}`,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: nodeStaticLogsQueryKey(nodeId) }),
  });
}

export async function downloadNodeStaticLog(
  nodeId: number,
  type: NodeStaticLogFile["type"],
  filename: string,
) {
  const blob = await api.get<Blob>(
    `/node/${nodeId}/static-logs/${type}/${encodeURIComponent(filename)}/download`,
    { responseType: "blob" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
