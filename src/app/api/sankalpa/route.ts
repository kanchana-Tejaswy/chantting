import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createSankalpaRecord,
  deleteSankalpaRecord,
  listUserSankalpas,
  updateSankalpaRecord,
} from "@/lib/sankalpa/queries";
import {
  createSankalpaInputSchema,
  updateSankalpaInputSchema,
} from "@/lib/sankalpa/validation";
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

  const sankalpas = await listUserSankalpas(supabase, user.id);
  const activeSankalpa = sankalpas.find((s) => s.status === "active") ?? null;

  return NextResponse.json(
    { sankalpas, activeSankalpa },
    { headers: PRIVATE_NO_STORE_HEADERS }
  );
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
    bucket: "sankalpa-create",
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

  const parsed = createSankalpaInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid Sankalpa payload." },
      { status: 400 }
    );
  }

  try {
    const sankalpa = await createSankalpaRecord(supabase, user.id, {
      title: parsed.data.title,
      description: parsed.data.description,
      targetRounds: parsed.data.targetRounds,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      includeLifetimeRounds: parsed.data.includeLifetimeRounds,
      initialCompletedRounds: parsed.data.initialCompletedRounds,
      autoPauseExisting: parsed.data.autoPauseExisting,
      status: parsed.data.status,
    });

    revalidatePath("/sadhana");
    revalidatePath("/sadhana/chant");

    return NextResponse.json({ sankalpa }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create Sankalpa." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
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
    bucket: "sankalpa-update",
    userId: user.id,
    limit: 60,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = updateSankalpaInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid Sankalpa update payload." },
      { status: 400 }
    );
  }

  try {
    const sankalpa = await updateSankalpaRecord(supabase, user.id, parsed.data.id, {
      title: parsed.data.title,
      description: parsed.data.description,
      targetRounds: parsed.data.targetRounds,
      addRounds: parsed.data.addRounds,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      status: parsed.data.status,
      autoPauseExisting: parsed.data.autoPauseExisting,
    });

    revalidatePath("/sadhana");
    revalidatePath("/sadhana/chant");

    return NextResponse.json({ sankalpa }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update Sankalpa." },
      { status: 400 }
    );
  }
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

  const rateLimited = enforceApiRateLimit({
    request,
    bucket: "sankalpa-delete",
    userId: user.id,
    limit: 20,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const url = new URL(request.url);
  let id = url.searchParams.get("id");

  if (!id) {
    try {
      const body = (await request.json()) as { id?: string };
      id = body?.id ?? null;
    } catch {
      // url search param fallback
    }
  }

  if (!id) {
    return NextResponse.json(
      { error: "Sankalpa id is required for deletion." },
      { status: 400 }
    );
  }

  try {
    await deleteSankalpaRecord(supabase, user.id, id);

    revalidatePath("/sadhana");
    revalidatePath("/sadhana/chant");

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete Sankalpa." },
      { status: 400 }
    );
  }
}

