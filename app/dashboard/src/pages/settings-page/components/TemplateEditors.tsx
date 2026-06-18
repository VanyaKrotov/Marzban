import { LoaderCircle, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  MonacoJsonEditor,
  type MonacoJsonMarker,
} from "@/components/MonacoJsonEditor";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { SubscriptionTemplate } from "../lib/query";

const MONACO_ERROR_SEVERITY = 8;

export function TemplateEditors({
  templates,
  pending,
  onSave,
}: {
  templates: SubscriptionTemplate[];
  pending: boolean;
  onSave: (key: string, content: string) => void;
}) {
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, string>>({});
  const [markers, setMarkers] = useState<Record<string, MonacoJsonMarker[]>>(
    {},
  );

  useEffect(() => {
    setValues(
      Object.fromEntries(
        templates.map((template) => [template.key, template.content]),
      ),
    );
  }, [templates]);

  const jsonErrors = useMemo(
    () =>
      Object.values(markers)
        .flat()
        .filter((marker) => marker.severity === MONACO_ERROR_SEVERITY),
    [markers],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settingsPage.tabs.templates")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="rounded-md border">
          {templates.map((template) => (
            <AccordionItem
              key={template.key}
              value={template.key}
              className="px-3"
            >
              <AccordionTrigger>{template.key}</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <MonacoJsonEditor
                  value={values[template.key] ?? ""}
                  language={
                    template.format === "text" ? "text" : template.format
                  }
                  onChange={(value) =>
                    setValues((current) => ({
                      ...current,
                      [template.key]: value,
                    }))
                  }
                  onValidate={(nextMarkers) =>
                    setMarkers((current) => ({
                      ...current,
                      [template.key]: nextMarkers,
                    }))
                  }
                  disabled={pending}
                  invalid={
                    template.format === "json" &&
                    (markers[template.key] ?? []).some(
                      (marker) => marker.severity === MONACO_ERROR_SEVERITY,
                    )
                  }
                  className="h-96"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending || jsonErrors.length > 0}
                    onClick={() =>
                      onSave(template.key, values[template.key] ?? "")
                    }
                  >
                    {pending ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Save />
                    )}
                    {t("settingsPage.save")}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
