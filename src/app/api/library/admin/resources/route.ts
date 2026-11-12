import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getAuthorizedAdminContext,
  parseJsonBody,
} from "@/lib/gita/api-helpers";
import { adminDeleteIdSchema } from "@/lib/gita/validation";
import {
  libraryResourceAdminSchema,
  libraryResourceStatusSchema,
} from "@/lib/library/validation";

function revalidateLibraryPaths(slug?: string | null) {
  revalidatePath("/library");
  revalidatePath("/library/admin");
  if (slug) {
    revalidatePath(`/library/${slug}`);
  }
}

export async function POST(request: Request) {
  const admin = await getAuthorizedAdminContext();
  if (!admin.ok) return admin.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = libraryResourceAdminSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Invalid library resource payload.",
      },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const isApproved = d.reviewStatus === "approved";

  const res = await admin.supabase
    .from("library_resources")
    .insert({
      slug: d.slug,
      title: d.title,
      summary: d.summary,
      category: d.category,
      resource_type: d.resourceType,
      body_markdown: d.bodyMarkdown,
      external_url: d.externalUrl,
      media_url: d.mediaUrl,
      poster_url: d.posterUrl,
      source_id: d.sourceId ?? null,
      author_or_speaker: d.authorOrSpeaker,
      language_code: d.languageCode,
      estimated_minutes: d.estimatedMinutes,
      license_name: d.licenseName,
      copyright_notice: d.copyrightNotice,
      attribution_text: d.attributionText,
      is_original_content: d.isOriginalContent,
      is_archived: d.isArchived,
      tags: d.tags,
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

  revalidateLibraryPaths(d.slug);
  return NextResponse.json({ resource: res.data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const admin = await getAuthorizedAdminContext();
  if (!admin.ok) return admin.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  // Support quick moderation action (publish, unpublish, needs_correction, archive, unarchive)
  if (
    body.data &&
    typeof body.data === "object" &&
    "action" in body.data
  ) {
    const actionParsed = libraryResourceStatusSchema.safeParse(body.data);
    if (!actionParsed.success) {
      return NextResponse.json(
        {
          error:
            actionParsed.error.issues[0]?.message ??
            "Invalid moderation action.",
        },
        { status: 400 }
      );
    }

    const { id, action } = actionParsed.data;
    const existingRes = await admin.supabase
      .from("library_resources")
      .select(
        "id, slug, body_markdown, external_url, media_url, source_id, is_original_content, attribution_text, license_name"
      )
      .eq("id", id)
      .maybeSingle();

    if (existingRes.error || !existingRes.data) {
      return NextResponse.json(
        { error: "Library resource not found." },
        { status: 404 }
      );
    }

    const existing = existingRes.data as Record<string, unknown>;
    if (action === "publish") {
      const hasBodyOrLink = Boolean(
        existing.body_markdown || existing.external_url || existing.media_url
      );
      if (!hasBodyOrLink) {
        return NextResponse.json(
          {
            error:
              "Cannot publish an empty resource without body text, media URL, or external link.",
          },
          { status: 400 }
        );
      }
      const hasLicenseAndAttribution = Boolean(
        existing.is_original_content ||
          existing.source_id ||
          (existing.attribution_text && existing.license_name)
      );
      if (!hasLicenseAndAttribution) {
        return NextResponse.json(
          {
            error:
              "External or sourced resources require license and attribution before publication.",
          },
          { status: 400 }
        );
      }
    }

    const patchFields: Record<string, unknown> = {};
    if (action === "publish") {
      patchFields.review_status = "approved";
      patchFields.is_archived = false;
      patchFields.reviewed_by = admin.userId;
      patchFields.reviewed_at = new Date().toISOString();
    } else if (action === "unpublish") {
      patchFields.review_status = "pending_review";
      patchFields.reviewed_at = null;
    } else if (action === "needs_correction") {
      patchFields.review_status = "needs_correction";
      patchFields.reviewed_at = null;
    } else if (action === "archive") {
      patchFields.is_archived = true;
    } else if (action === "unarchive") {
      patchFields.is_archived = false;
    }

    const updateRes = await admin.supabase
      .from("library_resources")
      .update(patchFields)
      .eq("id", id)
      .select("*")
      .single();

    if (updateRes.error) {
      return NextResponse.json(
        { error: updateRes.error.message },
        { status: 400 }
      );
    }

    revalidateLibraryPaths(String(existing.slug));
    return NextResponse.json({ resource: updateRes.data });
  }

  // Otherwise full resource edit
  const parsed = libraryResourceAdminSchema.safeParse(body.data);
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json(
      {
        error: !parsed.success
          ? parsed.error.issues[0]?.message ?? "Invalid resource update."
          : "Resource ID is required.",
      },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const isApproved = d.reviewStatus === "approved";

  const res = await admin.supabase
    .from("library_resources")
    .update({
      slug: d.slug,
      title: d.title,
      summary: d.summary,
      category: d.category,
      resource_type: d.resourceType,
      body_markdown: d.bodyMarkdown,
      external_url: d.externalUrl,
      media_url: d.mediaUrl,
      poster_url: d.posterUrl,
      source_id: d.sourceId ?? null,
      author_or_speaker: d.authorOrSpeaker,
      language_code: d.languageCode,
      estimated_minutes: d.estimatedMinutes,
      license_name: d.licenseName,
      copyright_notice: d.copyrightNotice,
      attribution_text: d.attributionText,
      is_original_content: d.isOriginalContent,
      is_archived: d.isArchived,
      tags: d.tags,
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
    return NextResponse.json(
      { error: "Library resource not found." },
      { status: 404 }
    );
  }

  revalidateLibraryPaths(d.slug);
  return NextResponse.json({ resource: res.data });
}

export async function DELETE(request: Request) {
  const admin = await getAuthorizedAdminContext();
  if (!admin.ok) return admin.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = adminDeleteIdSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid resource ID." },
      { status: 400 }
    );
  }

  const res = await admin.supabase
    .from("library_resources")
    .delete()
    .eq("id", parsed.data.id);

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 400 });
  }

  revalidateLibraryPaths();
  return NextResponse.json({ deleted: true });
}

