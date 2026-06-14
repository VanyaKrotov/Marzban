import { enUS, faIR, ru, zhCN } from "react-day-picker/locale";
import type { Locale } from "react-day-picker";

const calendarLocales: Record<string, Locale> = {
  en: enUS,
  fa: faIR,
  ru,
  zh: zhCN,
};

export const getCalendarLocale = (language?: string) =>
  calendarLocales[language?.split("-")[0].toLowerCase() ?? "en"] ?? enUS;

export const getDateLocaleCode = (language?: string) => {
  const normalizedLanguage = language?.split("-")[0].toLowerCase();

  if (normalizedLanguage === "fa") return "fa-IR";
  if (normalizedLanguage === "ru") return "ru-RU";
  if (normalizedLanguage === "zh") return "zh-CN";
  return "en-US";
};

export const timestampToDate = (timestamp: number | null | undefined) =>
  timestamp ? new Date(timestamp * 1000) : undefined;

export const dateToTimestamp = (date: Date) =>
  Math.floor(date.getTime() / 1000);

export const formatTimeValue = (date: Date | undefined) => {
  if (!date) return "";

  return [date.getHours(), date.getMinutes()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

export const mergeExpiryDate = (
  date: Date,
  currentDate: Date | undefined,
) => {
  const nextDate = new Date(date);

  if (currentDate) {
    nextDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);
  } else {
    nextDate.setHours(23, 59, 0, 0);
  }

  return dateToTimestamp(nextDate);
};

export const mergeExpiryTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const nextDate = new Date(date);
  nextDate.setHours(hours, minutes, 0, 0);
  return dateToTimestamp(nextDate);
};
