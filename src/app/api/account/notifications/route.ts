import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getAuthenticatedGitaContext,
  parseJsonBody,
} from "@/lib/gita/api-helpers";
import { notificationActionSchema } from "@/lib/account/validation";

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = notificationActionSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Invalid notification action.",
      },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();

  if (parsed.data.action === "mark_all_read") {
    const res = await auth.supabase
      .from("notifications")
      .update({ is_read: true, read_at: nowIso })
      .eq("user_id", auth.user.id)
      .eq("is_read", false);

    if (res.error) {
      return NextResponse.json({ error: res.error.message }, { status: 400 });
    }
  } else if (parsed.data.action === "mark_read") {
    const res = await auth.supabase
      .from("notifications")
      .update({ is_read: true, read_at: nowIso })
      .eq("id", parsed.data.notificationId!)
      .eq("user_id", auth.user.id);

    if (res.error) {
      return NextResponse.json({ error: res.error.message }, { status: 400 });
    }
  } else if (parsed.data.action === "dismiss") {
    const res = await auth.supabase
      .from("notifications")
      .delete()
      .eq("id", parsed.data.notificationId!)
      .eq("user_id", auth.user.id);

    if (res.error) {
      return NextResponse.json({ error: res.error.message }, { status: 400 });
    }
  }

  revalidatePath("/account");
  return NextResponse.json({ ok: true });
}

export async function POST() {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  const rpcRes = await auth.supabase.rpc("evaluate_my_daily_reminder");
  if (rpcRes.error) {
    return NextResponse.json({ error: rpcRes.error.message }, { status: 400 });
  }

  revalidatePath("/account");
  return NextResponse.json({ evaluation: rpcRes.data });
}

