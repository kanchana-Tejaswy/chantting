import { AppShell } from "@/components/layout/app-shell";
import { LibraryDirectoryView } from "@/components/library/library-directory-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadLibraryDirectory } from "@/lib/library/queries";
import { librarySearchQuerySchema } from "@/lib/library/validation";

export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    type?: string;
    tag?: string;
    saved?: string;
  }>;
}) {
  const sp = await searchParams;
  const parsed = librarySearchQuerySchema.safeParse({
    q: sp.q ?? "",
    category: sp.category ?? undefined,
    type: sp.type ?? undefined,
    tag: sp.tag ?? undefined,
    saved: sp.saved ?? undefined,
  });

  const filters = parsed.success
    ? {
        q: parsed.data.q,
        category: parsed.data.category,
        type: parsed.data.type,
        tag: parsed.data.tag,
        savedOnly: parsed.data.saved ?? false,
      }
    : { q: "", savedOnly: false };

  const result = await loadLibraryDirectory(filters);

  if (result.status === "schema_not_ready") {
    return (
      <AppShell pageTitle="Spiritual Library">
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
      <AppShell pageTitle="Spiritual Library">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Could not load Spiritual Library</CardTitle>
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
      pageTitle="Spiritual Library"
      userSummary={
        result.viewer
          ? { displayName: result.viewer.displayName, email: result.viewer.email }
          : null
      }
    >
      <LibraryDirectoryView
        viewer={result.viewer}
        allResources={result.allResources}
        filteredResources={result.filteredResources}
        bookmarkedIds={result.bookmarkedIds}
        recentlyViewed={result.recentlyViewed}
        categoryCounts={result.categoryCounts}
        availableTags={result.availableTags}
        activeFilters={{
          q: filters.q,
          category: filters.category,
          type: filters.type,
          tag: filters.tag,
          savedOnly: filters.savedOnly,
        }}
      />
    </AppShell>
  );
}

