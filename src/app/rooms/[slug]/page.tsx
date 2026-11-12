import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { RoomDetailView } from "@/components/rooms/room-detail-view";
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
import { loadRoomDetail } from "@/lib/rooms/queries";

export const dynamic = "force-dynamic";

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await loadRoomDetail(slug);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "schema_not_ready") {
    return (
      <AppShell pageTitle="Chanting Room">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Database migrations pending</CardTitle>
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
      <AppShell pageTitle="Chanting Room">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Unable to load room</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-kumkum">
              {result.message}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (result.status === "public_preview") {
    return (
      <AppShell
        pageTitle={result.room.name}
        userSummary={
          result.user
            ? { displayName: result.user.displayName, email: result.user.email }
            : null
        }
      >
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="peacock" className="w-fit">
                Public Community Room
              </Badge>
              <CardTitle className="mt-2 font-display text-3xl">
                {result.room.name}
              </CardTitle>
              {result.room.description && (
                <CardDescription className="text-base text-ink-muted opacity-100">
                  {result.room.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="text-sm text-ink-muted">
              Join this public room from the rooms directory to participate in
              shared goals and view consented updates.
            </CardContent>
            <CardFooter>
              {result.user ? (
                <Link
                  href="/rooms"
                  className={buttonStyles({ variant: "primary", size: "md" })}
                >
                  Back to Rooms to Join
                </Link>
              ) : (
                <Link
                  href={`/auth?next=/rooms/${result.room.slug}`}
                  className={buttonStyles({ variant: "primary", size: "md" })}
                >
                  Sign in to Join
                </Link>
              )}
            </CardFooter>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      pageTitle={result.room.name}
      userSummary={{
        displayName: result.user.displayName,
        email: result.user.email,
      }}
    >
      <RoomDetailView
        currentUserId={result.user.id}
        room={result.room}
        currentMembership={result.currentMembership}
        members={result.members}
        goals={result.goals}
        announcements={result.announcements}
        invitations={result.invitations}
        auditLogs={result.auditLogs}
        progressSummary={result.progressSummary}
      />
    </AppShell>
  );
}

