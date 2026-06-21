import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import Page from "@/components/page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "@/utils/toastHandler";

import { BackupSettingsSection } from "./components/BackupSettingsSection";
import { LoadError } from "./components/LoadError";
import { NotificationSettingsSection } from "./components/NotificationSettingsSection";
import { SubscriptionSettingsSection } from "./components/SubscriptionSettingsSection";
import { TemplateEditors } from "./components/TemplateEditors";
import { WebhookSettingsSection } from "./components/WebhookSettingsSection";
import {
  useRuntimeSettingsQuery,
  useSubscriptionTemplatesQuery,
  useUpdateSubscriptionTemplateMutation,
} from "./lib/query";

export function SettingsPage() {
  const { t } = useTranslation();
  const settingsQuery = useRuntimeSettingsQuery();
  const templatesQuery = useSubscriptionTemplatesQuery();
  const updateTemplate = useUpdateSubscriptionTemplateMutation();

  const saveTemplate = (key: string, content: string) => {
    updateTemplate.mutate(
      { key, content },
      {
        onSuccess: () => generateSuccessMessage(t("settingsPage.saved")),
        onError: (error) => generateErrorMessage(error),
      },
    );
  };

  return (
    <Page>
      <Page.Header
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={settingsQuery.isFetching || templatesQuery.isFetching}
            onClick={() => {
              void settingsQuery.refetch();
              void templatesQuery.refetch();
            }}
          >
            <RefreshCw
              className={
                settingsQuery.isFetching || templatesQuery.isFetching
                  ? "animate-spin"
                  : undefined
              }
            />
            <span className="hidden sm:inline">
              {t("settingsPage.refresh")}
            </span>
          </Button>
        }
      >
        <h1 className="font-semibold">{t("settingsPage.title")}</h1>
      </Page.Header>

      {settingsQuery.isLoading || !settingsQuery.data ? (
        <Skeleton className="h-[calc(100svh-10rem)] min-h-128 w-full rounded-xl" />
      ) : settingsQuery.isError ? (
        <LoadError onRefresh={() => void settingsQuery.refetch()} />
      ) : (
        <div className="space-y-5">
          <SubscriptionSettingsSection settings={settingsQuery.data} />
          {templatesQuery.isLoading ? (
            <Skeleton className="h-96 w-full rounded-md" />
          ) : templatesQuery.isError ? (
            <LoadError onRefresh={() => void templatesQuery.refetch()} />
          ) : (
            <TemplateEditors
              templates={templatesQuery.data ?? []}
              onSave={saveTemplate}
              pending={updateTemplate.isPending}
            />
          )}
          <NotificationSettingsSection settings={settingsQuery.data} />
          <WebhookSettingsSection settings={settingsQuery.data} />
          <BackupSettingsSection />
        </div>
      )}
    </Page>
  );
}
