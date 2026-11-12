import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { joinLeaveRoomSchema } from "@/lib/rooms/validation";
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

  const parsed = joinLeaveRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid room ID." },
      { status: 400 }
    );
  }

  const [prefRes, profileRes] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("default_room_share_mode")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const shareMode = prefRes.data?.default_room_share_mode ?? "completion_only";

  const joinRes = await supabase
    .from("room_memberships")
    .insert({
      room_id: parsed.data.roomId,
      user_id: user.id,
      role: "member",
      share_progress_mode: shareMode,
    })
    .select("id, room_id, role, share_progress_mode")
    .single();

  if (joinRes.error) {
    if (joinRes.error.code === "23505") {
      return NextResponse.json({ alreadyMember: true });
    }
    return NextResponse.json(
      { error: "Unable to join room. Private rooms require an invitation." },
      { status: 403 }
    );
  }

  const todayDate = getLocalDateString(profileRes.data?.timezone ?? "UTC");
  await supabase.from("room_activity_feed").insert({
    room_id: parsed.data.roomId,
    user_id: user.id,
    activity_date: todayDate,
    activity_type: "joined_room",
    shared_rounds_count: null,
  });

  revalidatePath("/rooms");
  return NextResponse.json({ membership: joinRes.data }, { status: 201 });
}

export async function DELETE(request: Request) {
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

  const parsed = joinLeaveRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const targetUserId = parsed.data.targetUserId ?? user.id;

  const delRes = await supabase
    .from("room_memberships")
    .delete()
    .eq("room_id", parsed.data.roomId)
    .eq("user_id", targetUserId)
    .select("id")
    .maybeSingle();

  if (delRes.error) {
    return NextResponse.json({ error: delRes.error.message }, { status: 400 });
  }

  if (!delRes.data) {
    return NextResponse.json(
      {
        error:
          "Membership could not be removed (owners cannot leave without archiving, or permission denied).",
      },
      { status: 403 }
    );
  }

  revalidatePath("/rooms");
  return NextResponse.json({ removed: true });
}

