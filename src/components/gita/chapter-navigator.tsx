import Link from "next/link";
import { cn } from "@/lib/cn";
import type { GitaChapterSlot } from "@/lib/gita/domain";

export interface GitaChapterNavigatorProps {
  chapterSlots: GitaChapterSlot[];
  activeChapter?: number;
  compact?: boolean;
}

export function GitaChapterNavigator({
  chapterSlots,
  activeChapter,
  compact = false,
}: GitaChapterNavigatorProps) {
  return (
    <nav aria-label="Bhagavad Gita 18 chapters navigation" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wider uppercase text-ink-muted">
          18 Chapters (Adhyāyas)
        </p>
        <Link
          href="/gita"
          className="text-xs font-medium text-peacock-ink hover:underline"
        >
          All chapters
        </Link>
      </div>
      <div
        className={cn(
          "grid gap-1.5",
          compact
            ? "grid-cols-6 sm:grid-cols-9 lg:grid-cols-18"
            : "grid-cols-3 sm:grid-cols-6 lg:grid-cols-9"
        )}
      >
        {chapterSlots.map((slot) => {
          const isCurrent = activeChapter === slot.chapterNumber;
          const hasPublished = slot.publishedVerseCount > 0;
          return (
            <Link
              key={slot.chapterNumber}
              href={`/gita/${slot.chapterNumber}`}
              aria-current={isCurrent ? "page" : undefined}
              title={
                slot.chapter
                  ? `Chapter ${slot.chapterNumber}: ${slot.chapter.english_title}`
                  : `Chapter ${slot.chapterNumber}`
              }
              className={cn(
                "flex min-h-11 flex-col items-center justify-center rounded-[10px] border px-2 py-1.5 text-center transition-colors duration-150",
                isCurrent
                  ? "border-gold-antique bg-krishna-midnight text-ink-on-dark"
                  : hasPublished
                    ? "border-sandalwood-border bg-paper text-ink hover:bg-linen"
                    : "border-sandalwood-border/70 bg-ivory text-ink-muted hover:bg-linen"
              )}
            >
              <span className="text-xs font-semibold tabular-nums">
                {slot.chapterNumber}
              </span>
              {!compact && (
                <span className="mt-0.5 max-w-full truncate text-[10px] opacity-80 tabular-nums">
                  {hasPublished ? `${slot.publishedVerseCount}v` : "—"}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

