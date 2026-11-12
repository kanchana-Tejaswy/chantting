import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createGoalSchema, deleteGoalSchema } from "@/lib/rooms/validation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid goal details." },
      { status: 400 }
    );
  }

  const insertRes = await supabase
    .from("room_goals")
    .insert({
      room_id: parsed.data.roomId,
      created_by: user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      target_rounds: parsed.data.targetRounds,
      period_type: parsed.data.periodType,
      start_date: parsed.data.startDate,
      end_date:
        parsed.data.endDate && parsed.data.endDate !== ""
          ? parsed.data.endDate
          : null,
      is_voluntary: parsed.data.isVoluntary,
    })
    .select(
      "id, room_id, created_by, title, description, target_rounds, period_type, start_date, end_date, is_voluntary, created_at"
    )
    .single();

  if (insertRes.error) {
    return NextResponse.json(
      { error: "Only room owners or admins can create shared goals." },
      { status: 403 }
    );
  }

  revalidatePath("/rooms");
  return NextResponse.json({ goal: insertRes.data }, { status: 201 });
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
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = deleteGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid delete payload." },
      { status: 400 }
    );
  }

  const delRes = await supabase
    .from("room_goals")
    .delete()
    .eq("id", parsed.data.goalId)
    .eq("room_id", parsed.data.roomId)
    .select("id")
    .maybeSingle();

  if (delRes.error || !delRes.data) {
    return NextResponse.json(
      { error: delRes.error?.message ?? "Goal not found or unauthorized." },
      { status: 403 }
    );
  }

  revalidatePath("/rooms");
  return NextResponse.json({ deleted: true });
}

