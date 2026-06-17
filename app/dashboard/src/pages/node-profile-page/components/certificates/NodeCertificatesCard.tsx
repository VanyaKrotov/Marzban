import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteCertificateMutation,
  useNodeCertificatesQuery,
} from "@/pages/nodes-page/lib/query";
import { generateErrorMessage } from "utils/toastHandler";

import { CertificateRow } from "./CertificateRow";
import { IssueCertificateDialog } from "./IssueCertificateDialog";

export function NodeCertificatesDialog({
  nodeId,
  nodeName,
  open,
  onOpenChange,
}: {
  nodeId: number;
  nodeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        {open && <NodeCertificatesContent nodeId={nodeId} nodeName={nodeName} />}
      </DialogContent>
    </Dialog>
  );
}

function NodeCertificatesContent({
  nodeId,
  nodeName,
}: {
  nodeId: number;
  nodeName: string;
}) {
  const { t } = useTranslation();
  const query = useNodeCertificatesQuery(nodeId);
  const remove = useDeleteCertificateMutation(nodeId);
  const createAction = (
    <IssueCertificateDialog nodeId={nodeId} nodeName={nodeName} />
  );
  const controls = (
    <div className="flex justify-end">
      {createAction}
    </div>
  );
  const emptyControls = (
    <div className="flex justify-center">{createAction}</div>
  );

  return (
    <>
      <DialogHeader className="pe-8">
        <DialogTitle>{t("nodes.certificates.title")}</DialogTitle>
        <DialogDescription>
          {t("nodesPage.certificatesDescription")}
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4">
        {query.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : query.data?.length ? (
          <div className="space-y-3">
            {controls}
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
            <EmptyContent>{emptyControls}</EmptyContent>
          </Empty>
        )}
      </div>
    </>
  );
}
