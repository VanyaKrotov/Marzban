import {
  endOfDay,
  format,
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
  | "last_hour"
  | "last_3_hours"
  | "last_6_hours"
  | "last_12_hours"
  | "today"
  | "this_week"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "custom";

type HourPeriodPreset = Extract<
  NodeUsagePeriodPreset,
  "last_hour" | "last_3_hours" | "last_6_hours" | "last_12_hours"
>;

type DayPeriodPreset = Extract<
  NodeUsagePeriodPreset,
  "last_7_days" | "last_30_days" | "last_90_days"
>;

export function createNodeUsagePresetRange(
  preset: Exclude<NodeUsagePeriodPreset, "custom">,
): NodeUsageDateRange {
  const now = new Date();
  const hoursByPreset: Record<HourPeriodPreset, number> = {
    last_hour: 1,
    last_3_hours: 3,
    last_6_hours: 6,
    last_12_hours: 12,
  };

  if (isHourPeriodPreset(preset)) {
    return { from: subHours(now, hoursByPreset[preset]), to: now };
  }

  if (preset === "today") {
    return { from: startOfDay(now), to: endOfDay(now) };
  }

  if (preset === "this_week") {
    return {
      from: startOfWeek(now, { weekStartsOn: 1 }),
      to: endOfDay(now),
    };
  }

  const daysByPreset: Record<DayPeriodPreset, number> = {
    last_7_days: 7,
    last_30_days: 30,
    last_90_days: 90,
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
    preset === "last_hour" ||
    preset === "last_3_hours" ||
    preset === "last_6_hours" ||
    preset === "last_12_hours"
  );
}

function isDayPeriodPreset(
  preset: Exclude<NodeUsagePeriodPreset, "custom">,
): preset is DayPeriodPreset {
  return (
    preset === "last_7_days" ||
    preset === "last_30_days" ||
    preset === "last_90_days"
  );
}

export function createDefaultNodeUsageRange() {
  return createNodeUsageDateOnlyRange(createNodeUsagePresetRange("last_30_days"));
}

export function createNodeUsageApiRange(
  range: NodeUsageDateRange,
  period: NodeUsagePeriodPreset,
) {
  if (period !== "custom") return createNodeUsagePresetRange(period);

  return {
    from: startOfDay(range.from),
    to: endOfDay(range.to),
  };
}

export function createNodeUsageDateOnlyRange(
  range: NodeUsageDateRange,
): NodeUsageDateRange {
  return {
    from: startOfDay(range.from),
    to: startOfDay(range.to),
  };
}

export function formatNodeUsageRangeParam(range: NodeUsageDateRange) {
  return `${formatNodeUsageDateParam(range.from)}_${formatNodeUsageDateParam(range.to)}`;
}

export function formatNodeUsageDateParam(value: Date) {
  return format(value, "yyyy-MM-dd");
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
