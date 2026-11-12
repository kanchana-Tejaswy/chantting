"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, KeyRound, Lock, Plus, Users } from "lucide-react";
import type { RoomListItem } from "@/lib/rooms/queries";
import { slugifyRoomName } from "@/lib/rooms/validation";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField, Input, Textarea } from "@/components/ui/input";

export interface RoomsDirectoryProps {
  user: { id: string; email: string | null; displayName: string } | null;
  myRooms: RoomListItem[];
  publicRooms: RoomListItem[];
}

function extractInviteToken(rawInput: string): string {
  const trimmed = rawInput.trim();
  try {
    if (trimmed.includes("token=")) {
      const parsed = new URL(
        trimmed.startsWith("http") ? trimmed : `https://local.test${trimmed.startsWith("/") ? "" : "/"}${trimmed}`
      );
      return parsed.searchParams.get("token") ?? trimmed;
    }
  } catch {
    // Fall back to raw token string
  }
  return trimmed;
}

export function RoomsDirectory({
  user,
  myRooms,
  publicRooms,
}: RoomsDirectoryProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = React.useState(false);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugEdited, setSlugEdited] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [visibility, setVisibility] = React.useState<"public" | "private">(
    "private"
  );
  const [defaultGoal, setDefaultGoal] = React.useState("16");
  const [inviteInput, setInviteInput] = React.useState("");

  const [isCreating, setIsCreating] = React.useState(false);
  const [isRedeeming, setIsRedeeming] = React.useState(false);
  const [joiningRoomId, setJoiningRoomId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) {
      setSlug(slugifyRoomName(value));
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    setIsCreating(true);
    setError(null);
    setFeedback(null);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description: description.trim() || undefined,
          visibility,
          defaultDailyGoal: defaultGoal ? Number.parseInt(defaultGoal, 10) : null,
        }),
      });
      const json = (await res.json()) as {
        room?: { slug: string };
        error?: string;
      };
      if (!res.ok || !json.room) {
        throw new Error(json.error ?? "Unable to create chanting room.");
      }
      router.push(`/rooms/${json.room.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create room.");
      setIsCreating(false);
    }
  };

  const handleRedeemInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRedeeming) return;
    setIsRedeeming(true);
    setError(null);
    setFeedback(null);

    const token = extractInviteToken(inviteInput);
    try {
      const res = await fetch("/api/rooms/invitations/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawToken: token }),
      });
      const json = (await res.json()) as {
        roomSlug?: string | null;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Invalid or expired invitation.");
      }
      if (json.roomSlug) {
        router.push(`/rooms/${json.roomSlug}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join with invite.");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleJoinPublic = async (roomId: string, roomSlug: string) => {
    if (joiningRoomId) return;
    setJoiningRoomId(roomId);
    setError(null);
    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not join room.");
      }
      router.push(`/rooms/${roomSlug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to join room.");
      setJoiningRoomId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-4 border-b border-sandalwood-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink text-balance sm:text-4xl">
            Satsang
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted text-pretty">
            Shared devotional spaces with friends and sangha. Every member owns
            their personal chanting history and controls what progress is shared.
          </p>
        </div>

        {user ? (
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowCreate((prev) => !prev)}
          >
            <Plus className="size-4" strokeWidth={1.75} aria-hidden={true} />
            <span>{showCreate ? "Close form" : "Create room"}</span>
          </Button>
        ) : (
          <Link
            href="/auth?next=/rooms"
            className={buttonStyles({ variant: "primary", size: "md" })}
          >
            Sign in to create or join
          </Link>
        )}
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
          className="rounded-[12px] border border-peacock-green/25 bg-tulsi-wash px-4 py-3 text-sm text-peacock-ink"
        >
          {feedback}
        </div>
      )}

      {/* Create Room Form */}
      {user && showCreate && (
        <Card surface="elevated">
          <CardHeader>
            <CardTitle>Create a Chanting Room</CardTitle>
            <CardDescription>
              Private rooms require an invitation link; public rooms appear in
              the community directory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleCreateRoom(e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="room-name" label="Room name" required>
                  <Input
                    id="room-name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Vrindavan Morning Sangha"
                    required
                    minLength={2}
                    maxLength={80}
                  />
                </FormField>

                <FormField
                  id="room-slug"
                  label="Room URL slug"
                  hint="Lowercase letters, numbers, and hyphens."
                  required
                >
                  <Input
                    id="room-slug"
                    value={slug}
                    onChange={(e) => {
                      setSlugEdited(true);
                      setSlug(e.target.value.toLowerCase());
                    }}
                    placeholder="vrindavan-morning-sangha"
                    required
                    minLength={4}
                    maxLength={50}
                  />
                </FormField>
              </div>

              <FormField id="room-desc" label="Description">
                <Textarea
                  id="room-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Share the rhythm and spirit of this circle..."
                  maxLength={600}
                />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-ink">
                    Visibility
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: "private", label: "Private (Invite only)" },
                        { id: "public", label: "Public directory" },
                      ] as const
                    ).map((opt) => (
                      <label
                        key={opt.id}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border px-3 text-xs font-medium",
                          visibility === opt.id
                            ? "border-peacock-deep bg-tulsi-wash/60 text-ink"
                            : "border-sandalwood-border bg-paper text-ink-muted"
                        )}
                      >
                        <input
                          type="radio"
                          name="roomVisibility"
                          value={opt.id}
                          checked={visibility === opt.id}
                          onChange={() => setVisibility(opt.id)}
                          className="accent-peacock-deep"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <FormField
                  id="room-goal"
                  label="Voluntary daily goal (optional)"
                >
                  <Input
                    id="room-goal"
                    type="number"
                    min={1}
                    max={192}
                    value={defaultGoal}
                    onChange={(e) => setDefaultGoal(e.target.value)}
                    className="tabular-nums"
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={isCreating}>
                  Create room
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Join via Invitation Token */}
      {user && (
        <Card surface="linen">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound
                className="size-4 text-peacock-deep"
                strokeWidth={1.75}
                aria-hidden={true}
              />
              <span>Join with an invitation link or code</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => void handleRedeemInvite(e)}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <Input
                aria-label="Invitation token or link"
                placeholder="Paste invite link or token..."
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                required
                className="flex-1"
              />
              <Button
                type="submit"
                variant="primary"
                loading={isRedeeming}
                disabled={inviteInput.trim().length < 8}
              >
                Join room
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* User's Joined Rooms */}
      {user && (
        <section aria-labelledby="my-rooms-heading" className="space-y-4">
          <h2
            id="my-rooms-heading"
            className="font-serif text-2xl font-semibold text-ink"
          >
            Your Chanting Rooms
          </h2>

          {myRooms.length === 0 ? (
            <Card surface="parchment">
              <CardContent className="text-sm text-ink-muted">
                You have not joined any chanting rooms yet. Create a circle
                above, paste an invite token, or join a public room below.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myRooms.map((room) => (
                <Card key={room.id} surface="parchment" className="flex flex-col">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge
                        variant={
                          room.visibility === "private" ? "gold" : "peacock"
                        }
                      >
                        {room.visibility === "private" ? (
                          <Lock className="size-3" aria-hidden={true} />
                        ) : (
                          <Globe className="size-3" aria-hidden={true} />
                        )}
                        <span className="capitalize">{room.visibility}</span>
                      </Badge>
                      <Badge variant="neutral" className="capitalize">
                        {room.membershipRole} ·{" "}
                        {(room.shareProgressMode ?? "completion_only").replace(
                          "_",
                          " "
                        )}
                      </Badge>
                    </div>
                    <CardTitle className="mt-2">{room.name}</CardTitle>
                    {room.description && (
                      <CardDescription>{room.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardFooter className="mt-auto">
                    <Link
                      href={`/rooms/${room.slug}`}
                      className={buttonStyles({ variant: "primary", size: "sm" })}
                    >
                      Open room
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Public Rooms Directory */}
      <section aria-labelledby="public-rooms-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <Users
            className="size-5 text-peacock-deep"
            strokeWidth={1.75}
            aria-hidden={true}
          />
          <h2
            id="public-rooms-heading"
            className="font-serif text-2xl font-semibold text-ink"
          >
            Public Community Rooms
          </h2>
        </div>

        {publicRooms.length === 0 ? (
          <Card surface="linen">
            <CardContent className="text-sm text-ink-muted">
              No additional public rooms are open right now.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {publicRooms.map((room) => (
              <Card key={room.id} surface="parchment" className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="peacock">
                      <Globe className="size-3" aria-hidden={true} />
                      <span>Public</span>
                    </Badge>
                    {room.default_daily_goal && (
                      <Badge variant="neutral">
                        Suggested {room.default_daily_goal} rounds
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="mt-2">{room.name}</CardTitle>
                  {room.description && (
                    <CardDescription>{room.description}</CardDescription>
                  )}
                </CardHeader>
                <CardFooter className="mt-auto">
                  {user ? (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={joiningRoomId === room.id}
                      onClick={() => void handleJoinPublic(room.id, room.slug)}
                    >
                      Join room
                    </Button>
                  ) : (
                    <Link
                      href={`/auth?next=/rooms/${room.slug}`}
                      className={buttonStyles({ variant: "secondary", size: "sm" })}
                    >
                      Sign in to join
                    </Link>
                  )}
                  <Link
                    href={`/rooms/${room.slug}`}
                    className={buttonStyles({ variant: "ghost", size: "sm" })}
                  >
                    Preview
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

