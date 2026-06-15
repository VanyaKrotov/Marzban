import { QrCode } from "lucide-react";
import type { ReactNode } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCopy } from "@/hooks/use-copy";
import { User } from "types/User";

export function UserActions({
  user,
  onShowQr,
}: {
  user: User;
  onShowQr: (user: User) => void;
}) {
  const { t } = useTranslation();
  const subscriptionUrl = user.subscription_url.startsWith("/")
    ? window.location.origin + user.subscription_url
    : user.subscription_url;
  const configs = user.links.join("\r\n");
  const subscriptionCopy = useCopy(subscriptionUrl);
  const configsCopy = useCopy(configs);

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
    label: string,
    Icon: typeof subscriptionCopy.Icon,
    onCopy: () => void,
  ) => (
    <Tooltip>
      <CopyToClipboard text={value} onCopy={onCopy}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={(event) => event.stopPropagation()}
          >
            <Icon />
          </Button>
        </TooltipTrigger>
      </CopyToClipboard>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <div
      className="flex justify-end gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      {copyAction(
        subscriptionUrl,
        subscriptionCopy.copied
          ? t("copied")
          : t("usersTable.copyLink"),
        subscriptionCopy.Icon,
        subscriptionCopy.onCopy,
      )}
      {copyAction(
        configs,
        configsCopy.copied
          ? t("copied")
          : t("usersTable.copyConfigs"),
        configsCopy.Icon,
        configsCopy.onCopy,
      )}
      {action("QR Code", <QrCode />, () => onShowQr(user))}
    </div>
  );
}
