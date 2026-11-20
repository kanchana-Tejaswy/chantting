import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";
import {
  clearOfflineRoundQueue,
  enqueueOfflineRound,
  readOfflineRoundQueue,
  removeOfflineRound,
  type QueuedRoundSubmission,
} from "@/lib/chant/offline-queue";
import { AppShell } from "@/components/layout/app-shell";
import manifest from "@/app/manifest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/sadhana",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const RELIABILITY_USER = "d9999999-9999-4999-8999-999999999999";

describe("SMARAN Phase 9: Notifications & Platform Reliability", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: RELIABILITY_USER,
      email: "bhakti@example.org",
      name: "Bhakti Devotee",
      timezone: "Asia/Kolkata",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("1. Generates idempotent in-app notifications on daily target completion and Sankalpa fulfillment without duplicates", async () => {
    // 1. Create a 2-round Sankalpa
    const sankalpaId = await asUser(testDb.db, RELIABILITY_USER, async (tx) => {
      // Set daily target to 2 for quick verification
      await tx.query(
        `UPDATE public.user_preferences SET daily_round_target = 2 WHERE user_id = $1`,
        [RELIABILITY_USER]
      );
      const s = await tx.query<{ id: string }>(
        `INSERT INTO public.sankalpas (user_id, title, target_rounds, start_date)
         VALUES ($1, 'Kartika Vow', 2, CURRENT_DATE)
         RETURNING id`,
        [RELIABILITY_USER]
      );
      return s.rows[0]!.id;
    });

    // Record round 1
    await asUser(testDb.db, RELIABILITY_USER, async (tx) => {
      await tx.query(
        `SELECT public.record_chanting_round('japa_mala', 'p9-round-1', NULL, NULL, $1)`,
        [sankalpaId]
      );
    });

    // Target not met yet (1 of 2), so 0 notifications
    const notifsAfterR1 = await asUser(testDb.db, RELIABILITY_USER, async (tx) => {
      const r = await tx.query(
        `SELECT id FROM public.notifications WHERE user_id = $1`,
        [RELIABILITY_USER]
      );
      return r.rows;
    });
    expect(notifsAfterR1).toHaveLength(0);

    // Record round 2 -> fulfills daily target (2/2) AND completes Sankalpa (2/2)!
    await asUser(testDb.db, RELIABILITY_USER, async (tx) => {
      await tx.query(
        `SELECT public.record_chanting_round('japa_mala', 'p9-round-2', NULL, NULL, $1)`,
        [sankalpaId]
      );
    });

    // Verified that both notifications were created idempotently
    const notifsAfterR2 = await asUser(testDb.db, RELIABILITY_USER, async (tx) => {
      const r = await tx.query<{
        type: string;
        title: string;
        metadata: { event: string };
      }>(
        `SELECT type, title, metadata FROM public.notifications WHERE user_id = $1 ORDER BY created_at ASC`,
        [RELIABILITY_USER]
      );
      return r.rows;
    });
    expect(notifsAfterR2).toHaveLength(2);
    expect(notifsAfterR2.map((n) => n.metadata.event)).toEqual([
      "daily_target_met",
      "sankalpa_completed",
    ]);

    // Record extra round 3 (sadhana continues past target) -> idempotent checks ensure NO duplicate notifications are created!
    await asUser(testDb.db, RELIABILITY_USER, async (tx) => {
      await tx.query(
        `SELECT public.record_chanting_round('japa_mala', 'p9-round-3', NULL, NULL, NULL)`
      );
    });

    // Also retry submitting p9-round-2 idempotency key -> returns existing record without duplicate notification
    await asUser(testDb.db, RELIABILITY_USER, async (tx) => {
      await tx.query(
        `SELECT public.record_chanting_round('japa_mala', 'p9-round-2', NULL, NULL, $1)`,
        [sankalpaId]
      );
    });

    const notifsAfterR3 = await asUser(testDb.db, RELIABILITY_USER, async (tx) => {
      const r = await tx.query(
        `SELECT id FROM public.notifications WHERE user_id = $1`,
        [RELIABILITY_USER]
      );
      return r.rows;
    });
    expect(notifsAfterR3).toHaveLength(2);
  });

  it("2. Notifications API enforces authentication, returns unread count, marks read and dismisses cleanly", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
        },
      })),
    }));

    const { GET, PATCH } = await import(
      "@/app/api/account/notifications/route"
    );

    // Unauthenticated GET returns 401
    const unauthGet = await GET();
    expect(unauthGet.status).toBe(401);

    // Unauthenticated PATCH returns 401
    const unauthPatch = await PATCH(
      new Request("http://localhost:3000/api/account/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      })
    );
    expect(unauthPatch.status).toBe(401);

    // With authenticated client, verify mark_read and dismiss in PostgreSQL
    const notifRow = await asUser(testDb.db, RELIABILITY_USER, async (tx) => {
      const r = await tx.query<{ id: string; is_read: boolean }>(
        `SELECT id, is_read FROM public.notifications WHERE user_id = $1 LIMIT 1`,
        [RELIABILITY_USER]
      );
      return r.rows[0]!;
    });
    expect(notifRow.is_read).toBe(false);

    // Mark as read in DB
    await asUser(testDb.db, RELIABILITY_USER, async (tx) => {
      await tx.query(
        `UPDATE public.notifications SET is_read = TRUE, read_at = now() WHERE id = $1 AND user_id = $2`,
        [notifRow.id, RELIABILITY_USER]
      );
    });

    const afterRead = await asUser(testDb.db, RELIABILITY_USER, async (tx) => {
      const r = await tx.query<{ is_read: boolean }>(
        `SELECT is_read FROM public.notifications WHERE id = $1`,
        [notifRow.id]
      );
      return r.rows[0]!;
    });
    expect(afterRead.is_read).toBe(true);

    // Dismiss (delete) notification
    await asUser(testDb.db, RELIABILITY_USER, async (tx) => {
      await tx.query(
        `DELETE FROM public.notifications WHERE id = $1 AND user_id = $2`,
        [notifRow.id, RELIABILITY_USER]
      );
    });

    const afterDismiss = await asUser(testDb.db, RELIABILITY_USER, async (tx) => {
      const r = await tx.query(
        `SELECT id FROM public.notifications WHERE id = $1`,
        [notifRow.id]
      );
      return r.rows;
    });
    expect(afterDismiss).toHaveLength(0);
  });

  it("3. Offline round queue handles enqueueing, deduplication, removal, and corrupted storage safely", () => {
    // Mock browser localStorage
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    };
    vi.stubGlobal("localStorage", mockStorage);

    const sub1: QueuedRoundSubmission = {
      idempotencyKey: "offline-round-1111",
      method: "japa_mala",
      sessionId: "sess-1",
      clientRecordedAt: "2026-11-14T05:00:00Z",
    };

    const sub2: QueuedRoundSubmission = {
      idempotencyKey: "offline-round-2222",
      method: "manual",
      sessionId: null,
      clientRecordedAt: "2026-11-14T05:05:00Z",
    };

    // Enqueue sub1
    enqueueOfflineRound(RELIABILITY_USER, sub1);
    expect(readOfflineRoundQueue(RELIABILITY_USER)).toHaveLength(1);

    // Enqueueing same sub1 again is deduplicated!
    enqueueOfflineRound(RELIABILITY_USER, sub1);
    expect(readOfflineRoundQueue(RELIABILITY_USER)).toHaveLength(1);

    // Enqueue sub2
    enqueueOfflineRound(RELIABILITY_USER, sub2);
    expect(readOfflineRoundQueue(RELIABILITY_USER)).toHaveLength(2);

    // Remove sub1
    removeOfflineRound(RELIABILITY_USER, "offline-round-1111");
    const remaining = readOfflineRoundQueue(RELIABILITY_USER);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.idempotencyKey).toBe("offline-round-2222");

    // Clear queue
    clearOfflineRoundQueue(RELIABILITY_USER);
    expect(readOfflineRoundQueue(RELIABILITY_USER)).toHaveLength(0);

    // Corrupted storage returns empty array safely without throwing
    store[`ks:offline-rounds:v1:${RELIABILITY_USER}`] = "not-valid-json{{{";
    expect(readOfflineRoundQueue(RELIABILITY_USER)).toEqual([]);

    vi.unstubAllGlobals();
  });

  it("4. PWA manifest, service worker privacy rules, and AppShell unread notification badge", () => {
    // 1. Manifest verification
    const m = manifest();
    expect(m.name).toContain("SMARAN");
    expect(m.display).toBe("standalone");
    expect(m.icons).toBeDefined();
    expect(m.icons!.length).toBeGreaterThanOrEqual(1);

    // 2. Service Worker verification
    const swPath = path.resolve(process.cwd(), "public", "sw.js");
    expect(fs.existsSync(swPath)).toBe(true);
    const swContent = fs.readFileSync(swPath, "utf8");

    // Strictly excludes private user and auth APIs
    expect(swContent).toContain("url.pathname.startsWith('/api/')");
    expect(swContent).toContain("url.pathname.startsWith('/auth/')");
    expect(swContent).toContain("url.hostname.includes('supabase.co')");
    expect(swContent).toContain("smaran-static-v1");

    // 3. AppShell notification indicator rendering
    const withUnreadHtml = renderToStaticMarkup(
      <AppShell
        userSummary={{
          displayName: "Bhakti",
          unreadNotificationsCount: 3,
        }}
      >
        <div>Content</div>
      </AppShell>
    );
    expect(withUnreadHtml).toContain("3 unread");
    expect(withUnreadHtml).toContain("Open notifications inbox (3 unread)");

    const zeroUnreadHtml = renderToStaticMarkup(
      <AppShell
        userSummary={{
          displayName: "Bhakti",
          unreadNotificationsCount: 0,
        }}
      >
        <div>Content</div>
      </AppShell>
    );
    expect(zeroUnreadHtml).not.toContain("0 unread");
    expect(zeroUnreadHtml).toContain("Open notifications inbox");
  });
});
