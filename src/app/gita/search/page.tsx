import { AppShell } from "@/components/layout/app-shell";
import { GitaSearchView } from "@/components/gita/gita-search-view";
import { createClient } from "@/lib/supabase/server";
import { getGitaViewerContext, searchGitaContent } from "@/lib/gita/queries";
import { gitaSearchQuerySchema } from "@/lib/gita/validation";

export const dynamic = "force-dynamic";

export default async function GitaSearchRoute({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; chapter?: string; verse?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const viewer = await getGitaViewerContext(supabase);

  const hasInputs = Boolean(
    (sp.q && sp.q.trim().length > 0) || sp.chapter || sp.verse
  );

  const parsed = gitaSearchQuerySchema.safeParse({
    q: sp.q ?? "",
    chapter: sp.chapter ?? undefined,
    verse: sp.verse ?? undefined,
  });

  if (!parsed.success) {
    const fallback = await searchGitaContent({});
    return (
      <AppShell
        pageTitle="Search Bhagavad Gītā"
        userSummary={
          viewer
            ? { displayName: viewer.displayName, email: viewer.email }
            : null
        }
      >
        <GitaSearchView
          query={sp.q ?? ""}
          chapters={fallback.chapters}
          results={[]}
          validationError={
            parsed.error.issues[0]?.message ?? "Invalid search parameters."
          }
          searched={hasInputs}
        />
      </AppShell>
    );
  }

  const outcome = hasInputs
    ? await searchGitaContent(parsed.data)
    : await searchGitaContent({});

  return (
    <AppShell
      pageTitle="Search Bhagavad Gītā"
      userSummary={
        viewer ? { displayName: viewer.displayName, email: viewer.email } : null
      }
    >
      <GitaSearchView
        query={parsed.data.q}
        selectedChapter={parsed.data.chapter}
        chapters={outcome.chapters}
        results={hasInputs ? outcome.results : []}
        validationError={
          outcome.status === "error" ? outcome.detail ?? "Search failed." : null
        }
        searched={hasInputs}
      />
    </AppShell>
  );
}

