import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getAuthenticatedGitaContext,
  parseJsonBody,
} from "@/lib/gita/api-helpers";
import { accountProfileUpdateSchema } from "@/lib/account/validation";

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = accountProfileUpdateSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid profile details." },
      { status: 400 }
    );
  }

  const updateRes = await auth.supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      username: parsed.data.username,
      bio: parsed.data.bio,
      timezone: parsed.data.timezone,
      preferred_language: parsed.data.preferredLanguage,
    })
    .eq("id", auth.user.id)
    .select(
      "id, username, display_name, avatar_url, bio, timezone, preferred_language, updated_at"
    )
    .single();

  if (updateRes.error) {
    if (updateRes.error.code === "23505") {
      return NextResponse.json(
        { error: "That username is already in use. Choose another handle." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: updateRes.error.message },
      { status: 400 }
    );
  }

  revalidatePath("/account");
  revalidatePath("/sadhana");
  revalidatePath("/sadhana/chant");
  revalidatePath("/sadhana/analytics");
  revalidatePath("/rooms");

  return NextResponse.json({ profile: updateRes.data });
}

