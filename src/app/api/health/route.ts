import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  return NextResponse.json({
    status: "ok",
    service: "krishna-sadhana",
    version: "1.0",
    supabaseConfigured: configured,
  });
}
