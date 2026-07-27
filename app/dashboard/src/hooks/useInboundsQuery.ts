import { useQuery } from "@tanstack/react-query";

import { api } from "service/http";
import type {
  InboundsMap,
  InboundsResponse,
  InboundType,
  XrayCapabilities,
} from "types/Inbound";

export const inboundsQueryKey = ["inbounds"] as const;

export type InboundsQueryOptions = {
  assignedOnly?: boolean;
  includeTag?: string;
};

const fetchInbounds = ({ assignedOnly, includeTag }: InboundsQueryOptions = {}) =>
  api.get<InboundsResponse>("/inbounds", {
    params:
      assignedOnly || includeTag
        ? {
            ...(assignedOnly ? { assigned_only: true } : {}),
            ...(includeTag ? { include_tag: includeTag } : {}),
          }
        : undefined,
  });
const fetchXrayCapabilities = () =>
  api.get<XrayCapabilities>("/xray/capabilities");
const getInboundsQueryKey = (options: InboundsQueryOptions = {}) => [
  ...inboundsQueryKey,
  options.assignedOnly ?? false,
  options.includeTag ?? null,
] as const;
const selectInboundsMap = (inbounds: InboundsResponse): InboundsMap =>
  new Map(Object.entries(inbounds)) as InboundsMap;
const selectInboundsList = (inbounds: InboundsResponse): InboundType[] =>
  Object.values(inbounds).flat();

export function useInboundsByProtocolQuery(enabled = true) {
  return useQuery({
    queryKey: getInboundsQueryKey(),
    queryFn: () => fetchInbounds(),
    enabled,
    select: selectInboundsMap,
  });
}

export function useInboundsListQuery(
  options: InboundsQueryOptions = {},
  enabled = true,
) {
  return useQuery({
    queryKey: getInboundsQueryKey(options),
    queryFn: () => fetchInbounds(options),
    enabled,
    select: selectInboundsList,
  });
}

export function useXrayCapabilitiesQuery(enabled = true) {
  return useQuery({
    queryKey: ["xray-capabilities"],
    queryFn: fetchXrayCapabilities,
    enabled,
  });
}
