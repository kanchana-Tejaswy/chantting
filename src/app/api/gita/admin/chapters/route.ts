import { NextResponse } from "next/server";
import {
  adminDeleteChapterSchema,
  chapterAdminSchema,
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

  const parsed = chapterAdminSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid chapter metadata." },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const res = await admin.supabase
    .from("gita_chapters")
    .upsert(
      {
        chapter_number: d.chapterNumber,
        sanskrit_title: d.sanskritTitle,
        transliteration_title: d.transliterationTitle,
        english_title: d.englishTitle,
        summary: d.summary,
        verse_count: d.verseCount,
        theme_tags: d.themeTags,
      },
      { onConflict: "chapter_number" }
    )
    .select("*")
    .single();

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 400 });
  }

  revalidateGitaPaths(d.chapterNumber);
  return NextResponse.json({ chapter: res.data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const admin = await getAuthorizedAdminContext();
  if (!admin.ok) return admin.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = adminDeleteChapterSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid chapter number." },
      { status: 400 }
    );
  }

  const res = await admin.supabase
    .from("gita_chapters")
    .delete()
    .eq("chapter_number", parsed.data.chapterNumber);

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 400 });
  }

  revalidateGitaPaths(parsed.data.chapterNumber);
  return NextResponse.json({ deleted: true });
}

