import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  proxyALPN,
  proxyFingerprint,
  proxyHostSecurity,
} from "constants/Proxies";

import { HOST_BOOLEAN_FIELDS } from "../lib/constants";
import type { HostFormValues } from "../lib/form";
import { HostSelectField, HostTextField } from "./FormFields";

export function AdvancedFields({ pending }: { pending: boolean }) {
  const { t } = useTranslation();
  const form = useFormContext<HostFormValues>();

  return (
    <section className="space-y-4 border-t pt-5">
      <h3 className="font-medium">{t("hostsDialog.advancedOptions")}</h3>
      <HostTextField
        id="host-sni"
        label={t("hostsDialog.sni")}
        placeholder="example.com"
        description={t("hostsDialog.sni.info")}
        disabled={pending}
        {...form.register("sni")}
      />
      <HostTextField
        id="host-request-host"
        label={t("hostsDialog.host")}
        placeholder="example.com"
        description={t("hostsDialog.host.info")}
        disabled={pending}
        {...form.register("host")}
      />
      <HostTextField
        id="host-path"
        label={t("hostsDialog.path")}
        placeholder="/vless"
        description={t("hostsDialog.path.info")}
        disabled={pending}
        {...form.register("path")}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <HostSelectField
          name="security"
          label={t("hostsDialog.security")}
          description={t("hostsDialog.security.info")}
          options={proxyHostSecurity}
          control={form.control}
          disabled={pending}
        />
        <HostSelectField
          name="alpn"
          label={t("hostsDialog.alpn")}
          options={proxyALPN}
          control={form.control}
          disabled={pending}
        />
        <HostSelectField
          name="fingerprint"
          label={t("hostsDialog.fingerprint")}
          options={proxyFingerprint}
          control={form.control}
          disabled={pending}
        />
      </div>
      <HostTextField
        id="host-fragment"
        label={t("hostsDialog.fragment")}
        placeholder="100-200,10-20,tlshello"
        description={t("hostsDialog.fragment.info")}
        disabled={pending}
        {...form.register("fragment_setting")}
      />
      <HostTextField
        id="host-noise"
        label={t("hostsDialog.noise")}
        placeholder="rand:10-20,10-20"
        description={t("hostsDialog.noise.info")}
        disabled={pending}
        {...form.register("noise_setting")}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {HOST_BOOLEAN_FIELDS.map(([name, label]) => (
          <Controller
            key={name}
            name={name}
            control={form.control}
            render={({ field }) => (
              <Field orientation="horizontal">
                <Checkbox
                  id={`host-${name}`}
                  checked={Boolean(field.value)}
                  disabled={pending}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
                <FieldLabel htmlFor={`host-${name}`}>{t(label)}</FieldLabel>
              </Field>
            )}
          />
        ))}
      </div>
    </section>
  );
}
