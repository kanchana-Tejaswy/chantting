import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dailySadhanaSchema } from "@/lib/domain/sadhana";

const dateParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function GET(request: NextRequest) {
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

  const rawDate = request.nextUrl.searchParams.get("date");
  const parsedDate = dateParamSchema.safeParse(rawDate);
  if (!parsedDate.success) {
    return NextResponse.json(
      { error: "Valid date query parameter (YYYY-MM-DD) is required." },
      { status: 400 }
    );
  }

  const date = parsedDate.data;

  const [dailyRes, sessionsRes, recordsRes, ledgerRes] = await Promise.all([
    supabase
      .from("daily_sadhana")
      .select(
        "id, user_id, sadhana_date, timezone_snapshot, original_daily_target, previous_pending_balance, effective_daily_target, completed_rounds, remaining_balance, extra_rounds, policy_applied, carry_forward_accepted, has_activity"
      )
      .eq("user_id", user.id)
      .eq("sadhana_date", date)
      .maybeSingle(),
    supabase
      .from("chanting_sessions")
      .select(
        "id, user_id, sadhana_date, method, status, current_bead_count, rounds_completed, client_session_key, started_at, last_activity_at, paused_at, ended_at"
      )
      .eq("user_id", user.id)
      .eq("sadhana_date", date)
      .order("started_at", { ascending: false }),
    supabase
      .from("chanting_records")
      .select(
        "id, user_id, session_id, sadhana_date, method, round_delta, idempotency_key, recorded_at, client_recorded_at, timezone_snapshot, is_reverted"
      )
      .eq("user_id", user.id)
      .eq("sadhana_date", date)
      .eq("is_reverted", false)
      .order("recorded_at", { ascending: false }),
    supabase
      .from("carry_forward_ledger")
      .select(
        "id, from_date, to_date, policy_applied, source_remaining_balance, carried_amount, notes, created_at"
      )
      .eq("user_id", user.id)
      .eq("to_date", date)
      .maybeSingle(),
  ]);

  const err =
    dailyRes.error ?? sessionsRes.error ?? recordsRes.error ?? ledgerRes.error;
  if (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const parsedDaily = dailyRes.data
    ? dailySadhanaSchema.safeParse(dailyRes.data)
    : null;

  return NextResponse.json({
    date,
    hasRecord: Boolean(parsedDaily?.success),
    dailySadhana: parsedDaily?.success ? parsedDaily.data : null,
    sessions: sessionsRes.data ?? [],
    records: recordsRes.data ?? [],
    ledgerEntry: ledgerRes.data ?? null,
  });
}

