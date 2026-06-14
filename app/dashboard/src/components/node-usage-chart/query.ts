import { useQuery } from "@tanstack/react-query";

import { api } from "service/http";

import type { NodeUsageDateRange } from "./lib";

type NodeUsageResponse = {
  node_id: number | null;
  node_name: string;
  uplink?: number;
  downlink?: number;
  used_traffic?: number;
};

type UsageResponse = {
  usages: NodeUsageResponse[];
};

export function useNodeUsageChartQuery(
  range: NodeUsageDateRange,
  username?: string,
) {
  return useQuery({
    queryKey: [
      "node-usage-chart",
      username ?? "all",
      range.from.toISOString(),
      range.to.toISOString(),
    ],
    queryFn: () =>
      api.get<UsageResponse>(
        username ? `/user/${encodeURIComponent(username)}/usage` : "/nodes/usage",
        {
          params: {
            start: range.from.toISOString(),
            end: range.to.toISOString(),
          },
        },
      ),
  });
}
