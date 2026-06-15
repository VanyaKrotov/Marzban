import { useQuery } from "@tanstack/react-query";

import { api } from "service/http";

export type StatsGranularity = "day" | "week" | "month";

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

export const statsHistoryQueryKey = (granularity: StatsGranularity) =>
  ["stats", "history", granularity] as const;
export const systemStatsQueryKey = ["statistics-query-key"] as const;

export function useStatsHistoryQuery(granularity: StatsGranularity) {
  return useQuery({
    queryKey: statsHistoryQueryKey(granularity),
    queryFn: () =>
      api.get<StatsHistory>("/stats/history", {
        params: { granularity },
      }),
  });
}

export function useSystemStatsQuery() {
  return useQuery({
    queryKey: systemStatsQueryKey,
    queryFn: () => api.get<SystemStats>("/system"),
    refetchInterval: 10_000,
  });
}
