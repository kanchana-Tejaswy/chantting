import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redeemInvitationSchema } from "@/lib/rooms/validation";
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
    bucket: "room-invite-redeem",
    userId: user.id,
    limit: 15,
    windowMs: 15 * 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = redeemInvitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid invitation token." },
      { status: 400 }
    );
  }

  const rpcRes = await supabase.rpc("redeem_room_invitation", {
    p_raw_token: parsed.data.rawToken,
    p_share_mode: parsed.data.shareMode ?? null,
  });

  if (rpcRes.error) {
    return NextResponse.json({ error: rpcRes.error.message }, { status: 400 });
  }

  const result = rpcRes.data as {
    already_member: boolean;
    membership: { room_id: string };
  };

  const roomRes = await supabase
    .from("rooms")
    .select("slug")
    .eq("id", result.membership.room_id)
    .maybeSingle();

  revalidatePath("/rooms");

  return NextResponse.json({
    ...result,
    roomSlug: roomRes.data?.slug ?? null,
  });
}

