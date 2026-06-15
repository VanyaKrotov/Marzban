import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteCertificateMutation,
  useNodeCertificatesQuery,
} from "@/pages/nodes-page/lib/query";
import { generateErrorMessage } from "utils/toastHandler";

import { CertificateRow } from "./CertificateRow";
import { IssueCertificateDialog } from "./IssueCertificateDialog";

export function NodeCertificatesCard({
  nodeId,
  nodeName,
}: {
  nodeId: number;
  nodeName: string;
}) {
  const { t } = useTranslation();
  const query = useNodeCertificatesQuery(nodeId);
  const remove = useDeleteCertificateMutation(nodeId);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t("nodes.certificates.title")}</CardTitle>
        <CardDescription>
          {t("nodesPage.certificatesDescription")}
        </CardDescription>
        <CardAction>
          <IssueCertificateDialog nodeId={nodeId} nodeName={nodeName} />
        </CardAction>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : query.data?.length ? (
          <div className="grid gap-2">
            {query.data.map((certificate) => (
              <CertificateRow
                key={certificate.id}
                certificate={certificate}
                deleting={remove.isPending}
                onDelete={() =>
                  remove.mutate(certificate.id, {
                    onError: (error) => generateErrorMessage(error),
                  })
                }
              />
            ))}
          </div>
        ) : (
          <Empty className="min-h-40">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldCheck />
              </EmptyMedia>
              <EmptyTitle className="text-sm">
                {t("nodes.certificates.empty")}
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
