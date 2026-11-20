import * as React from "react";
import { cn } from "@/lib/cn";

export interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  showValueLabel?: boolean;
  tone?: "peacock" | "gold" | "sanctum";
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValueLabel = true,
  tone = "peacock",
  className,
}: ProgressBarProps) {
  const safeMax = Math.max(1, max);
  const clamped = Math.min(Math.max(0, value), safeMax);
  const pct = Math.round((clamped / safeMax) * 100);

  const trackColor =
    tone === "sanctum" ? "bg-krishna-elevated" : "bg-sandalwood-border/60";
  const fillColor =
    tone === "gold"
      ? "bg-gold-antique"
      : tone === "sanctum"
        ? "bg-gold-antique"
        : "bg-peacock-green";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span
          className={cn(
            "font-medium",
            tone === "sanctum" ? "text-ink-on-dark" : "text-ink"
          )}
        >
          {label}
        </span>
        {showValueLabel && (
          <span
            className={cn(
              "tabular-nums",
              tone === "sanctum" ? "text-ink-muted-dark" : "text-ink-muted"
            )}
          >
            {clamped} / {safeMax} ({pct}%)
          </span>
        )}
      </div>

      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clamped}
        className={cn("h-2.5 w-full overflow-hidden rounded-full", trackColor)}
      >
        <div
          className={cn(
            "h-full origin-left rounded-full transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
            fillColor
          )}
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
    </div>
  );
}

export interface SacredRingProgressProps {
  value: number;
  max: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  showInnerLabel?: boolean;
  darkSurface?: boolean;
  className?: string;
}

/**
 * Calm circular ring progress indicator with tabular numerals.
 * Uses SVG stroke-dashoffset with reduced-motion safe transitions.
 * Supports compact mode (size < 64) and darkSurface mode for seamless contrast.
 */
export function SacredRingProgress({
  value,
  max,
  label,
  size = 112,
  strokeWidth = 7,
  showInnerLabel = true,
  darkSurface = false,
  className,
}: SacredRingProgressProps) {
  const safeMax = Math.max(1, max);
  const clamped = Math.min(Math.max(0, value), safeMax);
  const ratio = clamped / safeMax;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  const isCompact = size < 64;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={clamped}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={darkSurface ? "text-white/15" : "text-sandalwood-border"}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-peacock-green transition-[stroke-dashoffset] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
        />
      </svg>
      {showInnerLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {isCompact ? (
            <span
              className={cn(
                "font-serif font-bold tabular-nums leading-none",
                size <= 48 ? "text-[11px]" : "text-xs",
                darkSurface ? "text-white" : "text-ink"
              )}
            >
              {Math.round(ratio * 100)}%
            </span>
          ) : (
            <>
              <span
                className={cn(
                  "font-serif text-xl font-semibold tabular-nums",
                  darkSurface ? "text-white" : "text-ink"
                )}
              >
                {Math.round(ratio * 100)}%
              </span>
              <span
                className={cn(
                  "text-[11px] tabular-nums",
                  darkSurface ? "text-slate-400" : "text-ink-muted"
                )}
              >
                {clamped}/{safeMax}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

