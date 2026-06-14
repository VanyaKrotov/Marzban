import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { HostType } from "../../types";
import type { InboundType } from "types/Inbound";

import { AdvancedFields } from "./components/AdvancedFields";
import { BasicFields } from "./components/BasicFields";
import { HostDialogHeader } from "./components/DialogHeader";
import { FormActions } from "./components/FormActions";
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
  inbounds: InboundType[];
  inboundsLoading: boolean;
  inboundsError: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: HostFormValues) => void;
};

export function HostDialog({
  open,
  host,
  inboundTag,
  inbounds,
  inboundsLoading,
  inboundsError,
  pending,
  onOpenChange,
  onSubmit,
}: HostDialogProps) {
  const { t } = useTranslation();
  const initialInbound = inboundTag ?? inbounds[0]?.tag ?? "";
  const form = useForm<HostFormValues>({
    resolver: zodResolver(hostFormSchema),
    defaultValues: getHostFormValues(initialInbound, host),
  });
  const selectedInboundTag = useWatch({
    control: form.control,
    name: "inboundTag",
  });
  const selectedInbound = inbounds.find(
    (inbound) => inbound.tag === selectedInboundTag,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
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
            <BasicFields
              form={form}
              inbounds={inbounds}
              selectedInbound={selectedInbound}
              pending={pending}
            />
            <AdvancedFields form={form} pending={pending} />
            <FormActions
              form={form}
              isEditing={Boolean(host)}
              pending={pending}
            />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
