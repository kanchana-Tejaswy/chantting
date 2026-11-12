import { NextResponse } from "next/server";
import {
  adminDeleteIdSchema,
  contentSourceAdminSchema,
} from "@/lib/gita/validation";
import {
  getAuthorizedAdminContext,
  parseJsonBody,
  revalidateGitaPaths,
} from "@/lib/gita/api-helpers";

export async function POST(request: Request) {
  const admin = await getAuthorizedAdminContext();
  if (!admin.ok) return admin.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = contentSourceAdminSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid content source." },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const isApproved = d.reviewStatus === "approved";

  const res = await admin.supabase
    .from("content_sources")
    .insert({
      slug: d.slug,
      title: d.title,
      author_or_translator: d.authorOrTranslator,
      tradition_or_lineage: d.traditionOrLineage,
      license_name: d.licenseName,
      license_url: d.licenseUrl,
      attribution_text: d.attributionText,
      source_url: d.sourceUrl,
      review_status: d.reviewStatus,
      reviewed_by: isApproved ? admin.userId : null,
      reviewed_at: isApproved ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (res.error) {
    return NextResponse.json(
      { error: res.error.message },
      { status: res.error.code === "23505" ? 409 : 400 }
    );
  }

  revalidateGitaPaths();
  return NextResponse.json({ source: res.data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const admin = await getAuthorizedAdminContext();
  if (!admin.ok) return admin.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = contentSourceAdminSchema.safeParse(body.data);
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json(
      {
        error: !parsed.success
          ? parsed.error.issues[0]?.message ?? "Invalid content source update."
          : "Source ID is required.",
      },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const isApproved = d.reviewStatus === "approved";

  const res = await admin.supabase
    .from("content_sources")
    .update({
      slug: d.slug,
      title: d.title,
      author_or_translator: d.authorOrTranslator,
      tradition_or_lineage: d.traditionOrLineage,
      license_name: d.licenseName,
      license_url: d.licenseUrl,
      attribution_text: d.attributionText,
      source_url: d.sourceUrl,
      review_status: d.reviewStatus,
      reviewed_by: isApproved ? admin.userId : null,
      reviewed_at: isApproved ? new Date().toISOString() : null,
    })
    .eq("id", d.id)
    .select("*")
    .maybeSingle();

  if (res.error) {
    return NextResponse.json(
      { error: res.error.message },
      { status: res.error.code === "23505" ? 409 : 400 }
    );
  }

  if (!res.data) {
    return NextResponse.json({ error: "Source not found." }, { status: 404 });
  }

  revalidateGitaPaths();
  return NextResponse.json({ source: res.data });
}

export async function DELETE(request: Request) {
  const admin = await getAuthorizedAdminContext();
  if (!admin.ok) return admin.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = adminDeleteIdSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid source ID." },
      { status: 400 }
    );
  }

  const res = await admin.supabase
    .from("content_sources")
    .delete()
    .eq("id", parsed.data.id);

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 400 });
  }

  revalidateGitaPaths();
  return NextResponse.json({ deleted: true });
}

