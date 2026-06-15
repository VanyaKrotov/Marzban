import { zodResolver } from "@hookform/resolvers/zod";
import { Braces, LoaderCircle } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { MonacoJsonEditor } from "@/components/MonacoJsonEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { xrayOutboundSchema } from "@/lib/xray-schemas/outbound";
import type {
  OutboundConfig,
  OutboundPayload,
} from "../../lib/outbounds-query";

const outboundFormSchema = z.object({
  tag: z.string().trim().min(1).max(256),
  enabled: z.boolean(),
  content: z.string().superRefine((value, context) => {
    try {
      const parsed = JSON.parse(value);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        context.addIssue({
          code: "custom",
          message: "JSON must contain an object",
        });
      }
    } catch {
      context.addIssue({ code: "custom", message: "Invalid JSON" });
    }
  }),
});

type OutboundFormValues = z.infer<typeof outboundFormSchema>;

type OutboundDialogProps = {
  outbound: OutboundConfig | null;
  nodeId: number;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: OutboundPayload) => void;
};

const defaultContent = {
  protocol: "freedom",
  settings: {},
};

export function OutboundDialog({
  outbound,
  nodeId,
  open,
  pending,
  onOpenChange,
  onSubmit,
}: OutboundDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
        <OutboundDialogContent
          outbound={outbound}
          nodeId={nodeId}
          pending={pending}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

function OutboundDialogContent({
  outbound,
  nodeId,
  pending,
  onSubmit,
}: Pick<
  OutboundDialogProps,
  | "outbound"
  | "nodeId"
  | "pending"
  | "onSubmit"
>) {
  const { t } = useTranslation();
  const readonly = outbound?.readonly ?? false;
  const form = useForm<OutboundFormValues>({
    resolver: zodResolver(outboundFormSchema),
    defaultValues: {
      tag: outbound?.tag ?? "",
      enabled: outbound?.enabled ?? true,
      content: JSON.stringify(outbound?.content ?? defaultContent, null, 2),
    },
  });

  const submit = (values: OutboundFormValues) => {
    onSubmit({
      tag: values.tag,
      enabled: values.enabled,
      node_ids: outbound?.node_ids ?? [nodeId],
      content: JSON.parse(values.content) as Record<string, unknown>,
    });
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Braces className="size-5 text-primary" />
            {t(
              outbound
                ? "outboundsPage.editTitle"
                : "outboundsPage.createTitle",
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              readonly
                ? "outboundsPage.readonlyDescription"
                : "outboundsPage.dialogDescription",
            )}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Controller
              control={form.control}
              name="tag"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="outbound-tag">
                    {t("outboundsPage.tag")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="outbound-tag"
                    disabled={Boolean(outbound) || pending}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <Field orientation="horizontal" className="h-9">
                  <Switch
                    id="outbound-enabled"
                    checked={field.value}
                    disabled={pending}
                    onCheckedChange={field.onChange}
                  />
                  <FieldLabel htmlFor="outbound-enabled">
                    {t(field.value ? "enabled" : "disabled")}
                  </FieldLabel>
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="content"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="outbound-content">
                  {t("outboundsPage.content")}
                </FieldLabel>
                <MonacoJsonEditor
                  id="outbound-content"
                  value={field.value}
                  onChange={field.onChange}
                  schema={xrayOutboundSchema}
                  schemaUri="https://marzban.local/schemas/xray-outbound.json"
                  className="min-h-96"
                  disabled={pending || readonly}
                  invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" />}
              {t(outbound ? "save" : "create")}
            </Button>
          </div>
        </form>
    </>
  );
}
