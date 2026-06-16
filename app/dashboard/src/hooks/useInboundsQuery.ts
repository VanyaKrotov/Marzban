import { useQuery } from "@tanstack/react-query";

import { api } from "service/http";
import type {
  InboundsMap,
  InboundsResponse,
  InboundType,
  XrayCapabilities,
} from "types/Inbound";

export const inboundsQueryKey = ["inbounds"] as const;

const fetchInbounds = () => api.get<InboundsResponse>("/inbounds");
const fetchXrayCapabilities = () =>
  api.get<XrayCapabilities>("/xray/capabilities");
const selectInboundsMap = (inbounds: InboundsResponse): InboundsMap =>
  new Map(Object.entries(inbounds)) as InboundsMap;
const selectInboundsList = (inbounds: InboundsResponse): InboundType[] =>
  Object.values(inbounds).flat();

export function useInboundsByProtocolQuery(enabled = true) {
  return useQuery({
    queryKey: inboundsQueryKey,
    queryFn: fetchInbounds,
    enabled,
    select: selectInboundsMap,
  });
}

export function useInboundsListQuery(enabled = true) {
  return useQuery({
    queryKey: inboundsQueryKey,
    queryFn: fetchInbounds,
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
