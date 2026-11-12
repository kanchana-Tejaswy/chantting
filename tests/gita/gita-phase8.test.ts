import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  asAnon,
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";
import {
  buildChapterSlots,
  computePreviousNextVerse,
  computeReadingProgressSummary,
  selectDailyWisdomVerse,
  type GitaVerseBundle,
} from "@/lib/gita/domain";
import {
  explanationAdminSchema,
  gitaSearchQuerySchema,
  parseVerseReference,
  sanitizeSearchText,
} from "@/lib/gita/validation";

const ADMIN_A = "a1111111-1111-4111-8111-111111111111";
const READER_B = "b2222222-2222-4222-8222-222222222222";
const READER_C = "c3333333-3333-4333-8333-333333333333";

describe("Phase 8 Bhagavad Gita Knowledge Centre — RLS, Integrity, Admin & Domain", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: ADMIN_A,
      email: "admin@example.org",
      name: "Acharya Admin",
      timezone: "Asia/Kolkata",
    });
    await seedTestUser(testDb.db, {
      id: READER_B,
      email: "reader-b@example.org",
      name: "Meera",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: READER_C,
      email: "reader-c@example.org",
      name: "Narada",
      timezone: "UTC",
    });

    // Grant ADMIN_A scripture_admin role via trusted migration/superuser channel
    await testDb.db.query(
      `INSERT INTO public.platform_admins (user_id, role, notes)
       VALUES ($1, 'scripture_admin', 'Phase 8 test administrator')`,
      [ADMIN_A]
    );
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("enforces admin-only content management, blocks non-admin writes, and hides unpublished scripture", async () => {
    // Non-admin cannot self-promote into platform_admins
    await expect(
      asUser(testDb.db, READER_B, async (tx) => {
        await tx.query(
          `INSERT INTO public.platform_admins (user_id, role) VALUES ($1, 'super_admin')`,
          [READER_B]
        );
      })
    ).rejects.toThrow();

    // Non-admin cannot insert content sources, chapters, or verses
    await expect(
      asUser(testDb.db, READER_B, async (tx) => {
        await tx.query(
          `INSERT INTO public.content_sources
           (slug, title, author_or_translator, license_name, attribution_text)
           VALUES ('unauth-src', 'Unauthorized', 'Someone', 'CC0', 'Attr')`
        );
      })
    ).rejects.toThrow();

    await expect(
      asUser(testDb.db, READER_B, async (tx) => {
        await tx.query(
          `INSERT INTO public.gita_chapters
           (chapter_number, sanskrit_title, transliteration_title, english_title, summary, verse_count)
           VALUES (1, 'प्रथमः', 'Prathama', 'Chapter One', 'Test summary', 46)`
        );
      })
    ).rejects.toThrow();

    // Admin A creates a pending_review source, chapter, draft verse, pending translation, and AI-assisted explanation
    const { sourceId, verseId, translationId, explanationId } = await asUser(
      testDb.db,
      ADMIN_A,
      async (tx) => {
        const s = await tx.query<{ id: string }>(
          `INSERT INTO public.content_sources
           (slug, title, author_or_translator, tradition_or_lineage, license_name, attribution_text, review_status)
           VALUES ('pd-test-edition', 'Test Public Domain Edition', 'Test Translator', 'Classical', 'Public Domain', 'Public Domain Verified Archive', 'pending_review')
           RETURNING id`
        );
        await tx.query(
          `INSERT INTO public.gita_chapters
           (chapter_number, sanskrit_title, transliteration_title, english_title, summary, verse_count, theme_tags)
           VALUES (2, 'अध्याय २', 'Adhyāya 2', 'Chapter 2 Test Title', 'Test chapter summary description.', 72, ARRAY['karma-yoga'])`
        );
        const v = await tx.query<{ id: string }>(
          `INSERT INTO public.gita_verses
           (chapter_number, verse_number, sanskrit_devanagari, transliteration_iast, source_id, review_status)
           VALUES (2, 47, 'संस्कृत श्लोक परीक्षा', 'saṁskṛta śloka parīkṣā', $1, 'draft')
           RETURNING id`,
          [s.rows[0]!.id]
        );
        const tr = await tx.query<{ id: string }>(
          `INSERT INTO public.gita_translations
           (verse_id, source_id, language_code, translation_text, is_primary, review_status)
           VALUES ($1, $2, 'en', 'Verified test English rendering for verse 2.47.', TRUE, 'approved')
           RETURNING id`,
          [v.rows[0]!.id, s.rows[0]!.id]
        );
        const ex = await tx.query<{ id: string }>(
          `INSERT INTO public.gita_explanations
           (verse_id, source_id, title, explanation_text, is_ai_assisted, review_status)
           VALUES ($1, $2, 'Study Note', 'Human-verified study commentary note.', TRUE, 'pending_review')
           RETURNING id`,
          [v.rows[0]!.id, s.rows[0]!.id]
        );
        return {
          sourceId: s.rows[0]!.id,
          verseId: v.rows[0]!.id,
          translationId: tr.rows[0]!.id,
          explanationId: ex.rows[0]!.id,
        };
      }
    );

    // Unpublished verse, unapproved source, and even child 'approved' translation remain INVISIBLE to anon and READER_B
    const readerHidden = await asUser(testDb.db, READER_B, async (tx) => {
      const verses = await tx.query(`SELECT id FROM public.gita_verses`);
      const trs = await tx.query(`SELECT id FROM public.gita_translations`);
      const exps = await tx.query(`SELECT id FROM public.gita_explanations`);
      return {
        verses: verses.rows,
        translations: trs.rows,
        explanations: exps.rows,
      };
    });
    expect(readerHidden.verses).toEqual([]);
    expect(readerHidden.translations).toEqual([]);
    expect(readerHidden.explanations).toEqual([]);

    const anonHidden = await asAnon(testDb.db, async (tx) => {
      const verses = await tx.query(`SELECT id FROM public.gita_verses`);
      return verses.rows;
    });
    expect(anonHidden).toEqual([]);

    // Admin A approves source, verse, and AI-assisted explanation (trigger records human reviewed_by = ADMIN_A)
    await asUser(testDb.db, ADMIN_A, async (tx) => {
      await tx.query(
        `UPDATE public.content_sources SET review_status = 'approved' WHERE id = $1`,
        [sourceId]
      );
      await tx.query(
        `UPDATE public.gita_verses SET review_status = 'approved' WHERE id = $1`,
        [verseId]
      );
      await tx.query(
        `UPDATE public.gita_explanations SET review_status = 'approved' WHERE id = $1`,
        [explanationId]
      );
    });

    // Now anon and READER_B can read approved verse, translation, explanation, and attribution
    const readerVisible = await asUser(testDb.db, READER_B, async (tx) => {
      const verses = await tx.query<{ id: string; reviewed_by: string }>(
        `SELECT id, reviewed_by FROM public.gita_verses WHERE id = $1`,
        [verseId]
      );
      const trs = await tx.query<{ id: string }>(
        `SELECT id FROM public.gita_translations WHERE id = $1`,
        [translationId]
      );
      const exps = await tx.query<{ reviewed_by: string; is_ai_assisted: boolean }>(
        `SELECT reviewed_by, is_ai_assisted FROM public.gita_explanations WHERE id = $1`,
        [explanationId]
      );
      return { verses: verses.rows, trs: trs.rows, exps: exps.rows };
    });

    expect(readerVisible.verses).toHaveLength(1);
    expect(readerVisible.verses[0]!.reviewed_by).toBe(ADMIN_A);
    expect(readerVisible.trs).toHaveLength(1);
    expect(readerVisible.exps[0]!.reviewed_by).toBe(ADMIN_A);
    expect(readerVisible.exps[0]!.is_ai_assisted).toBe(true);

    // Verify immutable CMS audit logs recorded admin actions
    const auditRes = await asUser(testDb.db, ADMIN_A, async (tx) => {
      return tx.query<{ action: string; target_table: string }>(
        `SELECT action, target_table FROM public.audit_logs WHERE actor_user_id = $1`,
        [ADMIN_A]
      );
    });
    expect(auditRes.rows.map((r) => r.target_table)).toContain("gita_verses");
    expect(auditRes.rows.map((r) => r.action)).toContain("gita_cms_update");

    // If source is moved back to 'needs_correction', dependent verse and translation become hidden again
    await asUser(testDb.db, ADMIN_A, async (tx) => {
      await tx.query(
        `UPDATE public.content_sources SET review_status = 'needs_correction' WHERE id = $1`,
        [sourceId]
      );
    });
    const hiddenAgain = await asAnon(testDb.db, async (tx) => {
      const verses = await tx.query(`SELECT id FROM public.gita_verses WHERE id = $1`, [verseId]);
      const trs = await tx.query(`SELECT id FROM public.gita_translations WHERE id = $1`, [translationId]);
      return { verses: verses.rows, trs: trs.rows };
    });
    expect(hiddenAgain.verses).toEqual([]);
    expect(hiddenAgain.trs).toEqual([]);

    // Restore source approval for next test assertions
    await asUser(testDb.db, ADMIN_A, async (tx) => {
      await tx.query(
        `UPDATE public.content_sources SET review_status = 'approved' WHERE id = $1`,
        [sourceId]
      );
    });
  });

  it("isolates bookmarks, private notes, reading history, collections, and feedback across users", async () => {
    const verseRes = await asUser(testDb.db, READER_B, async (tx) => {
      return tx.query<{ id: string }>(
        `SELECT id FROM public.gita_verses WHERE chapter_number = 2 AND verse_number = 47`
      );
    });
    const verseId = verseRes.rows[0]!.id;

    // READER_B creates bookmark, private note, reading history, collection + item, and feedback
    const { colId, feedbackId } = await asUser(
      testDb.db,
      READER_B,
      async (tx) => {
        await tx.query(
          `INSERT INTO public.gita_bookmarks (user_id, verse_id) VALUES ($1, $2)`,
          [READER_B, verseId]
        );
        await tx.query(
          `INSERT INTO public.gita_notes (user_id, verse_id, note_text)
           VALUES ($1, $2, 'Private contemplative reflection')`,
          [READER_B, verseId]
        );
        await tx.query(
          `INSERT INTO public.gita_reading_history (user_id, verse_id) VALUES ($1, $2)`,
          [READER_B, verseId]
        );
        const col = await tx.query<{ id: string }>(
          `INSERT INTO public.learning_collections (user_id, title)
           VALUES ($1, 'Personal Focus') RETURNING id`,
          [READER_B]
        );
        await tx.query(
          `INSERT INTO public.learning_collection_items (collection_id, verse_id)
           VALUES ($1, $2)`,
          [col.rows[0]!.id, verseId]
        );
        const fb = await tx.query<{ id: string }>(
          `INSERT INTO public.content_feedback (submitted_by, verse_id, category, message)
           VALUES ($1, $2, 'attribution', 'Please double-check edition year.') RETURNING id`,
          [READER_B, verseId]
        );
        return { colId: col.rows[0]!.id, feedbackId: fb.rows[0]!.id };
      }
    );

    // READER_C sees zero of READER_B's bookmarks, notes, history, collections, or feedback
    const cView = await asUser(testDb.db, READER_C, async (tx) => {
      const bm = await tx.query(`SELECT id FROM public.gita_bookmarks`);
      const notes = await tx.query(`SELECT id FROM public.gita_notes`);
      const hist = await tx.query(`SELECT id FROM public.gita_reading_history`);
      const cols = await tx.query(`SELECT id FROM public.learning_collections`);
      const items = await tx.query(
        `SELECT id FROM public.learning_collection_items`
      );
      const fb = await tx.query(`SELECT id FROM public.content_feedback`);
      return {
        bm: bm.rows,
        notes: notes.rows,
        hist: hist.rows,
        cols: cols.rows,
        items: items.rows,
        fb: fb.rows,
      };
    });

    expect(cView.bm).toEqual([]);
    expect(cView.notes).toEqual([]);
    expect(cView.hist).toEqual([]);
    expect(cView.cols).toEqual([]);
    expect(cView.items).toEqual([]);
    expect(cView.fb).toEqual([]);

    // READER_C cannot tamper with READER_B's collection or resolve READER_B's feedback
    await expect(
      asUser(testDb.db, READER_C, async (tx) => {
        await tx.query(
          `INSERT INTO public.learning_collection_items (collection_id, verse_id)
           VALUES ($1, $2)`,
          [colId, verseId]
        );
      })
    ).rejects.toThrow();

    await asUser(testDb.db, READER_C, async (tx) => {
      const u = await tx.query(
        `UPDATE public.content_feedback SET status = 'resolved' WHERE id = $1 RETURNING id`,
        [feedbackId]
      );
      expect(u.rows).toEqual([]);
    });

    // Even ADMIN_A cannot read READER_B's private notes or bookmarks
    const adminPrivateCheck = await asUser(testDb.db, ADMIN_A, async (tx) => {
      const notes = await tx.query(`SELECT id FROM public.gita_notes`);
      const bm = await tx.query(`SELECT id FROM public.gita_bookmarks`);
      const fb = await tx.query<{ resolved_by: string | null }>(
        `UPDATE public.content_feedback SET status = 'resolved', resolution_notes = 'Verified'
         WHERE id = $1 RETURNING resolved_by`,
        [feedbackId]
      );
      return { notes: notes.rows, bm: bm.rows, fb: fb.rows };
    });
    expect(adminPrivateCheck.notes).toEqual([]);
    expect(adminPrivateCheck.bm).toEqual([]);
    expect(adminPrivateCheck.fb[0]?.resolved_by).toBe(ADMIN_A);
  });

  it("computes 18-chapter slots without fake titles, prev/next navigation, deduplicated reading progress, and verified daily wisdom", () => {
    const emptySlots = buildChapterSlots([], {}, {});
    expect(emptySlots).toHaveLength(18);
    expect(emptySlots[0]).toMatchObject({
      chapterNumber: 1,
      isPopulated: false,
      chapter: null,
      publishedVerseCount: 0,
    });

    const nav = computePreviousNextVerse(
      [
        { chapter_number: 1, verse_number: 46, verse_ref: "1.46" },
        { chapter_number: 2, verse_number: 1, verse_ref: "2.1" },
        { chapter_number: 2, verse_number: 47, verse_ref: "2.47" },
      ],
      2,
      1
    );
    expect(nav.previous?.verse_ref).toBe("1.46");
    expect(nav.next?.verse_ref).toBe("2.47");

    const progress = computeReadingProgressSummary(
      [
        {
          chapter_number: 2,
          sanskrit_title: "स",
          transliteration_title: "T",
          english_title: "Test",
          summary: "Sum",
          verse_count: 10,
          theme_tags: [],
        },
      ],
      [
        { id: "v1", chapter_number: 2 },
        { id: "v2", chapter_number: 2 },
      ],
      new Set(["v1"])
    );
    expect(progress.totalPublishedVerses).toBe(2);
    expect(progress.totalReadVerses).toBe(1);
    expect(progress.overallProgressPct).toBe(10);

    // Unapproved or empty bundles must never fabricate daily wisdom
    expect(selectDailyWisdomVerse([], "2026-11-11")).toBeNull();

    const unapprovedSourceBundle: GitaVerseBundle = {
      verse: {
        id: "v-draft",
        chapter_number: 2,
        verse_number: 1,
        verse_ref: "2.1",
        sanskrit_devanagari: "स",
        transliteration_iast: "sa",
        word_by_word: null,
        source_id: "s-draft",
        review_status: "approved",
        reviewed_by: ADMIN_A,
        reviewed_at: "2026-11-11T00:00:00Z",
      },
      verseSource: {
        id: "s-draft",
        slug: "draft-src",
        title: "Draft Source",
        author_or_translator: "Author",
        tradition_or_lineage: null,
        license_name: "PD",
        license_url: null,
        attribution_text: "Attr",
        source_url: null,
        review_status: "pending_review",
        reviewed_by: null,
        reviewed_at: null,
      },
      translations: [],
      explanations: [],
    };
    expect(
      selectDailyWisdomVerse([unapprovedSourceBundle], "2026-11-11")
    ).toBeNull();
  });

  it("validates search inputs, explanation review attestation, and API auth/admin gates", async () => {
    expect(parseVerseReference("BG 2.47")).toEqual({ chapter: 2, verse: 47 });
    expect(parseVerseReference("chapter 6")).toEqual({ chapter: 6 });
    expect(sanitizeSearchText("karma,%_(or)")).toBe("karma or");

    expect(
      gitaSearchQuerySchema.safeParse({ verse: 47 }).success
    ).toBe(false);
    expect(
      gitaSearchQuerySchema.safeParse({ chapter: 19 }).success
    ).toBe(false);
    expect(
      explanationAdminSchema.safeParse({
        verseId: "11111111-1111-4111-8111-111111111111",
        explanationText: "AI draft explanation text.",
        isAiAssisted: true,
        humanReviewedConfirmed: false,
        reviewStatus: "approved",
      }).success
    ).toBe(false);

    vi.resetModules();
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
        },
      })),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));

    const { POST: bookmarkPost } = await import("@/app/api/gita/bookmarks/route");
    const bmRes = await bookmarkPost(
      new Request("http://localhost:3000/api/gita/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verseId: "11111111-1111-4111-8111-111111111111",
        }),
      })
    );
    expect(bmRes.status).toBe(401);

    const { GET: searchGet } = await import("@/app/api/gita/search/route");
    const badSearch = await searchGet(
      new Request("http://localhost:3000/api/gita/search?verse=47")
    );
    expect(badSearch.status).toBe(400);

    // Non-admin user gets 403 on admin routes
    vi.resetModules();
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: async () => ({
            data: { user: { id: READER_B, email: "reader-b@example.org" } },
            error: null,
          }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      })),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));

    const { POST: adminVersePost } = await import(
      "@/app/api/gita/admin/verses/route"
    );
    const nonAdminRes = await adminVersePost(
      new Request("http://localhost:3000/api/gita/admin/verses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterNumber: 2,
          verseNumber: 47,
          sanskritDevanagari: "संस्कृत",
          transliterationIast: "samskrta",
        }),
      })
    );
    expect(nonAdminRes.status).toBe(403);
  });
});

