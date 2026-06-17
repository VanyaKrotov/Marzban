import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NodeCertificate,
  useNodeCertificatesQuery,
} from "@/pages/nodes-page/lib/query";

interface Props {
  nodeId: number;
  checkSelected(cert: NodeCertificate): boolean;
  onSet(certificateFile: string, keyFile: string): void;
}

function CertificateHelper({ nodeId, checkSelected, onSet }: Props) {
  const { t } = useTranslation();
  const query = useNodeCertificatesQuery(nodeId);
  const certificates = query.data ?? [];

  if (query.isFetched && !certificates.length) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={query.isLoading}
        >
          {t("nodes.certificate")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {certificates.map((certificate) => (
          <DropdownMenuCheckboxItem
            checked={checkSelected(certificate)}
            key={certificate.id}
            onCheckedChange={() =>
              onSet(certificate.certificate_file, certificate.key_file)
            }
          >
            <span className="truncate">{certificate.domain}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CertificateHelper;
