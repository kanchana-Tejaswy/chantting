import type { DailySadhana } from "@/lib/domain/sadhana";
import type { PendingOptionalCarryOffer } from "@/lib/sadhana/carry-forward";

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
}

export interface ChantWorkspacePayload {
  userId: string;
  userEmail: string | null;
  displayName: string;
  timezone: string;
  preferences: {
    dailyRoundTarget: number;
    defaultCountingMethod: ChantingMethod;
    tactileFeedbackEnabled: boolean;
    soundFeedbackEnabled: boolean;
    carryForwardPolicy: "automatic" | "optional" | "fresh_daily" | "custom";
  };
  dailySadhana: DailySadhana;
  pendingOptionalOffer: PendingOptionalCarryOffer | null;
  recoverableSession: ChantingSessionRecord | null;
  todaySessions: ChantingSessionRecord[];
  todayRecords: ChantingRoundRecord[];
}

