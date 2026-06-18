import { Braces, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

export function LoadError({ onRefresh }: { onRefresh: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-96 flex-col items-center justify-center gap-4 rounded-xl border text-center">
      <Braces className="size-8 text-muted-foreground" />
      <div>
        <h2 className="font-medium">{t("settingsPage.loadErrorTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("settingsPage.loadErrorDescription")}
        </p>
      </div>
      <Button type="button" variant="outline" onClick={onRefresh}>
        <RefreshCw />
        {t("settingsPage.refresh")}
      </Button>
    </div>
  );
}

