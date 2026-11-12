import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(16),
});

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(16).optional(),
  DATABASE_URL: z.string().min(16).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates browser-safe public Supabase configuration.
 * Never reads or exposes secret server keys.
 */
export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

/**
 * Validates server-only configuration. Throws if accidentally called in a browser bundle.
 */
export function getServerEnv(): PublicEnv & ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must never be called in browser code.");
  }

  return {
    ...getPublicEnv(),
    ...serverEnvSchema.parse({
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
    }),
  };
}

