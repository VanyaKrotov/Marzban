import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ellipsis, RefreshCcw, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouteLoaderData } from "react-router-dom";

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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Admin } from "@/types/admin";
import { USERS_QUERY_KEY } from "@/components/users-table/lib/hooks";
import { api } from "service/http";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "utils/toastHandler";

const SYSTEM_STATS_QUERY_KEY = ["statistics-query-key"] as const;

export function UsersPageActions() {
  const { t } = useTranslation();
  const admin = useRouteLoaderData("layout") as Admin | undefined;
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const resetMutation = useMutation({
    mutationFn: () => api.post<void>("/users/reset"),
    onSuccess: async () => {
      generateSuccessMessage(t("resetAllUsage.success"));
      setConfirmOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY }),
      ]);
    },
    onError: (error) => generateErrorMessage(error),
  });

  if (!admin?.is_sudo) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t("usersPage.actions").toString()}
          >
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirmOpen(true)}
          >
            <RefreshCcw />
            {t("resetAllUsage")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <RotateCcw />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("resetAllUsage.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("resetAllUsage.prompt")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMutation.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={resetMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                resetMutation.mutate();
              }}
            >
              {resetMutation.isPending ? (
                <RefreshCcw className="animate-spin" />
              ) : (
                <RotateCcw />
              )}
              {t("reset")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
