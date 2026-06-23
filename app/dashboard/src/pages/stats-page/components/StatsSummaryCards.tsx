import {
  Ban,
  CircleCheck,
  Gauge,
  TimerOff,
  Wifi,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { StatsSummary } from "../lib/query";

type Props = {
  data?: StatsSummary;
  loading: boolean;
};

export function StatsSummaryCards({ data, loading }: Props) {
  const { t, i18n } = useTranslation();
  const totalUsers = data?.total_user ?? 0;
  const cards = [
    {
      key: "online",
      label: t("statsPage.summary.online"),
      value: data?.online_users,
      icon: Wifi,
      className: "bg-emerald-500/10 text-emerald-500",
    },
    {
      key: "active",
      label: t("statsPage.summary.active"),
      value: data?.users_active,
      icon: CircleCheck,
      className: "bg-blue-500/10 text-blue-500",
    },
    {
      key: "disabled",
      label: t("statsPage.summary.disabled"),
      value: data?.users_disabled,
      icon: Ban,
      className: "bg-zinc-500/10 text-zinc-500",
    },
    {
      key: "limited",
      label: t("statsPage.summary.limited"),
      value: data?.users_limited,
      icon: Gauge,
      className: "bg-amber-500/10 text-amber-500",
    },
    {
      key: "expired",
      label: t("statsPage.summary.expired"),
      value: data?.users_expired,
      icon: TimerOff,
      className: "bg-destructive/10 text-destructive",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ key, label, value, icon: Icon, className }) => (
        <Card size="sm" key={key}>
          <CardContent className="flex items-center gap-3">
            <div className={`rounded-lg p-2.5 ${className}`}>
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm text-muted-foreground">
                  {label}
                </p>
                {loading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <p className="text-xl font-semibold tabular-nums">
                    {(value ?? 0).toLocaleString(i18n.language)}
                  </p>
                )}
              </div>
              {loading ? (
                <Skeleton className="mt-1 ml-auto h-4 w-20" />
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="mt-0.5 ml-auto block cursor-help text-right text-xs text-muted-foreground"
                    >
                      {formatPercent(value ?? 0, totalUsers, i18n.language)}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("statsPage.summary.percentTooltip", {
                      value: (value ?? 0).toLocaleString(i18n.language),
                      total: totalUsers.toLocaleString(i18n.language),
                    })}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatPercent(value: number, total: number, locale: string) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(percent) + "%";
}
