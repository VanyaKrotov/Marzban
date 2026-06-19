import {
  Braces,
  FileArchive,
  GripVertical,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoutingRuleDialog } from "./routing/RoutingRuleDialog";
import {
  type RoutingRule,
  type RoutingRulePayload,
  useCreateRoutingRuleMutation,
  useDeleteRoutingRuleMutation,
  useReorderRoutingRulesMutation,
  useRoutingRulesQuery,
  useUpdateRoutingRuleMutation,
} from "../lib/routing-query";
import type { NodeType } from "types/Node";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "utils/toastHandler";
import { NodeGeoResourcesDialog } from "./geo-resources/NodeGeoResourcesCard";
import {
  isEnabledOnNode,
  isVisibleOnNode,
  readonlyFirst,
  updateNodeAssignment,
} from "../lib/node-assignment";
import { cn } from "@/lib/utils";

export function NodeRoutingCard({ node }: { node: NodeType & { id: number } }) {
  const { t } = useTranslation();
  const query = useRoutingRulesQuery();
  const create = useCreateRoutingRuleMutation();
  const update = useUpdateRoutingRuleMutation();
  const reorder = useReorderRoutingRulesMutation();
  const remove = useDeleteRoutingRuleMutation();
  const [open, setOpen] = useState(false);
  const [geoResourcesOpen, setGeoResourcesOpen] = useState(false);
  const [editing, setEditing] = useState<RoutingRule | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: number;
    position: "before" | "after";
  } | null>(null);
  const allRules = query.data ?? [];
  const rules = readonlyFirst(
    allRules.filter((rule) => isVisibleOnNode(rule, node.id)),
  ).map((rule) => ({
    ...rule,
    enabled: isEnabledOnNode(rule, node.id),
  }));
  const pending =
    create.isPending ||
    update.isPending ||
    reorder.isPending ||
    remove.isPending;

  const save = (payload: RoutingRulePayload) => {
    const options = {
      onSuccess: () => {
        generateSuccessMessage(t("routingPage.saved"));
        setOpen(false);
      },
      onError: (error: Error) => generateErrorMessage(error),
    };
    if (editing) {
      update.mutate(
        {
          id: editing.id,
          payload: {
            name: payload.name,
            enabled: payload.enabled,
            node_ids: payload.node_ids,
            ...(!editing.readonly && { content: payload.content }),
          },
        },
        options,
      );
    } else {
      create.mutate(payload, options);
    }
  };

  const dropRule = (targetId: number) => {
    if (draggedId == null || dropTarget?.id !== targetId) {
      resetDrag();
      return;
    }
    const sourceIndex = rules.findIndex((rule) => rule.id === draggedId);
    const targetIndex = rules.findIndex((rule) => rule.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) {
      resetDrag();
      return;
    }

    const reordered = [...rules];
    const [dragged] = reordered.splice(sourceIndex, 1);
    let insertIndex = targetIndex + (dropTarget.position === "after" ? 1 : 0);
    if (sourceIndex < insertIndex) insertIndex -= 1;
    reordered.splice(insertIndex, 0, dragged);

    if (sourceIndex !== insertIndex) {
      const reorderedIds = reordered
        .filter((rule) => rule.node_ids.includes(node.id))
        .map((rule) => rule.id);
      let nodeRuleIndex = 0;
      const globalOrder = allRules.map((rule) =>
        rule.node_ids.includes(node.id)
          ? reorderedIds[nodeRuleIndex++]
          : rule.id,
      );
      reorder.mutate(globalOrder, {
        onError: (error) => generateErrorMessage(error),
      });
    }
    resetDrag();
  };

  const resetDrag = () => {
    setDraggedId(null);
    setDropTarget(null);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t("routingPage.title")}</CardTitle>
        <CardDescription>{t("nodeProfile.routingDescription")}</CardDescription>
        <CardAction className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t("geoResources.title")}
            onClick={() => setGeoResourcesOpen(true)}
          >
            <FileArchive />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={query.isFetching}
            aria-label={t("routingPage.refresh")}
            onClick={() => void query.refetch()}
          >
            <RefreshCw
              className={query.isFetching ? "animate-spin" : undefined}
            />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus />
            {t("create")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        ) : rules.length ? (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10" />
                  <TableHead>{t("routingPage.name")}</TableHead>
                  <TableHead className="w-28">{t("enabled")}</TableHead>
                  <TableHead className="w-14" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow
                    key={rule.id}
                    draggable={!pending && !rule.readonly}
                    className={cn(
                      {
                        ["cursor-default hover:bg-transparent"]: rule.readonly,
                      },
                      dropTarget?.id === rule.id
                        ? dropTarget.position === "before"
                          ? "border-t-2 border-t-primary"
                          : "border-b-2 border-b-primary"
                        : "",
                    )}
                    onDragStart={() => {
                      if (!rule.readonly) {
                        setDraggedId(rule.id);
                      }
                    }}
                    onDragEnd={resetDrag}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (
                        draggedId == null ||
                        draggedId === rule.id ||
                        rule.readonly
                      )
                        return;
                      const bounds =
                        event.currentTarget.getBoundingClientRect();
                      setDropTarget({
                        id: rule.id,
                        position:
                          event.clientY < bounds.top + bounds.height / 2
                            ? "before"
                            : "after",
                      });
                    }}
                    onDrop={() => dropRule(rule.id)}
                    onClick={() => {
                      if (!rule.readonly) {
                        setEditing(rule);
                        setOpen(true);
                      }
                    }}
                  >
                    <TableCell>
                      <GripVertical
                        className={cn("size-4 text-muted-foreground", {
                          ["opacity-20"]: rule.readonly,
                          ["cursor-grab"]: !rule.readonly,
                        })}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Switch
                        checked={rule.enabled}
                        disabled={pending}
                        onCheckedChange={(enabled) =>
                          update.mutate(
                            {
                              id: rule.id,
                              payload: rule.readonly
                                ? {
                                    node_ids: updateNodeAssignment(
                                      rule.node_ids,
                                      node.id,
                                      enabled,
                                    ),
                                  }
                                : { enabled },
                            },
                            {
                              onError: (error) => generateErrorMessage(error),
                            },
                          )
                        }
                      />
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      {!rule.readonly && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="destructive"
                              disabled={pending}
                            >
                              <Trash2 />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogMedia className="bg-destructive/10 text-destructive">
                                <Trash2 />
                              </AlertDialogMedia>
                              <AlertDialogTitle>
                                {t("routingPage.deleteTitle")}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("routingPage.deleteDescription", {
                                  name: rule.name,
                                })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={pending}>
                                {t("cancel")}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                disabled={pending}
                                onClick={() =>
                                  remove.mutate(rule.id, {
                                    onSuccess: () =>
                                      generateSuccessMessage(
                                        t("routingPage.deleted"),
                                      ),
                                    onError: (error) =>
                                      generateErrorMessage(error),
                                  })
                                }
                              >
                                {remove.isPending && (
                                  <LoaderCircle className="animate-spin" />
                                )}
                                {t("delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Empty className="min-h-44">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Braces />
              </EmptyMedia>
              <EmptyTitle className="text-sm">
                {t("nodeProfile.noRouting")}
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>

      <RoutingRuleDialog
        key={`${editing?.id ?? "create"}-${open}`}
        rule={editing}
        nodeId={node.id}
        open={open}
        pending={create.isPending || update.isPending}
        onOpenChange={setOpen}
        onSubmit={save}
      />
      <NodeGeoResourcesDialog
        nodeId={node.id}
        open={geoResourcesOpen}
        onOpenChange={setGeoResourcesOpen}
      />
    </Card>
  );
}
