import { useQuery } from "@tanstack/react-query";

import { api } from "service/http";

import {
  createNodeUsageApiRange,
  formatNodeUsageRangeParam,
  type NodeUsageDateRange,
  type NodeUsagePeriodPreset,
} from "./lib";

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
  period: NodeUsagePeriodPreset = "custom",
) {
  return useQuery({
    queryKey: [
      "node-usage-chart",
      username ?? "all",
      period,
      formatNodeUsageRangeParam(range),
    ],
    queryFn: () => {
      const apiRange = createNodeUsageApiRange(range, period);
      return api.get<UsageResponse>(
        username
          ? `/user/${encodeURIComponent(username)}/usage`
          : "/nodes/usage",
        {
          params: {
            start: apiRange.from.toISOString(),
            end: apiRange.to.toISOString(),
          },
        },
      );
    },
  });
}
