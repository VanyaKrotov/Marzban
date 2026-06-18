import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch, type Path } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "@/utils/toastHandler";

import {
  notificationSettingsFormSchema,
  toNotificationFormValues,
  toNotificationPayload,
  type NotificationSettingsForm,
} from "../lib/form";
import type { RuntimeSettings } from "../lib/query";
import { useUpdateRuntimeSettingsMutation } from "../lib/query";
import {
  CheckboxDropdownInput,
  Section,
  SettingsSaveButton,
  TextInput,
} from "./form-controls";

export function NotificationSettingsSection({
  settings,
}: {
  settings: RuntimeSettings;
}) {
  const { t } = useTranslation();
  const updateSettings = useUpdateRuntimeSettingsMutation();
  const form = useForm<NotificationSettingsForm>({
    resolver: zodResolver(notificationSettingsFormSchema),
    mode: "onChange",
    defaultValues: toNotificationFormValues(settings),
  });
  const notificationOptions: Array<{
    name: Path<NotificationSettingsForm>;
    label: string;
    summary: string;
  }> = [
    {
      name: "notify_status_change",
      label: t("settingsPage.fields.notifyStatusChange"),
      summary: t("settingsPage.notifications.statusChange"),
    },
    {
      name: "notify_user_created",
      label: t("settingsPage.fields.notifyUserCreated"),
      summary: t("settingsPage.notifications.userCreated"),
    },
    {
      name: "notify_user_updated",
      label: t("settingsPage.fields.notifyUserUpdated"),
      summary: t("settingsPage.notifications.userUpdated"),
    },
    {
      name: "notify_user_deleted",
      label: t("settingsPage.fields.notifyUserDeleted"),
      summary: t("settingsPage.notifications.userDeleted"),
    },
    {
      name: "notify_user_data_used_reset",
      label: t("settingsPage.fields.notifyUserDataUsedReset"),
      summary: t("settingsPage.notifications.dataReset"),
    },
    {
      name: "notify_user_sub_revoked",
      label: t("settingsPage.fields.notifyUserSubRevoked"),
      summary: t("settingsPage.notifications.subRevoked"),
    },
    {
      name: "notify_if_data_usage_percent_reached",
      label: t("settingsPage.fields.notifyIfDataUsagePercentReached"),
      summary: t("settingsPage.notifications.usagePercent"),
    },
    {
      name: "notify_if_days_left_reached",
      label: t("settingsPage.fields.notifyIfDaysLeftReached"),
      summary: t("settingsPage.notifications.daysLeft"),
    },
    {
      name: "notify_login",
      label: t("settingsPage.fields.notifyLogin"),
      summary: t("settingsPage.notifications.login"),
    },
  ];
  const notificationValues = useWatch({
    control: form.control,
    name: notificationOptions.map((option) => option.name),
  });
  const enabledNotificationOptions = notificationOptions
    .filter((_, index) => Boolean(notificationValues[index]))
    .map((option) => option.summary);
  const notificationsSummary = enabledNotificationOptions.length
    ? enabledNotificationOptions.join(", ")
    : t("settingsPage.notifications.none");

  useEffect(() => {
    form.reset(toNotificationFormValues(settings));
  }, [form, settings]);

  const saveSettings = form.handleSubmit((values) => {
    updateSettings.mutate(toNotificationPayload(values), {
      onSuccess: (nextSettings) => {
        form.reset(toNotificationFormValues(nextSettings));
        generateSuccessMessage(t("settingsPage.saved"));
      },
      onError: (error) => generateErrorMessage(error),
    });
  });

  return (
    <form onSubmit={saveSettings}>
      <Card>
        <CardHeader>
          <CardTitle>{t("settingsPage.tabs.notifications")}</CardTitle>
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
              name="notify_days_left"
              label={t("settingsPage.fields.notifyDaysLeft")}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
            />
            <TextInput
              form={form}
              name="notify_reached_usage_percent"
              label={t("settingsPage.fields.notifyReachedUsagePercent")}
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              step={1}
            />
            <TextInput
              form={form}
              name="login_notify_white_list"
              label={t("settingsPage.fields.loginNotifyWhiteList")}
            />
            <CheckboxDropdownInput
              form={form}
              title={t("settingsPage.notifications.title")}
              summary={notificationsSummary}
              actionLabel={t("settingsPage.change")}
              items={notificationOptions}
            />
          </Section>
        </CardContent>
      </Card>
    </form>
  );
}
