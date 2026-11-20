import type { ChantingMethod } from "./types";

export interface QueuedRoundSubmission {
  idempotencyKey: string;
  method: ChantingMethod;
  sessionId: string | null;
  clientRecordedAt: string;
  sankalpaId?: string | null;
  mantraId?: string | null;
}

export interface LocalDraftBeadState {
  sessionId: string;
  currentBeadCount: number;
  updatedAt: string;
}

const QUEUE_PREFIX = "ks:offline-rounds:v1:";
const DRAFT_PREFIX = "ks:draft-beads:v1:";

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    return window.localStorage;
  }
  if (typeof localStorage !== "undefined") {
    return localStorage;
  }
  return null;
}

export function hasStorage(): boolean {
  return getStorage() !== null;
}

export function readOfflineRoundQueue(userId: string): QueuedRoundSubmission[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(`${QUEUE_PREFIX}${userId}`);
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
  const storage = getStorage();
  if (!storage) return;
  try {
    if (queue.length === 0) {
      storage.removeItem(`${QUEUE_PREFIX}${userId}`);
    } else {
      storage.setItem(`${QUEUE_PREFIX}${userId}`, JSON.stringify(queue));
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

export function clearOfflineRoundQueue(userId: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(`${QUEUE_PREFIX}${userId}`);
  } catch {
    // Ignore storage errors safely
  }
}

export function readDraftBeadState(userId: string): LocalDraftBeadState | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(`${DRAFT_PREFIX}${userId}`);
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
  const storage = getStorage();
  if (!storage) return;
  try {
    if (!draft) {
      storage.removeItem(`${DRAFT_PREFIX}${userId}`);
    } else {
      storage.setItem(`${DRAFT_PREFIX}${userId}`, JSON.stringify(draft));
    }
  } catch {
    // Ignore storage quota issues safely
  }
}

