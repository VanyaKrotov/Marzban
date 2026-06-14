import { QrCode } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslation } from "react-i18next";

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
  const subscriptionLink = subscribeUrl?.startsWith("/")
    ? window.location.origin + subscribeUrl
    : subscribeUrl;
  const defaultTab = subscriptionLink ? "subscription" : "config-0";

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

      <Tabs key={defaultTab} defaultValue={defaultTab}>
            <TabsList className="h-auto max-w-full flex-wrap justify-start overflow-visible">
              {subscriptionLink && (
                <TabsTrigger value="subscription">
                  {t("qrcodeDialog.sublink")}
                </TabsTrigger>
              )}
              {links.map((_, index) => (
                <TabsTrigger value={`config-${index}`} key={index}>
                  {t("qrcodeDialog.config", { index: index + 1 })}
                </TabsTrigger>
              ))}
            </TabsList>

            {subscriptionLink && (
              <TabsContent value="subscription">
                <QrCodePanel
                  value={subscriptionLink}
                  label={t("qrcodeDialog.sublink")}
                />
              </TabsContent>
            )}
            {links.map((link, index) => (
              <TabsContent value={`config-${index}`} key={index}>
                <QrCodePanel
                  value={link}
                  label={t("qrcodeDialog.config", { index: index + 1 })}
                />
              </TabsContent>
            ))}
      </Tabs>
    </>
  );
}
