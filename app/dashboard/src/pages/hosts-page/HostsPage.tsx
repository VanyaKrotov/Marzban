import {
  Copy,
  GripVertical,
  Link2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
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

import { HostDialog, type HostFormValues } from "./components/host-dialog";
import {
  cloneHosts,
  removeHost,
  reorderHost,
  toHostPayload,
  updateHost,
  type HostRow,
} from "./lib/model";
import {
  useCreateHostMutation,
  useDeleteHostMutation,
  useHostsQuery,
  useReorderHostsMutation,
  useUpdateHostMutation,
} from "./lib/query";
import type { HostsSchema } from "./types";

export function HostsPage() {
  const { t } = useTranslation();
  const [hosts, setHosts] = useState<HostsSchema>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<HostRow | null>(null);
  const [draggedRow, setDraggedRow] = useState<HostRow | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    rowId: number;
    position: "before" | "after";
  } | null>(null);
  const {
    data: hostsData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useHostsQuery();
  const createHost = useCreateHostMutation();
  const updateHostMutation = useUpdateHostMutation();
  const deleteHost = useDeleteHostMutation();
  const reorderHosts = useReorderHostsMutation();
  const pending =
    createHost.isPending ||
    updateHostMutation.isPending ||
    deleteHost.isPending ||
    reorderHosts.isPending;
  const rows = useMemo(() => hosts, [hosts]);

  useEffect(() => {
    if (hostsData) setHosts(cloneHosts(hostsData));
  }, [hostsData]);

  const persistUpdate = (
    hostId: number,
    nextHosts: HostsSchema,
    values: HostFormValues,
    successMessage?: string,
  ) => {
    if (!hostsData) return;
    const previousHosts = hosts;
    const payload = toHostPayload(values);
    setHosts(nextHosts);
    updateHostMutation.mutate(
      { id: hostId, host: payload },
      {
        onSuccess: () => {
          if (successMessage) generateSuccessMessage(successMessage);
        },
        onError: (error) => {
          setHosts(previousHosts);
          generateErrorMessage(error);
        },
      },
    );
  };

  const persistReorder = (nextHosts: HostsSchema) => {
    if (!hostsData) return;
    const previousHosts = hosts;
    setHosts(nextHosts);
    reorderHosts.mutate(nextHosts.map((host) => host.id), {
      onSuccess: () => {
        generateSuccessMessage(t("hostsPage.orderSaved"));
      },
      onError: (error) => {
        setHosts(previousHosts);
        generateErrorMessage(error);
      },
    });
  };

  const openCreate = () => {
    setEditingRow(null);
    setDialogOpen(true);
  };

  const submitHost = (values: HostFormValues) => {
    const payload = toHostPayload(values);
    if (editingRow) {
      persistUpdate(
        editingRow.id,
        updateHost(hosts, editingRow.id, payload),
        values,
        t("hostsDialog.savedSuccess"),
      );
      setDialogOpen(false);
      return;
    }

    createHost.mutate(payload, {
      onSuccess: () => {
        generateSuccessMessage(t("hostsDialog.savedSuccess"));
        setDialogOpen(false);
      },
      onError: (error) => generateErrorMessage(error),
    });
  };

  const duplicate = (row: HostRow) => {
    createHost.mutate(
      {
        ...toHostPayload({
          ...row,
          inboundTag: row.inbound_tag,
        }),
        remark: `${row.remark} ${t("hostsPage.copySuffix")}`,
        is_disabled: true,
      },
      {
        onSuccess: () => generateSuccessMessage(t("hostsPage.copied")),
        onError: (error) => generateErrorMessage(error),
      },
    );
  };

  const toggleHost = (row: HostRow, checked: boolean) => {
    const values: HostFormValues = {
      ...row,
      inboundTag: row.inbound_tag,
      is_disabled: !checked,
    };
    persistUpdate(
      row.id,
      updateHost(hosts, row.id, toHostPayload(values)),
      values,
    );
  };

  const removeHostRow = (row: HostRow) => {
    const previousHosts = hosts;
    setHosts(removeHost(hosts, row.id));
    deleteHost.mutate(row.id, {
      onError: (error) => {
        setHosts(previousHosts);
        generateErrorMessage(error);
      },
    });
  };

  const drop = (target: HostRow) => {
    if (!draggedRow || !dropTarget) {
      setDraggedRow(null);
      setDropTarget(null);
      return;
    }

    const sourceIndex = rows.findIndex((row) => row.id === draggedRow.id);
    const targetRowIndex = rows.findIndex((row) => row.id === target.id);
    if (sourceIndex < 0 || targetRowIndex < 0) {
      setDraggedRow(null);
      setDropTarget(null);
      return;
    }

    let targetIndex =
      targetRowIndex + (dropTarget.position === "after" ? 1 : 0);
    if (sourceIndex < targetIndex) targetIndex -= 1;

    if (sourceIndex !== targetIndex) {
      persistReorder(reorderHost(hosts, sourceIndex, targetIndex));
    }
    setDraggedRow(null);
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
              disabled={isFetching}
              onClick={() => void refetch()}
              aria-label={t("hostsPage.refresh").toString()}
            >
              <RefreshCw className={isFetching ? "animate-spin" : undefined} />
              <span className="hidden sm:inline">{t("hostsPage.refresh")}</span>
            </Button>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus />
              {t("create")}
            </Button>
          </div>
        }
      >
        <h1 className="font-semibold">{t("hostsPage.title")}</h1>
      </Page.Header>

      {isLoading ? (
        <HostsSkeleton />
      ) : isError || !hostsData ? (
        <HostsState
          title={t("hostsPage.loadErrorTitle")}
          description={t("hostsPage.loadErrorDescription")}
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              <RefreshCw />
              {t("hostsPage.refresh")}
            </Button>
          }
        />
      ) : rows.length ? (
        <>
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10" />
                  <TableHead>{t("hostsPage.name")}</TableHead>
                  <TableHead>{t("hostsPage.addressPort")}</TableHead>
                  <TableHead>{t("hostsPage.enabled")}</TableHead>
                  <TableHead>{t("hostsPage.inbound")}</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    draggable
                    className={`cursor-pointer ${
                      dropTarget?.rowId === row.id
                        ? dropTarget.position === "before"
                          ? "border-t-2 border-t-primary"
                          : "border-b-2 border-b-primary"
                        : ""
                    }`}
                    onDragStart={() => setDraggedRow(row)}
                    onDragEnd={() => {
                      setDraggedRow(null);
                      setDropTarget(null);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!draggedRow) {
                        return;
                      }

                      const bounds =
                        event.currentTarget.getBoundingClientRect();
                      const position =
                        event.clientY < bounds.top + bounds.height / 2
                          ? "before"
                          : "after";
                      setDropTarget((current) =>
                        current?.rowId === row.id &&
                        current.position === position
                          ? current
                          : { rowId: row.id, position },
                      );
                    }}
                    onDrop={() => drop(row)}
                    onClick={() => {
                      setEditingRow(row);
                      setDialogOpen(true);
                    }}
                  >
                    <TableCell>
                      <GripVertical className="size-4 cursor-grab text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.remark}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.address}:{row.port ?? "default"}
                    </TableCell>
                    <TableCell>
                      <div
                        className="w-fit"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Switch
                          checked={!row.is_disabled}
                          disabled={pending}
                          onCheckedChange={(checked) =>
                            toggleHost(row, checked)
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.inbound_tag}</Badge>
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending}
                          onClick={() => duplicate(row)}
                          aria-label={t("hostsPage.copy")}
                        >
                          <Copy />
                        </Button>
                        <DeleteHostButton
                          pending={pending}
                          name={row.remark}
                          onDelete={() => removeHostRow(row)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {rows.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border bg-card p-4 shadow-xs"
                onClick={() => {
                  setEditingRow(row);
                  setDialogOpen(true);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.remark}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {row.address}:{row.port ?? "default"}
                    </p>
                  </div>
                  <Badge variant="outline">{row.inbound_tag}</Badge>
                </div>
                <div
                  className="mt-4 flex items-center justify-between"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Switch
                    checked={!row.is_disabled}
                    disabled={pending}
                    onCheckedChange={(checked) => toggleHost(row, checked)}
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => duplicate(row)}
                    >
                      <Copy />
                    </Button>
                    <DeleteHostButton
                      pending={pending}
                      name={row.remark}
                      onDelete={() => removeHostRow(row)}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <HostsState
          title={t("hostsPage.emptyTitle")}
          description={t("hostsPage.emptyDescription")}
          action={
            <Button onClick={openCreate}>
              <Plus />
              {t("create")}
            </Button>
          }
        />
      )}

      {hostsData && (
        <HostDialog
          key={`${editingRow?.id ?? "create"}-${dialogOpen}`}
          open={dialogOpen}
          host={editingRow ?? null}
          inboundTag={editingRow?.inbound_tag ?? null}
          pending={pending}
          onOpenChange={setDialogOpen}
          onSubmit={submitHost}
        />
      )}
    </Page>
  );
}

function DeleteHostButton({
  pending,
  name,
  onDelete,
}: {
  pending: boolean;
  name: string;
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
          <AlertDialogTitle>{t("hostsPage.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("hostsPage.deleteDescription", { name })}
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

function HostsState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Empty className="min-h-96 rounded-xl">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Link2 />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

function HostsSkeleton() {
  return (
    <div className="space-y-3 rounded-xl p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}
