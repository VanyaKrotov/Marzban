import { LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
import { useIssueCertificateMutation } from "@/pages/nodes-page/lib/query";
import { generateErrorMessage } from "utils/toastHandler";

export function IssueCertificateDialog({
  nodeId,
  nodeName,
}: {
  nodeId: number;
  nodeName: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const issue = useIssueCertificateMutation(nodeId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <Plus />
          {t("nodes.certificates.new")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("nodes.certificates.issue")}</DialogTitle>
          <DialogDescription>{nodeName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="profile-certificate-domain">
              {t("nodes.certificates.domain")}
            </FieldLabel>
            <Input
              id="profile-certificate-domain"
              value={domain}
              placeholder="node.example.com"
              onChange={(event) => setDomain(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-certificate-email">
              {t("nodes.certificates.email")}
            </FieldLabel>
            <Input
              id="profile-certificate-email"
              type="email"
              value={email}
              placeholder="admin@example.com"
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Button
            type="button"
            className="w-full"
            disabled={!domain.trim() || issue.isPending}
            onClick={() =>
              issue.mutate(
                { domain: domain.trim(), email: email.trim() },
                {
                  onSuccess: () => {
                    setDomain("");
                    setOpen(false);
                  },
                  onError: (error) => generateErrorMessage(error),
                },
              )
            }
          >
            {issue.isPending && <LoaderCircle className="animate-spin" />}
            {t("nodes.certificates.issue")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
