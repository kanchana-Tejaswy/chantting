"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Copy,
  KeyRound,
  Lock,
  Megaphone,
  Pin,
  Plus,
  Share2,
  Shield,
  Target,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import type {
  RoomMemberItem,
  RoomProgressSummary,
  RoomShareMode,
} from "@/lib/rooms/analytics";
import type {
  RoomAnnouncementItem,
  RoomAuditLogItem,
  RoomGoalItem,
  RoomInvitationSummary,
  RoomListItem,
} from "@/lib/rooms/queries";
import { RoomHeatmap } from "@/components/rooms/room-heatmap";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
} from "@/components/ui/dialog";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { SwitchField } from "@/components/ui/switch";

export interface RoomDetailViewProps {
  currentUserId: string;
  room: RoomListItem;
  currentMembership: RoomMemberItem;
  members: RoomMemberItem[];
  goals: RoomGoalItem[];
  announcements: RoomAnnouncementItem[];
  invitations: RoomInvitationSummary[];
  auditLogs: RoomAuditLogItem[];
  progressSummary: RoomProgressSummary;
}

export function RoomDetailView({
  currentUserId,
  room,
  currentMembership,
  members,
  goals,
  announcements,
  invitations,
  auditLogs,
  progressSummary,
}: RoomDetailViewProps) {
  const router = useRouter();
  const isOwner = room.owner_id === currentUserId;
  const isAdmin =
    currentMembership.role === "owner" || currentMembership.role === "admin";

  const [shareMode, setShareMode] = React.useState<RoomShareMode>(
    currentMembership.share_progress_mode
  );
  const [shareStreak, setShareStreak] = React.useState(
    currentMembership.share_streak
  );
  const [savingPrivacy, setSavingPrivacy] = React.useState(false);
  const [sharingProgress, setSharingProgress] = React.useState(false);

  // Admin: new goal state
  const [showGoalForm, setShowGoalForm] = React.useState(false);
  const [goalTitle, setGoalTitle] = React.useState("");
  const [goalDesc, setGoalDesc] = React.useState("");
  const [goalRounds, setGoalRounds] = React.useState("16");
  const [goalPeriod, setGoalPeriod] = React.useState<
    "daily" | "weekly" | "challenge"
  >("daily");
  const [creatingGoal, setCreatingGoal] = React.useState(false);

  // Admin: new announcement state
  const [showAnnouncementForm, setShowAnnouncementForm] = React.useState(false);
  const [annTitle, setAnnTitle] = React.useState("");
  const [annBody, setAnnBody] = React.useState("");
  const [annPinned, setAnnPinned] = React.useState(false);
  const [postingAnn, setPostingAnn] = React.useState(false);

  // Admin: invitations
  const [latestInviteUrl, setLatestInviteUrl] = React.useState<string | null>(
    null
  );
  const [creatingInvite, setCreatingInvite] = React.useState(false);

  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Subscribe to Supabase Realtime room updates when browser client is configured
  React.useEffect(() => {
    let supabase: ReturnType<typeof createBrowserSupabase> | null = null;
    try {
      supabase = createBrowserSupabase();
    } catch {
      return;
    }

    const channel = supabase
      .channel(`room-live-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_activity_feed",
          filter: `room_id=eq.${room.id}`,
        },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_announcements",
          filter: `room_id=eq.${room.id}`,
        },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_goals",
          filter: `room_id=eq.${room.id}`,
        },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      if (supabase) {
        void supabase.removeChannel(channel);
      }
    };
  }, [room.id, router]);

  const handleSavePrivacy = async (
    nextMode: RoomShareMode,
    nextStreak: boolean
  ) => {
    setShareMode(nextMode);
    setShareStreak(nextStreak);
    setSavingPrivacy(true);
    setError(null);
    setFeedback(null);

    try {
      const res = await fetch("/api/rooms/memberships", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          shareProgressMode: nextMode,
          shareStreak: nextStreak,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to update privacy.");
      setFeedback("Room privacy setting saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save privacy.");
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleShareToday = async (
    activityType: "rounds_shared" | "challenge_joined",
    goalId?: string
  ) => {
    setSharingProgress(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/rooms/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id, activityType, goalId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not share update.");
      setFeedback(
        activityType === "challenge_joined"
          ? "Joined voluntary goal."
          : "Shared today's consented milestone with this room."
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share update.");
    } finally {
      setSharingProgress(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingGoal) return;
    setCreatingGoal(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          title: goalTitle,
          description: goalDesc.trim() || undefined,
          targetRounds: Number.parseInt(goalRounds, 10),
          periodType: goalPeriod,
          startDate: progressSummary.todayDate,
          isVoluntary: true,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to create goal.");
      setGoalTitle("");
      setGoalDesc("");
      setShowGoalForm(false);
      setFeedback("Shared voluntary goal added.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create goal.");
    } finally {
      setCreatingGoal(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    const res = await fetch("/api/rooms/goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, goalId }),
    });
    if (res.ok) router.refresh();
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (postingAnn) return;
    setPostingAnn(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          title: annTitle,
          body: annBody,
          isPinned: annPinned,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to post announcement.");
      setAnnTitle("");
      setAnnBody("");
      setAnnPinned(false);
      setShowAnnouncementForm(false);
      setFeedback("Announcement posted.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post.");
    } finally {
      setPostingAnn(false);
    }
  };

  const handleTogglePin = async (announcementId: string, isPinned: boolean) => {
    const res = await fetch("/api/rooms/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: room.id,
        announcementId,
        isPinned: !isPinned,
      }),
    });
    if (res.ok) router.refresh();
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    const res = await fetch("/api/rooms/announcements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, announcementId }),
    });
    if (res.ok) router.refresh();
  };

  const handleCreateInvite = async () => {
    if (creatingInvite) return;
    setCreatingInvite(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          maxUses: 25,
          expiresInHours: 168,
        }),
      });
      const json = (await res.json()) as {
        invitePath?: string;
        error?: string;
      };
      if (!res.ok || !json.invitePath) {
        throw new Error(json.error ?? "Could not create invite.");
      }
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      setLatestInviteUrl(`${origin}${json.invitePath}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite.");
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    const res = await fetch("/api/rooms/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, invitationId }),
    });
    if (res.ok) {
      setFeedback("Invitation revoked.");
      router.refresh();
    }
  };

  const handleRoleChange = async (
    targetUserId: string,
    newRole: "admin" | "member"
  ) => {
    setError(null);
    const res = await fetch("/api/rooms/memberships", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, targetUserId, newRole }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(json.error ?? "Could not update member role.");
      return;
    }
    setFeedback("Member role updated and recorded in audit log.");
    router.refresh();
  };

  const handleRemoveOrLeave = async (targetUserId?: string) => {
    const res = await fetch("/api/rooms/join", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, targetUserId }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Could not update membership.");
      return;
    }
    if (!targetUserId || targetUserId === currentUserId) {
      router.push("/rooms");
    } else {
      setFeedback("Member removed from room.");
    }
    router.refresh();
  };

  const handleArchiveRoom = async () => {
    const res = await fetch("/api/rooms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, isArchived: true }),
    });
    if (res.ok) {
      router.push("/rooms");
      router.refresh();
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-sandalwood-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/rooms"
            className={buttonStyles({
              variant: "ghost",
              size: "sm",
              className: "-ml-3 mb-1",
            })}
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden={true} />
            <span>All Rooms</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              {room.name}
            </h1>
            <Badge variant={room.visibility === "private" ? "gold" : "peacock"}>
              {room.visibility === "private" && (
                <Lock className="size-3" aria-hidden={true} />
              )}
              <span className="capitalize">{room.visibility}</span>
            </Badge>
            <Badge variant="neutral" className="capitalize">
              Your role: {currentMembership.role}
            </Badge>
          </div>
          {room.description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              {room.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {shareMode !== "private" && (
            <Button
              variant="primary"
              size="md"
              loading={sharingProgress}
              onClick={() => void handleShareToday("rounds_shared")}
            >
              <Share2 className="size-4" strokeWidth={1.75} aria-hidden={true} />
              <span>Share today&apos;s update</span>
            </Button>
          )}

          {!isOwner ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="md">
                  Leave room
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent
                title="Leave this chanting room?"
                description="Your personal chanting history stays completely yours. You can rejoin later if the room is public or via a new invitation."
                confirmLabel="Leave room"
                destructive
                onConfirm={() => void handleRemoveOrLeave()}
              />
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Archive room
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent
                title="Archive this chanting room?"
                description="Archiving hides the room from the directory while keeping members' personal chanting records intact."
                confirmLabel="Archive room"
                destructive
                onConfirm={() => void handleArchiveRoom()}
              />
            </AlertDialog>
          )}
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-[12px] border border-kumkum/30 bg-kumkum-wash px-4 py-3 text-sm text-kumkum"
        >
          {error}
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-[12px] border border-peacock-green/25 bg-tulsi-wash px-4 py-2.5 text-xs text-peacock-ink"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden={true} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Room Daily & Weekly Shared Summary + Personal Room Privacy Control */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card surface="parchment">
          <CardHeader>
            <CardTitle>Sangha Progress Overview</CardTitle>
            <CardDescription>
              Derived strictly from members who opted to share updates. Private
              records remain inaccessible to all members and administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-[10px] bg-linen p-3">
              <p className="text-xs text-ink-muted">Members</p>
              <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums">
                {progressSummary.memberCount}
              </p>
            </div>
            <div className="rounded-[10px] bg-linen p-3">
              <p className="text-xs text-ink-muted">Active today</p>
              <p className="mt-1 font-serif text-2xl font-semibold text-peacock-ink tabular-nums">
                {progressSummary.todayActiveMembers}
              </p>
            </div>
            <div className="rounded-[10px] bg-linen p-3">
              <p className="text-xs text-ink-muted">Targets met today</p>
              <p className="mt-1 font-serif text-2xl font-semibold text-peacock-ink tabular-nums">
                {progressSummary.todayTargetMetMembers}
              </p>
            </div>
            <div className="rounded-[10px] bg-linen p-3">
              <p className="text-xs text-ink-muted">Weekly shared rounds</p>
              <p className="mt-1 font-serif text-2xl font-semibold text-gold-ink tabular-nums">
                {progressSummary.weeklySharedRounds}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card surface="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield
                className="size-4 text-peacock-deep"
                strokeWidth={1.75}
                aria-hidden={true}
              />
              <span>Your Sharing Privacy</span>
            </CardTitle>
            <CardDescription>
              Controls what others in {room.name} can see.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FormField id="room-share-select" label="Progress visibility">
              <Select
                id="room-share-select"
                value={shareMode}
                disabled={savingPrivacy}
                onChange={(e) =>
                  void handleSavePrivacy(
                    e.target.value as RoomShareMode,
                    shareStreak
                  )
                }
              >
                <option value="completion_only">
                  Completion only (no round counts)
                </option>
                <option value="full">Full daily round count</option>
                <option value="private">Private (share nothing)</option>
              </Select>
            </FormField>

            <SwitchField
              id="room-share-streak"
              label="Share consistency streak"
              checked={shareStreak}
              disabled={savingPrivacy || shareMode === "private"}
              onCheckedChange={(v) => void handleSavePrivacy(shareMode, v)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Room Heatmap */}
      <RoomHeatmap
        days={progressSummary.heatmapDays}
        todayDate={progressSummary.todayDate}
      />

      {/* Shared Goals & Announcements */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Voluntary Shared Goals */}
        <Card surface="parchment">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target
                  className="size-4 text-peacock-deep"
                  strokeWidth={1.75}
                  aria-hidden={true}
                />
                <span>Shared Goals &amp; Challenges</span>
              </CardTitle>
              <CardDescription>
                Voluntary community aspirations—never mandatory rankings.
              </CardDescription>
            </div>
            {isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowGoalForm((p) => !p)}
              >
                <Plus className="size-4" aria-hidden={true} />
                <span>Add goal</span>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin && showGoalForm && (
              <form
                onSubmit={(e) => void handleCreateGoal(e)}
                className="space-y-3 rounded-[12px] border border-sandalwood-border bg-linen p-4"
              >
                <FormField id="goal-title" label="Goal title" required>
                  <Input
                    id="goal-title"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="Kartika 16-Round Rhythm"
                    required
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField id="goal-rounds" label="Target rounds" required>
                    <Input
                      id="goal-rounds"
                      type="number"
                      min={1}
                      value={goalRounds}
                      onChange={(e) => setGoalRounds(e.target.value)}
                      required
                      className="tabular-nums"
                    />
                  </FormField>
                  <FormField id="goal-period" label="Cadence">
                    <Select
                      id="goal-period"
                      value={goalPeriod}
                      onChange={(e) =>
                        setGoalPeriod(
                          e.target.value as "daily" | "weekly" | "challenge"
                        )
                      }
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="challenge">Voluntary Challenge</option>
                    </Select>
                  </FormField>
                </div>
                <FormField id="goal-desc" label="Notes">
                  <Textarea
                    id="goal-desc"
                    rows={2}
                    value={goalDesc}
                    onChange={(e) => setGoalDesc(e.target.value)}
                  />
                </FormField>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGoalForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" loading={creatingGoal}>
                    Save goal
                  </Button>
                </div>
              </form>
            )}

            {goals.length === 0 ? (
              <p className="rounded-[10px] bg-linen px-4 py-3 text-sm text-ink-muted">
                No shared room goals set yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {goals.map((g) => (
                  <li
                    key={g.id}
                    className="rounded-[12px] border border-sandalwood-border bg-linen/60 p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-ink">{g.title}</p>
                        <p className="text-xs text-ink-muted capitalize tabular-nums">
                          {g.period_type} · {g.target_rounds} rounds · Voluntary
                        </p>
                        {g.description && (
                          <p className="mt-1 text-xs text-ink-muted">
                            {g.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {shareMode !== "private" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={sharingProgress}
                            onClick={() =>
                              void handleShareToday("challenge_joined", g.id)
                            }
                          >
                            Participate
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete goal ${g.title}`}
                            onClick={() => void handleDeleteGoal(g.id)}
                          >
                            <Trash2 className="size-4 text-kumkum" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Room Announcements */}
        <Card surface="parchment">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Megaphone
                  className="size-4 text-peacock-deep"
                  strokeWidth={1.75}
                  aria-hidden={true}
                />
                <span>Room Announcements</span>
              </CardTitle>
              <CardDescription>
                Encouragement and schedule notices from room caretakers.
              </CardDescription>
            </div>
            {isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAnnouncementForm((p) => !p)}
              >
                <Plus className="size-4" aria-hidden={true} />
                <span>Post</span>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin && showAnnouncementForm && (
              <form
                onSubmit={(e) => void handlePostAnnouncement(e)}
                className="space-y-3 rounded-[12px] border border-sandalwood-border bg-linen p-4"
              >
                <FormField id="ann-title" label="Title" required>
                  <Input
                    id="ann-title"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    required
                  />
                </FormField>
                <FormField id="ann-body" label="Message" required>
                  <Textarea
                    id="ann-body"
                    rows={3}
                    value={annBody}
                    onChange={(e) => setAnnBody(e.target.value)}
                    required
                  />
                </FormField>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={annPinned}
                    onChange={(e) => setAnnPinned(e.target.checked)}
                    className="accent-peacock-deep"
                  />
                  <span>Pin announcement to top</span>
                </label>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAnnouncementForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" loading={postingAnn}>
                    Publish
                  </Button>
                </div>
              </form>
            )}

            {announcements.length === 0 ? (
              <p className="rounded-[10px] bg-linen px-4 py-3 text-sm text-ink-muted">
                No announcements posted yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {announcements.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-[12px] border border-sandalwood-border bg-paper p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          {a.is_pinned && (
                            <Badge variant="gold">
                              <Pin className="size-3" aria-hidden={true} />
                              <span>Pinned</span>
                            </Badge>
                          )}
                          <p className="font-medium text-ink">{a.title}</p>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                          {a.body}
                        </p>
                        <p className="mt-1.5 text-[11px] text-ink-muted">
                          {a.author_name} · {a.created_at.slice(0, 10)}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={a.is_pinned ? "Unpin" : "Pin"}
                            onClick={() =>
                              void handleTogglePin(a.id, a.is_pinned)
                            }
                          >
                            <Pin className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete announcement"
                            onClick={() => void handleDeleteAnnouncement(a.id)}
                          >
                            <Trash2 className="size-3.5 text-kumkum" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Members Directory & Consented Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card surface="parchment">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users
                className="size-4 text-peacock-deep"
                strokeWidth={1.75}
                aria-hidden={true}
              />
              <span>Members ({members.length})</span>
            </CardTitle>
            <CardDescription>
              Shown in join order—no mandatory leaderboards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-sandalwood-border">
              {members.map((m) => {
                const status = progressSummary.memberTodayStatus[m.user_id];
                const canManageMember =
                  isAdmin &&
                  m.user_id !== room.owner_id &&
                  m.user_id !== currentUserId;

                return (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {m.display_name}
                        {m.user_id === currentUserId ? " (You)" : ""}
                      </p>
                      <p className="text-xs text-ink-muted capitalize">
                        {m.role} ·{" "}
                        {m.share_progress_mode === "private"
                          ? "Private"
                          : status?.sharedRoundsToday !== null &&
                              status?.sharedRoundsToday !== undefined
                            ? `${status.sharedRoundsToday} rounds shared today`
                            : status?.targetMetToday
                              ? "Target met today"
                              : "No update shared today"}
                      </p>
                    </div>

                    {canManageMember && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void handleRoleChange(
                              m.user_id,
                              m.role === "admin" ? "member" : "admin"
                            )
                          }
                        >
                          {m.role === "admin" ? "Make member" : "Make admin"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${m.display_name}`}
                          onClick={() => void handleRemoveOrLeave(m.user_id)}
                        >
                          <UserMinus className="size-4 text-kumkum" />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card surface="parchment">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell
                className="size-4 text-peacock-deep"
                strokeWidth={1.75}
                aria-hidden={true}
              />
              <span>Recent Room Activity</span>
            </CardTitle>
            <CardDescription>
              Consented community milestones only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {progressSummary.sanitizedFeed.length === 0 ? (
              <p className="rounded-[10px] bg-linen px-4 py-3 text-sm text-ink-muted">
                No shared room activity yet.
              </p>
            ) : (
              <ul className="divide-y divide-sandalwood-border">
                {progressSummary.sanitizedFeed.slice(0, 12).map((act) => (
                  <li
                    key={act.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-xs first:pt-0 last:pb-0"
                  >
                    <span className="text-ink">
                      <strong className="font-medium">{act.display_name}</strong>{" "}
                      {act.activity_type === "joined_room"
                        ? "joined the room"
                        : act.activity_type === "challenge_joined"
                          ? "joined a voluntary goal"
                          : act.activity_type === "daily_target_met"
                            ? act.shared_rounds_count !== null
                              ? `completed today's target (${act.shared_rounds_count} rounds)`
                              : "completed today's commitment"
                            : act.shared_rounds_count !== null
                              ? `shared ${act.shared_rounds_count} rounds`
                              : "checked in"}
                    </span>
                    <span className="shrink-0 text-ink-muted tabular-nums">
                      {act.activity_date}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Owner & Admin Controls: Invitations & Audit Log */}
      {isAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card surface="linen">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <KeyRound
                    className="size-4 text-peacock-deep"
                    strokeWidth={1.75}
                    aria-hidden={true}
                  />
                  <span>Room Invitations</span>
                </CardTitle>
                <CardDescription>
                  Tokens are stored as SHA-256 hashes; raw links appear once on
                  creation.
                </CardDescription>
              </div>
              <Button
                variant="primary"
                size="sm"
                loading={creatingInvite}
                onClick={() => void handleCreateInvite()}
              >
                Create invite link
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {latestInviteUrl && (
                <div className="flex items-center justify-between gap-2 rounded-[10px] border border-gold-border/50 bg-gold-wash px-3 py-2 text-xs">
                  <span className="truncate font-medium text-ink">
                    {latestInviteUrl}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      void navigator.clipboard?.writeText(latestInviteUrl)
                    }
                  >
                    <Copy className="size-3.5" aria-hidden={true} />
                    <span>Copy</span>
                  </Button>
                </div>
              )}

              {invitations.length === 0 ? (
                <p className="text-xs text-ink-muted">
                  No invitations generated yet.
                </p>
              ) : (
                <ul className="divide-y divide-sandalwood-border text-xs">
                  {invitations.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <span className="text-ink tabular-nums">
                        Uses: {inv.uses_count}/{inv.max_uses ?? "∞"} · Created{" "}
                        {inv.created_at.slice(0, 10)}
                      </span>
                      {inv.revoked_at ? (
                        <Badge variant="kumkum">Revoked</Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleRevokeInvite(inv.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card surface="linen">
            <CardHeader>
              <CardTitle className="text-lg">Administrative Audit Trail</CardTitle>
              <CardDescription>
                Immutable record of room role updates and invite redemptions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-ink-muted">
                  No administrative audit events recorded yet.
                </p>
              ) : (
                <ul className="divide-y divide-sandalwood-border text-xs">
                  {auditLogs.slice(0, 10).map((log) => (
                    <li
                      key={log.id}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <span className="font-medium text-ink">{log.action}</span>
                      <span className="text-ink-muted tabular-nums">
                        {log.created_at.slice(0, 16).replace("T", " ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

