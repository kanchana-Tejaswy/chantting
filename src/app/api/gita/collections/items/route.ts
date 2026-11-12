import { NextResponse } from "next/server";
import {
  collectionItemInputSchema,
  collectionItemRemoveSchema,
} from "@/lib/gita/validation";
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

  const parsed = collectionItemInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid collection item." },
      { status: 400 }
    );
  }

  const [colCheck, verseCheck] = await Promise.all([
    auth.supabase
      .from("learning_collections")
      .select("id")
      .eq("id", parsed.data.collectionId)
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    auth.supabase
      .from("gita_verses")
      .select("id, chapter_number, verse_number")
      .eq("id", parsed.data.verseId)
      .eq("review_status", "approved")
      .maybeSingle(),
  ]);

  if (colCheck.error || !colCheck.data) {
    return NextResponse.json(
      { error: "Collection not found or access denied." },
      { status: 404 }
    );
  }
  if (verseCheck.error || !verseCheck.data) {
    return NextResponse.json(
      { error: "Only approved published verses can be added to collections." },
      { status: 404 }
    );
  }

  const upsertRes = await auth.supabase
    .from("learning_collection_items")
    .upsert(
      {
        collection_id: parsed.data.collectionId,
        verse_id: parsed.data.verseId,
        sort_order: parsed.data.sortOrder,
      },
      { onConflict: "collection_id,verse_id" }
    )
    .select("id, collection_id, verse_id, sort_order, added_at")
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
  return NextResponse.json({ item: upsertRes.data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = collectionItemRemoveSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid collection item." },
      { status: 400 }
    );
  }

  const colCheck = await auth.supabase
    .from("learning_collections")
    .select("id")
    .eq("id", parsed.data.collectionId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (colCheck.error || !colCheck.data) {
    return NextResponse.json(
      { error: "Collection not found or access denied." },
      { status: 404 }
    );
  }

  const delRes = await auth.supabase
    .from("learning_collection_items")
    .delete()
    .eq("collection_id", parsed.data.collectionId)
    .eq("verse_id", parsed.data.verseId);

  if (delRes.error) {
    return NextResponse.json({ error: delRes.error.message }, { status: 400 });
  }

  revalidateGitaPaths();
  return NextResponse.json({ removed: true });
}

