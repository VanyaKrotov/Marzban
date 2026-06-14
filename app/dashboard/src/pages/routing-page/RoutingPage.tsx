import {
  Braces,
  GripVertical,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import Page from "@/components/page";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
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
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "utils/toastHandler";

import { RoutingRuleDialog } from "./components/RoutingRuleDialog";
import {
  type RoutingRule,
  type RoutingRulePayload,
  useCreateRoutingRuleMutation,
  useDeleteRoutingRuleMutation,
  useRoutingInboundsQuery,
  useRoutingNodesQuery,
  useRoutingOutboundsQuery,
  useRoutingRulesQuery,
  useReorderRoutingRulesMutation,
  useUpdateRoutingRuleMutation,
} from "./lib/query";

export function RoutingPage() {
  const { t } = useTranslation();
  const rulesQuery = useRoutingRulesQuery();
  const nodesQuery = useRoutingNodesQuery();
  const inboundsQuery = useRoutingInboundsQuery();
  const outboundsQuery = useRoutingOutboundsQuery();
  const create = useCreateRoutingRuleMutation();
  const update = useUpdateRoutingRuleMutation();
  const reorder = useReorderRoutingRulesMutation();
  const remove = useDeleteRoutingRuleMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [draggedRuleId, setDraggedRuleId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    ruleId: number;
    position: "before" | "after";
  } | null>(null);
  const nodesById = useMemo(
    () => new Map((nodesQuery.data ?? []).map((node) => [node.id, node])),
    [nodesQuery.data],
  );
  const pending = create.isPending || update.isPending;

  const saveRule = (payload: RoutingRulePayload) => {
    const options = {
      onSuccess: () => {
        generateSuccessMessage(t("routingPage.saved"));
        setDialogOpen(false);
      },
      onError: (error: Error) => generateErrorMessage(error),
    };

    if (editingRule) {
      update.mutate(
        {
          id: editingRule.id,
          payload: {
            name: payload.name,
            enabled: payload.enabled,
            node_ids: payload.node_ids,
            ...(!editingRule.readonly && { content: payload.content }),
          },
        },
        options,
      );
    } else {
      create.mutate(payload, options);
    }
  };

  const toggleRule = (rule: RoutingRule, enabled: boolean) => {
    update.mutate(
      { id: rule.id, payload: { enabled } },
      { onError: (error) => generateErrorMessage(error) },
    );
  };

  const dropRule = (targetRuleId: number) => {
    const rules = rulesQuery.data ?? [];
    if (
      draggedRuleId == null ||
      !dropTarget ||
      dropTarget.ruleId !== targetRuleId
    ) {
      setDraggedRuleId(null);
      setDropTarget(null);
      return;
    }

    const sourceIndex = rules.findIndex((rule) => rule.id === draggedRuleId);
    const targetIndex = rules.findIndex((rule) => rule.id === targetRuleId);
    if (sourceIndex < 0 || targetIndex < 0) {
      setDraggedRuleId(null);
      setDropTarget(null);
      return;
    }

    const nextRules = [...rules];
    const [draggedRule] = nextRules.splice(sourceIndex, 1);
    let insertIndex =
      targetIndex + (dropTarget.position === "after" ? 1 : 0);
    if (sourceIndex < insertIndex) insertIndex -= 1;
    nextRules.splice(insertIndex, 0, draggedRule);

    if (sourceIndex !== insertIndex) {
      reorder.mutate(
        nextRules.map((rule) => rule.id),
        { onError: (error) => generateErrorMessage(error) },
      );
    }
    setDraggedRuleId(null);
    setDropTarget(null);
  };

  return (
    <Page>
      <Page.Header
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="px-2 sm:px-3"
              disabled={rulesQuery.isFetching}
              onClick={() => void rulesQuery.refetch()}
              aria-label={t("routingPage.refresh").toString()}
            >
              <RefreshCw
                className={rulesQuery.isFetching ? "animate-spin" : undefined}
              />
              <span className="hidden sm:inline">
                {t("routingPage.refresh")}
              </span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setEditingRule(null);
                setDialogOpen(true);
              }}
            >
              <Plus />
              {t("create")}
            </Button>
          </div>
        }
      >
        <div>
          <h1 className="font-semibold">{t("routingPage.title")}</h1>
          <p className="hidden text-sm text-muted-foreground sm:block">
            {t("routingPage.description")}
          </p>
        </div>
      </Page.Header>

      {rulesQuery.isLoading ? (
        <div className="space-y-3 rounded-xl p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : rulesQuery.isError ? (
        <RoutingState
          title={t("routingPage.loadErrorTitle")}
          description={t("routingPage.loadErrorDescription")}
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => void rulesQuery.refetch()}
            >
              <RefreshCw />
              {t("routingPage.refresh")}
            </Button>
          }
        />
      ) : rulesQuery.data?.length ? (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10" />
                <TableHead>{t("routingPage.name")}</TableHead>
                <TableHead>{t("routingPage.enabled")}</TableHead>
                <TableHead>{t("routingPage.nodes")}</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rulesQuery.data.map((rule) => (
                <TableRow
                  key={rule.id}
                  draggable={!reorder.isPending}
                  className={`cursor-pointer ${
                    dropTarget?.ruleId === rule.id
                      ? dropTarget.position === "before"
                        ? "border-t-2 border-t-primary"
                        : "border-b-2 border-b-primary"
                      : ""
                  }`}
                  onDragStart={() => setDraggedRuleId(rule.id)}
                  onDragEnd={() => {
                    setDraggedRuleId(null);
                    setDropTarget(null);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (draggedRuleId == null || draggedRuleId === rule.id) {
                      setDropTarget(null);
                      return;
                    }
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const position =
                      event.clientY < bounds.top + bounds.height / 2
                        ? "before"
                        : "after";
                    setDropTarget((current) =>
                      current?.ruleId === rule.id &&
                      current.position === position
                        ? current
                        : { ruleId: rule.id, position },
                    );
                  }}
                  onDrop={() => dropRule(rule.id)}
                  onClick={() => {
                    setEditingRule(rule);
                    setDialogOpen(true);
                  }}
                >
                  <TableCell>
                    <GripVertical className="size-4 cursor-grab text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{rule.name}</div>
                  </TableCell>
                  <TableCell>
                    <div
                      className="w-fit"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Switch
                        checked={rule.enabled}
                        disabled={update.isPending}
                        onCheckedChange={(enabled) =>
                          toggleRule(rule, enabled)
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {rule.node_ids.length ? (
                        rule.node_ids.map((nodeId) => (
                          <Badge key={nodeId} variant="secondary">
                            {nodesById.get(nodeId)?.name ?? `#${nodeId}`}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {t("routingPage.noNodes")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    {!rule.readonly && (
                      <DeleteRuleButton
                        rule={rule}
                        pending={remove.isPending}
                        onDelete={() =>
                          remove.mutate(rule.id, {
                            onSuccess: () =>
                              generateSuccessMessage(
                                t("routingPage.deleted"),
                              ),
                            onError: (error) => generateErrorMessage(error),
                          })
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <RoutingState
          title={t("routingPage.emptyTitle")}
          description={t("routingPage.emptyDescription")}
          action={
            <Button
              type="button"
              onClick={() => {
                setEditingRule(null);
                setDialogOpen(true);
              }}
            >
              <Plus />
              {t("create")}
            </Button>
          }
        />
      )}

      <RoutingRuleDialog
        key={`${editingRule?.id ?? "create"}-${dialogOpen}`}
        rule={editingRule}
        nodes={nodesQuery.data ?? []}
        inboundTags={(inboundsQuery.data ?? []).map((inbound) => inbound.tag)}
        outboundTags={(outboundsQuery.data ?? []).map(
          (outbound) => outbound.tag,
        )}
        open={dialogOpen}
        pending={pending}
        onOpenChange={setDialogOpen}
        onSubmit={saveRule}
      />
    </Page>
  );
}

function DeleteRuleButton({
  rule,
  pending,
  onDelete,
}: {
  rule: RoutingRule;
  pending: boolean;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          size="icon-sm"
          disabled={pending}
          aria-label={t("delete").toString()}
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>{t("routingPage.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("routingPage.deleteDescription", { name: rule.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={onDelete}
          >
            {pending && <LoaderCircle className="animate-spin" />}
            {t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RoutingState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Empty className="min-h-96 rounded-xl">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Braces />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
