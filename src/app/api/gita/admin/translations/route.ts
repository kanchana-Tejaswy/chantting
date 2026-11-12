import { NextResponse } from "next/server";
import {
  adminDeleteIdSchema,
  translationAdminSchema,
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

  const parsed = translationAdminSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Invalid translation payload.",
      },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const isApproved = d.reviewStatus === "approved";

  if (d.isPrimary) {
    await admin.supabase
      .from("gita_translations")
      .update({ is_primary: false })
      .eq("verse_id", d.verseId)
      .eq("language_code", d.languageCode);
  }

  const res = await admin.supabase
    .from("gita_translations")
    .insert({
      verse_id: d.verseId,
      source_id: d.sourceId,
      language_code: d.languageCode,
      translation_text: d.translationText,
      is_primary: d.isPrimary,
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

  revalidateGitaPaths();
  return NextResponse.json({ translation: res.data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const admin = await getAuthorizedAdminContext();
  if (!admin.ok) return admin.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = translationAdminSchema.safeParse(body.data);
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json(
      {
        error: !parsed.success
          ? parsed.error.issues[0]?.message ?? "Invalid translation update."
          : "Translation ID is required.",
      },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const isApproved = d.reviewStatus === "approved";

  if (d.isPrimary) {
    await admin.supabase
      .from("gita_translations")
      .update({ is_primary: false })
      .eq("verse_id", d.verseId)
      .eq("language_code", d.languageCode)
      .neq("id", d.id);
  }

  const res = await admin.supabase
    .from("gita_translations")
    .update({
      verse_id: d.verseId,
      source_id: d.sourceId,
      language_code: d.languageCode,
      translation_text: d.translationText,
      is_primary: d.isPrimary,
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
    return NextResponse.json(
      { error: "Translation not found." },
      { status: 404 }
    );
  }

  revalidateGitaPaths();
  return NextResponse.json({ translation: res.data });
}

export async function DELETE(request: Request) {
  const admin = await getAuthorizedAdminContext();
  if (!admin.ok) return admin.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = adminDeleteIdSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid translation ID." },
      { status: 400 }
    );
  }

  const res = await admin.supabase
    .from("gita_translations")
    .delete()
    .eq("id", parsed.data.id);

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 400 });
  }

  revalidateGitaPaths();
  return NextResponse.json({ deleted: true });
}
