import { RefreshCw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type NodeCertificate,
  useIssueCertificateMutation,
} from "@/pages/nodes-page/lib/query";
import { generateErrorMessage } from "utils/toastHandler";

export function CertificateRow({
  certificate,
  deleting,
  onDelete,
}: {
  certificate: NodeCertificate;
  deleting: boolean;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const issue = useIssueCertificateMutation(certificate.node_id);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{certificate.domain}</span>
            {certificate.active && (
              <Badge variant="secondary">{t("active")}</Badge>
            )}
          </div>
          {certificate.expires_at && (
            <p className="text-xs text-muted-foreground">
              {t("nodes.certificates.expires", {
                date: new Date(certificate.expires_at).toLocaleDateString(),
              })}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                disabled={issue.isPending}
                aria-label={t("nodes.certificates.renew")}
                onClick={() =>
                  issue.mutate(
                    { domain: certificate.domain, force: true },
                    { onError: (error) => generateErrorMessage(error) },
                  )
                }
              >
                <RefreshCw
                  className={issue.isPending ? "animate-spin" : undefined}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("nodes.certificates.renew")}</TooltipContent>
          </Tooltip>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="icon-sm"
                variant="destructive"
                disabled={deleting}
              >
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-destructive/10 text-destructive">
                  <Trash2 />
                </AlertDialogMedia>
                <AlertDialogTitle>
                  {t("nodesPage.deleteCertificateTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("nodesPage.deleteCertificateDescription", {
                    domain: certificate.domain,
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onDelete}>
                  {t("delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="grid min-w-0 gap-2 text-xs text-muted-foreground">
        <CertificatePath
          label={t("nodes.certificates.certificateFile")}
          path={certificate.certificate_file}
        />
        <CertificatePath
          label={t("nodes.certificates.keyFile")}
          path={certificate.key_file}
        />
      </div>
    </div>
  );
}

function CertificatePath({ label, path }: { label: string; path: string }) {
  return (
    <div className="min-w-0">
      <span className="font-medium">{label}</span>
      <code className="mt-1 block whitespace-normal break-all text-foreground">
        {path}
      </code>
    </div>
  );
}
