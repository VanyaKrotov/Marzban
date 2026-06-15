import { CircleAlert, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReconnectNodeMutation } from "@/pages/nodes-page/lib/query";
import type { NodeType } from "types/Node";
import { generateErrorMessage } from "utils/toastHandler";

type NodeErrorDialogProps = {
  node: NodeType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NodeErrorDialog({
  node,
  open,
  onOpenChange,
}: NodeErrorDialogProps) {
  const { t } = useTranslation();
  const reconnect = useReconnectNodeMutation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleAlert className="size-5 text-destructive" />
            {t("nodeModal.status.error")}
          </DialogTitle>
          <DialogDescription>{node.name}</DialogDescription>
        </DialogHeader>

        <p className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive [overflow-wrap:anywhere]">
          {node.message || t("nodesPage.connectionError")}
        </p>

        <DialogFooter>
          <Button
            type="button"
            disabled={reconnect.isPending}
            onClick={() =>
              reconnect.mutate(node, {
                onSuccess: () => onOpenChange(false),
                onError: (error) => generateErrorMessage(error),
              })
            }
          >
            <RefreshCw
              className={reconnect.isPending ? "animate-spin" : undefined}
            />
            {t(
              reconnect.isPending
                ? "nodes.reconnecting"
                : "nodes.reconnect",
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
