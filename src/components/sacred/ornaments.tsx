import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Refined 8-petal lotus emblem inspired by Pahari manuscript marginalia.
 * Uses currentColor so it adapts seamlessly across Sanctum and Ivory surfaces.
 */
export function LotusEmblem({
  className,
  size = 24,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path
        d="M16 4.5C13.8 8.7 13.8 14.3 16 18.5C18.2 14.3 18.2 8.7 16 4.5Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M16 18.5C12.3 15.6 9.5 11.4 9.5 7.4C12.8 8.9 14.9 12.7 16 18.5Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M16 18.5C19.7 15.6 22.5 11.4 22.5 7.4C19.2 8.9 17.1 12.7 16 18.5Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M16 18.5C10.9 17.8 6.4 15.2 4.5 11.7C8.4 11.7 12.4 14 16 18.5Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M16 18.5C21.1 17.8 25.6 15.2 27.5 11.7C23.6 11.7 19.6 14 16 18.5Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 22.2C9.6 21.1 12.8 21.2 16 22.5C19.2 21.2 22.4 21.1 25.5 22.2"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M10.5 25.7C12.3 25 14.1 24.8 16 25.3C17.9 24.8 19.7 25 21.5 25.7"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Quiet manuscript section divider echoing Rajasthani folio rulework.
 */
export function ManuscriptDivider({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      role="separator"
      aria-hidden="true"
      className={cn("flex items-center gap-4 text-gold-ink/70", className)}
    >
      <span className="h-px flex-1 bg-sandalwood-border" />
      <LotusEmblem size={18} className="text-gold-antique" />
      <span className="h-px flex-1 bg-sandalwood-border" />
    </div>
  );
}

/**
 * Subtle geometric temple arch + Yamuna twilight horizon vector artwork
 * used as an authentic, non-cartoon static visual anchor in immersive Sanctum frames.
 */
export function YamunaHorizonArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 360"
      fill="none"
      aria-hidden="true"
      className={cn("size-full", className)}
    >
      <defs>
        <radialGradient id="sanctumMoon" cx="50%" cy="32%" r="45%">
          <stop offset="0%" stopColor="#D9AF52" stopOpacity="0.24" />
          <stop offset="55%" stopColor="#145B51" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#0C152B" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="640" height="360" fill="#0C152B" />
      <rect width="640" height="360" fill="url(#sanctumMoon)" />

      {/* Outer Rajasthani cusped arch outline */}
      <path
        d="M44 332V162C44 102 92 64 166 50C214 41 268 38 320 20C372 38 426 41 474 50C548 64 596 102 596 162V332"
        stroke="#C79A3B"
        strokeOpacity="0.32"
        strokeWidth="1.25"
      />
      <path
        d="M62 332V168C62 116 104 82 174 69C220 60 270 57 320 40C370 57 420 60 466 69C536 82 578 116 578 168V332"
        stroke="#C79A3B"
        strokeOpacity="0.18"
        strokeWidth="1"
      />

      {/* Quiet moon & celestial arcs */}
      <circle
        cx="320"
        cy="118"
        r="34"
        stroke="#D9AF52"
        strokeOpacity="0.55"
        strokeWidth="1.25"
      />
      <circle
        cx="320"
        cy="118"
        r="52"
        stroke="#C79A3B"
        strokeOpacity="0.2"
        strokeWidth="1"
        strokeDasharray="3 5"
      />

      {/* Distant Vrindavan grove & temple shikhara silhouette lines */}
      <path
        d="M110 236C146 218 184 218 220 236C250 220 284 222 320 236C356 222 390 220 420 236C456 218 494 218 530 236"
        stroke="#145B51"
        strokeOpacity="0.7"
        strokeWidth="1.5"
      />
      <path
        d="M294 236L305 186L320 162L335 186L346 236"
        stroke="#C79A3B"
        strokeOpacity="0.48"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <line
        x1="320"
        y1="150"
        x2="320"
        y2="162"
        stroke="#C79A3B"
        strokeOpacity="0.65"
        strokeWidth="1.25"
      />

      {/* Calm Yamuna river ripples */}
      <path
        d="M84 260C156 254 232 266 320 260C408 254 484 266 556 260"
        stroke="#C9BEAA"
        strokeOpacity="0.28"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M128 282C196 277 254 287 320 282C386 277 444 287 512 282"
        stroke="#C79A3B"
        strokeOpacity="0.24"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M180 304C228 300 274 307 320 304C366 300 412 307 460 304"
        stroke="#C9BEAA"
        strokeOpacity="0.18"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

