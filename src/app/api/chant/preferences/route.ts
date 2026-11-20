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

  const updates: Record<string, boolean | string | number | null> = {};
  if (parsed.data.tactileFeedbackEnabled !== undefined) {
    updates.tactile_feedback_enabled = parsed.data.tactileFeedbackEnabled;
  }
  if (parsed.data.soundFeedbackEnabled !== undefined) {
    updates.sound_feedback_enabled = parsed.data.soundFeedbackEnabled;
  }
  if (parsed.data.defaultCountingMethod !== undefined) {
    updates.default_counting_method = parsed.data.defaultCountingMethod;
  }
  if (parsed.data.preferredMantraId !== undefined) {
    updates.preferred_mantra_id = parsed.data.preferredMantraId;
  }
  if (parsed.data.ambientModeEnabled !== undefined) {
    updates.ambient_mode_enabled = parsed.data.ambientModeEnabled;
  }
  if (parsed.data.ambientSoundEnabled !== undefined) {
    updates.ambient_sound_enabled = parsed.data.ambientSoundEnabled;
  }
  if (parsed.data.ambientSoundVolume !== undefined) {
    updates.ambient_sound_volume = parsed.data.ambientSoundVolume;
  }
  if (parsed.data.paceGuidanceEnabled !== undefined) {
    updates.pace_guidance_enabled = parsed.data.paceGuidanceEnabled;
  }
  if (parsed.data.paceSecondsPerBead !== undefined) {
    updates.pace_seconds_per_bead = parsed.data.paceSecondsPerBead;
  }

  const res = await supabase
    .from("user_preferences")
    .update(updates)
    .eq("user_id", user.id)
    .select(
      "tactile_feedback_enabled, sound_feedback_enabled, default_counting_method, preferred_mantra_id, ambient_mode_enabled, ambient_sound_enabled, ambient_sound_volume, pace_guidance_enabled, pace_seconds_per_bead"
    )
    .maybeSingle();

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 400 });
  }

  revalidatePath("/sadhana");
  revalidatePath("/sadhana/chant");

  return NextResponse.json({ preferences: res.data });
}
