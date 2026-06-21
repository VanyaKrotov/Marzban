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

import { CHART_COLORS, formatCompactBytes, formatPeriod } from "../lib/chart";
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
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 8, right: 16 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="period"
                  tickFormatter={(value) =>
                    formatPeriod(String(value), granularity, i18n.language)
                  }
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
                  labelFormatter={(value) =>
                    formatPeriod(String(value), granularity, i18n.language)
                  }
                  formatter={(value, name) => {
                    const node = traffic.find(
                      ({ node_id }) => `node_${node_id}` === name,
                    );
                    return [formatCompactBytes(Number(value)), node?.node_name];
                  }}
                  contentStyle={chartTooltipContentStyle}
                  itemStyle={chartTooltipItemStyle}
                  labelStyle={chartTooltipLabelStyle}
                />
                {traffic.map((node, index) => (
                  <Line
                    key={node.node_id}
                    type="monotone"
                    dataKey={`node_${node.node_id}`}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    hide={hiddenNodes.has(node.node_id)}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
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
          <SelectItem value="day">{t("statsPage.days")}</SelectItem>
          <SelectItem value="week">{t("statsPage.weeks")}</SelectItem>
          <SelectItem value="month">{t("statsPage.months")}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
