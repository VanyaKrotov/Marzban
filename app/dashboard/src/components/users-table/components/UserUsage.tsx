import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { User } from "types/User";
import { formatBytes } from "utils/formatByte";

export function UserUsage({
  user,
  compact = false,
}: {
  user: User;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const unlimited = !user.data_limit;
  const percentage = unlimited
    ? 0
    : Math.min((user.used_traffic / user.data_limit!) * 100, 100);
  const reached = !unlimited && percentage >= 100;

  return (
    <div className="w-full min-w-36 max-w-[360px] space-y-1.5">
      {!compact && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              reached ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {formatBytes(user.used_traffic)} / {unlimited ? "∞" : formatBytes(user.data_limit!)}
        </span>
        {!compact && (
          <span className="whitespace-nowrap">
            {t("usersTable.total")}: {formatBytes(user.lifetime_used_traffic)}
          </span>
        )}
      </div>
    </div>
  );
}
