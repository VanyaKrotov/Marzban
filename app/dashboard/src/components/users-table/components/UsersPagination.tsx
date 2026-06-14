import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UsersFilter } from "../lib/types";
import { setUsersPerPageLimitSize } from "utils/userPreferenceStorage";

export function UsersPagination({
  filters,
  total,
  onFiltersChange,
}: {
  filters: UsersFilter;
  total: number;
  onFiltersChange: (filters: Partial<UsersFilter>) => void;
}) {
  const { t } = useTranslation();
  const limit = filters.limit ?? 10;
  const page = Math.floor((filters.offset ?? 0) / limit);
  const pages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Select
          value={String(limit)}
          onValueChange={(value) => {
            setUsersPerPageLimitSize(value);
            onFiltersChange({ limit: Number(value), offset: 0 });
          }}
        >
          <SelectTrigger size="sm" className="w-16 text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {[10, 20, 30].map((value) => (
                <SelectItem value={String(value)} key={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {t("itemsPerPage")}
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">
          {pages ? page + 1 : 0} / {pages}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page <= 0}
          onClick={() => onFiltersChange({ offset: (page - 1) * limit })}
        >
          <ChevronLeft className="rtl:rotate-180" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page + 1 >= pages}
          onClick={() => onFiltersChange({ offset: (page + 1) * limit })}
        >
          <ChevronRight className="rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
}
