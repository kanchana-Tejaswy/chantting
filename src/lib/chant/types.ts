import type { DailySadhana } from "@/lib/domain/sadhana";
import type { PendingOptionalCarryOffer } from "@/lib/sadhana/carry-forward";
import type { SankalpaRecord } from "@/lib/sankalpa/types";
import type { MantraHistoricalStat, MantraRecord } from "@/lib/mantra/types";
import type { ChantingReminderRecord } from "@/lib/reminders/types";
import type { SessionNoteRecord } from "@/lib/notes/types";

export type ChantingMethod = "manual" | "japa_mala";
export type SessionStatus = "active" | "paused" | "completed" | "abandoned";

export interface ChantingSessionRecord {
  id: string;
  user_id: string;
  sadhana_date: string;
  method: ChantingMethod;
  status: SessionStatus;
  current_bead_count: number;
  rounds_completed: number;
  client_session_key: string;
  started_at: string;
  last_activity_at: string;
  paused_at: string | null;
  ended_at: string | null;
  mantra_id?: string | null;
}

export interface ChantingRoundRecord {
  id: string;
  user_id: string;
  session_id: string | null;
  sadhana_date: string;
  method: ChantingMethod;
  round_delta: number;
  idempotency_key: string;
  recorded_at: string;
  client_recorded_at: string | null;
  timezone_snapshot: string;
  is_reverted: boolean;
  sankalpa_id?: string | null;
  mantra_id?: string | null;
  sync_status?: "synced" | "offline_pending";
  manual_entry_id?: string | null;
}

export interface ManualNameEntryRecord {
  id: string;
  user_id: string;
  session_id: string | null;
  sadhana_date: string;
  names_count: number;
  previous_remainder: number;
  rounds_earned: number;
  new_remainder: number;
  cumulative_names_snapshot: number;
  idempotency_key: string;
  recorded_at: string;
  client_recorded_at: string | null;
  timezone_snapshot: string;
  mantra_id?: string | null;
  sankalpa_id?: string | null;
  is_reverted: boolean;
  reverted_at?: string | null;
  revert_reason?: string | null;
  created_at: string;
}

export interface ManualCounterState {
  cumulative_names: number;
  cumulative_rounds: number;
  current_remainder: number;
  last_entry?: ManualNameEntryRecord | null;
  active_session?: ChantingSessionRecord | null;
}

export interface ChantWorkspacePayload {
  userId: string;
  userEmail: string | null;
  displayName: string;
  avatarUrl?: string | null;
  timezone: string;
  preferences: {
    dailyRoundTarget: number;
    defaultCountingMethod: ChantingMethod;
    tactileFeedbackEnabled: boolean;
    soundFeedbackEnabled: boolean;
    carryForwardPolicy: "automatic" | "optional" | "fresh_daily" | "custom";
    preferredMantraId?: string | null;
    ambientModeEnabled?: boolean;
    ambientSoundEnabled?: boolean;
    ambientSoundVolume?: number;
    paceGuidanceEnabled?: boolean;
    paceSecondsPerBead?: number;
  };
  dailySadhana: DailySadhana;
  pendingOptionalOffer: PendingOptionalCarryOffer | null;
  recoverableSession: ChantingSessionRecord | null;
  todaySessions: ChantingSessionRecord[];
  todayRecords: ChantingRoundRecord[];
  activeSankalpa?: SankalpaRecord | null;
  mantras?: MantraRecord[];
  activeMantra?: MantraRecord | null;
  mantraStats?: MantraHistoricalStat[];
  reminders?: ChantingReminderRecord[];
  recentNotes?: SessionNoteRecord[];
  currentStreak?: number;
  longestStreak?: number;
  lifetimeRounds?: number;
  manualCounterState?: ManualCounterState | null;
  manualEntries?: ManualNameEntryRecord[];
}
