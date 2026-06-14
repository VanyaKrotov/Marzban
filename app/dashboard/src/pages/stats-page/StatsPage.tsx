import { RefreshCw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import Page from "@/components/page";
import {
  createDefaultNodeUsageRange,
  NodeUsageChart,
  type NodeUsageDateRange,
  type NodeUsagePeriodPreset,
} from "@/components/node-usage-chart";
import { Button } from "@/components/ui/button";

import { StatsSummaryCards } from "./components/StatsSummaryCards";
import { TrafficHistoryChart } from "./components/TrafficHistoryChart";
import { UserGrowthChart } from "./components/UserGrowthChart";
import {
  type StatsGranularity,
  useStatsHistoryQuery,
} from "./lib/query";

export function StatsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaults = useMemo(createDefaultNodeUsageRange, []);
  const piePreset = parsePreset(searchParams.get("period"));
  const pieRange = useMemo(
    () => ({
      from: parseDate(searchParams.get("from"), defaults.from, false),
      to: parseDate(searchParams.get("to"), defaults.to, true),
    }),
    [defaults.from, defaults.to, searchParams],
  );
  const granularity = parseGranularity(searchParams.get("granularity"));
  const historyQuery = useStatsHistoryQuery(granularity);

  useEffect(() => {
    const from = formatDateParam(pieRange.from);
    const to = formatDateParam(pieRange.to);
    if (
      searchParams.get("from") === from &&
      searchParams.get("to") === to &&
      searchParams.get("period") === piePreset &&
      searchParams.get("granularity") === granularity
    ) {
      return;
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("from", from);
        next.set("to", to);
        next.set("period", piePreset);
        next.set("granularity", granularity);
        return next;
      },
      { replace: true },
    );
  }, [
    granularity,
    piePreset,
    pieRange.from,
    pieRange.to,
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
        next.set("from", formatDateParam(range.from));
        next.set("to", formatDateParam(range.to));
        next.set("period", preset);
        return next;
      },
      { replace: true },
    );
  };

  const updateGranularity = (value: StatsGranularity) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("granularity", value);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <Page>
      <Page.Header
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-2 sm:px-3"
            disabled={historyQuery.isFetching}
            onClick={() => void historyQuery.refetch()}
            aria-label={t("statsPage.refresh").toString()}
          >
            <RefreshCw
              className={historyQuery.isFetching ? "animate-spin" : undefined}
            />
            <span className="hidden sm:inline">{t("statsPage.refresh")}</span>
          </Button>
        }
      >
        <div>
          <h1 className="font-semibold">{t("statsPage.title")}</h1>
          <p className="hidden text-sm text-muted-foreground sm:block">
            {t("statsPage.description")}
          </p>
        </div>
      </Page.Header>

      <div className="flex flex-col gap-4">
        <StatsSummaryCards />
        <div className="grid gap-4 lg:grid-cols-2">
          <NodeUsageChart
            range={pieRange}
            preset={piePreset}
            onPeriodChange={updatePeriod}
          />
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
            onGranularityChange={updateGranularity}
            onRetry={() => void historyQuery.refetch()}
          />
        </div>
      </div>
    </Page>
  );
}

const PERIOD_PRESETS: NodeUsagePeriodPreset[] = [
  "today",
  "thisWeek",
  "last7Days",
  "last30Days",
  "last90Days",
  "custom",
];

const GRANULARITIES: StatsGranularity[] = ["day", "week", "month"];

function parsePreset(value: string | null): NodeUsagePeriodPreset {
  return PERIOD_PRESETS.includes(value as NodeUsagePeriodPreset)
    ? (value as NodeUsagePeriodPreset)
    : "last30Days";
}

function parseGranularity(value: string | null): StatsGranularity {
  return GRANULARITIES.includes(value as StatsGranularity)
    ? (value as StatsGranularity)
    : "day";
}

function parseDate(value: string | null, fallback: Date, endOfDate: boolean) {
  if (!value) return fallback;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fallback;
  if (endOfDate) date.setHours(23, 59, 59, 999);
  return date;
}

function formatDateParam(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
