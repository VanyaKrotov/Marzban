import { useQuery } from "@tanstack/react-query";

import { api } from "service/http";
import {
  createNodeUsageApiRange,
  formatNodeUsageRangeParam,
  type NodeUsageDateRange,
  type NodeUsagePeriodPreset,
} from "@/components/node-usage-chart";

export type StatsGranularity = "hour" | "day" | "week" | "month";

export type NodeTrafficPoint = {
  period: string;
  uplink: number;
  downlink: number;
  total: number;
};

export type NodeTrafficSeries = {
  node_id: number;
  node_name: string;
  points: NodeTrafficPoint[];
};

export type UserGrowthPoint = {
  period: string;
  count: number;
  total: number;
  growth_percent: number | null;
};

export type StatsHistory = {
  start: string;
  end: string;
  granularity: StatsGranularity;
  traffic: NodeTrafficSeries[];
  users: UserGrowthPoint[];
};

export type SystemStats = {
  total_user: number;
  online_users: number;
  users_active: number;
  users_disabled: number;
  users_limited: number;
  users_expired: number;
};

export type StatsSummary = {
  start: string;
  end: string;
  total_user: number;
  online_users: number;
  users_active: number;
  users_disabled: number;
  users_expired: number;
  users_limited: number;
};

export function resolveStatsGranularity(
  range: NodeUsageDateRange,
  period: NodeUsagePeriodPreset,
): StatsGranularity {
  const apiRange = createNodeUsageApiRange(range, period);
  const durationHours = Math.max(
    0,
    (apiRange.to.getTime() - apiRange.from.getTime()) / (60 * 60 * 1000),
  );

  if (durationHours <= 90) return "hour";
  if (durationHours <= 90 * 24) return "day";
  if (durationHours <= 90 * 24 * 7) return "week";
  return "month";
}

export const statsHistoryQueryKey = (
  granularity: StatsGranularity,
  range: NodeUsageDateRange,
  period: NodeUsagePeriodPreset,
  timeZone: string,
) =>
  [
    "stats",
    "history",
    granularity,
    period,
    timeZone,
    formatNodeUsageRangeParam(range),
  ] as const;
export const systemStatsQueryKey = ["statistics-query-key"] as const;
export const statsSummaryQueryKey = (
  range: NodeUsageDateRange,
  period: NodeUsagePeriodPreset,
) =>
  [
    "stats",
    "summary",
    period,
    formatNodeUsageRangeParam(range),
  ] as const;

export function useStatsHistoryQuery(
  granularity: StatsGranularity,
  range: NodeUsageDateRange,
  period: NodeUsagePeriodPreset,
) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  return useQuery({
    queryKey: statsHistoryQueryKey(granularity, range, period, timeZone),
    queryFn: () => {
      const apiRange = createNodeUsageApiRange(range, period);
      return api.get<StatsHistory>("/stats/history", {
        params: {
          granularity,
          start: apiRange.from.toISOString(),
          end: apiRange.to.toISOString(),
          time_zone: timeZone,
        },
      });
    },
  });
}

export function useStatsSummaryQuery(
  range: NodeUsageDateRange,
  period: NodeUsagePeriodPreset,
) {
  return useQuery({
    queryKey: statsSummaryQueryKey(range, period),
    queryFn: () => {
      const apiRange = createNodeUsageApiRange(range, period);
      return api.get<StatsSummary>("/stats/summary", {
        params: {
          start: apiRange.from.toISOString(),
          end: apiRange.to.toISOString(),
        },
      });
    },
  });
}

export function useSystemStatsQuery(refetchInterval: number | false = 10_000) {
  return useQuery({
    queryKey: systemStatsQueryKey,
    queryFn: () => api.get<SystemStats>("/system"),
    refetchInterval,
  });
}
