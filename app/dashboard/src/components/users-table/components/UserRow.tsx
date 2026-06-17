import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import type { ProxyType, User } from "types/User";
import { UserActions } from "./UserActions";
import { UserStatus } from "./UserStatus";
import { UserUsage } from "./UserUsage";

const getOnlineState = (lastOnline: string | null) => {
  if (!lastOnline)
    return { online: false, labelKey: "usersTable.notConnected" };
  const timestamp = new Date(`${lastOnline}Z`).getTime();
  const online = Date.now() - timestamp <= 60_000;
  return {
    online,
    labelKey: online ? "usersTable.online" : "usersTable.offline",
  };
};

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
  socks: "SOCKS",
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

export function UserRow({ user, onEdit, onShowQr }: UserRowProps) {
  const { t } = useTranslation();
  const online = getOnlineState(user.online_at);

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onEdit(user)}
    >
      <TableCell>
        <div className="flex min-w-0 items-center gap-2">
          <span
            title={t(online.labelKey)}
            className={
              online.online
                ? "size-2.5 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-500/15"
                : "size-2.5 shrink-0 rounded-full bg-muted-foreground/40"
            }
          />
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
  const { t } = useTranslation();
  const online = getOnlineState(user.online_at);

  return (
    <article
      className="space-y-4 rounded-xl border bg-card p-4 text-card-foreground shadow-xs"
      onClick={() => onEdit(user)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            title={t(online.labelKey)}
            className={
              online.online
                ? "size-2.5 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-500/15"
                : "size-2.5 shrink-0 rounded-full bg-muted-foreground/40"
            }
          />
          <span className="truncate font-medium">{user.username}</span>
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
      <UserActions user={user} onShowQr={onShowQr} />
    </article>
  );
}
