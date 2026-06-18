import { z } from "zod";

import type { RuntimeSettings, RuntimeSettingsUpdate } from "./query";

export const listStringToNumbers = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(Number);

export const listStringToStrings = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const urlStringSchema = z.string().refine((value) => {
  if (!value.trim()) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
});

export const runtimeSettingsFormSchema = z.object({
  sub_profile_title: z.string().min(1),
  sub_support_url: z.string().url().or(z.literal("")),
  sub_update_interval: z.string().regex(/^[1-9]\d*$/),
  external_config: z.string(),
  use_custom_json_default: z.boolean(),
  use_custom_json_for_v2rayn: z.boolean(),
  use_custom_json_for_v2rayng: z.boolean(),
  use_custom_json_for_streisand: z.boolean(),
  use_custom_json_for_happ: z.boolean(),
  active_status_text: z.string().min(1),
  expired_status_text: z.string().min(1),
  limited_status_text: z.string().min(1),
  disabled_status_text: z.string().min(1),
  onhold_status_text: z.string().min(1),
  notify_status_change: z.boolean(),
  notify_user_created: z.boolean(),
  notify_user_updated: z.boolean(),
  notify_user_deleted: z.boolean(),
  notify_user_data_used_reset: z.boolean(),
  notify_user_sub_revoked: z.boolean(),
  notify_if_data_usage_percent_reached: z.boolean(),
  notify_if_days_left_reached: z.boolean(),
  notify_login: z.boolean(),
  notify_days_left: z.string().refine((value) =>
    listStringToNumbers(value).every(
      (item) => Number.isInteger(item) && item > 0,
    ),
  ),
  notify_reached_usage_percent: z.string().refine((value) =>
    listStringToNumbers(value).every(
      (item) => Number.isInteger(item) && item >= 1 && item <= 100,
    ),
  ),
  login_notify_white_list: z.string(),
  webhook_addresses: z.array(z.object({ value: urlStringSchema })),
  webhook_secret: z.string(),
  clear_webhook_secret: z.boolean(),
  recurrent_notifications_timeout: z.coerce.number().int().min(1),
  number_of_recurrent_notifications: z.coerce.number().int().min(0),
});

export type RuntimeSettingsForm = z.infer<typeof runtimeSettingsFormSchema>;

export const subscriptionSettingsFormSchema = runtimeSettingsFormSchema.pick({
  sub_profile_title: true,
  sub_support_url: true,
  sub_update_interval: true,
  external_config: true,
  use_custom_json_default: true,
  use_custom_json_for_v2rayn: true,
  use_custom_json_for_v2rayng: true,
  use_custom_json_for_streisand: true,
  use_custom_json_for_happ: true,
  active_status_text: true,
  expired_status_text: true,
  limited_status_text: true,
  disabled_status_text: true,
  onhold_status_text: true,
});

export const notificationSettingsFormSchema = runtimeSettingsFormSchema.pick({
  notify_status_change: true,
  notify_user_created: true,
  notify_user_updated: true,
  notify_user_deleted: true,
  notify_user_data_used_reset: true,
  notify_user_sub_revoked: true,
  notify_if_data_usage_percent_reached: true,
  notify_if_days_left_reached: true,
  notify_login: true,
  notify_days_left: true,
  notify_reached_usage_percent: true,
  login_notify_white_list: true,
});

export const webhookSettingsFormSchema = runtimeSettingsFormSchema.pick({
  webhook_addresses: true,
  webhook_secret: true,
  clear_webhook_secret: true,
  recurrent_notifications_timeout: true,
  number_of_recurrent_notifications: true,
});

export type SubscriptionSettingsForm = z.infer<
  typeof subscriptionSettingsFormSchema
>;
export type NotificationSettingsForm = z.infer<
  typeof notificationSettingsFormSchema
>;
export type WebhookSettingsForm = z.infer<typeof webhookSettingsFormSchema>;

export function toFormValues(settings: RuntimeSettings): RuntimeSettingsForm {
  return {
    ...settings,
    notify_days_left: settings.notify_days_left.join(", "),
    notify_reached_usage_percent:
      settings.notify_reached_usage_percent.join(", "),
    login_notify_white_list: settings.login_notify_white_list.join(", "),
    webhook_addresses: settings.webhook_addresses.length
      ? settings.webhook_addresses.map((value) => ({ value }))
      : [{ value: "" }],
    webhook_secret: "",
    clear_webhook_secret: false,
  };
}

export function toSubscriptionFormValues(
  settings: RuntimeSettings,
): SubscriptionSettingsForm {
  return subscriptionSettingsFormSchema.parse(toFormValues(settings));
}

export function toSubscriptionPayload(
  values: SubscriptionSettingsForm,
): RuntimeSettingsUpdate {
  return values;
}

export function toNotificationFormValues(
  settings: RuntimeSettings,
): NotificationSettingsForm {
  return notificationSettingsFormSchema.parse(toFormValues(settings));
}

export function toNotificationPayload(
  values: NotificationSettingsForm,
): RuntimeSettingsUpdate {
  return {
    ...values,
    notify_days_left: listStringToNumbers(values.notify_days_left),
    notify_reached_usage_percent: listStringToNumbers(
      values.notify_reached_usage_percent,
    ),
    login_notify_white_list: listStringToStrings(
      values.login_notify_white_list,
    ),
  };
}

export function toWebhookFormValues(
  settings: RuntimeSettings,
): WebhookSettingsForm {
  return webhookSettingsFormSchema.parse(toFormValues(settings));
}

export function toWebhookPayload(
  values: WebhookSettingsForm,
): RuntimeSettingsUpdate {
  const payload: RuntimeSettingsUpdate = {
    ...values,
    webhook_addresses: values.webhook_addresses
      .map((item) => item.value.trim())
      .filter(Boolean),
  };

  if (!values.webhook_secret) {
    delete payload.webhook_secret;
  }

  return payload;
}
