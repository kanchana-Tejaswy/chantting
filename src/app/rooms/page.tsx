import { AppShell } from "@/components/layout/app-shell";
import { RoomsDirectory } from "@/components/rooms/rooms-directory";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadRoomsDirectory } from "@/lib/rooms/queries";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const result = await loadRoomsDirectory();

  if (result.status === "schema_not_ready") {
    return (
      <AppShell pageTitle="Satsang">
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
      <AppShell pageTitle="Satsang">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Could not load chanting rooms</CardTitle>
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
      pageTitle="Satsang"
      userSummary={
        result.user
          ? { displayName: result.user.displayName, email: result.user.email }
          : null
      }
    >
      <RoomsDirectory
        user={result.user}
        myRooms={result.myRooms}
        publicRooms={result.publicRooms}
      />
    </AppShell>
  );
}
