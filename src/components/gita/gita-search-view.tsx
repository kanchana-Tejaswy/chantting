import Link from "next/link";
import { ArrowLeft, BookOpen, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField, Input, Select } from "@/components/ui/input";
import type { GitaChapter, GitaSearchResultItem } from "@/lib/gita/domain";

export interface GitaSearchViewProps {
  query: string;
  selectedChapter?: number;
  chapters: GitaChapter[];
  results: GitaSearchResultItem[];
  validationError?: string | null;
  searched: boolean;
}

export function GitaSearchView({
  query,
  selectedChapter,
  chapters,
  results,
  validationError,
  searched,
}: GitaSearchViewProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wider uppercase text-gold-ink">
            Bhagavad Gītā · Verified Text Search
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">
            Search Scripture
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Search strictly across approved Sanskrit verses, IAST transliteration,
            verified verse references (such as <code className="text-ink">2.47</code>),
            and published translations.
          </p>
        </div>

        <Link
          href="/gita"
          className={buttonStyles({ variant: "secondary", size: "sm" })}
        >
          <ArrowLeft className="size-4" aria-hidden={true} />
          <span>Back to Chapters</span>
        </Link>
      </div>

      <Card surface="parchment">
        <CardContent className="mt-0">
          <form
            action="/gita/search"
            method="GET"
            className="grid gap-4 sm:grid-cols-4 sm:items-end"
          >
            <FormField
              id="gita-search-input"
              label="Reference, Sanskrit, IAST, or Translation Keywords"
              className="sm:col-span-2"
            >
              <Input
                id="gita-search-input"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="e.g. 2.47, Chapter 6, karma, yoga..."
              />
            </FormField>

            <FormField id="gita-search-chapter" label="Filter Chapter">
              <Select
                id="gita-search-chapter"
                name="chapter"
                defaultValue={selectedChapter ? String(selectedChapter) : ""}
              >
                <option value="">All 18 chapters</option>
                {Array.from({ length: 18 }, (_, i) => i + 1).map((n) => {
                  const ch = chapters.find((c) => c.chapter_number === n);
                  return (
                    <option key={n} value={n}>
                      Ch. {n}
                      {ch ? ` — ${ch.english_title}` : ""}
                    </option>
                  );
                })}
              </Select>
            </FormField>

            <button
              type="submit"
              className={buttonStyles({
                variant: "primary",
                size: "md",
                className: "w-full",
              })}
            >
              <Search className="size-4" aria-hidden={true} />
              <span>Search</span>
            </button>
          </form>

          {validationError && (
            <p role="alert" className="mt-3 text-sm font-medium text-kumkum">
              {validationError}
            </p>
          )}
        </CardContent>
      </Card>

      {searched && !validationError && (
        <section aria-label="Search results" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink">
              {results.length}{" "}
              {results.length === 1 ? "verified verse" : "verified verses"} found
            </p>
          </div>

          {results.length === 0 ? (
            <Card surface="linen">
              <CardHeader>
                <CardTitle className="font-display text-2xl">
                  No Published Verses Matched
                </CardTitle>
                <CardDescription>
                  No approved verses matched your query. Draft or pending-review
                  items remain hidden until reviewed and published by an
                  administrator.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            results.map((item) => (
              <Card key={item.verse.id} surface="parchment">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/gita/${item.verse.chapter_number}/${item.verse.verse_number}`}
                    className="font-display text-xl font-semibold text-peacock-deep hover:underline tabular-nums"
                  >
                    BG {item.verse.verse_ref}
                    {item.chapterTitle ? ` · ${item.chapterTitle}` : ""}
                  </Link>
                  <div className="flex flex-wrap gap-1.5">
                    {item.matchedIn.map((m) => (
                      <Badge key={m} variant="peacock">
                        Matched {m}
                      </Badge>
                    ))}
                  </div>
                </div>

                <p
                  lang="sa"
                  className="mt-3 font-devanagari text-lg leading-[1.85] whitespace-pre-line text-ink"
                >
                  {item.verse.sanskrit_devanagari}
                </p>
                <p className="mt-1.5 font-serif text-sm italic whitespace-pre-line text-ink-muted">
                  {item.verse.transliteration_iast}
                </p>

                {item.primaryTranslation && (
                  <div className="mt-3 rounded-[10px] border border-sandalwood-border bg-linen/70 p-3 text-sm text-ink">
                    <p>{item.primaryTranslation.translation_text}</p>
                    {item.primaryTranslation.source && (
                      <p className="mt-1 text-xs text-ink-muted">
                        —{" "}
                        {item.primaryTranslation.source.author_or_translator} (
                        {item.primaryTranslation.source.license_name})
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-4">
                  <Link
                    href={`/gita/${item.verse.chapter_number}/${item.verse.verse_number}`}
                    className={buttonStyles({ variant: "secondary", size: "sm" })}
                  >
                    <BookOpen className="size-3.5" aria-hidden={true} />
                    <span>Open Verse</span>
                  </Link>
                </div>
              </Card>
            ))
          )}
        </section>
      )}
    </div>
  );
}

