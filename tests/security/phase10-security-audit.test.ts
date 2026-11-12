import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";
import {
  consumeRateLimit,
  PRIVATE_NO_STORE_HEADERS,
  resetRateLimitStore,
} from "@/lib/security/rate-limit";

const USER_1 = "a1111111-1111-4111-8111-111111111111";
const USER_2 = "a2222222-2222-4222-8222-222222222222";
const USER_3 = "a3333333-3333-4333-8333-333333333333";

const mockAuthState = {
  user: { id: USER_1, email: "sadhaka1@example.org" } as {
    id: string;
    email: string;
  } | null,
  signOutCalls: [] as Array<{ scope?: string }>,
  rpcError: null as { message: string } | null,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: mockAuthState.user },
        error: mockAuthState.user ? null : { message: "No session" },
      }),
      signOut: async (opts?: { scope?: string }) => {
        mockAuthState.signOutCalls.push(opts ?? {});
        return { error: null };
      },
    },
    rpc: async () => {
      if (mockAuthState.rpcError) {
        return { data: null, error: mockAuthState.rpcError };
      }
      return {
        data: {
          already_member: false,
          membership: { room_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
        },
        error: null,
      };
    },
    from: (table: string) => {
      if (table === "rooms") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { slug: "vrindavan-circle" },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "m1",
                    room_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                    share_progress_mode: "private",
                    share_streak: false,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
        delete: () => ({
          eq: () => ({
            eq: () => ({
              neq: async () => ({ error: null }),
              eq: async () => ({ error: null }),
            }),
          }),
        }),
      };
    },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Phase 10 Security & Privacy Audit (DB + API Regression)", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: USER_1,
      email: "sadhaka1@example.org",
      name: "Radha",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_2,
      email: "sadhaka2@example.org",
      name: "Madhava",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_3,
      email: "sadhaka3@example.org",
      name: "Gopi",
      timezone: "UTC",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  beforeEach(() => {
    resetRateLimitStore();
    mockAuthState.user = { id: USER_1, email: "sadhaka1@example.org" };
    mockAuthState.signOutCalls = [];
    mockAuthState.rpcError = null;
  });

  it("purges & hides previously shared room activity immediately when a member revokes sharing or leaves", async () => {
    const roomIdRes = await asUser(testDb.db, USER_1, async (tx) => {
      return tx.query<{ id: string }>(
        `INSERT INTO public.rooms (name, slug, visibility, owner_id)
         VALUES ('Morning Sangha', 'morning-sangha', 'public', $1)
         RETURNING id`,
        [USER_1]
      );
    });
    const roomId = roomIdRes.rows[0]?.id;
    expect(roomId).toBeTruthy();
    if (!roomId) throw new Error("Room not created");

    // User 2 joins in full mode and shares progress rows
    await asUser(testDb.db, USER_2, async (tx) => {
      await tx.query(
        `INSERT INTO public.room_memberships (room_id, user_id, role, share_progress_mode)
         VALUES ($1, $2, 'member', 'full')`,
        [roomId, USER_2]
      );
      await tx.query(
        `INSERT INTO public.room_activity_feed (room_id, user_id, activity_date, activity_type, shared_rounds_count)
         VALUES
           ($1, $2, '2026-11-12', 'rounds_shared', 12),
           ($1, $2, '2026-11-12', 'daily_target_met', 16),
           ($1, $2, '2026-11-12', 'joined_room', NULL)`,
        [roomId, USER_2]
      );
    });

    // User 1 sees all 3 rows initially
    const initialFeed = await asUser(testDb.db, USER_1, async (tx) =>
      tx.query<{ activity_type: string; shared_rounds_count: number | null }>(
        `SELECT activity_type, shared_rounds_count FROM public.room_activity_feed
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, USER_2]
      )
    );
    expect(initialFeed.rows).toHaveLength(3);

    // User 2 downgrades to completion_only -> rounds_shared deleted and count cleared on daily_target_met
    await asUser(testDb.db, USER_2, async (tx) => {
      await tx.query(
        `UPDATE public.room_memberships SET share_progress_mode = 'completion_only'
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, USER_2]
      );
    });

    const completionFeed = await asUser(testDb.db, USER_1, async (tx) =>
      tx.query<{ activity_type: string; shared_rounds_count: number | null }>(
        `SELECT activity_type, shared_rounds_count FROM public.room_activity_feed
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, USER_2]
      )
    );
    expect(completionFeed.rows.map((r) => r.activity_type).sort()).toEqual([
      "daily_target_met",
      "joined_room",
    ]);
    expect(
      completionFeed.rows.every((r) => r.shared_rounds_count === null)
    ).toBe(true);

    // User 2 revokes sharing completely ('private') -> daily_target_met immediately purged
    await asUser(testDb.db, USER_2, async (tx) => {
      await tx.query(
        `UPDATE public.room_memberships SET share_progress_mode = 'private'
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, USER_2]
      );
    });

    const privateFeed = await asUser(testDb.db, USER_1, async (tx) =>
      tx.query<{ activity_type: string }>(
        `SELECT activity_type FROM public.room_activity_feed
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, USER_2]
      )
    );
    expect(privateFeed.rows.map((r) => r.activity_type)).toEqual(["joined_room"]);

    // User 2 leaves room -> all feed entries for User 2 deleted
    await asUser(testDb.db, USER_2, async (tx) => {
      await tx.query(
        `DELETE FROM public.room_memberships WHERE room_id = $1 AND user_id = $2`,
        [roomId, USER_2]
      );
    });
    const afterLeave = await asUser(testDb.db, USER_1, async (tx) =>
      tx.query<{ id: string }>(
        `SELECT id FROM public.room_activity_feed WHERE room_id = $1 AND user_id = $2`,
        [roomId, USER_2]
      )
    );
    expect(afterLeave.rows).toHaveLength(0);
  });

  it("blocks unsafe avatar/notification URLs, protects deactivation column, and hides deactivated accounts from member_directory", async () => {
    // Reject unsafe avatar_url
    await expect(
      asUser(testDb.db, USER_1, async (tx) => {
        await tx.query(
          `UPDATE public.profiles SET avatar_url = 'javascript:alert(1)' WHERE id = $1`,
          [USER_1]
        );
      })
    ).rejects.toThrow();

    // Prevent authenticated user from mutating is_deactivated directly
    await expect(
      asUser(testDb.db, USER_1, async (tx) => {
        await tx.query(
          `UPDATE public.profiles SET is_deactivated = TRUE WHERE id = $1`,
          [USER_1]
        );
      })
    ).rejects.toThrow();

    // Reject unsafe notification action_url (superadmin check constraint)
    await expect(
      testDb.db.query(
        `INSERT INTO public.notifications (user_id, type, title, body, action_url)
         VALUES ($1, 'system', 'Test', 'Test body', '//evil.example/phish')`,
        [USER_1]
      )
    ).rejects.toThrow();

    // Scrub USER_3 via deactivate_and_scrub_my_account & ensure hidden from directory
    await asUser(testDb.db, USER_3, async (tx) => {
      await tx.query(`SELECT public.deactivate_and_scrub_my_account('DELETE MY ACCOUNT')`);
    });

    const dirRows = await asUser(testDb.db, USER_1, async (tx) =>
      tx.query<{ user_id: string }>(
        `SELECT user_id FROM public.member_directory WHERE user_id = $1`,
        [USER_3]
      )
    );
    expect(dirRows.rows).toHaveLength(0);
  });

  it("enforces SHA-256 invite expiration, revocation, and max_uses boundaries", async () => {
    const roomRes = await asUser(testDb.db, USER_1, async (tx) =>
      tx.query<{ id: string }>(
        `INSERT INTO public.rooms (name, slug, visibility, owner_id)
         VALUES ('Private Sanctuary', 'private-sanctuary-audit', 'private', $1)
         RETURNING id`,
        [USER_1]
      )
    );
    const roomId = roomRes.rows[0]?.id;
    if (!roomId) throw new Error("Private room not created");

    const expiredToken = "expired-token-1234567890abcd";
    const expiredHash = crypto.createHash("sha256").update(expiredToken).digest("hex");
    await asUser(testDb.db, USER_1, async (tx) => {
      await tx.query(
        `INSERT INTO public.room_invitations (room_id, created_by, token_hash, expires_at)
         VALUES ($1, $2, $3, now() - interval '1 hour')`,
        [roomId, USER_1, expiredHash]
      );
    });

    await expect(
      asUser(testDb.db, USER_2, async (tx) =>
        tx.query(`SELECT public.redeem_room_invitation($1, 'private')`, [expiredToken])
      )
    ).rejects.toThrow(/expired/i);
  });

  it("enforces sliding-window rate limits with Retry-After headers on redeem, delete, and sessions API routes", async () => {
    for (let i = 0; i < 3; i++) {
      const ok = consumeRateLimit({
        bucket: "test-bucket",
        identifier: "u1",
        limit: 3,
        windowMs: 60_000,
        now: 10_000 + i,
      });
      expect(ok.allowed).toBe(true);
    }
    const blocked = consumeRateLimit({
      bucket: "test-bucket",
      identifier: "u1",
      limit: 3,
      windowMs: 60_000,
      now: 10_050,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    // /api/account/sessions authentication & scope check
    const { POST: sessionsPost } = await import("@/app/api/account/sessions/route");
    mockAuthState.user = null;
    const unauthRes = await sessionsPost(
      new NextRequest("http://localhost/api/account/sessions", {
        method: "POST",
        body: JSON.stringify({ scope: "global" }),
      })
    );
    expect(unauthRes.status).toBe(401);

    mockAuthState.user = { id: USER_1, email: "sadhaka1@example.org" };
    const globalOutRes = await sessionsPost(
      new NextRequest("http://localhost/api/account/sessions", {
        method: "POST",
        body: JSON.stringify({ scope: "global" }),
      })
    );
    expect(globalOutRes.status).toBe(200);
    expect(globalOutRes.headers.get("Cache-Control")).toBe(
      PRIVATE_NO_STORE_HEADERS["Cache-Control"]
    );
    expect(mockAuthState.signOutCalls).toEqual([{ scope: "global" }]);

    // /api/rooms/invitations/redeem rate limit hits 429 on 16th attempt
    const { POST: redeemPost } = await import(
      "@/app/api/rooms/invitations/redeem/route"
    );
    for (let i = 0; i < 15; i++) {
      const r = await redeemPost(
        new NextRequest("http://localhost/api/rooms/invitations/redeem", {
          method: "POST",
          body: JSON.stringify({ rawToken: "valid-length-token-123456" }),
        })
      );
      expect(r.status).toBe(200);
    }
    const blockedRedeem = await redeemPost(
      new NextRequest("http://localhost/api/rooms/invitations/redeem", {
        method: "POST",
        body: JSON.stringify({ rawToken: "valid-length-token-123456" }),
      })
    );
    expect(blockedRedeem.status).toBe(429);
    expect(Number(blockedRedeem.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(blockedRedeem.headers.get("Cache-Control")).toBe("no-store, private");

    // PATCH /api/rooms/memberships sets purgedActivity when revoking sharing
    const { PATCH: membershipsPatch } = await import(
      "@/app/api/rooms/memberships/route"
    );
    const revokeRes = await membershipsPatch(
      new NextRequest("http://localhost/api/rooms/memberships", {
        method: "PATCH",
        body: JSON.stringify({
          roomId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          shareProgressMode: "private",
        }),
      })
    );
    expect(revokeRes.status).toBe(200);
    const revokeJson = (await revokeRes.json()) as { purgedActivity?: boolean };
    expect(revokeJson.purgedActivity).toBe(true);
  });
});
