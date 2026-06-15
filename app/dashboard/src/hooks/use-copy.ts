import { Check, Copy, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const COPIED_STATE_DURATION = 1500;

export function useCopy(content: string, defaultIcon: LucideIcon = Copy) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [content]);

  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(
      () => setCopied(false),
      COPIED_STATE_DURATION,
    );

    return () => window.clearTimeout(timeout);
  }, [copied]);

  const onCopy = useCallback(() => {
    setCopied(true);
  }, []);

  const Icon: LucideIcon = copied ? Check : defaultIcon;

  return { copied, Icon, onCopy };
}
