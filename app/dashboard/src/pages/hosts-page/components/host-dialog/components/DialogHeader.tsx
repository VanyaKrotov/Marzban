import { useTranslation } from "react-i18next";

import {
  DialogDescription,
  DialogHeader as ShadcnDialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function HostDialogHeader({ isEditing }: { isEditing: boolean }) {
  const { t } = useTranslation();

  return (
    <ShadcnDialogHeader>
      <DialogTitle>
        {isEditing ? t("hostsPage.editTitle") : t("hostsPage.createTitle")}
      </DialogTitle>
      <DialogDescription>{t("hostsPage.dialogDescription")}</DialogDescription>
    </ShadcnDialogHeader>
  );
}
