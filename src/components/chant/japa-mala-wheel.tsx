"use client";

import * as React from "react";
import { Pause } from "lucide-react";
import { cn } from "@/lib/cn";
import { BEADS_PER_ROUND } from "@/lib/domain/sadhana";

export interface JapaMalaWheelProps {
  currentBead: number;
  isPaused: boolean;
  isBusy: boolean;
  onAdvanceBead: () => void;
  sessionRounds: number;
}

const VIEW_SIZE = 360;
const CENTER = VIEW_SIZE / 2;
const RING_RADIUS = 148;
const TOTAL_SLOTS = BEADS_PER_ROUND + 1; // 1 Sumaru head bead + 108 chanting beads

interface BeadPoint {
  index: number;
  x: number;
  y: number;
  angleDeg: number;
}

const MALA_POINTS: BeadPoint[] = Array.from(
  { length: TOTAL_SLOTS },
  (_, index) => {
    const angle = -Math.PI / 2 + (index / TOTAL_SLOTS) * Math.PI * 2;
    return {
      index,
      x: Number((CENTER + RING_RADIUS * Math.cos(angle)).toFixed(2)),
      y: Number((CENTER + RING_RADIUS * Math.sin(angle)).toFixed(2)),
      angleDeg: (angle * 180) / Math.PI,
    };
  }
);

const QUARTER_BEADS = new Set([27, 54, 81]);

/**
 * 108-bead Digital Japa Mala with Sumaru head bead, quarter markers,
 * individual bead progression, and one-handed central tap surface.
 */
export function JapaMalaWheel({
  currentBead,
  isPaused,
  isBusy,
  onAdvanceBead,
  sessionRounds,
}: JapaMalaWheelProps) {
  const safeBead = Math.min(Math.max(0, currentBead), BEADS_PER_ROUND);
  const remainingInRound = BEADS_PER_ROUND - safeBead;

  return (
    <div className="relative mx-auto flex w-full max-w-[360px] flex-col items-center">
      <div className="relative aspect-square w-full">
        <svg
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          className="size-full select-none"
          role="img"
          aria-label={`Digital Japa Mala showing ${safeBead} of ${BEADS_PER_ROUND} beads completed in current round`}
        >
          {/* Subtle connecting cord */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-sandalwood-border"
          />

          {/* Quarter-round markers at 27, 54, 81 */}
          {MALA_POINTS.filter((p) => QUARTER_BEADS.has(p.index)).map((point) => {
            const rad = (point.angleDeg * Math.PI) / 180;
            const innerX = CENTER + (RING_RADIUS - 12) * Math.cos(rad);
            const innerY = CENTER + (RING_RADIUS - 12) * Math.sin(rad);
            const outerX = CENTER + (RING_RADIUS - 6) * Math.cos(rad);
            const outerY = CENTER + (RING_RADIUS - 6) * Math.sin(rad);
            return (
              <line
                key={`q-${point.index}`}
                x1={innerX.toFixed(2)}
                y1={innerY.toFixed(2)}
                x2={outerX.toFixed(2)}
                y2={outerY.toFixed(2)}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="text-gold-antique/70"
              />
            );
          })}

          {/* Sumaru / Krishna head bead (index 0) */}
          <g>
            <circle
              cx={MALA_POINTS[0]!.x}
              cy={MALA_POINTS[0]!.y}
              r={8.5}
              className="fill-gold-wash stroke-gold-border"
              strokeWidth="1.5"
            />
            <circle
              cx={MALA_POINTS[0]!.x}
              cy={MALA_POINTS[0]!.y}
              r={4.2}
              className="fill-gold-antique"
            />
          </g>

          {/* All 108 chanting beads */}
          {MALA_POINTS.slice(1).map((point) => {
            const isCompleted = point.index < safeBead;
            const isCurrent = point.index === safeBead;

            if (isCurrent) {
              return (
                <g key={point.index}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={6.6}
                    className="fill-gold-antique/25"
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    className="fill-gold-antique stroke-krishna-midnight"
                    strokeWidth="1.2"
                  />
                </g>
              );
            }

            return (
              <circle
                key={point.index}
                cx={point.x}
                cy={point.y}
                r={isCompleted ? 3.2 : 2.9}
                className={cn(
                  "transition-colors duration-150",
                  isCompleted
                    ? "fill-peacock-green stroke-peacock-ink"
                    : "fill-paper stroke-sandalwood-strong"
                )}
                strokeWidth={isCompleted ? 0.6 : 1}
              />
            );
          })}
        </svg>

        {/* Central One-Handed Tap Control */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            disabled={isPaused || isBusy}
            onClick={onAdvanceBead}
            aria-label={
              isPaused
                ? "Japa Mala paused. Resume session to continue chanting."
                : `Advance to bead ${Math.min(safeBead + 1, BEADS_PER_ROUND)} of ${BEADS_PER_ROUND}`
            }
            className={cn(
              "pointer-events-auto flex size-44 cursor-pointer flex-col items-center justify-center rounded-full border-2 text-center select-none sm:size-48",
              "transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out",
              isPaused
                ? "cursor-not-allowed border-sandalwood-strong bg-linen/95 text-ink-muted"
                : "border-gold-border/60 bg-paper text-ink shadow-sacred-md hover:border-peacock-deep hover:bg-paper active:scale-[0.96]"
            )}
          >
            {isPaused ? (
              <>
                <Pause
                  className="size-6 text-ink-muted"
                  strokeWidth={1.75}
                  aria-hidden={true}
                />
                <span className="mt-2 text-sm font-medium text-ink">
                  Session Paused
                </span>
                <span className="mt-0.5 text-xs text-ink-muted tabular-nums">
                  {safeBead}/{BEADS_PER_ROUND} beads saved
                </span>
              </>
            ) : (
              <>
                <span className="text-[11px] font-medium text-ink-muted">
                  Bead Progress
                </span>
                <span className="mt-1 font-serif text-4xl font-semibold text-ink tabular-nums">
                  {safeBead}
                  <span className="text-xl font-normal text-ink-muted">
                    /{BEADS_PER_ROUND}
                  </span>
                </span>
                <span className="mt-1.5 text-xs text-peacock-ink tabular-nums">
                  {remainingInRound === BEADS_PER_ROUND
                    ? "Tap to begin round"
                    : `${remainingInRound} remaining`}
                </span>
                <span className="mt-2 rounded-full bg-linen px-2.5 py-0.5 text-[11px] font-medium text-ink-muted tabular-nums">
                  Session rounds: {sessionRounds}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

