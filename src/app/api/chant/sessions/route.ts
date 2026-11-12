import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createSessionInputSchema,
  updateSessionInputSchema,
} from "@/lib/chant/validation";
import { getLocalDateString } from "@/lib/sadhana/stats";

const SESSION_SELECT =
  "id, user_id, sadhana_date, method, status, current_bead_count, rounds_completed, client_session_key, started_at, last_activity_at, paused_at, ended_at";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createSessionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid session request." },
      { status: 400 }
    );
  }

  // Idempotent lookup by (user_id, client_session_key) to prevent duplicate session creation
  const existingRes = await supabase
    .from("chanting_sessions")
    .select(SESSION_SELECT)
    .eq("user_id", user.id)
    .eq("client_session_key", parsed.data.clientSessionKey)
    .maybeSingle();

  if (existingRes.error) {
    return NextResponse.json(
      { error: existingRes.error.message },
      { status: 500 }
    );
  }

  if (existingRes.data) {
    return NextResponse.json({
      session: existingRes.data,
      recovered: true,
    });
  }

  // Determine user's authoritative local date from profile timezone
  const profileRes = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();

  const timezone = profileRes.data?.timezone ?? "UTC";
  const sadhanaDate = parsed.data.sadhanaDate ?? getLocalDateString(timezone);

  const insertRes = await supabase
    .from("chanting_sessions")
    .insert({
      user_id: user.id,
      sadhana_date: sadhanaDate,
      method: parsed.data.method,
      status: "active",
      current_bead_count: 0,
      rounds_completed: 0,
      client_session_key: parsed.data.clientSessionKey,
    })
    .select(SESSION_SELECT)
    .single();

  if (insertRes.error) {
    // Handle concurrent duplicate creation gracefully
    if (insertRes.error.code === "23505") {
      const retryRes = await supabase
        .from("chanting_sessions")
        .select(SESSION_SELECT)
        .eq("user_id", user.id)
        .eq("client_session_key", parsed.data.clientSessionKey)
        .maybeSingle();
      if (retryRes.data) {
        return NextResponse.json({ session: retryRes.data, recovered: true });
      }
    }
    return NextResponse.json(
      { error: insertRes.error.message },
      { status: 400 }
    );
  }

  revalidatePath("/sadhana");
  revalidatePath("/sadhana/chant");

  return NextResponse.json(
    { session: insertRes.data, recovered: false },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = updateSessionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid session update." },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();
  const updatePayload: Record<string, string | number | null> = {
    last_activity_at: nowIso,
  };

  if (parsed.data.currentBeadCount !== undefined) {
    updatePayload.current_bead_count = parsed.data.currentBeadCount;
  }

  if (parsed.data.status !== undefined) {
    updatePayload.status = parsed.data.status;
    if (parsed.data.status === "paused") {
      updatePayload.paused_at = nowIso;
    } else if (parsed.data.status === "active") {
      updatePayload.paused_at = null;
    } else if (
      parsed.data.status === "completed" ||
      parsed.data.status === "abandoned"
    ) {
      updatePayload.ended_at = nowIso;
    }
  }

  const updateRes = await supabase
    .from("chanting_sessions")
    .update(updatePayload)
    .eq("id", parsed.data.sessionId)
    .eq("user_id", user.id)
    .select(SESSION_SELECT)
    .maybeSingle();

  if (updateRes.error) {
    return NextResponse.json(
      { error: updateRes.error.message },
      { status: 400 }
    );
  }

  if (!updateRes.data) {
    return NextResponse.json(
      { error: "Chanting session not found." },
      { status: 404 }
    );
  }

  revalidatePath("/sadhana");

  return NextResponse.json({ session: updateRes.data });
}

