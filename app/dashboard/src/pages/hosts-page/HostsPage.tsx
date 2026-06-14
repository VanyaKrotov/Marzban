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
  flattenHosts,
  insertHost,
  removeHost,
  reorderHost,
  updateHost,
  type HostRow,
} from "./lib/model";
import {
  useHostsQuery,
  useInboundsQuery,
  useSaveHostsMutation,
} from "./lib/query";
import type { HostsSchema } from "./types";

export function HostsPage() {
  const { t } = useTranslation();
  const [hosts, setHosts] = useState<HostsSchema>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<HostRow | null>(null);
  const [draggedRow, setDraggedRow] = useState<HostRow | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    rowId: string;
    position: "before" | "after";
  } | null>(null);
  const {
    data: hostsData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useHostsQuery();
  const {
    data: inbounds = [],
    isLoading: inboundsLoading,
    isError: inboundsError,
  } = useInboundsQuery(dialogOpen);
  const save = useSaveHostsMutation();
  const rows = useMemo(() => flattenHosts(hosts), [hosts]);

  useEffect(() => {
    if (hostsData) setHosts(cloneHosts(hostsData));
  }, [hostsData]);

  const persist = (nextHosts: HostsSchema, successMessage?: string) => {
    if (!hostsData) return;
    const previousHosts = hosts;
    setHosts(nextHosts);
    save.mutate(nextHosts, {
      onSuccess: () => {
        if (successMessage) generateSuccessMessage(successMessage);
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
    const { inboundTag, ...host } = values;
    const nextHosts = editingRow
      ? updateHost(
          hosts,
          editingRow.inboundTag,
          editingRow.index,
          inboundTag,
          host,
        )
      : insertHost(hosts, inboundTag, hosts[inboundTag]?.length ?? 0, host);

    persist(nextHosts, t("hostsDialog.savedSuccess"));
    setDialogOpen(false);
  };

  const duplicate = (row: HostRow) => {
    persist(
      insertHost(hosts, row.inboundTag, row.index + 1, {
        ...row.host,
        remark: `${row.host.remark} ${t("hostsPage.copySuffix")}`,
        is_disabled: true,
      }),
      t("hostsPage.copied"),
    );
  };

  const drop = (target: HostRow) => {
    if (
      !draggedRow ||
      draggedRow.inboundTag !== target.inboundTag ||
      !dropTarget
    ) {
      setDraggedRow(null);
      setDropTarget(null);
      return;
    }

    let targetIndex = target.index + (dropTarget.position === "after" ? 1 : 0);
    if (draggedRow.index < targetIndex) targetIndex -= 1;

    if (draggedRow.index !== targetIndex) {
      persist(
        reorderHost(hosts, target.inboundTag, draggedRow.index, targetIndex),
      );
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
        <div>
          <h1 className="font-semibold">{t("hostsPage.title")}</h1>
          <p className="hidden text-sm text-muted-foreground sm:block">
            {t("hostsPage.description")}
          </p>
        </div>
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
                      if (
                        !draggedRow ||
                        draggedRow.inboundTag !== row.inboundTag
                      ) {
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
                      {row.host.remark}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.host.address}:{row.host.port ?? "default"}
                    </TableCell>
                    <TableCell>
                      <div
                        className="w-fit"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Switch
                          checked={!row.host.is_disabled}
                          disabled={save.isPending}
                          onCheckedChange={(checked) =>
                            persist(
                              updateHost(
                                hosts,
                                row.inboundTag,
                                row.index,
                                row.inboundTag,
                                {
                                  ...row.host,
                                  is_disabled: !checked,
                                },
                              ),
                            )
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.inboundTag}</Badge>
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={save.isPending}
                          onClick={() => duplicate(row)}
                          aria-label={t("hostsPage.copy")}
                        >
                          <Copy />
                        </Button>
                        <DeleteHostButton
                          pending={save.isPending}
                          name={row.host.remark}
                          onDelete={() =>
                            persist(
                              removeHost(hosts, row.inboundTag, row.index),
                            )
                          }
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
                    <p className="font-medium">{row.host.remark}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {row.host.address}:{row.host.port ?? "default"}
                    </p>
                  </div>
                  <Badge variant="outline">{row.inboundTag}</Badge>
                </div>
                <div
                  className="mt-4 flex items-center justify-between"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Switch
                    checked={!row.host.is_disabled}
                    disabled={save.isPending}
                    onCheckedChange={(checked) =>
                      persist(
                        updateHost(
                          hosts,
                          row.inboundTag,
                          row.index,
                          row.inboundTag,
                          { ...row.host, is_disabled: !checked },
                        ),
                      )
                    }
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
                      pending={save.isPending}
                      name={row.host.remark}
                      onDelete={() =>
                        persist(removeHost(hosts, row.inboundTag, row.index))
                      }
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
          key={`${editingRow?.id ?? "create"}-${dialogOpen}-${inbounds[0]?.tag ?? "loading"}`}
          open={dialogOpen}
          host={editingRow?.host ?? null}
          inboundTag={editingRow?.inboundTag ?? null}
          inbounds={inbounds}
          inboundsLoading={inboundsLoading}
          inboundsError={inboundsError}
          pending={save.isPending}
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
