import { RefreshCw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { startOfDay } from "date-fns";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import Page from "@/components/page";
import {
  createDefaultNodeUsageRange,
  createNodeUsageDateOnlyRange,
  createNodeUsagePresetRange,
  formatNodeUsageRangeParam,
  NodeUsageChart,
  NodeUsageDateRangeFilter,
  type NodeUsageDateRange,
  type NodeUsagePeriodPreset,
} from "@/components/node-usage-chart";
import { Button } from "@/components/ui/button";

import { StatsSummaryCards } from "./components/StatsSummaryCards";
import { TrafficHistoryChart } from "./components/TrafficHistoryChart";
import { UserGrowthChart } from "./components/UserGrowthChart";
import {
  resolveStatsGranularity,
  useStatsHistoryQuery,
  useSystemStatsQuery,
} from "./lib/query";

export function StatsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaults = useMemo(createDefaultNodeUsageRange, []);
  const piePreset = parsePreset(searchParams.get("period"));
  const urlRange = useMemo(
    () => parseRange(searchParams, defaults),
    [defaults, searchParams],
  );
  const pieRange = useMemo(
    () => getEffectiveRange(piePreset, urlRange),
    [piePreset, urlRange],
  );
  const granularity = resolveStatsGranularity(pieRange, piePreset);
  const historyQuery = useStatsHistoryQuery(granularity, pieRange, piePreset);
  const systemStatsQuery = useSystemStatsQuery();
  const nodeUsageQueryKey = [
    "node-usage-chart",
    "all",
    piePreset,
    formatNodeUsageRangeParam(pieRange),
  ] as const;
  const nodeUsageFetching = useIsFetching({ queryKey: nodeUsageQueryKey });
  const refreshing =
    historyQuery.isFetching ||
    systemStatsQuery.isFetching ||
    nodeUsageFetching > 0;

  useEffect(() => {
    const range = formatNodeUsageRangeParam(pieRange);
    if (
      searchParams.get("range") === range &&
      searchParams.get("period") === piePreset &&
      !searchParams.has("granularity")
    ) {
      return;
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("from");
        next.delete("to");
        next.delete("granularity");
        next.set("range", range);
        next.set("period", piePreset);
        return next;
      },
      { replace: true },
    );
  }, [
    piePreset,
    pieRange,
    searchParams,
    setSearchParams,
  ]);

  const updatePeriod = (
    range: NodeUsageDateRange,
    preset: NodeUsagePeriodPreset,
  ) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("from");
        next.delete("to");
        next.delete("granularity");
        next.set("range", formatNodeUsageRangeParam(range));
        next.set("period", preset);
        return next;
      },
      { replace: true },
    );
  };

  const refreshStats = () => {
    void Promise.all([
      historyQuery.refetch(),
      systemStatsQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: nodeUsageQueryKey }),
    ]);
  };

  return (
    <Page>
      <Page.Header
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={refreshing}
              onClick={refreshStats}
              aria-label={t("statsPage.refresh").toString()}
            >
              <RefreshCw className={refreshing ? "animate-spin" : undefined} />
            </Button>
            <NodeUsageDateRangeFilter
              range={pieRange}
              preset={piePreset}
              onChange={updatePeriod}
            />
          </div>
        }
      >
        <h1 className="font-semibold">{t("statsPage.title")}</h1>
      </Page.Header>

      <div className="flex flex-col gap-4">
        <StatsSummaryCards
          data={systemStatsQuery.data}
          loading={systemStatsQuery.isLoading}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <NodeUsageChart range={pieRange} preset={piePreset} />
          <UserGrowthChart
            data={historyQuery.data}
            granularity={granularity}
            loading={historyQuery.isLoading}
            error={historyQuery.isError}
            onRetry={() => void historyQuery.refetch()}
          />
          <TrafficHistoryChart
            data={historyQuery.data}
            granularity={granularity}
            loading={historyQuery.isLoading}
            error={historyQuery.isError}
            onRetry={() => void historyQuery.refetch()}
          />
        </div>
      </div>
    </Page>
  );
}

const PERIOD_PRESETS: NodeUsagePeriodPreset[] = [
  "last_hour",
  "last_3_hours",
  "last_6_hours",
  "last_12_hours",
  "today",
  "this_week",
  "last_7_days",
  "last_30_days",
  "last_90_days",
  "custom",
];

function parsePreset(value: string | null): NodeUsagePeriodPreset {
  const normalized = normalizePreset(value);
  return PERIOD_PRESETS.includes(normalized as NodeUsagePeriodPreset)
    ? (normalized as NodeUsagePeriodPreset)
    : "today";
}

function normalizePreset(value: string | null) {
  const legacyPresets: Record<string, NodeUsagePeriodPreset> = {
    lastHour: "last_hour",
    last3Hours: "last_3_hours",
    last6Hours: "last_6_hours",
    last12Hours: "last_12_hours",
    thisWeek: "this_week",
    last7Days: "last_7_days",
    last30Days: "last_30_days",
    last90Days: "last_90_days",
  };
  return value ? (legacyPresets[value] ?? value) : null;
}

function parseRange(
  searchParams: URLSearchParams,
  fallback: NodeUsageDateRange,
) {
  const range = searchParams.get("range");
  if (range) {
    const [from, to] = range.split("_");
    return {
      from: parseDate(from, fallback.from),
      to: parseDate(to, fallback.to),
    };
  }

  return {
    from: parseDate(searchParams.get("from"), fallback.from),
    to: parseDate(searchParams.get("to"), fallback.to),
  };
}

function getEffectiveRange(
  preset: NodeUsagePeriodPreset,
  range: NodeUsageDateRange,
) {
  if (preset === "custom") return createNodeUsageDateOnlyRange(range);
  return createNodeUsageDateOnlyRange(createNodeUsagePresetRange(preset));
}

function parseDate(value: string | null | undefined, fallback: Date) {
  if (!value) return fallback;
  const date = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fallback;
  return startOfDay(date);
}
