import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm, type Path } from "react-hook-form";
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
import { Field, FieldError, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "@/utils/toastHandler";

import {
  subscriptionCustomJsonFormSchema,
  subscriptionSettingsFormSchema,
  subscriptionStatusTextsFormSchema,
  toSubscriptionCustomJsonFormValues,
  toSubscriptionCustomJsonPayload,
  toSubscriptionFormValues,
  toSubscriptionPayload,
  toSubscriptionStatusTextsFormValues,
  toSubscriptionStatusTextsPayload,
  type SubscriptionCustomJsonForm,
  type SubscriptionSettingsForm,
  type SubscriptionStatusTextsForm,
} from "../lib/form";
import type { RuntimeSettings } from "../lib/query";
import { useUpdateRuntimeSettingsMutation } from "../lib/query";
import {
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
  const [customJsonDialogOpen, setCustomJsonDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const form = useForm<SubscriptionSettingsForm>({
    resolver: zodResolver(subscriptionSettingsFormSchema),
    mode: "onChange",
    defaultValues: toSubscriptionFormValues(settings),
  });

  useEffect(() => {
    form.reset(toSubscriptionFormValues(settings));
  }, [form, settings]);

  const customJsonOptions = useCustomJsonOptions();
  const statusTextOptions = useStatusTextOptions();
  const customJsonSummary = summarizeEnabledOptions(
    customJsonOptions.filter((option) => settings[option.name]),
    t("settingsPage.customJson.none"),
  );
  const statusTextSummary = statusTextOptions
    .map((option) => settings[option.name].trim())
    .filter(Boolean)
    .join(", ");

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
                <SettingsActionItem
                  title={t("settingsPage.customJson.title")}
                  description={customJsonSummary}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomJsonDialogOpen(true)}
                  >
                    {t("settingsPage.change")}
                  </Button>
                </SettingsActionItem>
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

      <CustomJsonSettingsDialog
        open={customJsonDialogOpen}
        onOpenChange={setCustomJsonDialogOpen}
        settings={settings}
      />
      <StatusTextsSettingsDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        settings={settings}
      />
    </>
  );
}

function CustomJsonSettingsDialog({
  open,
  onOpenChange,
  settings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: RuntimeSettings;
}) {
  const { t } = useTranslation();
  const updateSettings = useUpdateRuntimeSettingsMutation();
  const form = useForm<SubscriptionCustomJsonForm>({
    resolver: zodResolver(subscriptionCustomJsonFormSchema),
    mode: "onChange",
    defaultValues: toSubscriptionCustomJsonFormValues(settings),
  });
  const customJsonOptions = useCustomJsonOptions();

  useEffect(() => {
    if (open) {
      form.reset(toSubscriptionCustomJsonFormValues(settings));
    }
  }, [form, open, settings]);

  const saveSettings = form.handleSubmit((values) => {
    updateSettings.mutate(toSubscriptionCustomJsonPayload(values), {
      onSuccess: (nextSettings) => {
        form.reset(toSubscriptionCustomJsonFormValues(nextSettings));
        generateSuccessMessage(t("settingsPage.saved"));
        onOpenChange(false);
      },
      onError: (error) => generateErrorMessage(error),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={saveSettings} className="grid gap-6">
          <DialogHeader>
            <DialogTitle>{t("settingsPage.customJson.title")}</DialogTitle>
          </DialogHeader>
          <FieldSet className="gap-3">
            {customJsonOptions.map((option) => (
              <Controller
                key={option.name}
                control={form.control}
                name={option.name}
                render={({ field }) => (
                  <Field
                    orientation="horizontal"
                    className="justify-between rounded-md border p-3"
                  >
                    <FieldLabel htmlFor={option.name}>
                      {option.label}
                    </FieldLabel>
                    <Switch
                      id={option.name}
                      checked={Boolean(field.value)}
                      onCheckedChange={field.onChange}
                    />
                  </Field>
                )}
              />
            ))}
          </FieldSet>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <SettingsSaveButton
              isPending={updateSettings.isPending}
              isValid={form.formState.isValid}
              label={t("settingsPage.save")}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatusTextsSettingsDialog({
  open,
  onOpenChange,
  settings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: RuntimeSettings;
}) {
  const { t } = useTranslation();
  const updateSettings = useUpdateRuntimeSettingsMutation();
  const form = useForm<SubscriptionStatusTextsForm>({
    resolver: zodResolver(subscriptionStatusTextsFormSchema),
    mode: "onChange",
    defaultValues: toSubscriptionStatusTextsFormValues(settings),
  });
  const statusTextOptions = useStatusTextOptions();

  useEffect(() => {
    if (open) {
      form.reset(toSubscriptionStatusTextsFormValues(settings));
    }
  }, [form, open, settings]);

  const saveSettings = form.handleSubmit((values) => {
    updateSettings.mutate(toSubscriptionStatusTextsPayload(values), {
      onSuccess: (nextSettings) => {
        form.reset(toSubscriptionStatusTextsFormValues(nextSettings));
        generateSuccessMessage(t("settingsPage.saved"));
        onOpenChange(false);
      },
      onError: (error) => generateErrorMessage(error),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={saveSettings} className="grid gap-6">
          <DialogHeader>
            <DialogTitle>
              {t("settingsPage.statusTexts.dialogTitle")}
            </DialogTitle>
          </DialogHeader>
          <FieldSet className="gap-4">
            {statusTextOptions.map((option) => {
              const error = form.getFieldState(
                option.name,
                form.formState,
              ).error;

              return (
                <Field key={option.name}>
                  <FieldLabel htmlFor={option.name}>{option.label}</FieldLabel>
                  <Input id={option.name} {...form.register(option.name)} />
                  <FieldError errors={[error]} />
                </Field>
              );
            })}
          </FieldSet>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <SettingsSaveButton
              isPending={updateSettings.isPending}
              isValid={form.formState.isValid}
              label={t("settingsPage.save")}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function useCustomJsonOptions(): Array<{
  name: Path<SubscriptionCustomJsonForm>;
  label: string;
  summary: string;
}> {
  const { t } = useTranslation();

  return [
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
}

function useStatusTextOptions(): Array<{
  name: Path<SubscriptionStatusTextsForm>;
  label: string;
}> {
  const { t } = useTranslation();

  return [
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
}

function summarizeEnabledOptions(
  options: Array<{ summary: string }>,
  emptyValue: string,
) {
  return options.length
    ? options.map((option) => option.summary).join(", ")
    : emptyValue;
}
