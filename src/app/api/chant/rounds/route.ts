import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dailySadhanaSchema } from "@/lib/domain/sadhana";
import { recordRoundApiInputSchema } from "@/lib/chant/validation";
import { syncConsentedRoomActivity } from "@/lib/rooms/queries";
import {
  enforceApiRateLimit,
  PRIVATE_NO_STORE_HEADERS,
} from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }

  const rateLimited = enforceApiRateLimit({
    request,
    bucket: "chant-round-record",
    userId: user.id,
    limit: 120,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = recordRoundApiInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid round payload." },
      { status: 400 }
    );
  }

  const rpcRes = await supabase.rpc("record_chanting_round", {
    p_method: parsed.data.method,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_session_id: parsed.data.sessionId ?? null,
    p_client_recorded_at: parsed.data.clientRecordedAt ?? null,
  });

  if (rpcRes.error) {
    return NextResponse.json({ error: rpcRes.error.message }, { status: 400 });
  }

  let session: Record<string, unknown> | null = null;
  if (parsed.data.sessionId) {
    const sessRes = await supabase
      .from("chanting_sessions")
      .select(
        "id, user_id, sadhana_date, method, status, current_bead_count, rounds_completed, client_session_key, started_at, last_activity_at, paused_at, ended_at"
      )
      .eq("id", parsed.data.sessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    session = sessRes.data;
  }

  const parsedDaily = dailySadhanaSchema.safeParse(
    (rpcRes.data as { daily_sadhana?: unknown })?.daily_sadhana
  );
  if (parsedDaily.success) {
    try {
      await Promise.all([
        syncConsentedRoomActivity(supabase, user.id, parsedDaily.data),
        supabase.rpc("sync_my_achievements"),
      ]);
    } catch {
      // Never block personal round persistence on room or milestone sync
    }
  }

  revalidatePath("/sadhana");
  revalidatePath("/sadhana/chant");
  revalidatePath("/rooms");
  revalidatePath("/account");

  return NextResponse.json({
    ...(rpcRes.data as Record<string, unknown>),
    session,
  });
}

