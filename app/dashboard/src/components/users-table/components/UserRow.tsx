import { useTranslation } from "react-i18next";

import { TableCell, TableRow } from "@/components/ui/table";
import { User } from "types/User";
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
      <TableCell className="w-[360px] max-w-[360px]">
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
      <UserUsage user={user} />
      <UserActions user={user} onShowQr={onShowQr} />
    </article>
  );
}
