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

const truncatePath = (path: string, headLength = 22, tailLength = 32) => {
  if (path.length <= headLength + tailLength + 5) {
    return path;
  }

  return `${path.slice(0, headLength)}/.../${path.slice(-tailLength)}`;
};

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
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center">
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
        <div className="mt-2 grid min-w-0 gap-1 text-xs text-muted-foreground">
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
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={issue.isPending}
          onClick={() =>
            issue.mutate(
              { domain: certificate.domain, force: true },
              { onError: (error) => generateErrorMessage(error) },
            )
          }
        >
          <RefreshCw className={issue.isPending ? "animate-spin" : undefined} />
          {t("nodes.certificates.renew")}
        </Button>
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
  );
}

function CertificatePath({ label, path }: { label: string; path: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="shrink-0">{label}:</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <code className="min-w-0 max-w-full truncate text-foreground">
            {truncatePath(path)}
          </code>
        </TooltipTrigger>
        <TooltipContent className="max-w-[min(36rem,calc(100vw-2rem))] break-all">
          {path}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
