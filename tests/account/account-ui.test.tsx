import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { AccountWorkspace } from "@/components/account/account-workspace";

const BASE_PROFILE = {
  id: "u1",
  username: "ananda",
  display_name: "Ananda",
  avatar_url: null,
  bio: null,
  timezone: "Asia/Kolkata",
  preferred_language: "en",
  is_deactivated: false,
  deletion_requested_at: null,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-11T00:00:00Z",
};

const BASE_PREFS = {
  user_id: "u1",
  daily_round_target: 16,
  carry_forward_policy: "automatic" as const,
  custom_carry_rule: {},
  default_counting_method: "japa_mala" as const,
  tactile_feedback_enabled: true,
  sound_feedback_enabled: false,
  reduced_motion_preference: true,
  public_profile_enabled: false,
  default_room_share_mode: "completion_only" as const,
  share_streak_in_rooms: false,
  daily_reminder_enabled: true,
  daily_reminder_time: "06:30:00",
  quiet_hours_enabled: true,
  quiet_hours_start: "22:00:00",
  quiet_hours_end: "05:00:00",
  room_notifications_enabled: true,
  room_goal_notifications_enabled: true,
  wisdom_notifications_enabled: true,
  platform_updates_enabled: true,
};

describe("Phase 10 Account, Notifications, Milestones & Privacy UI", () => {
  it("renders profile, quiet hours notifications, private milestones, and data export/deletion tabs", () => {
    const profileHtml = renderToStaticMarkup(
      <AccountWorkspace
        userEmail="ananda@example.org"
        profile={BASE_PROFILE}
        preferences={BASE_PREFS}
        memberships={[]}
        notifications={[]}
        unreadNotificationCount={0}
        milestones={[]}
        milestoneStats={{
          totalRounds: 16,
          malaRounds: 1,
          activeDays: 2,
          anniversaryDays: 10,
        }}
        initialTab="profile"
      />
    );
    expect(profileHtml).toContain("Account, Notifications &amp; Privacy");
    expect(profileHtml).toContain("Reduced Motion");
    expect(profileHtml).toContain("Export Data (JSON)");

    const notifHtml = renderToStaticMarkup(
      <AccountWorkspace
        userEmail="ananda@example.org"
        profile={BASE_PROFILE}
        preferences={BASE_PREFS}
        memberships={[]}
        notifications={[
          {
            id: "n1",
            type: "room_announcement",
            title: "Announcement in Kirtan Sangha",
            body: "Morning hours reflection.",
            action_url: "/rooms/kirtan-sangha",
            is_read: false,
            read_at: null,
            created_at: "2026-11-11T05:00:00Z",
          },
        ]}
        unreadNotificationCount={1}
        milestones={[]}
        milestoneStats={{
          totalRounds: 16,
          malaRounds: 1,
          activeDays: 2,
          anniversaryDays: 10,
        }}
        initialTab="notifications"
      />
    );
    expect(notifHtml).toContain("Respect Quiet Hours");
    expect(notifHtml).toContain("Announcement in Kirtan Sangha");

    const milestoneHtml = renderToStaticMarkup(
      <AccountWorkspace
        userEmail="ananda@example.org"
        profile={BASE_PROFILE}
        preferences={BASE_PREFS}
        memberships={[]}
        notifications={[]}
        unreadNotificationCount={0}
        milestones={[
          {
            id: "a1",
            code: "first_round",
            title: "First Completed Round",
            description: "Completed your first round.",
            category: "milestone",
            thresholdValue: 1,
            currentValue: 1,
            unlocked: true,
            unlockedAt: "2026-11-10T00:00:00Z",
          },
        ]}
        milestoneStats={{
          totalRounds: 16,
          malaRounds: 1,
          activeDays: 2,
          anniversaryDays: 10,
        }}
        initialTab="milestones"
      />
    );
    expect(milestoneHtml).toContain("Private Personal Milestones");
    expect(milestoneHtml).toContain("First Completed Round");
    expect(milestoneHtml).toContain("Unlocked");

    const privacyHtml = renderToStaticMarkup(
      <AccountWorkspace
        userEmail="ananda@example.org"
        profile={BASE_PROFILE}
        preferences={BASE_PREFS}
        memberships={[
          {
            id: "m1",
            room_id: "r1",
            room_slug: "kirtan-sangha",
            room_name: "Kirtan Sangha",
            room_visibility: "public",
            role: "member",
            share_progress_mode: "completion_only",
            share_streak: false,
          },
        ]}
        notifications={[]}
        unreadNotificationCount={0}
        milestones={[]}
        milestoneStats={{
          totalRounds: 16,
          malaRounds: 1,
          activeDays: 2,
          anniversaryDays: 10,
        }}
        initialTab="privacy"
      />
    );
    expect(privacyHtml).toContain("Kirtan Sangha");
    expect(privacyHtml).toContain("Purge shared feed");
    expect(privacyHtml).toContain("DELETE MY ACCOUNT");
  });
});

