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
      avatar_url: parsed.data.avatarUrl,
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

    // If constraint failed because remote DB has not yet applied relative avatar migration, retry with full origin URL
    if (
      parsed.data.avatarUrl &&
      parsed.data.avatarUrl.startsWith("/") &&
      updateRes.error.message.includes("profiles_avatar_url_safe")
    ) {
      const host =
        request.headers.get("x-forwarded-host") ??
        request.headers.get("host") ??
        "localhost:3000";
      const proto = request.headers.get("x-forwarded-proto") ?? "https";
      const absoluteAvatar = `${proto}://${host}${parsed.data.avatarUrl}`;
      const fallbackRes = await auth.supabase
        .from("profiles")
        .update({
          display_name: parsed.data.displayName,
          username: parsed.data.username,
          avatar_url: absoluteAvatar,
          bio: parsed.data.bio,
          timezone: parsed.data.timezone,
          preferred_language: parsed.data.preferredLanguage,
        })
        .eq("id", auth.user.id)
        .select(
          "id, username, display_name, avatar_url, bio, timezone, preferred_language, updated_at"
        )
        .single();

      if (!fallbackRes.error) {
        revalidatePath("/account");
        revalidatePath("/sadhana");
        revalidatePath("/sadhana/chant");
        revalidatePath("/sadhana/analytics");
        revalidatePath("/rooms");
        return NextResponse.json({ profile: fallbackRes.data });
      }
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

