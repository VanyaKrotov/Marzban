import {
  endOfDay,
  startOfDay,
  startOfWeek,
  subDays,
  subHours,
} from "date-fns";

export type NodeUsageDateRange = {
  from: Date;
  to: Date;
};

export type NodeUsagePeriodPreset =
  | "lastHour"
  | "last3Hours"
  | "last6Hours"
  | "last12Hours"
  | "today"
  | "thisWeek"
  | "last7Days"
  | "last30Days"
  | "last90Days"
  | "custom";

type HourPeriodPreset = Extract<
  NodeUsagePeriodPreset,
  "lastHour" | "last3Hours" | "last6Hours" | "last12Hours"
>;

type DayPeriodPreset = Extract<
  NodeUsagePeriodPreset,
  "last7Days" | "last30Days" | "last90Days"
>;

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
  const hoursByPreset: Record<HourPeriodPreset, number> = {
    lastHour: 1,
    last3Hours: 3,
    last6Hours: 6,
    last12Hours: 12,
  };

  if (isHourPeriodPreset(preset)) {
    return { from: subHours(now, hoursByPreset[preset]), to: now };
  }

  if (preset === "today") {
    return { from: startOfDay(now), to: endOfDay(now) };
  }

  if (preset === "thisWeek") {
    return {
      from: startOfWeek(now, { weekStartsOn: 1 }),
      to: endOfDay(now),
    };
  }

  const daysByPreset: Record<DayPeriodPreset, number> = {
    last7Days: 7,
    last30Days: 30,
    last90Days: 90,
  };
  const days = isDayPeriodPreset(preset) ? daysByPreset[preset] : 30;

  return {
    from: startOfDay(subDays(now, days - 1)),
    to: endOfDay(now),
  };
}

function isHourPeriodPreset(
  preset: Exclude<NodeUsagePeriodPreset, "custom">,
): preset is HourPeriodPreset {
  return (
    preset === "lastHour" ||
    preset === "last3Hours" ||
    preset === "last6Hours" ||
    preset === "last12Hours"
  );
}

function isDayPeriodPreset(
  preset: Exclude<NodeUsagePeriodPreset, "custom">,
): preset is DayPeriodPreset {
  return (
    preset === "last7Days" ||
    preset === "last30Days" ||
    preset === "last90Days"
  );
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
