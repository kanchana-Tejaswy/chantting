"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Minus,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { BEADS_PER_ROUND, type DailySadhana } from "@/lib/domain/sadhana";
import { triggerBeadFeedback } from "@/lib/chant/feedback";
import {
  enqueueOfflineRound,
  readDraftBeadState,
  readOfflineRoundQueue,
  removeOfflineRound,
  writeDraftBeadState,
  type QueuedRoundSubmission,
} from "@/lib/chant/offline-queue";
import type {
  ChantingMethod,
  ChantingRoundRecord,
  ChantingSessionRecord,
  ChantWorkspacePayload,
} from "@/lib/chant/types";
import { JapaMalaWheel } from "@/components/chant/japa-mala-wheel";
import { ChantingSectionTabs } from "@/components/sadhana/chanting-section-tabs";
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
import { ProgressBar, SacredRingProgress } from "@/components/ui/progress";
import { SwitchField } from "@/components/ui/switch";

function makeClientKey(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function subscribeOnlineStatus(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getClientOnlineSnapshot(): boolean {
  return typeof navigator.onLine === "boolean" ? navigator.onLine : true;
}

function getServerOnlineSnapshot(): boolean {
  return true;
}

export interface ChantingWorkspaceProps {
  initialData: ChantWorkspacePayload;
}

export function ChantingWorkspace({ initialData }: ChantingWorkspaceProps) {
  const router = useRouter();
  const [dailySadhana, setDailySadhana] = React.useState<DailySadhana>(
    initialData.dailySadhana
  );
  const [activeSession, setActiveSession] =
    React.useState<ChantingSessionRecord | null>(initialData.recoverableSession);
  const [todaySessions, setTodaySessions] = React.useState<
    ChantingSessionRecord[]
  >(initialData.todaySessions);
  const [todayRecords, setTodayRecords] = React.useState<ChantingRoundRecord[]>(
    initialData.todayRecords
  );

  const [method, setMethod] = React.useState<ChantingMethod>(
    initialData.recoverableSession?.method ??
      initialData.preferences.defaultCountingMethod
  );
  const [beadCount, setBeadCount] = React.useState<number>(
    () => initialData.recoverableSession?.current_bead_count ?? 0
  );

  const [soundEnabled, setSoundEnabled] = React.useState(
    initialData.preferences.soundFeedbackEnabled
  );
  const [tactileEnabled, setTactileEnabled] = React.useState(
    initialData.preferences.tactileFeedbackEnabled
  );

  const [queuedRounds, setQueuedRounds] = React.useState<QueuedRoundSubmission[]>(
    []
  );
  const isOnline = React.useSyncExternalStore(
    subscribeOnlineStatus,
    getClientOnlineSnapshot,
    getServerOnlineSnapshot
  );
  const [isSubmittingRound, setIsSubmittingRound] = React.useState(false);
  const [isSessionBusy, setIsSessionBusy] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(
    initialData.recoverableSession
      ? `Recovered ${initialData.recoverableSession.status} ${
          initialData.recoverableSession.method === "japa_mala"
            ? "Japa Mala"
            : "manual"
        } session.`
      : null
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState<string>("");
  const [elapsedSeconds, setElapsedSeconds] = React.useState<number>(() => {
    const s = initialData.recoverableSession;
    if (!s) return 0;
    const endMs = Date.parse(s.paused_at ?? s.last_activity_at);
    return Number.isFinite(endMs)
      ? Math.max(0, Math.floor((endMs - Date.parse(s.started_at)) / 1000))
      : 0;
  });

  const beadSyncTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const hasHydratedDraftRef = React.useRef(false);
  const inFlightSubmitRef = React.useRef(false);
  const inFlightSessionPromiseRef =
    React.useRef<Promise<ChantingSessionRecord | null> | null>(null);

  const isPaused =
    method === "japa_mala" &&
    activeSession?.method === "japa_mala" &&
    activeSession.status === "paused";
  const latestRecord = todayRecords[0] ?? null;

  // Session duration tick while active
  React.useEffect(() => {
    if (!activeSession || activeSession.status !== "active") {
      return;
    }
    const updateClock = () => {
      const started = Date.parse(activeSession.started_at);
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    };
    updateClock();
    const id = setInterval(updateClock, 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  // Persist bead draft locally whenever beadCount changes after draft hydration
  React.useEffect(() => {
    if (!hasHydratedDraftRef.current) return;
    if (activeSession && method === "japa_mala") {
      writeDraftBeadState(initialData.userId, {
        sessionId: activeSession.id,
        currentBeadCount: beadCount,
        updatedAt: new Date().toISOString(),
      });
    }
  }, [activeSession, beadCount, initialData.userId, method]);

  const flushBeadProgress = React.useCallback(
    async (sessionId: string, nextBead: number, keepalive = false) => {
      try {
        await fetch("/api/chant/sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          keepalive,
          body: JSON.stringify({
            sessionId,
            currentBeadCount: Math.min(Math.max(0, nextBead), 107),
          }),
        });
      } catch {
        // Draft stays preserved in localStorage until reconnected
      }
    },
    []
  );

  // Flush bead progress when tab goes hidden
  React.useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === "hidden" &&
        activeSession &&
        method === "japa_mala"
      ) {
        void flushBeadProgress(activeSession.id, beadCount, true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [activeSession, beadCount, flushBeadProgress, method]);

  const ensureActiveSession = React.useCallback(
    async (targetMethod: ChantingMethod): Promise<ChantingSessionRecord | null> => {
      if (
        activeSession &&
        (activeSession.status === "active" || activeSession.status === "paused") &&
        activeSession.method === targetMethod
      ) {
        return activeSession;
      }

      if (inFlightSessionPromiseRef.current) {
        return inFlightSessionPromiseRef.current;
      }

      const promise = (async () => {
        setIsSessionBusy(true);
        setErrorMessage(null);
        try {
          const res = await fetch("/api/chant/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              method: targetMethod,
              clientSessionKey: makeClientKey("sess"),
            }),
          });
          const json = (await res.json()) as {
            session?: ChantingSessionRecord;
            error?: string;
          };
          if (!res.ok || !json.session) {
            throw new Error(json.error ?? "Unable to start chanting session.");
          }
          const created = json.session;
          setActiveSession(created);
          setTodaySessions((prev) => [
            created,
            ...prev.filter((s) => s.id !== created.id),
          ]);
          setElapsedSeconds(0);
          return created;
        } catch (err) {
          setErrorMessage(
            err instanceof Error ? err.message : "Could not start session."
          );
          return null;
        } finally {
          setIsSessionBusy(false);
          inFlightSessionPromiseRef.current = null;
        }
      })();

      inFlightSessionPromiseRef.current = promise;
      return promise;
    },
    [activeSession]
  );

  const submitRoundToServer = React.useCallback(
    async (payload: QueuedRoundSubmission): Promise<boolean> => {
      const res = await fetch("/api/chant/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as {
        duplicate?: boolean;
        record?: ChantingRoundRecord;
        daily_sadhana?: DailySadhana;
        session?: ChantingSessionRecord | null;
        error?: string;
      };

      if (!res.ok || !json.daily_sadhana || !json.record) {
        throw new Error(json.error ?? "Could not save completed round.");
      }

      setDailySadhana(json.daily_sadhana);
      const savedRecord = json.record;
      setTodayRecords((prev) =>
        prev.some((r) => r.id === savedRecord.id)
          ? prev
          : [savedRecord, ...prev]
      );

      if (json.session) {
        const updatedSession = json.session;
        setActiveSession((curr) =>
          curr?.id === updatedSession.id ? updatedSession : curr
        );
        setTodaySessions((prev) =>
          prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
        );
      }

      router.refresh();
      return true;
    },
    [router]
  );

  const syncOfflineQueue = React.useCallback(async () => {
    const pending = readOfflineRoundQueue(initialData.userId);
    if (pending.length === 0) return;

    for (const item of pending) {
      try {
        await submitRoundToServer(item);
        const remaining = removeOfflineRound(initialData.userId, item.idempotencyKey);
        setQueuedRounds(remaining);
      } catch {
        break;
      }
    }
  }, [initialData.userId, submitRoundToServer]);

  // Hydrate client-only localStorage drafts/queue & sync queued rounds after SSR hydration
  React.useEffect(() => {
    const hydrateTimer = setTimeout(() => {
      const recovered = initialData.recoverableSession;
      if (recovered) {
        const localDraft = readDraftBeadState(initialData.userId);
        if (localDraft && localDraft.sessionId === recovered.id) {
          setBeadCount((prev) => Math.max(prev, localDraft.currentBeadCount));
        }
      }
      hasHydratedDraftRef.current = true;

      const storedQueue = readOfflineRoundQueue(initialData.userId);
      if (storedQueue.length > 0) {
        setQueuedRounds(storedQueue);
      }

      if (getClientOnlineSnapshot()) {
        void syncOfflineQueue();
      }
    }, 0);

    const onOnline = () => {
      void syncOfflineQueue();
    };
    window.addEventListener("online", onOnline);

    return () => {
      clearTimeout(hydrateTimer);
      window.removeEventListener("online", onOnline);
    };
  }, [initialData.recoverableSession, initialData.userId, syncOfflineQueue]);

  const recordCompletedRound = React.useCallback(
    async (targetMethod: ChantingMethod, sessionOverride?: ChantingSessionRecord | null) => {
      if (inFlightSubmitRef.current) return;
      inFlightSubmitRef.current = true;
      setIsSubmittingRound(true);
      setErrorMessage(null);

      try {
        const session =
          targetMethod === "japa_mala"
            ? (sessionOverride ?? (await ensureActiveSession(targetMethod)))
            : null;

        const submission: QueuedRoundSubmission = {
          idempotencyKey: makeClientKey("round"),
          method: targetMethod,
          sessionId: session?.id ?? null,
          clientRecordedAt: new Date().toISOString(),
        };

        if (typeof navigator !== "undefined" && !navigator.onLine) {
          const updatedQueue = enqueueOfflineRound(initialData.userId, submission);
          setQueuedRounds(updatedQueue);
          setStatusMessage(
            "Offline: completed round queued safely and will sync automatically."
          );
          setAnnouncement("Round queued offline");
          return;
        }

        try {
          await submitRoundToServer(submission);
          setStatusMessage("Completed round recorded.");
          setAnnouncement("Round completed and saved");
        } catch (err) {
          // Preserve submission in offline queue if network failed transiently
          const msg = err instanceof Error ? err.message : "Network error";
          const updatedQueue = enqueueOfflineRound(initialData.userId, submission);
          setQueuedRounds(updatedQueue);
          setErrorMessage(
            `${msg}. Your round is queued safely and can be retried.`
          );
        }
      } finally {
        inFlightSubmitRef.current = false;
        setIsSubmittingRound(false);
      }
    },
    [ensureActiveSession, initialData.userId, submitRoundToServer]
  );

  const handleAdvanceBead = React.useCallback(async () => {
    if (isPaused || isSubmittingRound || inFlightSubmitRef.current) return;

    let session = activeSession;
    if (!session || session.method !== "japa_mala" || session.status === "completed") {
      session = await ensureActiveSession("japa_mala");
      if (!session) return;
    }

    const nextBead = beadCount + 1;

    if (nextBead >= BEADS_PER_ROUND) {
      // 108th bead completes exactly one round and resets bead count to 0
      triggerBeadFeedback({
        soundEnabled,
        tactileEnabled,
        isRoundComplete: true,
      });
      setBeadCount(0);
      writeDraftBeadState(initialData.userId, {
        sessionId: session.id,
        currentBeadCount: 0,
        updatedAt: new Date().toISOString(),
      });
      await recordCompletedRound("japa_mala", session);
      return;
    }

    triggerBeadFeedback({
      soundEnabled,
      tactileEnabled,
      isRoundComplete: false,
    });
    setBeadCount(nextBead);
    if (nextBead === 27 || nextBead === 54 || nextBead === 81) {
      setAnnouncement(`${nextBead} of ${BEADS_PER_ROUND} beads`);
    }

    if (beadSyncTimerRef.current) {
      clearTimeout(beadSyncTimerRef.current);
    }
    const sessionId = session.id;
    beadSyncTimerRef.current = setTimeout(() => {
      void flushBeadProgress(sessionId, nextBead);
    }, 650);
  }, [
    activeSession,
    beadCount,
    ensureActiveSession,
    flushBeadProgress,
    initialData.userId,
    isPaused,
    isSubmittingRound,
    recordCompletedRound,
    soundEnabled,
    tactileEnabled,
  ]);

  const handleUndoBead = React.useCallback(async () => {
    if (beadCount <= 0 || isPaused) return;
    const prevBead = beadCount - 1;
    setBeadCount(prevBead);
    if (activeSession) {
      await flushBeadProgress(activeSession.id, prevBead);
    }
  }, [activeSession, beadCount, flushBeadProgress, isPaused]);

  const handleUndoRound = React.useCallback(
    async (recordId: string) => {
      setIsSubmittingRound(true);
      setErrorMessage(null);
      try {
        const res = await fetch("/api/chant/rounds/undo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordId, reason: "user_undo" }),
        });
        const json = (await res.json()) as {
          daily_sadhana?: DailySadhana;
          session?: ChantingSessionRecord | null;
          error?: string;
        };
        if (!res.ok || !json.daily_sadhana) {
          throw new Error(json.error ?? "Unable to undo round.");
        }
        setDailySadhana(json.daily_sadhana);
        setTodayRecords((prev) => prev.filter((r) => r.id !== recordId));
        if (json.session) {
          const updated = json.session;
          setActiveSession((curr) => (curr?.id === updated.id ? updated : curr));
          setTodaySessions((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s))
          );
        }
        setStatusMessage("Last recorded round reverted.");
        setAnnouncement("Last recorded round reverted");
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Could not undo round."
        );
      } finally {
        setIsSubmittingRound(false);
      }
    },
    [router]
  );

  const handleSessionStatus = React.useCallback(
    async (nextStatus: "paused" | "active" | "completed") => {
      if (!activeSession) return;
      setIsSessionBusy(true);
      setErrorMessage(null);
      try {
        const res = await fetch("/api/chant/sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: activeSession.id,
            status: nextStatus,
            currentBeadCount: method === "japa_mala" ? beadCount : 0,
          }),
        });
        const json = (await res.json()) as {
          session?: ChantingSessionRecord;
          error?: string;
        };
        if (!res.ok || !json.session) {
          throw new Error(json.error ?? "Could not update session.");
        }
        const updated = json.session;
        setTodaySessions((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
        if (nextStatus === "completed") {
          setActiveSession(null);
          setBeadCount(0);
          writeDraftBeadState(initialData.userId, null);
          setStatusMessage("Session finished and saved to today's history.");
        } else {
          setActiveSession(updated);
          setStatusMessage(
            nextStatus === "paused"
              ? "Session paused. Your bead progress is preserved."
              : "Session resumed."
          );
        }
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Session update failed."
        );
      } finally {
        setIsSessionBusy(false);
      }
    },
    [activeSession, beadCount, initialData.userId, method, router]
  );

  const handleStartNewSession = React.useCallback(
    async (targetMethod: ChantingMethod) => {
      if (activeSession && activeSession.status !== "completed") {
        await handleSessionStatus("completed");
      }
      setMethod(targetMethod);
      setBeadCount(0);
      writeDraftBeadState(initialData.userId, null);
      const created = await ensureActiveSession(targetMethod);
      if (created) {
        setStatusMessage(
          `Started a new ${targetMethod === "japa_mala" ? "Digital Japa Mala" : "Manual"} session.`
        );
      }
    },
    [activeSession, ensureActiveSession, handleSessionStatus, initialData.userId]
  );

  const handleTogglePreference = React.useCallback(
    async (key: "sound" | "tactile", nextValue: boolean) => {
      if (key === "sound") setSoundEnabled(nextValue);
      else setTactileEnabled(nextValue);

      try {
        await fetch("/api/chant/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            key === "sound"
              ? { soundFeedbackEnabled: nextValue }
              : { tactileFeedbackEnabled: nextValue }
          ),
        });
      } catch {
        // Non-blocking preference save
      }
    },
    []
  );

  const handleSwitchMethod = React.useCallback(
    async (nextMethod: ChantingMethod) => {
      if (nextMethod === method) return;
      if (activeSession && activeSession.status !== "completed") {
        // Preserve current partial session as paused before starting/switching
        await fetch("/api/chant/sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: activeSession.id,
            status: "paused",
            currentBeadCount: method === "japa_mala" ? beadCount : 0,
          }),
        });
        setActiveSession(null);
      }
      setMethod(nextMethod);
      setBeadCount(0);
      setStatusMessage(null);
      await fetch("/api/chant/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultCountingMethod: nextMethod }),
      }).catch(() => {});
    },
    [activeSession, beadCount, method]
  );

  const quarterMilestones = [
    { label: "Quarter 1", target: 27 },
    { label: "Halfway", target: 54 },
    { label: "Quarter 3", target: 81 },
    { label: "Complete", target: BEADS_PER_ROUND },
  ] as const;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-5 sm:px-8 sm:py-7">
      {/* Screen-reader milestone announcer */}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {/* Slim Top Section Switcher & Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChantingSectionTabs active="japa" />

        <div className="flex flex-wrap items-center gap-2">
          {!isOnline && (
            <Badge variant="gold">
              <WifiOff className="size-3.5" aria-hidden={true} />
              <span>Offline</span>
            </Badge>
          )}
          {queuedRounds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void syncOfflineQueue()}
            >
              <RefreshCw className="size-3.5" aria-hidden={true} />
              <span>Sync queued ({queuedRounds.length})</span>
            </Button>
          )}
          {method === "japa_mala" && (
            <Badge variant="neutral" className="tabular-nums">
              Duration {formatDuration(elapsedSeconds)}
            </Badge>
          )}
        </div>
      </div>

      {/* Slim Daily Goal Overview Strip (keeps interactive Mala above the fold) */}
      <div className="rounded-[16px] border border-sandalwood-border bg-paper px-4 py-3.5 shadow-sacred-sm sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-serif text-xl font-semibold text-peacock-deep tabular-nums sm:text-2xl">
              {dailySadhana.completed_rounds} /{" "}
              {dailySadhana.effective_daily_target}
            </span>
            <span className="text-xs font-medium text-ink-muted">
              rounds done today
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted tabular-nums">
            <span>
              {dailySadhana.remaining_balance === 0
                ? "Daily goal completed"
                : `${dailySadhana.remaining_balance} remaining`}
            </span>
            {dailySadhana.extra_rounds > 0 && (
              <Badge variant="gold">+{dailySadhana.extra_rounds} extra</Badge>
            )}
          </div>
        </div>

        <ProgressBar
          value={dailySadhana.completed_rounds}
          max={dailySadhana.effective_daily_target}
          label="Today's progress"
          showValueLabel={false}
          tone={dailySadhana.remaining_balance === 0 ? "peacock" : "gold"}
          className="mt-2.5"
        />
      </div>

      {/* Simple Mode Switcher with Friendly Subtitles */}
      <div
        role="tablist"
        aria-label="Chanting counting method"
        className="mx-auto grid max-w-lg grid-cols-2 gap-1.5 rounded-[14px] border border-sandalwood-border bg-linen p-1.5"
      >
        {(
          [
            {
              id: "japa_mala",
              label: "Digital Japa Mala",
              hint: "108 beads 1 by 1",
            },
            {
              id: "manual",
              label: "Manual Counter",
              hint: "1 whole round (+1)",
            },
          ] as const
        ).map((tab) => {
          const active = method === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => void handleSwitchMethod(tab.id)}
              className={cn(
                "flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-[10px] px-3 py-1.5 text-center transition-[transform,background-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]",
                active
                  ? "bg-paper text-ink shadow-sacred-sm ring-1 ring-gold-border/35"
                  : "text-ink-muted hover:bg-paper/60 hover:text-ink ks-glow-ghost"
              )}
            >
              <span className="text-sm font-semibold">{tab.label}</span>
              <span className="text-[11px] opacity-80">{tab.hint}</span>
            </button>
          );
        })}
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-[12px] border border-kumkum/30 bg-kumkum-wash px-4 py-3 text-sm text-kumkum"
        >
          {errorMessage}
        </div>
      )}

      {initialData.pendingOptionalOffer && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-gold-border/45 bg-gold-wash px-4 py-3 text-xs text-ink">
          <span>
            You have{" "}
            <strong className="font-medium tabular-nums">
              {initialData.pendingOptionalOffer.pendingRounds} pending rounds
            </strong>{" "}
            from {initialData.pendingOptionalOffer.fromDate} awaiting your
            optional carry-forward choice.
          </span>
          <Link
            href="/sadhana"
            className={buttonStyles({ variant: "gold", size: "sm" })}
          >
            Review on Dashboard
          </Link>
        </div>
      )}

      {statusMessage && !errorMessage && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-[12px] border border-peacock-green/25 bg-tulsi-wash px-4 py-2.5 text-xs text-peacock-ink"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden={true} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Primary Visual Interactive Sanctuary */}
      <Card surface="elevated" className="p-5 sm:p-8">
        {method === "japa_mala" ? (
          <div className="space-y-5">
            {/* Visual Quarter-Round Cadence Strip */}
            <div
              aria-label="Current round milestones"
              className="mx-auto grid max-w-md grid-cols-4 gap-2"
            >
              {quarterMilestones.map((step) => {
                const reached = beadCount >= step.target;
                return (
                  <div
                    key={step.target}
                    className={cn(
                      "rounded-[10px] border px-2 py-1.5 text-center transition-colors duration-200",
                      reached
                        ? "border-gold-border/60 bg-gold-wash text-gold-ink"
                        : "border-sandalwood-border/80 bg-linen/60 text-ink-muted"
                    )}
                  >
                    <p className="font-serif text-sm font-semibold tabular-nums">
                      {step.target}
                    </p>
                    <p className="text-[10px] font-medium">{step.label}</p>
                  </div>
                );
              })}
            </div>

            <JapaMalaWheel
              currentBead={beadCount}
              isPaused={isPaused}
              isBusy={isSubmittingRound}
              onAdvanceBead={() => void handleAdvanceBead()}
              sessionRounds={activeSession?.rounds_completed ?? 0}
              todayRounds={dailySadhana.completed_rounds}
            />

            <p className="mx-auto max-w-md text-center text-xs leading-relaxed text-ink-muted">
              Tap the center circle (or button below) for each chant. Partial
              bead progress does not count toward completed rounds until bead{" "}
              {BEADS_PER_ROUND} is reached.
            </p>

            {/* Clear Primary & Undo Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="gold"
                size="lg"
                disabled={isPaused || isSubmittingRound}
                onClick={() => void handleAdvanceBead()}
                className="min-w-44"
              >
                <Plus className="size-4" strokeWidth={2} aria-hidden={true} />
                <span>Next bead ({Math.min(beadCount + 1, BEADS_PER_ROUND)})</span>
              </Button>

              <Button
                variant="secondary"
                size="lg"
                disabled={beadCount === 0 || isPaused}
                onClick={() => void handleUndoBead()}
              >
                <RotateCcw className="size-4" strokeWidth={1.75} aria-hidden={true} />
                <span>Undo bead</span>
              </Button>

              {latestRecord && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="md"
                      disabled={isSubmittingRound}
                    >
                      <Minus className="size-4" strokeWidth={1.75} aria-hidden={true} />
                      <span>Undo last round</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent
                    title="Undo last completed round?"
                    description="This reverts your most recently recorded round and updates today's remaining balance."
                    confirmLabel="Revert round"
                    destructive
                    onConfirm={() => void handleUndoRound(latestRecord.id)}
                  />
                </AlertDialog>
              )}
            </div>

            {/* Session Pause / Resume / Finish / New Controls (Japa Mala only) */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 border-t border-sandalwood-border pt-5">
              {activeSession && (
                <>
                  {isPaused ? (
                    <Button
                      variant="gold"
                      size="md"
                      loading={isSessionBusy}
                      onClick={() => void handleSessionStatus("active")}
                    >
                      <Play className="size-4" strokeWidth={1.75} aria-hidden={true} />
                      <span>Resume session</span>
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="md"
                      loading={isSessionBusy}
                      onClick={() => void handleSessionStatus("paused")}
                    >
                      <Pause className="size-4" strokeWidth={1.75} aria-hidden={true} />
                      <span>Pause session</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="md"
                    loading={isSessionBusy}
                    onClick={() => void handleSessionStatus("completed")}
                  >
                    <span>Finish session</span>
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                size="md"
                disabled={isSessionBusy}
                onClick={() => void handleStartNewSession(method)}
              >
                <Plus className="size-4" strokeWidth={1.75} aria-hidden={true} />
                <span>Start new session</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center space-y-6 py-4 text-center">
            <SacredRingProgress
              value={dailySadhana.completed_rounds}
              max={dailySadhana.effective_daily_target}
              label="Today's manual chanting progress"
              size={148}
              strokeWidth={9}
            />

            <div>
              <p className="text-xs font-medium tracking-wide uppercase text-ink-muted">
                Manual Round Counter
              </p>
              <p className="mt-1 font-serif text-5xl font-semibold text-ink tabular-nums">
                {dailySadhana.completed_rounds}{" "}
                <span className="text-xl font-normal text-ink-muted">
                  / {dailySadhana.effective_daily_target} rounds
                </span>
              </p>
              <p className="mt-1.5 text-sm text-ink-muted tabular-nums">
                Rounds today: {dailySadhana.completed_rounds} · Remaining:{" "}
                {dailySadhana.remaining_balance}
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              disabled={isSubmittingRound}
              loading={isSubmittingRound}
              onClick={() => void recordCompletedRound("manual")}
              className="min-h-16 w-full max-w-xs rounded-[16px] text-base font-semibold"
            >
              <Plus className="size-5" strokeWidth={2} aria-hidden={true} />
              <span>Add 1 completed round</span>
            </Button>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="md"
                disabled={!latestRecord || isSubmittingRound}
                onClick={() =>
                  latestRecord && void handleUndoRound(latestRecord.id)
                }
              >
                <RotateCcw className="size-4" strokeWidth={1.75} aria-hidden={true} />
                <span>Undo last round</span>
              </Button>

              {latestRecord && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="md"
                      disabled={isSubmittingRound}
                    >
                      <Minus className="size-4" strokeWidth={1.75} aria-hidden={true} />
                      <span>Decrement (-1)</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent
                    title="Decrement completed rounds?"
                    description="Confirming will revert your most recently recorded round from today's Sadhana history."
                    confirmLabel="Decrement 1 round"
                    destructive
                    onConfirm={() => void handleUndoRound(latestRecord.id)}
                  />
                </AlertDialog>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Tactile & Audio Settings + Session History */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card surface="parchment">
          <CardHeader>
            <CardTitle className="text-lg">Feedback Preferences</CardTitle>
            <CardDescription>
              Saved privately to your user preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SwitchField
              id="chant-sound"
              label="Gentle audio chime"
              description="Soft bead click and 108th-bead completion bell."
              checked={soundEnabled}
              onCheckedChange={(v) => void handleTogglePreference("sound", v)}
            />
            <SwitchField
              id="chant-tactile"
              label="Tactile vibration"
              description="Subtle haptic pulse on supported mobile devices."
              checked={tactileEnabled}
              onCheckedChange={(v) => void handleTogglePreference("tactile", v)}
            />
          </CardContent>
        </Card>

        <Card surface="parchment">
          <CardHeader>
            <CardTitle className="text-lg">Today&apos;s Sessions &amp; Rounds</CardTitle>
            <CardDescription>
              Multiple sessions per day update the same daily practice total.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaySessions.length === 0 && todayRecords.length === 0 ? (
              <p className="rounded-[10px] border border-sandalwood-border bg-linen px-4 py-3 text-sm text-ink-muted">
                No sessions recorded yet today. Tap above to begin.
              </p>
            ) : (
              <ul className="divide-y divide-sandalwood-border">
                {todaySessions.slice(0, 5).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {s.method === "japa_mala" ? "Japa Mala" : "Manual"} session
                      </p>
                      <p className="text-xs text-ink-muted tabular-nums">
                        Started {s.started_at.slice(11, 16)} UTC · {s.status}
                        {s.method === "japa_mala" && s.current_bead_count > 0
                          ? ` (${s.current_bead_count}/${BEADS_PER_ROUND})`
                          : ""}
                      </p>
                    </div>
                    <Badge variant="peacock">
                      {s.rounds_completed}{" "}
                      {s.rounds_completed === 1 ? "round" : "rounds"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
