import { NextResponse } from "next/server";
import {
  collectionCreateSchema,
  collectionDeleteSchema,
  collectionUpdateSchema,
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

  const parsed = collectionCreateSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid collection details." },
      { status: 400 }
    );
  }

  const insertRes = await auth.supabase
    .from("learning_collections")
    .insert({
      user_id: auth.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
    })
    .select("id, user_id, title, description, is_curated, created_at, updated_at")
    .single();

  if (insertRes.error) {
    return NextResponse.json(
      { error: insertRes.error.message },
      { status: 400 }
    );
  }

  revalidateGitaPaths();
  return NextResponse.json({ collection: insertRes.data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = collectionUpdateSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid collection update." },
      { status: 400 }
    );
  }

  const updateRes = await auth.supabase
    .from("learning_collections")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", auth.user.id)
    .select("id, user_id, title, description, is_curated, created_at, updated_at")
    .maybeSingle();

  if (updateRes.error) {
    return NextResponse.json(
      { error: updateRes.error.message },
      { status: 400 }
    );
  }

  if (!updateRes.data) {
    return NextResponse.json(
      { error: "Collection not found or access denied." },
      { status: 404 }
    );
  }

  revalidateGitaPaths();
  return NextResponse.json({ collection: updateRes.data });
}

export async function DELETE(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = collectionDeleteSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid collection ID." },
      { status: 400 }
    );
  }

  const delRes = await auth.supabase
    .from("learning_collections")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", auth.user.id);

  if (delRes.error) {
    return NextResponse.json({ error: delRes.error.message }, { status: 400 });
  }

  revalidateGitaPaths();
  return NextResponse.json({ deleted: true });
}

