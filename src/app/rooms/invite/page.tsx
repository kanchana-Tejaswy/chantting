import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { InviteRedeemCard } from "@/components/rooms/invite-redeem-card";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function RoomInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const nextUrl = token
      ? `/rooms/invite?token=${encodeURIComponent(token)}`
      : "/rooms";
    redirect(`/auth?next=${encodeURIComponent(nextUrl)}`);
  }

  if (token.length < 16) {
    return (
      <AppShell
        pageTitle="Room Invitation"
        userSummary={{ displayName: user.email ?? "Devotee", email: user.email }}
      >
        <div className="mx-auto max-w-md px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Invalid invitation link</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-ink-muted">
              This invitation link is incomplete. Ask a room administrator for a
              valid invite link or code.
            </CardContent>
            <CardFooter>
              <Link
                href="/rooms"
                className={buttonStyles({ variant: "primary", size: "md" })}
              >
                Go to Chanting Rooms
              </Link>
            </CardFooter>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      pageTitle="Room Invitation"
      userSummary={{ displayName: user.email ?? "Devotee", email: user.email }}
    >
      <InviteRedeemCard token={token} />
    </AppShell>
  );
}

