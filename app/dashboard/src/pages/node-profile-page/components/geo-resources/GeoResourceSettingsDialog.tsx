import { useEffect, useState } from "react";
import { LoaderCircle, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateErrorMessage } from "utils/toastHandler";

import {
  NodeGeoResource,
  useRenameGeoResourceMutation,
  useUpdateGeoResourceScheduleMutation,
} from "./query";

export function GeoResourceSettingsDialog({
  nodeId,
  resource,
}: {
  nodeId: number;
  resource: NodeGeoResource;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [filename, setFilename] = useState(resource.filename);
  const [url, setUrl] = useState(resource.url ?? "");
  const [cron, setCron] = useState(resource.cron ?? "");
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const rename = useRenameGeoResourceMutation(nodeId);
  const schedule = useUpdateGeoResourceScheduleMutation(nodeId);
  const pending = rename.isPending || schedule.isPending;

  useEffect(() => {
    if (!open) return;
    setFilename(resource.filename);
    setUrl(resource.url ?? "");
    setCron(resource.cron ?? "");
  }, [open, resource]);

  const save = async (overwrite = false) => {
    try {
      if (filename !== resource.filename) {
        await rename.mutateAsync({
          filename: resource.filename,
          newFilename: filename,
          overwrite,
        });
      }
      if (resource.auto_update) {
        await schedule.mutateAsync({ filename, url, cron });
      }
      setOpen(false);
    } catch (error) {
      if (
        !overwrite &&
        (error as { response?: { status?: number } })?.response?.status === 409
      ) {
        setConfirmOverwrite(true);
      } else {
        generateErrorMessage(error);
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={t("edit")}
          >
            <Pencil />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("geoResources.editTitle")}</DialogTitle>
            <DialogDescription>
              {t("geoResources.editDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`geo-name-${resource.filename}`}>
                {t("geoResources.filename")}
              </Label>
              <Input
                id={`geo-name-${resource.filename}`}
                value={filename}
                onChange={(event) => setFilename(event.target.value)}
              />
            </div>
            {resource.auto_update && (
              <>
                <div className="space-y-2">
                  <Label htmlFor={`geo-url-${resource.filename}`}>
                    {t("geoResources.url")}
                  </Label>
                  <Input
                    id={`geo-url-${resource.filename}`}
                    type="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`geo-cron-${resource.filename}`}>
                    {t("geoResources.cron")}
                  </Label>
                  <Input
                    id={`geo-cron-${resource.filename}`}
                    value={cron}
                    onChange={(event) => setCron(event.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={
                !filename ||
                pending ||
                (resource.auto_update && (!url || !cron))
              }
              onClick={() => save()}
            >
              {pending && <LoaderCircle className="animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmOverwrite} onOpenChange={setConfirmOverwrite}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("geoResources.overwriteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("geoResources.overwriteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => save(true)}>
              {t("geoResources.overwrite")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
