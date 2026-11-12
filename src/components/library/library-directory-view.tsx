import Link from "next/link";
import {
  Bookmark,
  BookOpen,
  Clock,
  ExternalLink,
  History,
  Search,
  ShieldCheck,
} from "lucide-react";
import { ManuscriptDivider } from "@/components/sacred/ornaments";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import type { GitaViewerContext } from "@/lib/gita/queries";
import {
  extractSafeHostname,
  LIBRARY_CATEGORY_META,
  LIBRARY_TYPE_LABELS,
  type LibraryHistoryItem,
  type LibraryResource,
} from "@/lib/library/domain";
import {
  LIBRARY_CATEGORIES,
  LIBRARY_RESOURCE_TYPES,
  type LibraryCategory,
  type LibraryResourceType,
} from "@/lib/library/validation";
import { ResourceCoverImage } from "./resource-cover";

export interface LibraryDirectoryViewProps {
  viewer: GitaViewerContext | null;
  allResources: LibraryResource[];
  filteredResources: LibraryResource[];
  bookmarkedIds: string[];
  recentlyViewed: LibraryHistoryItem[];
  categoryCounts: Record<string, number>;
  availableTags: string[];
  activeFilters: {
    q: string;
    category?: LibraryCategory;
    type?: LibraryResourceType;
    tag?: string;
    savedOnly: boolean;
  };
}

export function LibraryDirectoryView({
  viewer,
  allResources,
  filteredResources,
  bookmarkedIds,
  recentlyViewed,
  categoryCounts,
  availableTags,
  activeFilters,
}: LibraryDirectoryViewProps) {
  const bookmarkedSet = new Set(bookmarkedIds);
  const hasFilters = Boolean(
    activeFilters.q ||
      activeFilters.category ||
      activeFilters.type ||
      activeFilters.tag ||
      activeFilters.savedOnly
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-sandalwood-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium tracking-wider uppercase text-gold-ink">
            Curated Study &amp; Devotional Readings
          </p>
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            Spiritual Library &amp; Learning Resources
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
            Carefully reviewed Bhagavad Gītā guides, classical devotional works,
            Japa meditation notes, and attributed talks—kept free from ads,
            rankings, and unverified content.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/gita"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            <BookOpen className="size-4" aria-hidden={true} />
            <span>Bhagavad Gītā Text</span>
          </Link>
          {viewer?.isAdmin && (
            <Link
              href="/library/admin"
              className={buttonStyles({ variant: "gold", size: "md" })}
            >
              <ShieldCheck className="size-4" aria-hidden={true} />
              <span>Library Studio</span>
            </Link>
          )}
        </div>
      </header>

      {/* Search & Category / Type Filter Form */}
      <Card surface="linen" className="p-4 sm:p-5">
        <form action="/library" method="GET" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
            <div className="sm:col-span-2">
              <label
                htmlFor="lib-q"
                className="mb-1.5 block text-xs font-medium text-ink"
              >
                Search Library
              </label>
              <Input
                id="lib-q"
                name="q"
                type="search"
                defaultValue={activeFilters.q}
                placeholder="Search title, speaker, author, topic, or tag..."
              />
            </div>

            <div>
              <label
                htmlFor="lib-category"
                className="mb-1.5 block text-xs font-medium text-ink"
              >
                Category
              </label>
              <Select
                id="lib-category"
                name="category"
                defaultValue={activeFilters.category ?? ""}
              >
                <option value="">All categories</option>
                {LIBRARY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {LIBRARY_CATEGORY_META[cat].label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label
                htmlFor="lib-type"
                className="mb-1.5 block text-xs font-medium text-ink"
              >
                Format
              </label>
              <Select
                id="lib-type"
                name="type"
                defaultValue={activeFilters.type ?? ""}
              >
                <option value="">All formats</option>
                {LIBRARY_RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {LIBRARY_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {viewer && (
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ink">
                  <input
                    type="checkbox"
                    name="saved"
                    value="1"
                    defaultChecked={activeFilters.savedOnly}
                    className="size-4 accent-peacock-deep"
                  />
                  <span>Saved bookmarks only ({bookmarkedIds.length})</span>
                </label>
              )}
              {activeFilters.tag && (
                <Badge variant="peacock">Tag: #{activeFilters.tag}</Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasFilters && (
                <Link
                  href="/library"
                  className={buttonStyles({ variant: "ghost", size: "sm" })}
                >
                  Clear filters
                </Link>
              )}
              <button
                type="submit"
                className={buttonStyles({ variant: "primary", size: "sm" })}
              >
                <Search className="size-4" aria-hidden={true} />
                <span>Apply filters</span>
              </button>
            </div>
          </div>
        </form>
      </Card>

      {/* Curated Category Quick Links */}
      <section aria-label="Library categories" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LIBRARY_CATEGORIES.map((cat) => {
          const meta = LIBRARY_CATEGORY_META[cat];
          const count = categoryCounts[cat] ?? 0;
          const active = activeFilters.category === cat;
          return (
            <Link
              key={cat}
              href={active ? "/library" : `/library?category=${cat}`}
              className={`rounded-[14px] border p-4 transition-colors ${
                active
                  ? "border-gold-antique bg-krishna-midnight text-ink-on-dark"
                  : "border-sandalwood-border bg-paper text-ink hover:bg-linen"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-serif text-base font-semibold">
                  {meta.label}
                </span>
                <Badge variant={active ? "sanctum" : "neutral"}>{count}</Badge>
              </div>
              <p
                className={`mt-1 text-xs leading-relaxed ${
                  active ? "text-ink-muted-dark" : "text-ink-muted"
                }`}
              >
                {meta.description}
              </p>
            </Link>
          );
        })}
      </section>

      {/* Tag Ribbon (if available) */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-ink-muted">Topics:</span>
          {availableTags.slice(0, 14).map((tag) => {
            const active = activeFilters.tag === tag;
            return (
              <Link
                key={tag}
                href={
                  active
                    ? "/library"
                    : `/library?tag=${encodeURIComponent(tag)}`
                }
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  active
                    ? "border-peacock-deep bg-peacock-deep text-ink-on-dark"
                    : "border-sandalwood-border bg-paper text-ink-muted hover:bg-linen hover:text-ink"
                }`}
              >
                #{tag}
              </Link>
            );
          })}
        </div>
      )}

      {/* Recently Viewed Strip (Signed-in only) */}
      {viewer && recentlyViewed.length > 0 && !hasFilters && (
        <section aria-labelledby="recent-library-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="size-4 text-peacock-ink" aria-hidden={true} />
            <h2
              id="recent-library-heading"
              className="font-display text-xl font-semibold text-ink"
            >
              Recently Viewed
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentlyViewed.map(
              (entry) =>
                entry.resource && (
                  <Link
                    key={entry.id}
                    href={`/library/${entry.resource.slug}`}
                    className="flex items-center justify-between gap-3 rounded-[12px] border border-sandalwood-border bg-paper px-4 py-3 text-sm transition-colors hover:bg-linen"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {entry.resource.title}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {LIBRARY_TYPE_LABELS[entry.resource.resource_type]}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-ink-muted tabular-nums">
                      {entry.viewed_at.slice(0, 10)}
                    </span>
                  </Link>
                )
            )}
          </div>
        </section>
      )}

      <ManuscriptDivider />

      {/* Main Catalog Grid or Honest Empty State */}
      {allResources.length === 0 ? (
        <Card surface="parchment">
          <CardHeader>
            <Badge variant="neutral" className="w-fit">
              Awaiting Curated Content
            </Badge>
            <CardTitle className="mt-2 font-display text-2xl sm:text-3xl">
              No Verified Library Resources Published Yet
            </CardTitle>
            <CardDescription className="text-base">
              Spiritual Library articles, devotional literature, Japa guides,
              lectures, and verified external links appear only after attribution,
              copyright verification, and human administrator approval. No placeholder
              books, speakers, or links are fabricated.
            </CardDescription>
          </CardHeader>
          {viewer?.isAdmin && (
            <CardFooter>
              <Link
                href="/library/admin"
                className={buttonStyles({ variant: "gold", size: "md" })}
              >
                <ShieldCheck className="size-4" aria-hidden={true} />
                <span>Publish First Library Resource</span>
              </Link>
            </CardFooter>
          )}
        </Card>
      ) : filteredResources.length === 0 ? (
        <Card surface="linen">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              No Matching Resources Found
            </CardTitle>
            <CardDescription>
              Try clearing active filters or searching a broader devotional keyword.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link
              href="/library"
              className={buttonStyles({ variant: "secondary", size: "md" })}
            >
              Show All Published Resources
            </Link>
          </CardFooter>
        </Card>
      ) : (
        <section aria-label="Curated library resources" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((res) => {
            const isSaved = bookmarkedSet.has(res.id);
            const host = extractSafeHostname(res.external_url ?? res.media_url);
            return (
              <Card
                key={res.id}
                surface="parchment"
                className="flex flex-col justify-between transition-shadow duration-150 hover:shadow-sacred-sm"
              >
                <div className="space-y-3">
                  <ResourceCoverImage posterUrl={res.poster_url} alt={res.title} />

                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <Badge variant="peacock">
                      {LIBRARY_TYPE_LABELS[res.resource_type]}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      {isSaved && (
                        <Badge variant="gold">
                          <Bookmark className="size-3" aria-hidden={true} />
                          <span>Saved</span>
                        </Badge>
                      )}
                      {res.is_original_content ? (
                        <Badge variant="neutral">Original</Badge>
                      ) : host ? (
                        <Badge variant="neutral">
                          <ExternalLink className="size-3" aria-hidden={true} />
                          <span>{host}</span>
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <h2 className="font-serif text-lg font-semibold leading-snug text-ink">
                      <Link
                        href={`/library/${res.slug}`}
                        className="hover:underline"
                      >
                        {res.title}
                      </Link>
                    </h2>
                    {(res.author_or_speaker || res.source?.author_or_translator) && (
                      <p className="mt-1 text-xs font-medium text-peacock-ink">
                        By {res.author_or_speaker ?? res.source?.author_or_translator}
                      </p>
                    )}
                    <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-ink-muted">
                      {res.summary}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3 border-t border-sandalwood-border/70 pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted tabular-nums">
                    <span>{LIBRARY_CATEGORY_META[res.category].label}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" aria-hidden={true} />
                      {res.estimated_minutes
                        ? `${res.estimated_minutes} min`
                        : res.language_code.toUpperCase()}
                    </span>
                  </div>
                  <Link
                    href={`/library/${res.slug}`}
                    className={buttonStyles({
                      variant: "secondary",
                      size: "sm",
                      className: "w-full",
                    })}
                  >
                    Open Resource
                  </Link>
                </div>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}

