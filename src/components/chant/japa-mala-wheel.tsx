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
  /** Unified daily completed rounds so wheel pill matches top bar & manual counter. */
  todayRounds?: number;
}

const VIEW_SIZE = 360;
const CENTER = VIEW_SIZE / 2;
const RING_RADIUS = 148;
const RING_CIRCUMFERENCE = Number((2 * Math.PI * RING_RADIUS).toFixed(2));
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
 * Heirloom 108-bead Digital Japa Mala with dimensional bead gradients,
 * clockwise golden cord progress, quarter-milestone jewels (27 / 54 / 81),
 * ornate Sumaru crown bead, compositor-only tap ripples, and central tap sphere.
 */
export function JapaMalaWheel({
  currentBead,
  isPaused,
  isBusy,
  onAdvanceBead,
  sessionRounds,
  todayRounds,
}: JapaMalaWheelProps) {
  const uid = React.useId().replace(/:/g, "");
  const safeBead = Math.min(Math.max(0, currentBead), BEADS_PER_ROUND);
  const remainingInRound = BEADS_PER_ROUND - safeBead;
  const progressRatio = safeBead / BEADS_PER_ROUND;
  const progressOffset = Number(
    (RING_CIRCUMFERENCE * (1 - progressRatio)).toFixed(2)
  );

  const displayRounds = todayRounds ?? sessionRounds;
  const prevRoundsRef = React.useRef(displayRounds);
  const [sumaruPulseKey, setSumaruPulseKey] = React.useState(0);

  React.useEffect(() => {
    if (displayRounds > prevRoundsRef.current) {
      setSumaruPulseKey((k) => k + 1);
    }
    prevRoundsRef.current = displayRounds;
  }, [displayRounds]);

  const tulsiId = `ks-tulsi-${uid}`;
  const goldId = `ks-gold-${uid}`;
  const sandalId = `ks-sandal-${uid}`;
  const sumaruId = `ks-sumaru-${uid}`;
  const arcGradId = `ks-arc-${uid}`;

  return (
    <div className="relative mx-auto flex w-full max-w-[360px] flex-col items-center">
      <div className="relative aspect-square w-full">
        <svg
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          className="size-full select-none"
          role="img"
          aria-label={`Digital Japa Mala showing ${safeBead} of ${BEADS_PER_ROUND} beads completed in current round`}
        >
          <defs>
            {/* Padmaraga / Royal Lotus Crimson bead sheen */}
            <radialGradient id={tulsiId} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#C44D62" />
              <stop offset="55%" stopColor="#8A253A" />
              <stop offset="100%" stopColor="#4A101D" />
            </radialGradient>

            {/* Illuminated Antique Gold active bead */}
            <radialGradient id={goldId} cx="32%" cy="28%" r="72%">
              <stop offset="0%" stopColor="#FFF0BD" />
              <stop offset="48%" stopColor="#DFB14B" />
              <stop offset="100%" stopColor="#946818" />
            </radialGradient>

            {/* Carved warm sandalwood / ivory unchanted bead */}
            <radialGradient id={sandalId} cx="34%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFCF5" />
              <stop offset="65%" stopColor="#EFE5D2" />
              <stop offset="100%" stopColor="#CBBCA2" />
            </radialGradient>

            {/* Sumaru / Krishna crown head bead */}
            <radialGradient id={sumaruId} cx="34%" cy="28%" r="72%">
              <stop offset="0%" stopColor="#FFF6D6" />
              <stop offset="45%" stopColor="#D7A742" />
              <stop offset="100%" stopColor="#7C5410" />
            </radialGradient>

            {/* Subtle thread arc gradient */}
            <linearGradient id={arcGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C89B3C" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8A253A" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Outer subtle sacred halo guide */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RING_RADIUS + 14}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.75"
            strokeDasharray="2 5"
            className="text-gold-antique/30"
          />

          {/* Base braided sandalwood cord */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-sandalwood-border"
          />

          {/* Clockwise round progress thread arc */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RING_RADIUS}
            fill="none"
            stroke={`url(#${arcGradId})`}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={progressOffset}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            className="transition-[stroke-dashoffset] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
          />

          {/* Quarter-round markers & circular micro-numerals at 27, 54, 81 */}
          {MALA_POINTS.filter((p) => QUARTER_BEADS.has(p.index)).map((point) => {
            const rad = (point.angleDeg * Math.PI) / 180;
            const labelX = CENTER + (RING_RADIUS - 18) * Math.cos(rad);
            const labelY = CENTER + (RING_RADIUS - 18) * Math.sin(rad);
            const reached = safeBead >= point.index;

            return (
              <g key={`q-${point.index}`}>
                <circle
                  cx={labelX.toFixed(2)}
                  cy={labelY.toFixed(2)}
                  r={8}
                  className={cn(
                    "transition-all duration-200",
                    reached
                      ? "fill-gold-wash stroke-gold-antique"
                      : "fill-paper stroke-sandalwood-border"
                  )}
                  strokeWidth="0.85"
                />
                <text
                  x={labelX.toFixed(2)}
                  y={(labelY + 3.2).toFixed(2)}
                  textAnchor="middle"
                  className={cn(
                    "font-serif text-[9px] font-bold tabular-nums transition-colors duration-200",
                    reached ? "fill-peacock-deep" : "fill-ink-muted"
                  )}
                >
                  {point.index}
                </text>
              </g>
            );
          })}

          {/* Sumaru / Krishna head bead (index 0) + crown collar & round-completion radiance */}
          <g>
            {sumaruPulseKey > 0 && (
              <circle
                key={`sumaru-pulse-${sumaruPulseKey}`}
                cx={MALA_POINTS[0]!.x}
                cy={MALA_POINTS[0]!.y}
                r={12}
                fill="none"
                stroke="#D4A23E"
                strokeWidth="2"
                className="animate-ks-sumaru-radiance motion-reduce:hidden"
              />
            )}
            {/* Sacred Silk Thread & Kalasha Cap connecting Meru bead */}
            <line
              x1={MALA_POINTS[0]!.x}
              y1={MALA_POINTS[0]!.y - 6}
              x2={MALA_POINTS[0]!.x}
              y2={MALA_POINTS[0]!.y - 12}
              stroke="#C29438"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <circle
              cx={MALA_POINTS[0]!.x}
              cy={MALA_POINTS[0]!.y - 12.5}
              r={2.5}
              fill="#C29438"
              stroke="#FFF6D6"
              strokeWidth="0.5"
            />
            <circle
              cx={MALA_POINTS[0]!.x}
              cy={MALA_POINTS[0]!.y}
              r={9.5}
              className="fill-gold-wash stroke-gold-border"
              strokeWidth="1.4"
            />
            <circle
              cx={MALA_POINTS[0]!.x}
              cy={MALA_POINTS[0]!.y}
              r={6.4}
              fill={`url(#${sumaruId})`}
            />
            <circle
              cx={MALA_POINTS[0]!.x - 2}
              cy={MALA_POINTS[0]!.y - 2}
              r={1.4}
              fill="#FFFFFF"
              opacity="0.65"
            />
          </g>

          {/* All 108 chanting beads */}
          {MALA_POINTS.slice(1).map((point) => {
            const isCompleted = point.index < safeBead;
            const isCurrent = point.index === safeBead;
            const isQuarter = QUARTER_BEADS.has(point.index);

            if (isCurrent) {
              return (
                <g key={point.index}>
                  {/* Animated GPU-composited halo on active bead advance */}
                  <circle
                    key={`halo-${safeBead}`}
                    cx={point.x}
                    cy={point.y}
                    r={7.5}
                    fill="none"
                    stroke="#D4A23E"
                    strokeWidth="1.5"
                    className="animate-ks-bead-halo motion-reduce:hidden"
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={7.2}
                    className="fill-gold-antique/25"
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={4.7}
                    fill={`url(#${goldId})`}
                    stroke="#0D1628"
                    strokeWidth="1.15"
                  />
                  <circle
                    cx={point.x - 1.3}
                    cy={point.y - 1.3}
                    r={1.1}
                    fill="#FFFFFF"
                    opacity="0.7"
                  />
                </g>
              );
            }

            if (isCompleted) {
              const r = isQuarter ? 3.85 : 3.35;
              return (
                <g key={point.index}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={r}
                    fill={`url(#${tulsiId})`}
                    stroke={isQuarter ? "#C89B3C" : "#5B1524"}
                    strokeWidth={isQuarter ? 0.9 : 0.45}
                  />
                  <circle
                    cx={point.x - 0.95}
                    cy={point.y - 0.95}
                    r={0.75}
                    fill="#FFFFFF"
                    opacity="0.38"
                  />
                </g>
              );
            }

            return (
              <circle
                key={point.index}
                cx={point.x}
                cy={point.y}
                r={isQuarter ? 3.55 : 2.95}
                fill={`url(#${sandalId})`}
                stroke={isQuarter ? "#C89B3C" : "#C4B59B"}
                strokeWidth={isQuarter ? 1.1 : 0.85}
                className="transition-opacity duration-150"
              />
            );
          })}
        </svg>

        {/* Central One-Handed Tap Control */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative flex size-44 items-center justify-center sm:size-48">
            {safeBead > 0 && !isPaused && (
              <span
                key={`ripple-${safeBead}`}
                aria-hidden="true"
                className="animate-ks-center-ripple pointer-events-none absolute inset-0 rounded-full border border-gold-antique/60 motion-reduce:hidden"
              />
            )}

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
                "pointer-events-auto relative flex size-full cursor-pointer flex-col items-center justify-center rounded-full border-2 text-center select-none p-4",
                "transition-[transform,background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
                isPaused
                  ? "cursor-not-allowed border-sandalwood-strong bg-linen/95 text-ink-muted shadow-xs"
                  : "border-gold-border/80 bg-gradient-to-b from-paper via-paper to-linen/60 text-ink shadow-sacred-md ring-4 ring-gold-antique/15 hover:border-peacock-deep hover:ring-peacock-green/20 active:scale-[0.96]"
              )}
            >
              {isPaused ? (
                <>
                  <Pause
                    className="size-6 text-ink-muted"
                    strokeWidth={1.75}
                    aria-hidden={true}
                  />
                  <span className="mt-2 text-sm font-semibold text-ink">
                    Session Paused
                  </span>
                  <span className="mt-0.5 text-xs text-ink-muted tabular-nums">
                    {safeBead}/{BEADS_PER_ROUND} beads saved
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-ink-muted">
                    Bead Progress
                  </span>
                  <span className="mt-1 font-serif text-4xl sm:text-5xl font-bold tracking-tight text-ink tabular-nums">
                    {safeBead}
                    <span className="text-xl sm:text-2xl font-normal text-ink-muted">
                      /{BEADS_PER_ROUND}
                    </span>
                  </span>
                  <span className="mt-1 text-xs font-semibold text-peacock-deep tabular-nums">
                    {remainingInRound === BEADS_PER_ROUND
                      ? "Tap to begin round"
                      : `${remainingInRound} remaining`}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-sandalwood-border/90 bg-linen/90 px-3 py-0.5 text-[11px] font-semibold text-ink-muted tabular-nums shadow-2xs">
                    {todayRounds !== undefined
                      ? `Rounds today: ${displayRounds}`
                      : `Session rounds: ${sessionRounds}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
