import { Braces, LoaderCircle, RefreshCw, RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  MonacoJsonEditor,
  type MonacoJsonMarker,
} from "@/components/MonacoJsonEditor";
import Page from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "utils/toastHandler";

import {
  useCoreConfigQuery,
  useCoreStatusQuery,
  useRestartCoreMutation,
  useUpdateCoreConfigMutation,
} from "./lib/query";
import { xrayCoreSchema } from "./lib/xray-core-schema";

const MONACO_ERROR_SEVERITY = 8;

export function ConfigPage() {
  const { t } = useTranslation();
  const configQuery = useCoreConfigQuery();
  const statusQuery = useCoreStatusQuery();
  const updateConfig = useUpdateCoreConfigMutation();
  const restartCore = useRestartCoreMutation();
  const [value, setValue] = useState("");
  const [markers, setMarkers] = useState<MonacoJsonMarker[]>([]);

  useEffect(() => {
    if (configQuery.data) {
      setValue(JSON.stringify(configQuery.data, null, 2));
    }
  }, [configQuery.data]);

  const validationErrors = useMemo(
    () => markers.filter((marker) => marker.severity === MONACO_ERROR_SEVERITY),
    [markers],
  );

  const save = () => {
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(value) as Record<string, unknown>;
    } catch {
      generateErrorMessage(new Error(t("configPage.invalidJson")));
      return;
    }

    updateConfig.mutate(config, {
      onSuccess: () => generateSuccessMessage(t("configPage.saved")),
      onError: (error) => generateErrorMessage(error),
    });
  };

  const restart = () => {
    restartCore.mutate(undefined, {
      onSuccess: () => generateSuccessMessage(t("configPage.restartSuccess")),
      onError: (error) => generateErrorMessage(error),
    });
  };

  return (
    <Page>
      <Page.Header
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={configQuery.isFetching}
            onClick={() => void configQuery.refetch()}
          >
            <RefreshCw
              className={configQuery.isFetching ? "animate-spin" : undefined}
            />
            <span className="hidden sm:inline">{t("configPage.refresh")}</span>
          </Button>
        }
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold">{t("configPage.title")}</h1>
            {statusQuery.data?.version && (
              <Badge variant="secondary">
                Xray v{statusQuery.data.version}
              </Badge>
            )}
          </div>
        </div>
      </Page.Header>

      <div className="flex flex-wrap justify-end gap-2 mb-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={restartCore.isPending}
          onClick={restart}
        >
          <RotateCcw
            className={restartCore.isPending ? "animate-spin" : undefined}
          />
          <span className="hidden sm:inline">{t("configPage.restart")}</span>
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={
            updateConfig.isPending || validationErrors.length > 0 || !value
          }
          onClick={save}
        >
          {updateConfig.isPending ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Save />
          )}
          {t("configPage.save")}
        </Button>
      </div>

      {configQuery.isLoading ? (
        <Skeleton className="h-[calc(100svh-10rem)] min-h-128 w-full rounded-xl" />
      ) : configQuery.isError ? (
        <div className="flex min-h-96 flex-col items-center justify-center gap-4 rounded-xl border text-center">
          <Braces className="size-8 text-muted-foreground" />
          <div>
            <h2 className="font-medium">{t("configPage.loadErrorTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("configPage.loadErrorDescription")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void configQuery.refetch()}
          >
            <RefreshCw />
            {t("configPage.refresh")}
          </Button>
        </div>
      ) : (
        <div className="space-y-2 flex-auto">
          <MonacoJsonEditor
            value={value}
            onChange={setValue}
            schema={xrayCoreSchema}
            schemaUri="https://marzban.local/schemas/xray-core.json"
            onValidate={setMarkers}
            disabled={updateConfig.isPending}
            invalid={validationErrors.length > 0}
            className="h-[calc(100svh-16rem)] min-h-128 "
          />
          <div className="flex min-h-5 items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{t("configPage.validationHint")}</span>
            {validationErrors.length > 0 && (
              <span className="text-destructive">
                {t("configPage.validationErrors", {
                  count: validationErrors.length,
                })}
              </span>
            )}
          </div>
        </div>
      )}
    </Page>
  );
}
