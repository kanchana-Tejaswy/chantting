import type { GitaContentSource } from "@/lib/gita/domain";
import type { ContentReviewStatus } from "@/lib/gita/validation";
import type { LibraryCategory, LibraryResourceType } from "./validation";

export interface LibraryResource {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: LibraryCategory;
  resource_type: LibraryResourceType;
  body_markdown: string | null;
  media_url: string | null;
  poster_url: string | null;
  external_url: string | null;
  source_id: string | null;
  author_or_speaker: string | null;
  language_code: string;
  estimated_minutes: number | null;
  license_name: string | null;
  copyright_notice: string | null;
  attribution_text: string | null;
  is_original_content: boolean;
  is_archived: boolean;
  tags: string[];
  review_status: ContentReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  source: GitaContentSource | null;
}

export interface LibraryBookmarkItem {
  id: string;
  resource_id: string;
  created_at: string;
  resource: LibraryResource | null;
}

export interface LibraryHistoryItem {
  id: number;
  resource_id: string;
  viewed_at: string;
  resource: LibraryResource | null;
}

export const LIBRARY_CATEGORY_META: Record<
  LibraryCategory,
  { label: string; description: string }
> = {
  gita_learning: {
    label: "Bhagavad Gītā Study",
    description:
      "Structured chapter guides, Sanskrit study aids, and introductory reading companions.",
  },
  krishna_literature: {
    label: "Devotional Literature",
    description:
      "Classic Krishna bhakti works, public-domain texts, and attributed editions.",
  },
  chanting_guidance: {
    label: "Chanting & Japa Guidance",
    description:
      "Calm practical guidance on pronunciation, focus, rhythm, and daily sādhanā consistency.",
  },
  video_lecture: {
    label: "Lectures & Talks",
    description:
      "Curated educational video and audio discourses with speaker and source attribution.",
  },
  devotional_article: {
    label: "Devotional Articles",
    description:
      "Thoughtful essays and reflections reviewed for clarity, accuracy, and respectful tone.",
  },
  external_resource: {
    label: "Approved External Links",
    description:
      "Verified scholarly archives, public-domain libraries, and external study portals.",
  },
};

export const LIBRARY_TYPE_LABELS: Record<LibraryResourceType, string> = {
  article: "Article",
  video: "Video / Lecture",
  book: "Book / Text",
  external_link: "External Link",
  devotional_reading: "Devotional Reading",
  chanting_guidance: "Chanting Guide",
  study_guide: "Study Guide",
};

export function extractSafeHostname(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isResourcePubliclyVisible(resource: LibraryResource): boolean {
  if (resource.review_status !== "approved" || resource.is_archived) {
    return false;
  }
  if (resource.source && resource.source.review_status !== "approved") {
    return false;
  }
  return true;
}

export function filterLibraryResources(
  resources: LibraryResource[],
  filters: {
    q?: string;
    category?: LibraryCategory;
    type?: LibraryResourceType;
    tag?: string;
    bookmarkedIds?: Set<string>;
    savedOnly?: boolean;
  }
): LibraryResource[] {
  const query = (filters.q ?? "").trim().toLowerCase();
  return resources.filter((item) => {
    if (!isResourcePubliclyVisible(item)) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.type && item.resource_type !== filters.type) return false;
    if (
      filters.tag &&
      !item.tags.some((t) => t.toLowerCase() === filters.tag)
    ) {
      return false;
    }
    if (
      filters.savedOnly &&
      (!filters.bookmarkedIds || !filters.bookmarkedIds.has(item.id))
    ) {
      return false;
    }
    if (query) {
      const hay = [
        item.title,
        item.summary,
        item.author_or_speaker ?? "",
        item.source?.author_or_translator ?? "",
        item.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

export function computeRelatedResources(
  current: LibraryResource,
  candidates: LibraryResource[],
  limit = 3
): LibraryResource[] {
  const currentTags = new Set(current.tags.map((t) => t.toLowerCase()));

  return candidates
    .filter((c) => c.id !== current.id && isResourcePubliclyVisible(c))
    .map((c) => {
      let score = 0;
      if (c.category === current.category) score += 3;
      if (c.resource_type === current.resource_type) score += 1;
      if (c.language_code === current.language_code) score += 1;
      for (const tag of c.tags) {
        if (currentTags.has(tag.toLowerCase())) score += 2;
      }
      return { resource: c, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.resource);
}

export type MarkdownBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

/**
 * Parses clean, plain-text markdown into safe React blocks without executing
 * raw HTML or third-party scripts.
 */
export function parseSafeMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push({ kind: "paragraph", text: paragraphLines.join(" ").trim() });
      paragraphLines = [];
    }
  };
  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ kind: "list", items: [...listItems] });
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", level: 3, text: line.slice(4).trim() });
    } else if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", level: 2, text: line.slice(3).trim() });
    } else if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", level: 1, text: line.slice(2).trim() });
    } else if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "quote", text: line.slice(2).trim() });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      flushParagraph();
      listItems.push(line.slice(2).trim());
    } else {
      flushList();
      paragraphLines.push(line);
    }
  }

  flushParagraph();
  flushList();
  return blocks;
}

