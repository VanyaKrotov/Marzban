import { AlertTriangle, Pencil, RefreshCw, Server } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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

  return (
    <>
      <Card size="sm">
        <CardContent className="flex flex-col gap-4">
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
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="flex min-w-0 items-start gap-4 xl:flex-1 xl:items-center">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Server className="size-5" />
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
              <NodeValue
                label={t("nodes.nodeAddress")}
                value={`${node.address}:${node.port}`}
                mono
              />
              <NodeValue
                label={t("nodes.nodeAPIPort")}
                value={String(node.api_port)}
                mono
              />
              <NodeValue
                label={t("nodes.usageCoefficient")}
                value={String(node.usage_coefficient)}
              />
              <NodeValue
                label={t("nodesPage.coreVersion")}
                value={
                  node.xray_version
                    ? `Xray ${node.xray_version}`
                    : t("nodesPage.versionUnknown")
                }
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t pt-4 xl:justify-end xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
            <div className="flex items-center gap-2">
              {node.status === "error" ? (
                <>
                  <button
                    type="button"
                    className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setErrorOpen(true)}
                  >
                    <NodeStatusBadge status={node.status} />
                  </button>
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
                      className={
                        reconnect.isPending ? "animate-spin" : undefined
                      }
                    />
                  </Button>
                </>
              ) : (
                <NodeStatusBadge status={node.status} />
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSettingsOpen(true)}
            >
              <Pencil />
              {t("nodeProfile.editSettings")}
            </Button>
          </div>
          </div>
        </CardContent>
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
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`truncate font-medium ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </p>
    </div>
  );
}
