import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectPath } from "@/lib/auth/validation";

const VALID_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const nextPath = sanitizeRedirectPath(searchParams.get("next"), "/sadhana");

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(nextPath, origin));
    }
  } else if (
    tokenHash &&
    typeParam &&
    VALID_OTP_TYPES.has(typeParam as EmailOtpType)
  ) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: typeParam as EmailOtpType,
    });
    if (!error) {
      return NextResponse.redirect(new URL(nextPath, origin));
    }
  }

  return NextResponse.redirect(
    new URL("/auth?error=Could+not+complete+authentication.+Please+try+again.", origin)
  );
}

