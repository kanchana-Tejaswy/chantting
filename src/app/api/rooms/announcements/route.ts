import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createAnnouncementSchema,
  deleteAnnouncementSchema,
  updateAnnouncementSchema,
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

  const parsed = createAnnouncementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid announcement." },
      { status: 400 }
    );
  }

  const insertRes = await supabase
    .from("room_announcements")
    .insert({
      room_id: parsed.data.roomId,
      author_id: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      is_pinned: parsed.data.isPinned,
    })
    .select("id, room_id, author_id, title, body, is_pinned, created_at")
    .single();

  if (insertRes.error) {
    return NextResponse.json(
      { error: "Only room owners or admins can post announcements." },
      { status: 403 }
    );
  }

  revalidatePath("/rooms");
  return NextResponse.json({ announcement: insertRes.data }, { status: 201 });
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

  const parsed = updateAnnouncementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const res = await supabase
    .from("room_announcements")
    .update({ is_pinned: parsed.data.isPinned })
    .eq("id", parsed.data.announcementId)
    .eq("room_id", parsed.data.roomId)
    .select("id, is_pinned")
    .maybeSingle();

  if (res.error || !res.data) {
    return NextResponse.json(
      { error: res.error?.message ?? "Announcement not found or unauthorized." },
      { status: 403 }
    );
  }

  revalidatePath("/rooms");
  return NextResponse.json({ announcement: res.data });
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

  const parsed = deleteAnnouncementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid delete payload." },
      { status: 400 }
    );
  }

  const res = await supabase
    .from("room_announcements")
    .delete()
    .eq("id", parsed.data.announcementId)
    .eq("room_id", parsed.data.roomId)
    .select("id")
    .maybeSingle();

  if (res.error || !res.data) {
    return NextResponse.json(
      { error: res.error?.message ?? "Announcement not found or unauthorized." },
      { status: 403 }
    );
  }

  revalidatePath("/rooms");
  return NextResponse.json({ deleted: true });
}

