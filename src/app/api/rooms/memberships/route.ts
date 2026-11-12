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
    const res = await supabase
      .from("room_memberships")
      .update({
        share_progress_mode: privacyParsed.data.shareProgressMode,
        share_streak: privacyParsed.data.shareStreak,
      })
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

    revalidatePath("/rooms");
    return NextResponse.json({ membership: res.data });
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

