import * as React from "react";
import { cn } from "@/lib/cn";

export type CardSurface = "parchment" | "linen" | "elevated" | "sanctum";

const surfaceClasses: Record<CardSurface, string> = {
  parchment:
    "bg-paper text-ink border border-sandalwood-border",
  linen:
    "bg-linen text-ink border border-sandalwood-border",
  elevated:
    "bg-paper text-ink border border-sandalwood-border/75 shadow-sacred-md",
  sanctum:
    "bg-krishna-midnight text-ink-on-dark border border-gold-antique/25 shadow-sacred-lg",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  surface?: CardSurface;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, surface = "parchment", ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-[16px] p-5 sm:p-6", surfaceClasses[surface], className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-1.5", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-serif text-xl font-semibold leading-snug text-balance",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm leading-relaxed text-pretty opacity-85", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mt-4", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mt-5 flex flex-wrap items-center gap-3 pt-4 border-t border-current/10", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

