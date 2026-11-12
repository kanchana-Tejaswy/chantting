"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
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
import { ProgressBar } from "@/components/ui/progress";
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
  const [beadCount, setBeadCount] = React.useState<number>(() => {
    const recovered = initialData.recoverableSession;
    if (!recovered) return 0;
    const localDraft = readDraftBeadState(initialData.userId);
    if (localDraft && localDraft.sessionId === recovered.id) {
      return Math.max(recovered.current_bead_count, localDraft.currentBeadCount);
    }
    return recovered.current_bead_count;
  });

  const [soundEnabled, setSoundEnabled] = React.useState(
    initialData.preferences.soundFeedbackEnabled
  );
  const [tactileEnabled, setTactileEnabled] = React.useState(
    initialData.preferences.tactileFeedbackEnabled
  );

  const [queuedRounds, setQueuedRounds] = React.useState<QueuedRoundSubmission[]>(
    () => readOfflineRoundQueue(initialData.userId)
  );
  const [isOnline, setIsOnline] = React.useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
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
    const endMs = s.paused_at ? Date.parse(s.paused_at) : Date.now();
    return Math.max(0, Math.floor((endMs - Date.parse(s.started_at)) / 1000));
  });

  const beadSyncTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const inFlightSubmitRef = React.useRef(false);
  const inFlightSessionPromiseRef =
    React.useRef<Promise<ChantingSessionRecord | null> | null>(null);

  const isPaused = activeSession?.status === "paused";
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

  // Persist bead draft locally whenever beadCount changes
  React.useEffect(() => {
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

  // Monitor online/offline status and sync queued rounds on reconnect
  React.useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      void syncOfflineQueue();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const mountSyncTimer = navigator.onLine
      ? setTimeout(() => {
          void syncOfflineQueue();
        }, 0)
      : null;

    return () => {
      if (mountSyncTimer) clearTimeout(mountSyncTimer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncOfflineQueue]);

  const recordCompletedRound = React.useCallback(
    async (targetMethod: ChantingMethod, sessionOverride?: ChantingSessionRecord | null) => {
      if (inFlightSubmitRef.current) return;
      inFlightSubmitRef.current = true;
      setIsSubmittingRound(true);
      setErrorMessage(null);

      try {
        const session =
          sessionOverride ?? (await ensureActiveSession(targetMethod));

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
      await fetch("/api/chant/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultCountingMethod: nextMethod }),
      }).catch(() => {});
    },
    [activeSession, beadCount, method]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      {/* Screen-reader milestone announcer */}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {/* Top Distraction-Free Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/sadhana"
          className={buttonStyles({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden={true} />
          <span>Dashboard</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
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
          <Badge variant="neutral" className="tabular-nums">
            Duration {formatDuration(elapsedSeconds)}
          </Badge>
        </div>
      </div>

      {/* Method Switcher */}
      <div
        role="tablist"
        aria-label="Chanting counting method"
        className="mx-auto grid max-w-md grid-cols-2 gap-1.5 rounded-[12px] border border-sandalwood-border bg-linen p-1"
      >
        {(
          [
            { id: "japa_mala", label: "Digital Japa Mala" },
            { id: "manual", label: "Manual Counter" },
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
                "min-h-11 cursor-pointer rounded-[8px] px-3 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-paper text-ink shadow-sacred-sm"
                  : "text-ink-muted hover:text-ink"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Authoritative Daily Progress Strip */}
      <Card surface="parchment" className="p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-ink-muted">Completed today</p>
            <p className="mt-0.5 font-serif text-2xl font-semibold text-peacock-ink tabular-nums">
              {dailySadhana.completed_rounds}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Effective target</p>
            <p className="mt-0.5 font-serif text-2xl font-semibold text-ink tabular-nums">
              {dailySadhana.effective_daily_target}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Remaining</p>
            <p className="mt-0.5 font-serif text-2xl font-semibold text-ink tabular-nums">
              {dailySadhana.remaining_balance}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Extra rounds</p>
            <p className="mt-0.5 font-serif text-2xl font-semibold text-gold-ink tabular-nums">
              {dailySadhana.extra_rounds}
            </p>
          </div>
        </div>
        <ProgressBar
          value={dailySadhana.completed_rounds}
          max={dailySadhana.effective_daily_target}
          label="Today's progress"
          tone={dailySadhana.remaining_balance === 0 ? "peacock" : "gold"}
          className="mt-4"
        />
      </Card>

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

      {/* Primary Interactive Surface */}
      <Card surface="elevated" className="p-5 sm:p-8">
        {method === "japa_mala" ? (
          <div className="space-y-6">
            <JapaMalaWheel
              currentBead={beadCount}
              isPaused={isPaused}
              isBusy={isSubmittingRound}
              onAdvanceBead={() => void handleAdvanceBead()}
              sessionRounds={activeSession?.rounds_completed ?? 0}
            />

            <p className="text-center text-xs text-ink-muted">
              Partial bead progress does not count toward completed rounds until
              bead {BEADS_PER_ROUND} is reached.
            </p>

            {/* Quick Japa Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="md"
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
          </div>
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center space-y-6 py-4 text-center">
            <div>
              <p className="text-xs font-medium text-ink-muted">
                Manual Round Counter
              </p>
              <p className="mt-2 font-serif text-6xl font-semibold text-ink tabular-nums">
                {dailySadhana.completed_rounds}
              </p>
              <p className="mt-1 text-sm text-ink-muted tabular-nums">
                Session rounds: {activeSession?.rounds_completed ?? 0} · Remaining:{" "}
                {dailySadhana.remaining_balance}
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              staticPress
              disabled={isPaused || isSubmittingRound}
              loading={isSubmittingRound}
              onClick={() => void recordCompletedRound("manual")}
              className="min-h-16 w-full max-w-xs rounded-[16px] text-base"
            >
              <Plus className="size-5" strokeWidth={2} aria-hidden={true} />
              <span>
                {isPaused ? "Session paused" : "Add 1 completed round"}
              </span>
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

        {/* Session Pause / Resume / Finish / New Controls */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 border-t border-sandalwood-border pt-5">
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
              Multiple sessions per day update the same daily Sadhana total.
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
