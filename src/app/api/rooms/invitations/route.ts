import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createInvitationSchema,
  revokeInvitationSchema,
} from "@/lib/rooms/validation";

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

  const parsed = createInvitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid invitation payload." },
      { status: 400 }
    );
  }

  const rawToken = crypto.randomBytes(24).toString("base64url");
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken, "utf8")
    .digest("hex");

  const expiresAt = parsed.data.expiresInHours
    ? new Date(
        Date.now() + parsed.data.expiresInHours * 3600_000
      ).toISOString()
    : null;

  const insertRes = await supabase
    .from("room_invitations")
    .insert({
      room_id: parsed.data.roomId,
      created_by: user.id,
      token_hash: tokenHash,
      max_uses: parsed.data.maxUses ?? null,
      expires_at: expiresAt,
    })
    .select("id, room_id, max_uses, uses_count, expires_at, revoked_at, created_at")
    .single();

  if (insertRes.error) {
    return NextResponse.json(
      { error: "Only room owners or administrators can create invitations." },
      { status: 403 }
    );
  }

  revalidatePath("/rooms");

  return NextResponse.json(
    {
      invitation: insertRes.data,
      rawToken,
      invitePath: `/rooms/invite?token=${encodeURIComponent(rawToken)}`,
    },
    { status: 201 }
  );
}

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

  const parsed = revokeInvitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid revoke request." },
      { status: 400 }
    );
  }

  const res = await supabase
    .from("room_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.invitationId)
    .eq("room_id", parsed.data.roomId)
    .select("id, revoked_at")
    .maybeSingle();

  if (res.error || !res.data) {
    return NextResponse.json(
      { error: res.error?.message ?? "Invitation not found or unauthorized." },
      { status: 403 }
    );
  }

  revalidatePath("/rooms");
  return NextResponse.json({ invitation: res.data });
}

