import type { StatsGranularity } from "./query";

export const CHART_COLORS = [
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-5)",
  "#14b8a6",
  "#f59e0b",
  "#e11d48",
];

export function formatPeriod(
  value: string,
  granularity: StatsGranularity,
  locale: string,
) {
  const date = new Date(value);
  if (granularity === "hour") {
    return formatHourRange(date, locale);
  }

  const options: Intl.DateTimeFormatOptions =
    granularity === "month"
      ? { month: "short", year: "numeric" }
      : { day: "numeric", month: "short" };
  return new Intl.DateTimeFormat(locale, options).format(date);
}

function formatHourRange(date: Date, locale: string) {
  const nextHour = new Date(date);
  nextHour.setHours(nextHour.getHours() + 1);
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  });
  return `${formatter.format(date)}-${formatter.format(nextHour)}`;
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

export function formatCompactPercent(
  value: number,
  total: number,
  locale: string,
) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(percent);
  return `${formatted}%`;
}
