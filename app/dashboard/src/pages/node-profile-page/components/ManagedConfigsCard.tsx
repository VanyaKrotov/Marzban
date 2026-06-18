import { Braces, LoaderCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
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

export type ManagedConfig = {
  tag: string;
  enabled: boolean;
  readonly: boolean;
  content: Record<string, unknown>;
};

type ManagedConfigsCardProps<T extends ManagedConfig> = {
  title: string;
  description: string;
  items: T[];
  loading: boolean;
  fetching: boolean;
  error: boolean;
  pending: boolean;
  emptyText: string;
  errorText: string;
  refreshLabel: string;
  deleteTitle: string;
  deleteDescription: (item: T) => string;
  onCreate: () => void;
  onRefresh: () => void;
  onEdit: (item: T) => void;
  onToggle: (item: T, enabled: boolean) => void;
  onDelete: (item: T) => void;
  beforeRefreshAction?: ReactNode;
  dialogs?: ReactNode;
};

export function ManagedConfigsCard<T extends ManagedConfig>({
  title,
  description,
  items,
  loading,
  fetching,
  error,
  pending,
  emptyText,
  errorText,
  refreshLabel,
  deleteTitle,
  deleteDescription,
  onCreate,
  onRefresh,
  onEdit,
  onToggle,
  onDelete,
  beforeRefreshAction,
  dialogs,
}: ManagedConfigsCardProps<T>) {
  const { t } = useTranslation();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction className="flex gap-2">
          {beforeRefreshAction}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={fetching}
            aria-label={refreshLabel}
            onClick={onRefresh}
          >
            <RefreshCw className={fetching ? "animate-spin" : undefined} />
          </Button>
          <Button type="button" size="sm" onClick={onCreate}>
            <Plus />
            {t("create")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        ) : error ? (
          <Empty className="min-h-44">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Braces />
              </EmptyMedia>
              <EmptyTitle className="text-sm">{errorText}</EmptyTitle>
              <EmptyDescription>{t("errorBoundary.retry")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : items.length ? (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("inboundsPage.tag")}</TableHead>
                  <TableHead className="w-32">
                    {t("nodeProfile.protocol")}
                  </TableHead>
                  <TableHead className="w-36">
                    {t("nodeProfile.connectionType")}
                  </TableHead>
                  <TableHead className="w-32">
                    {t("nodeProfile.securityType")}
                  </TableHead>
                  <TableHead className="w-28">{t("enabled")}</TableHead>
                  <TableHead className="w-14" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.tag}
                    className={item.readonly ? undefined : "cursor-pointer"}
                    onClick={() => {
                      if (!item.readonly) {
                        onEdit(item);
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      {item.tag}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getConfigValue(item.content, "protocol")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getStreamValue(item.content, "network")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getStreamValue(item.content, "security")}
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Switch
                        checked={item.enabled}
                        disabled={pending}
                        onCheckedChange={(enabled) => onToggle(item, enabled)}
                      />
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      {!item.readonly && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="destructive"
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
                              <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {deleteDescription(item)}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={pending}>
                                {t("cancel")}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                disabled={pending}
                                onClick={() => onDelete(item)}
                              >
                                {pending && (
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
              <EmptyTitle className="text-sm">{emptyText}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
      {dialogs}
    </Card>
  );
}

function getConfigValue(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "string" && value ? value : "-";
}

function getStreamValue(content: Record<string, unknown>, key: string) {
  const streamSettings = content.streamSettings;
  if (!streamSettings || typeof streamSettings !== "object") {
    return "-";
  }
  const value = (streamSettings as Record<string, unknown>)[key];
  return typeof value === "string" && value ? value : "-";
}
