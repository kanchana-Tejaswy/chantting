import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dailySadhanaSchema } from "@/lib/domain/sadhana";
import { recordManualNamesApiInputSchema } from "@/lib/chant/validation";
import {
  getAuthoritativeManualCounterState,
  recordAuthoritativeManualNames,
} from "@/lib/chant/unified-engine";
import { syncConsentedRoomActivity } from "@/lib/rooms/queries";
import {
  enforceApiRateLimit,
  PRIVATE_NO_STORE_HEADERS,
} from "@/lib/security/rate-limit";

export async function GET() {
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

  try {
    const state = await getAuthoritativeManualCounterState(supabase, user.id);
    return NextResponse.json(state, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load counter state." },
      { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

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
    bucket: "chant-manual-names",
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

  const parsed = recordManualNamesApiInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid manual name entry payload." },
      { status: 400 }
    );
  }

  let result;
  try {
    result = await recordAuthoritativeManualNames(supabase, user.id, {
      namesCount: parsed.data.namesCount,
      idempotencyKey: parsed.data.idempotencyKey,
      sessionId: parsed.data.sessionId ?? null,
      startNewSession: parsed.data.startNewSession ?? false,
      clientRecordedAt: parsed.data.clientRecordedAt ?? null,
      sankalpaId: parsed.data.sankalpaId ?? null,
      mantraId: parsed.data.mantraId ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record manual names." },
      { status: 400 }
    );
  }

  const parsedDaily = dailySadhanaSchema.safeParse(result.daily_sadhana);
  if (parsedDaily.success) {
    try {
      await Promise.all([
        syncConsentedRoomActivity(supabase, user.id, parsedDaily.data),
        supabase.rpc("sync_my_achievements"),
      ]);
    } catch {
      // Non-blocking sync
    }
  }

  revalidatePath("/sadhana");
  revalidatePath("/sadhana/chant");
  revalidatePath("/rooms");
  revalidatePath("/account");

  return NextResponse.json(
    {
      duplicate: result.duplicate,
      entry: result.entry,
      counter_state: result.counter_state,
      rounds_earned: result.rounds_earned,
      current_remainder: result.current_remainder,
      daily_sadhana: result.daily_sadhana,
      sankalpa: result.sankalpa ?? null,
      session: result.session ?? null,
    },
    { headers: PRIVATE_NO_STORE_HEADERS }
  );
}
