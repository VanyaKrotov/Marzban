import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-xs">
          <Info />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">{content}</TooltipContent>
    </Tooltip>
  );
}
