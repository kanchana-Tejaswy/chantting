import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveOptionalCarryForwardSchema } from "@/lib/sadhana/carry-forward";

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

  const parsed = resolveOptionalCarryForwardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Invalid carry-forward decision payload.",
      },
      { status: 400 }
    );
  }

  const rpcRes = await supabase.rpc("resolve_optional_carry_forward", {
    p_sadhana_date: parsed.data.sadhanaDate,
    p_accept: parsed.data.accept,
  });

  if (rpcRes.error) {
    return NextResponse.json({ error: rpcRes.error.message }, { status: 400 });
  }

  revalidatePath("/sadhana");
  revalidatePath("/sadhana/chant");

  return NextResponse.json({ daily_sadhana: rpcRes.data });
}

