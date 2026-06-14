import {
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  ShieldPlus,
  Trash2,
} from "lucide-react";
import { type ReactNode, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  type NodeCertificate,
  useDeleteCertificateMutation,
  useIssueCertificateMutation,
  useNodeCertificatesQuery,
} from "../lib/query";

export function NodeCertificatesDialog({
  nodeId,
  nodeName,
  trigger,
}: {
  nodeId: number;
  nodeName: string;
  trigger?: ReactNode;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const { data: certificates = [], isLoading } = useNodeCertificatesQuery(
    nodeId,
    open,
  );
  const issue = useIssueCertificateMutation(nodeId);
  const remove = useDeleteCertificateMutation(nodeId);

  const issueCertificate = () => {
    issue.mutate(
      { domain: domain.trim(), email: email.trim() },
      { onSuccess: () => setDomain("") },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline">
            <ShieldPlus />
            {t("nodes.certificates.title")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] min-w-0 max-w-[calc(100vw-2rem)] overflow-x-hidden sm:max-h-[calc(100svh-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("nodes.certificates.title")}</DialogTitle>
          <DialogDescription>
            {nodeName}. {t("nodesPage.certificatesDescription")}
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="certificate-domain">
                {t("nodes.certificates.domain")}
              </FieldLabel>
              <Input
                id="certificate-domain"
                placeholder="node.example.com"
                value={domain}
                disabled={issue.isPending}
                onChange={(event) => setDomain(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="certificate-email">
                {t("nodes.certificates.email")}
              </FieldLabel>
              <Input
                id="certificate-email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                disabled={issue.isPending}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
          </div>
          <Button
            type="button"
            variant="default"
            disabled={!domain.trim() || issue.isPending}
            onClick={issueCertificate}
            className="w-full"
          >
            {issue.isPending && <LoaderCircle className="animate-spin" />}
            {t("nodes.certificates.issue")}
          </Button>

          {isLoading ? (
            <div className="grid gap-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : certificates.length ? (
            <div className="grid gap-2">
              {certificates.map((certificate) => (
                <CertificateRow
                  key={certificate.id}
                  certificate={certificate}
                  renewing={issue.isPending}
                  deleting={remove.isPending}
                  onRenew={() =>
                    issue.mutate({
                      domain: certificate.domain,
                      email: email.trim(),
                      force: true,
                    })
                  }
                  onDelete={() => remove.mutate(certificate.id)}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              {t("nodes.certificates.empty")}
            </p>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

function CertificateRow({
  certificate,
  renewing,
  deleting,
  onRenew,
  onDelete,
}: {
  certificate: NodeCertificate;
  renewing: boolean;
  deleting: boolean;
  onRenew: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

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
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={renewing}
          onClick={onRenew}
        >
          <RefreshCw className={renewing ? "animate-spin" : undefined} />
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
