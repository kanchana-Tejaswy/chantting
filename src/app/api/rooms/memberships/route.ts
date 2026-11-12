import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  updateMemberRoleInputSchema,
  updateMembershipPrivacySchema,
} from "@/lib/rooms/validation";

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

  // Case 1: Member updating ONLY their own sharing preference
  const privacyParsed = updateMembershipPrivacySchema.safeParse(body);
  if (privacyParsed.success) {
    const privacyUpdates: {
      share_progress_mode: "full" | "completion_only" | "private";
      share_streak?: boolean;
    } = {
      share_progress_mode: privacyParsed.data.shareProgressMode,
    };

    if (privacyParsed.data.shareProgressMode === "private") {
      privacyUpdates.share_streak = false;
    } else if (privacyParsed.data.shareStreak !== undefined) {
      privacyUpdates.share_streak = privacyParsed.data.shareStreak;
    }

    const res = await supabase
      .from("room_memberships")
      .update(privacyUpdates)
      .eq("room_id", privacyParsed.data.roomId)
      .eq("user_id", user.id)
      .select("id, room_id, share_progress_mode, share_streak")
      .maybeSingle();

    if (res.error || !res.data) {
      return NextResponse.json(
        { error: res.error?.message ?? "Membership not found." },
        { status: 400 }
      );
    }

    let purgedActivity = false;
    if (privacyParsed.data.shareProgressMode === "private") {
      await supabase
        .from("room_activity_feed")
        .delete()
        .eq("room_id", privacyParsed.data.roomId)
        .eq("user_id", user.id)
        .neq("activity_type", "joined_room");
      purgedActivity = true;
    } else if (privacyParsed.data.shareProgressMode === "completion_only") {
      await supabase
        .from("room_activity_feed")
        .delete()
        .eq("room_id", privacyParsed.data.roomId)
        .eq("user_id", user.id)
        .eq("activity_type", "rounds_shared");
      purgedActivity = true;
    }

    revalidatePath("/rooms");
    revalidatePath("/account");
    return NextResponse.json({ membership: res.data, purgedActivity });
  }

  // Case 2: Room owner/admin updating another member's role via audited RPC
  const roleParsed = updateMemberRoleInputSchema.safeParse(body);
  if (roleParsed.success) {
    const rpcRes = await supabase.rpc("update_room_member_role", {
      p_room_id: roleParsed.data.roomId,
      p_target_user_id: roleParsed.data.targetUserId,
      p_new_role: roleParsed.data.newRole,
    });

    if (rpcRes.error) {
      return NextResponse.json({ error: rpcRes.error.message }, { status: 403 });
    }

    revalidatePath("/rooms");
    return NextResponse.json({ membership: rpcRes.data });
  }

  return NextResponse.json(
    { error: "Invalid membership update payload." },
    { status: 400 }
  );
}

