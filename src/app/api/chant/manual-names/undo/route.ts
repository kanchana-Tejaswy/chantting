import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dailySadhanaSchema } from "@/lib/domain/sadhana";
import { undoManualNameEntryApiInputSchema } from "@/lib/chant/validation";
import { undoAuthoritativeManualNameEntry } from "@/lib/chant/unified-engine";
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
    bucket: "chant-manual-names-undo",
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

  const parsed = undoManualNameEntryApiInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid undo payload." },
      { status: 400 }
    );
  }

  let result;
  try {
    result = await undoAuthoritativeManualNameEntry(supabase, user.id, {
      entryId: parsed.data.entryId,
      reason: parsed.data.reason ?? "user_undo",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to undo manual entry." },
      { status: 400 }
    );
  }

  const parsedDaily = dailySadhanaSchema.safeParse(result.daily_sadhana);
  if (parsedDaily.success) {
    try {
      await syncConsentedRoomActivity(supabase, user.id, parsedDaily.data);
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
      already_reverted: result.already_reverted,
      entry: result.entry,
      counter_state: result.counter_state,
      daily_sadhana: result.daily_sadhana,
      session: result.session ?? null,
      sankalpa: result.sankalpa ?? null,
    },
    { headers: PRIVATE_NO_STORE_HEADERS }
  );
}
