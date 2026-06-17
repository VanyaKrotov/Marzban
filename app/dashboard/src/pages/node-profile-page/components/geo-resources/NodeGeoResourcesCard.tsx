import { DragEvent, useMemo, useRef, useState } from "react";
import {
  Download,
  Ellipsis,
  FileArchive,
  LoaderCircle,
  Pencil,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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

export function NodeGeoResourcesDialog({
  nodeId,
  open,
  onOpenChange,
}: {
  nodeId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        {open && <NodeGeoResourcesContent nodeId={nodeId} />}
      </DialogContent>
    </Dialog>
  );
}

function NodeGeoResourcesContent({ nodeId }: { nodeId: number }) {
  const { t, i18n } = useTranslation();
  const query = useNodeGeoResourcesQuery(nodeId);
  const remove = useDeleteGeoResourcesMutation(nodeId);
  const refresh = useRefreshGeoResourceMutation(nodeId);
  const upload = useUploadGeoResourceMutation(nodeId);
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string[]>([]);
  const [settingsResource, setSettingsResource] =
    useState<NodeGeoResource | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [conflictingFiles, setConflictingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const dragDepth = useRef(0);
  const resources = query.data ?? [];
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const createAction = <GeoResourceFormDialog nodeId={nodeId} />;
  const controls = (
    <div className="flex justify-end gap-2">
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
      {createAction}
    </div>
  );
  const emptyControls = (
    <div className="flex justify-center">{createAction}</div>
  );

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
    setUploadingFiles((current) => [...current, ...files]);

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
      } finally {
        setUploadingFiles((current) => current.filter((item) => item !== file));
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
      <div
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
        <DialogHeader className="pe-8">
          <DialogTitle>{t("geoResources.title")}</DialogTitle>
          <DialogDescription>{t("geoResources.description")}</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
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
              <EmptyContent>{emptyControls}</EmptyContent>
            </Empty>
          ) : resources.length === 0 && uploadingFiles.length === 0 ? (
            <Empty className="min-h-40">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileArchive />
                </EmptyMedia>
                <EmptyTitle className="text-sm">
                  {t("geoResources.empty")}
                </EmptyTitle>
              </EmptyHeader>
              <EmptyContent>{emptyControls}</EmptyContent>
            </Empty>
          ) : (
            <div className="space-y-3">
              {controls}
              <div className="divide-y rounded-lg ring-1 ring-foreground/10">
              {uploadingFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="flex min-w-0 items-center gap-3 bg-muted/30 px-3 py-2.5 opacity-60"
                >
                  <FileArchive className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatSize(file.size)}
                    </span>
                  </div>
                  <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />
                </div>
              ))}
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
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    aria-label={t("delete")}
                    onClick={() => setPendingDelete([resource.filename])}
                  >
                    <Trash2 />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("geoResources.actions")}
                      >
                        <Ellipsis />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44">
                      {resource.auto_update && (
                        <DropdownMenuItem
                          disabled={refresh.isPending}
                          onSelect={() =>
                            refresh.mutate(resource.filename, {
                              onError: (error) => generateErrorMessage(error),
                            })
                          }
                        >
                          <RefreshCw
                            className={
                              refresh.isPending ? "animate-spin" : undefined
                            }
                          />
                          {t("geoResources.updateNow")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onSelect={() =>
                          downloadNodeGeoResource(
                            nodeId,
                            resource.filename,
                          ).catch(generateErrorMessage)
                        }
                      >
                        <Download />
                        {t("geoResources.download")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setSettingsResource(resource)}
                      >
                        <Pencil />
                        {t("edit")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {settingsResource && (
        <GeoResourceSettingsDialog
          nodeId={nodeId}
          resource={settingsResource}
          open
          onOpenChange={(open) => {
            if (!open) setSettingsResource(null);
          }}
        />
      )}

      <AlertDialog
        open={pendingDelete.length > 0}
        onOpenChange={(open) => !open && setPendingDelete([])}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                pendingDelete.length === 1
                  ? "geoResources.deleteSingleTitle"
                  : "geoResources.deleteMultipleTitle",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete.length === 1
                ? t("geoResources.deleteSingleDescription", {
                    filename: pendingDelete[0],
                  })
                : t("geoResources.deleteMultipleDescription", {
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
            <AlertDialogTitle>
              {t("geoResources.overwriteTitle")}
            </AlertDialogTitle>
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
