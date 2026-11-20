import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";
import {
  buildAuthRedirectPath,
  isProtectedRoute,
} from "@/lib/auth/route-guard";
import { sanitizeRedirectPath } from "@/lib/auth/validation";

/**
 * Refreshes Supabase auth cookies on incoming requests and enforces
 * protected route redirects before Server Components render.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return response;
  }

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    getPublicEnv();

  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({
            request,
          });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Verify claims safely (never rely on unverified session objects)
  const { data, error } = await supabase.auth.getClaims();
  let isAuthenticated = !error && Boolean(data?.claims?.sub);

  if (!isAuthenticated && typeof supabase.auth.getUser === "function") {
    try {
      const userResult = await supabase.auth.getUser();
      if (userResult && !userResult.error && Boolean(userResult.data?.user?.id)) {
        isAuthenticated = true;
      }
    } catch {
      // Fallback safely if getUser throws in test environment
    }
  }

  const { pathname, search } = request.nextUrl;

  if (!isAuthenticated && isProtectedRoute(pathname)) {
    const loginUrl = new URL(
      buildAuthRedirectPath(pathname, search),
      request.url
    );
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated visitors away from auth entry points into the app
  if (isAuthenticated && pathname === "/auth") {
    const nextParam = request.nextUrl.searchParams.get("next");
    const target = sanitizeRedirectPath(nextParam, "/sadhana");
    return NextResponse.redirect(new URL(target, request.url));
  }

  return response;
}
