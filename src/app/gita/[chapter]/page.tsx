import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { GitaChapterView } from "@/components/gita/gita-chapter-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadGitaChapterPage } from "@/lib/gita/queries";
import { chapterNumberSchema } from "@/lib/gita/validation";

export const dynamic = "force-dynamic";

export default async function GitaChapterRoute({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  const { chapter: rawChapter } = await params;
  const parsedChapter = chapterNumberSchema.safeParse(rawChapter);
  if (!parsedChapter.success) {
    notFound();
  }

  const result = await loadGitaChapterPage(parsedChapter.data);

  if (result.status === "schema_not_ready") {
    return (
      <AppShell pageTitle={`Bhagavad Gītā · Chapter ${parsedChapter.data}`}>
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
      <AppShell pageTitle={`Bhagavad Gītā · Chapter ${parsedChapter.data}`}>
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Could not load chapter</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-kumkum">
              {result.message}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      pageTitle={`Bhagavad Gītā · Chapter ${result.chapterNumber}`}
      userSummary={
        result.viewer
          ? { displayName: result.viewer.displayName, email: result.viewer.email }
          : null
      }
    >
      <GitaChapterView
        viewer={result.viewer}
        chapterNumber={result.chapterNumber}
        chapter={result.chapter}
        chapterSlots={result.chapterSlots}
        readVerseCount={result.readVerseCount}
        verses={result.verses}
      />
    </AppShell>
  );
}

