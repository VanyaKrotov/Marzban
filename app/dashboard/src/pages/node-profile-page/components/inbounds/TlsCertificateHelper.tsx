import { useMutation } from "@tanstack/react-query";
import { Dices, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/service/http";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { generateErrorMessage } from "@/utils/toastHandler";

type TlsCertificate = {
  certificate: string[];
  key: string[];
};

type Props = {
  serverName?: string;
  onSet(certificate: string[], key: string[]): void;
};

function TlsCertificateHelper({ serverName, onSet }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="secondary">
          {t("inboundsPage.helpers.tlsCertificate")}
        </Button>
      </PopoverTrigger>
      <PopoverContent sideOffset={10} align="start" className="w-md">
        <Content
          serverName={serverName}
          onSet={(certificate, key) => {
            onSet(certificate, key);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function Content({ serverName, onSet }: Props) {
  const { t } = useTranslation();
  const [certificate, setCertificate] = useState<TlsCertificate | null>(null);
  const generate = useMutation({
    mutationFn: () =>
      api.post<TlsCertificate>("/core/tls/certificate", {
        server_name: serverName ?? null,
      }),
    gcTime: 0,
    onSuccess: setCertificate,
    onError: generateErrorMessage,
  });

  return (
    <div className="flex flex-col gap-2">
      <Field>
        <FieldLabel>{t("inboundsPage.helpers.domain")}</FieldLabel>
        <Input
          readOnly
          value={serverName ?? t("inboundsPage.helpers.noServerName")}
        />
      </Field>
      {certificate && (
        <>
          <Field>
            <FieldLabel>{t("inboundsPage.helpers.certificate")}</FieldLabel>
            <Textarea
              readOnly
              value={certificate.certificate.join("\n")}
              className="min-h-32 font-mono text-xs"
            />
          </Field>
          <Field>
            <FieldLabel>{t("inboundsPage.helpers.privateKey")}</FieldLabel>
            <Textarea
              readOnly
              value={certificate.key.join("\n")}
              className="min-h-32 font-mono text-xs"
            />
          </Field>
        </>
      )}
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          aria-label={t("inboundsPage.helpers.generate")}
          disabled={generate.isPending}
          onClick={() => generate.mutate(undefined)}
        >
          {generate.isPending ? <LoaderCircle className="animate-spin" /> : <Dices />}
        </Button>
        <Button
          type="button"
          disabled={generate.isPending || !certificate}
          onClick={() => onSet(certificate!.certificate, certificate!.key)}
        >
          {t("inboundsPage.helpers.setup")}
        </Button>
      </div>
    </div>
  );
}

export default TlsCertificateHelper;
