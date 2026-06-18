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
import { Field, FieldLabel, FieldSet } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "@/utils/toastHandler";

import {
  notificationEventsFormSchema,
  notificationSettingsFormSchema,
  toNotificationEventsFormValues,
  toNotificationEventsPayload,
  toNotificationFormValues,
  toNotificationPayload,
  type NotificationEventsForm,
  type NotificationSettingsForm,
} from "../lib/form";
import type { RuntimeSettings } from "../lib/query";
import { useUpdateRuntimeSettingsMutation } from "../lib/query";
import {
  Section,
  SettingsActionItem,
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
  const [eventsDialogOpen, setEventsDialogOpen] = useState(false);
  const form = useForm<NotificationSettingsForm>({
    resolver: zodResolver(notificationSettingsFormSchema),
    mode: "onChange",
    defaultValues: toNotificationFormValues(settings),
  });
  const notificationOptions = useNotificationOptions();
  const notificationsSummary = summarizeEnabledOptions(
    notificationOptions.filter((option) => settings[option.name]),
    t("settingsPage.notifications.none"),
  );

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
    <>
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
                placeholder="3, 7, 14"
              />
              <TextInput
                form={form}
                name="notify_reached_usage_percent"
                label={t("settingsPage.fields.notifyReachedUsagePercent")}
                placeholder="80, 90, 95"
              />
              <TextInput
                form={form}
                name="login_notify_white_list"
                label={t("settingsPage.fields.loginNotifyWhiteList")}
              />
              <SettingsActionItem
                title={t("settingsPage.notifications.title")}
                description={notificationsSummary}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEventsDialogOpen(true)}
                >
                  {t("settingsPage.change")}
                </Button>
              </SettingsActionItem>
            </Section>
          </CardContent>
        </Card>
      </form>

      <NotificationEventsDialog
        open={eventsDialogOpen}
        onOpenChange={setEventsDialogOpen}
        settings={settings}
      />
    </>
  );
}

function NotificationEventsDialog({
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
  const form = useForm<NotificationEventsForm>({
    resolver: zodResolver(notificationEventsFormSchema),
    mode: "onChange",
    defaultValues: toNotificationEventsFormValues(settings),
  });
  const notificationOptions = useNotificationOptions();

  useEffect(() => {
    if (open) {
      form.reset(toNotificationEventsFormValues(settings));
    }
  }, [form, open, settings]);

  const saveSettings = form.handleSubmit((values) => {
    updateSettings.mutate(toNotificationEventsPayload(values), {
      onSuccess: (nextSettings) => {
        form.reset(toNotificationEventsFormValues(nextSettings));
        generateSuccessMessage(t("settingsPage.saved"));
        onOpenChange(false);
      },
      onError: (error) => generateErrorMessage(error),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={saveSettings} className="grid gap-6">
          <DialogHeader>
            <DialogTitle>{t("settingsPage.notifications.title")}</DialogTitle>
          </DialogHeader>
          <FieldSet className="gap-3">
            {notificationOptions.map((option) => (
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

function useNotificationOptions(): Array<{
  name: Path<NotificationEventsForm>;
  label: string;
  summary: string;
}> {
  const { t } = useTranslation();

  return [
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
}

function summarizeEnabledOptions(
  options: Array<{ summary: string }>,
  emptyValue: string,
) {
  return options.length
    ? options.map((option) => option.summary).join(", ")
    : emptyValue;
}
