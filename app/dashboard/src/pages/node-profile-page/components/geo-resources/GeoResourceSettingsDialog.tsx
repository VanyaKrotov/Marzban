import { useState } from "react";
import { LoaderCircle, Pencil } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
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
import { CronScheduleInput } from "./CronScheduleInput";

interface Props {
  nodeId: number;
  resource: NodeGeoResource;
}

type GeoResourceSettingsFormValues = {
  filename: string;
  url: string;
  cron: string;
};

export function GeoResourceSettingsDialog({ nodeId, resource }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] =
    useState<GeoResourceSettingsFormValues | null>(null);

  const rename = useRenameGeoResourceMutation(nodeId);
  const schedule = useUpdateGeoResourceScheduleMutation(nodeId);
  const pending = rename.isPending || schedule.isPending;

  const save = async (
    values: GeoResourceSettingsFormValues,
    overwrite = false,
  ) => {
    try {
      if (values.filename !== resource.filename) {
        await rename.mutateAsync({
          filename: resource.filename,
          newFilename: values.filename,
          overwrite,
        });
      }
      if (resource.auto_update) {
        await schedule.mutateAsync({
          filename: values.filename,
          url: values.url,
          cron: values.cron,
        });
      }
      setConfirmOverwrite(null);
      setOpen(false);
    } catch (error) {
      if (
        !overwrite &&
        (error as { response?: { status?: number } })?.response?.status === 409
      ) {
        setConfirmOverwrite(values);
      } else {
        generateErrorMessage(error);
      }
    }
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setConfirmOverwrite(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
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
          <FormContent resource={resource} pending={pending} save={save} />
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(confirmOverwrite)}
        onOpenChange={(state) =>
          setConfirmOverwrite(state ? confirmOverwrite : null)
        }
      >
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
            <AlertDialogAction
              variant="destructive"
              onClick={() => save(confirmOverwrite!, true)}
            >
              {t("geoResources.overwrite")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FormContent({
  resource,
  pending,
  save,
}: Pick<Props, "resource"> & {
  pending: boolean;
  save(values: GeoResourceSettingsFormValues): void;
}) {
  const { t } = useTranslation();
  const form = useForm<GeoResourceSettingsFormValues>({
    defaultValues: {
      filename: resource.filename,
      url: resource.url ?? "",
      cron: resource.cron ?? "",
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("geoResources.editTitle")}</DialogTitle>
        <DialogDescription>
          {t("geoResources.editDescription")}
        </DialogDescription>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => save(values))}
      >
        <div className="space-y-2">
          <Label htmlFor={`geo-name-${resource.filename}`}>
            {t("geoResources.filename")}
          </Label>
          <Controller
            control={form.control}
            name="filename"
            rules={{ required: true }}
            render={({ field }) => (
              <Input id={`geo-name-${resource.filename}`} {...field} />
            )}
          />
        </div>
        {resource.auto_update && (
          <>
            <div className="space-y-2">
              <Label htmlFor={`geo-url-${resource.filename}`}>
                {t("geoResources.url")}
              </Label>
              <Controller
                control={form.control}
                name="url"
                rules={{ required: resource.auto_update }}
                render={({ field }) => (
                  <Input
                    id={`geo-url-${resource.filename}`}
                    type="url"
                    placeholder="https://example.com/geosite.dat"
                    {...field}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`geo-cron-${resource.filename}`}>
                {t("geoResources.cron")}
              </Label>
              <Controller
                control={form.control}
                name="cron"
                rules={{ required: resource.auto_update }}
                render={({ field }) => (
                  <CronScheduleInput
                    id={`geo-cron-${resource.filename}`}
                    name={field.name}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </>
        )}
        <DialogFooter>
          <Button type="submit" disabled={!form.formState.isValid || pending}>
            {pending && <LoaderCircle className="animate-spin" />}
            {t("geoResources.save")}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
