import { CircleAlert, CircleCheck, LoaderCircle, Power } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import type { NodeType } from "types/Node";

import { Badge } from "@/components/ui/badge";

const ICONS = {
  connected: CircleCheck,
  connecting: LoaderCircle,
  disabled: Power,
  error: CircleAlert,
} as const;

export function NodeStatusBadge({ status }: { status: NodeType["status"] }) {
  const { t } = useTranslation();

  const currentStatus = status ?? "error";
  const Icon = ICONS[currentStatus];

  return (
    <Badge
      variant={currentStatus === "error" ? "destructive" : "outline"}
      className={cn(
        currentStatus === "connected" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        currentStatus === "connecting" &&
          "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
        currentStatus === "disabled" && "text-muted-foreground",
      )}
    >
      <Icon className={cn(currentStatus === "connecting" && "animate-spin")} />
      {t(`nodeModal.status.${currentStatus}`)}
    </Badge>
  );
}
