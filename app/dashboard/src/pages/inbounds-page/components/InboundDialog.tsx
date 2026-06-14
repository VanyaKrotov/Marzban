import { zodResolver } from "@hookform/resolvers/zod";
import { Braces, ChevronDown, LoaderCircle } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { MonacoJsonEditor } from "@/components/MonacoJsonEditor";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { NodeType } from "types/Node";

import type { InboundConfig, InboundPayload } from "../lib/query";
import { xrayInboundSchema } from "../lib/xray-inbound-schema";

const inboundFormSchema = z.object({
  tag: z.string().trim().min(1).max(256),
  enabled: z.boolean(),
  node_ids: z.array(z.number()),
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

type InboundFormValues = z.infer<typeof inboundFormSchema>;

type InboundDialogProps = {
  inbound: InboundConfig | null;
  nodes: NodeType[];
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: InboundPayload) => void;
};

const defaultContent = {
  listen: "0.0.0.0",
  port: 443,
  protocol: "vless",
  settings: {
    clients: [],
    decryption: "none",
  },
  streamSettings: {
    network: "tcp",
    security: "none",
  },
};

export function InboundDialog({
  inbound,
  nodes,
  open,
  pending,
  onOpenChange,
  onSubmit,
}: InboundDialogProps) {
  const { t } = useTranslation();
  const readonly = inbound?.readonly ?? false;
  const form = useForm<InboundFormValues>({
    resolver: zodResolver(inboundFormSchema),
    defaultValues: {
      tag: inbound?.tag ?? "",
      enabled: inbound?.enabled ?? true,
      node_ids: inbound?.node_ids ?? [],
      content: JSON.stringify(inbound?.content ?? defaultContent, null, 2),
    },
  });

  const submit = (values: InboundFormValues) => {
    onSubmit({
      tag: values.tag,
      enabled: values.enabled,
      node_ids: values.node_ids,
      content: JSON.parse(values.content) as Record<string, unknown>,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Braces className="size-5 text-primary" />
            {t(inbound ? "inboundsPage.editTitle" : "inboundsPage.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t(
              readonly
                ? "inboundsPage.readonlyDescription"
                : "inboundsPage.dialogDescription",
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
                  <FieldLabel htmlFor="inbound-tag">
                    {t("inboundsPage.tag")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="inbound-tag"
                    disabled={Boolean(inbound) || pending}
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
                    id="inbound-enabled"
                    checked={field.value}
                    disabled={pending}
                    onCheckedChange={field.onChange}
                  />
                  <FieldLabel htmlFor="inbound-enabled">
                    {t(field.value ? "enabled" : "disabled")}
                  </FieldLabel>
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="node_ids"
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("inboundsPage.assignedNodes")}</FieldLabel>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between font-normal"
                      disabled={pending}
                    >
                      <span className="truncate">
                        {field.value.length
                          ? nodes
                              .filter(
                                (node) =>
                                  node.id != null &&
                                  field.value.includes(node.id),
                              )
                              .map((node) => node.name)
                              .join(", ")
                          : t("inboundsPage.noNodes")}
                      </span>
                      <ChevronDown className="size-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-[var(--radix-dropdown-menu-trigger-width)]"
                  >
                    {nodes.map((node) =>
                      node.id == null ? null : (
                        <DropdownMenuCheckboxItem
                          key={node.id}
                          checked={field.value.includes(node.id)}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked
                                ? [...field.value, node.id]
                                : field.value.filter(
                                    (nodeId) => nodeId !== node.id,
                                  ),
                            )
                          }
                          onSelect={(event) => event.preventDefault()}
                        >
                          {node.name}
                        </DropdownMenuCheckboxItem>
                      ),
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="content"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="inbound-content">
                  {t("inboundsPage.content")}
                </FieldLabel>
                <MonacoJsonEditor
                  id="inbound-content"
                  value={field.value}
                  onChange={field.onChange}
                  schema={xrayInboundSchema}
                  schemaUri="https://marzban.local/schemas/xray-inbound.json"
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
              {t(inbound ? "save" : "create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
