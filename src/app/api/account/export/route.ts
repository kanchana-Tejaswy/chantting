import { NextResponse } from "next/server";
import { getAuthenticatedGitaContext } from "@/lib/gita/api-helpers";
import {
  buildAccountExportDocument,
  type AccountPreferences,
  type AccountProfile,
} from "@/lib/account/domain";
import { enforceApiRateLimit } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const rateLimited = enforceApiRateLimit({
    request,
    bucket: "account-export",
    userId: auth.user.id,
    limit: 10,
    windowMs: 15 * 60_000,
  });
  if (rateLimited) return rateLimited;

  const uid = auth.user.id;
  const db = auth.supabase;

  const [
    profileRes,
    prefsRes,
    dailyRes,
    ledgerRes,
    sessionsRes,
    recordsRes,
    membershipsRes,
    gitaBmRes,
    gitaNotesRes,
    gitaHistRes,
    collectionsRes,
    libBmRes,
    libHistRes,
    achRes,
    notifRes,
  ] = await Promise.all([
    db.from("profiles").select("*").eq("id", uid).maybeSingle(),
    db.from("user_preferences").select("*").eq("user_id", uid).maybeSingle(),
    db
      .from("daily_sadhana")
      .select("*")
      .eq("user_id", uid)
      .order("sadhana_date", { ascending: false }),
    db
      .from("carry_forward_ledger")
      .select("*")
      .eq("user_id", uid)
      .order("to_date", { ascending: false }),
    db
      .from("chanting_sessions")
      .select("*")
      .eq("user_id", uid)
      .order("started_at", { ascending: false }),
    db
      .from("chanting_records")
      .select("*")
      .eq("user_id", uid)
      .order("recorded_at", { ascending: false }),
    db.from("room_memberships").select("*").eq("user_id", uid),
    db.from("gita_bookmarks").select("*").eq("user_id", uid),
    db.from("gita_notes").select("*").eq("user_id", uid),
    db
      .from("gita_reading_history")
      .select("*")
      .eq("user_id", uid)
      .order("read_at", { ascending: false }),
    db.from("learning_collections").select("*").eq("user_id", uid),
    db.from("library_bookmarks").select("*").eq("user_id", uid),
    db
      .from("library_view_history")
      .select("*")
      .eq("user_id", uid)
      .order("viewed_at", { ascending: false }),
    db.from("user_achievements").select("*").eq("user_id", uid),
    db
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),
  ]);

  if (profileRes.error || prefsRes.error || !profileRes.data || !prefsRes.data) {
    return NextResponse.json(
      { error: "Unable to assemble account export." },
      { status: 500 }
    );
  }

  const exportedAt = new Date().toISOString();
  const payload = buildAccountExportDocument({
    exportedAt,
    userEmail: auth.user.email ?? null,
    profile: profileRes.data as AccountProfile,
    preferences: prefsRes.data as AccountPreferences,
    dailySadhana: dailyRes.data ?? [],
    carryForwardLedger: ledgerRes.data ?? [],
    chantingSessions: sessionsRes.data ?? [],
    chantingRecords: recordsRes.data ?? [],
    roomMemberships: membershipsRes.data ?? [],
    gitaBookmarks: gitaBmRes.data ?? [],
    gitaNotes: gitaNotesRes.data ?? [],
    gitaReadingHistory: gitaHistRes.data ?? [],
    learningCollections: collectionsRes.data ?? [],
    libraryBookmarks: libBmRes.data ?? [],
    libraryViewHistory: libHistRes.data ?? [],
    achievements: achRes.data ?? [],
    notifications: notifRes.data ?? [],
  });

  const dateTag = exportedAt.slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="smaran-export-${dateTag}.json"`,
      "Cache-Control": "no-store, private",
    },
  });
}

