"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  Gauge,
  Minus,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { BEADS_PER_ROUND, type DailySadhana } from "@/lib/domain/sadhana";
import { triggerBeadFeedback } from "@/lib/chant/feedback";
import type { SankalpaRecord } from "@/lib/sankalpa/types";
import type { MantraRecord, MantraHistoricalStat } from "@/lib/mantra/types";
import type { ChantingReminderRecord } from "@/lib/reminders/types";
import type { SessionNoteRecord } from "@/lib/notes/types";
import { MantraSelectorDialog } from "@/components/chant/mantra-selector-dialog";
import { InWorkspaceAnalytics } from "@/components/chant/in-workspace-analytics";
import { ChantingRemindersModal } from "@/components/chant/chanting-reminders-modal";
import { DrishtiAmbientMode } from "@/components/chant/drishti-ambient-mode";
import { SessionNotesModal } from "@/components/chant/session-notes-modal";
import { ChantingPaceGuidance } from "@/components/chant/chanting-pace-guidance";
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
  const [activeSankalpa, setActiveSankalpa] = React.useState<SankalpaRecord | null>(
    initialData.activeSankalpa ?? null
  );
  const [dedicateToSankalpa, setDedicateToSankalpa] = React.useState<boolean>(
    Boolean(initialData.activeSankalpa)
  );

  const [method, setMethod] = React.useState<ChantingMethod>(
    initialData.recoverableSession?.method ??
    initialData.preferences.defaultCountingMethod
  );
  const [beadCount, setBeadCount] = React.useState<number>(
    () => initialData.recoverableSession?.current_bead_count ?? 0
  );

  // Mantras, reminders, analytics, notes, and ambient mode state
  const [mantras, setMantras] = React.useState<MantraRecord[]>(
    initialData.mantras ?? []
  );
  const [activeMantra, setActiveMantra] = React.useState<MantraRecord | null>(
    initialData.activeMantra ?? initialData.mantras?.[0] ?? null
  );
  const [preferredMantraId, setPreferredMantraId] = React.useState<string | null>(
    initialData.preferences.preferredMantraId ?? null
  );
  const [mantraStats] = React.useState<MantraHistoricalStat[]>(
    initialData.mantraStats ?? []
  );
  const [reminders, setReminders] = React.useState<ChantingReminderRecord[]>(
    initialData.reminders ?? []
  );
  const [recentNotes, setRecentNotes] = React.useState<SessionNoteRecord[]>(
    initialData.recentNotes ?? []
  );

  const [isMantraDialogOpen, setIsMantraDialogOpen] = React.useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = React.useState(false);
  const [isRemindersOpen, setIsRemindersOpen] = React.useState(false);
  const [isPaceOpen, setIsPaceOpen] = React.useState(false);
  const [isAmbientMode, setIsAmbientMode] = React.useState(
    Boolean(initialData.preferences.ambientModeEnabled)
  );
  const [ambientSound, setAmbientSound] = React.useState(
    Boolean(initialData.preferences.ambientSoundEnabled)
  );
  const [ambientVolume, setAmbientVolume] = React.useState(
    Number(initialData.preferences.ambientSoundVolume ?? 0.5)
  );
  const [paceGuidanceEnabled, setPaceGuidanceEnabled] = React.useState(
    Boolean(initialData.preferences.paceGuidanceEnabled)
  );
  const [paceSecondsPerBead, setPaceSecondsPerBead] = React.useState(
    Number(initialData.preferences.paceSecondsPerBead ?? 7.0)
  );

  const [isNotesModalOpen, setIsNotesModalOpen] = React.useState(false);
  const [sessionForNote, setSessionForNote] =
    React.useState<ChantingSessionRecord | null>(null);

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
      ? `Recovered ${initialData.recoverableSession.status} ${initialData.recoverableSession.method === "japa_mala"
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
              mantraId: activeMantra?.id ?? null,
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
    [activeMantra, activeSession]
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
        sankalpa?: SankalpaRecord | null;
        session?: ChantingSessionRecord | null;
        error?: string;
      };

      if (!res.ok || !json.daily_sadhana || !json.record) {
        throw new Error(json.error ?? "Could not save completed round.");
      }

      setDailySadhana(json.daily_sadhana);
      if (json.sankalpa) {
        if (json.sankalpa.status === "completed") {
          setActiveSankalpa(null);
          setDedicateToSankalpa(false);
        } else {
          setActiveSankalpa(json.sankalpa);
        }
      }
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
          sankalpaId: dedicateToSankalpa && activeSankalpa ? activeSankalpa.id : null,
          mantraId: activeMantra?.id ?? null,
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
    [
      activeMantra,
      activeSankalpa,
      dedicateToSankalpa,
      ensureActiveSession,
      initialData.userId,
      submitRoundToServer,
    ]
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
          sankalpa?: SankalpaRecord | null;
          session?: ChantingSessionRecord | null;
          error?: string;
        };
        if (!res.ok || !json.daily_sadhana) {
          throw new Error(json.error ?? "Unable to undo round.");
        }
        setDailySadhana(json.daily_sadhana);
        if (json.sankalpa) {
          setActiveSankalpa(json.sankalpa);
        }
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
          setSessionForNote(updated);
          setIsNotesModalOpen(true);
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

  const handleSelectMantra = React.useCallback(
    async (mantra: MantraRecord) => {
      setActiveMantra(mantra);
      if (activeSession) {
        try {
          await fetch("/api/chant/sessions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: activeSession.id,
              mantraId: mantra.id,
            }),
          });
          setActiveSession((curr) =>
            curr ? { ...curr, mantra_id: mantra.id } : null
          );
        } catch {
          // non-blocking
        }
      }
    },
    [activeSession]
  );

  const handleSetPreferredMantra = React.useCallback(
    async (mantraId: string) => {
      setPreferredMantraId(mantraId);
      try {
        await fetch("/api/chant/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferredMantraId: mantraId }),
        });
      } catch {
        // non-blocking
      }
    },
    []
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
      }).catch(() => { });
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
          {/* Drishti Ambient Mode */}
          <DrishtiAmbientMode
            isAmbientMode={isAmbientMode}
            onToggleAmbientMode={() => setIsAmbientMode((prev) => !prev)}
            ambientSoundEnabled={ambientSound}
            ambientVolume={ambientVolume}
            onSavePreferences={(sound, vol) => {
              setAmbientSound(sound);
              setAmbientVolume(vol);
              void fetch("/api/chant/preferences", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ambientModeEnabled: isAmbientMode,
                  ambientSoundEnabled: sound,
                  ambientSoundVolume: vol,
                }),
              });
            }}
          />

          {/* Pace Guidance */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPaceOpen(true)}
            className="flex items-center gap-1.5 text-xs rounded-xl border border-sandalwood-border/80 bg-paper hover:border-gold-border/70 hover:shadow-xs px-3 py-1.5 text-ink transition-all"
            title="Chanting Pace Cadence"
          >
            <Gauge className="size-3.5 text-gold-antique" />
            <span className="hidden sm:inline">Pace</span>
          </Button>

          {/* Reminders */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsRemindersOpen(true)}
            className="flex items-center gap-1.5 text-xs rounded-xl border border-sandalwood-border/80 bg-paper hover:border-gold-border/70 hover:shadow-xs px-3 py-1.5 text-ink transition-all"
            title="Sadhana Reminders"
          >
            <Bell className="size-3.5 text-gold-antique" />
            <span className="hidden sm:inline">Reminders</span>
            {reminders.filter((r) => r.is_enabled).length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-gold-wash border border-gold-border/50 text-gold-ink font-semibold rounded-full">
                {reminders.filter((r) => r.is_enabled).length}
              </span>
            )}
          </Button>

          {/* Spiritual Analytics */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAnalyticsOpen(true)}
            className="flex items-center gap-1.5 text-xs rounded-xl border border-sandalwood-border/80 bg-paper hover:border-gold-border/70 hover:shadow-xs px-3 py-1.5 text-ink transition-all"
            title="Spiritual Analytics & Insights"
          >
            <BarChart3 className="size-3.5 text-peacock-deep" />
            <span className="hidden sm:inline">Insights</span>
          </Button>

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

      {/* Active Mantra Banner */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-sandalwood-border/80 bg-paper px-4 py-3.5 text-xs text-ink shadow-xs sm:px-5">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gold-wash border border-gold-border/60 text-gold-ink shadow-2xs">
            <Sparkles className="size-4" aria-hidden={true} />
          </span>
          <div className="truncate space-y-0.5">
            <p className="font-semibold text-ink truncate text-sm">
              {activeMantra?.name ?? "Hare Krishna Mahāmantra"}
            </p>
            <p className="text-xs font-devanagari text-peacock-deep truncate leading-tight font-medium">
              {activeMantra?.sanskrit ??
                "हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे । हरे राम हरे राम राम राम हरे हरे ॥"}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMantraDialogOpen(true)}
          className="shrink-0 text-xs rounded-xl border-sandalwood-border/80 bg-paper hover:border-gold-border px-3 py-1.5"
        >
          Change Mantra
        </Button>
      </div>

      {/* Active Sankalpa Banner & Attribution Toggle */}
      {activeSankalpa && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-peacock-green/30 bg-tulsi-wash/70 px-4 py-3.5 text-xs text-ink shadow-xs sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-paper border border-peacock-green/30 text-peacock-deep shadow-2xs">
              <Sparkles className="size-4" aria-hidden={true} />
            </span>
            <div className="space-y-0.5">
              <p className="font-semibold text-ink text-sm">
                Active Sankalpa: {activeSankalpa.title}
              </p>
              <p className="text-xs text-ink-muted tabular-nums">
                {activeSankalpa.completed_rounds} / {activeSankalpa.target_rounds} rounds completed
                {activeSankalpa.status === "completed"
                  ? " · Vow Completed! 🎉"
                  : ` · ${Math.max(0, activeSankalpa.target_rounds - activeSankalpa.completed_rounds)} remaining`}
              </p>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ink bg-paper/80 border border-peacock-green/20 rounded-xl px-3 py-1.5 hover:bg-paper transition-colors">
            <input
              type="checkbox"
              checked={dedicateToSankalpa}
              onChange={(e) => setDedicateToSankalpa(e.target.checked)}
              className="size-4 rounded accent-peacock-deep"
            />
            <span>Offer rounds to this Sankalpa</span>
          </label>
        </div>
      )}

      {/* Daily Goal Overview Strip */}
      <div className="rounded-2xl border border-sandalwood-border/80 bg-paper p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="font-serif text-2xl font-bold text-ink tabular-nums sm:text-3xl">
              {dailySadhana.completed_rounds} /{" "}
              {dailySadhana.effective_daily_target}
            </span>
            <span className="text-xs font-medium text-ink-muted">
              rounds completed today
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted tabular-nums">
            <span className="font-medium text-ink">
              {dailySadhana.remaining_balance === 0
                ? "Daily target completed 🎉"
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
          className="mt-3.5"
        />
      </div>

      {/* Mode Switcher with Tactile Concentric Pills */}
      <div
        role="tablist"
        aria-label="Chanting counting method"
        className="mx-auto grid max-w-md grid-cols-2 gap-1.5 rounded-2xl border border-sandalwood-border/80 bg-linen/70 p-1.5"
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
                "flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-xl px-3 py-2 text-center transition-all duration-150 active:scale-[0.97]",
                active
                  ? "bg-paper text-ink shadow-xs border border-sandalwood-border/60 font-semibold"
                  : "text-ink-muted hover:bg-paper/60 hover:text-ink"
              )}
            >
              <span className="text-sm font-semibold">{tab.label}</span>
              <span className="text-[11px] opacity-75">{tab.hint}</span>
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
              className="mx-auto grid max-w-md grid-cols-4 gap-1.5 rounded-2xl border border-sandalwood-border/80 bg-linen/60 p-1.5 shadow-2xs"
            >
              {quarterMilestones.map((step) => {
                const reached = beadCount >= step.target;
                const isCurrent =
                  !reached &&
                  (step.target === 27 ? beadCount < 27 : beadCount >= step.target - 27);
                return (
                  <div
                    key={step.target}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-center transition-all duration-200",
                      reached
                        ? "border-peacock-green/40 bg-paper text-peacock-deep shadow-xs font-semibold"
                        : isCurrent
                        ? "border-gold-border/80 bg-paper text-ink shadow-xs ring-1 ring-gold-antique/30"
                        : "border-transparent bg-transparent text-ink-muted/70"
                    )}
                  >
                    <p className="font-serif text-sm sm:text-base font-bold tabular-nums">
                      {step.target}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider">{step.label}</p>
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
              Touch the center sphere or tap below for each sacred mantra. Partial bead progress does not count toward completed rounds until bead{" "}
              {BEADS_PER_ROUND} is reached.
            </p>

            {/* Clear Primary & Undo Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="lg"
                disabled={isPaused || isSubmittingRound}
                onClick={() => void handleAdvanceBead()}
                className="min-w-48 rounded-2xl px-8 py-3.5 text-sm font-bold shadow-xs active:scale-[0.96]"
              >
                <Plus className="size-4 mr-1.5" strokeWidth={2.2} aria-hidden={true} />
                <span>Next bead ({Math.min(beadCount + 1, BEADS_PER_ROUND)})</span>
              </Button>

              <Button
                variant="secondary"
                size="lg"
                disabled={beadCount === 0 || isPaused}
                onClick={() => void handleUndoBead()}
                className="rounded-2xl border border-sandalwood-border/80 bg-paper hover:bg-linen/70 px-5 py-3.5 text-sm font-semibold shadow-2xs active:scale-[0.97]"
              >
                <RotateCcw className="size-4 mr-1.5" strokeWidth={1.75} aria-hidden={true} />
                <span>Undo bead</span>
              </Button>

              {latestRecord && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="md"
                      disabled={isSubmittingRound}
                      className="rounded-xl border-sandalwood-border/80 bg-paper hover:bg-linen/70 px-4 py-2.5 text-xs text-ink-muted hover:text-ink active:scale-[0.97]"
                    >
                      <Minus className="size-3.5 mr-1" strokeWidth={1.75} aria-hidden={true} />
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
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 border-t border-sandalwood-border/60 pt-6">
              {activeSession ? (
                <>
                  {isPaused ? (
                    <Button
                      variant="primary"
                      size="md"
                      loading={isSessionBusy}
                      onClick={() => void handleSessionStatus("active")}
                      className="rounded-xl px-4 py-2 text-xs font-bold"
                    >
                      <Play className="size-3.5 mr-1.5 fill-current" strokeWidth={1.75} aria-hidden={true} />
                      <span>Resume session</span>
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="md"
                      loading={isSessionBusy}
                      onClick={() => void handleSessionStatus("paused")}
                      className="rounded-xl border border-sandalwood-border/80 bg-paper px-4 py-2 text-xs font-semibold text-ink hover:border-gold-border"
                    >
                      <Pause className="size-3.5 mr-1.5" strokeWidth={1.75} aria-hidden={true} />
                      <span>Pause session</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="md"
                    loading={isSessionBusy}
                    onClick={() => void handleSessionStatus("completed")}
                    className="rounded-xl border border-sandalwood-border/80 bg-paper px-4 py-2 text-xs font-medium text-ink-muted hover:text-ink hover:border-sandalwood-strong"
                  >
                    <span>Finish session</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="md"
                    disabled={isSessionBusy}
                    onClick={() => void handleStartNewSession(method)}
                    className="rounded-xl px-3 py-2 text-xs text-ink-muted hover:text-ink"
                  >
                    <Plus className="size-3.5 mr-1" strokeWidth={1.75} aria-hidden={true} />
                    <span>New session</span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="md"
                  disabled={isSessionBusy}
                  onClick={() => void handleStartNewSession(method)}
                  className="rounded-xl border border-sandalwood-border/80 bg-paper px-4 py-2 text-xs font-semibold text-peacock-deep hover:border-gold-border hover:shadow-xs transition-all"
                >
                  <Plus className="size-3.5 mr-1.5 text-gold-antique" strokeWidth={2} aria-hidden={true} />
                  <span>Start New Chanting Session</span>
                </Button>
              )}
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
                {todaySessions.slice(0, 5).map((s) => {
                  const existingNote = recentNotes.find((n) => n.session_id === s.id);
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink flex items-center gap-1.5">
                          <span>{s.method === "japa_mala" ? "Japa Mala" : "Manual"} session</span>
                          {existingNote && (
                            <span title="Devotional reflection recorded" className="text-gold">
                              <BookOpen className="size-3.5 inline" />
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-ink-muted tabular-nums">
                          Started {s.started_at.slice(11, 16)} UTC · {s.status}
                          {s.method === "japa_mala" && s.current_bead_count > 0
                            ? ` (${s.current_bead_count}/${BEADS_PER_ROUND})`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSessionForNote(s);
                            setIsNotesModalOpen(true);
                          }}
                          className="text-xs px-2 py-1 h-auto text-ink-muted hover:text-gold"
                          title="Add or view devotional reflection"
                        >
                          <BookOpen className="size-3.5 mr-1" />
                          {existingNote ? "View Note" : "Reflect"}
                        </Button>
                        <Badge variant="peacock">
                          {s.rounds_completed}{" "}
                          {s.rounds_completed === 1 ? "round" : "rounds"}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mantra Selector Dialog */}
      <MantraSelectorDialog
        isOpen={isMantraDialogOpen}
        onClose={() => setIsMantraDialogOpen(false)}
        mantras={mantras}
        activeMantra={activeMantra}
        preferredMantraId={preferredMantraId}
        onSelectMantra={handleSelectMantra}
        onSetPreferredMantra={handleSetPreferredMantra}
        onMantraCreated={(m) => setMantras((prev) => [...prev, m])}
        onMantraUpdated={(m) =>
          setMantras((prev) => prev.map((item) => (item.id === m.id ? m : item)))
        }
        onMantraDeleted={(id) =>
          setMantras((prev) => prev.filter((item) => item.id !== id))
        }
      />

      {/* In-Workspace Analytics Modal */}
      <InWorkspaceAnalytics
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        dailySadhana={dailySadhana}
        todaySessions={todaySessions}
        todayRecords={todayRecords}
        mantraStats={mantraStats}
      />

      {/* Chanting Reminders Modal */}
      <ChantingRemindersModal
        isOpen={isRemindersOpen}
        onClose={() => setIsRemindersOpen(false)}
        reminders={reminders}
        userTimezone={initialData.timezone}
        onReminderAdded={(r) => setReminders((prev) => [...prev, r])}
        onReminderUpdated={(r) =>
          setReminders((prev) => prev.map((item) => (item.id === r.id ? r : item)))
        }
        onReminderDeleted={(id) =>
          setReminders((prev) => prev.filter((item) => item.id !== id))
        }
      />

      {/* Pace Guidance Modal */}
      <ChantingPaceGuidance
        isOpen={isPaceOpen}
        onClose={() => setIsPaceOpen(false)}
        initialEnabled={paceGuidanceEnabled}
        initialSecondsPerBead={paceSecondsPerBead}
        onSavePreferences={(enabled, secs) => {
          setPaceGuidanceEnabled(enabled);
          setPaceSecondsPerBead(secs);
          void fetch("/api/chant/preferences", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paceGuidanceEnabled: enabled,
              paceSecondsPerBead: secs,
            }),
          });
        }}
      />

      {/* Session Reflection Notes Modal */}
      {sessionForNote && (
        <SessionNotesModal
          isOpen={isNotesModalOpen}
          onClose={() => {
            setIsNotesModalOpen(false);
            setSessionForNote(null);
          }}
          sessionId={sessionForNote.id}
          sessionRounds={sessionForNote.rounds_completed}
          sessionDate={sessionForNote.sadhana_date}
          initialNote={
            recentNotes.find((n) => n.session_id === sessionForNote.id) ?? null
          }
          onNoteSaved={(note) => {
            setRecentNotes((prev) => [
              note,
              ...prev.filter((n) => n.session_id !== note.session_id),
            ]);
            setStatusMessage("Devotional reflection saved to your sanctuary.");
          }}
        />
      )}
    </div>
  );
}
