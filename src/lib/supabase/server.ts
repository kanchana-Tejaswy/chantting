import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";

/**
 * Per-request server Supabase client bound to Next.js request cookies.
 * Uses the publishable key so RLS always enforces caller permissions.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    getPublicEnv();

  return createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Invoked from a Server Component where mutating cookies is a no-op;
            // proxy.ts refreshes session cookies on incoming requests.
          }
        },
      },
    }
  );
}

