"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export interface SadhanaGlowLinkProps {
  href: string;
  children: React.ReactNode;
  tone?: "gold" | "peacock" | "ivory";
  className?: string;
}

/**
 * Pointer-reactive luminous link/button wrapper: follows the cursor arrow with
 * a compositor-only GPU spotlight (transform + opacity, zero React state churn)
 * and remains crisp and static on touch devices or reduced motion.
 */
export function SadhanaGlowLink({
  href,
  children,
  tone = "ivory",
  className,
}: SadhanaGlowLinkProps) {
  const glowRef = React.useRef<HTMLSpanElement>(null);

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLAnchorElement>) => {
      if (event.pointerType !== "mouse") return;
      const glow = glowRef.current;
      if (!glow) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      glow.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    },
    []
  );

  const spotlightColor =
    tone === "gold"
      ? "bg-[radial-gradient(circle,rgba(255,244,199,0.55)_0%,rgba(214,168,72,0.22)_45%,transparent_72%)]"
      : tone === "peacock"
        ? "bg-[radial-gradient(circle,rgba(148,236,220,0.34)_0%,rgba(214,168,72,0.18)_48%,transparent_72%)]"
        : "bg-[radial-gradient(circle,rgba(214,168,72,0.28)_0%,rgba(42,134,121,0.12)_48%,transparent_72%)]";

  return (
    <Link
      href={href}
      onPointerMove={handlePointerMove}
      className={cn(
        "group relative overflow-hidden",
        "transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
        "active:scale-[0.96]",
        className
      )}
    >
      <span
        ref={glowRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0 left-0 size-44 rounded-full opacity-0 transition-opacity duration-200 motion-reduce:hidden",
          "[@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100",
          spotlightColor
        )}
      />
      <span className="relative z-10 inline-flex items-center gap-2.5">
        {children}
      </span>
    </Link>
  );
}

