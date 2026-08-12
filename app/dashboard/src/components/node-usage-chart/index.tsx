import { BarChart3, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  chartTooltipContentStyle,
  chartTooltipItemStyle,
} from "@/lib/chart-tooltip";
import {
  DEFAULT_NODE_CHART_COLOR,
  createNodeChartColors,
  getNodeChartColor,
} from "@/lib/node-chart-colors";
import { cn } from "@/lib/utils";
import { formatCompactPercent } from "@/pages/stats-page/lib/chart";

import { NodeUsageDateRangeFilter } from "./DateRangeFilter";
import {
  createDefaultNodeUsageRange,
  formatCompactBytes,
  type NodeUsageDateRange,
  type NodeUsagePeriodPreset,
} from "./lib";
import { useNodeUsageChartQuery } from "./query";

type Props = {
  username?: string;
  range?: NodeUsageDateRange;
  preset?: NodeUsagePeriodPreset;
  onPeriodChange?: (
    range: NodeUsageDateRange,
    preset: NodeUsagePeriodPreset,
  ) => void;
  title?: string;
  description?: string;
  className?: string;
  nodeColors?: ReadonlyMap<number, string>;
};

export function NodeUsageChart({
  username,
  range: controlledRange,
  preset: controlledPreset,
  onPeriodChange,
  title,
  description,
  className,
  nodeColors: providedNodeColors,
}: Props) {
  const { t, i18n } = useTranslation();
  const [internalRange, setInternalRange] = useState(
    createDefaultNodeUsageRange,
  );
  const [internalPreset, setInternalPreset] =
    useState<NodeUsagePeriodPreset>("last_30_days");
  const range = controlledRange ?? internalRange;
  const preset = controlledPreset ?? internalPreset;
  const query = useNodeUsageChartQuery(range, username, preset);
  const data = (query.data?.usages ?? []).map((usage) => ({
    nodeId: usage.node_id,
    name: usage.node_name,
    value:
      usage.used_traffic ?? (usage.uplink ?? 0) + (usage.downlink ?? 0),
  }));
  const totalTraffic = data.reduce((sum, usage) => sum + usage.value, 0);
  const hasData = data.some(({ value }) => value > 0);
  const showPeriodFilter = !controlledRange || Boolean(onPeriodChange);
  const nodeColors =
    providedNodeColors ??
    createNodeChartColors(
      data.flatMap(({ nodeId }) => (nodeId === null ? [] : [nodeId])),
    );

  const changePeriod = (
    nextRange: NodeUsageDateRange,
    nextPreset: NodeUsagePeriodPreset,
  ) => {
    if (onPeriodChange) {
      onPeriodChange(nextRange, nextPreset);
      return;
    }
    setInternalRange(nextRange);
    setInternalPreset(nextPreset);
  };

  return (
    <Card className={cn(className)}>
      <CardHeader className="has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle>{title ?? t("statsPage.nodeUsageTitle")}</CardTitle>
        <CardDescription>
          {description ?? t("statsPage.nodeUsageDescription")}
        </CardDescription>
        <CardAction className="row-span-1 text-right">
          {showPeriodFilter ? (
            <NodeUsageDateRangeFilter
              range={range}
              preset={preset}
              onChange={changePeriod}
            />
          ) : query.isLoading ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <div className="text-sm font-medium tabular-nums">
              {formatCompactBytes(totalTraffic)}
            </div>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <Skeleton className="h-80 w-full rounded-xl" />
        ) : query.isError || !hasData ? (
          <Empty className="min-h-80">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart3 />
              </EmptyMedia>
              <EmptyTitle>
                {query.isError
                  ? t("statsPage.loadErrorTitle")
                  : t("statsPage.emptyTitle")}
              </EmptyTitle>
              <EmptyDescription>
                {query.isError
                  ? t("statsPage.loadErrorDescription")
                  : t("statsPage.emptyDescription")}
              </EmptyDescription>
            </EmptyHeader>
            {query.isError && (
              <EmptyContent>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void query.refetch()}
                >
                  <RefreshCw />
                  {t("statsPage.refresh")}
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.nodeId ?? entry.name}
                      fill={getNodeChartColor(entry.nodeId, nodeColors)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={(props) => (
                    <NodeUsageTooltip
                      {...props}
                      locale={i18n.language}
                      total={totalTraffic}
                    />
                  )}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export {
  createNodeUsagePresetRange,
  createNodeUsageApiRange,
  createNodeUsageDateOnlyRange,
  createDefaultNodeUsageRange,
  formatNodeUsageDateParam,
  formatNodeUsageRangeParam,
  type NodeUsageDateRange,
  type NodeUsagePeriodPreset,
} from "./lib";
export { NodeUsageDateRangeFilter } from "./DateRangeFilter";

type NodeUsageTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{
    color?: string;
    name?: string | number;
    value?: number | string | ReadonlyArray<string | number>;
  }>;
  locale: string;
  total: number;
};

function NodeUsageTooltip({
  active,
  payload,
  locale,
  total,
}: NodeUsageTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="min-w-64 rounded-md border p-3 text-xs shadow-md"
      style={chartTooltipContentStyle}
    >
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const value = getTooltipValue(item.value);
          const color = item.color ?? DEFAULT_NODE_CHART_COLOR;

          return (
            <div
              key={`${String(item.name ?? index)}-${index}`}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"
              style={chartTooltipItemStyle}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="truncate">{item.name}</span>
              <span className="font-medium tabular-nums">
                {formatCompactBytes(value)}
                {" ("}
                {formatCompactPercent(value, total, locale)}
                {")"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getTooltipValue(
  value?: number | string | ReadonlyArray<string | number>,
) {
  if (Array.isArray(value)) return Number(value[0] ?? 0);
  return Number(value ?? 0);
}
