import {
  TOTAL_GITA_CHAPTERS,
  type ContentReviewStatus,
  type FeedbackCategory,
  type FeedbackStatus,
} from "./validation";

export interface GitaContentSource {
  id: string;
  slug: string;
  title: string;
  author_or_translator: string;
  tradition_or_lineage: string | null;
  license_name: string;
  license_url: string | null;
  attribution_text: string;
  source_url: string | null;
  review_status: ContentReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface GitaChapter {
  chapter_number: number;
  sanskrit_title: string;
  transliteration_title: string;
  english_title: string;
  summary: string;
  verse_count: number;
  theme_tags: string[];
}

export interface GitaWordByWordItem {
  sanskrit: string;
  transliteration?: string;
  meaning: string;
}

export interface GitaVerse {
  id: string;
  chapter_number: number;
  verse_number: number;
  verse_ref: string;
  sanskrit_devanagari: string;
  transliteration_iast: string;
  word_by_word: GitaWordByWordItem[] | null;
  source_id: string | null;
  review_status: ContentReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface GitaTranslation {
  id: string;
  verse_id: string;
  source_id: string;
  language_code: string;
  translation_text: string;
  is_primary: boolean;
  review_status: ContentReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  source: GitaContentSource | null;
}

export interface GitaExplanation {
  id: string;
  verse_id: string;
  source_id: string | null;
  title: string | null;
  explanation_text: string;
  is_ai_assisted: boolean;
  review_status: ContentReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  source: GitaContentSource | null;
}

export interface GitaVerseBundle {
  verse: GitaVerse;
  verseSource: GitaContentSource | null;
  translations: GitaTranslation[];
  explanations: GitaExplanation[];
}

export interface GitaChapterSlot {
  chapterNumber: number;
  isPopulated: boolean;
  chapter: GitaChapter | null;
  publishedVerseCount: number;
  readVerseCount: number;
  progressPercentage: number;
}

export interface GitaDailyWisdom {
  date: string;
  verse: GitaVerse;
  primaryTranslation: GitaTranslation;
  chapterTitle: string | null;
}

export interface GitaNavReference {
  chapter_number: number;
  verse_number: number;
  verse_ref: string;
}

export interface GitaSearchResultItem {
  verse: GitaVerse;
  primaryTranslation: GitaTranslation | null;
  chapterTitle: string | null;
  matchedIn: ("reference" | "sanskrit" | "transliteration" | "translation")[];
}

export interface GitaBookmarkItem {
  id: string;
  verse_id: string;
  created_at: string;
  verse: {
    id: string;
    chapter_number: number;
    verse_number: number;
    verse_ref: string;
    sanskrit_devanagari: string;
    transliteration_iast: string;
  } | null;
}

export interface GitaNoteItem {
  id: string;
  verse_id: string;
  note_text: string;
  created_at: string;
  updated_at: string;
  verse: {
    id: string;
    chapter_number: number;
    verse_number: number;
    verse_ref: string;
  } | null;
}

export interface GitaReadingHistoryItem {
  id: number;
  verse_id: string;
  read_at: string;
  verse: {
    id: string;
    chapter_number: number;
    verse_number: number;
    verse_ref: string;
  } | null;
}

export interface GitaCollectionItemRecord {
  id: string;
  collection_id: string;
  verse_id: string;
  sort_order: number;
  added_at: string;
  verse: {
    id: string;
    chapter_number: number;
    verse_number: number;
    verse_ref: string;
    sanskrit_devanagari: string;
    transliteration_iast: string;
  } | null;
}

export interface GitaCollectionRecord {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_curated: boolean;
  created_at: string;
  updated_at: string;
  items: GitaCollectionItemRecord[];
}

export interface GitaFeedbackRecord {
  id: string;
  submitted_by: string;
  verse_id: string | null;
  translation_id: string | null;
  explanation_id: string | null;
  category: FeedbackCategory;
  message: string;
  status: FeedbackStatus;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export function normalizeWordByWord(raw: unknown): GitaWordByWordItem[] | null {
  if (!Array.isArray(raw)) return null;
  const items: GitaWordByWordItem[] = [];
  for (const entry of raw) {
    if (
      entry &&
      typeof entry === "object" &&
      "sanskrit" in entry &&
      "meaning" in entry &&
      typeof entry.sanskrit === "string" &&
      typeof entry.meaning === "string" &&
      entry.sanskrit.trim().length > 0 &&
      entry.meaning.trim().length > 0
    ) {
      items.push({
        sanskrit: entry.sanskrit.trim(),
        transliteration:
          "transliteration" in entry && typeof entry.transliteration === "string"
            ? entry.transliteration.trim()
            : undefined,
        meaning: entry.meaning.trim(),
      });
    }
  }
  return items.length > 0 ? items : null;
}

/**
 * Always returns structural slots for Chapters 1–18 without fabricating
 * Sanskrit/English titles or summaries when gita_chapters rows are absent.
 */
export function buildChapterSlots(
  chapters: GitaChapter[],
  publishedCountByChapter: Record<number, number>,
  readCountByChapter: Record<number, number>
): GitaChapterSlot[] {
  const byNumber = new Map<number, GitaChapter>();
  for (const ch of chapters) {
    byNumber.set(ch.chapter_number, ch);
  }

  const slots: GitaChapterSlot[] = [];
  for (let n = 1; n <= TOTAL_GITA_CHAPTERS; n++) {
    const chapter = byNumber.get(n) ?? null;
    const publishedVerseCount = publishedCountByChapter[n] ?? 0;
    const readVerseCount = Math.min(
      readCountByChapter[n] ?? 0,
      publishedVerseCount > 0 ? publishedVerseCount : readCountByChapter[n] ?? 0
    );
    const denominator =
      chapter && chapter.verse_count > 0
        ? Math.max(chapter.verse_count, publishedVerseCount)
        : publishedVerseCount;
    const progressPercentage =
      denominator > 0
        ? Math.min(100, Math.round((readVerseCount / denominator) * 100))
        : 0;

    slots.push({
      chapterNumber: n,
      isPopulated: Boolean(chapter),
      chapter,
      publishedVerseCount,
      readVerseCount,
      progressPercentage,
    });
  }

  return slots;
}

/**
 * Computes per-chapter and total reading progress using unique read verse IDs.
 */
export function computeReadingProgressSummary(
  chapters: GitaChapter[],
  publishedVerses: Array<{ id: string; chapter_number: number }>,
  readVerseIds: Set<string>
): {
  publishedCountByChapter: Record<number, number>;
  readCountByChapter: Record<number, number>;
  totalPublishedVerses: number;
  totalReadVerses: number;
  overallProgressPct: number;
} {
  const publishedCountByChapter: Record<number, number> = {};
  const readCountByChapter: Record<number, number> = {};
  let totalPublishedVerses = 0;
  let totalReadVerses = 0;

  for (const verse of publishedVerses) {
    publishedCountByChapter[verse.chapter_number] =
      (publishedCountByChapter[verse.chapter_number] ?? 0) + 1;
    totalPublishedVerses += 1;

    if (readVerseIds.has(verse.id)) {
      readCountByChapter[verse.chapter_number] =
        (readCountByChapter[verse.chapter_number] ?? 0) + 1;
      totalReadVerses += 1;
    }
  }

  const declaredTotal = chapters.reduce(
    (sum, c) => sum + Math.max(0, c.verse_count),
    0
  );
  const denom = Math.max(totalPublishedVerses, declaredTotal);
  const overallProgressPct =
    denom > 0 ? Math.min(100, Math.round((totalReadVerses / denom) * 100)) : 0;

  return {
    publishedCountByChapter,
    readCountByChapter,
    totalPublishedVerses,
    totalReadVerses,
    overallProgressPct,
  };
}

/**
 * Computes deterministic Daily Wisdom strictly from verified approved verses
 * that have at least one approved translation with an approved content source.
 * Never returns unapproved or fabricated content.
 */
export function selectDailyWisdomVerse(
  bundles: GitaVerseBundle[],
  localDate: string,
  chapterTitleMap: Record<number, string> = {}
): GitaDailyWisdom | null {
  const eligible = bundles
    .filter((b) => {
      if (b.verse.review_status !== "approved") return false;
      if (b.verseSource && b.verseSource.review_status !== "approved") {
        return false;
      }
      return b.translations.some(
        (t) =>
          t.review_status === "approved" &&
          t.source !== null &&
          t.source.review_status === "approved"
      );
    })
    .sort((a, b) => {
      if (a.verse.chapter_number !== b.verse.chapter_number) {
        return a.verse.chapter_number - b.verse.chapter_number;
      }
      return a.verse.verse_number - b.verse.verse_number;
    });

  if (eligible.length === 0) return null;

  // Deterministic FNV-1a 32-bit hash on YYYY-MM-DD
  let hash = 2166136261;
  for (let i = 0; i < localDate.length; i++) {
    hash ^= localDate.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const index = (hash >>> 0) % eligible.length;
  const chosen = eligible[index]!;

  const approvedTranslations = chosen.translations.filter(
    (t) =>
      t.review_status === "approved" &&
      t.source !== null &&
      t.source.review_status === "approved"
  );
  const primaryTranslation =
    approvedTranslations.find((t) => t.is_primary && t.language_code === "en") ??
    approvedTranslations.find((t) => t.is_primary) ??
    approvedTranslations.find((t) => t.language_code === "en") ??
    approvedTranslations[0]!;

  return {
    date: localDate,
    verse: chosen.verse,
    primaryTranslation,
    chapterTitle: chapterTitleMap[chosen.verse.chapter_number] ?? null,
  };
}

/**
 * Returns sequential previous and next approved verses across chapters.
 */
export function computePreviousNextVerse(
  approvedRefs: GitaNavReference[],
  currentChapter: number,
  currentVerse: number
): { previous: GitaNavReference | null; next: GitaNavReference | null } {
  const sorted = [...approvedRefs].sort((a, b) => {
    if (a.chapter_number !== b.chapter_number) {
      return a.chapter_number - b.chapter_number;
    }
    return a.verse_number - b.verse_number;
  });

  const idx = sorted.findIndex(
    (v) =>
      v.chapter_number === currentChapter && v.verse_number === currentVerse
  );
  if (idx === -1) {
    return { previous: null, next: null };
  }

  return {
    previous: idx > 0 ? sorted[idx - 1]! : null,
    next: idx + 1 < sorted.length ? sorted[idx + 1]! : null,
  };
}
