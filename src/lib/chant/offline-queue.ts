import type { ChantingMethod } from "./types";

export interface QueuedRoundSubmission {
  idempotencyKey: string;
  method: ChantingMethod;
  sessionId: string | null;
  clientRecordedAt: string;
}

export interface LocalDraftBeadState {
  sessionId: string;
  currentBeadCount: number;
  updatedAt: string;
}

const QUEUE_PREFIX = "ks:offline-rounds:v1:";
const DRAFT_PREFIX = "ks:draft-beads:v1:";

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readOfflineRoundQueue(userId: string): QueuedRoundSubmission[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(`${QUEUE_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is QueuedRoundSubmission =>
        Boolean(item) &&
        typeof item.idempotencyKey === "string" &&
        item.idempotencyKey.length >= 8 &&
        (item.method === "manual" || item.method === "japa_mala") &&
        typeof item.clientRecordedAt === "string"
    );
  } catch {
    return [];
  }
}

export function writeOfflineRoundQueue(
  userId: string,
  queue: QueuedRoundSubmission[]
): void {
  if (!hasStorage()) return;
  try {
    if (queue.length === 0) {
      window.localStorage.removeItem(`${QUEUE_PREFIX}${userId}`);
    } else {
      window.localStorage.setItem(`${QUEUE_PREFIX}${userId}`, JSON.stringify(queue));
    }
  } catch {
    // Ignore storage quota issues safely
  }
}

export function enqueueOfflineRound(
  userId: string,
  submission: QueuedRoundSubmission
): QueuedRoundSubmission[] {
  const existing = readOfflineRoundQueue(userId);
  if (existing.some((item) => item.idempotencyKey === submission.idempotencyKey)) {
    return existing;
  }
  const next = [...existing, submission];
  writeOfflineRoundQueue(userId, next);
  return next;
}

export function removeOfflineRound(
  userId: string,
  idempotencyKey: string
): QueuedRoundSubmission[] {
  const existing = readOfflineRoundQueue(userId);
  const next = existing.filter((item) => item.idempotencyKey !== idempotencyKey);
  writeOfflineRoundQueue(userId, next);
  return next;
}

export function readDraftBeadState(userId: string): LocalDraftBeadState | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(`${DRAFT_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalDraftBeadState>;
    if (
      typeof parsed.sessionId === "string" &&
      typeof parsed.currentBeadCount === "number" &&
      parsed.currentBeadCount >= 0 &&
      parsed.currentBeadCount <= 107
    ) {
      return {
        sessionId: parsed.sessionId,
        currentBeadCount: parsed.currentBeadCount,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeDraftBeadState(
  userId: string,
  draft: LocalDraftBeadState | null
): void {
  if (!hasStorage()) return;
  try {
    if (!draft) {
      window.localStorage.removeItem(`${DRAFT_PREFIX}${userId}`);
    } else {
      window.localStorage.setItem(`${DRAFT_PREFIX}${userId}`, JSON.stringify(draft));
    }
  } catch {
    // Ignore storage quota issues safely
  }
}

