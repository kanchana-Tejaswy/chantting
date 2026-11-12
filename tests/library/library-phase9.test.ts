import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  asAnon,
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";
import {
  computeRelatedResources,
  filterLibraryResources,
  parseSafeMarkdownBlocks,
  type LibraryResource,
} from "@/lib/library/domain";
import {
  libraryResourceAdminSchema,
  librarySearchQuerySchema,
  validateSafeExternalUrl,
  validateSafePosterUrl,
} from "@/lib/library/validation";

const ADMIN_A = "e1111111-1111-4111-8111-111111111111";
const READER_B = "e2222222-2222-4222-8222-222222222222";
const READER_C = "e3333333-3333-4333-8333-333333333333";

function makeSampleResource(
  overrides: Partial<LibraryResource>
): LibraryResource {
  return {
    id: "res-1",
    slug: "sample-resource",
    title: "Sample Guide",
    summary: "A careful devotional guide.",
    category: "chanting_guidance",
    resource_type: "chanting_guidance",
    body_markdown: "# Heading\n\nQuiet contemplation.",
    media_url: null,
    poster_url: null,
    external_url: null,
    source_id: null,
    author_or_speaker: "Editorial Sangha",
    language_code: "en",
    estimated_minutes: 8,
    license_name: "CC BY 4.0",
    copyright_notice: null,
    attribution_text: "SMARAN Editorial",
    is_original_content: true,
    is_archived: false,
    tags: ["japa", "consistency"],
    review_status: "approved",
    reviewed_by: ADMIN_A,
    reviewed_at: "2026-11-11T00:00:00Z",
    created_at: "2026-11-11T00:00:00Z",
    updated_at: "2026-11-11T00:00:00Z",
    source: null,
    ...overrides,
  };
}

describe("Phase 9 Spiritual Library — RLS, URL Safety, Publishing & Bookmarks", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: ADMIN_A,
      email: "lib-admin@example.org",
      name: "Admin Curator",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: READER_B,
      email: "lib-reader-b@example.org",
      name: "Gopi",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: READER_C,
      email: "lib-reader-c@example.org",
      name: "Sudama",
      timezone: "UTC",
    });

    await testDb.db.query(
      `INSERT INTO public.platform_admins (user_id, role)
       VALUES ($1, 'scripture_admin')`,
      [ADMIN_A]
    );
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("enforces admin-only library publishing, archiving, audit logging, and hides unpublished or unapproved-source entries", async () => {
    // Non-admin READER_B cannot create library resources directly in PostgreSQL
    await expect(
      asUser(testDb.db, READER_B, async (tx) => {
        await tx.query(
          `INSERT INTO public.library_resources
           (slug, title, summary, resource_type, category, body_markdown, review_status)
           VALUES ('forged-entry', 'Forged Entry', 'Should fail RLS.', 'article', 'devotional_article', 'Body', 'approved')`
        );
      })
    ).rejects.toThrow();

    // Admin creates a pending content source + draft article + external lecture
    const { sourceId, articleId, bookId } = await asUser(
      testDb.db,
      ADMIN_A,
      async (tx) => {
        const src = await tx.query<{ id: string }>(
          `INSERT INTO public.content_sources
           (slug, title, author_or_translator, license_name, attribution_text, review_status)
           VALUES ('bhakti-archive', 'Bhakti Public Archive', 'Test Editor', 'Public Domain', 'Public domain archive', 'pending_review')
           RETURNING id`
        );
        const art = await tx.query<{ id: string }>(
          `INSERT INTO public.library_resources
           (slug, title, summary, resource_type, category, source_id, external_url, license_name, attribution_text, review_status)
           VALUES ('quiet-japa-notes', 'Quiet Japa Guidance', 'Practical calm focus guidance.', 'article', 'chanting_guidance', $1, 'https://example.org/study-notes', 'CC BY 4.0', 'SMARAN Archive', 'pending_review')
           RETURNING id`,
          [src.rows[0]!.id]
        );
        const book = await tx.query<{ id: string }>(
          `INSERT INTO public.library_resources
           (slug, title, summary, resource_type, category, body_markdown, is_original_content, license_name, attribution_text, review_status)
           VALUES ('gita-study-primer', 'Gita Reading Companion', 'Introductory reading map.', 'book', 'gita_learning', '# Primer\n\nRead steadily.', TRUE, 'CC0 1.0', 'SMARAN', 'approved')
           RETURNING id`
        );
        return {
          sourceId: src.rows[0]!.id,
          articleId: art.rows[0]!.id,
          bookId: book.rows[0]!.id,
        };
      }
    );

    // Non-admin sees bookId (approved, no unapproved source), NEVER articleId (pending_review + unapproved source)
    const initialAnon = await asAnon(testDb.db, async (tx) => {
      return tx.query<{ id: string }>(
        `SELECT id FROM public.library_resources`
      );
    });
    expect(initialAnon.rows.map((r) => r.id)).toEqual([bookId]);

    // DB URL safety CHECK rejects javascript: links even for admins
    await expect(
      asUser(testDb.db, ADMIN_A, async (tx) => {
        await tx.query(
          `INSERT INTO public.library_resources
           (slug, title, summary, resource_type, category, external_url)
           VALUES ('xss-test', 'Unsafe URL', 'Should fail URL constraint.', 'external_link', 'external_resource', 'javascript:alert(1)')`
        );
      })
    ).rejects.toThrow();

    // Admin approves both source and article -> now articleId becomes visible publicly
    await asUser(testDb.db, ADMIN_A, async (tx) => {
      await tx.query(
        `UPDATE public.content_sources SET review_status = 'approved' WHERE id = $1`,
        [sourceId]
      );
      await tx.query(
        `UPDATE public.library_resources SET review_status = 'approved' WHERE id = $1`,
        [articleId]
      );
    });

    const publishedAnon = await asAnon(testDb.db, async (tx) => {
      return tx.query<{ id: string; reviewed_by: string | null }>(
        `SELECT id, reviewed_by FROM public.library_resources ORDER BY slug ASC`
      );
    });
    expect(publishedAnon.rows).toHaveLength(2);

    // Archiving hides articleId immediately without deleting history
    await asUser(testDb.db, ADMIN_A, async (tx) => {
      await tx.query(
        `UPDATE public.library_resources SET is_archived = TRUE WHERE id = $1`,
        [articleId]
      );
    });
    const afterArchive = await asAnon(testDb.db, async (tx) => {
      return tx.query<{ id: string }>(
        `SELECT id FROM public.library_resources`
      );
    });
    expect(afterArchive.rows.map((r) => r.id)).toEqual([bookId]);

    // Audit log recorded library_cms_* events
    const logs = await asUser(testDb.db, ADMIN_A, async (tx) => {
      return tx.query<{ action: string }>(
        `SELECT action FROM public.audit_logs WHERE target_table = 'library_resources'`
      );
    });
    expect(logs.rows.map((r) => r.action)).toContain("library_cms_insert");
    expect(logs.rows.map((r) => r.action)).toContain("library_cms_update");
  });

  it("isolates library bookmarks and recently viewed history per user via RLS", async () => {
    const bookRes = await asUser(testDb.db, READER_B, async (tx) => {
      return tx.query<{ id: string }>(
        `SELECT id FROM public.library_resources WHERE slug = 'gita-study-primer'`
      );
    });
    const resourceId = bookRes.rows[0]!.id;

    // READER_B bookmarks and logs view
    await asUser(testDb.db, READER_B, async (tx) => {
      await tx.query(
        `INSERT INTO public.library_bookmarks (user_id, resource_id) VALUES ($1, $2)`,
        [READER_B, resourceId]
      );
      await tx.query(
        `INSERT INTO public.library_view_history (user_id, resource_id) VALUES ($1, $2)`,
        [READER_B, resourceId]
      );
    });

    // READER_C cannot read or delete READER_B's bookmarks or history
    const cView = await asUser(testDb.db, READER_C, async (tx) => {
      const bm = await tx.query(`SELECT id FROM public.library_bookmarks`);
      const hist = await tx.query(`SELECT id FROM public.library_view_history`);
      return { bm: bm.rows, hist: hist.rows };
    });
    expect(cView.bm).toEqual([]);
    expect(cView.hist).toEqual([]);

    // Non-owner delete affects 0 rows
    const cDel = await asUser(testDb.db, READER_C, async (tx) => {
      return tx.query(
        `DELETE FROM public.library_bookmarks WHERE resource_id = $1 RETURNING id`,
        [resourceId]
      );
    });
    expect(cDel.rows).toEqual([]);

    // Owner READER_B still has bookmark
    const bStillHas = await asUser(testDb.db, READER_B, async (tx) => {
      return tx.query(`SELECT id FROM public.library_bookmarks`);
    });
    expect(bStillHas.rows).toHaveLength(1);
  });

  it("validates external URLs, admin publication requirements, filtering, related ranking, and safe markdown", () => {
    expect(validateSafeExternalUrl("https://archive.org/details/sample").ok).toBe(true);
    expect(validateSafeExternalUrl("javascript:alert(1)").ok).toBe(false);
    expect(validateSafeExternalUrl("data:text/html,hi").ok).toBe(false);
    expect(validateSafeExternalUrl("http://localhost:3000/test").ok).toBe(false);
    expect(validateSafeExternalUrl("http://127.0.0.1/admin").ok).toBe(false);
    expect(validateSafeExternalUrl("http://169.254.169.254/latest").ok).toBe(false);
    expect(validateSafeExternalUrl("https://user:secret@example.org").ok).toBe(false);
    expect(validateSafePosterUrl("/images/cover.png").ok).toBe(true);
    expect(validateSafePosterUrl("//evil.example/a.png").ok).toBe(false);

    // Reject external resource without externalUrl
    expect(
      libraryResourceAdminSchema.safeParse({
        slug: "ext-missing-url",
        title: "Missing Link",
        summary: "Should fail without URL.",
        category: "external_resource",
        resourceType: "external_link",
        reviewStatus: "pending_review",
      }).success
    ).toBe(false);

    // Reject publishing non-original item without attribution & license
    expect(
      libraryResourceAdminSchema.safeParse({
        slug: "unattributed-pub",
        title: "No Attribution",
        summary: "Cannot publish without provenance.",
        category: "devotional_article",
        resourceType: "article",
        bodyMarkdown: "Sample article.",
        isOriginalContent: false,
        reviewStatus: "approved",
      }).success
    ).toBe(false);

    expect(
      librarySearchQuerySchema.safeParse({ category: "invalid_cat" }).success
    ).toBe(false);

    const a = makeSampleResource({
      id: "r1",
      title: "Morning Japa Guide",
      category: "chanting_guidance",
      tags: ["japa", "focus"],
    });
    const b = makeSampleResource({
      id: "r2",
      slug: "gita-study-companion",
      title: "Gita Companion",
      category: "gita_learning",
      resource_type: "study_guide",
      tags: ["gita", "focus"],
    });
    const archived = makeSampleResource({
      id: "r3",
      slug: "old-item",
      is_archived: true,
    });
    const draft = makeSampleResource({
      id: "r4",
      slug: "draft-item",
      review_status: "draft",
    });

    const filtered = filterLibraryResources([a, b, archived, draft], {
      q: "companion",
      category: "gita_learning",
    });
    expect(filtered.map((x) => x.id)).toEqual(["r2"]);

    const savedOnly = filterLibraryResources([a, b], {
      savedOnly: true,
      bookmarkedIds: new Set(["r1"]),
    });
    expect(savedOnly.map((x) => x.id)).toEqual(["r1"]);

    const related = computeRelatedResources(a, [a, b, archived, draft], 3);
    expect(related.map((x) => x.id)).toEqual(["r2"]);

    const blocks = parseSafeMarkdownBlocks(
      "# Title\n\nParagraph text.\n\n> Quoted line\n\n- Bullet one"
    );
    expect(blocks.map((bl) => bl.kind)).toEqual([
      "heading",
      "paragraph",
      "quote",
      "list",
    ]);
  });

  it("enforces 401 and 403 boundaries on Library API routes", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
        },
      })),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));

    const { POST: bookmarkPost } = await import(
      "@/app/api/library/bookmarks/route"
    );
    const bmRes = await bookmarkPost(
      new Request("http://localhost:3000/api/library/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: "11111111-1111-4111-8111-111111111111",
        }),
      })
    );
    expect(bmRes.status).toBe(401);

    const { POST: histPost } = await import("@/app/api/library/history/route");
    const histRes = await histPost(
      new Request("http://localhost:3000/api/library/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: "11111111-1111-4111-8111-111111111111",
        }),
      })
    );
    expect(histRes.status).toBe(401);

    // Non-admin user gets 403 on admin resource endpoint
    vi.resetModules();
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: async () => ({
            data: { user: { id: READER_B, email: "lib-reader-b@example.org" } },
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

    const { POST: adminResPost } = await import(
      "@/app/api/library/admin/resources/route"
    );
    const forbidden = await adminResPost(
      new Request("http://localhost:3000/api/library/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "test-article",
          title: "Test Article",
          summary: "Summary text.",
          category: "devotional_article",
          resourceType: "article",
        }),
      })
    );
    expect(forbidden.status).toBe(403);
  });
});

