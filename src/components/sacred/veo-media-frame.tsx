"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { YamunaHorizonArt } from "./ornaments";

export interface VeoMediaFrameProps {
  /** Optional future Google Veo 3 MP4/WebM URL; static vector/poster renders when omitted. */
  videoSrc?: string;
  posterUrl?: string;
  alt: string;
  caption?: string;
  className?: string;
}

/**
 * Immersive-only devotional visual container built for Google Veo 3 scenes.
 * Respects reduced-motion, lazy-loads only when visible, and always provides
 * a calm static fallback so chanting and reading never compete with motion.
 */
export function VeoMediaFrame({
  videoSrc,
  posterUrl,
  alt,
  caption,
  className,
}: VeoMediaFrameProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [inView, setInView] = React.useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  const [pausedByUser, setPausedByUser] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
        }
      },
      { rootMargin: "120px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const shouldRenderVideo =
    Boolean(videoSrc) && inView && !prefersReducedMotion && !pausedByUser;

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (shouldRenderVideo) {
      video.play().catch(() => {
        setPausedByUser(true);
      });
    } else {
      video.pause();
    }
  }, [shouldRenderVideo]);

  return (
    <figure
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-[20px] bg-krishna-midnight text-ink-on-dark",
        "outline-1 -outline-offset-1 outline-[oklch(1_0_0/0.12)] shadow-sacred-lg",
        className
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt={alt}
            className="size-full object-cover"
          />
        ) : (
          <div role="img" aria-label={alt} className="size-full">
            <YamunaHorizonArt />
          </div>
        )}

        {shouldRenderVideo && videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={posterUrl}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={alt}
            className="absolute inset-0 size-full object-cover"
          />
        )}

        {videoSrc && !prefersReducedMotion && (
          <button
            type="button"
            onClick={() => setPausedByUser((prev) => !prev)}
            aria-label={pausedByUser ? "Play ambient scene" : "Pause ambient scene"}
            className="absolute right-3 bottom-3 inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-gold-antique/35 bg-krishna-midnight/85 px-3 py-1.5 text-xs font-medium text-ink-on-dark backdrop-blur-sm transition-colors duration-150 hover:bg-krishna-elevated"
          >
            {pausedByUser ? (
              <>
                <Play className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>Play scene</span>
              </>
            ) : (
              <>
                <Pause className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>Pause scene</span>
              </>
            )}
          </button>
        )}
      </div>

      {caption && (
        <figcaption className="border-t border-gold-antique/15 bg-krishna-elevated/70 px-4 py-2.5 text-xs leading-relaxed text-ink-muted-dark">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

