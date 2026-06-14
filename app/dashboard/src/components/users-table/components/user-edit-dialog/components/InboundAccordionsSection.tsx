import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import type { InboundsMap } from "types/Inbound";

import type { UserFormValues } from "../lib/form";
import { ProtocolAccordion } from "./ProtocolAccordion";

export function InboundAccordionsSection({
  disabled,
  availableInbounds,
}: {
  disabled: boolean;
  availableInbounds: InboundsMap;
}) {
  const { t } = useTranslation();
  const form = useFormContext<UserFormValues>();
  const inboundErrorMessage = form.formState.errors.inbounds?.message;

  return (
    <Field data-invalid={Boolean(form.formState.errors.inbounds)}>
      <FieldLabel asChild>
        <p>{t("userDialog.protocols")}</p>
      </FieldLabel>
      <ProtocolAccordion
        disabled={disabled}
        availableInbounds={availableInbounds}
        options={[
          { title: "vmess", description: t("userDialog.vmessDesc") },
          { title: "vless", description: t("userDialog.vlessDesc") },
          { title: "trojan", description: t("userDialog.trojanDesc") },
          {
            title: "shadowsocks",
            description: t("userDialog.shadowsocksDesc"),
          },
        ]}
      />
      <FieldError>
        {typeof inboundErrorMessage === "string"
          ? t(inboundErrorMessage)
          : undefined}
      </FieldError>
    </Field>
  );
}
