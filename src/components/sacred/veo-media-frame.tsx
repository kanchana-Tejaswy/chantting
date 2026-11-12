"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { YamunaHorizonArt } from "./ornaments";

function enforceStrictMute(video: HTMLVideoElement | null) {
  if (!video) return;
  video.defaultMuted = true;
  video.muted = true;
  video.volume = 0;
}

function isReducedMotionActive(): boolean {
  if (typeof window === "undefined") return false;
  const mediaMatches =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const appReduced =
    document.documentElement.getAttribute("data-reduced-motion") === "true" ||
    Boolean(document.querySelector('[data-reduced-motion="true"]'));
  return mediaMatches || appReduced;
}

interface UseSanctumVideoOptions {
  videoSrc?: string;
  lazyTargetRef?: React.RefObject<HTMLElement | null>;
}

function useSanctumVideoState({
  videoSrc,
  lazyTargetRef,
}: UseSanctumVideoOptions) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [inView, setInView] = React.useState(!lazyTargetRef);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  const [pausedByUser, setPausedByUser] = React.useState(false);
  const [isVideoReady, setIsVideoReady] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const update = () => setPrefersReducedMotion(isReducedMotionActive());
    update();

    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    media?.addEventListener("change", update);

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-reduced-motion"],
    });

    return () => {
      media?.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);

  React.useEffect(() => {
    const node = lazyTargetRef?.current;
    if (!node) {
      setInView(true);
      return;
    }

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
  }, [lazyTargetRef]);

  const shouldRenderVideo =
    Boolean(videoSrc) && inView && !prefersReducedMotion && !hasError;

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    enforceStrictMute(video);

    if (video.readyState >= 2) {
      setIsVideoReady(true);
    }

    if (shouldRenderVideo && !pausedByUser) {
      video.play().catch(() => {
        setPausedByUser(true);
      });
    } else {
      video.pause();
    }
  }, [shouldRenderVideo, pausedByUser]);

  const handleLoadedMetadata = React.useCallback(
    (event: React.SyntheticEvent<HTMLVideoElement>) => {
      enforceStrictMute(event.currentTarget);
    },
    []
  );

  const handleVideoReady = React.useCallback(
    (event: React.SyntheticEvent<HTMLVideoElement>) => {
      enforceStrictMute(event.currentTarget);
      setIsVideoReady(true);
    },
    []
  );

  const handleVolumeChange = React.useCallback(
    (event: React.SyntheticEvent<HTMLVideoElement>) => {
      enforceStrictMute(event.currentTarget);
    },
    []
  );

  const handleVideoError = React.useCallback(() => {
    setHasError(true);
    setIsVideoReady(false);
  }, []);

  return {
    videoRef,
    prefersReducedMotion,
    pausedByUser,
    setPausedByUser,
    isVideoReady,
    hasError,
    shouldRenderVideo,
    handleLoadedMetadata,
    handleVideoReady,
    handleVolumeChange,
    handleVideoError,
  };
}

export interface VeoHeroBackgroundProps {
  /** Path to curated ambient Veo 3 lake scene MP4/WebM asset. */
  videoSrc: string;
  alt: string;
  posterUrl?: string;
  showControls?: boolean;
  className?: string;
}

/**
 * Full-bleed devotional background scene for the primary Sanctum landing hero.
 * Strictly muted, seamless loop, responsive object-cover framing without color
 * casts or heavy veils, using only a light neutral gradient scrim behind text
 * so natural water, foliage, and sky tones stay clear—with static fallback for
 * loading, playback failure, or reduced motion.
 */
export function VeoHeroBackground({
  videoSrc,
  alt,
  posterUrl,
  showControls = true,
  className,
}: VeoHeroBackgroundProps) {
  const {
    videoRef,
    prefersReducedMotion,
    pausedByUser,
    setPausedByUser,
    isVideoReady,
    hasError,
    shouldRenderVideo,
    handleLoadedMetadata,
    handleVideoReady,
    handleVolumeChange,
    handleVideoError,
  } = useSanctumVideoState({ videoSrc });

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 overflow-hidden select-none bg-[#0D1117]",
          className
        )}
      >
        {/* Instant 0ms backdrop & permanent static/error/reduced-motion fallback */}
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt={alt}
            className="absolute inset-0 size-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 size-full">
            <YamunaHorizonArt className="size-full opacity-95" />
          </div>
        )}

        {shouldRenderVideo && (
          <video
            ref={videoRef}
            data-veo-motion="video"
            src={videoSrc}
            poster={posterUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            controls={false}
            tabIndex={-1}
            onLoadedMetadata={handleLoadedMetadata}
            onLoadedData={handleVideoReady}
            onCanPlay={handleVideoReady}
            onPlaying={handleVideoReady}
            onVolumeChange={handleVolumeChange}
            onError={handleVideoError}
            className={cn(
              "pointer-events-none absolute inset-0 size-full object-cover object-center motion-reduce:hidden transition-opacity duration-500 ease-out",
              isVideoReady ? "opacity-100" : "opacity-0"
            )}
          />
        )}

        {/* Light neutral dark gradient behind left text only; right scenic lake remains untouched & natural */}
        <div
          data-veo-scrim="neutral"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,16,0.58)_0%,rgba(10,12,16,0.44)_58%,rgba(10,12,16,0.62)_100%)] lg:bg-[linear-gradient(90deg,rgba(10,12,16,0.72)_0%,rgba(10,12,16,0.46)_34%,rgba(10,12,16,0.14)_52%,rgba(10,12,16,0)_64%)]"
        />
      </div>

      {showControls && !prefersReducedMotion && !hasError && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 mx-auto flex max-w-6xl justify-end px-5 sm:bottom-5 sm:px-8">
          <button
            type="button"
            onClick={() => setPausedByUser((prev) => !prev)}
            aria-label={
              pausedByUser ? "Play ambient lake scene" : "Pause ambient lake scene"
            }
            aria-pressed={pausedByUser}
            className="pointer-events-auto inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-white/25 bg-black/55 px-3.5 py-1.5 text-xs font-medium text-ink-on-dark backdrop-blur-sm transition-colors duration-150 hover:border-gold-antique/60 hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-antique"
          >
            {pausedByUser ? (
              <>
                <Play className="size-3.5 text-gold-antique" strokeWidth={1.75} aria-hidden="true" />
                <span>Resume scene</span>
              </>
            ) : (
              <>
                <Pause className="size-3.5 text-gold-antique" strokeWidth={1.75} aria-hidden="true" />
                <span>Pause scene</span>
              </>
            )}
          </button>
        </div>
      )}
    </>
  );
}

export interface VeoMediaFrameProps {
  /** Optional Google Veo 3 MP4/WebM URL; static vector/poster renders when omitted. */
  videoSrc?: string;
  posterUrl?: string;
  alt: string;
  caption?: string;
  className?: string;
}

/**
 * Framed devotional visual container for Google Veo 3 scenes.
 * Respects reduced-motion, lazy-loads when visible, strictly mutes audio,
 * and falls back cleanly to static vector art on load/playback errors.
 */
export function VeoMediaFrame({
  videoSrc,
  posterUrl,
  alt,
  caption,
  className,
}: VeoMediaFrameProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const {
    videoRef,
    prefersReducedMotion,
    pausedByUser,
    setPausedByUser,
    isVideoReady,
    hasError,
    shouldRenderVideo,
    handleLoadedMetadata,
    handleVideoReady,
    handleVolumeChange,
    handleVideoError,
  } = useSanctumVideoState({ videoSrc, lazyTargetRef: containerRef });

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
            data-veo-motion="video"
            src={videoSrc}
            poster={posterUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            controls={false}
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={handleVideoReady}
            onPlaying={handleVideoReady}
            onVolumeChange={handleVolumeChange}
            onError={handleVideoError}
            aria-label={alt}
            className={cn(
              "pointer-events-none absolute inset-0 size-full object-cover motion-reduce:hidden transition-opacity duration-700 ease-out",
              isVideoReady ? "opacity-100" : "opacity-0"
            )}
          />
        )}

        {videoSrc && !prefersReducedMotion && !hasError && (
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
