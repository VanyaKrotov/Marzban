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
  chartTooltipLabelStyle,
} from "@/lib/chart-tooltip";
import { cn } from "@/lib/utils";

import { NodeUsageDateRangeFilter } from "./DateRangeFilter";
import {
  createDefaultNodeUsageRange,
  formatCompactBytes,
  NODE_USAGE_CHART_COLORS,
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
};

export function NodeUsageChart({
  username,
  range: controlledRange,
  preset: controlledPreset,
  onPeriodChange,
  title,
  description,
  className,
}: Props) {
  const { t, i18n } = useTranslation();
  const [internalRange, setInternalRange] = useState(
    createDefaultNodeUsageRange,
  );
  const [internalPreset, setInternalPreset] =
    useState<NodeUsagePeriodPreset>("last30Days");
  const range = controlledRange ?? internalRange;
  const preset = controlledPreset ?? internalPreset;
  const query = useNodeUsageChartQuery(range, username);
  const data = (query.data?.usages ?? []).map((usage) => ({
    name: usage.node_name,
    value:
      usage.used_traffic ?? (usage.uplink ?? 0) + (usage.downlink ?? 0),
  }));
  const totalTraffic = data.reduce((sum, usage) => sum + usage.value, 0);
  const hasData = data.some(({ value }) => value > 0);
  const showPeriodFilter = !controlledRange || Boolean(onPeriodChange);

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
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={
                        NODE_USAGE_CHART_COLORS[
                          index % NODE_USAGE_CHART_COLORS.length
                        ]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => {
                    const numericValue = Number(value);
                    return `${formatCompactBytes(numericValue)} (${formatPercent(
                      numericValue,
                      totalTraffic,
                      i18n.language,
                    )})`;
                  }}
                  contentStyle={chartTooltipContentStyle}
                  itemStyle={chartTooltipItemStyle}
                  labelStyle={chartTooltipLabelStyle}
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
  createDefaultNodeUsageRange,
  type NodeUsageDateRange,
  type NodeUsagePeriodPreset,
} from "./lib";
export { NodeUsageDateRangeFilter } from "./DateRangeFilter";

function formatPercent(value: number, total: number, locale: string) {
  const percent = total > 0 ? value / total : 0;
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(percent);
}
