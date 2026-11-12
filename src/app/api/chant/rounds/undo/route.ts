import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { undoRoundApiInputSchema } from "@/lib/chant/validation";

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

  const parsed = undoRoundApiInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid undo payload." },
      { status: 400 }
    );
  }

  const rpcRes = await supabase.rpc("undo_chanting_round", {
    p_record_id: parsed.data.recordId,
    p_reason: parsed.data.reason ?? "user_undo",
  });

  if (rpcRes.error) {
    return NextResponse.json({ error: rpcRes.error.message }, { status: 400 });
  }

  const payload = rpcRes.data as {
    already_reverted: boolean;
    record: { session_id?: string | null };
    daily_sadhana: Record<string, unknown>;
  };

  let session: Record<string, unknown> | null = null;
  if (payload.record?.session_id) {
    const sessRes = await supabase
      .from("chanting_sessions")
      .select(
        "id, user_id, sadhana_date, method, status, current_bead_count, rounds_completed, client_session_key, started_at, last_activity_at, paused_at, ended_at"
      )
      .eq("id", payload.record.session_id)
      .eq("user_id", user.id)
      .maybeSingle();
    session = sessRes.data;
  }

  revalidatePath("/sadhana");
  revalidatePath("/sadhana/chant");

  return NextResponse.json({
    ...payload,
    session,
  });
}

