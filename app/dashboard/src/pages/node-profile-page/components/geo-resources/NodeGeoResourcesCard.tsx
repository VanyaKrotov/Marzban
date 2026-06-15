import { DragEvent, useMemo, useRef, useState } from "react";
import {
  Download,
  FileArchive,
  LoaderCircle,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { generateErrorMessage } from "utils/toastHandler";

import { GeoResourceFormDialog } from "./GeoResourceFormDialog";
import { GeoResourceSettingsDialog } from "./GeoResourceSettingsDialog";
import {
  downloadNodeGeoResource,
  NodeGeoResource,
  useDeleteGeoResourcesMutation,
  useNodeGeoResourcesQuery,
  useRefreshGeoResourceMutation,
  useUploadGeoResourceMutation,
} from "./query";

function formatSize(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

function ResourceStatus({ resource }: { resource: NodeGeoResource }) {
  const { t, i18n } = useTranslation();
  if (!resource.auto_update) return null;
  const marker = (
    <span
      className={
        resource.last_error
          ? "size-2 rounded-full bg-destructive"
          : "size-2 rounded-full bg-primary"
      }
      aria-label={t("geoResources.autoUpdate")}
    />
  );
  if (!resource.last_error) return marker;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{marker}</TooltipTrigger>
      <TooltipContent className="block">
        <div>{resource.last_error}</div>
        {resource.last_error_at && (
          <div className="mt-1 opacity-70">
            {new Intl.DateTimeFormat(i18n.language, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(resource.last_error_at))}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function NodeGeoResourcesCard({ nodeId }: { nodeId: number }) {
  const { t, i18n } = useTranslation();
  const query = useNodeGeoResourcesQuery(nodeId);
  const remove = useDeleteGeoResourcesMutation(nodeId);
  const refresh = useRefreshGeoResourceMutation(nodeId);
  const upload = useUploadGeoResourceMutation(nodeId);
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [conflictingFiles, setConflictingFiles] = useState<File[]>([]);
  const dragDepth = useRef(0);
  const resources = query.data ?? [];
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (filename: string, checked: boolean) =>
    setSelected((current) =>
      checked
        ? [...current, filename]
        : current.filter((item) => item !== filename),
    );

  const confirmDelete = () => {
    remove.mutate(pendingDelete, {
      onSuccess: () => {
        setSelected((current) =>
          current.filter((item) => !pendingDelete.includes(item)),
        );
        setPendingDelete([]);
      },
      onError: (error) => generateErrorMessage(error),
    });
  };

  const isConflict = (error: unknown) =>
    (error as { response?: { status?: number } })?.response?.status === 409;

  const uploadFiles = async (files: File[], overwrite = false) => {
    const conflicts: File[] = [];
    let uploaded = 0;

    for (const file of files) {
      try {
        await upload.mutateAsync({ file, overwrite });
        uploaded += 1;
      } catch (error) {
        if (!overwrite && isConflict(error)) {
          conflicts.push(file);
        } else {
          generateErrorMessage(error);
        }
      }
    }

    if (uploaded > 0) {
      toast.success(t("geoResources.dropSuccess", { count: uploaded }));
    }
    setConflictingFiles(conflicts);
  };

  const getDroppedFiles = (event: DragEvent<HTMLElement>) =>
    Array.from(event.dataTransfer.files).filter((file) =>
      file.name.toLowerCase().endsWith(".dat"),
    );

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current += 1;
    if (event.dataTransfer.types.includes("Files")) setDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    const files = getDroppedFiles(event);
    if (files.length === 0) {
      toast.error(t("geoResources.dropInvalid"));
      return;
    }
    void uploadFiles(files);
  };

  return (
    <>
      <Card
        className="relative h-full"
        onDragEnter={handleDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragActive && (
          <div className="absolute inset-2 z-20 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-center text-primary">
              <UploadCloud className="size-8" />
              <span className="font-medium">{t("geoResources.dropHere")}</span>
            </div>
          </div>
        )}
        <CardHeader>
          <CardTitle>{t("geoResources.title")}</CardTitle>
          <CardDescription>{t("geoResources.description")}</CardDescription>
          <CardAction className="flex gap-2">
            {selected.length > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setPendingDelete(selected)}
              >
                <Trash2 />
                <span className="hidden sm:inline">{t("delete")}</span>
              </Button>
            )}
            <GeoResourceFormDialog nodeId={nodeId} />
          </CardAction>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : query.isError ? (
            <Empty className="min-h-40">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileArchive />
                </EmptyMedia>
                <EmptyTitle className="text-sm">
                  {t("geoResources.loadError")}
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : resources.length === 0 ? (
            <Empty className="min-h-40">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileArchive />
                </EmptyMedia>
                <EmptyTitle className="text-sm">
                  {t("geoResources.empty")}
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="divide-y rounded-lg ring-1 ring-foreground/10">
              {resources.map((resource) => (
                <div
                  key={resource.filename}
                  className="flex min-w-0 items-center gap-3 px-3 py-2.5"
                >
                  <Checkbox
                    checked={selectedSet.has(resource.filename)}
                    onCheckedChange={(value) =>
                      toggle(resource.filename, value === true)
                    }
                    aria-label={resource.filename}
                  />
                  <FileArchive className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {resource.filename}
                      </span>
                      <ResourceStatus resource={resource} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(resource.size)}
                      {resource.modified_at &&
                        ` · ${new Intl.DateTimeFormat(i18n.language, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(resource.modified_at))}`}
                    </p>
                  </div>
                  {resource.auto_update && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      disabled={refresh.isPending}
                      aria-label={t("geoResources.updateNow")}
                      onClick={() =>
                        refresh.mutate(resource.filename, {
                          onError: (error) => generateErrorMessage(error),
                        })
                      }
                    >
                      <RefreshCw
                        className={refresh.isPending ? "animate-spin" : undefined}
                      />
                    </Button>
                  )}
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t("geoResources.download")}
                    onClick={() =>
                      downloadNodeGeoResource(nodeId, resource.filename).catch(
                        generateErrorMessage,
                      )
                    }
                  >
                    <Download />
                  </Button>
                  <GeoResourceSettingsDialog
                    nodeId={nodeId}
                    resource={resource}
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    aria-label={t("delete")}
                    onClick={() => setPendingDelete([resource.filename])}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDelete.length > 0}
        onOpenChange={(open) => !open && setPendingDelete([])}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("geoResources.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("geoResources.deleteDescription", {
                count: pendingDelete.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={confirmDelete}
            >
              {remove.isPending && <LoaderCircle className="animate-spin" />}
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={conflictingFiles.length > 0}
        onOpenChange={(open) => !open && setConflictingFiles([])}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("geoResources.overwriteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("geoResources.dropOverwriteDescription", {
                count: conflictingFiles.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={upload.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={upload.isPending}
              onClick={() => {
                const files = conflictingFiles;
                setConflictingFiles([]);
                void uploadFiles(files, true);
              }}
            >
              {upload.isPending && <LoaderCircle className="animate-spin" />}
              {t("geoResources.overwrite")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
