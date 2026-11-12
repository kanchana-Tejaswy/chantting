import { NextResponse } from "next/server";
import { contentFeedbackInputSchema } from "@/lib/gita/validation";
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

  const parsed = contentFeedbackInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid feedback payload." },
      { status: 400 }
    );
  }

  const insertRes = await auth.supabase
    .from("content_feedback")
    .insert({
      submitted_by: auth.user.id,
      verse_id: parsed.data.verseId ?? null,
      translation_id: parsed.data.translationId ?? null,
      explanation_id: parsed.data.explanationId ?? null,
      category: parsed.data.category,
      message: parsed.data.message,
    })
    .select("id, category, message, status, created_at")
    .single();

  if (insertRes.error) {
    return NextResponse.json(
      { error: insertRes.error.message },
      { status: 400 }
    );
  }

  revalidateGitaPaths();
  return NextResponse.json({ feedback: insertRes.data }, { status: 201 });
}

