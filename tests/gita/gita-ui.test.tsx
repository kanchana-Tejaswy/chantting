import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { GitaOverviewView } from "@/components/gita/gita-overview-view";
import { GitaChapterView } from "@/components/gita/gita-chapter-view";
import { GitaVerseReader } from "@/components/gita/gita-verse-reader";
import { GitaSearchView } from "@/components/gita/gita-search-view";
import { GitaStudyView } from "@/components/gita/gita-study-view";
import { GitaAdminStudio } from "@/components/gita/gita-admin-studio";
import { buildChapterSlots, type GitaVerseBundle } from "@/lib/gita/domain";

const MOCK_SOURCE = {
  id: "src-1",
  slug: "public-domain-test",
  title: "Public Domain Verified Edition",
  author_or_translator: "Swami Verified Test",
  tradition_or_lineage: "Classical Tradition",
  license_name: "Public Domain",
  license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
  attribution_text: "Verified public-domain archive attribution.",
  source_url: null,
  review_status: "approved" as const,
  reviewed_by: "admin-1",
  reviewed_at: "2026-11-11T00:00:00Z",
};

const MOCK_BUNDLE: GitaVerseBundle = {
  verse: {
    id: "v-1",
    chapter_number: 2,
    verse_number: 47,
    verse_ref: "2.47",
    sanskrit_devanagari: "परीक्षा संस्कृत श्लोकः",
    transliteration_iast: "parīkṣā saṁskṛta ślokaḥ",
    word_by_word: [
      { sanskrit: "परीक्षा", transliteration: "parīkṣā", meaning: "test term" },
    ],
    source_id: "src-1",
    review_status: "approved",
    reviewed_by: "admin-1",
    reviewed_at: "2026-11-11T00:00:00Z",
  },
  verseSource: MOCK_SOURCE,
  translations: [
    {
      id: "tr-1",
      verse_id: "v-1",
      source_id: "src-1",
      language_code: "en",
      translation_text: "Verified test English translation text.",
      is_primary: true,
      review_status: "approved",
      reviewed_by: "admin-1",
      reviewed_at: "2026-11-11T00:00:00Z",
      source: MOCK_SOURCE,
    },
  ],
  explanations: [
    {
      id: "exp-1",
      verse_id: "v-1",
      source_id: "src-1",
      title: "Study Reflection",
      explanation_text: "Verified human-reviewed study explanation.",
      is_ai_assisted: true,
      review_status: "approved",
      reviewed_by: "admin-1",
      reviewed_at: "2026-11-11T00:00:00Z",
      source: MOCK_SOURCE,
    },
  ],
};

describe("Phase 8 Bhagavad Gita UI rendering & empty states", () => {
  it("renders honest empty state across all 18 chapter slots when no verified scripture is ingested", () => {
    const emptySlots = buildChapterSlots([], {}, {});
    const html = renderToStaticMarkup(
      <GitaOverviewView
        viewer={null}
        chapterSlots={emptySlots}
        totalPublishedVerses={0}
        totalReadVerses={0}
        overallProgressPct={0}
        bookmarkCount={0}
        dailyWisdom={null}
      />
    );

    expect(html).toContain("Chapter 1");
    expect(html).toContain("Chapter 18");
    expect(html).toContain("No approved verses have been ingested");
    expect(html).not.toContain("Content Studio");
  });

  it("renders chapter view empty state and verse reader with attribution & AI commentary disclosure", () => {
    const emptySlots = buildChapterSlots([], {}, {});
    const emptyChapterHtml = renderToStaticMarkup(
      <GitaChapterView
        viewer={null}
        chapterNumber={2}
        chapter={null}
        chapterSlots={emptySlots}
        readVerseCount={0}
        verses={[]}
      />
    );
    expect(emptyChapterHtml).toContain("No Verified Verses Published Yet");

    const verseHtml = renderToStaticMarkup(
      <GitaVerseReader
        viewer={{
          userId: "u-1",
          email: "meera@example.org",
          displayName: "Meera",
          timezone: "UTC",
          isAdmin: false,
          adminRole: null,
        }}
        chapter={{
          chapter_number: 2,
          sanskrit_title: "द्वितीयः",
          transliteration_title: "Dvitīya",
          english_title: "Chapter 2 Test",
          summary: "Chapter summary.",
          verse_count: 72,
          theme_tags: ["karma-yoga"],
        }}
        chapterSlots={emptySlots}
        bundle={MOCK_BUNDLE}
        chapterVerseRefs={[
          { chapter_number: 2, verse_number: 46, verse_ref: "2.46" },
          { chapter_number: 2, verse_number: 47, verse_ref: "2.47" },
          { chapter_number: 2, verse_number: 48, verse_ref: "2.48" },
        ]}
        previousVerse={{ chapter_number: 2, verse_number: 46, verse_ref: "2.46" }}
        nextVerse={{ chapter_number: 2, verse_number: 48, verse_ref: "2.48" }}
        initialBookmarked={true}
        initialRead={false}
        initialNote={null}
        initialCollections={[{ id: "c1", title: "Evening Study", containsVerse: false }]}
      />
    );

    expect(verseHtml).toContain("परीक्षा संस्कृत श्लोकः");
    expect(verseHtml).toContain("IAST Transliteration");
    expect(verseHtml).toContain("Swami Verified Test");
    expect(verseHtml).toContain("Public Domain");
    expect(verseHtml).toContain(
      "AI-Assisted · Human Reviewed · Not Authoritative Scripture"
    );
    expect(verseHtml).toContain("Prev (2.46)");
    expect(verseHtml).toContain("Next (2.48)");
    expect(verseHtml).toContain("Private Study Note");
    expect(verseHtml).toContain("Evening Study");
  });

  it("renders search, study vault, and admin content studio without runtime issues", () => {
    const slots = buildChapterSlots([], {}, {});
    const searchHtml = renderToStaticMarkup(
      <GitaSearchView
        query="2.47"
        chapters={[]}
        results={[
          {
            verse: MOCK_BUNDLE.verse,
            primaryTranslation: MOCK_BUNDLE.translations[0]!,
            chapterTitle: "Chapter 2 Test",
            matchedIn: ["reference"],
          },
        ]}
        searched={true}
      />
    );
    expect(searchHtml).toContain("BG 2.47");

    const viewer = {
      userId: "u-admin",
      email: "admin@example.org",
      displayName: "Admin",
      timezone: "UTC",
      isAdmin: true,
      adminRole: "scripture_admin",
    };

    const studyHtml = renderToStaticMarkup(
      <GitaStudyView
        viewer={viewer}
        chapterSlots={slots}
        totalPublishedVerses={1}
        totalReadVerses={1}
        overallProgressPct={100}
        bookmarks={[]}
        notes={[]}
        history={[]}
        collections={[]}
        feedback={[]}
        approvedVerseOptions={[]}
      />
    );
    expect(studyHtml).toContain("Personal Gītā Study Vault");
    expect(studyHtml).toContain("Reading Progress by Chapter");

    const adminHtml = renderToStaticMarkup(
      <GitaAdminStudio
        viewer={viewer}
        sources={[MOCK_SOURCE]}
        chapters={[]}
        verses={[MOCK_BUNDLE.verse]}
        translations={MOCK_BUNDLE.translations}
        explanations={MOCK_BUNDLE.explanations}
        feedback={[]}
        auditLogs={[]}
      />
    );
    expect(adminHtml).toContain("Bhagavad Gītā Content Management");
    expect(adminHtml).toContain("Sources &amp; Licenses");
  });
});

