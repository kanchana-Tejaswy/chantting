import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createRoomSchema, updateRoomSchema } from "@/lib/rooms/validation";

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

  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid room details." },
      { status: 400 }
    );
  }

  const insertRes = await supabase
    .from("rooms")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      visibility: parsed.data.visibility,
      owner_id: user.id,
      default_daily_goal: parsed.data.defaultDailyGoal ?? null,
    })
    .select("id, slug, name, visibility")
    .single();

  if (insertRes.error) {
    if (insertRes.error.code === "23505") {
      return NextResponse.json(
        { error: "That room URL slug is already in use. Choose another slug." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: insertRes.error.message },
      { status: 400 }
    );
  }

  revalidatePath("/rooms");

  return NextResponse.json({ room: insertRes.data }, { status: 201 });
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

  const parsed = updateRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid room update." },
      { status: 400 }
    );
  }

  if (parsed.data.isArchived !== undefined) {
    const ownerCheck = await supabase
      .from("rooms")
      .select("owner_id")
      .eq("id", parsed.data.roomId)
      .maybeSingle();

    if (!ownerCheck.data || ownerCheck.data.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Only the room owner can archive or restore a room." },
        { status: 403 }
      );
    }
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    updates.description = parsed.data.description;
  if (parsed.data.visibility !== undefined)
    updates.visibility = parsed.data.visibility;
  if (parsed.data.defaultDailyGoal !== undefined)
    updates.default_daily_goal = parsed.data.defaultDailyGoal;
  if (parsed.data.isArchived !== undefined)
    updates.is_archived = parsed.data.isArchived;

  const updateRes = await supabase
    .from("rooms")
    .update(updates)
    .eq("id", parsed.data.roomId)
    .select("id, slug, name, visibility, is_archived")
    .maybeSingle();

  if (updateRes.error) {
    return NextResponse.json(
      { error: updateRes.error.message },
      { status: 400 }
    );
  }

  if (!updateRes.data) {
    return NextResponse.json(
      { error: "Room not found or permission denied." },
      { status: 404 }
    );
  }

  revalidatePath("/rooms");
  revalidatePath(`/rooms/${updateRes.data.slug}`);

  return NextResponse.json({ room: updateRes.data });
}

