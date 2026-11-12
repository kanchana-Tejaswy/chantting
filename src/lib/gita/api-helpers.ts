import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "./queries";

export async function parseJsonBody(
  request: Request
): Promise<{ ok: true; data: unknown } | { ok: false; response: NextResponse }> {
  try {
    const data = await request.json();
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      ),
    };
  }
}

export async function getAuthenticatedGitaContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  return { ok: true as const, supabase, user };
}

export async function getAuthorizedAdminContext() {
  const supabase = await createClient();
  const gate = await requirePlatformAdmin(supabase);
  if (!gate.ok) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: gate.error }, { status: gate.status }),
    };
  }
  return { ok: true as const, supabase, userId: gate.userId, role: gate.role };
}

export function revalidateGitaPaths(chapterNumber?: number, verseNumber?: number) {
  revalidatePath("/gita");
  revalidatePath("/gita/search");
  revalidatePath("/gita/study");
  revalidatePath("/gita/admin");
  if (typeof chapterNumber === "number") {
    revalidatePath(`/gita/${chapterNumber}`);
    if (typeof verseNumber === "number") {
      revalidatePath(`/gita/${chapterNumber}/${verseNumber}`);
    }
  }
}

