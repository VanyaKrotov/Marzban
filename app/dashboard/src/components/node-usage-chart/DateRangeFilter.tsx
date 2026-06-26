import { format, startOfDay } from "date-fns";
import {
  enUS as dateEnUS,
  faIR as dateFaIR,
  ru as dateRu,
  zhCN as dateZhCN,
} from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DateRange } from "react-day-picker";
import {
  enUS as calendarEnUS,
  faIR as calendarFaIR,
  ru as calendarRu,
  zhCN as calendarZhCN,
} from "react-day-picker/locale";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  createNodeUsageDateOnlyRange,
  createNodeUsagePresetRange,
  type NodeUsageDateRange,
  type NodeUsagePeriodPreset,
} from "./lib";

type Props = {
  range: NodeUsageDateRange;
  preset: NodeUsagePeriodPreset;
  onChange: (
    range: NodeUsageDateRange,
    preset: NodeUsagePeriodPreset,
  ) => void;
};

const dateLocales = {
  en: dateEnUS,
  fa: dateFaIR,
  ru: dateRu,
  zh: dateZhCN,
};

const calendarLocales = {
  en: calendarEnUS,
  fa: calendarFaIR,
  ru: calendarRu,
  zh: calendarZhCN,
};

export function NodeUsageDateRangeFilter({ range, preset, onChange }: Props) {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange>({
    from: range.from,
    to: range.to,
  });
  const [draftPreset, setDraftPreset] =
    useState<NodeUsagePeriodPreset>(preset);
  const language = i18n.language.split("-")[0] as keyof typeof dateLocales;
  const dateLocale = dateLocales[language] ?? dateEnUS;
  const calendarLocale = calendarLocales[language] ?? calendarEnUS;
  const label =
    preset === "custom"
      ? `${format(range.from, "P", { locale: dateLocale })} - ${format(range.to, "P", { locale: dateLocale })}`
      : t(`statsPage.period.${preset}`);

  useEffect(() => {
    if (!open) return;
    setDraftRange({ from: range.from, to: range.to });
    setDraftPreset(preset);
  }, [open, preset, range.from, range.to]);

  const applyRange = () => {
    if (draftPreset !== "custom") {
      onChange(
        createNodeUsageDateOnlyRange(createNodeUsagePresetRange(draftPreset)),
        draftPreset,
      );
      setOpen(false);
      return;
    }

    if (!draftRange.from) return;
    onChange({
      from: startOfDay(draftRange.from),
      to: startOfDay(draftRange.to ?? draftRange.from),
    }, draftPreset);
    setOpen(false);
  };

  const presets: Exclude<NodeUsagePeriodPreset, "custom">[] = [
    "last_hour",
    "last_3_hours",
    "last_6_hours",
    "last_12_hours",
    "today",
    "this_week",
    "last_7_days",
    "last_30_days",
    "last_90_days",
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <CalendarDays />
          <span className="max-w-48 truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[calc(100vw-2rem)] gap-2 p-2 sm:w-auto"
      >
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {presets.map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={draftPreset === item ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => {
                setDraftRange(
                  createNodeUsageDateOnlyRange(createNodeUsagePresetRange(item)),
                );
                setDraftPreset(item);
              }}
            >
              {t(`statsPage.period.${item}`)}
            </Button>
          ))}
        </div>
        <div className="border-t pt-2">
          <Calendar
            mode="range"
            selected={draftRange}
            onSelect={(nextRange) => {
              if (!nextRange?.from) return;
              setDraftRange(nextRange);
              setDraftPreset("custom");
            }}
            defaultMonth={draftRange.from ?? range.from}
            numberOfMonths={isMobile ? 1 : 2}
            locale={calendarLocale}
            disabled={{ after: new Date() }}
            className={cn(
              "p-1 [--cell-size:--spacing(8)]",
              "max-sm:w-full max-sm:[&_.rdp-months]:flex-col",
            )}
          />
        </div>
        <div className="flex justify-end gap-2 border-t pt-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!draftRange.from}
            onClick={applyRange}
          >
            {t("apply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
