import { createClient } from "@/lib/supabase/server";
import {
  getGitaViewerContext,
  type GitaAdminAuditItem,
  type GitaViewerContext,
} from "@/lib/gita/queries";
import type { GitaContentSource } from "@/lib/gita/domain";
import { isMissingSchemaError } from "@/lib/sadhana/queries";
import type { ContentReviewStatus } from "@/lib/gita/validation";
import {
  computeRelatedResources,
  filterLibraryResources,
  isResourcePubliclyVisible,
  type LibraryHistoryItem,
  type LibraryResource,
} from "./domain";
import type { LibraryCategory, LibraryResourceType } from "./validation";

export type LibraryDirectoryLoadResult =
  | { status: "schema_not_ready"; detail: string }
  | { status: "error"; message: string }
  | {
      status: "ready";
      viewer: GitaViewerContext | null;
      allResources: LibraryResource[];
      filteredResources: LibraryResource[];
      bookmarkedIds: string[];
      recentlyViewed: LibraryHistoryItem[];
      categoryCounts: Record<string, number>;
      availableTags: string[];
    };

export type LibraryDetailLoadResult =
  | { status: "schema_not_ready"; detail: string }
  | { status: "error"; message: string }
  | {
      status: "not_found_or_unpublished";
      viewer: GitaViewerContext | null;
      slug: string;
    }
  | {
      status: "ready";
      viewer: GitaViewerContext | null;
      resource: LibraryResource;
      relatedResources: LibraryResource[];
      isBookmarked: boolean;
      lastViewedAt: string | null;
    };

export type LibraryAdminLoadResult =
  | { status: "unauthenticated" }
  | { status: "forbidden"; viewer: GitaViewerContext }
  | { status: "schema_not_ready"; detail: string }
  | { status: "error"; message: string }
  | {
      status: "ready";
      viewer: GitaViewerContext;
      resources: LibraryResource[];
      sources: GitaContentSource[];
      auditLogs: GitaAdminAuditItem[];
    };

const RESOURCE_SELECT_FIELDS =
  "id, slug, title, summary, category, resource_type, body_markdown, media_url, poster_url, external_url, source_id, author_or_speaker, language_code, estimated_minutes, license_name, copyright_notice, attribution_text, is_original_content, is_archived, tags, review_status, reviewed_by, reviewed_at, created_at, updated_at";

export function mapLibraryResourceRow(
  row: Record<string, unknown>,
  sourceMap: Map<string, GitaContentSource>
): LibraryResource {
  const sourceId = typeof row.source_id === "string" ? row.source_id : null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title ?? ""),
    summary: String(row.summary ?? ""),
    category: row.category as LibraryCategory,
    resource_type: row.resource_type as LibraryResourceType,
    body_markdown:
      typeof row.body_markdown === "string" ? row.body_markdown : null,
    media_url: typeof row.media_url === "string" ? row.media_url : null,
    poster_url: typeof row.poster_url === "string" ? row.poster_url : null,
    external_url:
      typeof row.external_url === "string" ? row.external_url : null,
    source_id: sourceId,
    author_or_speaker:
      typeof row.author_or_speaker === "string" ? row.author_or_speaker : null,
    language_code:
      typeof row.language_code === "string" ? row.language_code : "en",
    estimated_minutes:
      typeof row.estimated_minutes === "number" ? row.estimated_minutes : null,
    license_name:
      typeof row.license_name === "string" ? row.license_name : null,
    copyright_notice:
      typeof row.copyright_notice === "string" ? row.copyright_notice : null,
    attribution_text:
      typeof row.attribution_text === "string" ? row.attribution_text : null,
    is_original_content: Boolean(row.is_original_content),
    is_archived: Boolean(row.is_archived),
    tags: Array.isArray(row.tags)
      ? row.tags.filter((t): t is string => typeof t === "string")
      : [],
    review_status: row.review_status as ContentReviewStatus,
    reviewed_by: typeof row.reviewed_by === "string" ? row.reviewed_by : null,
    reviewed_at: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    source: sourceId ? (sourceMap.get(sourceId) ?? null) : null,
  };
}

export async function loadLibraryDirectory(filters: {
  q?: string;
  category?: LibraryCategory;
  type?: LibraryResourceType;
  tag?: string;
  savedOnly?: boolean;
}): Promise<LibraryDirectoryLoadResult> {
  const supabase = await createClient();
  const viewer = await getGitaViewerContext(supabase);

  const [resourcesRes, sourcesRes] = await Promise.all([
    supabase
      .from("library_resources")
      .select(RESOURCE_SELECT_FIELDS)
      .eq("review_status", "approved")
      .eq("is_archived", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("content_sources")
      .select(
        "id, slug, title, author_or_translator, tradition_or_lineage, license_name, license_url, attribution_text, source_url, review_status, reviewed_by, reviewed_at"
      )
      .eq("review_status", "approved"),
  ]);

  const err = resourcesRes.error ?? sourcesRes.error;
  if (err) {
    if (isMissingSchemaError(err)) {
      return { status: "schema_not_ready", detail: err.message };
    }
    return { status: "error", message: err.message };
  }

  const sourceMap = new Map<string, GitaContentSource>();
  for (const s of (sourcesRes.data ?? []) as GitaContentSource[]) {
    if (s.review_status === "approved") {
      sourceMap.set(s.id, s);
    }
  }

  const allResources = (resourcesRes.data ?? [])
    .map((r) => mapLibraryResourceRow(r as Record<string, unknown>, sourceMap))
    .filter(isResourcePubliclyVisible);

  const byId = new Map<string, LibraryResource>(
    allResources.map((r) => [r.id, r])
  );

  const bookmarkedIdSet = new Set<string>();
  const recentlyViewed: LibraryHistoryItem[] = [];

  if (viewer) {
    const [bmRes, histRes] = await Promise.all([
      supabase
        .from("library_bookmarks")
        .select("resource_id")
        .eq("user_id", viewer.userId),
      supabase
        .from("library_view_history")
        .select("id, resource_id, viewed_at")
        .eq("user_id", viewer.userId)
        .order("viewed_at", { ascending: false })
        .limit(40),
    ]);

    for (const b of bmRes.data ?? []) {
      bookmarkedIdSet.add(b.resource_id as string);
    }

    const seenHist = new Set<string>();
    for (const h of histRes.data ?? []) {
      const rid = h.resource_id as string;
      if (seenHist.has(rid)) continue;
      const resource = byId.get(rid) ?? null;
      if (!resource) continue;
      seenHist.add(rid);
      recentlyViewed.push({
        id: Number(h.id),
        resource_id: rid,
        viewed_at: String(h.viewed_at),
        resource,
      });
      if (recentlyViewed.length >= 6) break;
    }
  }

  const categoryCounts: Record<string, number> = {};
  const tagSet = new Set<string>();
  for (const res of allResources) {
    categoryCounts[res.category] = (categoryCounts[res.category] ?? 0) + 1;
    for (const tag of res.tags) tagSet.add(tag.toLowerCase());
  }

  const filteredResources = filterLibraryResources(allResources, {
    ...filters,
    bookmarkedIds: bookmarkedIdSet,
  });

  return {
    status: "ready",
    viewer,
    allResources,
    filteredResources,
    bookmarkedIds: Array.from(bookmarkedIdSet),
    recentlyViewed,
    categoryCounts,
    availableTags: Array.from(tagSet).sort(),
  };
}

export async function loadLibraryDetail(
  slug: string
): Promise<LibraryDetailLoadResult> {
  const supabase = await createClient();
  const viewer = await getGitaViewerContext(supabase);

  const [targetRes, allApprovedRes, sourcesRes] = await Promise.all([
    supabase
      .from("library_resources")
      .select(RESOURCE_SELECT_FIELDS)
      .eq("slug", slug)
      .eq("review_status", "approved")
      .eq("is_archived", false)
      .maybeSingle(),
    supabase
      .from("library_resources")
      .select(RESOURCE_SELECT_FIELDS)
      .eq("review_status", "approved")
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("content_sources")
      .select(
        "id, slug, title, author_or_translator, tradition_or_lineage, license_name, license_url, attribution_text, source_url, review_status, reviewed_by, reviewed_at"
      )
      .eq("review_status", "approved"),
  ]);

  const err = targetRes.error ?? allApprovedRes.error ?? sourcesRes.error;
  if (err) {
    if (isMissingSchemaError(err)) {
      return { status: "schema_not_ready", detail: err.message };
    }
    return { status: "error", message: err.message };
  }

  const sourceMap = new Map<string, GitaContentSource>();
  for (const s of (sourcesRes.data ?? []) as GitaContentSource[]) {
    if (s.review_status === "approved") {
      sourceMap.set(s.id, s);
    }
  }

  if (!targetRes.data) {
    return { status: "not_found_or_unpublished", viewer, slug };
  }

  const resource = mapLibraryResourceRow(
    targetRes.data as Record<string, unknown>,
    sourceMap
  );
  if (!isResourcePubliclyVisible(resource)) {
    return { status: "not_found_or_unpublished", viewer, slug };
  }

  const candidates = (allApprovedRes.data ?? [])
    .map((r) => mapLibraryResourceRow(r as Record<string, unknown>, sourceMap))
    .filter(isResourcePubliclyVisible);

  const relatedResources = computeRelatedResources(resource, candidates, 3);

  let isBookmarked = false;
  let lastViewedAt: string | null = null;
  if (viewer) {
    const [bmRes, histRes] = await Promise.all([
      supabase
        .from("library_bookmarks")
        .select("id")
        .eq("user_id", viewer.userId)
        .eq("resource_id", resource.id)
        .maybeSingle(),
      supabase
        .from("library_view_history")
        .select("viewed_at")
        .eq("user_id", viewer.userId)
        .eq("resource_id", resource.id)
        .order("viewed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    isBookmarked = Boolean(bmRes.data);
    lastViewedAt =
      histRes.data && typeof histRes.data.viewed_at === "string"
        ? histRes.data.viewed_at
        : null;
  }

  return {
    status: "ready",
    viewer,
    resource,
    relatedResources,
    isBookmarked,
    lastViewedAt,
  };
}

export async function loadLibraryAdminWorkspace(): Promise<LibraryAdminLoadResult> {
  const supabase = await createClient();
  const viewer = await getGitaViewerContext(supabase);
  if (!viewer) return { status: "unauthenticated" };
  if (!viewer.isAdmin) return { status: "forbidden", viewer };

  const [resourcesRes, sourcesRes, auditRes] = await Promise.all([
    supabase
      .from("library_resources")
      .select(RESOURCE_SELECT_FIELDS)
      .order("updated_at", { ascending: false }),
    supabase
      .from("content_sources")
      .select(
        "id, slug, title, author_or_translator, tradition_or_lineage, license_name, license_url, attribution_text, source_url, review_status, reviewed_by, reviewed_at"
      )
      .order("title", { ascending: true }),
    supabase
      .from("audit_logs")
      .select(
        "id, actor_user_id, action, target_table, target_id, metadata, created_at"
      )
      .eq("target_table", "library_resources")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const err = resourcesRes.error ?? sourcesRes.error ?? auditRes.error;
  if (err) {
    if (isMissingSchemaError(err)) {
      return { status: "schema_not_ready", detail: err.message };
    }
    return { status: "error", message: err.message };
  }

  const sources = (sourcesRes.data ?? []) as GitaContentSource[];
  const sourceMap = new Map<string, GitaContentSource>(
    sources.map((s) => [s.id, s])
  );

  return {
    status: "ready",
    viewer,
    resources: (resourcesRes.data ?? []).map((r) =>
      mapLibraryResourceRow(r as Record<string, unknown>, sourceMap)
    ),
    sources,
    auditLogs: (auditRes.data ?? []) as GitaAdminAuditItem[],
  };
}

