import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNodeCertificatesQuery } from "@/pages/nodes-page/lib/query";

interface Props {
  nodeId: number;
  onSet(certificateFile: string, keyFile: string): void;
}

function CertificateHelper({ nodeId, onSet }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const query = useNodeCertificatesQuery(nodeId, open);
  const certificates = query.data ?? [];

  if (query.isFetched && !certificates.length) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="secondary">
          {t("nodes.certificate")}
        </Button>
      </PopoverTrigger>
      <PopoverContent sideOffset={10} align="start" className="w-80">
        <Select
          disabled={query.isLoading}
          onValueChange={(value) => {
            const certificate = certificates.find(
              ({ id }) => String(id) === value,
            );
            if (!certificate) {
              return;
            }
            onSet(certificate.certificate_file, certificate.key_file);
            setOpen(false);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("nodes.certificates.select")} />
          </SelectTrigger>
          <SelectContent>
            {certificates.map((certificate) => (
              <SelectItem value={String(certificate.id)} key={certificate.id}>
                {certificate.domain}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PopoverContent>
    </Popover>
  );
}

export default CertificateHelper;
