import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getAuthenticatedGitaContext,
  parseJsonBody,
} from "@/lib/gita/api-helpers";
import { libraryHistoryInputSchema } from "@/lib/library/validation";

const VIEW_DEDUPE_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = libraryHistoryInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid resource ID." },
      { status: 400 }
    );
  }

  const resourceCheck = await auth.supabase
    .from("library_resources")
    .select("id, slug")
    .eq("id", parsed.data.resourceId)
    .eq("review_status", "approved")
    .eq("is_archived", false)
    .maybeSingle();

  if (resourceCheck.error || !resourceCheck.data) {
    return NextResponse.json(
      { error: "Only approved active resources are recorded in view history." },
      { status: 404 }
    );
  }

  const recentRes = await auth.supabase
    .from("library_view_history")
    .select("id, viewed_at")
    .eq("user_id", auth.user.id)
    .eq("resource_id", parsed.data.resourceId)
    .order("viewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentRes.data?.viewed_at) {
    const lastMs = Date.parse(String(recentRes.data.viewed_at));
    if (Number.isFinite(lastMs) && Date.now() - lastMs < VIEW_DEDUPE_MS) {
      return NextResponse.json({
        entry: recentRes.data,
        deduplicated: true,
      });
    }
  }

  const insertRes = await auth.supabase
    .from("library_view_history")
    .insert({ user_id: auth.user.id, resource_id: parsed.data.resourceId })
    .select("id, resource_id, viewed_at")
    .single();

  if (insertRes.error) {
    return NextResponse.json(
      { error: insertRes.error.message },
      { status: 400 }
    );
  }

  revalidatePath("/library");
  return NextResponse.json(
    { entry: insertRes.data, deduplicated: false },
    { status: 201 }
  );
}

export async function DELETE(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  let resourceId: string | null = null;
  try {
    const body = (await request.json()) as unknown;
    if (body && typeof body === "object" && "resourceId" in body) {
      const parsed = libraryHistoryInputSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid resource ID." },
          { status: 400 }
        );
      }
      resourceId = parsed.data.resourceId;
    }
  } catch {
    // Allow clearing full user history when no JSON body is supplied
  }

  let delQuery = auth.supabase
    .from("library_view_history")
    .delete()
    .eq("user_id", auth.user.id);

  if (resourceId) {
    delQuery = delQuery.eq("resource_id", resourceId);
  }

  const delRes = await delQuery;
  if (delRes.error) {
    return NextResponse.json({ error: delRes.error.message }, { status: 400 });
  }

  revalidatePath("/library");
  return NextResponse.json({ cleared: true });
}

