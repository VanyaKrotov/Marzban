import { format, formatDistanceToNowStrict, isSameYear } from "date-fns";
import {
  enUS as dateEnUS,
  faIR as dateFaIR,
  ru as dateRu,
  zhCN as dateZhCN,
} from "date-fns/locale";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ProxyType, User } from "types/User";
import { UserActions } from "./UserActions";
import { UserStatus } from "./UserStatus";
import { UserUsage } from "./UserUsage";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
const FULL_DATE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

type OnlineState = "never" | "stale" | "online";

const dateLocales = {
  en: dateEnUS,
  fa: dateFaIR,
  ru: dateRu,
  zh: dateZhCN,
};

function parseOnlineAt(lastOnline: string | null) {
  if (!lastOnline) return null;
  const timestamp = new Date(
    lastOnline.endsWith("Z") ? lastOnline : `${lastOnline}Z`,
  ).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getOnlineState(lastOnline: string | null): OnlineState {
  const timestamp = parseOnlineAt(lastOnline);
  if (!timestamp) return "never";
  return Date.now() - timestamp <= ONLINE_THRESHOLD_MS ? "online" : "stale";
}

function getLastOnlineText(
  lastOnline: string | null,
  t: (key: string, options?: Record<string, unknown>) => string,
  locale: string,
) {
  const timestamp = parseOnlineAt(lastOnline);
  if (!timestamp) return t("usersTable.onlineNever");

  const state = getOnlineState(lastOnline);
  if (state === "online") return t("usersTable.online");

  const elapsedMs = Math.max(Date.now() - timestamp, 0);
  if (elapsedMs > FULL_DATE_THRESHOLD_MS) {
    const date = new Date(timestamp);
    const language = locale.split("-")[0] as keyof typeof dateLocales;
    const dateLocale = dateLocales[language] ?? dateEnUS;
    const value = format(
      date,
      isSameYear(date, new Date()) ? "d MMMM" : "d MMMM yyyy",
      { locale: dateLocale },
    );

    return t("usersTable.wasOnlineDate", { value });
  }

  const language = locale.split("-")[0] as keyof typeof dateLocales;
  const dateLocale = dateLocales[language] ?? dateEnUS;
  const value = formatDistanceToNowStrict(new Date(timestamp), {
    addSuffix: true,
    locale: dateLocale,
    roundingMethod: "floor",
  });

  return t("usersTable.wasOnlineRelative", { value });
}

type UserRowProps = {
  user: User;
  onEdit: (user: User) => void;
  onShowQr: (user: User) => void;
};

const protocolLabels: Record<keyof ProxyType, string> = {
  vmess: "VMess",
  vless: "VLESS",
  trojan: "Trojan",
  shadowsocks: "Shadowsocks",
  hysteria: "Hysteria",
};

function getUserProtocols(proxies: ProxyType) {
  return (Object.keys(protocolLabels) as (keyof ProxyType)[]).filter(
    (protocol) => proxies[protocol],
  );
}

function UserProtocols({
  user,
  compact = false,
}: {
  user: User;
  compact?: boolean;
}) {
  const protocols = getUserProtocols(user.proxies);

  if (protocols.length === 0) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {protocols.map((protocol) => (
        <Badge
          key={protocol}
          variant="secondary"
          className={compact ? "h-5 px-1.5 text-[11px]" : undefined}
        >
          {protocolLabels[protocol]}
        </Badge>
      ))}
    </div>
  );
}

function OnlineIndicator({
  lastOnline,
  withTooltip = false,
}: {
  lastOnline: string | null;
  withTooltip?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const state = getOnlineState(lastOnline);
  const text = getLastOnlineText(lastOnline, t, i18n.language);
  const indicator = (
    <span
      aria-label={text}
      className={cn(
        "size-2.5 shrink-0 rounded-full border",
        state === "never" && "border-muted-foreground/50 bg-transparent",
        state === "stale" && "border-muted-foreground/50 bg-muted-foreground/50",
        state === "online" &&
          "animate-pulse border-emerald-500 bg-emerald-500 ring-4 ring-emerald-500/15",
      )}
    />
  );

  if (!withTooltip) return indicator;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{indicator}</TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

export function UserRow({ user, onEdit, onShowQr }: UserRowProps) {
  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onEdit(user)}
    >
      <TableCell>
        <div className="flex min-w-0 items-center gap-2">
          <OnlineIndicator lastOnline={user.online_at} withTooltip />
          <span className="max-w-56 truncate font-medium">{user.username}</span>
        </div>
      </TableCell>
      <TableCell>
        <UserStatus status={user.status} expire={user.expire} />
      </TableCell>
      <TableCell className="w-52 max-w-52">
        <UserProtocols user={user} />
      </TableCell>
      <TableCell className="w-80 max-w-80">
        <UserUsage user={user} />
      </TableCell>
      <TableCell>
        <UserActions user={user} onShowQr={onShowQr} />
      </TableCell>
    </TableRow>
  );
}

export function UserCard({ user, onEdit, onShowQr }: UserRowProps) {
  const { t, i18n } = useTranslation();
  const lastOnlineText = getLastOnlineText(user.online_at, t, i18n.language);

  return (
    <article
      className="space-y-4 rounded-xl border bg-card p-4 text-card-foreground shadow-xs"
      onClick={() => onEdit(user)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <OnlineIndicator lastOnline={user.online_at} />
            <span className="truncate font-medium">{user.username}</span>
          </div>
        </div>
        <UserStatus status={user.status} expire={user.expire} compact />
      </div>
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">
          {t("usersTable.protocols")}
        </div>
        <UserProtocols user={user} compact />
      </div>
      <UserUsage user={user} />
      <div className="flex items-end justify-between gap-3">
        <p className="text-xs text-muted-foreground">{lastOnlineText}</p>
        <UserActions user={user} onShowQr={onShowQr} />
      </div>
    </article>
  );
}
