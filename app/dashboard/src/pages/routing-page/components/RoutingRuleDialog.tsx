import { zodResolver } from "@hookform/resolvers/zod";
import { Braces, ChevronDown, LoaderCircle, LockKeyhole } from "lucide-react";
import { useMemo } from "react";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { NodeType } from "types/Node";

import {
  type RoutingRule,
  type RoutingRulePayload,
} from "../lib/query";
import { createXrayRoutingRuleSchema } from "../lib/xray-routing-rule-schema";

const formSchema = z.object({
  name: z.string().trim().min(1).max(128),
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

type FormValues = z.infer<typeof formSchema>;

type RoutingRuleDialogProps = {
  rule: RoutingRule | null;
  nodes: NodeType[];
  inboundTags: string[];
  outboundTags: string[];
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: RoutingRulePayload) => void;
};

export function RoutingRuleDialog({
  rule,
  nodes,
  inboundTags,
  outboundTags,
  open,
  pending,
  onOpenChange,
  onSubmit,
}: RoutingRuleDialogProps) {
  const { t } = useTranslation();
  const readonly = rule?.readonly ?? false;
  const schema = useMemo(
    () => createXrayRoutingRuleSchema(inboundTags, outboundTags),
    [inboundTags, outboundTags],
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: rule?.name ?? "",
      enabled: rule?.enabled ?? true,
      node_ids: rule?.node_ids ?? [],
      content: JSON.stringify(
        rule?.content ?? {
          type: "field",
          inboundTag: [],
          outboundTag: outboundTags[0] ?? "DIRECT",
        },
        null,
        2,
      ),
    },
  });

  const submit = (values: FormValues) => {
    onSubmit({
      name: values.name,
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
            {t(
              rule
                ? "routingPage.editTitle"
                : "routingPage.createTitle",
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              readonly
                ? "routingPage.readonlyDescription"
                : "routingPage.dialogDescription",
            )}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="routing-rule-name">
                    {t("routingPage.name")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="routing-rule-name"
                    disabled={pending}
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
                    id="routing-rule-enabled"
                    checked={field.value}
                    disabled={pending}
                    onCheckedChange={field.onChange}
                  />
                  <FieldLabel htmlFor="routing-rule-enabled">
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
                <FieldLabel>{t("routingPage.assignedNodes")}</FieldLabel>
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
                          : t("routingPage.noNodes")}
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
                <FieldLabel htmlFor="routing-rule-content">
                  {t("routingPage.content")}
                </FieldLabel>
                <MonacoJsonEditor
                  id="routing-rule-content"
                  value={field.value}
                  onChange={field.onChange}
                  schema={schema}
                  schemaUri="https://marzban.local/schemas/xray-routing-rule.json"
                  className="min-h-96"
                  disabled={pending || readonly}
                  invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          {readonly && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LockKeyhole className="size-4" />
              {t("routingPage.readonly")}
            </div>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" />}
              {t(rule ? "save" : "create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
