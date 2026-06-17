import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import type { InboundsMap, ProtocolType } from "types/Inbound";

import { ProtocolAccordion } from "./ProtocolAccordion";
import type { UserFormValues } from "../lib/form";

const PROTOCOLS = [
  "vmess",
  "vless",
  "trojan",
  "shadowsocks",
  "socks",
  "hysteria",
] as const;

interface Props {
  disabled: boolean;
  availableInbounds: InboundsMap;
  accountProtocols?: ProtocolType[];
}

export function InboundAccordionsSection({
  disabled,
  availableInbounds,
  accountProtocols,
}: Props) {
  const { t } = useTranslation();
  const form = useFormContext<UserFormValues>();
  const inboundErrorMessage = form.formState.errors.inbounds?.message;

  const protocols = accountProtocols ?? PROTOCOLS;

  return (
    <Field data-invalid={Boolean(form.formState.errors.inbounds)}>
      <FieldLabel asChild>
        <p>{t("userDialog.protocols")}</p>
      </FieldLabel>
      <ProtocolAccordion
        disabled={disabled}
        availableInbounds={availableInbounds}
        options={protocols.map((protocol) => ({
          title: protocol,
          description: t(`userDialog.${protocol}Desc`),
        }))}
      />
      <FieldError>
        {typeof inboundErrorMessage === "string"
          ? t(inboundErrorMessage)
          : null}
      </FieldError>
    </Field>
  );
}
