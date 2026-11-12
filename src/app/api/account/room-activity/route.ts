import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthenticatedGitaContext } from "@/lib/gita/api-helpers";

const purgeSchema = z.object({
  roomId: z.uuid("Valid room ID is required.").optional(),
});

export async function DELETE(request: Request) {
  const auth = await getAuthenticatedGitaContext();
  if (!auth.ok) return auth.response;

  let roomId: string | undefined;
  try {
    const raw = (await request.json()) as unknown;
    if (raw && typeof raw === "object" && "roomId" in raw) {
      const parsed = purgeSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid room ID." },
          { status: 400 }
        );
      }
      roomId = parsed.data.roomId;
    }
  } catch {
    // Allow clearing all user's shared room activity rows when no body provided
  }

  let delQuery = auth.supabase
    .from("room_activity_feed")
    .delete()
    .eq("user_id", auth.user.id);

  if (roomId) {
    delQuery = delQuery.eq("room_id", roomId);
  }

  const res = await delQuery;
  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 400 });
  }

  revalidatePath("/rooms");
  revalidatePath("/account");
  return NextResponse.json({ purged: true });
}

