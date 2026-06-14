import {
  endOfDay,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";

export type NodeUsageDateRange = {
  from: Date;
  to: Date;
};

export type NodeUsagePeriodPreset =
  | "today"
  | "thisWeek"
  | "last7Days"
  | "last30Days"
  | "last90Days"
  | "custom";

export const NODE_USAGE_CHART_COLORS = [
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-5)",
  "#14b8a6",
  "#f59e0b",
  "#e11d48",
];

export function createNodeUsagePresetRange(
  preset: Exclude<NodeUsagePeriodPreset, "custom">,
): NodeUsageDateRange {
  const now = new Date();

  if (preset === "today") {
    return { from: startOfDay(now), to: endOfDay(now) };
  }

  if (preset === "thisWeek") {
    return {
      from: startOfWeek(now, { weekStartsOn: 1 }),
      to: endOfDay(now),
    };
  }

  const days = {
    last7Days: 7,
    last30Days: 30,
    last90Days: 90,
  }[preset];

  return {
    from: startOfDay(subDays(now, days - 1)),
    to: endOfDay(now),
  };
}

export function createDefaultNodeUsageRange() {
  return createNodeUsagePresetRange("last30Days");
}

export function formatCompactBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  const amount = value / 1024 ** index;
  return `${amount >= 10 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}
