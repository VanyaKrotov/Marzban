import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "service/http";

export type NodeGeoResource = {
  filename: string;
  size: number;
  modified_at?: string | null;
  auto_update: boolean;
  url?: string | null;
  cron?: string | null;
  last_updated_at?: string | null;
  next_run_at?: string | null;
  last_error?: string | null;
  last_error_at?: string | null;
};

export type RemoteGeoResourceInput = {
  filename: string;
  url: string;
  cron: string;
  overwrite?: boolean;
};

export const nodeGeoResourcesQueryKey = (nodeId: number) =>
  ["node-geo-resources", nodeId] as const;

function useInvalidateGeoResources(nodeId: number) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: nodeGeoResourcesQueryKey(nodeId),
    });
}

export function useNodeGeoResourcesQuery(nodeId: number) {
  return useQuery({
    queryKey: nodeGeoResourcesQueryKey(nodeId),
    queryFn: () =>
      api.get<NodeGeoResource[]>(`/node/${nodeId}/geo-resources`),
    refetchOnWindowFocus: false,
  });
}

export function useUploadGeoResourceMutation(nodeId: number) {
  const invalidate = useInvalidateGeoResources(nodeId);
  return useMutation({
    mutationFn: ({ file, overwrite }: { file: File; overwrite: boolean }) => {
      const form = new FormData();
      form.append("file", file);
      return api.post(
        `/node/${nodeId}/geo-resources/upload?overwrite=${overwrite}`,
        form,
      );
    },
    onSuccess: invalidate,
  });
}

export function useCreateRemoteGeoResourceMutation(nodeId: number) {
  const invalidate = useInvalidateGeoResources(nodeId);
  return useMutation({
    mutationFn: (input: RemoteGeoResourceInput) =>
      api.post(`/node/${nodeId}/geo-resources/remote`, input),
    onSuccess: invalidate,
  });
}

export function useUpdateGeoResourceScheduleMutation(
  nodeId: number,
) {
  const invalidate = useInvalidateGeoResources(nodeId);
  return useMutation({
    mutationFn: (
      input: Pick<RemoteGeoResourceInput, "url" | "cron" | "filename">,
    ) =>
      api.put(
        `/node/${nodeId}/geo-resources/${encodeURIComponent(input.filename)}/schedule`,
        { url: input.url, cron: input.cron },
      ),
    onSuccess: invalidate,
  });
}

export function useRefreshGeoResourceMutation(nodeId: number) {
  const invalidate = useInvalidateGeoResources(nodeId);
  return useMutation({
    mutationFn: (filename: string) =>
      api.post(
        `/node/${nodeId}/geo-resources/${encodeURIComponent(filename)}/refresh`,
      ),
    onSuccess: invalidate,
  });
}

export function useRenameGeoResourceMutation(nodeId: number) {
  const invalidate = useInvalidateGeoResources(nodeId);
  return useMutation({
    mutationFn: ({
      filename,
      newFilename,
      overwrite,
    }: {
      filename: string;
      newFilename: string;
      overwrite: boolean;
    }) =>
      api.post(
        `/node/${nodeId}/geo-resources/${encodeURIComponent(filename)}/rename`,
        { filename: newFilename, overwrite },
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteGeoResourcesMutation(nodeId: number) {
  const invalidate = useInvalidateGeoResources(nodeId);
  return useMutation({
    mutationFn: (filenames: string[]) =>
      api.post(`/node/${nodeId}/geo-resources/bulk-delete`, { filenames }),
    onSuccess: invalidate,
  });
}

export async function downloadNodeGeoResource(
  nodeId: number,
  filename: string,
) {
  const blob = await api.get<Blob>(
    `/node/${nodeId}/geo-resources/${encodeURIComponent(filename)}/download`,
    { responseType: "blob" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
