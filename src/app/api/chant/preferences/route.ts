import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { chantPreferencesInputSchema } from "@/lib/chant/validation";

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

  const parsed = chantPreferencesInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid preferences payload." },
      { status: 400 }
    );
  }

  const updates: Record<string, boolean | string> = {};
  if (parsed.data.tactileFeedbackEnabled !== undefined) {
    updates.tactile_feedback_enabled = parsed.data.tactileFeedbackEnabled;
  }
  if (parsed.data.soundFeedbackEnabled !== undefined) {
    updates.sound_feedback_enabled = parsed.data.soundFeedbackEnabled;
  }
  if (parsed.data.defaultCountingMethod !== undefined) {
    updates.default_counting_method = parsed.data.defaultCountingMethod;
  }

  const res = await supabase
    .from("user_preferences")
    .update(updates)
    .eq("user_id", user.id)
    .select(
      "tactile_feedback_enabled, sound_feedback_enabled, default_counting_method"
    )
    .maybeSingle();

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 400 });
  }

  revalidatePath("/sadhana");
  revalidatePath("/sadhana/chant");

  return NextResponse.json({ preferences: res.data });
}

