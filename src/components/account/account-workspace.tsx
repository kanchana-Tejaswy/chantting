"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  Bell,
  CheckCheck,
  CheckCircle2,
  Download,
  Lock,
  LogOut,
  ShieldAlert,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress";
import { SwitchField } from "@/components/ui/switch";
import type {
  AccountNotification,
  AccountPreferences,
  AccountProfile,
  MilestoneDisplayItem,
  VerifiedMilestoneStats,
} from "@/lib/account/domain";
import type { AccountRoomMembershipSummary } from "@/lib/account/queries";
import { SUPPORTED_LANGUAGES } from "@/lib/account/validation";

export interface AccountWorkspaceProps {
  userEmail: string | null;
  profile: AccountProfile;
  preferences: AccountPreferences;
  memberships: AccountRoomMembershipSummary[];
  notifications: AccountNotification[];
  unreadNotificationCount: number;
  milestones: MilestoneDisplayItem[];
  milestoneStats: VerifiedMilestoneStats;
  initialTab?: "profile" | "notifications" | "milestones" | "privacy";
}

export function AccountWorkspace({
  userEmail,
  profile,
  preferences,
  memberships,
  notifications,
  unreadNotificationCount,
  milestones,
  milestoneStats,
  initialTab = "profile",
}: AccountWorkspaceProps) {
  const router = useRouter();
  const [tab, setTab] = React.useState(initialTab);
  const [busy, setBusy] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Profile fields
  const [displayName, setDisplayName] = React.useState(profile.display_name);
  const [username, setUsername] = React.useState(profile.username ?? "");
  const [bio, setBio] = React.useState(profile.bio ?? "");
  const [timezone, setTimezone] = React.useState(profile.timezone);
  const [preferredLanguage, setPreferredLanguage] = React.useState(
    profile.preferred_language
  );

  // Sadhana, Accessibility & Notification preferences
  const [dailyRoundTarget, setDailyRoundTarget] = React.useState(
    preferences.daily_round_target
  );
  const [carryPolicy, setCarryPolicy] = React.useState(
    preferences.carry_forward_policy
  );
  const [maxCarryCap, setMaxCarryCap] = React.useState<string>(
    typeof preferences.custom_carry_rule?.max_carry_cap === "number"
      ? String(preferences.custom_carry_rule.max_carry_cap)
      : ""
  );
  const [countingMethod, setCountingMethod] = React.useState(
    preferences.default_counting_method
  );
  const [tactileEnabled, setTactileEnabled] = React.useState(
    preferences.tactile_feedback_enabled
  );
  const [soundEnabled, setSoundEnabled] = React.useState(
    preferences.sound_feedback_enabled
  );
  const [reducedMotion, setReducedMotion] = React.useState(
    preferences.reduced_motion_preference
  );

  // Privacy defaults
  const [publicProfileEnabled, setPublicProfileEnabled] = React.useState(
    preferences.public_profile_enabled
  );
  const [defaultRoomShareMode, setDefaultRoomShareMode] = React.useState(
    preferences.default_room_share_mode
  );
  const [shareStreakInRooms, setShareStreakInRooms] = React.useState(
    preferences.share_streak_in_rooms
  );

  // Notification & Quiet-hour controls
  const [dailyReminderEnabled, setDailyReminderEnabled] = React.useState(
    preferences.daily_reminder_enabled
  );
  const [dailyReminderTime, setDailyReminderTime] = React.useState(
    preferences.daily_reminder_time
      ? preferences.daily_reminder_time.slice(0, 5)
      : "06:30"
  );
  const [quietHoursEnabled, setQuietHoursEnabled] = React.useState(
    preferences.quiet_hours_enabled
  );
  const [quietHoursStart, setQuietHoursStart] = React.useState(
    preferences.quiet_hours_start.slice(0, 5)
  );
  const [quietHoursEnd, setQuietHoursEnd] = React.useState(
    preferences.quiet_hours_end.slice(0, 5)
  );
  const [roomNotificationsEnabled, setRoomNotificationsEnabled] =
    React.useState(preferences.room_notifications_enabled);
  const [roomGoalNotificationsEnabled, setRoomGoalNotificationsEnabled] =
    React.useState(preferences.room_goal_notifications_enabled);
  const [wisdomNotificationsEnabled, setWisdomNotificationsEnabled] =
    React.useState(preferences.wisdom_notifications_enabled);
  const [platformUpdatesEnabled, setPlatformUpdatesEnabled] = React.useState(
    preferences.platform_updates_enabled
  );

  // Account Deletion Confirmation
  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = React.useState("");
  const [deleteConfirmEmail, setDeleteConfirmEmail] = React.useState("");

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          username: username || null,
          bio: bio || null,
          timezone,
          preferredLanguage,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMessage(json.error ?? "Unable to update profile.");
      } else {
        setStatusMessage("Profile and language details saved.");
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error saving profile.");
    } finally {
      setBusy(false);
    }
  }

  async function savePreferences(messageText = "Preferences updated.") {
    setBusy(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyRoundTarget,
          carryForwardPolicy: carryPolicy,
          maxCarryCap: carryPolicy === "custom" ? maxCarryCap : null,
          defaultCountingMethod: countingMethod,
          tactileFeedbackEnabled: tactileEnabled,
          soundFeedbackEnabled: soundEnabled,
          reducedMotionPreference: reducedMotion,
          publicProfileEnabled,
          defaultRoomShareMode,
          shareStreakInRooms,
          dailyReminderEnabled,
          dailyReminderTime: dailyReminderEnabled ? dailyReminderTime : null,
          quietHoursEnabled,
          quietHoursStart,
          quietHoursEnd,
          roomNotificationsEnabled,
          roomGoalNotificationsEnabled,
          wisdomNotificationsEnabled,
          platformUpdatesEnabled,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMessage(json.error ?? "Unable to save preferences.");
      } else {
        setStatusMessage(messageText);
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error saving preferences.");
    } finally {
      setBusy(false);
    }
  }

  async function handleNotificationAction(
    action: "mark_read" | "mark_all_read" | "dismiss",
    notificationId?: string
  ) {
    setBusy(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/account/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notificationId }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setErrorMessage(json.error ?? "Unable to update notifications.");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function triggerDailyReminderCheck() {
    setBusy(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/account/notifications", { method: "POST" });
      const json = (await res.json()) as {
        error?: string;
        evaluation?: { created?: boolean; reason?: string };
      };
      if (!res.ok) {
        setErrorMessage(json.error ?? "Could not evaluate daily reminder.");
      } else if (json.evaluation?.created) {
        setStatusMessage("Gentle daily Japa reminder added to your inbox.");
        router.refresh();
      } else {
        const reason = json.evaluation?.reason ?? "skipped";
        const friendly: Record<string, string> = {
          disabled: "Daily reminders are currently off.",
          quiet_hours:
            "Inside your local quiet hours — no reminder was generated.",
          before_reminder_time:
            "Your scheduled reminder time has not arrived yet in your timezone.",
          already_sent_today:
            "Today's gentle reminder was already delivered.",
        };
        setStatusMessage(friendly[reason] ?? `Reminder status: ${reason}.`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function updateRoomPrivacy(
    roomId: string,
    shareProgressMode: "full" | "completion_only" | "private",
    currentShareStreak: boolean
  ) {
    setBusy(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/rooms/memberships", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          shareProgressMode,
          shareStreak:
            shareProgressMode === "private" ? false : currentShareStreak,
        }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setErrorMessage(json.error ?? "Unable to update room privacy.");
      } else {
        setStatusMessage(
          shareProgressMode === "private"
            ? "Room privacy set to Private — previously shared progress activity was removed from visibility."
            : "Room privacy mode updated."
        );
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function purgeRoomSharedActivity(roomId?: string) {
    setBusy(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/account/room-activity", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roomId ? { roomId } : {}),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setErrorMessage(json.error ?? "Unable to purge shared activity.");
      } else {
        setStatusMessage(
          "Previously shared room feed rows purged without touching your personal Sadhana records."
        );
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function leaveRoom(roomId: string) {
    setBusy(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/rooms/join", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMessage(json.error ?? "Unable to leave room.");
      } else {
        setStatusMessage("Left chanting room.");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSessionSignOut(scope: "local" | "global") {
    setBusy(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/account/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMessage(json.error ?? "Unable to sign out.");
      } else {
        router.push("/auth");
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error while signing out.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmPhrase: deleteConfirmPhrase,
          confirmEmail: deleteConfirmEmail || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMessage(json.error ?? "Unable to delete account.");
      } else {
        router.push("/?account_deleted=1");
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error deleting account.");
    } finally {
      setBusy(false);
    }
  }

  const unlockedCount = milestones.filter((m) => m.unlocked).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-sandalwood-border pb-6">
        <div>
          <p className="text-xs font-medium tracking-wider uppercase text-gold-ink">
            Personal Sanctuary Controls
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink sm:text-4xl">
            Account, Notifications &amp; Privacy
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Signed in as{" "}
            <strong className="font-medium text-ink">
              {userEmail ?? profile.display_name}
            </strong>{" "}
            · {profile.timezone}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="/api/account/export"
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            <Download className="size-4" aria-hidden={true} />
            <span>Export Data (JSON)</span>
          </a>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Account management sections"
        className="flex flex-wrap gap-2"
      >
        {(
          [
            ["profile", "Profile & Sadhana", User],
            [
              "notifications",
              unreadNotificationCount > 0
                ? `Notifications (${unreadNotificationCount})`
                : "Notifications",
              Bell,
            ],
            [
              "milestones",
              `Milestones (${unlockedCount}/${milestones.length})`,
              Award,
            ],
            ["privacy", "Privacy & Data Rights", Lock],
          ] as const
        ).map(([key, label, Icon]) => (
          <Button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            variant={tab === key ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab(key)}
          >
            <Icon className="size-4" aria-hidden={true} />
            <span>{label}</span>
          </Button>
        ))}
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 rounded-[12px] border border-peacock-green/35 bg-tulsi-wash px-4 py-3 text-sm text-peacock-ink">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden={true} />
          <span>{statusMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-[12px] border border-kumkum/35 bg-kumkum-wash px-4 py-3 text-sm text-kumkum"
        >
          <ShieldAlert className="size-4 shrink-0" aria-hidden={true} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: Profile & Sadhana Settings */}
      {tab === "profile" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Identity &amp; Localization
              </CardTitle>
              <CardDescription>
                Display name, timezone for daily transitions, and scriptural
                language preference.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="space-y-4">
                <FormField id="acc-name" label="Display Name" required>
                  <Input
                    id="acc-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </FormField>

                <FormField
                  id="acc-username"
                  label="Handle (Optional)"
                  hint="4–32 lowercase characters, letters, numbers, hyphens, or underscores."
                >
                  <Input
                    id="acc-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="radhika-dasi"
                  />
                </FormField>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField id="acc-tz" label="IANA Timezone" required>
                    <Input
                      id="acc-tz"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      placeholder="Asia/Kolkata"
                      required
                    />
                  </FormField>
                  <FormField id="acc-lang" label="Preferred Language">
                    <Select
                      id="acc-lang"
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                    >
                      {SUPPORTED_LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>

                <FormField id="acc-bio" label="Short Personal Bio (Optional)">
                  <Textarea
                    id="acc-bio"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Shown only if you opt into a public profile..."
                  />
                </FormField>

                <Button type="submit" variant="primary" disabled={busy}>
                  Save Profile Details
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Chanting, Carry-Forward &amp; Comfort
              </CardTitle>
              <CardDescription>
                Tune daily round commitments, sound/tactile feedback, and reduced
                motion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="acc-target" label="Daily Round Target (1–192)">
                  <Input
                    id="acc-target"
                    type="number"
                    min={1}
                    max={192}
                    value={dailyRoundTarget}
                    onChange={(e) => setDailyRoundTarget(Number(e.target.value))}
                  />
                </FormField>
                <FormField id="acc-method" label="Default Chanting Mode">
                  <Select
                    id="acc-method"
                    value={countingMethod}
                    onChange={(e) =>
                      setCountingMethod(
                        e.target.value as "manual" | "japa_mala"
                      )
                    }
                  >
                    <option value="japa_mala">108-Bead Digital Japa Mala</option>
                    <option value="manual">Manual Round Counter</option>
                  </Select>
                </FormField>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="acc-policy" label="Carry-Forward Policy">
                  <Select
                    id="acc-policy"
                    value={carryPolicy}
                    onChange={(e) =>
                      setCarryPolicy(
                        e.target.value as
                          | "automatic"
                          | "optional"
                          | "fresh_daily"
                          | "custom"
                      )
                    }
                  >
                    <option value="automatic">Automatic carry-forward</option>
                    <option value="optional">Optional daily choice</option>
                    <option value="fresh_daily">Fresh daily target</option>
                    <option value="custom">Custom carry cap</option>
                  </Select>
                </FormField>

                {carryPolicy === "custom" && (
                  <FormField id="acc-cap" label="Max Carry Cap (Rounds)">
                    <Input
                      id="acc-cap"
                      type="number"
                      min={0}
                      max={500}
                      value={maxCarryCap}
                      onChange={(e) => setMaxCarryCap(e.target.value)}
                    />
                  </FormField>
                )}
              </div>

              <div className="space-y-2.5">
                <SwitchField
                  id="acc-sound"
                  label="Subtle Chanting Chime"
                  description="Gentle Web Audio chime when completing the 108th bead."
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                />
                <SwitchField
                  id="acc-haptic"
                  label="Tactile Vibration Feedback"
                  description="Gentle mobile vibration feedback on each bead advance."
                  checked={tactileEnabled}
                  onCheckedChange={setTactileEnabled}
                />
                <SwitchField
                  id="acc-motion"
                  label="Reduced Motion"
                  description="Minimize transitions and ambient animations across the sanctuary."
                  checked={reducedMotion}
                  onCheckedChange={setReducedMotion}
                />
              </div>

              <Button
                type="button"
                variant="primary"
                disabled={busy}
                onClick={() =>
                  savePreferences("Chanting and comfort preferences saved.")
                }
              >
                Save Sādhana Preferences
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: Notifications & Quiet Hours */}
      {tab === "notifications" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Notification Consent &amp; Quiet Hours
              </CardTitle>
              <CardDescription>
                Reminders remain calm, opt-in, and strictly free of guilt or
                private chanting counts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SwitchField
                id="notif-daily"
                label="Optional Daily Sādhana Reminder"
                description="Delivers at most one gentle in-app reminder per local day."
                checked={dailyReminderEnabled}
                onCheckedChange={setDailyReminderEnabled}
              />

              {dailyReminderEnabled && (
                <FormField
                  id="notif-time"
                  label={`Preferred Local Time (${profile.timezone})`}
                >
                  <Input
                    id="notif-time"
                    type="time"
                    value={dailyReminderTime}
                    onChange={(e) => setDailyReminderTime(e.target.value)}
                  />
                </FormField>
              )}

              <SwitchField
                id="notif-quiet"
                label="Respect Quiet Hours"
                description="Suppresses daily reminders during resting hours in your saved timezone."
                checked={quietHoursEnabled}
                onCheckedChange={setQuietHoursEnabled}
              />

              {quietHoursEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField id="qh-start" label="Quiet Hours Start">
                    <Input
                      id="qh-start"
                      type="time"
                      value={quietHoursStart}
                      onChange={(e) => setQuietHoursStart(e.target.value)}
                    />
                  </FormField>
                  <FormField id="qh-end" label="Quiet Hours End">
                    <Input
                      id="qh-end"
                      type="time"
                      value={quietHoursEnd}
                      onChange={(e) => setQuietHoursEnd(e.target.value)}
                    />
                  </FormField>
                </div>
              )}

              <SwitchField
                id="notif-rooms"
                label="Room Announcements & Invitations"
                description="In-app updates when an admin posts an announcement in your rooms."
                checked={roomNotificationsEnabled}
                onCheckedChange={setRoomNotificationsEnabled}
              />
              <SwitchField
                id="notif-goals"
                label="Voluntary Room Goal Updates"
                description="Notify when an optional community goal is posted."
                checked={roomGoalNotificationsEnabled}
                onCheckedChange={setRoomGoalNotificationsEnabled}
              />
              <SwitchField
                id="notif-wisdom"
                label="Daily Wisdom Notices"
                description="Opt into verified daily Bhagavad Gītā reflection notices."
                checked={wisdomNotificationsEnabled}
                onCheckedChange={setWisdomNotificationsEnabled}
              />
              <SwitchField
                id="notif-platform"
                label="Platform & Content Updates"
                description="Important non-promotional maintenance and verification notes."
                checked={platformUpdatesEnabled}
                onCheckedChange={setPlatformUpdatesEnabled}
              />

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  disabled={busy}
                  onClick={() =>
                    savePreferences(
                      "Notification and quiet-hour settings saved."
                    )
                  }
                >
                  Save Notification Preferences
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={triggerDailyReminderCheck}
                >
                  Test Daily Reminder Check
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card surface="parchment">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="font-display text-2xl">
                  In-App Inbox ({notifications.length})
                </CardTitle>
                {unreadNotificationCount > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => handleNotificationAction("mark_all_read")}
                  >
                    <CheckCheck className="size-4" aria-hidden={true} />
                    <span>Mark all read</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  Your sanctuary inbox is quiet. No unread notifications.
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-[12px] border p-3.5 text-sm space-y-2 ${
                      n.is_read
                        ? "border-sandalwood-border bg-ivory"
                        : "border-gold-border/50 bg-gold-wash/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ink">{n.title}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">{n.body}</p>
                      </div>
                      {!n.is_read && <Badge variant="gold">New</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-ink-muted tabular-nums">
                        {n.created_at.slice(0, 16).replace("T", " ")}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {n.action_url && (
                          <Link
                            href={n.action_url}
                            className="font-medium text-peacock-ink hover:underline"
                          >
                            Open
                          </Link>
                        )}
                        {!n.is_read && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              handleNotificationAction("mark_read", n.id)
                            }
                            className="cursor-pointer text-ink-muted hover:text-ink"
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            handleNotificationAction("dismiss", n.id)
                          }
                          className="cursor-pointer text-ink-muted hover:text-kumkum"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Private Milestones */}
      {tab === "milestones" && (
        <div className="space-y-6">
          <Card surface="sanctum">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="sanctum">
                  <Sparkles className="size-3.5 text-gold-antique" aria-hidden={true} />
                  <span>Private Personal Milestones</span>
                </Badge>
                <span className="text-xs text-ink-muted-dark tabular-nums">
                  {unlockedCount} of {milestones.length} unlocked
                </span>
              </div>
              <CardTitle className="mt-2 font-display text-2xl text-ink-on-dark">
                Steady Devotional Progress
              </CardTitle>
              <CardDescription className="text-ink-muted-dark">
                Milestones celebrate verified personal rounds, 108-bead malas,
                active days, and time on the path—always private to your
                account with zero rankings or pressure.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[12px] border border-gold-antique/25 bg-krishna-elevated/80 p-3">
                <p className="text-xs text-ink-muted-dark">Verified Rounds</p>
                <p className="mt-1 font-display text-2xl font-semibold text-ink-on-dark tabular-nums">
                  {milestoneStats.totalRounds}
                </p>
              </div>
              <div className="rounded-[12px] border border-gold-antique/25 bg-krishna-elevated/80 p-3">
                <p className="text-xs text-ink-muted-dark">108-Bead Malas</p>
                <p className="mt-1 font-display text-2xl font-semibold text-ink-on-dark tabular-nums">
                  {milestoneStats.malaRounds}
                </p>
              </div>
              <div className="rounded-[12px] border border-gold-antique/25 bg-krishna-elevated/80 p-3">
                <p className="text-xs text-ink-muted-dark">Active Days</p>
                <p className="mt-1 font-display text-2xl font-semibold text-ink-on-dark tabular-nums">
                  {milestoneStats.activeDays}
                </p>
              </div>
              <div className="rounded-[12px] border border-gold-antique/25 bg-krishna-elevated/80 p-3">
                <p className="text-xs text-ink-muted-dark">Days on Path</p>
                <p className="mt-1 font-display text-2xl font-semibold text-ink-on-dark tabular-nums">
                  {milestoneStats.anniversaryDays}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {milestones.map((m) => (
              <Card
                key={m.id}
                surface={m.unlocked ? "parchment" : "linen"}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={m.unlocked ? "peacock" : "neutral"}>
                      {m.unlocked ? "Unlocked" : "In Progress"}
                    </Badge>
                    {m.unlockedAt && (
                      <span className="text-xs text-ink-muted tabular-nums">
                        {m.unlockedAt.slice(0, 10)}
                      </span>
                    )}
                  </div>
                  <CardTitle className="mt-2 font-serif text-lg">
                    {m.title}
                  </CardTitle>
                  <CardDescription>{m.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProgressBar
                    value={m.currentValue}
                    max={m.thresholdValue}
                    label="Progress"
                    tone={m.unlocked ? "peacock" : "gold"}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Privacy, Rooms & Data Rights */}
      {tab === "privacy" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card surface="parchment">
              <CardHeader>
                <CardTitle className="font-display text-2xl">
                  Global Privacy &amp; Directory Visibility
                </CardTitle>
                <CardDescription>
                  Personal chanting logs, Gītā notes, library history, and
                  milestones always stay private regardless of room membership.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <SwitchField
                  id="priv-public-dir"
                  label="Show Basic Display Name in Public Directory"
                  description="Off by default. Shares only display name & optional username—never chanting data."
                  checked={publicProfileEnabled}
                  onCheckedChange={setPublicProfileEnabled}
                />
                <FormField
                  id="priv-room-default"
                  label="Default Privacy Mode for Joining Rooms"
                >
                  <Select
                    id="priv-room-default"
                    value={defaultRoomShareMode}
                    onChange={(e) =>
                      setDefaultRoomShareMode(
                        e.target.value as
                          | "full"
                          | "completion_only"
                          | "private"
                      )
                    }
                  >
                    <option value="completion_only">
                      Completion Only (Recommended conservative default)
                    </option>
                    <option value="private">Private (Visible only to you)</option>
                    <option value="full">
                      Full Shared Rounds (Manual consent)
                    </option>
                  </Select>
                </FormField>
                <SwitchField
                  id="priv-streak"
                  label="Allow Sharing Consistency Streak in Rooms"
                  description="Off by default."
                  checked={shareStreakInRooms}
                  onCheckedChange={setShareStreakInRooms}
                />

                <Button
                  type="button"
                  variant="primary"
                  disabled={busy}
                  onClick={() =>
                    savePreferences("Privacy defaults saved successfully.")
                  }
                >
                  Save Privacy Defaults
                </Button>
              </CardContent>
            </Card>

            <Card surface="parchment">
              <CardHeader>
                <CardTitle className="font-display text-2xl">
                  Room Sharing Consent ({memberships.length})
                </CardTitle>
                <CardDescription>
                  Adjust visibility per room, purge previously shared room feed
                  events, or leave any room.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {memberships.length === 0 ? (
                  <p className="text-sm text-ink-muted">
                    You have not joined any chanting rooms.
                  </p>
                ) : (
                  memberships.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-[12px] border border-sandalwood-border bg-ivory p-3.5 text-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/rooms/${m.room_slug}`}
                          className="font-semibold text-sm text-peacock-deep hover:underline"
                        >
                          {m.room_name}
                        </Link>
                        <Badge variant="neutral">{m.role}</Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          aria-label={`Privacy mode for ${m.room_name}`}
                          value={m.share_progress_mode}
                          disabled={busy}
                          onChange={(e) =>
                            updateRoomPrivacy(
                              m.room_id,
                              e.target.value as
                                | "full"
                                | "completion_only"
                                | "private",
                              m.share_streak
                            )
                          }
                        >
                          <option value="completion_only">Completion only</option>
                          <option value="private">Private</option>
                          <option value="full">Full rounds</option>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => purgeRoomSharedActivity(m.room_id)}
                        >
                          Purge shared feed
                        </Button>
                        {m.role !== "owner" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => leaveRoom(m.room_id)}
                          >
                            Leave
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {memberships.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => purgeRoomSharedActivity()}
                  >
                    Purge All Shared Room Activity Feed Entries
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Session & Device Access Management */}
          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Sessions &amp; Device Access
              </CardTitle>
              <CardDescription>
                Manage your active authenticated browser session or revoke all
                signed-in sessions across devices at once.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 text-sm">
                <p className="font-medium text-ink">
                  Authenticated as {userEmail ?? profile.display_name}
                </p>
                <p className="text-xs text-ink-muted">
                  Signing out of all devices invalidates refresh tokens globally
                  across mobile and desktop sessions.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleSessionSignOut("local")}
                >
                  <LogOut className="size-4" aria-hidden={true} />
                  <span>Sign Out This Device</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleSessionSignOut("global")}
                >
                  <LogOut className="size-4" aria-hidden={true} />
                  <span>Sign Out All Devices</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Export & Secure Account Deletion */}
          <Card surface="linen">
            <CardHeader>
              <CardTitle className="font-display text-2xl text-kumkum">
                Data Export &amp; Permanent Account Deletion
              </CardTitle>
              <CardDescription>
                Export a complete JSON archive of your Sadhana, Gītā notes,
                library bookmarks, and milestones at any time. Deleting your
                account permanently removes your personal records and scrubs
                profile PII while keeping community rooms clean.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <a
                  href="/api/account/export"
                  className={buttonStyles({ variant: "secondary", size: "md" })}
                >
                  <Download className="size-4" aria-hidden={true} />
                  <span>Download Complete JSON Data Archive</span>
                </a>
              </div>

              <form
                onSubmit={deleteAccount}
                className="space-y-3 rounded-[14px] border border-kumkum/30 bg-paper p-4"
              >
                <p className="text-sm font-semibold text-kumkum">
                  Delete Account &amp; Scrub Personal Data
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    id="del-phrase"
                    label='Type "DELETE MY ACCOUNT" to confirm'
                    required
                  >
                    <Input
                      id="del-phrase"
                      value={deleteConfirmPhrase}
                      onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                      placeholder="DELETE MY ACCOUNT"
                      required
                    />
                  </FormField>
                  {userEmail && (
                    <FormField
                      id="del-email"
                      label="Verify Account Email"
                      required
                    >
                      <Input
                        id="del-email"
                        type="email"
                        value={deleteConfirmEmail}
                        onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                        placeholder={userEmail}
                        required
                      />
                    </FormField>
                  )}
                </div>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={
                    busy || deleteConfirmPhrase.trim() !== "DELETE MY ACCOUNT"
                  }
                >
                  <Trash2 className="size-4" aria-hidden={true} />
                  <span>Permanently Delete &amp; Scrub My Account</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

