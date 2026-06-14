import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { HOST_VARIABLES } from "../lib/constants";

export function VariablesPopover() {
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t("hostsPage.variablesHint")}
        >
          <Info />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <p className="text-xs text-muted-foreground">
          {t("hostsPage.variablesHint")}
        </p>
        <div className="flex flex-wrap gap-1">
          {HOST_VARIABLES.map((variable) => (
            <Badge key={variable} variant="outline" className="font-mono">
              {"{"}
              {variable}
              {"}"}
            </Badge>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
