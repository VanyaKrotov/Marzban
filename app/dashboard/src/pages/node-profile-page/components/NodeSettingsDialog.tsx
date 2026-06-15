import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NodeForm } from "@/pages/nodes-page/components/NodeForm";
import { NodeStatusBadge } from "@/pages/nodes-page/components/NodeStatusBadge";
import { useUpdateNodeMutation } from "@/pages/nodes-page/lib/query";
import type { NodeType } from "types/Node";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "utils/toastHandler";

type NodeSettingsDialogProps = {
  node: NodeType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NodeSettingsDialog({
  node,
  open,
  onOpenChange,
}: NodeSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <NodeSettingsDialogContent
          node={node}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function NodeSettingsDialogContent({
  node,
  onOpenChange,
}: Pick<NodeSettingsDialogProps, "node" | "onOpenChange">) {
  const { t } = useTranslation();
  const update = useUpdateNodeMutation();

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Pencil className="size-5 text-primary" />
          {t("nodesPage.editTitle")}
        </DialogTitle>
        <DialogDescription className="flex flex-wrap items-center gap-2">
          <span>{node.name}</span>
          <NodeStatusBadge status={node.status} />
        </DialogDescription>
      </DialogHeader>

      <NodeForm
        node={node}
        pending={update.isPending}
        onSubmit={(values) =>
          update.mutate(values, {
            onSuccess: () => {
              generateSuccessMessage(
                t("nodesPage.updateSuccess", { name: values.name }),
              );
              onOpenChange(false);
            },
            onError: (error) => generateErrorMessage(error),
          })
        }
      />
    </>
  );
}
