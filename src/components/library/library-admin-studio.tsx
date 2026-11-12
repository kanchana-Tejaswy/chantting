"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import type { GitaContentSource } from "@/lib/gita/domain";
import type { GitaAdminAuditItem, GitaViewerContext } from "@/lib/gita/queries";
import type { ContentReviewStatus } from "@/lib/gita/validation";
import {
  LIBRARY_CATEGORY_META,
  LIBRARY_TYPE_LABELS,
  type LibraryResource,
} from "@/lib/library/domain";
import {
  LIBRARY_CATEGORIES,
  LIBRARY_RESOURCE_TYPES,
  slugifyLibraryTitle,
  type LibraryCategory,
  type LibraryResourceType,
} from "@/lib/library/validation";

export interface LibraryAdminStudioProps {
  viewer: GitaViewerContext;
  resources: LibraryResource[];
  sources: GitaContentSource[];
  auditLogs: GitaAdminAuditItem[];
}

const REVIEW_BADGE: Record<
  ContentReviewStatus,
  "peacock" | "gold" | "kumkum" | "neutral"
> = {
  approved: "peacock",
  pending_review: "gold",
  needs_correction: "kumkum",
  draft: "neutral",
};

export function LibraryAdminStudio({
  viewer,
  resources,
  sources,
  auditLogs,
}: LibraryAdminStudioProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [filterView, setFilterView] = React.useState<
    "all" | "pending" | "approved" | "archived"
  >("all");

  // Form State
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [category, setCategory] =
    React.useState<LibraryCategory>("gita_learning");
  const [resourceType, setResourceType] =
    React.useState<LibraryResourceType>("article");
  const [authorOrSpeaker, setAuthorOrSpeaker] = React.useState("");
  const [languageCode, setLanguageCode] = React.useState("en");
  const [estimatedMinutes, setEstimatedMinutes] = React.useState("");
  const [sourceId, setSourceId] = React.useState("");
  const [externalUrl, setExternalUrl] = React.useState("");
  const [mediaUrl, setMediaUrl] = React.useState("");
  const [posterUrl, setPosterUrl] = React.useState("");
  const [licenseName, setLicenseName] = React.useState("");
  const [attributionText, setAttributionText] = React.useState("");
  const [copyrightNotice, setCopyrightNotice] = React.useState("");
  const [isOriginalContent, setIsOriginalContent] = React.useState(false);
  const [isArchived, setIsArchived] = React.useState(false);
  const [tagsRaw, setTagsRaw] = React.useState("");
  const [bodyMarkdown, setBodyMarkdown] = React.useState("");
  const [reviewStatus, setReviewStatus] =
    React.useState<ContentReviewStatus>("pending_review");

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setSlug("");
    setSummary("");
    setCategory("gita_learning");
    setResourceType("article");
    setAuthorOrSpeaker("");
    setLanguageCode("en");
    setEstimatedMinutes("");
    setSourceId("");
    setExternalUrl("");
    setMediaUrl("");
    setPosterUrl("");
    setLicenseName("");
    setAttributionText("");
    setCopyrightNotice("");
    setIsOriginalContent(false);
    setIsArchived(false);
    setTagsRaw("");
    setBodyMarkdown("");
    setReviewStatus("pending_review");
  }

  async function callResourcesApi(
    method: "POST" | "PATCH" | "DELETE",
    payload: Record<string, unknown>,
    successMsg: string
  ): Promise<boolean> {
    setBusy(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/library/admin/resources", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMessage(json.error ?? "Operation failed.");
        return false;
      }
      setStatusMessage(successMsg);
      router.refresh();
      return true;
    } catch {
      setErrorMessage("Network error saving library resource.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await callResourcesApi(
      editingId ? "PATCH" : "POST",
      {
        ...(editingId ? { id: editingId } : {}),
        slug: slug.trim() || slugifyLibraryTitle(title),
        title,
        summary,
        category,
        resourceType,
        authorOrSpeaker: authorOrSpeaker || null,
        languageCode,
        estimatedMinutes: estimatedMinutes || null,
        sourceId: sourceId || null,
        externalUrl: externalUrl || null,
        mediaUrl: mediaUrl || null,
        posterUrl: posterUrl || null,
        licenseName: licenseName || null,
        attributionText: attributionText || null,
        copyrightNotice: copyrightNotice || null,
        isOriginalContent,
        isArchived,
        tags: tagsRaw
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
        bodyMarkdown: bodyMarkdown || null,
        reviewStatus,
      },
      editingId ? "Library resource updated." : "Library resource created."
    );
    if (ok) resetForm();
  }

  const displayedResources = resources.filter((r) => {
    if (filterView === "archived") return r.is_archived;
    if (filterView === "approved")
      return r.review_status === "approved" && !r.is_archived;
    if (filterView === "pending")
      return r.review_status !== "approved" && !r.is_archived;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-sandalwood-border pb-6">
        <div>
          <Badge variant="gold">
            <ShieldCheck className="size-3.5" aria-hidden={true} />
            <span>
              Library Content Studio · {viewer.adminRole ?? "scripture_admin"}
            </span>
          </Badge>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
            Manage Spiritual Library Resources
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Create, review, publish, unpublish, or archive devotional articles,
            lectures, study guides, books, and verified external links.
          </p>
        </div>

        <Link
          href="/library"
          className={buttonStyles({ variant: "secondary", size: "md" })}
        >
          <ArrowLeft className="size-4" aria-hidden={true} />
          <span>Public Library</span>
        </Link>
      </header>

      {statusMessage && (
        <div className="flex items-center gap-2 rounded-[12px] border border-peacock-green/35 bg-tulsi-wash px-4 py-3 text-sm text-peacock-ink">
          <CheckCircle2 className="size-4" aria-hidden={true} />
          <span>{statusMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-[12px] border border-kumkum/35 bg-kumkum-wash px-4 py-3 text-sm text-kumkum"
        >
          <ShieldAlert className="size-4" aria-hidden={true} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Card */}
        <Card surface="parchment">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              {editingId ? "Edit Resource" : "Add Library Resource"}
            </CardTitle>
            <CardDescription>
              Sourced or external content requires attribution &amp; licensing
              before publication. External URLs must be safe https/http links.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="lr-title" label="Title" required>
                  <Input
                    id="lr-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </FormField>
                <FormField id="lr-slug" label="URL Slug" required>
                  <Input
                    id="lr-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="bhagavad-gita-overview"
                    required
                  />
                </FormField>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <FormField id="lr-cat" label="Category" required>
                  <Select
                    id="lr-cat"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as LibraryCategory)
                    }
                  >
                    {LIBRARY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {LIBRARY_CATEGORY_META[c].label}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField id="lr-type" label="Format" required>
                  <Select
                    id="lr-type"
                    value={resourceType}
                    onChange={(e) =>
                      setResourceType(e.target.value as LibraryResourceType)
                    }
                  >
                    {LIBRARY_RESOURCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {LIBRARY_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField id="lr-status" label="Review Status">
                  <Select
                    id="lr-status"
                    value={reviewStatus}
                    onChange={(e) =>
                      setReviewStatus(e.target.value as ContentReviewStatus)
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="pending_review">Pending review</option>
                    <option value="approved">Approved (Published)</option>
                    <option value="needs_correction">Needs correction</option>
                  </Select>
                </FormField>
              </div>

              <FormField id="lr-summary" label="Summary Description" required>
                <Textarea
                  id="lr-summary"
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  required
                />
              </FormField>

              <div className="grid gap-3 sm:grid-cols-3">
                <FormField id="lr-author" label="Author / Speaker">
                  <Input
                    id="lr-author"
                    value={authorOrSpeaker}
                    onChange={(e) => setAuthorOrSpeaker(e.target.value)}
                  />
                </FormField>
                <FormField id="lr-lang" label="Language">
                  <Input
                    id="lr-lang"
                    value={languageCode}
                    onChange={(e) => setLanguageCode(e.target.value)}
                  />
                </FormField>
                <FormField id="lr-mins" label="Est. Minutes">
                  <Input
                    id="lr-mins"
                    type="number"
                    min={1}
                    max={2400}
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(e.target.value)}
                  />
                </FormField>
              </div>

              <FormField
                id="lr-source"
                label="Linked Registered Source (Optional)"
              >
                <Select
                  id="lr-source"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                >
                  <option value="">Specify license/attribution below</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} — {s.author_or_translator} ({s.license_name})
                    </option>
                  ))}
                </Select>
              </FormField>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="lr-license" label="License Name">
                  <Input
                    id="lr-license"
                    value={licenseName}
                    onChange={(e) => setLicenseName(e.target.value)}
                    placeholder="Public Domain, CC BY 4.0..."
                  />
                </FormField>
                <FormField id="lr-ext-url" label="External / Source URL">
                  <Input
                    id="lr-ext-url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </FormField>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="lr-poster" label="Thumbnail / Cover URL">
                  <Input
                    id="lr-poster"
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(e.target.value)}
                    placeholder="https://... or /images/..."
                  />
                </FormField>
                <FormField id="lr-media" label="Optional Lecture / Audio URL">
                  <Input
                    id="lr-media"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </FormField>
              </div>

              <FormField id="lr-attr" label="Attribution & Citation">
                <Textarea
                  id="lr-attr"
                  rows={2}
                  value={attributionText}
                  onChange={(e) => setAttributionText(e.target.value)}
                />
              </FormField>

              <FormField id="lr-copy" label="Copyright / Usage Notice">
                <Input
                  id="lr-copy"
                  value={copyrightNotice}
                  onChange={(e) => setCopyrightNotice(e.target.value)}
                />
              </FormField>

              <FormField id="lr-tags" label="Tags (comma separated)">
                <Input
                  id="lr-tags"
                  value={tagsRaw}
                  onChange={(e) => setTagsRaw(e.target.value)}
                  placeholder="japa, pronunciation, chapter-2"
                />
              </FormField>

              <FormField
                id="lr-body"
                label="Article / Reading Markdown (Plain Safe Markdown)"
              >
                <Textarea
                  id="lr-body"
                  rows={5}
                  value={bodyMarkdown}
                  onChange={(e) => setBodyMarkdown(e.target.value)}
                />
              </FormField>

              <div className="flex flex-wrap gap-4 text-sm text-ink">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isOriginalContent}
                    onChange={(e) => setIsOriginalContent(e.target.checked)}
                    className="size-4 accent-peacock-deep"
                  />
                  <span>Original SMARAN work</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isArchived}
                    onChange={(e) => setIsArchived(e.target.checked)}
                    className="size-4 accent-peacock-deep"
                  />
                  <span>Archived (hidden from public)</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" disabled={busy}>
                  {editingId ? "Update Resource" : "Save Resource"}
                </Button>
                {editingId && (
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    Cancel Edit
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right Column: Registry + Audit Log */}
        <div className="space-y-6">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Resource Registry ({displayedResources.length})
              </CardTitle>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {(
                  [
                    ["all", "All"],
                    ["pending", "Pending & Drafts"],
                    ["approved", "Published"],
                    ["archived", "Archived"],
                  ] as const
                ).map(([k, label]) => (
                  <Button
                    key={k}
                    type="button"
                    size="sm"
                    variant={filterView === k ? "primary" : "secondary"}
                    onClick={() => setFilterView(k)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[620px] overflow-y-auto">
              {displayedResources.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No library resources match this view yet.
                </p>
              ) : (
                displayedResources.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-[12px] border border-sandalwood-border bg-ivory p-3.5 text-xs space-y-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {r.title}
                        </p>
                        <p className="text-ink-muted">
                          {LIBRARY_CATEGORY_META[r.category].label} ·{" "}
                          {LIBRARY_TYPE_LABELS[r.resource_type]}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {r.is_archived && (
                          <Badge variant="neutral">Archived</Badge>
                        )}
                        <Badge variant={REVIEW_BADGE[r.review_status]}>
                          {r.review_status}
                        </Badge>
                      </div>
                    </div>

                    <p className="line-clamp-2 text-ink-muted">{r.summary}</p>

                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingId(r.id);
                          setTitle(r.title);
                          setSlug(r.slug);
                          setSummary(r.summary);
                          setCategory(r.category);
                          setResourceType(r.resource_type);
                          setAuthorOrSpeaker(r.author_or_speaker ?? "");
                          setLanguageCode(r.language_code);
                          setEstimatedMinutes(
                            r.estimated_minutes
                              ? String(r.estimated_minutes)
                              : ""
                          );
                          setSourceId(r.source_id ?? "");
                          setExternalUrl(r.external_url ?? "");
                          setMediaUrl(r.media_url ?? "");
                          setPosterUrl(r.poster_url ?? "");
                          setLicenseName(r.license_name ?? "");
                          setAttributionText(r.attribution_text ?? "");
                          setCopyrightNotice(r.copyright_notice ?? "");
                          setIsOriginalContent(r.is_original_content);
                          setIsArchived(r.is_archived);
                          setTagsRaw(r.tags.join(", "));
                          setBodyMarkdown(r.body_markdown ?? "");
                          setReviewStatus(r.review_status);
                        }}
                      >
                        Edit
                      </Button>

                      {r.review_status !== "approved" && !r.is_archived && (
                        <Button
                          type="button"
                          size="sm"
                          variant="gold"
                          disabled={busy}
                          onClick={() =>
                            callResourcesApi(
                              "PATCH",
                              { id: r.id, action: "publish" },
                              `Published "${r.title}".`
                            )
                          }
                        >
                          Publish
                        </Button>
                      )}

                      {r.review_status === "approved" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            callResourcesApi(
                              "PATCH",
                              { id: r.id, action: "unpublish" },
                              `Unpublished "${r.title}".`
                            )
                          }
                        >
                          Unpublish
                        </Button>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          callResourcesApi(
                            "PATCH",
                            {
                              id: r.id,
                              action: r.is_archived ? "unarchive" : "archive",
                            },
                            r.is_archived
                              ? `Restored "${r.title}".`
                              : `Archived "${r.title}".`
                          )
                        }
                      >
                        <Archive className="size-3.5" aria-hidden={true} />
                        <span>{r.is_archived ? "Unarchive" : "Archive"}</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        aria-label={`Delete ${r.title}`}
                        onClick={() =>
                          callResourcesApi(
                            "DELETE",
                            { id: r.id },
                            `Deleted "${r.title}".`
                          )
                        }
                      >
                        <Trash2 className="size-3.5" aria-hidden={true} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-xl">
                Library CMS Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[260px] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No library CMS audit entries logged yet.
                </p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between gap-2 rounded-[10px] border border-sandalwood-border bg-ivory px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-ink">
                      {log.action}
                    </span>
                    <span className="text-ink-muted tabular-nums">
                      {log.created_at.slice(0, 16).replace("T", " ")}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

