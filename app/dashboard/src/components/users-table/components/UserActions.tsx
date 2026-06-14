import { Check, Clipboard, Link, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { User } from "types/User";

type CopiedValue = "subscription" | "configs" | null;

export function UserActions({
  user,
  onShowQr,
}: {
  user: User;
  onShowQr: (user: User) => void;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<CopiedValue>(null);

  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(null), 1000);

    return () => window.clearTimeout(timeout);
  }, [copied]);

  const action = (label: string, icon: ReactNode, onClick: () => void) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  const copyAction = (
    value: string,
    type: Exclude<CopiedValue, null>,
    label: string,
    icon: ReactNode,
  ) => (
    <Tooltip>
      <CopyToClipboard text={value} onCopy={() => setCopied(type)}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={(event) => event.stopPropagation()}
          >
            {icon}
          </Button>
        </TooltipTrigger>
      </CopyToClipboard>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  const subscriptionUrl = user.subscription_url.startsWith("/")
    ? window.location.origin + user.subscription_url
    : user.subscription_url;

  return (
    <div
      className="flex justify-end gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      {copyAction(
        subscriptionUrl,
        "subscription",
        copied === "subscription"
          ? t("usersTable.copied")
          : t("usersTable.copyLink"),
        copied === "subscription" ? <Check /> : <Link />,
      )}
      {copyAction(
        user.links.join("\r\n"),
        "configs",
        copied === "configs"
          ? t("usersTable.copied")
          : t("usersTable.copyConfigs"),
        copied === "configs" ? <Check /> : <Clipboard />,
      )}
      {action("QR Code", <QrCode />, () => onShowQr(user))}
    </div>
  );
}
