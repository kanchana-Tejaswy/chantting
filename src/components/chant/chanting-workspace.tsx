"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  Calculator,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Gauge,
  History,
  Minus,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Timer,
  TimerOff,
  Undo2,
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
  ManualCounterState,
  ManualNameEntryRecord,
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
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import type { SadhanaDayDetailPayload } from "@/lib/sadhana/queries";
import {
  getYesterdayDateString,
  formatShortDate,
  formatReadableDateWithWeekday,
  getClientRecordedAtForDate,
} from "@/lib/chant/date-utils";
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

  // Manual Name Counter with Persistent Remainder State
  const [manualState, setManualState] = React.useState<ManualCounterState>(
    initialData.manualCounterState ?? {
      cumulative_names: 0,
      cumulative_rounds: 0,
      current_remainder: 0,
      last_entry: null,
      active_session: null,
    }
  );
  const [manualEntries, setManualEntries] = React.useState<ManualNameEntryRecord[]>(
    initialData.manualEntries ?? []
  );
  const [manualNamesInput, setManualNamesInput] = React.useState<string>("");
  const [manualSessionOption, setManualSessionOption] = React.useState<"continue" | "new">("continue");
  const [manualSubMode, setManualSubMode] = React.useState<"japa_mala" | "digital_counter">("japa_mala");
  const [isSubmittingManual, setIsSubmittingManual] = React.useState(false);
  const [isUndoingManual, setIsUndoingManual] = React.useState(false);

  const parsedEnteredNames = React.useMemo(() => {
    const clean = manualNamesInput.trim();
    if (!clean) return 0;
    const val = parseInt(clean, 10);
    return Number.isFinite(val) && val > 0 ? val : 0;
  }, [manualNamesInput]);

  const currentManualRemainder = manualState.current_remainder ?? 0;
  const combinedManualNames = currentManualRemainder + parsedEnteredNames;
  const newlyEarnedManualRounds = Math.floor(combinedManualNames / BEADS_PER_ROUND);
  const newPreservedManualRemainder = combinedManualNames % BEADS_PER_ROUND;
  const manualNamesNeededForNext =
    newPreservedManualRemainder === 0 ? BEADS_PER_ROUND : BEADS_PER_ROUND - newPreservedManualRemainder;

  const activeManualSession = React.useMemo(() => {
    if (activeSession && activeSession.method === "manual") {
      return activeSession;
    }
    const todayManual = todaySessions.find((s) => s.method === "manual");
    return todayManual ?? null;
  }, [activeSession, todaySessions]);

  const latestActiveManualEntry = React.useMemo(() => {
    return manualEntries.find((e) => !e.is_reverted) ?? null;
  }, [manualEntries]);

  const todayDateStr = dailySadhana.sadhana_date;
  const yesterdayDateStr = React.useMemo(
    () => getYesterdayDateString(todayDateStr),
    [todayDateStr]
  );
  const [attributionDate, setAttributionDate] = React.useState<"today" | "yesterday">("today");
  const [isYesterdayHistoryOpen, setIsYesterdayHistoryOpen] = React.useState(false);
  const [yesterdayDetail, setYesterdayDetail] = React.useState<SadhanaDayDetailPayload | null>(null);
  const [isLoadingYesterday, setIsLoadingYesterday] = React.useState(false);
  const [isSubmittingYesterday, setIsSubmittingYesterday] = React.useState(false);
  const [undoingRecordId, setUndoingRecordId] = React.useState<string | null>(null);
  const [yesterdayCustomNames, setYesterdayCustomNames] = React.useState("");

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

  // Optional Session Timer & Duration Tracking preference (persisted locally)
  const [isTimerEnabled, setIsTimerEnabled] = React.useState<boolean>(true);

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`smaran_timer_enabled_${initialData.userId}`);
      if (saved !== null) {
        setIsTimerEnabled(saved === "true");
      }
    } catch {
      // ignore in environments without localStorage
    }
  }, [initialData.userId]);

  const handleToggleTimer = React.useCallback(
    (enabled: boolean) => {
      setIsTimerEnabled(enabled);
      try {
        window.localStorage.setItem(
          `smaran_timer_enabled_${initialData.userId}`,
          String(enabled)
        );
      } catch {
        // ignore
      }
      setStatusMessage(
        enabled
          ? "Session timer enabled. Duration tracking is active."
          : "Session timer turned off. Timeless chanting mode active."
      );
      setAnnouncement(enabled ? "Session timer turned on" : "Session timer turned off");
    },
    [initialData.userId]
  );

  const isPaused = Boolean(
    activeSession &&
    activeSession.method === method &&
    activeSession.status === "paused"
  );
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
              mantraId: activeMantra?.id || null,
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

        const recordedAt = attributionDate === "yesterday"
          ? getClientRecordedAtForDate(yesterdayDateStr)
          : new Date().toISOString();

        const submission: QueuedRoundSubmission = {
          idempotencyKey: makeClientKey("round"),
          method: targetMethod,
          sessionId: attributionDate === "yesterday" ? null : (session?.id ?? null),
          clientRecordedAt: recordedAt,
          sankalpaId: dedicateToSankalpa && activeSankalpa?.id ? activeSankalpa.id : null,
          mantraId: activeMantra?.id || null,
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
          setStatusMessage(
            attributionDate === "yesterday"
              ? `Completed round recorded for Yesterday (${formatShortDate(yesterdayDateStr)}).`
              : "Completed round recorded."
          );
          setAnnouncement(
            attributionDate === "yesterday"
              ? `Round completed for Yesterday (${formatShortDate(yesterdayDateStr)})`
              : "Round completed and saved"
          );
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
      attributionDate,
      dedicateToSankalpa,
      ensureActiveSession,
      initialData.userId,
      submitRoundToServer,
      yesterdayDateStr,
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

  const handleRecordManualNames = React.useCallback(
    async (explicitNamesCount?: number) => {
      const namesCountToRecord = explicitNamesCount ?? parsedEnteredNames;
      if (namesCountToRecord <= 0 || isSubmittingManual) return;
      setIsSubmittingManual(true);
      setErrorMessage(null);

      const shouldContinue = manualSessionOption === "continue" && Boolean(activeManualSession);
      const idempotencyKey = makeClientKey("manual-names");
      const recordedAt = attributionDate === "yesterday"
        ? getClientRecordedAtForDate(yesterdayDateStr)
        : new Date().toISOString();

      try {
        const res = await fetch("/api/chant/manual-names", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            namesCount: namesCountToRecord,
            idempotencyKey,
            sessionId: attributionDate === "yesterday" ? null : (shouldContinue && activeManualSession?.id ? activeManualSession.id : null),
            startNewSession: attributionDate === "yesterday" ? true : !shouldContinue,
            clientRecordedAt: recordedAt,
            sankalpaId: dedicateToSankalpa && activeSankalpa?.id ? activeSankalpa.id : null,
            mantraId: activeMantra?.id || null,
          }),
        });

        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error ?? "Failed to record manual names.");
        }

        if (json.counter_state) {
          setManualState(json.counter_state);
        }
        if (json.entry) {
          setManualEntries((prev) => [
            json.entry,
            ...prev.filter((e) => e.id !== json.entry.id),
          ]);
        }
        if (json.daily_sadhana) {
          setDailySadhana(json.daily_sadhana);
        }
        if (json.sankalpa) {
          if (json.sankalpa.status === "completed") {
            setActiveSankalpa(null);
            setDedicateToSankalpa(false);
          } else {
            setActiveSankalpa(json.sankalpa);
          }
        }
        if (json.session) {
          setActiveSession(json.session);
          setTodaySessions((prev) => [
            json.session,
            ...prev.filter((s) => s.id !== json.session.id),
          ]);
        }

        if (attributionDate === "yesterday") {
          setStatusMessage(
            `Recorded ${namesCountToRecord.toLocaleString()} names for Yesterday (${formatShortDate(yesterdayDateStr)}): ${json.rounds_earned} round${json.rounds_earned > 1 ? "s" : ""} credited to yesterday's sadhana!`
          );
          setAnnouncement(`${json.rounds_earned} round${json.rounds_earned > 1 ? "s" : ""} credited to yesterday`);
        } else if (json.rounds_earned > 0) {
          triggerBeadFeedback({
            soundEnabled,
            tactileEnabled,
            isRoundComplete: true,
          });
          setStatusMessage(
            `Recorded ${namesCountToRecord.toLocaleString()} names: ${json.rounds_earned} round${json.rounds_earned > 1 ? "s" : ""} credited! Remainder preserved: ${json.current_remainder} names.`
          );
          setAnnouncement(`${json.rounds_earned} round${json.rounds_earned > 1 ? "s" : ""} credited`);
        } else {
          triggerBeadFeedback({
            soundEnabled,
            tactileEnabled,
            isRoundComplete: false,
          });
          setStatusMessage(
            `Recorded ${namesCountToRecord.toLocaleString()} names. Remainder balance is now ${json.current_remainder} / 108 names.`
          );
          setAnnouncement(`${namesCountToRecord} names added to remainder`);
        }

        if (!explicitNamesCount) {
          setManualNamesInput("");
        }
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to record manual names."
        );
      } finally {
        setIsSubmittingManual(false);
      }
    },
    [
      activeManualSession,
      activeMantra,
      activeSankalpa,
      attributionDate,
      dedicateToSankalpa,
      isSubmittingManual,
      manualSessionOption,
      parsedEnteredNames,
      router,
      soundEnabled,
      tactileEnabled,
      yesterdayDateStr,
    ]
  );

  const handleUndoManualEntry = React.useCallback(async (entryId: string) => {
    if (isUndoingManual) return;
    setIsUndoingManual(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/chant/manual-names/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, reason: "devotee_undo" }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed to undo manual entry.");
      }

      if (json.counter_state) {
        setManualState(json.counter_state);
      }
      if (json.entry) {
        setManualEntries((prev) =>
          prev.map((e) => (e.id === json.entry.id ? json.entry : e))
        );
      }
      if (json.daily_sadhana) {
        setDailySadhana(json.daily_sadhana);
      }
      if (json.sankalpa) {
        setActiveSankalpa(json.sankalpa);
      }
      if (json.session) {
        setActiveSession(json.session);
        setTodaySessions((prev) =>
          prev.map((s) => (s.id === json.session.id ? json.session : s))
        );
      }

      setStatusMessage(
        `Reverted entry of ${json.entry?.names_count ?? 0} names. Restored remainder to ${json.counter_state?.current_remainder ?? 0} names.`
      );
      setAnnouncement("Manual entry reverted");
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to revert manual entry."
      );
    } finally {
      setIsUndoingManual(false);
    }
  }, [isUndoingManual, router]);

  const handleOpenYesterdayHistory = React.useCallback(async () => {
    setIsYesterdayHistoryOpen(true);
    setIsLoadingYesterday(true);
    try {
      const res = await fetch(
        `/api/sadhana/day-detail?date=${encodeURIComponent(yesterdayDateStr)}`
      );
      if (res.ok) {
        const json = (await res.json()) as SadhanaDayDetailPayload;
        setYesterdayDetail(json);
      }
    } catch {
      // Graceful preview handling
    } finally {
      setIsLoadingYesterday(false);
    }
  }, [yesterdayDateStr]);

  const handleQuickRecordForYesterday = React.useCallback(
    async (namesCount: number) => {
      if (namesCount <= 0 || isSubmittingYesterday) return;
      setIsSubmittingYesterday(true);
      setErrorMessage(null);
      try {
        const recordedAt = getClientRecordedAtForDate(yesterdayDateStr);
        const res = await fetch("/api/chant/manual-names", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            namesCount,
            idempotencyKey: makeClientKey("yesterday-names"),
            startNewSession: true,
            clientRecordedAt: recordedAt,
            mantraId: activeMantra?.id || null,
          }),
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error ?? "Failed to save yesterday's entry.");
        }
        if (json.counter_state) {
          setManualState(json.counter_state);
        }
        setStatusMessage(
          `Added ${namesCount.toLocaleString()} names to Yesterday (${formatShortDate(yesterdayDateStr)}): ${json.rounds_earned} round(s) credited!`
        );
        const ref = await fetch(
          `/api/sadhana/day-detail?date=${encodeURIComponent(yesterdayDateStr)}`
        );
        if (ref.ok) {
          setYesterdayDetail((await ref.json()) as SadhanaDayDetailPayload);
        }
        setYesterdayCustomNames("");
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to record for yesterday."
        );
      } finally {
        setIsSubmittingYesterday(false);
      }
    },
    [yesterdayDateStr, isSubmittingYesterday, activeMantra?.id, router]
  );

  const handleUndoYesterdayRecord = React.useCallback(
    async (recordId: string) => {
      if (undoingRecordId) return;
      setUndoingRecordId(recordId);
      setErrorMessage(null);
      try {
        const res = await fetch("/api/chant/rounds/undo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordId, reason: "devotee_yesterday_edit" }),
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error ?? "Failed to revert yesterday's round.");
        }
        setStatusMessage("Reverted round from yesterday's history.");
        const ref = await fetch(
          `/api/sadhana/day-detail?date=${encodeURIComponent(yesterdayDateStr)}`
        );
        if (ref.ok) {
          setYesterdayDetail((await ref.json()) as SadhanaDayDetailPayload);
        }
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to revert record."
        );
      } finally {
        setUndoingRecordId(null);
      }
    },
    [undoingRecordId, yesterdayDateStr, router]
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

          {/* Optional Session Timer Toggle */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleToggleTimer(!isTimerEnabled)}
            className={cn(
              "flex items-center gap-1.5 text-xs rounded-xl border px-3 py-1.5 transition-all shadow-2xs",
              isTimerEnabled
                ? "border-peacock-green/50 bg-tulsi-wash/70 text-peacock-deep font-medium hover:border-peacock-green"
                : "border-sandalwood-border/80 bg-paper text-ink-muted hover:text-ink hover:border-gold-border/70"
            )}
            title={isTimerEnabled ? "Optional Session Timer: Enabled (tap to disable)" : "Optional Session Timer: Disabled (tap to enable)"}
          >
            {isTimerEnabled ? (
              <Timer className="size-3.5 text-peacock-deep" aria-hidden={true} />
            ) : (
              <TimerOff className="size-3.5 text-ink-muted" aria-hidden={true} />
            )}
            <span className="hidden sm:inline">Timer: {isTimerEnabled ? "On" : "Off"}</span>
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
          {isTimerEnabled && activeSession && (
            <Badge
              variant="neutral"
              className="tabular-nums flex items-center gap-1.5 border-sandalwood-border/70 bg-paper/90 text-ink shadow-2xs font-medium"
            >
              <Clock className="size-3 text-gold-antique" aria-hidden={true} />
              <span>Duration {formatDuration(elapsedSeconds)}</span>
              {activeSession.status === "paused" && (
                <span className="text-[10px] text-gold-ink font-semibold ml-0.5">(Paused)</span>
              )}
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
              hint: "108 names = 1 round",
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

      {/* Sādhana Date Attribution Selector (Today vs Yesterday) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sandalwood-border/80 bg-paper/95 p-3 sm:px-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <Calendar className="size-3.5 text-gold-antique" aria-hidden={true} />
            <span>Sādhana Date:</span>
          </span>

          <div
            role="radiogroup"
            aria-label="Sādhana attribution date"
            className="inline-flex rounded-xl border border-sandalwood-border/70 bg-linen/60 p-0.5"
          >
            <button
              type="button"
              role="radio"
              aria-checked={attributionDate === "today"}
              onClick={() => setAttributionDate("today")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                attributionDate === "today"
                  ? "bg-paper text-ink shadow-2xs border border-sandalwood-border/60"
                  : "text-ink-muted hover:text-ink"
              )}
            >
              Today ({formatShortDate(todayDateStr)})
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={attributionDate === "yesterday"}
              onClick={() => setAttributionDate("yesterday")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                attributionDate === "yesterday"
                  ? "bg-amber-100 text-amber-950 shadow-2xs border border-amber-300 font-bold"
                  : "text-ink-muted hover:text-ink"
              )}
            >
              <span>🌙 Yesterday</span>
              <span className="text-[11px] opacity-80 font-normal">
                ({formatShortDate(yesterdayDateStr)})
              </span>
            </button>
          </div>
        </div>

        {/* View & Edit Yesterday's History Action */}
        <button
          type="button"
          onClick={() => void handleOpenYesterdayHistory()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-sandalwood-border/80 bg-paper px-3 py-1.5 text-xs font-semibold text-gold-ink hover:text-ink hover:border-gold-border shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
        >
          <History className="size-3.5 text-gold-antique" aria-hidden={true} />
          <span>View &amp; Edit Yesterday&apos;s History</span>
        </button>
      </div>

      {/* Amber Banner when recording for Yesterday */}
      {attributionDate === "yesterday" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50/90 to-amber-100/60 p-3.5 text-xs text-amber-950 shadow-2xs animate-in fade-in-50 duration-150">
          <div className="flex items-start gap-2.5">
            <Sparkles className="size-4 text-amber-700 shrink-0 mt-0.5" aria-hidden={true} />
            <div className="space-y-0.5">
              <p className="font-semibold text-amber-950">
                Recording for Yesterday · {formatReadableDateWithWeekday(yesterdayDateStr)}
              </p>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                Forgot to record last night? Any round or names logged now will be attributed directly to yesterday&apos;s Sādhana, fulfilling yesterday&apos;s daily target and protecting your streak.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAttributionDate("today")}
            className="rounded-xl border border-amber-300 bg-paper px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
          >
            Switch to Today
          </button>
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
          <div className="mx-auto max-w-xl space-y-6 py-2">
            {/* Header: Today's Rounds & Persistent Remainder Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-2xl border border-sandalwood-border/80 bg-paper/90 p-4 shadow-2xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Today's Manual Rounds
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-serif text-3xl font-bold tabular-nums text-ink">
                    {dailySadhana.completed_rounds}
                  </span>
                  <span className="text-xs text-ink-muted">
                    / {dailySadhana.effective_daily_target} target
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-muted tabular-nums">
                  {dailySadhana.remaining_balance === 0
                    ? "Target met 🎉"
                    : `${dailySadhana.remaining_balance} remaining`}
                </p>
              </div>

              <div className="rounded-2xl border border-gold-border/70 bg-gold-wash/60 p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-ink">
                    Persistent Remainder
                  </p>
                  <span className="text-[10px] font-medium text-ink-muted">
                    108 names = 1 round
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-serif text-3xl font-bold tabular-nums text-lotus-ruby">
                    {currentManualRemainder}
                  </span>
                  <span className="text-xs text-ink-muted">/ 108 names</span>
                </div>
                <ProgressBar
                  value={currentManualRemainder}
                  max={BEADS_PER_ROUND}
                  label="Unconverted remainder progress"
                  showValueLabel={false}
                  tone="gold"
                  className="mt-2"
                />
              </div>
            </div>

            {/* Optional Session Timer & Controls for Manual Counter */}
            {isTimerEnabled && (
              activeSession ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sandalwood-border/80 bg-paper/95 p-3.5 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gold-wash border border-gold-border/60 text-gold-ink">
                      <Clock className="size-4" aria-hidden={true} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-ink">
                          Manual Chanting Session
                        </span>
                        <span className="text-xs font-serif font-bold text-peacock-deep tabular-nums">
                          {formatDuration(elapsedSeconds)}
                        </span>
                        {activeSession.status === "paused" && (
                          <span className="rounded-md bg-gold-wash px-1.5 py-0.5 text-[10px] font-bold text-gold-ink border border-gold-border/50">
                            Paused
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-muted">
                        {activeSession.rounds_completed} rounds credited in this session
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeSession.status === "paused" ? (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={isSessionBusy}
                        onClick={() => void handleSessionStatus("active")}
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold"
                      >
                        <Play className="size-3 mr-1 fill-current" strokeWidth={1.75} aria-hidden={true} />
                        <span>Resume session</span>
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={isSessionBusy}
                        onClick={() => void handleSessionStatus("paused")}
                        className="rounded-xl border border-sandalwood-border/80 bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:border-gold-border"
                      >
                        <Pause className="size-3 mr-1" strokeWidth={1.75} aria-hidden={true} />
                        <span>Pause session</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      loading={isSessionBusy}
                      onClick={() => void handleSessionStatus("completed")}
                      className="rounded-xl border border-sandalwood-border/80 bg-paper px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink hover:border-sandalwood-strong"
                    >
                      <span>Finish session</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isSessionBusy}
                      onClick={() => void handleStartNewSession("manual")}
                      className="rounded-xl px-2.5 py-1.5 text-xs text-ink-muted hover:text-ink"
                    >
                      <Plus className="size-3 mr-1" strokeWidth={1.75} aria-hidden={true} />
                      <span>New session</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-sandalwood-border/80 bg-paper/60 px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2 text-ink-muted">
                    <Timer className="size-3.5 text-gold-antique shrink-0" aria-hidden={true} />
                    <span>Optional session timer active · Track duration for your manual sadhana</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSessionBusy}
                    onClick={() => void handleStartNewSession("manual")}
                    className="rounded-xl border-sandalwood-border/80 bg-paper px-3 py-1 text-xs font-semibold text-peacock-deep hover:border-gold-border transition-all"
                  >
                    <Plus className="size-3 mr-1 text-gold-antique" strokeWidth={2} aria-hidden={true} />
                    <span>Start Timed Session</span>
                  </Button>
                </div>
              )
            )}

            {/* Two Selectable Modes within Manual Counter */}
            <div
              role="tablist"
              aria-label="Manual counting modes"
              className="grid grid-cols-2 gap-1.5 rounded-2xl border border-sandalwood-border/80 bg-linen/70 p-1.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={manualSubMode === "japa_mala"}
                onClick={() => setManualSubMode("japa_mala")}
                className={cn(
                  "flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-xl px-3 py-2 text-center transition-all duration-150 active:scale-[0.97]",
                  manualSubMode === "japa_mala"
                    ? "bg-paper text-ink shadow-xs border border-sandalwood-border/60 font-semibold"
                    : "text-ink-muted hover:bg-paper/60 hover:text-ink"
                )}
              >
                <span className="text-sm font-semibold">Japa Mala — +1 Round</span>
                <span className="text-[11px] opacity-75">Physical 108-bead Mala</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={manualSubMode === "digital_counter"}
                onClick={() => setManualSubMode("digital_counter")}
                className={cn(
                  "flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-xl px-3 py-2 text-center transition-all duration-150 active:scale-[0.97]",
                  manualSubMode === "digital_counter"
                    ? "bg-paper text-ink shadow-xs border border-sandalwood-border/60 font-semibold"
                    : "text-ink-muted hover:bg-paper/60 hover:text-ink"
                )}
              >
                <span className="text-sm font-semibold">Digital Counter — Enter Names</span>
                <span className="text-[11px] opacity-75">Electronic clicker machine</span>
              </button>
            </div>

            {manualSubMode === "japa_mala" ? (
              /* Mode A: Japa Mala for devotees chanting with a physical 108-bead Mala */
              <div className="rounded-2xl border border-sandalwood-border/90 bg-paper p-5 sm:p-6 shadow-xs space-y-5">
                <div className="text-left">
                  <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                    <span aria-hidden={true}>📿</span>
                    <span>Physical 108-Bead Japa Mala</span>
                  </h3>
                  <p className="text-xs text-ink-muted mt-1">
                    Chant with your physical Tulsi or Neem Japa beads. Every completed round logs exactly 108 sacred names while preserving your unconverted remainder balance.
                  </p>
                </div>

                {/* Big Prominent +1 Round Button */}
                <Button
                  variant="primary"
                  size="lg"
                  disabled={isSubmittingManual}
                  loading={isSubmittingManual}
                  onClick={() => void handleRecordManualNames(108)}
                  className="min-h-16 w-full rounded-2xl text-lg font-bold shadow-sacred-sm active:scale-[0.97]"
                >
                  <Plus className="size-6 mr-2" strokeWidth={2.4} aria-hidden={true} />
                  <span>+1 Round (108 Names)</span>
                </Button>

                {/* Multiple Round Entries */}
                <div className="space-y-2 pt-1 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Multiple Round Entries
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { rounds: 2, label: "+2 Rounds", names: 216 },
                      { rounds: 4, label: "+4 Rounds", names: 432 },
                      { rounds: 8, label: "+8 Rounds", names: 864 },
                      { rounds: 16, label: "+16 Rounds", names: 1728 },
                    ].map((item) => (
                      <Button
                        key={item.rounds}
                        variant="outline"
                        size="md"
                        disabled={isSubmittingManual}
                        onClick={() => void handleRecordManualNames(item.names)}
                        className="flex flex-col items-center justify-center rounded-xl border-sandalwood-border/80 bg-linen/50 hover:bg-paper hover:border-gold-border py-2.5 h-auto text-ink transition-all active:scale-[0.97]"
                      >
                        <span className="text-xs font-bold">{item.label}</span>
                        <span className="text-[10px] text-ink-muted">{item.names} names</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Mode B: Digital Counter for devotees using an electronic physical counting machine */
              <div className="rounded-2xl border border-sandalwood-border/90 bg-paper p-5 sm:p-6 shadow-xs space-y-4">
                <div>
                  <label
                    htmlFor="manual-names-input"
                    className="block text-sm font-semibold text-ink"
                  >
                    Enter Sacred Names Chanted
                  </label>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Enter the exact count of names displayed on your electronic counting machine (e.g. 250 names).
                  </p>

                  <div className="relative mt-2.5">
                    <input
                      id="manual-names-input"
                      type="number"
                      min="1"
                      step="1"
                      value={manualNamesInput}
                      onChange={(e) => setManualNamesInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && parsedEnteredNames > 0) {
                          e.preventDefault();
                          void handleRecordManualNames();
                        }
                      }}
                      placeholder="Enter names chanted, e.g. 250"
                      className="w-full rounded-2xl border border-sandalwood-strong/80 bg-paper px-4 py-3.5 text-xl sm:text-2xl font-serif font-bold tabular-nums text-ink placeholder:text-ink-muted/50 focus:border-gold-antique focus:outline-none focus:ring-2 focus:ring-gold-antique/20"
                    />
                    {manualNamesInput && (
                      <button
                        type="button"
                        onClick={() => setManualNamesInput("")}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg bg-linen px-2.5 py-1 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Preset Increment Chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-ink-muted">
                    Quick increment chips:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "+108 (1 round)", count: 108 },
                      { label: "+216 (2 rounds)", count: 216 },
                      { label: "+250 names", count: 250 },
                      { label: "+500 names", count: 500 },
                      { label: "+1,080 (10 rounds)", count: 1080 },
                    ].map((chip) => (
                      <button
                        key={chip.count}
                        type="button"
                        onClick={() =>
                          setManualNamesInput(String((parsedEnteredNames || 0) + chip.count))
                        }
                        className="rounded-xl border border-sandalwood-border/80 bg-linen/50 hover:bg-paper hover:border-gold-border px-3 py-1.5 text-xs font-medium text-ink transition-all active:scale-[0.97]"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Mathematical Conversion Breakdown */}
                {parsedEnteredNames > 0 && (
                  <div className="rounded-2xl border border-gold-border/60 bg-gold-wash/50 p-4 sm:p-5 text-left text-ink animate-in fade-in-50 duration-150">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-ink">
                      <Calculator className="size-4" aria-hidden={true} />
                      <span>Authoritative Conversion Breakdown</span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                      <div className="rounded-xl bg-paper/90 p-2.5 border border-gold-border/30">
                        <p className="text-[10px] uppercase font-semibold text-ink-muted">Previous</p>
                        <p className="font-serif text-lg font-bold tabular-nums text-ink">
                          {currentManualRemainder}
                        </p>
                      </div>
                      <div className="rounded-xl bg-paper/90 p-2.5 border border-gold-border/30">
                        <p className="text-[10px] uppercase font-semibold text-ink-muted">+ Entered</p>
                        <p className="font-serif text-lg font-bold tabular-nums text-peacock-deep">
                          +{parsedEnteredNames}
                        </p>
                      </div>
                      <div className="rounded-xl bg-paper/90 p-2.5 border border-gold-border/30">
                        <p className="text-[10px] uppercase font-semibold text-ink-muted">= Credited</p>
                        <p className="font-serif text-lg font-bold tabular-nums text-lotus-ruby">
                          {newlyEarnedManualRounds > 0 ? `+${newlyEarnedManualRounds}r` : "0r"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-paper/90 p-2.5 border border-gold-border/30">
                        <p className="text-[10px] uppercase font-semibold text-ink-muted">New Remainder</p>
                        <p className="font-serif text-lg font-bold tabular-nums text-ink">
                          {newPreservedManualRemainder}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gold-border/40 pt-2.5 text-xs text-ink-muted">
                      <span>
                        {newlyEarnedManualRounds > 0
                          ? `🎉 ${newlyEarnedManualRounds * BEADS_PER_ROUND} names convert to ${newlyEarnedManualRounds} round${newlyEarnedManualRounds > 1 ? "s" : ""} credited today.`
                          : `All ${parsedEnteredNames} names will be added to your remainder balance.`}
                      </span>
                      {manualNamesNeededForNext > 0 && (
                        <span className="font-medium text-ink tabular-nums">
                          {manualNamesNeededForNext} more names to complete next round
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Session Association: Continue vs New */}
                <div className="space-y-2 pt-1 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Session Association
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualSessionOption("continue")}
                      className={cn(
                        "flex flex-col rounded-xl border p-3 text-left transition-all",
                        manualSessionOption === "continue"
                          ? "border-peacock-green/70 bg-tulsi-wash/70 shadow-2xs text-ink"
                          : "border-sandalwood-border/60 bg-paper hover:bg-linen/50 text-ink-muted"
                      )}
                    >
                      <span className="text-xs font-bold text-ink">Continue Previous Session</span>
                      <span className="text-[11px] opacity-75 mt-0.5">
                        {activeManualSession
                          ? `Attaches to active manual session (${activeManualSession.rounds_completed} rounds today)`
                          : "Attaches to today's open manual chanting batch"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setManualSessionOption("new")}
                      className={cn(
                        "flex flex-col rounded-xl border p-3 text-left transition-all",
                        manualSessionOption === "new"
                          ? "border-peacock-green/70 bg-tulsi-wash/70 shadow-2xs text-ink"
                          : "border-sandalwood-border/60 bg-paper hover:bg-linen/50 text-ink-muted"
                      )}
                    >
                      <span className="text-xs font-bold text-ink">Start New Session</span>
                      <span className="text-[11px] opacity-75 mt-0.5">
                        Creates fresh session · Remainder of {currentManualRemainder} is preserved
                      </span>
                    </button>
                  </div>
                </div>

                {/* Primary Action Button */}
                <Button
                  variant="primary"
                  size="lg"
                  disabled={parsedEnteredNames <= 0 || isSubmittingManual}
                  loading={isSubmittingManual}
                  onClick={() => void handleRecordManualNames()}
                  className="min-h-14 w-full rounded-2xl text-base font-bold shadow-xs active:scale-[0.98]"
                >
                  <Plus className="size-5 mr-1.5" strokeWidth={2.2} aria-hidden={true} />
                  <span>
                    {parsedEnteredNames <= 0
                      ? "Enter names chanted to record"
                      : newlyEarnedManualRounds > 0
                        ? `Record ${parsedEnteredNames.toLocaleString()} Names (+${newlyEarnedManualRounds} Round${newlyEarnedManualRounds > 1 ? "s" : ""} Earned)`
                        : `Record ${parsedEnteredNames.toLocaleString()} Names (Save ${newPreservedManualRemainder}/108 to Remainder)`}
                  </span>
                </Button>
              </div>
            )}

            {/* Undo Latest Manual Entry */}
            {latestActiveManualEntry && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sandalwood-border/80 bg-paper px-4 py-3 text-xs text-ink shadow-2xs">
                <div>
                  <span className="font-semibold text-ink">Latest Entry:</span>{" "}
                  <span className="tabular-nums text-ink-muted">
                    +{latestActiveManualEntry.names_count} names ({latestActiveManualEntry.rounds_earned} rounds earned, remainder {latestActiveManualEntry.new_remainder})
                  </span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUndoingManual}
                      loading={isUndoingManual}
                      className="rounded-xl border-sandalwood-border/80 text-xs text-ink-muted hover:text-ink hover:border-kumkum/60"
                    >
                      <RotateCcw className="size-3.5 mr-1" strokeWidth={1.75} aria-hidden={true} />
                      <span>Undo this entry</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent
                    title="Undo manual name entry?"
                    description={`This will revert your entry of ${latestActiveManualEntry.names_count} names, restore your remainder to ${latestActiveManualEntry.previous_remainder} names, and revert any credited rounds.`}
                    confirmLabel="Revert entry"
                    destructive
                    onConfirm={() => void handleUndoManualEntry(latestActiveManualEntry.id)}
                  />
                </AlertDialog>
              </div>
            )}

            {/* Recent Manual Entries Audit Trail */}
            {manualEntries.length > 0 && (
              <div className="space-y-2 pt-1 text-left">
                <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
                  <div className="flex items-center gap-1.5">
                    <History className="size-3.5" aria-hidden={true} />
                    <span>Recent Manual Entries</span>
                  </div>
                  <span className="tabular-nums">
                    Cumulative: {manualState.cumulative_names.toLocaleString()} names ({manualState.cumulative_rounds} rounds)
                  </span>
                </div>

                <div className="divide-y divide-sandalwood-border/50 rounded-2xl border border-sandalwood-border/70 bg-paper/80 overflow-hidden shadow-2xs">
                  {manualEntries.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      className={cn(
                        "flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors",
                        entry.is_reverted ? "bg-linen/40 opacity-55 line-through" : "hover:bg-linen/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-serif font-bold text-ink tabular-nums text-sm">
                          +{entry.names_count.toLocaleString()} names
                        </span>
                        <span className="text-[11px] text-ink-muted tabular-nums hidden sm:inline">
                          ({entry.previous_remainder} + {entry.names_count} = {entry.rounds_earned}r + {entry.new_remainder}rem)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={entry.is_reverted ? "neutral" : entry.rounds_earned > 0 ? "peacock" : "gold"}
                          className="text-[10px]"
                        >
                          {entry.is_reverted
                            ? "Reverted"
                            : entry.rounds_earned > 0
                              ? `+${entry.rounds_earned} round${entry.rounds_earned > 1 ? "s" : ""}`
                              : "Remainder saved"}
                        </Badge>
                        <span className="text-[10px] text-ink-muted/80 tabular-nums">
                          {new Date(entry.recorded_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            <SwitchField
              id="chant-timer-enabled"
              label="Optional session timer"
              description="Display live elapsed duration and timer controls across both Digital Japa Mala and Manual Counter."
              checked={isTimerEnabled}
              onCheckedChange={handleToggleTimer}
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
        currentStreak={initialData.currentStreak ?? 0}
        longestStreak={initialData.longestStreak ?? 0}
        lifetimeRounds={initialData.lifetimeRounds}
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
      {/* Yesterday's Sādhana History & Editor Modal */}
      <Dialog open={isYesterdayHistoryOpen} onOpenChange={setIsYesterdayHistoryOpen}>
        <DialogContent
          title={`Yesterday's Sādhana · ${formatReadableDateWithWeekday(yesterdayDateStr)}`}
          description="Review, add, or edit chanting recorded for yesterday."
          className="max-w-lg p-6"
        >
          {isLoadingYesterday ? (
            <div className="flex items-center justify-center py-8 text-xs text-ink-muted">
              <RefreshCw className="size-4 animate-spin mr-2" />
              <span>Loading yesterday&apos;s Sādhana records...</span>
            </div>
          ) : (
            <div className="space-y-5 pt-1">
              {/* Yesterday's Summary Metrics */}
              <div className="grid grid-cols-3 gap-2.5 rounded-2xl border border-gold-border/70 bg-gold-wash/50 p-3.5 text-center">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                    Completed
                  </span>
                  <span className="font-serif text-2xl font-bold text-peacock-deep tabular-nums">
                    {yesterdayDetail?.dailySadhana?.completed_rounds ?? 0}
                  </span>
                  <span className="block text-[10px] text-ink-muted">rounds</span>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                    Target
                  </span>
                  <span className="font-serif text-2xl font-bold text-ink tabular-nums">
                    {yesterdayDetail?.dailySadhana?.effective_daily_target ?? initialData.preferences.dailyRoundTarget}
                  </span>
                  <span className="block text-[10px] text-ink-muted">commitment</span>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                    Status
                  </span>
                  <div className="mt-1 flex items-center justify-center">
                    {(yesterdayDetail?.dailySadhana?.completed_rounds ?? 0) >=
                      (yesterdayDetail?.dailySadhana?.effective_daily_target ?? initialData.preferences.dailyRoundTarget) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-peacock-green/10 px-2 py-0.5 text-[11px] font-bold text-peacock-green">
                        <CheckCircle2 className="size-3" />
                        Target Met 🌸
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-gold-ink">
                        {(yesterdayDetail?.dailySadhana?.remaining_balance ?? 0) > 0
                          ? `${yesterdayDetail?.dailySadhana?.remaining_balance} left`
                          : "0 rounds"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Add to Yesterday */}
              <div className="space-y-2.5 rounded-2xl border border-sandalwood-border/80 bg-paper p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Plus className="size-3.5 text-gold-antique" />
                    <span>Add Chanting to Yesterday</span>
                  </span>
                  <span className="text-[11px] text-ink-muted">108 names = 1 round</span>
                </div>

                {/* Quick Round Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { rounds: 1, names: 108, label: "+1 Round" },
                    { rounds: 2, names: 216, label: "+2 Rounds" },
                    { rounds: 4, names: 432, label: "+4 Rounds" },
                    { rounds: 8, names: 864, label: "+8 Rounds" },
                  ].map((btn) => (
                    <Button
                      key={btn.rounds}
                      variant="outline"
                      size="sm"
                      disabled={isSubmittingYesterday}
                      onClick={() => void handleQuickRecordForYesterday(btn.names)}
                      className="rounded-xl border-sandalwood-border/70 hover:border-gold-border py-2 h-auto text-xs font-semibold active:scale-[0.98]"
                    >
                      <span>{btn.label}</span>
                    </Button>
                  ))}
                </div>

                {/* Custom Name Count Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    min="1"
                    placeholder="Or enter exact names (e.g. 250)"
                    value={yesterdayCustomNames}
                    onChange={(e) => setYesterdayCustomNames(e.target.value)}
                    className="flex-1 min-h-10 rounded-xl border border-sandalwood-border bg-paper px-3 text-xs text-ink placeholder:text-ink-muted/50 focus:border-gold-antique focus:outline-none"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isSubmittingYesterday || !yesterdayCustomNames || parseInt(yesterdayCustomNames, 10) <= 0}
                    loading={isSubmittingYesterday}
                    onClick={() => {
                      const count = parseInt(yesterdayCustomNames, 10);
                      if (count > 0) void handleQuickRecordForYesterday(count);
                    }}
                    className="rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <span>Save</span>
                  </Button>
                </div>
              </div>

              {/* Existing Records for Yesterday (Edit / Undo) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">
                    Recorded Rounds on {formatShortDate(yesterdayDateStr)} ({yesterdayDetail?.records?.length ?? 0})
                  </span>
                  <span className="text-[10px] text-ink-muted">Tap Undo to revert an error</span>
                </div>

                {(!yesterdayDetail?.records || yesterdayDetail.records.length === 0) ? (
                  <div className="rounded-xl border border-dashed border-sandalwood-border/80 bg-linen/40 p-4 text-center text-xs text-ink-muted">
                    No rounds recorded for yesterday yet. Use the buttons above to log any rounds chanted last night!
                  </div>
                ) : (
                  <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                    {yesterdayDetail.records.map((rec, idx) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between rounded-xl border border-sandalwood-border/60 bg-paper p-2.5 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">
                            Round #{yesterdayDetail.records.length - idx}
                          </span>
                          <span className="text-ink-muted">·</span>
                          <span className="capitalize text-ink-muted">
                            {rec.method === "japa_mala" ? "Japa Mala" : "Manual Counter"}
                          </span>
                          <span className="text-[11px] text-ink-muted">
                            {rec.client_recorded_at ? rec.client_recorded_at.slice(11, 16) : rec.recorded_at.slice(11, 16)} UTC
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={undoingRecordId === rec.id}
                          onClick={() => void handleUndoYesterdayRecord(rec.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-kumkum/40 bg-kumkum-wash px-2 py-1 text-[11px] font-semibold text-kumkum hover:bg-kumkum/15 transition-all active:scale-[0.97] cursor-pointer disabled:opacity-50"
                        >
                          <Undo2 className="size-3" />
                          <span>{undoingRecordId === rec.id ? "Reverting..." : "Undo"}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
