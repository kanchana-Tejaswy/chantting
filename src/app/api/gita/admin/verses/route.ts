import { NextResponse } from "next/server";
import {
  adminDeleteIdSchema,
  verseAdminSchema,
} from "@/lib/gita/validation";
import {
  getAuthorizedAdminContext,
  parseJsonBody,
  revalidateGitaPaths,
} from "@/lib/gita/api-helpers";

export async function POST(request: Request) {
  const admin = await getAuthorizedAdminContext();
  if (!admin.ok) return admin.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = verseAdminSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid verse payload." },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const isApproved = d.reviewStatus === "approved";

  const res = await admin.supabase
    .from("gita_verses")
    .insert({
      chapter_number: d.chapterNumber,
      verse_number: d.verseNumber,
      sanskrit_devanagari: d.sanskritDevanagari,
      transliteration_iast: d.transliterationIast,
      word_by_word: d.wordByWord && d.wordByWord.length > 0 ? d.wordByWord : null,
      source_id: d.sourceId ?? null,
      review_status: d.reviewStatus,
      reviewed_by: isApproved ? admin.userId : null,
      reviewed_at: isApproved ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (res.error) {
    return NextResponse.json(
      { error: res.error.message },
      { status: res.error.code === "23505" ? 409 : 400 }
    );
  }

  revalidateGitaPaths(d.chapterNumber, d.verseNumber);
  return NextResponse.json({ verse: res.data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const admin = await getAuthorizedAdminContext();
  if (!admin.ok) return admin.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = verseAdminSchema.safeParse(body.data);
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json(
      {
        error: !parsed.success
          ? parsed.error.issues[0]?.message ?? "Invalid verse update."
          : "Verse ID is required.",
      },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const isApproved = d.reviewStatus === "approved";

  const res = await admin.supabase
    .from("gita_verses")
    .update({
      chapter_number: d.chapterNumber,
      verse_number: d.verseNumber,
      sanskrit_devanagari: d.sanskritDevanagari,
      transliteration_iast: d.transliterationIast,
      word_by_word: d.wordByWord && d.wordByWord.length > 0 ? d.wordByWord : null,
      source_id: d.sourceId ?? null,
      review_status: d.reviewStatus,
      reviewed_by: isApproved ? admin.userId : null,
      reviewed_at: isApproved ? new Date().toISOString() : null,
    })
    .eq("id", d.id)
    .select("*")
    .maybeSingle();

  if (res.error) {
    return NextResponse.json(
      { error: res.error.message },
      { status: res.error.code === "23505" ? 409 : 400 }
    );
  }

  if (!res.data) {
    return NextResponse.json({ error: "Verse not found." }, { status: 404 });
  }

  revalidateGitaPaths(d.chapterNumber, d.verseNumber);
  return NextResponse.json({ verse: res.data });
}

export async function DELETE(request: Request) {
  const admin = await getAuthorizedAdminContext();
  if (!admin.ok) return admin.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = adminDeleteIdSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid verse ID." },
      { status: 400 }
    );
  }

  const res = await admin.supabase
    .from("gita_verses")
    .delete()
    .eq("id", parsed.data.id);

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 400 });
  }

  revalidateGitaPaths();
  return NextResponse.json({ deleted: true });
}

