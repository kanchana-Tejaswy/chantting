import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { LibraryDetailView } from "@/components/library/library-detail-view";
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
import { loadLibraryDetail } from "@/lib/library/queries";

export const dynamic = "force-dynamic";

export default async function LibraryDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await loadLibraryDetail(slug);

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
              <CardTitle>Could not load resource</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-kumkum">
              {result.message}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (result.status === "not_found_or_unpublished") {
    return (
      <AppShell
        pageTitle="Resource Unavailable"
        userSummary={
          result.viewer
            ? {
                displayName: result.viewer.displayName,
                email: result.viewer.email,
              }
            : null
        }
      >
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="neutral" className="w-fit">
                Unavailable
              </Badge>
              <CardTitle className="mt-2 font-display text-3xl">
                Resource not found or awaiting review
              </CardTitle>
              <CardDescription>
                This library entry does not exist, has been archived, or is still
                awaiting human verification before publication.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link
                href="/library"
                className={buttonStyles({ variant: "primary", size: "md" })}
              >
                Return to Spiritual Library
              </Link>
            </CardFooter>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      pageTitle={result.resource.title}
      userSummary={
        result.viewer
          ? { displayName: result.viewer.displayName, email: result.viewer.email }
          : null
      }
    >
      <LibraryDetailView
        viewer={result.viewer}
        resource={result.resource}
        relatedResources={result.relatedResources}
        initialBookmarked={result.isBookmarked}
        lastViewedAt={result.lastViewedAt}
      />
    </AppShell>
  );
}

