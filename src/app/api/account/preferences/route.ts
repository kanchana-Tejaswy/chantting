import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getAuthenticatedGitaContext,
  parseJsonBody,
} from "@/lib/gita/api-helpers";
import { accountPreferencesUpdateSchema } from "@/lib/account/validation";
import { getLocalDateString } from "@/lib/sadhana/stats";

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = accountPreferencesUpdateSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Invalid preferences payload.",
      },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const customRule =
    d.carryForwardPolicy === "custom" && d.maxCarryCap !== null
      ? { max_carry_cap: d.maxCarryCap }
      : {};

  const prefUpdate = await auth.supabase
    .from("user_preferences")
    .update({
      daily_round_target: d.dailyRoundTarget,
      carry_forward_policy: d.carryForwardPolicy,
      custom_carry_rule: customRule,
      default_counting_method: d.defaultCountingMethod,
      tactile_feedback_enabled: d.tactileFeedbackEnabled,
      sound_feedback_enabled: d.soundFeedbackEnabled,
      reduced_motion_preference: d.reducedMotionPreference,
      public_profile_enabled: d.publicProfileEnabled,
      default_room_share_mode: d.defaultRoomShareMode,
      share_streak_in_rooms: d.shareStreakInRooms,
      daily_reminder_enabled: d.dailyReminderEnabled,
      daily_reminder_time: d.dailyReminderTime,
      quiet_hours_enabled: d.quietHoursEnabled,
      quiet_hours_start: d.quietHoursStart,
      quiet_hours_end: d.quietHoursEnd,
      room_notifications_enabled: d.roomNotificationsEnabled,
      room_goal_notifications_enabled: d.roomGoalNotificationsEnabled,
      wisdom_notifications_enabled: d.wisdomNotificationsEnabled,
      platform_updates_enabled: d.platformUpdatesEnabled,
    })
    .eq("user_id", auth.user.id)
    .select("*")
    .single();

  if (prefUpdate.error) {
    return NextResponse.json(
      { error: prefUpdate.error.message },
      { status: 400 }
    );
  }

  // Keep today's initialized Sadhana day aligned if present
  try {
    const profileRes = await auth.supabase
      .from("profiles")
      .select("timezone")
      .eq("id", auth.user.id)
      .maybeSingle();
    const tz = profileRes.data?.timezone ?? "UTC";
    const todayDate = getLocalDateString(tz);
    await auth.supabase.rpc("ensure_my_daily_sadhana", {
      p_target_date: todayDate,
    });
  } catch {
    // Do not block saving notification/privacy preferences on day sync
  }

  revalidatePath("/account");
  revalidatePath("/sadhana");
  revalidatePath("/sadhana/chant");
  revalidatePath("/rooms");

  return NextResponse.json({ preferences: prefUpdate.data });
}

