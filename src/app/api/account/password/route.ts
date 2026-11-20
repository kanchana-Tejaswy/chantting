import { NextResponse } from "next/server";
import {
  getAuthenticatedGitaContext,
  parseJsonBody,
} from "@/lib/gita/api-helpers";
import { accountPasswordUpdateSchema } from "@/lib/account/validation";
import {
  enforceApiRateLimit,
  PRIVATE_NO_STORE_HEADERS,
} from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const rateLimited = enforceApiRateLimit({
    request,
    bucket: "account-password",
    userId: auth.user.id,
    limit: 6,
    windowMs: 15 * 60_000,
  });
  if (rateLimited) return rateLimited;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = accountPasswordUpdateSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Invalid password update details.",
      },
      { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }

  if (parsed.data.action === "update_password") {
    const { error } = await auth.supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    // Insert security notification for account audit
    try {
      const notifClient = auth.supabase.from("notifications");
      if (notifClient && typeof notifClient.insert === "function") {
        await notifClient.insert({
          user_id: auth.user.id,
          type: "system_notice",
          title: "Security Notice: Password Updated",
          body: "Your account credentials were successfully updated. If you did not initiate this change, sign out all devices immediately.",
          action_url: "/account?tab=security",
          metadata: {
            event: "password_updated",
            updated_at: new Date().toISOString(),
          },
        });
      }
    } catch {
      // Ignore background notification insertion failures safely
    }

    return NextResponse.json(
      {
        success: true,
        message: "Your password has been successfully updated.",
      },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  }

  if (parsed.data.action === "request_reset_link") {
    if (!auth.user.email) {
      return NextResponse.json(
        { error: "No email address associated with this account." },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const { error } = await auth.supabase.auth.resetPasswordForEmail(
      auth.user.email
    );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    // Insert security notification for account audit
    try {
      const notifClient = auth.supabase.from("notifications");
      if (notifClient && typeof notifClient.insert === "function") {
        await notifClient.insert({
          user_id: auth.user.id,
          type: "system_notice",
          title: "Security Notice: Password Reset Link Requested",
          body: "A password reset link was requested for your account and sent to your email address.",
          action_url: "/account?tab=security",
          metadata: {
            event: "password_reset_requested",
            requested_at: new Date().toISOString(),
          },
        });
      }
    } catch {
      // Ignore background notification insertion failures safely
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "A password reset link has been dispatched to your verified email address.",
      },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    { error: "Unsupported action." },
    { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
  );
}

