import { ChevronLeft, ChevronRight, QrCode } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

function QrCodePanel({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="overflow-hidden rounded-xl border bg-white p-3 shadow-sm">
        <QRCodeCanvas
          size={240}
          level="L"
          includeMargin={false}
          value={value}
        />
      </div>
      <p className="max-w-full truncate text-center text-sm text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

type SubscriptionQrDialogProps = {
  links: string[];
  subscribeUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SubscriptionQrDialog({
  links,
  subscribeUrl,
  open,
  onOpenChange,
}: SubscriptionQrDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <SubscriptionQrDialogContent
          links={links}
          subscribeUrl={subscribeUrl}
        />
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionQrDialogContent({
  links,
  subscribeUrl,
}: Pick<SubscriptionQrDialogProps, "links" | "subscribeUrl">) {
  const { t } = useTranslation();
  const [configIndex, setConfigIndex] = useState(0);
  const subscriptionLink = subscribeUrl?.startsWith("/")
    ? window.location.origin + subscribeUrl
    : subscribeUrl;
  const currentConfig = links[configIndex];
  const defaultTab = subscriptionLink ? "subscription" : "configurations";

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <QrCode className="size-5" />
          {t("qrcodeDialog.title")}
        </DialogTitle>
        <DialogDescription>
          {t("qrcodeDialog.description")}
        </DialogDescription>
      </DialogHeader>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="subscription" disabled={!subscriptionLink}>
            {t("qrcodeDialog.subscription")}
          </TabsTrigger>
          <TabsTrigger value="configurations" disabled={!links.length}>
            {t("qrcodeDialog.configurations")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscription">
          {subscriptionLink && (
            <QrCodePanel
              value={subscriptionLink}
              label={t("qrcodeDialog.sublink")}
            />
          )}
        </TabsContent>

        <TabsContent value="configurations">
          {currentConfig && (
            <>
              <QrCodePanel
                value={currentConfig}
                label={t("qrcodeDialog.config", { index: configIndex + 1 })}
              />
              <div className="flex items-center justify-center gap-3">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={configIndex === 0}
                  aria-label={t("qrcodeDialog.previous")}
                  onClick={() =>
                    setConfigIndex((current) => Math.max(0, current - 1))
                  }
                >
                  <ChevronLeft />
                </Button>
                <span className="min-w-16 text-center text-sm tabular-nums text-muted-foreground">
                  {t("qrcodeDialog.counter", {
                    current: configIndex + 1,
                    total: links.length,
                  })}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={configIndex === links.length - 1}
                  aria-label={t("qrcodeDialog.next")}
                  onClick={() =>
                    setConfigIndex((current) =>
                      Math.min(links.length - 1, current + 1),
                    )
                  }
                >
                  <ChevronRight />
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
