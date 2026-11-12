import Link from "next/link";
import {
  BookMarked,
  BookOpen,
  Compass,
  Library,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ManuscriptDivider } from "@/components/sacred/ornaments";
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
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress";
import type { GitaChapterSlot, GitaDailyWisdom } from "@/lib/gita/domain";
import type { GitaViewerContext } from "@/lib/gita/queries";

export interface GitaOverviewViewProps {
  viewer: GitaViewerContext | null;
  chapterSlots: GitaChapterSlot[];
  totalPublishedVerses: number;
  totalReadVerses: number;
  overallProgressPct: number;
  bookmarkCount: number;
  dailyWisdom: GitaDailyWisdom | null;
}

export function GitaOverviewView({
  viewer,
  chapterSlots,
  totalPublishedVerses,
  totalReadVerses,
  overallProgressPct,
  bookmarkCount,
  dailyWisdom,
}: GitaOverviewViewProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      {/* Header & Top Actions */}
      <header className="flex flex-col gap-4 border-b border-sandalwood-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium tracking-wider uppercase text-gold-ink">
            Śrīmad Bhagavad Gītā · Knowledge Centre
          </p>
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            Scriptural Reading &amp; Contemplation
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
            Verified Devanāgarī verses, IAST transliteration, licensed translations
            with translator attribution, and human-reviewed commentary kept cleanly
            separated from original scripture.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/gita/search"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            <Search className="size-4" strokeWidth={1.75} aria-hidden={true} />
            <span>Search Scripture</span>
          </Link>
          <Link
            href="/gita/study"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            <BookMarked
              className="size-4"
              strokeWidth={1.75}
              aria-hidden={true}
            />
            <span>
              Study Vault
              {viewer && bookmarkCount > 0 ? ` (${bookmarkCount})` : ""}
            </span>
          </Link>
          {viewer?.isAdmin && (
            <Link
              href="/gita/admin"
              className={buttonStyles({ variant: "gold", size: "md" })}
            >
              <ShieldCheck
                className="size-4"
                strokeWidth={1.75}
                aria-hidden={true}
              />
              <span>Content Studio</span>
            </Link>
          )}
        </div>
      </header>

      {/* Quick Search / Verse Jump Bar */}
      <Card surface="linen" className="p-4 sm:p-5">
        <form
          action="/gita/search"
          method="GET"
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="flex-1">
            <label htmlFor="gita-quick-search" className="sr-only">
              Search by verse reference (e.g., 2.47), chapter, Sanskrit, or translation
            </label>
            <Input
              id="gita-quick-search"
              name="q"
              type="search"
              placeholder="Jump to verse (e.g. 2.47, Chapter 6) or search verified text..."
            />
          </div>
          <button
            type="submit"
            className={buttonStyles({ variant: "primary", size: "md" })}
          >
            <Search className="size-4" strokeWidth={1.75} aria-hidden={true} />
            <span>Find Verse</span>
          </button>
        </form>
      </Card>

      {/* Daily Wisdom Card & Personal Progress Summary */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card surface="sanctum" className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="sanctum">
                <Sparkles
                  className="size-3.5 text-gold-antique"
                  aria-hidden={true}
                />
                <span>Daily Wisdom</span>
              </Badge>
              {dailyWisdom && (
                <span className="text-xs text-ink-muted-dark tabular-nums">
                  {dailyWisdom.date} · BG {dailyWisdom.verse.verse_ref}
                </span>
              )}
            </div>
            <CardTitle className="mt-2 font-display text-2xl text-ink-on-dark">
              {dailyWisdom
                ? `Bhagavad Gītā ${dailyWisdom.verse.verse_ref}${
                    dailyWisdom.chapterTitle
                      ? ` — ${dailyWisdom.chapterTitle}`
                      : ""
                  }`
                : "Daily Verse Reflection"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {dailyWisdom ? (
              <div className="space-y-4">
                <p
                  lang="sa"
                  className="font-devanagari text-xl leading-[1.85] whitespace-pre-line text-ink-on-dark sm:text-2xl"
                >
                  {dailyWisdom.verse.sanskrit_devanagari}
                </p>
                <p className="font-serif text-sm italic leading-relaxed whitespace-pre-line text-ink-muted-dark">
                  {dailyWisdom.verse.transliteration_iast}
                </p>
                <div className="rounded-[12px] border border-gold-antique/25 bg-krishna-elevated/80 p-4">
                  <p className="text-sm leading-relaxed text-ink-on-dark">
                    {dailyWisdom.primaryTranslation.translation_text}
                  </p>
                  {dailyWisdom.primaryTranslation.source && (
                    <p className="mt-2 text-xs text-ink-muted-dark">
                      Translation:{" "}
                      <span className="font-medium text-ink-on-dark">
                        {
                          dailyWisdom.primaryTranslation.source
                            .author_or_translator
                        }
                      </span>{" "}
                      ({dailyWisdom.primaryTranslation.source.license_name})
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-[12px] border border-gold-antique/20 bg-krishna-elevated/60 p-4 text-sm leading-relaxed text-ink-muted-dark">
                <p>
                  Daily Wisdom is drawn strictly from verified, human-reviewed
                  verses and licensed translations. No approved verses have been
                  ingested into this environment yet—no placeholder or synthetic
                  verses are shown.
                </p>
              </div>
            )}
          </CardContent>

          {dailyWisdom && (
            <CardFooter className="border-gold-antique/20">
              <Link
                href={`/gita/${dailyWisdom.verse.chapter_number}/${dailyWisdom.verse.verse_number}`}
                className={buttonStyles({ variant: "gold", size: "md" })}
              >
                <BookOpen
                  className="size-4"
                  strokeWidth={1.75}
                  aria-hidden={true}
                />
                <span>Read full verse &amp; commentary</span>
              </Link>
            </CardFooter>
          )}
        </Card>

        <Card surface="parchment">
          <CardHeader>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-muted">
              <Library className="size-4 text-peacock-green" aria-hidden={true} />
              <span>Reading Progress</span>
            </div>
            <CardTitle className="mt-1 font-display text-2xl">
              Personal Study Overview
            </CardTitle>
            <CardDescription>
              Bookmarks, private study notes, and chapter completion remain strictly
              private to your account.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <ProgressBar
              value={totalReadVerses}
              max={Math.max(totalPublishedVerses, 1)}
              label={
                viewer
                  ? `${totalReadVerses} of ${totalPublishedVerses} published verses read`
                  : `${totalPublishedVerses} verified verses published`
              }
              tone="peacock"
            />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-[12px] border border-sandalwood-border bg-linen p-3">
                <p className="text-xs text-ink-muted">Published</p>
                <p className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">
                  {totalPublishedVerses}
                </p>
              </div>
              <div className="rounded-[12px] border border-sandalwood-border bg-linen p-3">
                <p className="text-xs text-ink-muted">
                  {viewer ? "Completion" : "Chapters"}
                </p>
                <p className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">
                  {viewer ? `${overallProgressPct}%` : "18"}
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter>
            {viewer ? (
              <Link
                href="/gita/study"
                className={buttonStyles({ variant: "secondary", size: "md" })}
              >
                Open Study Vault
              </Link>
            ) : (
              <Link
                href="/auth?next=/gita/study"
                className={buttonStyles({ variant: "secondary", size: "md" })}
              >
                Sign in for Study Vault
              </Link>
            )}
          </CardFooter>
        </Card>
      </div>

      <ManuscriptDivider />

      {/* 18-Chapter Grid */}
      <section aria-labelledby="chapters-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="chapters-heading"
              className="font-display text-2xl font-semibold text-ink sm:text-3xl"
            >
              18 Chapters of the Bhagavad Gītā
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Select any chapter to read its overview and verified verse index.
            </p>
          </div>
          <Badge variant="neutral">
            <Compass className="size-3.5" aria-hidden={true} />
            <span>18 Adhyāyas</span>
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chapterSlots.map((slot) => (
            <Card
              key={slot.chapterNumber}
              surface={slot.isPopulated ? "parchment" : "linen"}
              className="flex flex-col justify-between transition-shadow duration-150 hover:shadow-sacred-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex rounded-full border border-sandalwood-border bg-ivory px-2.5 py-0.5 text-xs font-medium text-ink tabular-nums">
                    Chapter {slot.chapterNumber}
                  </span>
                  <Badge
                    variant={
                      slot.publishedVerseCount > 0 ? "peacock" : "neutral"
                    }
                  >
                    {slot.publishedVerseCount > 0
                      ? `${slot.publishedVerseCount} published`
                      : "Awaiting ingestion"}
                  </Badge>
                </div>

                {slot.chapter ? (
                  <div className="mt-3 space-y-1.5">
                    <p
                      lang="sa"
                      className="font-devanagari text-lg text-peacock-ink"
                    >
                      {slot.chapter.sanskrit_title}
                    </p>
                    <h3 className="font-serif text-lg font-semibold text-ink">
                      {slot.chapter.english_title}
                    </h3>
                    <p className="text-xs italic text-ink-muted">
                      {slot.chapter.transliteration_title}
                    </p>
                    <p className="line-clamp-3 pt-1 text-sm leading-relaxed text-ink-muted">
                      {slot.chapter.summary}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-1.5">
                    <h3 className="font-serif text-lg font-semibold text-ink">
                      Adhyāya {slot.chapterNumber}
                    </h3>
                    <p className="text-sm leading-relaxed text-ink-muted">
                      Verified chapter metadata and approved verses have not yet
                      been published by an administrator.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-3 border-t border-sandalwood-border/70 pt-3">
                {viewer && slot.publishedVerseCount > 0 && (
                  <ProgressBar
                    value={slot.readVerseCount}
                    max={Math.max(
                      slot.chapter?.verse_count ?? 0,
                      slot.publishedVerseCount,
                      1
                    )}
                    label={`${slot.readVerseCount} verses read`}
                    showValueLabel={false}
                    tone="peacock"
                  />
                )}
                <Link
                  href={`/gita/${slot.chapterNumber}`}
                  className={buttonStyles({
                    variant: slot.isPopulated ? "primary" : "secondary",
                    size: "sm",
                    className: "w-full",
                  })}
                >
                  <span>
                    {slot.publishedVerseCount > 0
                      ? `Open Chapter ${slot.chapterNumber}`
                      : `Inspect Chapter ${slot.chapterNumber}`}
                  </span>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

