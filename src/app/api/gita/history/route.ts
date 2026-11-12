import { NextResponse } from "next/server";
import { readingHistoryInputSchema } from "@/lib/gita/validation";
import {
  getAuthenticatedGitaContext,
  parseJsonBody,
  revalidateGitaPaths,
} from "@/lib/gita/api-helpers";

const HISTORY_DEDUPE_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = readingHistoryInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid verse ID." },
      { status: 400 }
    );
  }

  const verseCheck = await auth.supabase
    .from("gita_verses")
    .select("id, chapter_number, verse_number")
    .eq("id", parsed.data.verseId)
    .eq("review_status", "approved")
    .maybeSingle();

  if (verseCheck.error || !verseCheck.data) {
    return NextResponse.json(
      { error: "Only approved published verses are tracked in reading history." },
      { status: 404 }
    );
  }

  // Throttle repeated refreshes within 15 minutes for clean reading history
  const recentRes = await auth.supabase
    .from("gita_reading_history")
    .select("id, read_at")
    .eq("user_id", auth.user.id)
    .eq("verse_id", parsed.data.verseId)
    .order("read_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentRes.data?.read_at) {
    const lastMs = Date.parse(recentRes.data.read_at as string);
    if (Number.isFinite(lastMs) && Date.now() - lastMs < HISTORY_DEDUPE_MS) {
      return NextResponse.json({
        entry: recentRes.data,
        deduplicated: true,
      });
    }
  }

  const insertRes = await auth.supabase
    .from("gita_reading_history")
    .insert({ user_id: auth.user.id, verse_id: parsed.data.verseId })
    .select("id, verse_id, read_at")
    .single();

  if (insertRes.error) {
    return NextResponse.json(
      { error: insertRes.error.message },
      { status: 400 }
    );
  }

  revalidateGitaPaths(
    Number(verseCheck.data.chapter_number),
    Number(verseCheck.data.verse_number)
  );
  return NextResponse.json({ entry: insertRes.data, deduplicated: false }, { status: 201 });
}

