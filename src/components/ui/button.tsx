import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "gold"
  | "outline"
  | "ghost"
  | "destructive";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Disable subtle press scale when motion would distract (e.g., rapid counter taps). */
  staticPress?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-peacock-deep text-ink-on-dark hover:bg-peacock-slate border border-transparent shadow-sacred-sm ks-glow-primary",
  secondary:
    "bg-linen text-ink hover:bg-sandalwood-border/50 border border-sandalwood-border ks-glow-secondary",
  gold:
    "bg-gold-antique text-krishna-midnight hover:bg-gold-antique/90 border border-gold-border/60 font-medium shadow-sacred-sm ks-glow-gold",
  outline:
    "bg-transparent text-ink hover:bg-linen/70 border border-sandalwood-strong ks-glow-outline",
  ghost:
    "bg-transparent text-ink hover:bg-linen/75 border border-transparent ks-glow-ghost",
  destructive:
    "bg-kumkum text-paper hover:bg-kumkum/90 border border-transparent shadow-sacred-sm ks-glow-destructive",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 px-3.5 text-sm gap-1.5 rounded-[10px]",
  md: "min-h-11 px-4.5 text-sm font-medium gap-2 rounded-[10px]",
  lg: "min-h-12 px-6 text-base font-medium gap-2.5 rounded-[12px]",
  icon: "size-11 p-0 rounded-[10px]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      staticPress = false,
      disabled,
      type = "button",
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center whitespace-nowrap select-none",
          "transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
          !staticPress && !isDisabled && "active:scale-[0.96]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && (
          <Loader2
            className="size-4 animate-spin"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

/**
 * Helper class builder so Next.js <Link> can share exact Button visual styling.
 */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center whitespace-nowrap select-none",
    "transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96]",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

