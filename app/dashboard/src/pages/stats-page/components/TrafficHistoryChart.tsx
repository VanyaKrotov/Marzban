import { Eye, Network } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  chartTooltipContentStyle,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
} from "@/lib/chart-tooltip";

import {
  CHART_COLORS,
  formatCompactBytes,
  formatCompactPercent,
  formatPeriod,
  formatTime,
} from "../lib/chart";
import type { StatsGranularity, StatsHistory } from "../lib/query";
import { ChartState } from "./ChartState";

type Props = {
  data?: StatsHistory;
  granularity: StatsGranularity;
  loading: boolean;
  error: boolean;
  onGranularityChange: (value: StatsGranularity) => void;
  onRetry: () => void;
};

export function TrafficHistoryChart({
  data,
  granularity,
  loading,
  error,
  onGranularityChange,
  onRetry,
}: Props) {
  const { t, i18n } = useTranslation();
  const [hiddenNodes, setHiddenNodes] = useState<Set<number>>(new Set());
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const traffic = data?.traffic ?? [];
  const chartData = useMemo(() => {
    const periods = traffic[0]?.points ?? [];
    return periods.map((point, index) => ({
      period: point.period,
      ...Object.fromEntries(
        traffic.map((series) => [
          `node_${series.node_id}`,
          series.points[index]?.total ?? 0,
        ]),
      ),
    }));
  }, [traffic]);
  const hasData = traffic.some((series) =>
    series.points.some(({ total }) => total > 0),
  );

  const toggleNode = (nodeId: number, visible: boolean) => {
    setHiddenNodes((current) => {
      const next = new Set(current);
      if (visible) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };
  const formatTrafficPeriod = (value: string) =>
    granularity === "hour"
      ? formatTime(value, i18n.language)
      : formatPeriod(value, granularity, i18n.language);

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="has-data-[slot=card-action]:grid-cols-1 sm:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle>{t("statsPage.trafficTitle")}</CardTitle>
        <CardDescription>{t("statsPage.trafficDescription")}</CardDescription>
        <CardAction className="col-start-1 row-start-3 row-span-1 mt-1 flex flex-wrap justify-start gap-2 sm:col-start-2 sm:row-start-1 sm:row-span-2 sm:mt-0 sm:justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Eye />
                <span className="hidden sm:inline">{t("statsPage.nodes")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuLabel>
                {t("statsPage.visibleNodes")}
              </DropdownMenuLabel>
              {traffic.map((node) => (
                <DropdownMenuCheckboxItem
                  key={node.node_id}
                  checked={!hiddenNodes.has(node.node_id)}
                  onCheckedChange={(checked) =>
                    toggleNode(node.node_id, checked === true)
                  }
                  onSelect={(event) => event.preventDefault()}
                >
                  <Network
                    style={{
                      color:
                        CHART_COLORS[
                          traffic.indexOf(node) % CHART_COLORS.length
                        ],
                    }}
                  />
                  {node.node_name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <GranularitySelect
            value={granularity}
            onChange={onGranularityChange}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartState
          loading={loading}
          error={error}
          empty={!hasData}
          onRetry={onRetry}
        />
        {!loading && !error && hasData && (
          <div>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="period"
                    tickFormatter={(value) => formatTrafficPeriod(String(value))}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCompactBytes(Number(value))}
                    tickLine={false}
                    axisLine={false}
                    width={72}
                  />
                  <Tooltip
                    content={(props) => (
                      <TrafficTooltip
                        {...props}
                        granularity={granularity}
                        locale={i18n.language}
                        traffic={traffic}
                      />
                    )}
                  />
                  {traffic.map((node, index) => (
                    <Line
                      key={node.node_id}
                      type="monotone"
                      dataKey={`node_${node.node_id}`}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={activeNodeId === node.node_id ? 3 : 2}
                      opacity={
                        activeNodeId && activeNodeId !== node.node_id ? 0.25 : 1
                      }
                      dot={false}
                      hide={hiddenNodes.has(node.node_id)}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {traffic.map((node, index) => {
                const hidden = hiddenNodes.has(node.node_id);
                const color = CHART_COLORS[index % CHART_COLORS.length];

                return (
                  <button
                    key={node.node_id}
                    type="button"
                    className="inline-flex h-7 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-45"
                    disabled={hidden}
                    onMouseEnter={() => setActiveNodeId(node.node_id)}
                    onMouseLeave={() => setActiveNodeId(null)}
                    onFocus={() => setActiveNodeId(node.node_id)}
                    onBlur={() => setActiveNodeId(null)}
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="max-w-40 truncate">{node.node_name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type TrafficTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{
    color?: string;
    dataKey?: string | number | ((obj: unknown) => unknown);
    value?: number | string | ReadonlyArray<string | number>;
  }>;
  granularity: StatsGranularity;
  locale: string;
  traffic: StatsHistory["traffic"];
};

function TrafficTooltip({
  active,
  label,
  payload,
  granularity,
  locale,
  traffic,
}: TrafficTooltipProps) {
  const { t } = useTranslation();

  if (!active || !payload?.length) return null;

  const total = payload.reduce(
    (sum, item) => sum + getTooltipValue(item.value),
    0,
  );
  const tooltipItems = payload
    .map((item, index) => {
      const value = getTooltipValue(item.value);
      const percent = total > 0 ? value / total : 0;
      const dataKey =
        typeof item.dataKey === "function" ? undefined : item.dataKey;
      const node = traffic.find(
        ({ node_id }) => `node_${node_id}` === dataKey,
      );
      const color = item.color ?? CHART_COLORS[index % CHART_COLORS.length];

      return {
        color,
        dataKey,
        nodeName: node?.node_name,
        percent,
        value,
      };
    })
    .sort((first, second) => {
      if (second.percent !== first.percent) {
        return second.percent - first.percent;
      }
      return second.value - first.value;
    });

  return (
    <div
      className="min-w-72 rounded-md border p-3 text-xs shadow-md"
      style={chartTooltipContentStyle}
    >
      {label && (
        <div
          className="mb-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 font-medium"
          style={chartTooltipLabelStyle}
        >
          <span>{t("statsPage.tooltip.period")}</span>
          <span className="text-right tabular-nums">
            {granularity === "hour"
              ? formatTime(String(label), locale)
              : formatPeriod(String(label), granularity, locale)}
          </span>
        </div>
      )}
      <div className="grid gap-1.5">
        {tooltipItems.map((item, index) => {
          return (
            <div
              key={String(item.dataKey ?? index)}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"
              style={chartTooltipItemStyle}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.nodeName}</span>
              <span className="font-medium tabular-nums">
                {formatCompactBytes(item.value)}
                {" ("}
                {formatCompactPercent(item.value, total, locale)}
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

function GranularitySelect({
  value,
  onChange,
}: {
  value: StatsGranularity;
  onChange: (value: StatsGranularity) => void;
}) {
  const { t } = useTranslation();
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as StatsGranularity)}
    >
      <SelectTrigger size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="hour">{t("statsPage.hours")}</SelectItem>
          <SelectItem value="day">{t("statsPage.days")}</SelectItem>
          <SelectItem value="week">{t("statsPage.weeks")}</SelectItem>
          <SelectItem value="month">{t("statsPage.months")}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
