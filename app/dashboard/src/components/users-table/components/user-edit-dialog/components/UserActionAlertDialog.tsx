import type { ReactNode } from "react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UserActionAlertDialogProps = {
  username: string;
  triggerLabel: string;
  confirmLabel: string;
  titleKey: string;
  promptKey: string;
  successKey: string;
  errorKey: string;
  icon: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  pending: boolean;
  onConfirm: () => Promise<unknown>;
};

export function UserActionAlertDialog({
  username,
  triggerLabel,
  confirmLabel,
  titleKey,
  promptKey,
  successKey,
  errorKey,
  icon,
  destructive = false,
  disabled = false,
  pending,
  onConfirm,
}: UserActionAlertDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const confirm = () => {
    onConfirm()
      .then(() => {
        toast.success(t(successKey, { username }), { duration: 3000 });
        setOpen(false);
      })
      .catch(() => {
        toast.error(t(errorKey), { duration: 3000 });
      });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => !pending && setOpen(nextOpen)}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia
            className={cn(
              "bg-primary/10 text-primary",
              destructive && "bg-destructive/10 text-destructive",
            )}
          >
            {icon}
          </AlertDialogMedia>
          <AlertDialogTitle>{t(titleKey)}</AlertDialogTitle>
          <AlertDialogDescription>
            <Trans
              i18nKey={promptKey}
              values={{ username }}
              components={{ b: <strong /> }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              confirm();
            }}
          >
            {pending && <LoaderCircle className="animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
