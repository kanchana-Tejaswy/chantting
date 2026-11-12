import { cn } from "@/lib/cn";
import { YamunaHorizonArt } from "@/components/sacred/ornaments";

export interface ResourceCoverImageProps {
  posterUrl?: string | null;
  alt: string;
  className?: string;
}

/**
 * Displays a verified cover image with strict no-referrer privacy policy and
 * graceful static Vrindavan vector fallback when no thumbnail URL is present.
 */
export function ResourceCoverImage({
  posterUrl,
  alt,
  className,
}: ResourceCoverImageProps) {
  return (
    <div
      className={cn(
        "relative aspect-[16/9] w-full overflow-hidden rounded-[12px] border border-sandalwood-border bg-krishna-midnight",
        className
      )}
    >
      {posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
      ) : (
        <div role="img" aria-label={alt} className="size-full">
          <YamunaHorizonArt className="size-full object-cover" />
        </div>
      )}
    </div>
  );
}

