import { Download, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCopy } from "@/hooks/use-copy";

import { useNodeSettingsQuery } from "../lib/query";

export function PanelCertificate() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const { data, isLoading } = useNodeSettingsQuery(true);
  const certificate = data?.certificate ?? "";
  const { copied, Icon, onCopy } = useCopy(certificate);

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([certificate], { type: "application/x-pem-file" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ssl_client_cert.pem";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card size="sm" className="bg-muted/25">
      <CardHeader>
        <CardTitle>{t("nodesPage.panelCertificate")}</CardTitle>
        <CardDescription>{t("nodes.connection-hint")}</CardDescription>
        <CardAction className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!certificate}
            onClick={() => setVisible((current) => !current)}
            aria-label={t(
              visible ? "nodes.hide-certificate" : "nodes.show-certificate",
            )}
          >
            {visible ? <EyeOff /> : <Eye />}
          </Button>
          <CopyToClipboard text={certificate} onCopy={onCopy}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!certificate}
              aria-label={t(
                copied ? "copied" : "nodesPage.copyCertificate",
              )}
            >
              <Icon />
            </Button>
          </CopyToClipboard>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!certificate}
            onClick={download}
            aria-label={t("nodes.download-certificate")}
          >
            <Download />
          </Button>
        </CardAction>
      </CardHeader>
      {isLoading ? (
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      ) : (
        visible && (
          <CardContent>
            <pre className="max-h-44 overflow-auto rounded-lg border bg-background p-3 text-[11px] leading-relaxed">
              {certificate || <LoaderCircle className="animate-spin" />}
            </pre>
          </CardContent>
        )
      )}
    </Card>
  );
}
