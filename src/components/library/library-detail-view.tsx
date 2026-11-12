"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Clock,
  ExternalLink,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { ManuscriptDivider } from "@/components/sacred/ornaments";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GitaViewerContext } from "@/lib/gita/queries";
import {
  extractSafeHostname,
  LIBRARY_CATEGORY_META,
  LIBRARY_TYPE_LABELS,
  parseSafeMarkdownBlocks,
  type LibraryResource,
} from "@/lib/library/domain";
import { ResourceCoverImage } from "./resource-cover";

export interface LibraryDetailViewProps {
  viewer: GitaViewerContext | null;
  resource: LibraryResource;
  relatedResources: LibraryResource[];
  initialBookmarked: boolean;
  lastViewedAt: string | null;
}

export function LibraryDetailView({
  viewer,
  resource,
  relatedResources,
  initialBookmarked,
  lastViewedAt,
}: LibraryDetailViewProps) {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = React.useState(initialBookmarked);
  const [bookmarkBusy, setBookmarkBusy] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Record view history silently on mount when signed in
  React.useEffect(() => {
    if (!viewer) return;
    void fetch("/api/library/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId: resource.id }),
    }).catch(() => {
      // Non-blocking history tracking
    });
  }, [viewer, resource.id]);

  async function toggleBookmark() {
    if (!viewer || bookmarkBusy) return;
    setBookmarkBusy(true);
    setErrorMsg(null);
    const nextState = !isBookmarked;
    try {
      const res = await fetch("/api/library/bookmarks", {
        method: nextState ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: resource.id }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMsg(j.error ?? "Unable to update bookmark.");
      } else {
        setIsBookmarked(nextState);
        router.refresh();
      }
    } catch {
      setErrorMsg("Network error while updating bookmark.");
    } finally {
      setBookmarkBusy(false);
    }
  }

  const outboundUrl = resource.external_url ?? resource.media_url;
  const outboundHost = extractSafeHostname(outboundUrl);
  const markdownBlocks = resource.body_markdown
    ? parseSafeMarkdownBlocks(resource.body_markdown)
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      {/* Top Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/library"
          className={buttonStyles({ variant: "secondary", size: "sm" })}
        >
          <ArrowLeft className="size-4" aria-hidden={true} />
          <span>Spiritual Library</span>
        </Link>

        {viewer ? (
          <Button
            type="button"
            variant={isBookmarked ? "gold" : "secondary"}
            size="sm"
            disabled={bookmarkBusy}
            onClick={toggleBookmark}
          >
            <Bookmark className="size-4" aria-hidden={true} />
            <span>{isBookmarked ? "Saved in Library" : "Save Resource"}</span>
          </Button>
        ) : (
          <Link
            href={`/auth?next=${encodeURIComponent(`/library/${resource.slug}`)}`}
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            Sign in to save
          </Link>
        )}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-[12px] border border-kumkum/30 bg-kumkum-wash px-4 py-3 text-sm text-kumkum"
        >
          {errorMsg}
        </div>
      )}

      {/* Header & Metadata Card */}
      <Card surface="parchment">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="peacock">
                {LIBRARY_CATEGORY_META[resource.category].label}
              </Badge>
              <Badge variant="neutral">
                {LIBRARY_TYPE_LABELS[resource.resource_type]}
              </Badge>
              {resource.is_original_content ? (
                <Badge variant="gold">Original SMARAN Edition</Badge>
              ) : (
                <Badge variant="neutral">
                  External / Attributed Resource
                </Badge>
              )}
            </div>

            <h1 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              {resource.title}
            </h1>

            <p className="text-base leading-relaxed text-ink-muted">
              {resource.summary}
            </p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-sandalwood-border pt-3 text-xs text-ink-muted">
              {(resource.author_or_speaker ||
                resource.source?.author_or_translator) && (
                <span>
                  Author / Speaker:{" "}
                  <strong className="font-medium text-ink">
                    {resource.author_or_speaker ??
                      resource.source?.author_or_translator}
                  </strong>
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Globe className="size-3.5" aria-hidden={true} />
                {resource.language_code.toUpperCase()}
              </span>
              {resource.estimated_minutes && (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Clock className="size-3.5" aria-hidden={true} />
                  {resource.estimated_minutes} min
                </span>
              )}
              {lastViewedAt && (
                <span className="tabular-nums">
                  Last opened {lastViewedAt.slice(0, 10)}
                </span>
              )}
            </div>
          </div>

          <ResourceCoverImage
            posterUrl={resource.poster_url}
            alt={resource.title}
          />
        </div>
      </Card>

      {/* Quiet Reading Content (Safe React Blocks, Zero Raw HTML / Iframes) */}
      {markdownBlocks.length > 0 && (
        <Card surface="parchment">
          <CardContent className="mt-0 mx-auto max-w-prose space-y-4">
            {markdownBlocks.map((block, idx) => {
              if (block.kind === "heading") {
                if (block.level === 1) {
                  return (
                    <h2
                      key={idx}
                      className="pt-2 font-display text-2xl font-semibold text-ink"
                    >
                      {block.text}
                    </h2>
                  );
                }
                return (
                  <h3
                    key={idx}
                    className="pt-2 font-serif text-xl font-semibold text-ink"
                  >
                    {block.text}
                  </h3>
                );
              }
              if (block.kind === "quote") {
                return (
                  <blockquote
                    key={idx}
                    className="border-l-2 border-gold-antique bg-linen/70 px-4 py-3 font-serif italic leading-relaxed text-ink"
                  >
                    {block.text}
                  </blockquote>
                );
              }
              if (block.kind === "list") {
                return (
                  <ul
                    key={idx}
                    className="list-disc space-y-1.5 pl-5 font-serif text-base leading-relaxed text-ink"
                  >
                    {block.items.map((item, itemIdx) => (
                      <li key={itemIdx}>{item}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p
                  key={idx}
                  className="font-serif text-base leading-relaxed text-ink"
                >
                  {block.text}
                </p>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Verified External Link / Media Access Card (Never auto-embeds unsafe iframes) */}
      {outboundUrl && (
        <Card surface="sanctum">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="sanctum">Verified External Resource</Badge>
              {outboundHost && (
                <span className="text-xs text-ink-muted-dark">
                  Host: {outboundHost}
                </span>
              )}
            </div>
            <CardTitle className="mt-2 font-display text-2xl text-ink-on-dark">
              {resource.resource_type === "video"
                ? "Watch Lecture on Verified External Source"
                : "Open Verified External Learning Resource"}
            </CardTitle>
            <CardDescription className="text-ink-muted-dark">
              For security and reader privacy, external media opens directly on
              its verified destination without hidden third-party embeds or
              tracking scripts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={outboundUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({ variant: "gold", size: "md" })}
            >
              <span>
                Open on {outboundHost ?? "external source"}
              </span>
              <ExternalLink className="size-4" aria-hidden={true} />
            </a>
          </CardContent>
        </Card>
      )}

      {/* Licensing & Attribution */}
      <Card surface="linen">
        <CardHeader>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-peacock-ink">
            <ShieldCheck className="size-4" aria-hidden={true} />
            <span>Attribution, License &amp; Review Record</span>
          </div>
          <CardTitle className="font-display text-xl">
            Provenance &amp; Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-ink-muted">
          {(resource.license_name || resource.source?.license_name) && (
            <p>
              <strong className="font-medium text-ink">License: </strong>
              {resource.source?.license_url ? (
                <a
                  href={resource.source.license_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-peacock-ink underline"
                >
                  {resource.license_name ?? resource.source.license_name}
                </a>
              ) : (
                resource.license_name ?? resource.source?.license_name
              )}
            </p>
          )}
          {(resource.attribution_text || resource.source?.attribution_text) && (
            <p>
              <strong className="font-medium text-ink">Attribution: </strong>
              {resource.attribution_text ?? resource.source?.attribution_text}
            </p>
          )}
          {resource.copyright_notice && (
            <p>
              <strong className="font-medium text-ink">
                Copyright &amp; Usage Note:{" "}
              </strong>
              {resource.copyright_notice}
            </p>
          )}
          {resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {resource.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/library?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-sandalwood-border bg-paper px-2.5 py-0.5 text-xs text-ink-muted hover:text-ink"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Resources */}
      {relatedResources.length > 0 && (
        <>
          <ManuscriptDivider />
          <section aria-labelledby="related-heading" className="space-y-4">
            <h2
              id="related-heading"
              className="font-display text-2xl font-semibold text-ink"
            >
              Related Resources
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {relatedResources.map((rel) => (
                <Card key={rel.id} surface="parchment">
                  <CardHeader>
                    <Badge variant="neutral" className="w-fit">
                      {LIBRARY_TYPE_LABELS[rel.resource_type]}
                    </Badge>
                    <CardTitle className="mt-2 font-serif text-lg">
                      <Link
                        href={`/library/${rel.slug}`}
                        className="hover:underline"
                      >
                        {rel.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {rel.summary}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

