import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SankalpaRecord,
  SankalpaProgressSummary,
  SankalpaPortfolioSummary,
  SankalpaPortfolioVowItem,
} from "./types";

export function summarizeSankalpa(record: SankalpaRecord): SankalpaProgressSummary {
  const target = Math.max(1, record.target_rounds);
  const completed = Math.max(0, record.completed_rounds);
  const remaining = Math.max(0, target - completed);
  const progressPercentage = Math.min(100, Math.round((completed / target) * 100));

  return {
    id: record.id,
    title: record.title,
    description: record.description,
    targetRounds: target,
    completedRounds: completed,
    remainingRounds: remaining,
    progressPercentage,
    startDate: record.start_date,
    endDate: record.end_date,
    status: record.status,
    isCompleted: record.status === "completed" || completed >= target,
  };
}

const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p"];

export function summarizeSankalpaPortfolio(records: SankalpaRecord[]): SankalpaPortfolioSummary {
  const validRecords = records.filter((r) => r.status !== "cancelled");

  // Sort with active first, then paused/upcoming in chronological order, then completed
  const sorted = [...validRecords].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (b.status === "active" && a.status !== "active") return 1;
    if (a.status === "paused" && b.status === "completed") return -1;
    if (b.status === "paused" && a.status === "completed") return 1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const totalTargetRounds = sorted.reduce((sum, r) => sum + Math.max(1, r.target_rounds), 0);
  const totalCompletedRounds = sorted.reduce((sum, r) => sum + Math.max(0, r.completed_rounds), 0);
  const totalRemainingRounds = Math.max(0, totalTargetRounds - totalCompletedRounds);
  const overallProgressPercentage =
    totalTargetRounds > 0
      ? Math.min(100, Math.round((totalCompletedRounds / totalTargetRounds) * 100))
      : 0;

  const vowsBreakdown: SankalpaPortfolioVowItem[] = sorted.map((r, idx) => {
    const target = Math.max(1, r.target_rounds);
    const completed = Math.max(0, r.completed_rounds);
    const remaining = Math.max(0, target - completed);
    return {
      id: r.id,
      title: r.title,
      targetRounds: target,
      completedRounds: completed,
      remainingRounds: remaining,
      status: r.status,
      percentageOfTotal: totalTargetRounds > 0 ? Math.round((target / totalTargetRounds) * 100) : 0,
      stepIndex: idx + 1,
      letter: LETTERS[idx] ?? `v${idx + 1}`,
    };
  });

  const equationParts = sorted.map(
    (r) => `${r.target_rounds.toLocaleString("en-US")} (${r.title})`
  );
  const equationText =
    equationParts.length > 0
      ? `${equationParts.join(" + ")} = ${totalTargetRounds.toLocaleString("en-US")} Total Target Rounds`
      : "";

  const equationShort =
    sorted.length > 0
      ? `${sorted.map((r) => r.target_rounds.toLocaleString("en-US")).join(" + ")} = ${totalTargetRounds.toLocaleString("en-US")} rounds`
      : "";

  return {
    totalTargetRounds,
    totalCompletedRounds,
    totalRemainingRounds,
    overallProgressPercentage,
    count: sorted.length,
    activeCount: sorted.filter((r) => r.status === "active").length,
    queuedCount: sorted.filter((r) => r.status === "paused").length,
    completedCount: sorted.filter((r) => r.status === "completed").length,
    vowsBreakdown,
    equationText,
    equationShort,
  };
}


export async function getActiveSankalpa(
  supabase: SupabaseClient,
  userId: string
): Promise<SankalpaRecord | null> {
  const { data, error } = await supabase
    .from("sankalpas")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as SankalpaRecord;
}

export async function listUserSankalpas(
  supabase: SupabaseClient,
  userId: string
): Promise<SankalpaRecord[]> {
  const { data, error } = await supabase
    .from("sankalpas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as SankalpaRecord[];
}

export async function getSankalpaById(
  supabase: SupabaseClient,
  userId: string,
  sankalpaId: string
): Promise<SankalpaRecord | null> {
  const { data, error } = await supabase
    .from("sankalpas")
    .select("*")
    .eq("id", sankalpaId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as SankalpaRecord;
}

export async function createSankalpaRecord(
  supabase: SupabaseClient,
  userId: string,
  input: {
    title: string;
    description?: string | null;
    targetRounds: number;
    startDate?: string;
    endDate?: string | null;
    includeLifetimeRounds?: boolean;
    initialCompletedRounds?: number;
    autoPauseExisting?: boolean;
    status?: "active" | "paused";
  }
): Promise<SankalpaRecord> {
  const desiredStatus = input.status ?? "active";

  // If new vow is requested to be active, enforce single active Sankalpa invariant per user
  if (desiredStatus === "active") {
    const existingActive = await getActiveSankalpa(supabase, userId);
    if (existingActive) {
      if (input.autoPauseExisting) {
        await supabase
          .from("sankalpas")
          .update({ status: "paused", updated_at: new Date().toISOString() })
          .eq("id", existingActive.id)
          .eq("user_id", userId);
      } else {
        throw new Error(
          `You already have an active Sankalpa ("${existingActive.title}"). Please complete or pause it before beginning a new sacred vow.`
        );
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const startDate = input.startDate ?? today;

  if (input.endDate && input.endDate < startDate) {
    throw new Error("Target completion date cannot precede the start date.");
  }

  // Count verified lifetime completed rounds if devotee requested inclusion
  let initialCompleted = 0;
  if (typeof input.initialCompletedRounds === "number" && input.initialCompletedRounds >= 0) {
    initialCompleted = input.initialCompletedRounds;
  } else if (input.includeLifetimeRounds) {
    const { count, error: countErr } = await supabase
      .from("chanting_records")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_reverted", false);

    if (!countErr && typeof count === "number") {
      initialCompleted = Math.max(0, count);
    }
  }

  const isCompletedOnCreation = initialCompleted >= input.targetRounds;
  const finalStatus = isCompletedOnCreation
    ? "completed"
    : desiredStatus === "paused"
    ? "paused"
    : "active";

  const { data, error } = await supabase
    .from("sankalpas")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      description: input.description?.trim() ?? null,
      target_rounds: input.targetRounds,
      completed_rounds: initialCompleted,
      start_date: startDate,
      end_date: input.endDate ?? null,
      status: finalStatus,
      completed_at: isCompletedOnCreation ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create Sankalpa.");
  }
  return data as SankalpaRecord;
}

export async function updateSankalpaRecord(
  supabase: SupabaseClient,
  userId: string,
  sankalpaId: string,
  input: {
    title?: string;
    description?: string | null;
    targetRounds?: number;
    addRounds?: number;
    startDate?: string;
    endDate?: string | null;
    status?: "active" | "paused" | "cancelled" | "completed";
    autoPauseExisting?: boolean;
  }
): Promise<SankalpaRecord> {
  const existing = await getSankalpaById(supabase, userId, sankalpaId);
  if (!existing) {
    throw new Error("Sankalpa not found or not owned by user.");
  }

  // If activating or resuming this Sankalpa, ensure no other active Sankalpa exists
  if (input.status === "active" && existing.status !== "active") {
    const activeVow = await getActiveSankalpa(supabase, userId);
    if (activeVow && activeVow.id !== sankalpaId) {
      if (input.autoPauseExisting !== false) {
        // Auto-pause the other active vow to allow seamless switching
        await supabase
          .from("sankalpas")
          .update({ status: "paused", updated_at: new Date().toISOString() })
          .eq("id", activeVow.id)
          .eq("user_id", userId);
      } else {
        throw new Error(
          `Cannot activate this vow because "${activeVow.title}" is already active. Please pause or complete it first.`
        );
      }
    }
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) {
    const trimmed = input.title.trim();
    if (trimmed.length < 2 || trimmed.length > 120) {
      throw new Error("Title must be between 2 and 120 characters.");
    }
    updates.title = trimmed;
  }

  if (input.description !== undefined) {
    updates.description = input.description ? input.description.trim().slice(0, 500) : null;
  }

  const effectiveStartDate = input.startDate ?? existing.start_date;
  if (input.startDate !== undefined) {
    updates.start_date = input.startDate;
  }

  if (input.endDate !== undefined) {
    if (input.endDate !== null && input.endDate < effectiveStartDate) {
      throw new Error("Target completion date cannot precede the start date.");
    }
    updates.end_date = input.endDate;
  }

  let nextStatus = input.status ?? existing.status;
  let completedAt = existing.completed_at;

  // Handle target round adjustment without resetting accumulated progress
  let resolvedTarget = input.targetRounds;
  if (input.addRounds !== undefined) {
    const baseTarget = input.targetRounds ?? existing.target_rounds;
    resolvedTarget = baseTarget + input.addRounds;
  }

  if (resolvedTarget !== undefined) {
    if (resolvedTarget < 1 || resolvedTarget > 1_000_000) {
      throw new Error("Target rounds must be between 1 and 1,000,000.");
    }
    updates.target_rounds = resolvedTarget;

    // Check if target is newly reached or exceeded
    if (resolvedTarget <= existing.completed_rounds) {
      nextStatus = "completed";
      completedAt = completedAt ?? new Date().toISOString();
    } else if (existing.status === "completed" && !input.status) {
      // Re-opening completed vow when target increased
      nextStatus = "active";
      completedAt = null;
    }
  }

  if (input.status !== undefined) {
    nextStatus = input.status;
    if (input.status === "completed" && !completedAt) {
      completedAt = new Date().toISOString();
    } else if (input.status === "active" && existing.status === "completed") {
      completedAt = null;
    }
  }

  updates.status = nextStatus;
  updates.completed_at = completedAt;

  const { data, error } = await supabase
    .from("sankalpas")
    .update(updates)
    .eq("id", sankalpaId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update Sankalpa.");
  }
  return data as SankalpaRecord;
}

export async function deleteSankalpaRecord(
  supabase: SupabaseClient,
  userId: string,
  sankalpaId: string
): Promise<void> {
  const existing = await getSankalpaById(supabase, userId, sankalpaId);
  if (!existing) {
    throw new Error("Sankalpa not found or not owned by user.");
  }

  const { error } = await supabase
    .from("sankalpas")
    .delete()
    .eq("id", sankalpaId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message ?? "Failed to delete Sankalpa.");
  }
}

