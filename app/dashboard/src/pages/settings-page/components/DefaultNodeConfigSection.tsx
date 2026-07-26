import { LoaderCircle, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  MonacoJsonEditor,
  type MonacoJsonMarker,
} from "@/components/MonacoJsonEditor";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { xrayCoreSchema } from "@/lib/xray-schemas/core";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "@/utils/toastHandler";

import type { RuntimeSettings } from "../lib/query";
import { useUpdateRuntimeSettingsMutation } from "../lib/query";

const MONACO_ERROR_SEVERITY = 8;

export function DefaultNodeConfigSection({
  settings,
}: {
  settings: RuntimeSettings;
}) {
  const { t } = useTranslation();
  const updateSettings = useUpdateRuntimeSettingsMutation();
  const [value, setValue] = useState("");
  const [markers, setMarkers] = useState<MonacoJsonMarker[]>([]);

  useEffect(() => {
    setValue(JSON.stringify(settings.default_node_config, null, 2));
  }, [settings.default_node_config]);

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

    updateSettings.mutate(
      { default_node_config: config },
      {
        onSuccess: () => generateSuccessMessage(t("settingsPage.saved")),
        onError: (error) => generateErrorMessage(error),
      },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{t("settingsPage.defaultNodeConfig")}</CardTitle>
        <Button
          type="button"
          size="sm"
          disabled={
            updateSettings.isPending || validationErrors.length > 0 || !value
          }
          onClick={save}
        >
          {updateSettings.isPending ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Save />
          )}
          {t("settingsPage.save")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <MonacoJsonEditor
          value={value}
          onChange={setValue}
          schema={xrayCoreSchema}
          schemaUri="https://marzban.local/schemas/xray-core.json"
          onValidate={setMarkers}
          disabled={updateSettings.isPending}
          invalid={validationErrors.length > 0}
          className="h-96"
        />
        <div className="flex min-h-5 items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{t("settingsPage.defaultNodeConfigDescription")}</span>
          {validationErrors.length > 0 && (
            <span className="text-destructive">
              {t("configPage.validationErrors", {
                count: validationErrors.length,
              })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
