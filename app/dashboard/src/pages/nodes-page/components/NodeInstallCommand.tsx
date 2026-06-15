import { Terminal } from "lucide-react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCopy } from "@/hooks/use-copy";

const INSTALL_COMMAND =
  'sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/MarzbanNext/master/scripts/marzban-node.sh)" @ install';

export function NodeInstallCommand() {
  const { t } = useTranslation();
  const { copied, Icon, onCopy } = useCopy(INSTALL_COMMAND);

  return (
    <Card size="sm" className="bg-muted/25">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="size-4 text-primary" />
          {t("nodesPage.installCommand")}
        </CardTitle>
        <CardDescription>
          {t("nodesPage.installCommandDescription")}
        </CardDescription>
        <CardAction>
          <CopyToClipboard text={INSTALL_COMMAND} onCopy={onCopy}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t(
                copied ? "copied" : "nodesPage.copyInstallCommand",
              )}
            >
              <Icon />
            </Button>
          </CopyToClipboard>
        </CardAction>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-lg border bg-background p-3 text-xs leading-relaxed whitespace-pre-wrap break-all">
          <code>{INSTALL_COMMAND}</code>
        </pre>
      </CardContent>
    </Card>
  );
}
