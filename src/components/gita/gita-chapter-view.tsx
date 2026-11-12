import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import type {
  GitaChapter,
  GitaChapterSlot,
  GitaTranslation,
  GitaVerse,
} from "@/lib/gita/domain";
import type { GitaViewerContext } from "@/lib/gita/queries";
import { GitaChapterNavigator } from "./chapter-navigator";

export interface GitaChapterViewProps {
  viewer: GitaViewerContext | null;
  chapterNumber: number;
  chapter: GitaChapter | null;
  chapterSlots: GitaChapterSlot[];
  readVerseCount: number;
  verses: Array<{
    verse: GitaVerse;
    primaryTranslation: GitaTranslation | null;
    isBookmarked: boolean;
    isRead: boolean;
    hasNote: boolean;
  }>;
}

export function GitaChapterView({
  viewer,
  chapterNumber,
  chapter,
  chapterSlots,
  readVerseCount,
  verses,
}: GitaChapterViewProps) {
  const prevChapter = chapterNumber > 1 ? chapterNumber - 1 : null;
  const nextChapter = chapterNumber < 18 ? chapterNumber + 1 : null;
  const targetDenominator = Math.max(
    chapter?.verse_count ?? 0,
    verses.length,
    1
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      <GitaChapterNavigator
        chapterSlots={chapterSlots}
        activeChapter={chapterNumber}
        compact={true}
      />

      {/* Chapter Overview Card */}
      <Card surface="parchment">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="gold">Chapter {chapterNumber} of 18</Badge>
            <div className="flex items-center gap-2">
              {prevChapter && (
                <Link
                  href={`/gita/${prevChapter}`}
                  className={buttonStyles({ variant: "ghost", size: "sm" })}
                >
                  <ArrowLeft className="size-4" aria-hidden={true} />
                  <span>Ch. {prevChapter}</span>
                </Link>
              )}
              {nextChapter && (
                <Link
                  href={`/gita/${nextChapter}`}
                  className={buttonStyles({ variant: "ghost", size: "sm" })}
                >
                  <span>Ch. {nextChapter}</span>
                  <ArrowRight className="size-4" aria-hidden={true} />
                </Link>
              )}
            </div>
          </div>

          {chapter ? (
            <div className="mt-3 space-y-2">
              <p lang="sa" className="font-devanagari text-2xl text-peacock-ink">
                {chapter.sanskrit_title}
              </p>
              <CardTitle className="font-display text-3xl sm:text-4xl">
                {chapter.english_title}
              </CardTitle>
              <p className="text-sm italic text-ink-muted">
                {chapter.transliteration_title}
              </p>
              <CardDescription className="pt-1 text-base text-ink opacity-90">
                {chapter.summary}
              </CardDescription>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <CardTitle className="font-display text-3xl">
                Bhagavad Gītā — Chapter {chapterNumber}
              </CardTitle>
              <CardDescription>
                Verified chapter metadata has not yet been ingested for Chapter{" "}
                {chapterNumber}. No unverified titles, summaries, or verse counts
                are invented.
              </CardDescription>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {chapter && chapter.theme_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chapter.theme_tags.map((tag) => (
                <Badge key={tag} variant="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {verses.length > 0 && (
            <div className="space-y-3 border-t border-sandalwood-border pt-4">
              {viewer && (
                <ProgressBar
                  value={readVerseCount}
                  max={targetDenominator}
                  label={`Chapter progress: ${readVerseCount} of ${verses.length} published verses read${
                    chapter ? ` (${chapter.verse_count} chapter verses)` : ""
                  }`}
                  tone="peacock"
                />
              )}

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-muted">
                  Published Verse Jump Index
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {verses.map(({ verse, isRead }) => (
                    <Link
                      key={verse.id}
                      href={`/gita/${verse.chapter_number}/${verse.verse_number}`}
                      className={`inline-flex min-h-9 min-w-12 items-center justify-center rounded-[8px] border px-2.5 text-xs font-medium tabular-nums transition-colors ${
                        isRead
                          ? "border-peacock-green/40 bg-tulsi-wash text-peacock-ink"
                          : "border-sandalwood-border bg-ivory text-ink hover:bg-linen"
                      }`}
                    >
                      {verse.verse_ref}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verse List or Empty State */}
      {verses.length === 0 ? (
        <Card surface="linen">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              No Verified Verses Published Yet
            </CardTitle>
            <CardDescription>
              Verses for Chapter {chapterNumber} will appear here once verified
              Devanāgarī Sanskrit, IAST transliteration, and attributed licensed
              translations are reviewed and approved by an authorized scripture
              administrator.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link
              href="/gita"
              className={buttonStyles({ variant: "secondary", size: "md" })}
            >
              Return to all 18 chapters
            </Link>
            {viewer?.isAdmin && (
              <Link
                href="/gita/admin"
                className={buttonStyles({ variant: "gold", size: "md" })}
              >
                <ShieldCheck className="size-4" aria-hidden={true} />
                <span>Manage Chapter Content</span>
              </Link>
            )}
          </CardFooter>
        </Card>
      ) : (
        <section aria-label={`Chapter ${chapterNumber} verses`} className="space-y-4">
          {verses.map(({ verse, primaryTranslation, isBookmarked, isRead, hasNote }) => (
            <Card
              key={verse.id}
              surface="parchment"
              className="transition-shadow duration-150 hover:shadow-sacred-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/gita/${verse.chapter_number}/${verse.verse_number}`}
                  className="inline-flex items-center gap-2 font-display text-xl font-semibold text-peacock-deep hover:underline tabular-nums"
                >
                  <span>Verse {verse.verse_ref}</span>
                </Link>
                <div className="flex flex-wrap items-center gap-1.5">
                  {isRead && (
                    <Badge variant="peacock">
                      <CheckCircle2 className="size-3" aria-hidden={true} />
                      <span>Read</span>
                    </Badge>
                  )}
                  {isBookmarked && (
                    <Badge variant="gold">
                      <Bookmark className="size-3" aria-hidden={true} />
                      <span>Bookmarked</span>
                    </Badge>
                  )}
                  {hasNote && (
                    <Badge variant="neutral">
                      <FileText className="size-3" aria-hidden={true} />
                      <span>Note</span>
                    </Badge>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-3">
                <p
                  lang="sa"
                  className="font-devanagari text-lg leading-[1.85] whitespace-pre-line text-ink"
                >
                  {verse.sanskrit_devanagari}
                </p>
                <p className="font-serif text-sm italic leading-relaxed whitespace-pre-line text-ink-muted">
                  {verse.transliteration_iast}
                </p>
                {primaryTranslation ? (
                  <div className="rounded-[12px] border border-sandalwood-border bg-linen/70 p-3.5">
                    <p className="text-sm leading-relaxed text-ink">
                      {primaryTranslation.translation_text}
                    </p>
                    {primaryTranslation.source && (
                      <p className="mt-1.5 text-xs text-ink-muted">
                        Translator:{" "}
                        <span className="font-medium text-ink">
                          {primaryTranslation.source.author_or_translator}
                        </span>{" "}
                        · {primaryTranslation.source.license_name}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs italic text-ink-muted">
                    No approved translation published yet for this verse.
                  </p>
                )}
              </div>

              <div className="mt-4">
                <Link
                  href={`/gita/${verse.chapter_number}/${verse.verse_number}`}
                  className={buttonStyles({ variant: "secondary", size: "sm" })}
                >
                  Read full verse, attribution &amp; study notes
                </Link>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

