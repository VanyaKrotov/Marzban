import { HeartHandshake, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
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
import { DONATION_ADDRESSES } from "@/constants/Project";
import { useCopy } from "@/hooks/use-copy";

type DonationDialogProps = {
  trigger: ReactNode;
};

export function DonationDialog({ trigger }: DonationDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DonationDialogContent />
      </DialogContent>
    </Dialog>
  );
}

function DonationDialogContent() {
  const { t } = useTranslation();

  return (
    <>
      <DialogHeader>
        <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <HeartHandshake className="size-6" />
        </div>
        <DialogTitle>{t("donationDialog.title")}</DialogTitle>
        <DialogDescription className="max-w-lg">
          {t("donationDialog.description")}
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("donationDialog.impact")}
        </p>
      </div>

      <div className="grid gap-3">
        {DONATION_ADDRESSES.map((donation) => (
          <DonationAddress
            key={`${donation.asset}-${donation.network}`}
            {...donation}
          />
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t("donationDialog.networkWarning")}
      </p>
    </>
  );
}

function DonationAddress({
  address,
  asset,
  network,
}: (typeof DONATION_ADDRESSES)[number]) {
  const { t } = useTranslation();
  const { copied, Icon, onCopy } = useCopy(address);

  return (
    <div className="group rounded-xl border bg-muted/20 p-4 transition-colors hover:border-primary/30 hover:bg-muted/35">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{asset}</span>
          <span className="rounded-md bg-background px-2 py-0.5 text-xs text-muted-foreground ring-1 ring-border">
            {network}
          </span>
        </div>
        <CopyToClipboard text={address} onCopy={onCopy}>
          <Button
            type="button"
            size="sm"
            variant={copied ? "secondary" : "ghost"}
            aria-label={t(
              copied ? "copied" : "donationDialog.copyAddress",
            )}
          >
            <Icon />
            <span className="hidden sm:inline">
              {t(
                copied ? "copied" : "donationDialog.copy",
              )}
            </span>
          </Button>
        </CopyToClipboard>
      </div>
      <code
        className="block break-all text-xs leading-relaxed text-muted-foreground"
        title={address}
      >
        {address}
      </code>
    </div>
  );
}
