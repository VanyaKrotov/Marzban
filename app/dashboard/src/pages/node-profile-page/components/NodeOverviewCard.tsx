import { AlertTriangle, Pencil, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCopy } from "@/hooks/use-copy";
import { NodeStatusBadge } from "@/pages/nodes-page/components/NodeStatusBadge";
import { useReconnectNodeMutation } from "@/pages/nodes-page/lib/query";
import type { NodeType } from "types/Node";
import { generateErrorMessage } from "utils/toastHandler";

import { NodeErrorDialog } from "./NodeErrorDialog";
import { NodeSettingsDialog } from "./NodeSettingsDialog";

export function NodeOverviewCard({ node }: { node: NodeType }) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const reconnect = useReconnectNodeMutation();
  const address = `${node.address}:${node.port}`;
  const addressCopy = useCopy(address);
  const AddressCopyIcon = addressCopy.Icon;
  const status = node.status === "error" ? (
    <button
      type="button"
      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => setErrorOpen(true)}
    >
      <NodeStatusBadge status={node.status} />
    </button>
  ) : (
    <NodeStatusBadge status={node.status} />
  );

  return (
    <>
      <Card size="sm" className="h-full">
        <CardHeader>
          <CardTitle className="min-w-0 truncate">
            {t("nodeProfile.connectionInfo")}
          </CardTitle>
          <CardAction className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSettingsOpen(true)}
            >
              <Pencil />
              {t("nodeProfile.editSettings")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          {node.restart_required && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-600 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-foreground">
                  {t("nodeProfile.restartRequiredTitle")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("nodeProfile.restartRequiredDescription")}
                </p>
              </div>
            </div>
          )}
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <NodeValue label={t("nodes.nodeAddress")}>
              <CopyToClipboard text={address} onCopy={addressCopy.onCopy}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto min-w-0 justify-start gap-2 px-0 py-0 font-mono text-xs font-medium hover:bg-transparent"
                  aria-label={addressCopy.copied ? t("copied") : address}
                >
                  <span className="truncate">{address}</span>
                  <AddressCopyIcon className="size-3.5 shrink-0 text-muted-foreground" />
                </Button>
              </CopyToClipboard>
            </NodeValue>
            <NodeValue label={t("nodes.nodeAPIPort")} mono>
              {String(node.api_port)}
            </NodeValue>
            <NodeValue label={t("nodes.usageCoefficient")}>
              {String(node.usage_coefficient)}
            </NodeValue>
            <NodeValue label={t("nodesPage.coreVersion")}>
              {node.xray_version
                ? `Xray ${node.xray_version}`
                : t("nodesPage.versionUnknown")}
            </NodeValue>
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-3 border-t">
          <div className="min-w-0 space-y-2">
            <p className="text-xs text-muted-foreground">
              {t("nodeProfile.statusDescription")}
            </p>
            {status}
          </div>
          {node.status === "error" && (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              disabled={reconnect.isPending}
              aria-label={t("nodes.reconnect")}
              onClick={() =>
                reconnect.mutate(node, {
                  onError: (error) => generateErrorMessage(error),
                })
              }
            >
              <RefreshCw
                className={reconnect.isPending ? "animate-spin" : undefined}
              />
            </Button>
          )}
        </CardFooter>
      </Card>

      <NodeSettingsDialog
        node={node}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <NodeErrorDialog
        node={node}
        open={errorOpen}
        onOpenChange={setErrorOpen}
      />
    </>
  );
}

function NodeValue({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div
        className={`truncate font-medium ${mono ? "font-mono text-xs" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
