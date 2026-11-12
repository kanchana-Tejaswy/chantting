import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/sadhana/queries";
import { getLocalDateString } from "@/lib/sadhana/stats";
import {
  buildChapterSlots,
  computePreviousNextVerse,
  computeReadingProgressSummary,
  normalizeWordByWord,
  selectDailyWisdomVerse,
  type GitaBookmarkItem,
  type GitaChapter,
  type GitaChapterSlot,
  type GitaCollectionRecord,
  type GitaContentSource,
  type GitaDailyWisdom,
  type GitaExplanation,
  type GitaFeedbackRecord,
  type GitaNavReference,
  type GitaNoteItem,
  type GitaReadingHistoryItem,
  type GitaSearchResultItem,
  type GitaTranslation,
  type GitaVerse,
  type GitaVerseBundle,
} from "./domain";
import {
  parseVerseReference,
  sanitizeSearchText,
  type ContentReviewStatus,
  type FeedbackCategory,
  type FeedbackStatus,
} from "./validation";

export interface GitaViewerContext {
  userId: string;
  email: string | null;
  displayName: string;
  timezone: string;
  isAdmin: boolean;
  adminRole: string | null;
}

export interface GitaAdminAuditItem {
  id: number;
  actor_user_id: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type GitaOverviewLoadResult =
  | { status: "schema_not_ready"; detail: string }
  | { status: "error"; message: string }
  | {
      status: "ready";
      viewer: GitaViewerContext | null;
      chapterSlots: GitaChapterSlot[];
      totalPublishedVerses: number;
      totalReadVerses: number;
      overallProgressPct: number;
      bookmarkCount: number;
      dailyWisdom: GitaDailyWisdom | null;
    };

export type GitaChapterLoadResult =
  | { status: "schema_not_ready"; detail: string }
  | { status: "error"; message: string }
  | {
      status: "ready";
      viewer: GitaViewerContext | null;
      chapterNumber: number;
      chapter: GitaChapter | null;
      chapterSlots: GitaChapterSlot[];
      verses: Array<{
        verse: GitaVerse;
        primaryTranslation: GitaTranslation | null;
        isBookmarked: boolean;
        isRead: boolean;
        hasNote: boolean;
      }>;
      readVerseCount: number;
    };

export type GitaVerseLoadResult =
  | { status: "schema_not_ready"; detail: string }
  | { status: "error"; message: string }
  | {
      status: "unpublished_or_missing";
      viewer: GitaViewerContext | null;
      chapterNumber: number;
      verseNumber: number;
      chapter: GitaChapter | null;
      chapterSlots: GitaChapterSlot[];
    }
  | {
      status: "ready";
      viewer: GitaViewerContext | null;
      chapter: GitaChapter | null;
      chapterSlots: GitaChapterSlot[];
      bundle: GitaVerseBundle;
      chapterVerseRefs: GitaNavReference[];
      previousVerse: GitaNavReference | null;
      nextVerse: GitaNavReference | null;
      isBookmarked: boolean;
      isRead: boolean;
      personalNote: GitaNoteItem | null;
      collections: Array<{ id: string; title: string; containsVerse: boolean }>;
    };

export type GitaStudyVaultLoadResult =
  | { status: "unauthenticated" }
  | { status: "schema_not_ready"; detail: string }
  | { status: "error"; message: string }
  | {
      status: "ready";
      viewer: GitaViewerContext;
      chapterSlots: GitaChapterSlot[];
      totalPublishedVerses: number;
      totalReadVerses: number;
      overallProgressPct: number;
      bookmarks: GitaBookmarkItem[];
      notes: GitaNoteItem[];
      history: GitaReadingHistoryItem[];
      collections: GitaCollectionRecord[];
      feedback: GitaFeedbackRecord[];
      approvedVerseOptions: Array<{
        id: string;
        verse_ref: string;
        chapter_number: number;
        verse_number: number;
      }>;
    };

export type GitaAdminLoadResult =
  | { status: "unauthenticated" }
  | { status: "forbidden"; viewer: GitaViewerContext }
  | { status: "schema_not_ready"; detail: string }
  | { status: "error"; message: string }
  | {
      status: "ready";
      viewer: GitaViewerContext;
      sources: GitaContentSource[];
      chapters: GitaChapter[];
      verses: GitaVerse[];
      translations: Array<Omit<GitaTranslation, "source"> & { source: GitaContentSource | null }>;
      explanations: Array<Omit<GitaExplanation, "source"> & { source: GitaContentSource | null }>;
      feedback: GitaFeedbackRecord[];
      auditLogs: GitaAdminAuditItem[];
    };

export async function getGitaViewerContext(
  supabase: SupabaseClient
): Promise<GitaViewerContext | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const [profileRes, adminRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, timezone")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("platform_admins")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const adminRole =
    !adminRes.error && adminRes.data ? (adminRes.data.role as string) : null;

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName:
      profileRes.data?.display_name ??
      (user.email ? user.email.split("@")[0] : "Devotee"),
    timezone: profileRes.data?.timezone ?? "UTC",
    isAdmin: Boolean(adminRole),
    adminRole,
  };
}

export async function requirePlatformAdmin(supabase: SupabaseClient): Promise<
  | { ok: true; userId: string; role: string }
  | { ok: false; status: 401 | 403 | 500; error: string }
> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: "Authentication required." };
  }

  const adminRes = await supabase
    .from("platform_admins")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminRes.error) {
    if (isMissingSchemaError(adminRes.error)) {
      return {
        ok: false,
        status: 500,
        error: "Platform administrator governance migration is not applied yet.",
      };
    }
    return { ok: false, status: 403, error: "Administrator access required." };
  }

  if (!adminRes.data?.role) {
    return {
      ok: false,
      status: 403,
      error: "Only authorized scripture administrators may perform this action.",
    };
  }

  return {
    ok: true,
    userId: user.id,
    role: adminRes.data.role as string,
  };
}

function mapVerseRow(row: Record<string, unknown>): GitaVerse {
  return {
    id: String(row.id),
    chapter_number: Number(row.chapter_number),
    verse_number: Number(row.verse_number),
    verse_ref:
      typeof row.verse_ref === "string"
        ? row.verse_ref
        : `${row.chapter_number}.${row.verse_number}`,
    sanskrit_devanagari: String(row.sanskrit_devanagari ?? ""),
    transliteration_iast: String(row.transliteration_iast ?? ""),
    word_by_word: normalizeWordByWord(row.word_by_word),
    source_id: typeof row.source_id === "string" ? row.source_id : null,
    review_status: row.review_status as ContentReviewStatus,
    reviewed_by: typeof row.reviewed_by === "string" ? row.reviewed_by : null,
    reviewed_at: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
  };
}

export async function loadGitaOverview(): Promise<GitaOverviewLoadResult> {
  const supabase = await createClient();
  const viewer = await getGitaViewerContext(supabase);

  const [chaptersRes, versesRes, translationsRes, sourcesRes] =
    await Promise.all([
      supabase
        .from("gita_chapters")
        .select(
          "chapter_number, sanskrit_title, transliteration_title, english_title, summary, verse_count, theme_tags"
        )
        .order("chapter_number", { ascending: true }),
      supabase
        .from("gita_verses")
        .select(
          "id, chapter_number, verse_number, verse_ref, sanskrit_devanagari, transliteration_iast, word_by_word, source_id, review_status, reviewed_by, reviewed_at"
        )
        .eq("review_status", "approved")
        .order("chapter_number", { ascending: true })
        .order("verse_number", { ascending: true }),
      supabase
        .from("gita_translations")
        .select(
          "id, verse_id, source_id, language_code, translation_text, is_primary, review_status, reviewed_by, reviewed_at"
        )
        .eq("review_status", "approved"),
      supabase
        .from("content_sources")
        .select(
          "id, slug, title, author_or_translator, tradition_or_lineage, license_name, license_url, attribution_text, source_url, review_status, reviewed_by, reviewed_at"
        )
        .eq("review_status", "approved"),
    ]);

  const firstErr =
    chaptersRes.error ??
    versesRes.error ??
    translationsRes.error ??
    sourcesRes.error;
  if (firstErr) {
    if (isMissingSchemaError(firstErr)) {
      return { status: "schema_not_ready", detail: firstErr.message };
    }
    return { status: "error", message: firstErr.message };
  }

  const readVerseIds = new Set<string>();
  let bookmarkCount = 0;

  if (viewer) {
    const [historyRes, bookmarksRes] = await Promise.all([
      supabase
        .from("gita_reading_history")
        .select("verse_id")
        .eq("user_id", viewer.userId),
      supabase
        .from("gita_bookmarks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", viewer.userId),
    ]);

    for (const row of historyRes.data ?? []) {
      readVerseIds.add(row.verse_id as string);
    }
    bookmarkCount = bookmarksRes.count ?? 0;
  }

  const chapters = (chaptersRes.data ?? []) as GitaChapter[];
  const sourceMap = new Map<string, GitaContentSource>();
  for (const s of (sourcesRes.data ?? []) as GitaContentSource[]) {
    if (s.review_status === "approved") {
      sourceMap.set(s.id, s);
    }
  }

  const approvedVerses = (versesRes.data ?? [])
    .map((r) => mapVerseRow(r as Record<string, unknown>))
    .filter(
      (v) =>
        v.review_status === "approved" &&
        (!v.source_id || sourceMap.has(v.source_id))
    );

  const translationsByVerse = new Map<string, GitaTranslation[]>();
  for (const rawT of translationsRes.data ?? []) {
    const source = sourceMap.get(rawT.source_id as string) ?? null;
    if (rawT.review_status !== "approved" || !source) continue;
    const item: GitaTranslation = {
      id: rawT.id as string,
      verse_id: rawT.verse_id as string,
      source_id: rawT.source_id as string,
      language_code: rawT.language_code as string,
      translation_text: rawT.translation_text as string,
      is_primary: Boolean(rawT.is_primary),
      review_status: rawT.review_status as ContentReviewStatus,
      reviewed_by: (rawT.reviewed_by as string | null) ?? null,
      reviewed_at: (rawT.reviewed_at as string | null) ?? null,
      source,
    };
    const list = translationsByVerse.get(item.verse_id) ?? [];
    list.push(item);
    translationsByVerse.set(item.verse_id, list);
  }

  const bundles: GitaVerseBundle[] = approvedVerses.map((verse) => ({
    verse,
    verseSource: verse.source_id ? (sourceMap.get(verse.source_id) ?? null) : null,
    translations: translationsByVerse.get(verse.id) ?? [],
    explanations: [],
  }));

  const chapterTitleMap: Record<number, string> = {};
  for (const ch of chapters) {
    chapterTitleMap[ch.chapter_number] = ch.english_title;
  }

  const progress = computeReadingProgressSummary(
    chapters,
    approvedVerses,
    readVerseIds
  );
  const chapterSlots = buildChapterSlots(
    chapters,
    progress.publishedCountByChapter,
    progress.readCountByChapter
  );
  const localDate = getLocalDateString(viewer?.timezone ?? "UTC");
  const dailyWisdom = selectDailyWisdomVerse(
    bundles,
    localDate,
    chapterTitleMap
  );

  return {
    status: "ready",
    viewer,
    chapterSlots,
    totalPublishedVerses: progress.totalPublishedVerses,
    totalReadVerses: progress.totalReadVerses,
    overallProgressPct: progress.overallProgressPct,
    bookmarkCount,
    dailyWisdom,
  };
}

export async function loadGitaChapterPage(
  chapterNumber: number
): Promise<GitaChapterLoadResult> {
  const supabase = await createClient();
  const viewer = await getGitaViewerContext(supabase);

  const [chaptersRes, allPublishedRes, chapterVersesRes, sourcesRes] =
    await Promise.all([
      supabase
        .from("gita_chapters")
        .select(
          "chapter_number, sanskrit_title, transliteration_title, english_title, summary, verse_count, theme_tags"
        )
        .order("chapter_number", { ascending: true }),
      supabase
        .from("gita_verses")
        .select("id, chapter_number, source_id")
        .eq("review_status", "approved"),
      supabase
        .from("gita_verses")
        .select(
          "id, chapter_number, verse_number, verse_ref, sanskrit_devanagari, transliteration_iast, word_by_word, source_id, review_status, reviewed_by, reviewed_at"
        )
        .eq("chapter_number", chapterNumber)
        .eq("review_status", "approved")
        .order("verse_number", { ascending: true }),
      supabase
        .from("content_sources")
        .select(
          "id, slug, title, author_or_translator, tradition_or_lineage, license_name, license_url, attribution_text, source_url, review_status, reviewed_by, reviewed_at"
        )
        .eq("review_status", "approved"),
    ]);

  const firstErr =
    chaptersRes.error ??
    allPublishedRes.error ??
    chapterVersesRes.error ??
    sourcesRes.error;
  if (firstErr) {
    if (isMissingSchemaError(firstErr)) {
      return { status: "schema_not_ready", detail: firstErr.message };
    }
    return { status: "error", message: firstErr.message };
  }

  const sourceMap = new Map<string, GitaContentSource>();
  for (const s of (sourcesRes.data ?? []) as GitaContentSource[]) {
    if (s.review_status === "approved") {
      sourceMap.set(s.id, s);
    }
  }

  const verses = (chapterVersesRes.data ?? [])
    .map((r) => mapVerseRow(r as Record<string, unknown>))
    .filter(
      (v) =>
        v.review_status === "approved" &&
        (!v.source_id || sourceMap.has(v.source_id))
    );

  const verseIds = verses.map((v) => v.id);
  const translationsByVerse = new Map<string, GitaTranslation[]>();
  if (verseIds.length > 0) {
    const trRes = await supabase
      .from("gita_translations")
      .select(
        "id, verse_id, source_id, language_code, translation_text, is_primary, review_status, reviewed_by, reviewed_at"
      )
      .in("verse_id", verseIds)
      .eq("review_status", "approved");

    for (const rawT of trRes.data ?? []) {
      const source = sourceMap.get(rawT.source_id as string) ?? null;
      if (rawT.review_status !== "approved" || !source) continue;
      const t: GitaTranslation = {
        id: rawT.id as string,
        verse_id: rawT.verse_id as string,
        source_id: rawT.source_id as string,
        language_code: rawT.language_code as string,
        translation_text: rawT.translation_text as string,
        is_primary: Boolean(rawT.is_primary),
        review_status: rawT.review_status as ContentReviewStatus,
        reviewed_by: (rawT.reviewed_by as string | null) ?? null,
        reviewed_at: (rawT.reviewed_at as string | null) ?? null,
        source,
      };
      const arr = translationsByVerse.get(t.verse_id) ?? [];
      arr.push(t);
      translationsByVerse.set(t.verse_id, arr);
    }
  }

  const readIds = new Set<string>();
  const bookmarkedIds = new Set<string>();
  const noteVerseIds = new Set<string>();

  if (viewer) {
    const [histRes, bmRes, noteRes] = await Promise.all([
      supabase
        .from("gita_reading_history")
        .select("verse_id")
        .eq("user_id", viewer.userId),
      verseIds.length > 0
        ? supabase
            .from("gita_bookmarks")
            .select("verse_id")
            .eq("user_id", viewer.userId)
            .in("verse_id", verseIds)
        : Promise.resolve({ data: [] }),
      verseIds.length > 0
        ? supabase
            .from("gita_notes")
            .select("verse_id")
            .eq("user_id", viewer.userId)
            .in("verse_id", verseIds)
        : Promise.resolve({ data: [] }),
    ]);

    for (const r of histRes.data ?? []) readIds.add(r.verse_id as string);
    for (const r of bmRes.data ?? []) bookmarkedIds.add(r.verse_id as string);
    for (const r of noteRes.data ?? []) noteVerseIds.add(r.verse_id as string);
  }

  const chapters = (chaptersRes.data ?? []) as GitaChapter[];
  const approvedAll = (allPublishedRes.data ?? [])
    .filter((v) => !v.source_id || sourceMap.has(v.source_id as string))
    .map((v) => ({
      id: v.id as string,
      chapter_number: Number(v.chapter_number),
    }));

  const progress = computeReadingProgressSummary(chapters, approvedAll, readIds);
  const chapterSlots = buildChapterSlots(
    chapters,
    progress.publishedCountByChapter,
    progress.readCountByChapter
  );
  const chapter =
    chapters.find((c) => c.chapter_number === chapterNumber) ?? null;

  return {
    status: "ready",
    viewer,
    chapterNumber,
    chapter,
    chapterSlots,
    readVerseCount: progress.readCountByChapter[chapterNumber] ?? 0,
    verses: verses.map((verse) => {
      const trs = translationsByVerse.get(verse.id) ?? [];
      const primaryTranslation =
        trs.find((t) => t.is_primary && t.language_code === "en") ??
        trs.find((t) => t.is_primary) ??
        trs.find((t) => t.language_code === "en") ??
        trs[0] ??
        null;
      return {
        verse,
        primaryTranslation,
        isBookmarked: bookmarkedIds.has(verse.id),
        isRead: readIds.has(verse.id),
        hasNote: noteVerseIds.has(verse.id),
      };
    }),
  };
}

export async function loadGitaVerseDetail(
  chapterNumber: number,
  verseNumber: number
): Promise<GitaVerseLoadResult> {
  const supabase = await createClient();
  const viewer = await getGitaViewerContext(supabase);

  const [chaptersRes, allApprovedRes, verseRes, sourcesRes] = await Promise.all([
    supabase
      .from("gita_chapters")
      .select(
        "chapter_number, sanskrit_title, transliteration_title, english_title, summary, verse_count, theme_tags"
      )
      .order("chapter_number", { ascending: true }),
    supabase
      .from("gita_verses")
      .select("id, chapter_number, verse_number, verse_ref, source_id")
      .eq("review_status", "approved")
      .order("chapter_number", { ascending: true })
      .order("verse_number", { ascending: true }),
    supabase
      .from("gita_verses")
      .select(
        "id, chapter_number, verse_number, verse_ref, sanskrit_devanagari, transliteration_iast, word_by_word, source_id, review_status, reviewed_by, reviewed_at"
      )
      .eq("chapter_number", chapterNumber)
      .eq("verse_number", verseNumber)
      .eq("review_status", "approved")
      .maybeSingle(),
    supabase
      .from("content_sources")
      .select(
        "id, slug, title, author_or_translator, tradition_or_lineage, license_name, license_url, attribution_text, source_url, review_status, reviewed_by, reviewed_at"
      )
      .eq("review_status", "approved"),
  ]);

  const firstErr =
    chaptersRes.error ??
    allApprovedRes.error ??
    verseRes.error ??
    sourcesRes.error;
  if (firstErr) {
    if (isMissingSchemaError(firstErr)) {
      return { status: "schema_not_ready", detail: firstErr.message };
    }
    return { status: "error", message: firstErr.message };
  }

  const chapters = (chaptersRes.data ?? []) as GitaChapter[];
  const chapter =
    chapters.find((c) => c.chapter_number === chapterNumber) ?? null;

  const sourceMap = new Map<string, GitaContentSource>();
  for (const s of (sourcesRes.data ?? []) as GitaContentSource[]) {
    if (s.review_status === "approved") {
      sourceMap.set(s.id, s);
    }
  }

  const readVerseIds = new Set<string>();
  if (viewer) {
    const histRes = await supabase
      .from("gita_reading_history")
      .select("verse_id")
      .eq("user_id", viewer.userId);
    for (const r of histRes.data ?? []) {
      readVerseIds.add(r.verse_id as string);
    }
  }

  const approvedAll = (allApprovedRes.data ?? []).filter(
    (v) => !v.source_id || sourceMap.has(v.source_id as string)
  );
  const progress = computeReadingProgressSummary(
    chapters,
    approvedAll.map((v) => ({
      id: v.id as string,
      chapter_number: Number(v.chapter_number),
    })),
    readVerseIds
  );
  const chapterSlots = buildChapterSlots(
    chapters,
    progress.publishedCountByChapter,
    progress.readCountByChapter
  );

  const rawVerse = verseRes.data as Record<string, unknown> | null;
  if (
    !rawVerse ||
    rawVerse.review_status !== "approved" ||
    (rawVerse.source_id && !sourceMap.has(String(rawVerse.source_id)))
  ) {
    return {
      status: "unpublished_or_missing",
      viewer,
      chapterNumber,
      verseNumber,
      chapter,
      chapterSlots,
    };
  }

  const verse = mapVerseRow(rawVerse);

  const [trRes, expRes] = await Promise.all([
    supabase
      .from("gita_translations")
      .select(
        "id, verse_id, source_id, language_code, translation_text, is_primary, review_status, reviewed_by, reviewed_at"
      )
      .eq("verse_id", verse.id)
      .eq("review_status", "approved")
      .order("is_primary", { ascending: false }),
    supabase
      .from("gita_explanations")
      .select(
        "id, verse_id, source_id, title, explanation_text, is_ai_assisted, review_status, reviewed_by, reviewed_at"
      )
      .eq("verse_id", verse.id)
      .eq("review_status", "approved")
      .order("is_ai_assisted", { ascending: true }),
  ]);

  const translations: GitaTranslation[] = [];
  for (const rawT of trRes.data ?? []) {
    const source = sourceMap.get(rawT.source_id as string) ?? null;
    if (rawT.review_status !== "approved" || !source) continue;
    translations.push({
      id: rawT.id as string,
      verse_id: rawT.verse_id as string,
      source_id: rawT.source_id as string,
      language_code: rawT.language_code as string,
      translation_text: rawT.translation_text as string,
      is_primary: Boolean(rawT.is_primary),
      review_status: rawT.review_status as ContentReviewStatus,
      reviewed_by: (rawT.reviewed_by as string | null) ?? null,
      reviewed_at: (rawT.reviewed_at as string | null) ?? null,
      source,
    });
  }

  const explanations: GitaExplanation[] = [];
  for (const rawE of expRes.data ?? []) {
    const sourceId = (rawE.source_id as string | null) ?? null;
    const source = sourceId ? (sourceMap.get(sourceId) ?? null) : null;
    if (rawE.review_status !== "approved") continue;
    if (sourceId && !source) continue;
    if (rawE.is_ai_assisted && !rawE.reviewed_by) continue;
    explanations.push({
      id: rawE.id as string,
      verse_id: rawE.verse_id as string,
      source_id: sourceId,
      title: (rawE.title as string | null) ?? null,
      explanation_text: rawE.explanation_text as string,
      is_ai_assisted: Boolean(rawE.is_ai_assisted),
      review_status: rawE.review_status as ContentReviewStatus,
      reviewed_by: (rawE.reviewed_by as string | null) ?? null,
      reviewed_at: (rawE.reviewed_at as string | null) ?? null,
      source,
    });
  }

  let isBookmarked = false;
  let personalNote: GitaNoteItem | null = null;
  let collections: Array<{ id: string; title: string; containsVerse: boolean }> =
    [];

  if (viewer) {
    const [bmRes, noteRes, colsRes, itemsRes] = await Promise.all([
      supabase
        .from("gita_bookmarks")
        .select("id")
        .eq("user_id", viewer.userId)
        .eq("verse_id", verse.id)
        .maybeSingle(),
      supabase
        .from("gita_notes")
        .select("id, verse_id, note_text, created_at, updated_at")
        .eq("user_id", viewer.userId)
        .eq("verse_id", verse.id)
        .maybeSingle(),
      supabase
        .from("learning_collections")
        .select("id, title")
        .eq("user_id", viewer.userId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("learning_collection_items")
        .select("collection_id")
        .eq("verse_id", verse.id),
    ]);

    isBookmarked = Boolean(bmRes.data);
    if (noteRes.data) {
      personalNote = {
        id: noteRes.data.id as string,
        verse_id: noteRes.data.verse_id as string,
        note_text: noteRes.data.note_text as string,
        created_at: noteRes.data.created_at as string,
        updated_at: noteRes.data.updated_at as string,
        verse: {
          id: verse.id,
          chapter_number: verse.chapter_number,
          verse_number: verse.verse_number,
          verse_ref: verse.verse_ref,
        },
      };
    }

    const inColIds = new Set(
      (itemsRes.data ?? []).map((i) => i.collection_id as string)
    );
    collections = (colsRes.data ?? []).map((c) => ({
      id: c.id as string,
      title: c.title as string,
      containsVerse: inColIds.has(c.id as string),
    }));
  }

  const navRefs: GitaNavReference[] = approvedAll.map((v) => ({
    chapter_number: Number(v.chapter_number),
    verse_number: Number(v.verse_number),
    verse_ref:
      typeof v.verse_ref === "string"
        ? v.verse_ref
        : `${v.chapter_number}.${v.verse_number}`,
  }));
  const chapterVerseRefs = navRefs.filter(
    (v) => v.chapter_number === chapterNumber
  );
  const { previous, next } = computePreviousNextVerse(
    navRefs,
    chapterNumber,
    verseNumber
  );

  return {
    status: "ready",
    viewer,
    chapter,
    chapterSlots,
    bundle: {
      verse,
      verseSource: verse.source_id
        ? (sourceMap.get(verse.source_id) ?? null)
        : null,
      translations,
      explanations,
    },
    chapterVerseRefs,
    previousVerse: previous,
    nextVerse: next,
    isBookmarked,
    isRead: readVerseIds.has(verse.id),
    personalNote,
    collections,
  };
}

export async function searchGitaContent(params: {
  q?: string;
  chapter?: number;
  verse?: number;
}): Promise<{
  status: "ready" | "schema_not_ready" | "error";
  detail?: string;
  results: GitaSearchResultItem[];
  chapters: GitaChapter[];
}> {
  const supabase = await createClient();
  const rawQ = (params.q ?? "").trim();
  const parsedRef = parseVerseReference(rawQ);
  const targetChapter = params.chapter ?? parsedRef?.chapter;
  const targetVerse = params.verse ?? parsedRef?.verse;
  const sanitized = sanitizeSearchText(rawQ);

  const [chaptersRes, sourcesRes] = await Promise.all([
    supabase
      .from("gita_chapters")
      .select(
        "chapter_number, sanskrit_title, transliteration_title, english_title, summary, verse_count, theme_tags"
      )
      .order("chapter_number", { ascending: true }),
    supabase
      .from("content_sources")
      .select(
        "id, slug, title, author_or_translator, tradition_or_lineage, license_name, license_url, attribution_text, source_url, review_status, reviewed_by, reviewed_at"
      )
      .eq("review_status", "approved"),
  ]);

  const err = chaptersRes.error ?? sourcesRes.error;
  if (err) {
    if (isMissingSchemaError(err)) {
      return {
        status: "schema_not_ready",
        detail: err.message,
        results: [],
        chapters: [],
      };
    }
    return { status: "error", detail: err.message, results: [], chapters: [] };
  }

  const chapters = (chaptersRes.data ?? []) as GitaChapter[];
  const chapterTitleMap = new Map<number, string>(
    chapters.map((c) => [c.chapter_number, c.english_title])
  );
  const sourceMap = new Map<string, GitaContentSource>();
  for (const s of (sourcesRes.data ?? []) as GitaContentSource[]) {
    if (s.review_status === "approved") sourceMap.set(s.id, s);
  }

  let verseQuery = supabase
    .from("gita_verses")
    .select(
      "id, chapter_number, verse_number, verse_ref, sanskrit_devanagari, transliteration_iast, word_by_word, source_id, review_status, reviewed_by, reviewed_at"
    )
    .eq("review_status", "approved")
    .order("chapter_number", { ascending: true })
    .order("verse_number", { ascending: true })
    .limit(60);

  if (targetChapter !== undefined) {
    verseQuery = verseQuery.eq("chapter_number", targetChapter);
  }
  if (targetVerse !== undefined) {
    verseQuery = verseQuery.eq("verse_number", targetVerse);
  } else if (sanitized && !parsedRef) {
    verseQuery = verseQuery.or(
      `transliteration_iast.ilike.%${sanitized}%,sanskrit_devanagari.ilike.%${sanitized}%,verse_ref.ilike.%${sanitized}%`
    );
  }

  const verseMatchRes = await verseQuery;
  if (verseMatchRes.error) {
    return {
      status: "error",
      detail: verseMatchRes.error.message,
      results: [],
      chapters,
    };
  }

  const matchedMap = new Map<
    string,
    {
      verse: GitaVerse;
      matchedIn: Set<"reference" | "sanskrit" | "transliteration" | "translation">;
    }
  >();

  const lowerQ = sanitized.toLowerCase();
  for (const row of verseMatchRes.data ?? []) {
    const verse = mapVerseRow(row as Record<string, unknown>);
    if (verse.review_status !== "approved") continue;
    if (verse.source_id && !sourceMap.has(verse.source_id)) continue;

    const tags = new Set<
      "reference" | "sanskrit" | "transliteration" | "translation"
    >();
    if (parsedRef || targetVerse !== undefined || targetChapter !== undefined) {
      tags.add("reference");
    }
    if (lowerQ && verse.sanskrit_devanagari.includes(sanitized)) {
      tags.add("sanskrit");
    }
    if (lowerQ && verse.transliteration_iast.toLowerCase().includes(lowerQ)) {
      tags.add("transliteration");
    }
    if (tags.size === 0) tags.add("reference");
    matchedMap.set(verse.id, { verse, matchedIn: tags });
  }

  // Also search approved translations text when sanitized text is present
  if (sanitized && !parsedRef && targetVerse === undefined) {
    const trSearchRes = await supabase
      .from("gita_translations")
      .select(
        "id, verse_id, source_id, language_code, translation_text, is_primary, review_status, reviewed_by, reviewed_at"
      )
      .eq("review_status", "approved")
      .ilike("translation_text", `%${sanitized}%`)
      .limit(50);

    const extraIds = Array.from(
      new Set(
        (trSearchRes.data ?? [])
          .filter((t) => sourceMap.has(t.source_id as string))
          .map((t) => t.verse_id as string)
          .filter((id) => !matchedMap.has(id))
      )
    );

    for (const tr of trSearchRes.data ?? []) {
      const existing = matchedMap.get(tr.verse_id as string);
      if (existing && sourceMap.has(tr.source_id as string)) {
        existing.matchedIn.add("translation");
      }
    }

    if (extraIds.length > 0) {
      let extraVerseQuery = supabase
        .from("gita_verses")
        .select(
          "id, chapter_number, verse_number, verse_ref, sanskrit_devanagari, transliteration_iast, word_by_word, source_id, review_status, reviewed_by, reviewed_at"
        )
        .in("id", extraIds)
        .eq("review_status", "approved");

      if (targetChapter !== undefined) {
        extraVerseQuery = extraVerseQuery.eq("chapter_number", targetChapter);
      }

      const extraRes = await extraVerseQuery;
      for (const row of extraRes.data ?? []) {
        const verse = mapVerseRow(row as Record<string, unknown>);
        if (verse.source_id && !sourceMap.has(verse.source_id)) continue;
        matchedMap.set(verse.id, {
          verse,
          matchedIn: new Set(["translation"]),
        });
      }
    }
  }

  const allVerseIds = Array.from(matchedMap.keys());
  const translationsByVerse = new Map<string, GitaTranslation[]>();
  if (allVerseIds.length > 0) {
    const trRes = await supabase
      .from("gita_translations")
      .select(
        "id, verse_id, source_id, language_code, translation_text, is_primary, review_status, reviewed_by, reviewed_at"
      )
      .in("verse_id", allVerseIds)
      .eq("review_status", "approved");

    for (const rawT of trRes.data ?? []) {
      const source = sourceMap.get(rawT.source_id as string) ?? null;
      if (!source || rawT.review_status !== "approved") continue;
      const item: GitaTranslation = {
        id: rawT.id as string,
        verse_id: rawT.verse_id as string,
        source_id: rawT.source_id as string,
        language_code: rawT.language_code as string,
        translation_text: rawT.translation_text as string,
        is_primary: Boolean(rawT.is_primary),
        review_status: rawT.review_status as ContentReviewStatus,
        reviewed_by: (rawT.reviewed_by as string | null) ?? null,
        reviewed_at: (rawT.reviewed_at as string | null) ?? null,
        source,
      };
      const arr = translationsByVerse.get(item.verse_id) ?? [];
      arr.push(item);
      translationsByVerse.set(item.verse_id, arr);
    }
  }

  const results: GitaSearchResultItem[] = Array.from(matchedMap.values())
    .sort((a, b) => {
      if (a.verse.chapter_number !== b.verse.chapter_number) {
        return a.verse.chapter_number - b.verse.chapter_number;
      }
      return a.verse.verse_number - b.verse.verse_number;
    })
    .slice(0, 50)
    .map(({ verse, matchedIn }) => {
      const trs = translationsByVerse.get(verse.id) ?? [];
      const primaryTranslation =
        trs.find((t) => t.is_primary && t.language_code === "en") ??
        trs.find((t) => t.is_primary) ??
        trs.find((t) => t.language_code === "en") ??
        trs[0] ??
        null;

      return {
        verse,
        primaryTranslation,
        chapterTitle: chapterTitleMap.get(verse.chapter_number) ?? null,
        matchedIn: Array.from(matchedIn),
      };
    });

  return { status: "ready", results, chapters };
}

export async function loadGitaStudyVault(): Promise<GitaStudyVaultLoadResult> {
  const supabase = await createClient();
  const viewer = await getGitaViewerContext(supabase);
  if (!viewer) return { status: "unauthenticated" };

  const [
    chaptersRes,
    versesRes,
    bookmarksRes,
    notesRes,
    historyRes,
    collectionsRes,
    collectionItemsRes,
    feedbackRes,
  ] = await Promise.all([
    supabase
      .from("gita_chapters")
      .select(
        "chapter_number, sanskrit_title, transliteration_title, english_title, summary, verse_count, theme_tags"
      )
      .order("chapter_number", { ascending: true }),
    supabase
      .from("gita_verses")
      .select(
        "id, chapter_number, verse_number, verse_ref, sanskrit_devanagari, transliteration_iast"
      )
      .eq("review_status", "approved")
      .order("chapter_number", { ascending: true })
      .order("verse_number", { ascending: true }),
    supabase
      .from("gita_bookmarks")
      .select("id, verse_id, created_at")
      .eq("user_id", viewer.userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("gita_notes")
      .select("id, verse_id, note_text, created_at, updated_at")
      .eq("user_id", viewer.userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("gita_reading_history")
      .select("id, verse_id, read_at")
      .eq("user_id", viewer.userId)
      .order("read_at", { ascending: false })
      .limit(100),
    supabase
      .from("learning_collections")
      .select("id, user_id, title, description, is_curated, created_at, updated_at")
      .eq("user_id", viewer.userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("learning_collection_items")
      .select("id, collection_id, verse_id, sort_order, added_at")
      .order("sort_order", { ascending: true })
      .order("added_at", { ascending: true }),
    supabase
      .from("content_feedback")
      .select(
        "id, submitted_by, verse_id, translation_id, explanation_id, category, message, status, resolution_notes, resolved_by, resolved_at, created_at"
      )
      .eq("submitted_by", viewer.userId)
      .order("created_at", { ascending: false }),
  ]);

  const err =
    chaptersRes.error ??
    versesRes.error ??
    bookmarksRes.error ??
    notesRes.error ??
    historyRes.error ??
    collectionsRes.error ??
    collectionItemsRes.error ??
    feedbackRes.error;
  if (err) {
    if (isMissingSchemaError(err)) {
      return { status: "schema_not_ready", detail: err.message };
    }
    return { status: "error", message: err.message };
  }

  const verseById = new Map<
    string,
    {
      id: string;
      chapter_number: number;
      verse_number: number;
      verse_ref: string;
      sanskrit_devanagari: string;
      transliteration_iast: string;
    }
  >();
  for (const v of versesRes.data ?? []) {
    verseById.set(v.id as string, {
      id: v.id as string,
      chapter_number: Number(v.chapter_number),
      verse_number: Number(v.verse_number),
      verse_ref:
        typeof v.verse_ref === "string"
          ? v.verse_ref
          : `${v.chapter_number}.${v.verse_number}`,
      sanskrit_devanagari: String(v.sanskrit_devanagari ?? ""),
      transliteration_iast: String(v.transliteration_iast ?? ""),
    });
  }

  const readIds = new Set<string>(
    (historyRes.data ?? []).map((h) => h.verse_id as string)
  );
  const chapters = (chaptersRes.data ?? []) as GitaChapter[];
  const approvedSimple = Array.from(verseById.values());
  const progress = computeReadingProgressSummary(chapters, approvedSimple, readIds);
  const chapterSlots = buildChapterSlots(
    chapters,
    progress.publishedCountByChapter,
    progress.readCountByChapter
  );

  const itemsByCol = new Map<string, GitaCollectionRecord["items"]>();
  for (const rawItem of collectionItemsRes.data ?? []) {
    const colId = rawItem.collection_id as string;
    const list = itemsByCol.get(colId) ?? [];
    list.push({
      id: rawItem.id as string,
      collection_id: colId,
      verse_id: rawItem.verse_id as string,
      sort_order: Number(rawItem.sort_order ?? 0),
      added_at: rawItem.added_at as string,
      verse: verseById.get(rawItem.verse_id as string) ?? null,
    });
    itemsByCol.set(colId, list);
  }

  return {
    status: "ready",
    viewer,
    chapterSlots,
    totalPublishedVerses: progress.totalPublishedVerses,
    totalReadVerses: progress.totalReadVerses,
    overallProgressPct: progress.overallProgressPct,
    bookmarks: (bookmarksRes.data ?? []).map((b) => ({
      id: b.id as string,
      verse_id: b.verse_id as string,
      created_at: b.created_at as string,
      verse: verseById.get(b.verse_id as string) ?? null,
    })),
    notes: (notesRes.data ?? []).map((n) => {
      const v = verseById.get(n.verse_id as string) ?? null;
      return {
        id: n.id as string,
        verse_id: n.verse_id as string,
        note_text: n.note_text as string,
        created_at: n.created_at as string,
        updated_at: n.updated_at as string,
        verse: v
          ? {
              id: v.id,
              chapter_number: v.chapter_number,
              verse_number: v.verse_number,
              verse_ref: v.verse_ref,
            }
          : null,
      };
    }),
    history: (historyRes.data ?? []).map((h) => {
      const v = verseById.get(h.verse_id as string) ?? null;
      return {
        id: Number(h.id),
        verse_id: h.verse_id as string,
        read_at: h.read_at as string,
        verse: v
          ? {
              id: v.id,
              chapter_number: v.chapter_number,
              verse_number: v.verse_number,
              verse_ref: v.verse_ref,
            }
          : null,
      };
    }),
    collections: (collectionsRes.data ?? []).map((c) => ({
      id: c.id as string,
      user_id: c.user_id as string,
      title: c.title as string,
      description: (c.description as string | null) ?? null,
      is_curated: Boolean(c.is_curated),
      created_at: c.created_at as string,
      updated_at: c.updated_at as string,
      items: itemsByCol.get(c.id as string) ?? [],
    })),
    feedback: (feedbackRes.data ?? []).map((f) => ({
      id: f.id as string,
      submitted_by: f.submitted_by as string,
      verse_id: (f.verse_id as string | null) ?? null,
      translation_id: (f.translation_id as string | null) ?? null,
      explanation_id: (f.explanation_id as string | null) ?? null,
      category: f.category as FeedbackCategory,
      message: f.message as string,
      status: f.status as FeedbackStatus,
      resolution_notes: (f.resolution_notes as string | null) ?? null,
      resolved_by: (f.resolved_by as string | null) ?? null,
      resolved_at: (f.resolved_at as string | null) ?? null,
      created_at: f.created_at as string,
    })),
    approvedVerseOptions: approvedSimple.map((v) => ({
      id: v.id,
      verse_ref: v.verse_ref,
      chapter_number: v.chapter_number,
      verse_number: v.verse_number,
    })),
  };
}

export async function loadGitaAdminWorkspace(): Promise<GitaAdminLoadResult> {
  const supabase = await createClient();
  const viewer = await getGitaViewerContext(supabase);

  if (!viewer) return { status: "unauthenticated" };
  if (!viewer.isAdmin) return { status: "forbidden", viewer };

  const [
    sourcesRes,
    chaptersRes,
    versesRes,
    translationsRes,
    explanationsRes,
    feedbackRes,
    auditRes,
  ] = await Promise.all([
    supabase
      .from("content_sources")
      .select(
        "id, slug, title, author_or_translator, tradition_or_lineage, license_name, license_url, attribution_text, source_url, review_status, reviewed_by, reviewed_at"
      )
      .order("title", { ascending: true }),
    supabase
      .from("gita_chapters")
      .select(
        "chapter_number, sanskrit_title, transliteration_title, english_title, summary, verse_count, theme_tags"
      )
      .order("chapter_number", { ascending: true }),
    supabase
      .from("gita_verses")
      .select(
        "id, chapter_number, verse_number, verse_ref, sanskrit_devanagari, transliteration_iast, word_by_word, source_id, review_status, reviewed_by, reviewed_at"
      )
      .order("chapter_number", { ascending: true })
      .order("verse_number", { ascending: true }),
    supabase
      .from("gita_translations")
      .select(
        "id, verse_id, source_id, language_code, translation_text, is_primary, review_status, reviewed_by, reviewed_at"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("gita_explanations")
      .select(
        "id, verse_id, source_id, title, explanation_text, is_ai_assisted, review_status, reviewed_by, reviewed_at"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("content_feedback")
      .select(
        "id, submitted_by, verse_id, translation_id, explanation_id, category, message, status, resolution_notes, resolved_by, resolved_at, created_at"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("id, actor_user_id, action, target_table, target_id, metadata, created_at")
      .in("target_table", [
        "content_sources",
        "gita_chapters",
        "gita_verses",
        "gita_translations",
        "gita_explanations",
        "content_feedback",
      ])
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const err =
    sourcesRes.error ??
    chaptersRes.error ??
    versesRes.error ??
    translationsRes.error ??
    explanationsRes.error ??
    feedbackRes.error ??
    auditRes.error;
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
    sources,
    chapters: (chaptersRes.data ?? []) as GitaChapter[],
    verses: (versesRes.data ?? []).map((r) =>
      mapVerseRow(r as Record<string, unknown>)
    ),
    translations: (translationsRes.data ?? []).map((rawT) => ({
      id: rawT.id as string,
      verse_id: rawT.verse_id as string,
      source_id: rawT.source_id as string,
      language_code: rawT.language_code as string,
      translation_text: rawT.translation_text as string,
      is_primary: Boolean(rawT.is_primary),
      review_status: rawT.review_status as ContentReviewStatus,
      reviewed_by: (rawT.reviewed_by as string | null) ?? null,
      reviewed_at: (rawT.reviewed_at as string | null) ?? null,
      source: sourceMap.get(rawT.source_id as string) ?? null,
    })),
    explanations: (explanationsRes.data ?? []).map((rawE) => ({
      id: rawE.id as string,
      verse_id: rawE.verse_id as string,
      source_id: (rawE.source_id as string | null) ?? null,
      title: (rawE.title as string | null) ?? null,
      explanation_text: rawE.explanation_text as string,
      is_ai_assisted: Boolean(rawE.is_ai_assisted),
      review_status: rawE.review_status as ContentReviewStatus,
      reviewed_by: (rawE.reviewed_by as string | null) ?? null,
      reviewed_at: (rawE.reviewed_at as string | null) ?? null,
      source: rawE.source_id
        ? (sourceMap.get(rawE.source_id as string) ?? null)
        : null,
    })),
    feedback: (feedbackRes.data ?? []) as GitaFeedbackRecord[],
    auditLogs: (auditRes.data ?? []) as GitaAdminAuditItem[],
  };
}

