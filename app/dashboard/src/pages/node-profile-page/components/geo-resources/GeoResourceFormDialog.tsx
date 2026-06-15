import { DragEvent, useRef, useState } from "react";
import { FileArchive, LoaderCircle, Plus, UploadCloud } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateErrorMessage } from "utils/toastHandler";

import {
  useCreateRemoteGeoResourceMutation,
  useUploadGeoResourceMutation,
} from "./query";

export function GeoResourceFormDialog({ nodeId }: { nodeId: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [filename, setFilename] = useState("");
  const [url, setUrl] = useState("");
  const [cron, setCron] = useState("0 4 * * *");
  const [confirmOverwrite, setConfirmOverwrite] = useState<
    "file" | "remote" | null
  >(null);
  const upload = useUploadGeoResourceMutation(nodeId);
  const createRemote = useCreateRemoteGeoResourceMutation(nodeId);
  const pending = upload.isPending || createRemote.isPending;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setFile(null);
    setFilename("");
    setUrl("");
    setConfirmOverwrite(null);
  };

  const isConflict = (error: unknown) =>
    (error as { response?: { status?: number } })?.response?.status === 409;

  const submitFile = (overwrite = false) => {
    if (!file) return;
    upload.mutate(
      { file, overwrite },
      {
        onSuccess: close,
        onError: (error) =>
          isConflict(error)
            ? setConfirmOverwrite("file")
            : generateErrorMessage(error),
      },
    );
  };

  const submitRemote = (overwrite = false) => {
    createRemote.mutate(
      { filename, url, cron, overwrite },
      {
        onSuccess: close,
        onError: (error) =>
          isConflict(error)
            ? setConfirmOverwrite("remote")
            : generateErrorMessage(error),
      },
    );
  };

  const selectFile = (selected?: File) => {
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".dat")) {
      toast.error(t("geoResources.dropInvalid"));
      return;
    }
    setFile(selected);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    selectFile(event.dataTransfer.files[0]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus />
            {t("geoResources.add")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("geoResources.addTitle")}</DialogTitle>
            <DialogDescription>
              {t("geoResources.addDescription")}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="upload">
            <TabsList className="w-full">
              <TabsTrigger value="upload">{t("geoResources.upload")}</TabsTrigger>
              <TabsTrigger value="remote">{t("geoResources.remote")}</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="space-y-4 pt-4">
              <div>
                <Input
                  ref={fileInputRef}
                  id="geo-file"
                  type="file"
                  accept=".dat"
                  className="sr-only"
                  onChange={(event) =>
                    selectFile(event.target.files?.[0])
                  }
                />
                <div
                  role="button"
                  tabIndex={0}
                  className={
                    dragActive
                      ? "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary bg-primary/10 p-6 text-center outline-none transition-colors"
                      : "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 text-center outline-none transition-colors hover:border-primary/60 hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  }
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                  }}
                  onDrop={handleDrop}
                >
                  <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {file ? (
                      <FileArchive className="size-5" />
                    ) : (
                      <UploadCloud className="size-5" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {file ? file.name : t("geoResources.dropHere")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {file
                        ? t("geoResources.selectedFile")
                        : t("geoResources.dropOrSelect")}
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!file || pending}
                  onClick={() => submitFile()}
                >
                  {pending && <LoaderCircle className="animate-spin" />}
                  {t("geoResources.upload")}
                </Button>
              </DialogFooter>
            </TabsContent>
            <TabsContent value="remote" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="geo-filename">
                  {t("geoResources.filename")}
                </Label>
                <Input
                  id="geo-filename"
                  value={filename}
                  placeholder="geoip.dat"
                  onChange={(event) => setFilename(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="geo-url">{t("geoResources.url")}</Label>
                <Input
                  id="geo-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="geo-cron">{t("geoResources.cron")}</Label>
                <Input
                  id="geo-cron"
                  value={cron}
                  onChange={(event) => setCron(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("geoResources.cronHint")}
                </p>
              </div>
              <DialogFooter>
                <Button
                  disabled={!filename || !url || !cron || pending}
                  onClick={() => submitRemote()}
                >
                  {pending && <LoaderCircle className="animate-spin" />}
                  {t("geoResources.add")}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmOverwrite !== null}
        onOpenChange={(value) => !value && setConfirmOverwrite(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("geoResources.overwriteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("geoResources.overwriteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                confirmOverwrite === "file"
                  ? submitFile(true)
                  : submitRemote(true)
              }
            >
              {t("geoResources.overwrite")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
