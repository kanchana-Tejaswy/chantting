"use client";

import * as React from "react";

interface MotionRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  durationMs?: number;
  yOffset?: number;
  threshold?: number;
  as?: React.ElementType;
}

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

/**
 * Satisfying, Velvet-Smooth Bidirectional Scroll Reveal.
 * - Cinematic Apple/Linear spring-ease curve: cubic-bezier(0.22, 1, 0.36, 1).
 * - Optical lens pull: subtle 3px depth blur pulls into razor-sharp clarity.
 * - Hardware accelerated with translate3d and dedicated GPU layer promotion.
 * - Generous 80px lookahead margin eliminates any edge clipping or popping.
 * - Soft cross-faded exit (320ms) prevents abrupt cutoffs on quick scroll reversals.
 * - Full support for SSR, static markup rendering, and prefers-reduced-motion.
 */
export function MotionReveal({
  children,
  className = "",
  delayMs = 0,
  durationMs = 640,
  yOffset = 18,
  threshold = 0.08,
  as: Component = "div",
}: MotionRevealProps) {
  const prefersReducedMotion = React.useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const [internalVisible, setInternalVisible] = React.useState(false);
  const [direction, setDirection] = React.useState<"down" | "up">("down");
  const ref = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (prefersReducedMotion) return;

    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      const timer = setTimeout(() => {
        setInternalVisible(true);
      }, 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const windowHeight = window.innerHeight || 800;
            const top = entry.boundingClientRect.top;
            // Detect entry direction: entering from top vs entering from bottom
            const isEnteringFromTop = top < windowHeight * 0.28;
            setDirection(isEnteringFromTop ? "up" : "down");
            setInternalVisible(true);
          } else {
            // When exiting viewport, determine which side it left so it's primed for re-entry
            const top = entry.boundingClientRect.top;
            const leftThroughTop = top < 0;
            setDirection(leftThroughTop ? "up" : "down");
            setInternalVisible(false);
          }
        }
      },
      {
        threshold,
        // 80px lookahead margin ensures elements are sailing mid-glide before entering focal view
        rootMargin: "80px 0px 80px 0px",
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold, prefersReducedMotion]);

  const isVisible = prefersReducedMotion || internalVisible;

  const transformStyle = isVisible
    ? "translate3d(0, 0, 0) scale(1)"
    : `translate3d(0, ${direction === "up" ? -yOffset : yOffset}px, 0) scale(0.985)`;

  const filterStyle = isVisible ? "blur(0px)" : "blur(3px)";

  return (
    <Component
      ref={ref}
      style={{
        transitionProperty: "transform, opacity, filter",
        transitionDuration: isVisible ? `${durationMs}ms` : "320ms",
        transitionDelay: isVisible ? `${delayMs}ms` : "0ms",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        transform: transformStyle,
        opacity: isVisible ? 1 : 0,
        filter: filterStyle,
        WebkitFilter: filterStyle,
        willChange: "transform, opacity, filter",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
      className={className}
    >
      {children}
    </Component>
  );
}
