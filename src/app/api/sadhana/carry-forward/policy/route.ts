import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateCarryForwardPolicyInputSchema } from "@/lib/sadhana/carry-forward";

export async function PATCH(request: Request) {
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

  const parsed = updateCarryForwardPolicyInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Invalid carry-forward policy payload.",
      },
      { status: 400 }
    );
  }

  const customRule =
    parsed.data.policy === "custom" &&
    typeof parsed.data.maxCarryCap === "number"
      ? { max_carry_cap: parsed.data.maxCarryCap }
      : {};

  const rpcRes = await supabase.rpc("update_carry_forward_policy", {
    p_policy: parsed.data.policy,
    p_custom_rule: customRule,
    p_apply_to_today: parsed.data.applyToToday,
    p_today_date: parsed.data.todayDate ?? null,
  });

  if (rpcRes.error) {
    return NextResponse.json({ error: rpcRes.error.message }, { status: 400 });
  }

  revalidatePath("/sadhana");
  revalidatePath("/sadhana/chant");
  revalidatePath("/onboarding");

  return NextResponse.json(rpcRes.data);
}

