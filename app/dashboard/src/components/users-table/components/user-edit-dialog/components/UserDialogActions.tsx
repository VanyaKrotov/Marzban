import {
  ChartPie,
  KeyRound,
  LoaderCircle,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UseMutationResult } from "@tanstack/react-query";
import type { User } from "types/User";

import { UserActionAlertDialog } from "./UserActionAlertDialog";

type UserDialogActionsProps = {
  disabled: boolean;
  deleteMutation: UseMutationResult<void, Error, User>;
  resetUsageMutation: UseMutationResult<void, Error, User>;
  revokeSubscriptionMutation: UseMutationResult<User, Error, User>;
  usageVisible: boolean;
  user: User;
  onClose: () => void;
  onUserChange: (user: User) => void;
  onUsageToggle: () => void;
};

export function UserDialogActions({
  disabled,
  deleteMutation,
  resetUsageMutation,
  revokeSubscriptionMutation,
  usageVisible,
  user,
  onClose,
  onUserChange,
  onUsageToggle,
}: UserDialogActionsProps) {
  const { t } = useTranslation();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const confirmDelete = () => {
    deleteMutation
      .mutateAsync(user)
      .then(() => {
        toast.success(
          t("deleteUser.deleteSuccess", {
            username: user.username,
          }),
          { duration: 3000 },
        );
        setDeleteOpen(false);
        onClose();
      })
      .catch(() => {
        toast.error(t("deleteUser.title"), { duration: 3000 });
      });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) =>
          !deleteMutation.isPending && setDeleteOpen(open)
        }
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                disabled={disabled}
              >
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>{t("delete")}</TooltipContent>
        </Tooltip>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("deleteUser.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              <Trans
                i18nKey="deleteUser.prompt"
                values={{ username: user.username }}
                components={{ b: <strong /> }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
            >
              {deleteMutation.isPending && (
                <LoaderCircle className="animate-spin" />
              )}
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        type="button"
        variant={usageVisible ? "secondary" : "outline"}
        disabled={disabled}
        onClick={onUsageToggle}
      >
        <ChartPie />
        {t("userDialog.usage")}
      </Button>

      <UserActionAlertDialog
        username={user.username}
        triggerLabel={t("userDialog.resetUsage")}
        confirmLabel={t("reset")}
        titleKey="resetUserUsage.title"
        promptKey="resetUserUsage.prompt"
        successKey="resetUserUsage.success"
        errorKey="resetUserUsage.error"
        icon={<RotateCcw />}
        disabled={disabled}
        pending={resetUsageMutation.isPending}
        onConfirm={() => resetUsageMutation.mutateAsync(user)}
      />

      <UserActionAlertDialog
        username={user.username}
        triggerLabel={t("userDialog.revokeSubscription")}
        confirmLabel={t("revoke")}
        titleKey="revokeUserSub.title"
        promptKey="revokeUserSub.prompt"
        successKey="revokeUserSub.success"
        errorKey="revokeUserSub.error"
        icon={<KeyRound />}
        destructive
        disabled={disabled}
        pending={revokeSubscriptionMutation.isPending}
        onConfirm={() =>
          revokeSubscriptionMutation.mutateAsync(user).then((updatedUser) => {
            onUserChange(updatedUser);
          })
        }
      />
    </div>
  );
}
