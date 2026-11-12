import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { LibraryAdminStudio } from "@/components/library/library-admin-studio";
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
import { loadLibraryAdminWorkspace } from "@/lib/library/queries";

export const dynamic = "force-dynamic";

export default async function LibraryAdminRoute() {
  const result = await loadLibraryAdminWorkspace();

  if (result.status === "unauthenticated") {
    redirect("/auth?next=/library/admin");
  }

  if (result.status === "forbidden") {
    return (
      <AppShell
        pageTitle="Library Administration"
        userSummary={{
          displayName: result.viewer.displayName,
          email: result.viewer.email,
        }}
      >
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="kumkum" className="w-fit">
                403 · Administrator Access Required
              </Badge>
              <CardTitle className="mt-2 font-display text-3xl">
                Library Content Studio is Restricted
              </CardTitle>
              <CardDescription>
                Only authorized administrators registered in{" "}
                <code className="text-ink">public.platform_admins</code> may
                create, review, publish, unpublish, or archive library
                resources.
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

  if (result.status === "schema_not_ready") {
    return (
      <AppShell pageTitle="Library Administration">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="gold" className="w-fit">
                Database Setup Required
              </Badge>
              <CardTitle className="mt-2 font-display text-3xl">
                Migrations 0001–0011 must be applied first
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
      <AppShell pageTitle="Library Administration">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Could not load Library Studio</CardTitle>
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
      pageTitle="Library Studio"
      userSummary={{
        displayName: result.viewer.displayName,
        email: result.viewer.email,
      }}
    >
      <LibraryAdminStudio
        viewer={result.viewer}
        resources={result.resources}
        sources={result.sources}
        auditLogs={result.auditLogs}
      />
    </AppShell>
  );
}

