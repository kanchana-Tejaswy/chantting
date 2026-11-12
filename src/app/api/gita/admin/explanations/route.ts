import { NextResponse } from "next/server";
import {
  adminDeleteIdSchema,
  explanationAdminSchema,
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

  const parsed = explanationAdminSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Invalid explanation payload.",
      },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const isApproved = d.reviewStatus === "approved";

  const res = await admin.supabase
    .from("gita_explanations")
    .insert({
      verse_id: d.verseId,
      source_id: d.sourceId ?? null,
      title: d.title,
      explanation_text: d.explanationText,
      is_ai_assisted: d.isAiAssisted,
      review_status: d.reviewStatus,
      reviewed_by: isApproved ? admin.userId : null,
      reviewed_at: isApproved ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 400 });
  }

  revalidateGitaPaths();
  return NextResponse.json({ explanation: res.data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const admin = await getAuthorizedAdminContext();
  if (!admin.ok) return admin.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = explanationAdminSchema.safeParse(body.data);
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json(
      {
        error: !parsed.success
          ? parsed.error.issues[0]?.message ?? "Invalid explanation update."
          : "Explanation ID is required.",
      },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const isApproved = d.reviewStatus === "approved";

  const res = await admin.supabase
    .from("gita_explanations")
    .update({
      verse_id: d.verseId,
      source_id: d.sourceId ?? null,
      title: d.title,
      explanation_text: d.explanationText,
      is_ai_assisted: d.isAiAssisted,
      review_status: d.reviewStatus,
      reviewed_by: isApproved ? admin.userId : null,
      reviewed_at: isApproved ? new Date().toISOString() : null,
    })
    .eq("id", d.id)
    .select("*")
    .maybeSingle();

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 400 });
  }

  if (!res.data) {
    return NextResponse.json(
      { error: "Explanation not found." },
      { status: 404 }
    );
  }

  revalidateGitaPaths();
  return NextResponse.json({ explanation: res.data });
}

export async function DELETE(request: Request) {
  const admin = await getAuthorizedAdminContext();
  if (!admin.ok) return admin.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = adminDeleteIdSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid explanation ID." },
      { status: 400 }
    );
  }

  const res = await admin.supabase
    .from("gita_explanations")
    .delete()
    .eq("id", parsed.data.id);

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 400 });
  }

  revalidateGitaPaths();
  return NextResponse.json({ deleted: true });
}

