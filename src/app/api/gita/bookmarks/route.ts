import { NextResponse } from "next/server";
import { bookmarkInputSchema } from "@/lib/gita/validation";
import {
  getAuthenticatedGitaContext,
  parseJsonBody,
  revalidateGitaPaths,
} from "@/lib/gita/api-helpers";

export async function POST(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = bookmarkInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid bookmark payload." },
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
      { error: "Only approved published verses can be bookmarked." },
      { status: 404 }
    );
  }

  const upsertRes = await auth.supabase
    .from("gita_bookmarks")
    .upsert(
      { user_id: auth.user.id, verse_id: parsed.data.verseId },
      { onConflict: "user_id,verse_id" }
    )
    .select("id, verse_id, created_at")
    .single();

  if (upsertRes.error) {
    return NextResponse.json(
      { error: upsertRes.error.message },
      { status: 400 }
    );
  }

  revalidateGitaPaths(
    Number(verseCheck.data.chapter_number),
    Number(verseCheck.data.verse_number)
  );
  return NextResponse.json({ bookmark: upsertRes.data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = bookmarkInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid bookmark payload." },
      { status: 400 }
    );
  }

  const delRes = await auth.supabase
    .from("gita_bookmarks")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("verse_id", parsed.data.verseId);

  if (delRes.error) {
    return NextResponse.json({ error: delRes.error.message }, { status: 400 });
  }

  revalidateGitaPaths();
  return NextResponse.json({ removed: true });
}

