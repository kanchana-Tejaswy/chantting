import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { shareRoomActivitySchema } from "@/lib/rooms/validation";
import { getLocalDateString } from "@/lib/sadhana/stats";

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

  const parsed = shareRoomActivitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid activity payload." },
      { status: 400 }
    );
  }

  const [memRes, profileRes] = await Promise.all([
    supabase
      .from("room_memberships")
      .select("share_progress_mode")
      .eq("room_id", parsed.data.roomId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!memRes.data) {
    return NextResponse.json(
      { error: "You are not a member of this room." },
      { status: 403 }
    );
  }

  const shareMode = memRes.data.share_progress_mode as
    | "full"
    | "completion_only"
    | "private";

  if (shareMode === "private") {
    return NextResponse.json(
      {
        error:
          "Your privacy mode for this room is Private. Switch to Completion only or Full progress to share updates.",
      },
      { status: 403 }
    );
  }

  const todayDate = getLocalDateString(profileRes.data?.timezone ?? "UTC");

  let sharedRoundsCount: number | null = null;
  let activityType = parsed.data.activityType;

  if (activityType !== "challenge_joined") {
    const dailyRes = await supabase
      .from("daily_sadhana")
      .select("completed_rounds, effective_daily_target")
      .eq("user_id", user.id)
      .eq("sadhana_date", todayDate)
      .maybeSingle();

    const completed = dailyRes.data?.completed_rounds ?? 0;
    const effective = dailyRes.data?.effective_daily_target ?? 16;

    if (shareMode === "completion_only") {
      if (completed < effective) {
        return NextResponse.json(
          {
            error:
              "Under Completion only mode, progress shares once today's target is met.",
          },
          { status: 400 }
        );
      }
      activityType = "daily_target_met";
      sharedRoundsCount = null;
    } else {
      sharedRoundsCount = completed;
      activityType = completed >= effective ? "daily_target_met" : "rounds_shared";
    }
  }

  const insertRes = await supabase
    .from("room_activity_feed")
    .insert({
      room_id: parsed.data.roomId,
      user_id: user.id,
      activity_date: todayDate,
      activity_type: activityType,
      shared_rounds_count: sharedRoundsCount,
      metadata: parsed.data.goalId ? { goal_id: parsed.data.goalId } : {},
    })
    .select("id, activity_date, activity_type, shared_rounds_count")
    .single();

  if (insertRes.error) {
    return NextResponse.json(
      { error: insertRes.error.message },
      { status: 400 }
    );
  }

  revalidatePath("/rooms");
  return NextResponse.json({ activity: insertRes.data }, { status: 201 });
}

