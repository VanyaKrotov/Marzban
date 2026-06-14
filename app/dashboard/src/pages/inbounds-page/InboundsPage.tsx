import { Braces, LoaderCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
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

import { InboundDialog } from "./components/InboundDialog";
import {
  type InboundConfig,
  type InboundPayload,
  useCreateInboundMutation,
  useDeleteInboundMutation,
  useInboundConfigsQuery,
  useInboundNodesQuery,
  useUpdateInboundMutation,
} from "./lib/query";

export function InboundsPage() {
  const { t } = useTranslation();
  const inboundsQuery = useInboundConfigsQuery();
  const nodesQuery = useInboundNodesQuery();
  const create = useCreateInboundMutation();
  const update = useUpdateInboundMutation();
  const remove = useDeleteInboundMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInbound, setEditingInbound] = useState<InboundConfig | null>(
    null,
  );
  const nodesById = useMemo(
    () => new Map((nodesQuery.data ?? []).map((node) => [node.id, node])),
    [nodesQuery.data],
  );
  const pending = create.isPending || update.isPending;

  const openCreate = () => {
    setEditingInbound(null);
    setDialogOpen(true);
  };

  const saveInbound = (payload: InboundPayload) => {
    const mutationOptions = {
      onSuccess: () => {
        generateSuccessMessage(t("inboundsPage.saved"));
        setDialogOpen(false);
      },
      onError: (error: Error) => generateErrorMessage(error),
    };

    if (editingInbound) {
      const updatePayload = {
        enabled: payload.enabled,
        node_ids: payload.node_ids,
        ...(!editingInbound.readonly && { content: payload.content }),
      };
      update.mutate(
        {
          tag: editingInbound.tag,
          payload: updatePayload,
        },
        mutationOptions,
      );
      return;
    }

    create.mutate(payload, mutationOptions);
  };

  const toggleInbound = (inbound: InboundConfig, enabled: boolean) => {
    update.mutate(
      { tag: inbound.tag, payload: { enabled } },
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
              disabled={inboundsQuery.isFetching}
              onClick={() => void inboundsQuery.refetch()}
              aria-label={t("inboundsPage.refresh").toString()}
            >
              <RefreshCw
                className={
                  inboundsQuery.isFetching ? "animate-spin" : undefined
                }
              />
              <span className="hidden sm:inline">
                {t("inboundsPage.refresh")}
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
          <h1 className="font-semibold">{t("inboundsPage.title")}</h1>
          <p className="hidden text-sm text-muted-foreground sm:block">
            {t("inboundsPage.description")}
          </p>
        </div>
      </Page.Header>

      {inboundsQuery.isLoading ? (
        <div className="space-y-3 rounded-xl p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : inboundsQuery.isError ? (
        <InboundState
          title={t("inboundsPage.loadErrorTitle")}
          description={t("inboundsPage.loadErrorDescription")}
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => void inboundsQuery.refetch()}
            >
              <RefreshCw />
              {t("inboundsPage.refresh")}
            </Button>
          }
        />
      ) : inboundsQuery.data?.length ? (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("inboundsPage.tag")}</TableHead>
                <TableHead>{t("inboundsPage.enabled")}</TableHead>
                <TableHead>{t("inboundsPage.nodes")}</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {inboundsQuery.data.map((inbound) => (
                <TableRow
                  key={inbound.tag}
                  className="cursor-pointer"
                  onClick={() => {
                    setEditingInbound(inbound);
                    setDialogOpen(true);
                  }}
                >
                  <TableCell className="font-mono text-xs font-medium">
                    <div className="flex items-center gap-2">{inbound.tag}</div>
                  </TableCell>
                  <TableCell>
                    <div
                      onClick={(event) => event.stopPropagation()}
                      className="w-fit"
                    >
                      <Switch
                        checked={inbound.enabled}
                        disabled={
                          update.isPending || inboundsQuery.data.length === 1
                        }
                        onCheckedChange={(enabled) =>
                          toggleInbound(inbound, enabled)
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {inbound.node_ids.length ? (
                        inbound.node_ids.map((nodeId) => (
                          <Badge key={nodeId} variant="secondary">
                            {nodesById.get(nodeId)?.name ?? `#${nodeId}`}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {t("inboundsPage.noNodes")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    {!inbound.readonly && (
                      <DeleteInboundButton
                        inbound={inbound}
                        pending={remove.isPending}
                        onDelete={() =>
                          remove.mutate(inbound.tag, {
                            onSuccess: () =>
                              generateSuccessMessage(t("inboundsPage.deleted")),
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
        <InboundState
          title={t("inboundsPage.emptyTitle")}
          description={t("inboundsPage.emptyDescription")}
          action={
            <Button type="button" onClick={openCreate}>
              <Plus />
              {t("create")}
            </Button>
          }
        />
      )}

      <InboundDialog
        key={`${editingInbound?.tag ?? "create"}-${dialogOpen}`}
        inbound={editingInbound}
        nodes={nodesQuery.data ?? []}
        open={dialogOpen}
        pending={pending}
        onOpenChange={setDialogOpen}
        onSubmit={saveInbound}
      />
    </Page>
  );
}

function DeleteInboundButton({
  inbound,
  pending,
  onDelete,
}: {
  inbound: InboundConfig;
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
          <AlertDialogTitle>{t("inboundsPage.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("inboundsPage.deleteDescription", { tag: inbound.tag })}
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

function InboundState({
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
