import { CircleAlert, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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

import {
  useCreateNodeMutation,
  useDeleteNodeMutation,
  useNodeQuery,
  useReconnectNodeMutation,
  useUpdateNodeMutation,
} from "../lib/query";
import { NodeForm } from "./NodeForm";
import { NodeStatusBadge } from "./NodeStatusBadge";
import { PanelCertificate } from "./PanelCertificate";

type NodeDialogProps = {
  node: NodeType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NodeDialog({ node, open, onOpenChange }: NodeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] min-w-0 max-w-[calc(100vw-2rem)] overflow-x-hidden sm:max-h-[calc(100svh-2rem)] sm:max-w-2xl">
        <NodeDialogContent node={node} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

function NodeDialogContent({
  node,
  onOpenChange,
}: Pick<NodeDialogProps, "node" | "onOpenChange">) {
  const { t } = useTranslation();
  const nodeQuery = useNodeQuery(
    node?.id,
    Boolean(node?.id),
    node ?? undefined,
  );
  const currentNode = nodeQuery.data ?? node;
  const create = useCreateNodeMutation();
  const update = useUpdateNodeMutation();
  const reconnect = useReconnectNodeMutation();
  const remove = useDeleteNodeMutation();
  const saving = create.isPending || update.isPending;

  const submit = (values: NodeType) => {
    const mutation = node ? update : create;
    mutation.mutate(values, {
      onSuccess: () => {
        generateSuccessMessage(
          node
            ? t("nodesPage.updateSuccess", { name: values.name })
            : t("nodes.addNodeSuccess", { name: values.name }),
        );
        onOpenChange(false);
      },
      onError: (error) => generateErrorMessage(error),
    });
  };

  const deleteNode = () => {
    if (!node?.id) return;
    remove.mutate(node.id, {
      onSuccess: () => {
        generateSuccessMessage(
          t("deleteNode.deleteSuccess", { name: node.name }),
        );
        onOpenChange(false);
      },
      onError: (error) => generateErrorMessage(error),
    });
  };
  const errorMessage = currentNode?.message || t("nodesPage.connectionError");

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {node ? t("nodesPage.editTitle") : t("nodesPage.createTitle")}
        </DialogTitle>
        <DialogDescription className="mt-1 flex flex-wrap items-center gap-2">
          <span>{currentNode?.name ?? t("nodesPage.createDescription")}</span>
          {currentNode && <NodeStatusBadge status={currentNode.status} />}
        </DialogDescription>
      </DialogHeader>

      {currentNode?.status === "error" && (
        <Accordion type="single" collapsible className="min-w-0">
          <AccordionItem
            value="node-error"
            className="min-w-0 overflow-hidden rounded-lg border border-destructive/25 bg-destructive/10 px-3 text-destructive"
          >
            <AccordionTrigger className="min-w-0 max-w-full items-center overflow-hidden py-3 hover:no-underline">
              <span className="flex min-w-0 max-w-full flex-1 items-center gap-2 overflow-hidden">
                <CircleAlert className="size-4 shrink-0" />
                <span className="truncate">
                  {getFirstSentence(errorMessage)}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="min-w-0 max-w-full overflow-hidden pb-3">
              <div className="min-w-0 max-w-full space-y-3">
                <p className="max-w-full whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">
                  {errorMessage}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={reconnect.isPending}
                  onClick={() => reconnect.mutate(currentNode)}
                >
                  <RefreshCw
                    className={reconnect.isPending ? "animate-spin" : undefined}
                  />
                  {t("nodes.reconnect")}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {!node && <PanelCertificate />}

      <NodeForm
        node={currentNode}
        pending={saving}
        onSubmit={submit}
        actions={
          node?.id ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  aria-label={t("nodesPage.deleteNode")}
                >
                  <Trash2 />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogMedia className="bg-destructive/10 text-destructive">
                    <Trash2 />
                  </AlertDialogMedia>
                  <AlertDialogTitle>{t("deleteNode.title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    <Trans
                      i18nKey="deleteNode.prompt"
                      values={{ name: node.name }}
                      components={{ b: <strong /> }}
                    />
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={remove.isPending}>
                    {t("cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={remove.isPending}
                    onClick={deleteNode}
                  >
                    {remove.isPending && (
                      <LoaderCircle className="animate-spin" />
                    )}
                    {t("delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : undefined
        }
      />
    </>
  );
}

function getFirstSentence(message: string) {
  const match = message.trim().match(/^.*?[.!?](?:\s|$)/s);
  return match?.[0].trim() || message.trim().split(/\r?\n/, 1)[0];
}
