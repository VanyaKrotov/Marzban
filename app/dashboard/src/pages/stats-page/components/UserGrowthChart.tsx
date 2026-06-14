import { useTranslation } from "react-i18next";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { formatPeriod } from "../lib/chart";
import type { StatsGranularity, StatsHistory } from "../lib/query";
import { ChartState } from "./ChartState";

type Props = {
  data?: StatsHistory;
  granularity: StatsGranularity;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

export function UserGrowthChart({
  data,
  granularity,
  loading,
  error,
  onRetry,
}: Props) {
  const { t, i18n } = useTranslation();
  const users = data?.users ?? [];
  const hasData = users.some(({ count }) => count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("statsPage.usersTitle")}</CardTitle>
        <CardDescription>{t("statsPage.usersDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartState
          loading={loading}
          error={error}
          empty={!hasData}
          onRetry={onRetry}
        />
        {!loading && !error && hasData && (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={users} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="period"
                  tickFormatter={(value) =>
                    formatPeriod(String(value), granularity, i18n.language)
                  }
                  tickLine={false}
                  axisLine={false}
                  minTickGap={20}
                />
                <YAxis
                  yAxisId="count"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <YAxis
                  yAxisId="growth"
                  orientation="right"
                  tickFormatter={(value) => `${value}%`}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  labelFormatter={(value) =>
                    formatPeriod(String(value), granularity, i18n.language)
                  }
                  formatter={(value, name, item) => {
                    if (name === "growth_percent") {
                      return [
                        value == null ? "—" : `${Number(value).toFixed(1)}%`,
                        t("statsPage.growth"),
                      ];
                    }
                    return [
                      Number(value).toLocaleString(i18n.language),
                      t("statsPage.newUsers"),
                      item.payload,
                    ];
                  }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar
                  yAxisId="count"
                  dataKey="count"
                  fill="var(--chart-2)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={36}
                />
                <Line
                  yAxisId="growth"
                  type="monotone"
                  dataKey="growth_percent"
                  stroke="var(--chart-5)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        {!loading && !error && users.length > 0 && (
          <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">
              {t("statsPage.totalUsers")}
            </span>
            <span className="font-medium tabular-nums">
              {users.at(-1)?.total.toLocaleString(i18n.language)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
