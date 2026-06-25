import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";

import type { HostGroupRef } from "../types";

type HostGroupBadgesProps = {
  groups: HostGroupRef[];
};

export function HostGroupBadges({ groups }: HostGroupBadgesProps) {
  const { t } = useTranslation();

  if (!groups.length) {
    return (
      <span className="text-sm text-muted-foreground">
        {t("hostsPage.noGroupsShort")}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {groups.map((group) => (
        <Badge key={group.id} variant="secondary">
          {group.name}
        </Badge>
      ))}
    </div>
  );
}
