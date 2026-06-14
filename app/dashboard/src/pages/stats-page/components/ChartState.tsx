import { BarChart3, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  onRetry?: () => void;
};

export function ChartState({ loading, error, empty, onRetry }: Props) {
  const { t } = useTranslation();

  if (loading) {
    return <Skeleton className="h-80 w-full rounded-xl" />;
  }

  if (!error && !empty) return null;

  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BarChart3 />
        </EmptyMedia>
        <EmptyTitle>
          {error ? t("statsPage.loadErrorTitle") : t("statsPage.emptyTitle")}
        </EmptyTitle>
        <EmptyDescription>
          {error
            ? t("statsPage.loadErrorDescription")
            : t("statsPage.emptyDescription")}
        </EmptyDescription>
      </EmptyHeader>
      {error && onRetry && (
        <EmptyContent>
          <Button type="button" variant="outline" onClick={onRetry}>
            <RefreshCw />
            {t("statsPage.refresh")}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
