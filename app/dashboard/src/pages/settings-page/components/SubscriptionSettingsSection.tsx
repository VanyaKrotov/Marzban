import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useWatch, type Path } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "@/utils/toastHandler";

import {
  subscriptionSettingsFormSchema,
  toSubscriptionFormValues,
  toSubscriptionPayload,
  type SubscriptionSettingsForm,
} from "../lib/form";
import type { RuntimeSettings } from "../lib/query";
import { useUpdateRuntimeSettingsMutation } from "../lib/query";
import {
  CheckboxDropdownInput,
  Section,
  SettingsActionItem,
  SettingsSaveButton,
  TextareaInput,
  TextInput,
} from "./form-controls";

export function SubscriptionSettingsSection({
  settings,
}: {
  settings: RuntimeSettings;
}) {
  const { t } = useTranslation();
  const updateSettings = useUpdateRuntimeSettingsMutation();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const form = useForm<SubscriptionSettingsForm>({
    resolver: zodResolver(subscriptionSettingsFormSchema),
    mode: "onChange",
    defaultValues: toSubscriptionFormValues(settings),
  });
  const customJsonOptions: Array<{
    name: Path<SubscriptionSettingsForm>;
    label: string;
    summary: string;
  }> = [
    {
      name: "use_custom_json_default",
      label: t("settingsPage.fields.useCustomJsonDefault"),
      summary: t("settingsPage.customJson.default"),
    },
    {
      name: "use_custom_json_for_v2rayn",
      label: t("settingsPage.fields.useCustomJsonForV2rayn"),
      summary: t("settingsPage.customJson.v2rayn"),
    },
    {
      name: "use_custom_json_for_v2rayng",
      label: t("settingsPage.fields.useCustomJsonForV2rayng"),
      summary: t("settingsPage.customJson.v2rayng"),
    },
    {
      name: "use_custom_json_for_streisand",
      label: t("settingsPage.fields.useCustomJsonForStreisand"),
      summary: t("settingsPage.customJson.streisand"),
    },
    {
      name: "use_custom_json_for_happ",
      label: t("settingsPage.fields.useCustomJsonForHapp"),
      summary: t("settingsPage.customJson.happ"),
    },
  ];
  const customJsonValues = useWatch({
    control: form.control,
    name: customJsonOptions.map((option) => option.name),
  });
  const enabledCustomJsonOptions = customJsonOptions
    .filter((_, index) => Boolean(customJsonValues[index]))
    .map((option) => option.summary);
  const customJsonSummary = enabledCustomJsonOptions.length
    ? enabledCustomJsonOptions.join(", ")
    : t("settingsPage.customJson.none");
  const statusTextOptions: Array<{
    name: Path<SubscriptionSettingsForm>;
    label: string;
  }> = [
    {
      name: "active_status_text",
      label: t("settingsPage.fields.activeStatusText"),
    },
    {
      name: "expired_status_text",
      label: t("settingsPage.fields.expiredStatusText"),
    },
    {
      name: "limited_status_text",
      label: t("settingsPage.fields.limitedStatusText"),
    },
    {
      name: "disabled_status_text",
      label: t("settingsPage.fields.disabledStatusText"),
    },
    {
      name: "onhold_status_text",
      label: t("settingsPage.fields.onholdStatusText"),
    },
  ];
  const statusTextValues = useWatch({
    control: form.control,
    name: statusTextOptions.map((option) => option.name),
  });
  const statusTextSummary = statusTextValues
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");

  useEffect(() => {
    form.reset(toSubscriptionFormValues(settings));
  }, [form, settings]);

  const saveSettings = form.handleSubmit((values) => {
    updateSettings.mutate(toSubscriptionPayload(values), {
      onSuccess: (nextSettings) => {
        form.reset(toSubscriptionFormValues(nextSettings));
        generateSuccessMessage(t("settingsPage.saved"));
      },
      onError: (error) => generateErrorMessage(error),
    });
  });

  return (
    <>
      <form onSubmit={saveSettings}>
        <Card>
          <CardHeader>
            <CardTitle>{t("settingsPage.tabs.subscription")}</CardTitle>
            <CardAction>
              <SettingsSaveButton
                isPending={updateSettings.isPending}
                isValid={form.formState.isValid}
                label={t("settingsPage.save")}
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            <Section>
              <TextInput
                form={form}
                name="sub_profile_title"
                label={t("settingsPage.fields.subProfileTitle")}
              />
              <TextInput
                form={form}
                name="sub_support_url"
                label={t("settingsPage.fields.subSupportUrl")}
              />
              <TextInput
                form={form}
                name="sub_update_interval"
                label={t("settingsPage.fields.subUpdateInterval")}
                type="number"
                inputMode="numeric"
              />
              <TextareaInput
                form={form}
                name="external_config"
                label={t("settingsPage.fields.externalConfig")}
              />
              <div className="col-span-full flex flex-col gap-3">
                <CheckboxDropdownInput
                  form={form}
                  title={t("settingsPage.customJson.title")}
                  summary={customJsonSummary}
                  actionLabel={t("settingsPage.change")}
                  items={customJsonOptions}
                />
                <SettingsActionItem
                  title={t("settingsPage.statusTexts.title")}
                  description={statusTextSummary}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusDialogOpen(true)}
                  >
                    {t("settingsPage.change")}
                  </Button>
                </SettingsActionItem>
              </div>
            </Section>
          </CardContent>
        </Card>
      </form>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("settingsPage.statusTexts.dialogTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {statusTextOptions.map((option) => {
              const error = form.getFieldState(
                option.name,
                form.formState,
              ).error;

              return (
                <Field key={option.name}>
                  <FieldLabel htmlFor={option.name}>{option.label}</FieldLabel>
                  <Input id={option.name} {...form.register(option.name)} />
                  {error && (
                    <p className="text-sm text-destructive">{error.message}</p>
                  )}
                </Field>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              disabled={!form.formState.isValid}
              onClick={() => setStatusDialogOpen(false)}
            >
              {t("settingsPage.statusTexts.apply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
