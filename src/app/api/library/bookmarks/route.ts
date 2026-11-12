import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getAuthenticatedGitaContext,
  parseJsonBody,
} from "@/lib/gita/api-helpers";
import { libraryBookmarkInputSchema } from "@/lib/library/validation";

export async function POST(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = libraryBookmarkInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Invalid resource bookmark.",
      },
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
      { error: "Only approved active resources can be bookmarked." },
      { status: 404 }
    );
  }

  const upsertRes = await auth.supabase
    .from("library_bookmarks")
    .upsert(
      { user_id: auth.user.id, resource_id: parsed.data.resourceId },
      { onConflict: "user_id,resource_id" }
    )
    .select("id, resource_id, created_at")
    .single();

  if (upsertRes.error) {
    return NextResponse.json(
      { error: upsertRes.error.message },
      { status: 400 }
    );
  }

  revalidatePath("/library");
  revalidatePath(`/library/${String(resourceCheck.data.slug)}`);
  return NextResponse.json({ bookmark: upsertRes.data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = libraryBookmarkInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Invalid resource bookmark.",
      },
      { status: 400 }
    );
  }

  const delRes = await auth.supabase
    .from("library_bookmarks")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("resource_id", parsed.data.resourceId);

  if (delRes.error) {
    return NextResponse.json({ error: delRes.error.message }, { status: 400 });
  }

  revalidatePath("/library");
  return NextResponse.json({ removed: true });
}

