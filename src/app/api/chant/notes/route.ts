import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saveSessionNoteSchema } from "@/lib/notes/validation";
import {
  enforceApiRateLimit,
  PRIVATE_NO_STORE_HEADERS,
} from "@/lib/security/rate-limit";

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (sessionId) {
    const { data, error } = await supabase
      .from("chanting_session_notes")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ note: data ?? null });
  }

  // Fetch recent journal entries for user
  const { data, error } = await supabase
    .from("chanting_session_notes")
    .select("*, chanting_sessions(sadhana_date, method, rounds_completed)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notes: data ?? [] });
}

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
    bucket: "chant-session-notes",
    userId: user.id,
    limit: 60,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = saveSessionNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid note payload." },
      { status: 400 }
    );
  }

  // Verify session belongs to user
  const { data: session, error: sessError } = await supabase
    .from("chanting_sessions")
    .select("id")
    .eq("id", parsed.data.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessError || !session) {
    return NextResponse.json(
      { error: "Session not found or not owned by devotee." },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("chanting_session_notes")
    .upsert(
      {
        session_id: parsed.data.sessionId,
        user_id: user.id,
        content: parsed.data.content,
        is_private: parsed.data.isPrivate ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath("/sadhana/chant");

  return NextResponse.json({ note: data }, { status: 200 });
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
      { status: 401, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing note ID" }, { status: 400 });
  }

  const { error } = await supabase
    .from("chanting_session_notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath("/sadhana/chant");

  return NextResponse.json({ success: true });
}

