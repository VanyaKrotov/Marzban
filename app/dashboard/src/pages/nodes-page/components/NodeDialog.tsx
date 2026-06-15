import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NodeType } from "types/Node";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "utils/toastHandler";

import { useCreateNodeMutation } from "../lib/query";
import { NodeForm } from "./NodeForm";
import { NodeInstallCommand } from "./NodeInstallCommand";
import { PanelCertificate } from "./PanelCertificate";

type NodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NodeDialog({ open, onOpenChange }: NodeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] min-w-0 max-w-[calc(100vw-2rem)] overflow-x-hidden sm:max-h-[calc(100svh-2rem)] sm:max-w-2xl">
        <NodeDialogContent onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

function NodeDialogContent({
  onOpenChange,
}: Pick<NodeDialogProps, "onOpenChange">) {
  const { t } = useTranslation();
  const create = useCreateNodeMutation();

  const submit = (values: NodeType) => {
    create.mutate(values, {
      onSuccess: () => {
        generateSuccessMessage(
          t("nodes.addNodeSuccess", { name: values.name }),
        );
        onOpenChange(false);
      },
      onError: (error) => generateErrorMessage(error),
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("nodesPage.createTitle")}</DialogTitle>
        <DialogDescription>
          {t("nodesPage.createDescription")}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <NodeInstallCommand />
        <PanelCertificate />
      </div>

      <NodeForm pending={create.isPending} onSubmit={submit} />
    </>
  );
}
