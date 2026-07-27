import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { HostGroupType, HostType } from "../../types";
import { useInboundsQuery } from "../../lib/query";

import { AdvancedFields } from "./components/AdvancedFields";
import { BasicFields } from "./components/BasicFields";
import { HostDialogHeader } from "./components/DialogHeader";
import { FormActions } from "./components/FormActions";
import { GroupsField } from "./components/GroupsField";
import {
  getHostFormValues,
  hostFormSchema,
  type HostFormValues,
} from "./lib/form";

export type { HostFormValues } from "./lib/form";

type HostDialogProps = {
  open: boolean;
  host: HostType | null;
  inboundTag: string | null;
  hostGroups: HostGroupType[];
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: HostFormValues) => void;
};

export function HostDialog({
  open,
  host,
  inboundTag,
  hostGroups,
  pending,
  onOpenChange,
  onSubmit,
}: HostDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <HostDialogContent
          host={host}
          inboundTag={inboundTag}
          hostGroups={hostGroups}
          pending={pending}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

function HostDialogContent({
  host,
  inboundTag,
  pending,
  onSubmit,
  hostGroups,
}: Omit<HostDialogProps, "open" | "onOpenChange">) {
  const { t } = useTranslation();
  const {
    data: inbounds = [],
    isLoading: inboundsLoading,
    isError: inboundsError,
  } = useInboundsQuery(true);
  const initialInbound = inboundTag ?? inbounds[0]?.tag ?? "";
  const form = useForm<HostFormValues>({
    resolver: zodResolver(hostFormSchema),
    defaultValues: getHostFormValues(initialInbound, host),
  });

  return (
    <>
      <HostDialogHeader isEditing={Boolean(host)} />
      {inboundsLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : inboundsError || !inbounds.length ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          {inboundsError
            ? t("hostsPage.loadErrorDescription")
            : t("hostsPage.noInboundsDescription")}
        </p>
      ) : (
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormProvider {...form}>
            <BasicFields inbounds={inbounds} pending={pending} />
            <GroupsField groups={hostGroups} pending={pending} />
            <AdvancedFields pending={pending} />
            <FormActions isEditing={Boolean(host)} pending={pending} />
          </FormProvider>
        </form>
      )}
    </>
  );
}
