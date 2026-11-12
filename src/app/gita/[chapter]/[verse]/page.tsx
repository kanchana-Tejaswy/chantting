import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { GitaChapterNavigator } from "@/components/gita/chapter-navigator";
import { GitaVerseReader } from "@/components/gita/gita-verse-reader";
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
import { loadGitaVerseDetail } from "@/lib/gita/queries";
import { chapterNumberSchema, verseNumberSchema } from "@/lib/gita/validation";

export const dynamic = "force-dynamic";

export default async function GitaVerseRoute({
  params,
}: {
  params: Promise<{ chapter: string; verse: string }>;
}) {
  const { chapter: rawChapter, verse: rawVerse } = await params;
  const parsedCh = chapterNumberSchema.safeParse(rawChapter);
  const parsedV = verseNumberSchema.safeParse(rawVerse);
  if (!parsedCh.success || !parsedV.success) {
    notFound();
  }

  const result = await loadGitaVerseDetail(parsedCh.data, parsedV.data);

  if (result.status === "schema_not_ready") {
    return (
      <AppShell pageTitle={`BG ${parsedCh.data}.${parsedV.data}`}>
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="gold" className="w-fit">
                Database Setup Required
              </Badge>
              <CardTitle className="mt-2 font-display text-3xl">
                Supabase migrations have not been applied yet
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-ink-muted">
              {result.detail}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (result.status === "error") {
    return (
      <AppShell pageTitle={`BG ${parsedCh.data}.${parsedV.data}`}>
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Could not load verse</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-kumkum">
              {result.message}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (result.status === "unpublished_or_missing") {
    return (
      <AppShell
        pageTitle={`BG ${parsedCh.data}.${parsedV.data}`}
        userSummary={
          result.viewer
            ? {
                displayName: result.viewer.displayName,
                email: result.viewer.email,
              }
            : null
        }
      >
        <div className="mx-auto max-w-4xl space-y-6 px-5 py-10 sm:px-8">
          <GitaChapterNavigator
            chapterSlots={result.chapterSlots}
            activeChapter={result.chapterNumber}
            compact={true}
          />
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="neutral" className="w-fit">
                Not Published
              </Badge>
              <CardTitle className="mt-2 font-display text-3xl">
                Bhagavad Gītā {result.chapterNumber}.{result.verseNumber} is not
                yet verified and published
              </CardTitle>
              <CardDescription>
                Only human-reviewed, properly attributed Sanskrit, IAST
                transliteration, and licensed translations appear on public verse
                pages. Unpublished drafts and pending reviews remain hidden.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link
                href={`/gita/${result.chapterNumber}`}
                className={buttonStyles({ variant: "secondary", size: "md" })}
              >
                Return to Chapter {result.chapterNumber}
              </Link>
              <Link
                href="/gita"
                className={buttonStyles({ variant: "ghost", size: "md" })}
              >
                All Chapters
              </Link>
            </CardFooter>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      pageTitle={`Bhagavad Gītā ${result.bundle.verse.verse_ref}`}
      userSummary={
        result.viewer
          ? { displayName: result.viewer.displayName, email: result.viewer.email }
          : null
      }
    >
      <GitaVerseReader
        viewer={result.viewer}
        chapter={result.chapter}
        chapterSlots={result.chapterSlots}
        bundle={result.bundle}
        chapterVerseRefs={result.chapterVerseRefs}
        previousVerse={result.previousVerse}
        nextVerse={result.nextVerse}
        initialBookmarked={result.isBookmarked}
        initialRead={result.isRead}
        initialNote={result.personalNote}
        initialCollections={result.collections}
      />
    </AppShell>
  );
}

