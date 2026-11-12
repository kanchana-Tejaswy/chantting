import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { RoomsDirectory } from "@/components/rooms/rooms-directory";
import { RoomDetailView } from "@/components/rooms/room-detail-view";
import { InviteRedeemCard } from "@/components/rooms/invite-redeem-card";
import { computeRoomProgressSummary } from "@/lib/rooms/analytics";

describe("Phase 7 Chanting Rooms UI rendering", () => {
  it("renders RoomsDirectory for signed-in users with joined rooms, invite input, and public directory", () => {
    const html = renderToStaticMarkup(
      <RoomsDirectory
        user={{ id: "u1", email: "radha@example.org", displayName: "Radha" }}
        myRooms={[
          {
            id: "r1",
            slug: "vrindavan-dawn",
            name: "Vrindavan Dawn",
            description: "Quiet morning Japa circle",
            visibility: "private",
            owner_id: "u1",
            default_daily_goal: 16,
            is_archived: false,
            created_at: "2026-11-01T00:00:00Z",
            membershipRole: "owner",
            shareProgressMode: "completion_only",
          },
        ]}
        publicRooms={[
          {
            id: "r2",
            slug: "open-japa",
            name: "Open Japa Circle",
            description: "Public daily commitment circle",
            visibility: "public",
            owner_id: "u2",
            default_daily_goal: 8,
            is_archived: false,
            created_at: "2026-11-02T00:00:00Z",
          },
        ]}
      />
    );

    expect(html).toContain("Vrindavan Dawn");
    expect(html).toContain("Open Japa Circle");
    expect(html).toContain("Join with an invitation link or code");
    expect(html).toContain("Create room");
  });

  it("renders RoomDetailView with heatmap, privacy controls, goals, announcements, and admin panels", () => {
    const members = [
      {
        id: "m1",
        room_id: "r1",
        user_id: "u1",
        role: "owner" as const,
        share_progress_mode: "completion_only" as const,
        share_streak: false,
        joined_at: "2026-11-01T00:00:00Z",
        display_name: "Radha",
        avatar_url: null,
      },
    ];
    const summary = computeRoomProgressSummary({
      todayDate: "2026-11-11",
      members,
      activities: [],
    });

    const html = renderToStaticMarkup(
      <RoomDetailView
        currentUserId="u1"
        room={{
          id: "r1",
          slug: "vrindavan-dawn",
          name: "Vrindavan Dawn",
          description: "Morning practice",
          visibility: "private",
          owner_id: "u1",
          default_daily_goal: 16,
          is_archived: false,
          created_at: "2026-11-01T00:00:00Z",
        }}
        currentMembership={members[0]!}
        members={members}
        goals={[
          {
            id: "g1",
            room_id: "r1",
            created_by: "u1",
            title: "Ekadashi 25 Rounds",
            description: "Optional extra rounds",
            target_rounds: 25,
            period_type: "challenge",
            start_date: "2026-11-11",
            end_date: null,
            is_voluntary: true,
            created_at: "2026-11-11T00:00:00Z",
          },
        ]}
        announcements={[
          {
            id: "ann1",
            room_id: "r1",
            author_id: "u1",
            author_name: "Radha",
            title: "Morning Hours",
            body: "Chant calmly together before sunrise.",
            is_pinned: true,
            created_at: "2026-11-11T04:00:00Z",
          },
        ]}
        invitations={[]}
        auditLogs={[
          {
            id: 1,
            actor_user_id: "u1",
            action: "room_invite_redeemed",
            target_table: "room_memberships",
            target_id: "m2",
            metadata: {},
            created_at: "2026-11-11T05:00:00Z",
          },
        ]}
        progressSummary={summary}
      />
    );

    expect(html).toContain("Sangha 12-Week Participation");
    expect(html).toContain("Your Sharing Privacy");
    expect(html).toContain("Ekadashi 25 Rounds");
    expect(html).toContain("Morning Hours");
    expect(html).toContain("Administrative Audit Trail");
    expect(html).toContain("Create invite link");
  });

  it("renders InviteRedeemCard with conservative completion_only default", () => {
    const html = renderToStaticMarkup(
      <InviteRedeemCard token="test-invite-token-12345678" />
    );
    expect(html).toContain("Accept Room Invitation");
    expect(html).toContain("Completion only (Recommended)");
    expect(html).toContain("Private");
  });
});

