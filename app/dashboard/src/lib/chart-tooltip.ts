import type { CSSProperties } from "react";

export const chartTooltipContentStyle = {
  background: "var(--foreground)",
  border: "1px solid var(--foreground)",
  borderRadius: "var(--radius)",
  color: "var(--background)",
} satisfies CSSProperties;

export const chartTooltipItemStyle = {
  color: "var(--background)",
} satisfies CSSProperties;

export const chartTooltipLabelStyle = {
  color: "var(--background)",
} satisfies CSSProperties;
