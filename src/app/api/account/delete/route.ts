import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import {
  getAuthenticatedGitaContext,
  parseJsonBody,
} from "@/lib/gita/api-helpers";
import { accountDeleteConfirmSchema } from "@/lib/account/validation";
import { getServerEnv } from "@/lib/env";
import {
  enforceApiRateLimit,
  PRIVATE_NO_STORE_HEADERS,
} from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const rateLimited = enforceApiRateLimit({
    request,
    bucket: "account-delete",
    userId: auth.user.id,
    limit: 5,
    windowMs: 15 * 60_000,
  });
  if (rateLimited) return rateLimited;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = accountDeleteConfirmSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Invalid account deletion confirmation.",
      },
      { status: 400 }
    );
  }

  if (
    parsed.data.confirmEmail &&
    auth.user.email &&
    parsed.data.confirmEmail !== auth.user.email.toLowerCase()
  ) {
    return NextResponse.json(
      { error: "Entered email does not match your signed-in account email." },
      { status: 400 }
    );
  }

  const rpcRes = await auth.supabase.rpc("deactivate_and_scrub_my_account", {
    p_confirm_phrase: parsed.data.confirmPhrase,
  });

  if (rpcRes.error) {
    return NextResponse.json(
      { error: rpcRes.error.message },
      { status: 400 }
    );
  }

  const result = rpcRes.data as {
    ok?: boolean;
    can_hard_delete_auth?: boolean;
  } | null;

  // Attempt hard auth deletion only when server secret key is configured AND
  // zero RESTRICT shared records prevent deleting auth.users -> profiles cleanly
  if (result?.can_hard_delete_auth) {
    try {
      const env = getServerEnv();
      if (env.SUPABASE_SECRET_KEY) {
        const adminClient = createSupabaseAdminClient(
          env.NEXT_PUBLIC_SUPABASE_URL,
          env.SUPABASE_SECRET_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } }
        );
        await adminClient.auth.admin.deleteUser(auth.user.id);
      }
    } catch {
      // PII is already scrubbed and is_deactivated = TRUE in PostgreSQL
    }
  }

  await auth.supabase.auth.signOut({ scope: "global" });

  return NextResponse.json(
    {
      deleted: true,
      hardDeletedAuth: Boolean(result?.can_hard_delete_auth),
    },
    { headers: PRIVATE_NO_STORE_HEADERS }
  );
}

