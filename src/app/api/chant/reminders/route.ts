import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createReminderSchema,
  updateReminderSchema,
} from "@/lib/reminders/validation";
import {
  enforceApiRateLimit,
  PRIVATE_NO_STORE_HEADERS,
} from "@/lib/security/rate-limit";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }

  const { data, error } = await supabase
    .from("chanting_reminders")
    .select("*")
    .eq("user_id", user.id)
    .order("time_of_day", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reminders: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }

  const rateLimited = enforceApiRateLimit({
    request,
    bucket: "chant-reminders",
    userId: user.id,
    limit: 30,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createReminderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid reminder payload." },
      { status: 400 }
    );
  }

  // Ensure time format is HH:MM:00
  const normalizedTime = parsed.data.timeOfDay.includes(":")
    ? parsed.data.timeOfDay.split(":").length === 2
      ? `${parsed.data.timeOfDay}:00`
      : parsed.data.timeOfDay
    : `${parsed.data.timeOfDay}:00:00`;

  const { data, error } = await supabase
    .from("chanting_reminders")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      time_of_day: normalizedTime,
      days_of_week: parsed.data.daysOfWeek,
      is_enabled: parsed.data.isEnabled ?? true,
      reminder_type: parsed.data.reminderType ?? "browser",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath("/sadhana/chant");

  return NextResponse.json({ reminder: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = updateReminderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid reminder payload." },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.timeOfDay !== undefined) {
    updates.time_of_day = parsed.data.timeOfDay.split(":").length === 2
      ? `${parsed.data.timeOfDay}:00`
      : parsed.data.timeOfDay;
  }
  if (parsed.data.daysOfWeek !== undefined) updates.days_of_week = parsed.data.daysOfWeek;
  if (parsed.data.isEnabled !== undefined) updates.is_enabled = parsed.data.isEnabled;
  if (parsed.data.reminderType !== undefined) updates.reminder_type = parsed.data.reminderType;

  const { data, error } = await supabase
    .from("chanting_reminders")
    .update(updates)
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Reminder not found or not owned by user." },
      { status: 404 }
    );
  }

  revalidatePath("/sadhana/chant");

  return NextResponse.json({ reminder: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing reminder ID" }, { status: 400 });
  }

  const { error } = await supabase
    .from("chanting_reminders")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath("/sadhana/chant");

  return NextResponse.json({ success: true });
}

