import {
  Braces,
  LoaderCircle,
  LockKeyhole,
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

import { OutboundDialog } from "./components/OutboundDialog";
import {
  type OutboundConfig,
  type OutboundPayload,
  useCreateOutboundMutation,
  useDeleteOutboundMutation,
  useOutboundConfigsQuery,
  useOutboundNodesQuery,
  useUpdateOutboundMutation,
} from "./lib/query";

export function OutboundsPage() {
  const { t } = useTranslation();
  const outboundsQuery = useOutboundConfigsQuery();
  const nodesQuery = useOutboundNodesQuery();
  const create = useCreateOutboundMutation();
  const update = useUpdateOutboundMutation();
  const remove = useDeleteOutboundMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOutbound, setEditingOutbound] = useState<OutboundConfig | null>(
    null,
  );
  const nodesById = useMemo(
    () => new Map((nodesQuery.data ?? []).map((node) => [node.id, node])),
    [nodesQuery.data],
  );
  const pending = create.isPending || update.isPending;

  const openCreate = () => {
    setEditingOutbound(null);
    setDialogOpen(true);
  };

  const saveOutbound = (payload: OutboundPayload) => {
    const mutationOptions = {
      onSuccess: () => {
        generateSuccessMessage(t("outboundsPage.saved"));
        setDialogOpen(false);
      },
      onError: (error: Error) => generateErrorMessage(error),
    };

    if (editingOutbound) {
      const updatePayload = {
        enabled: payload.enabled,
        node_ids: payload.node_ids,
        ...(!editingOutbound.readonly && { content: payload.content }),
      };
      update.mutate(
        {
          tag: editingOutbound.tag,
          payload: updatePayload,
        },
        mutationOptions,
      );
      return;
    }

    create.mutate(payload, mutationOptions);
  };

  const toggleOutbound = (outbound: OutboundConfig, enabled: boolean) => {
    update.mutate(
      { tag: outbound.tag, payload: { enabled } },
      { onError: (error) => generateErrorMessage(error) },
    );
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
              disabled={outboundsQuery.isFetching}
              onClick={() => void outboundsQuery.refetch()}
              aria-label={t("outboundsPage.refresh").toString()}
            >
              <RefreshCw
                className={
                  outboundsQuery.isFetching ? "animate-spin" : undefined
                }
              />
              <span className="hidden sm:inline">
                {t("outboundsPage.refresh")}
              </span>
            </Button>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus />
              {t("create")}
            </Button>
          </div>
        }
      >
        <div>
          <h1 className="font-semibold">{t("outboundsPage.title")}</h1>
          <p className="hidden text-sm text-muted-foreground sm:block">
            {t("outboundsPage.description")}
          </p>
        </div>
      </Page.Header>

      {outboundsQuery.isLoading ? (
        <div className="space-y-3 rounded-xl p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : outboundsQuery.isError ? (
        <OutboundState
          title={t("outboundsPage.loadErrorTitle")}
          description={t("outboundsPage.loadErrorDescription")}
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => void outboundsQuery.refetch()}
            >
              <RefreshCw />
              {t("outboundsPage.refresh")}
            </Button>
          }
        />
      ) : outboundsQuery.data?.length ? (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("outboundsPage.tag")}</TableHead>
                <TableHead>{t("outboundsPage.enabled")}</TableHead>
                <TableHead>{t("outboundsPage.nodes")}</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {outboundsQuery.data.map((outbound) => (
                <TableRow
                  key={outbound.tag}
                  className="cursor-pointer"
                  onClick={() => {
                    setEditingOutbound(outbound);
                    setDialogOpen(true);
                  }}
                >
                  <TableCell className="font-mono text-xs font-medium">
                    <div className="flex items-center gap-2">
                      {outbound.tag}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className="w-fit"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Switch
                        checked={outbound.enabled}
                        disabled={update.isPending}
                        onCheckedChange={(enabled) =>
                          toggleOutbound(outbound, enabled)
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {outbound.node_ids.length ? (
                        outbound.node_ids.map((nodeId) => (
                          <Badge key={nodeId} variant="secondary">
                            {nodesById.get(nodeId)?.name ?? `#${nodeId}`}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {t("outboundsPage.noNodes")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    {!outbound.readonly && (
                      <DeleteOutboundButton
                        outbound={outbound}
                        pending={remove.isPending}
                        onDelete={() =>
                          remove.mutate(outbound.tag, {
                            onSuccess: () =>
                              generateSuccessMessage(
                                t("outboundsPage.deleted"),
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
        <OutboundState
          title={t("outboundsPage.emptyTitle")}
          description={t("outboundsPage.emptyDescription")}
          action={
            <Button type="button" onClick={openCreate}>
              <Plus />
              {t("create")}
            </Button>
          }
        />
      )}

      <OutboundDialog
        key={`${editingOutbound?.tag ?? "create"}-${dialogOpen}`}
        outbound={editingOutbound}
        nodes={nodesQuery.data ?? []}
        open={dialogOpen}
        pending={pending}
        onOpenChange={setDialogOpen}
        onSubmit={saveOutbound}
      />
    </Page>
  );
}

function DeleteOutboundButton({
  outbound,
  pending,
  onDelete,
}: {
  outbound: OutboundConfig;
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
          aria-label={t("delete")}
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>{t("outboundsPage.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("outboundsPage.deleteDescription", { tag: outbound.tag })}
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

function OutboundState({
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
