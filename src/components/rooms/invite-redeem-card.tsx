"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import type { RoomShareMode } from "@/lib/rooms/analytics";
import { cn } from "@/lib/cn";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SHARE_OPTIONS: ReadonlyArray<{
  value: RoomShareMode;
  label: string;
  desc: string;
}> = [
  {
    value: "completion_only",
    label: "Completion only (Recommended)",
    desc: "Shares only when you meet your daily commitment, hiding exact counts.",
  },
  {
    value: "full",
    label: "Full daily rounds",
    desc: "Shares your daily round counts with room members.",
  },
  {
    value: "private",
    label: "Private",
    desc: "Participate silently without sharing round counts or completion milestones.",
  },
];

export function InviteRedeemCard({ token }: { token: string }) {
  const router = useRouter();
  const [shareMode, setShareMode] =
    React.useState<RoomShareMode>("completion_only");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleAccept = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/rooms/invitations/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawToken: token, shareMode }),
      });
      const json = (await res.json()) as {
        roomSlug?: string | null;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Unable to redeem invitation.");
      }
      router.push(json.roomSlug ? `/rooms/${json.roomSlug}` : "/rooms");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not accept invitation."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-12">
      <Card surface="elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[10px] bg-krishna-midnight text-gold-antique">
              <KeyRound className="size-5" aria-hidden={true} />
            </span>
            <div>
              <CardTitle className="font-display text-2xl">
                Accept Room Invitation
              </CardTitle>
              <CardDescription>
                Choose how your chanting progress is shared in this room.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {error && (
            <div
              role="alert"
              className="rounded-[10px] border border-kumkum/30 bg-kumkum-wash px-3.5 py-2.5 text-xs text-kumkum"
            >
              {error}
            </div>
          )}

          {SHARE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-[12px] border p-3.5 transition-colors",
                shareMode === opt.value
                  ? "border-peacock-deep bg-tulsi-wash/60"
                  : "border-sandalwood-border bg-paper hover:bg-linen"
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="radio"
                  name="inviteShareMode"
                  value={opt.value}
                  checked={shareMode === opt.value}
                  onChange={() => setShareMode(opt.value)}
                  className="accent-peacock-deep"
                />
                {opt.label}
              </span>
              <span className="text-xs text-ink-muted">{opt.desc}</span>
            </label>
          ))}
        </CardContent>

        <CardFooter className="justify-between">
          <Link
            href="/rooms"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            Cancel
          </Link>
          <Button
            variant="primary"
            size="md"
            loading={submitting}
            onClick={() => void handleAccept()}
          >
            Join chanting room
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

