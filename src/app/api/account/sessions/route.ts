import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getAuthenticatedGitaContext,
  parseJsonBody,
} from "@/lib/gita/api-helpers";
import {
  enforceApiRateLimit,
  PRIVATE_NO_STORE_HEADERS,
} from "@/lib/security/rate-limit";

const sessionSignOutSchema = z.object({
  scope: z.enum(["local", "global"]).default("local"),
});

export async function POST(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const rateLimited = enforceApiRateLimit({
    request,
    bucket: "account-sessions",
    userId: auth.user.id,
    limit: 20,
    windowMs: 15 * 60_000,
  });
  if (rateLimited) return rateLimited;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = sessionSignOutSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid session action scope." },
      { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }

  const { error } = await auth.supabase.auth.signOut({
    scope: parsed.data.scope,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }

  revalidatePath("/", "layout");
  return NextResponse.json(
    { signedOut: true, scope: parsed.data.scope },
    { headers: PRIVATE_NO_STORE_HEADERS }
  );
}

