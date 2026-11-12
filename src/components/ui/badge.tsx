import * as React from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant =
  | "neutral"
  | "peacock"
  | "gold"
  | "sanctum"
  | "kumkum";

const badgeVariants: Record<BadgeVariant, string> = {
  neutral:
    "bg-linen text-ink-muted border-sandalwood-border",
  peacock:
    "bg-tulsi-wash text-peacock-ink border-peacock-green/25",
  gold:
    "bg-gold-wash text-gold-ink border-gold-border/35",
  sanctum:
    "bg-krishna-elevated text-ink-on-dark border-gold-antique/30",
  kumkum:
    "bg-kumkum-wash text-kumkum border-kumkum/25",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5 tabular-nums",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

