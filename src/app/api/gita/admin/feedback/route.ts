import { NextResponse } from "next/server";
import { feedbackResolutionSchema } from "@/lib/gita/validation";
import {
  getAuthorizedAdminContext,
  parseJsonBody,
  revalidateGitaPaths,
} from "@/lib/gita/api-helpers";

export async function PATCH(request: Request) {
  const admin = await getAuthorizedAdminContext();
  if (!admin.ok) return admin.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = feedbackResolutionSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Invalid feedback resolution.",
      },
      { status: 400 }
    );
  }

  const isClosed =
    parsed.data.status === "resolved" || parsed.data.status === "declined";

  const res = await admin.supabase
    .from("content_feedback")
    .update({
      status: parsed.data.status,
      resolution_notes: parsed.data.resolutionNotes,
      resolved_by: isClosed ? admin.userId : null,
      resolved_at: isClosed ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id)
    .select("*")
    .maybeSingle();

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 400 });
  }

  if (!res.data) {
    return NextResponse.json(
      { error: "Feedback item not found." },
      { status: 404 }
    );
  }

  revalidateGitaPaths();
  return NextResponse.json({ feedback: res.data });
}

