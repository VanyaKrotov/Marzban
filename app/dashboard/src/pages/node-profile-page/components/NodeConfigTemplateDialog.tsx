import { Braces, LoaderCircle, RefreshCw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  MonacoJsonEditor,
  type MonacoJsonMarker,
} from "@/components/MonacoJsonEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { xrayCoreSchema } from "@/lib/xray-schemas/core";
import {
  useNodeConfigTemplateQuery,
  useUpdateNodeConfigTemplateMutation,
} from "@/pages/nodes-page/lib/query";
import type { NodeType } from "types/Node";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "utils/toastHandler";

const MONACO_ERROR_SEVERITY = 8;

export function NodeConfigTemplateDialog({
  node,
  open,
  onOpenChange,
}: {
  node: NodeType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const nodeId = node.id ?? 0;
  const configQuery = useNodeConfigTemplateQuery(nodeId, open && Boolean(nodeId));
  const updateConfig = useUpdateNodeConfigTemplateMutation(nodeId);
  const [value, setValue] = useState("");
  const [markers, setMarkers] = useState<MonacoJsonMarker[]>([]);

  useEffect(() => {
    if (configQuery.data && open) {
      setValue(JSON.stringify(configQuery.data, null, 2));
    }
  }, [configQuery.data, open]);

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
      onSuccess: () => {
        generateSuccessMessage(t("nodeProfile.configTemplateSaved"));
        onOpenChange(false);
      },
      onError: (error) => generateErrorMessage(error),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t("nodeProfile.configTemplateTitle")}</DialogTitle>
          <DialogDescription>
            {t("nodeProfile.configTemplateDescription", { name: node.name })}
          </DialogDescription>
        </DialogHeader>

        {configQuery.isLoading ? (
          <Skeleton className="h-[60svh] min-h-96 w-full rounded-md" />
        ) : configQuery.isError ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-md border text-center">
            <Braces className="size-8 text-muted-foreground" />
            <div>
              <h2 className="font-medium">
                {t("configPage.loadErrorTitle")}
              </h2>
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
          <div className="space-y-2">
            <MonacoJsonEditor
              value={value}
              onChange={setValue}
              schema={xrayCoreSchema}
              schemaUri="https://marzban.local/schemas/xray-core.json"
              onValidate={setMarkers}
              disabled={updateConfig.isPending}
              invalid={validationErrors.length > 0}
              className="h-[60svh] min-h-96"
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

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            disabled={
              updateConfig.isPending ||
              configQuery.isLoading ||
              !nodeId ||
              validationErrors.length > 0 ||
              !value
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
