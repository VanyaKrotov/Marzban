import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox";
import type { InboundType } from "types/Inbound";

import type { HostFormValues } from "../lib/form";
import { HostTextField } from "./FormFields";
import { InfoTooltip } from "./InfoTooltip";
import { VariablesPopover } from "./VariablesPopover";

type InboundGroup = {
  key: string;
  label: string;
  inbounds: InboundType[];
};

function getInboundLabel(inbound: InboundType) {
  return `${inbound.tag} (${inbound.protocol}/${inbound.network})`;
}

function groupInboundsByNodes(
  inbounds: InboundType[],
  unassignedLabel: string,
): InboundGroup[] {
  const groups = new Map<string, InboundGroup>();

  for (const inbound of inbounds) {
    const nodes = [...inbound.nodes].sort((left, right) => left.id - right.id);
    const key = nodes.map((node) => node.id).join(",") || "unassigned";
    const label = nodes.length
      ? [...nodes]
          .sort(
            (left, right) =>
              left.name.localeCompare(right.name) || left.id - right.id,
          )
          .map((node) => node.name)
          .join(", ")
      : unassignedLabel;
    const group = groups.get(key);

    if (group) {
      group.inbounds.push(inbound);
    } else {
      groups.set(key, { key, label, inbounds: [inbound] });
    }
  }

  return [...groups.values()];
}

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
  const inboundGroups = groupInboundsByNodes(
    inbounds,
    t("hostsPage.unassignedNodes"),
  );

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
            <Combobox
              value={selectedInbound ?? null}
              disabled={pending}
              itemToStringLabel={getInboundLabel}
              itemToStringValue={(inbound) => inbound.tag}
              isItemEqualToValue={(left, right) => left.tag === right.tag}
              onValueChange={(inbound) => field.onChange(inbound?.tag ?? "")}
            >
              <ComboboxInput id="host-inbound" className="w-full" />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>
                    {t("hostsPage.noInboundMatches")}
                  </ComboboxEmpty>
                  {inboundGroups.map((group) => (
                    <ComboboxGroup key={group.key}>
                      <ComboboxLabel>{group.label}</ComboboxLabel>
                      {group.inbounds.map((inbound) => (
                        <ComboboxItem key={inbound.tag} value={inbound}>
                          {getInboundLabel(inbound)}
                        </ComboboxItem>
                      ))}
                    </ComboboxGroup>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
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
