import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InboundType } from "types/Inbound";

import type { HostFormValues } from "../lib/form";
import { HostTextField } from "./FormFields";
import { InfoTooltip } from "./InfoTooltip";
import { VariablesPopover } from "./VariablesPopover";

export function BasicFields({
  form,
  inbounds,
  selectedInbound,
  pending,
}: {
  form: UseFormReturn<HostFormValues>;
  inbounds: InboundType[];
  selectedInbound?: InboundType;
  pending: boolean;
}) {
  const { t } = useTranslation();

  return (
    <>
      <Controller
        name="inboundTag"
        control={form.control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="host-inbound">
              {t("hostsPage.inbound")}
            </FieldLabel>
            <Select
              value={field.value}
              disabled={pending}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="host-inbound" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {inbounds.map((inbound) => (
                    <SelectItem key={inbound.tag} value={inbound.tag}>
                      {inbound.tag} ({inbound.protocol}/{inbound.network})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        )}
      />

      <Field data-invalid={Boolean(form.formState.errors.remark)}>
        <div className="flex items-center gap-1.5">
          <FieldLabel htmlFor="host-remark">{t("hostsPage.name")}</FieldLabel>
          <VariablesPopover />
        </div>
        <Input
          id="host-remark"
          placeholder="Germany"
          disabled={pending}
          {...form.register("remark")}
        />
        <FieldError errors={[form.formState.errors.remark]} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <HostTextField
          id="host-address"
          label={t("nodes.nodeAddress")}
          placeholder="example.com"
          error={form.formState.errors.address?.message}
          disabled={pending}
          {...form.register("address")}
        />
        <Controller
          name="port"
          control={form.control}
          render={({ field }) => (
            <Field>
              <div className="flex items-center gap-1.5">
                <FieldLabel htmlFor="host-port">
                  {t("hostsDialog.port")}
                </FieldLabel>
                <InfoTooltip content={t("hostsDialog.port.info")} />
              </div>
              <Input
                id="host-port"
                type="number"
                min="1"
                placeholder={String(selectedInbound?.port ?? 8080)}
                disabled={pending}
                value={field.value ?? ""}
                onChange={(event) =>
                  field.onChange(
                    event.target.value ? event.target.valueAsNumber : null,
                  )
                }
              />
            </Field>
          )}
        />
      </div>
    </>
  );
}
