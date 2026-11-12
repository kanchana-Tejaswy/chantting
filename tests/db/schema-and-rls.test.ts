import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asAnon,
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "./helpers/pglite-bootstrap";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const USER_C = "33333333-3333-4333-8333-333333333333";

describe("Database schema invariants, indexes, and RLS boundaries", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: USER_A,
      email: "aradhya@example.org",
      name: "Aradhya",
      timezone: "Asia/Kolkata",
    });
    await seedTestUser(testDb.db, {
      id: USER_B,
      email: "bhakti@example.org",
      name: "Bhakti",
      timezone: "America/New_York",
    });
    await seedTestUser(testDb.db, {
      id: USER_C,
      email: "chaitanya@example.org",
      name: "Chaitanya",
      timezone: "UTC",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("enables RLS on every table in public schema", async () => {
    const res = await testDb.db.query<{ tablename: string }>(
      `SELECT tablename
       FROM pg_tables
       WHERE schemaname = 'public'
         AND rowsecurity = FALSE`
    );
    expect(res.rows).toEqual([]);
  });

  it("has zero unindexed foreign keys in public schema", async () => {
    const res = await testDb.db.query<{
      table_name: string;
      fk_column: string;
    }>(
      `SELECT
         conrelid::regclass::text AS table_name,
         a.attname AS fk_column
       FROM pg_constraint c
       JOIN pg_attribute a
         ON a.attrelid = c.conrelid
        AND a.attnum = ANY(c.conkey)
       WHERE c.contype = 'f'
         AND c.connamespace = 'public'::regnamespace
         AND NOT EXISTS (
           SELECT 1
           FROM pg_index i
           WHERE i.indrelid = c.conrelid
             AND a.attnum = ANY(i.indkey)
         )`
    );
    expect(res.rows).toEqual([]);
  });

  it("initializes conservative privacy defaults on signup", async () => {
    const res = await asUser(testDb.db, USER_A, async (tx) => {
      return tx.query<{
        daily_round_target: number;
        carry_forward_policy: string;
        public_profile_enabled: boolean;
        default_room_share_mode: string;
        share_streak_in_rooms: boolean;
      }>(
        `SELECT daily_round_target, carry_forward_policy, public_profile_enabled,
                default_room_share_mode, share_streak_in_rooms
         FROM public.user_preferences`
      );
    });

    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toEqual({
      daily_round_target: 16,
      carry_forward_policy: "automatic",
      public_profile_enabled: false,
      default_room_share_mode: "completion_only",
      share_streak_in_rooms: false,
    });
  });

  it("isolates personal profiles, preferences, and chanting history across users", async () => {
    await asUser(testDb.db, USER_A, async (tx) => {
      await tx.query(
        `SELECT public.record_chanting_round('manual', 'idem-user-a-round-1', NULL, NULL)`
      );
    });

    // User B cannot see User A's profile, daily_sadhana, or chanting_records
    const bView = await asUser(testDb.db, USER_B, async (tx) => {
      const profiles = await tx.query(`SELECT id FROM public.profiles`);
      const sadhana = await tx.query(`SELECT user_id FROM public.daily_sadhana`);
      const records = await tx.query(`SELECT user_id FROM public.chanting_records`);
      return { profiles: profiles.rows, sadhana: sadhana.rows, records: records.rows };
    });

    expect(bView.profiles).toEqual([{ id: USER_B }]);
    expect(bView.sadhana).toEqual([]);
    expect(bView.records).toEqual([]);
  });

  it("blocks direct client tampering on daily_sadhana, chanting_records, and rounds_completed", async () => {
    await expect(
      asUser(testDb.db, USER_A, async (tx) => {
        await tx.query(
          `UPDATE public.daily_sadhana SET completed_rounds = 999 WHERE user_id = $1`,
          [USER_A]
        );
      })
    ).rejects.toThrow();

    await expect(
      asUser(testDb.db, USER_A, async (tx) => {
        await tx.query(
          `INSERT INTO public.chanting_records
           (user_id, sadhana_date, method, idempotency_key, timezone_snapshot)
           VALUES ($1, CURRENT_DATE, 'manual', 'forged-key-1234', 'UTC')`,
          [USER_A]
        );
      })
    ).rejects.toThrow();

    // Create valid session first, then verify client cannot forge rounds_completed
    const sessionRes = await asUser(testDb.db, USER_A, async (tx) => {
      return tx.query<{ id: string }>(
        `INSERT INTO public.chanting_sessions (user_id, sadhana_date, method, client_session_key)
         VALUES ($1, CURRENT_DATE, 'japa_mala', 'sess-key-user-a-01')
         RETURNING id`,
        [USER_A]
      );
    });
    const sessionId = sessionRes.rows[0]!.id;

    await expect(
      asUser(testDb.db, USER_A, async (tx) => {
        await tx.query(
          `UPDATE public.chanting_sessions SET rounds_completed = 50 WHERE id = $1`,
          [sessionId]
        );
      })
    ).rejects.toThrow();

    // Updating bead count within 0..107 works, 108 violates check constraint
    await asUser(testDb.db, USER_A, async (tx) => {
      await tx.query(
        `UPDATE public.chanting_sessions SET current_bead_count = 107 WHERE id = $1`,
        [sessionId]
      );
    });

    await expect(
      asUser(testDb.db, USER_A, async (tx) => {
        await tx.query(
          `UPDATE public.chanting_sessions SET current_bead_count = 108 WHERE id = $1`,
          [sessionId]
        );
      })
    ).rejects.toThrow();
  });

  it("prevents room owners/admins from seeing member private records and blocks self-escalation", async () => {
    // User A creates a private room (trigger auto-enrolls A as owner)
    const roomRes = await asUser(testDb.db, USER_A, async (tx) => {
      return tx.query<{ id: string }>(
        `INSERT INTO public.rooms (slug, name, visibility, owner_id)
         VALUES ('vrindavan-morning', 'Vrindavan Morning Japa', 'private', $1)
         RETURNING id`,
        [USER_A]
      );
    });
    const roomId = roomRes.rows[0]!.id;

    // User B cannot join a private room directly without an invitation
    await expect(
      asUser(testDb.db, USER_B, async (tx) => {
        await tx.query(
          `INSERT INTO public.room_memberships (room_id, user_id, role)
           VALUES ($1, $2, 'member')`,
          [roomId, USER_B]
        );
      })
    ).rejects.toThrow();

    // User A creates an invitation token (storing only SHA-256 hash)
    const rawToken = "vrindavan-invite-token-2026-secret";
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await asUser(testDb.db, USER_A, async (tx) => {
      await tx.query(
        `INSERT INTO public.room_invitations (room_id, created_by, token_hash, max_uses)
         VALUES ($1, $2, $3, 1)`,
        [roomId, USER_A, tokenHash]
      );
    });

    // User B redeems the invitation
    const redeemRes = await asUser(testDb.db, USER_B, async (tx) => {
      return tx.query<{ result: { already_member: boolean; membership: { role: string } } }>(
        `SELECT public.redeem_room_invitation($1, 'completion_only') AS result`,
        [rawToken]
      );
    });
    expect(redeemRes.rows[0]!.result.already_member).toBe(false);
    expect(redeemRes.rows[0]!.result.membership.role).toBe("member");

    // Second user C cannot reuse a max_uses=1 token
    await expect(
      asUser(testDb.db, USER_C, async (tx) => {
        await tx.query(`SELECT public.redeem_room_invitation($1, NULL)`, [rawToken]);
      })
    ).rejects.toThrow(/maximum uses/);

    // User B records personal rounds
    await asUser(testDb.db, USER_B, async (tx) => {
      await tx.query(
        `SELECT public.record_chanting_round('manual', 'idem-user-b-private-1', NULL, NULL)`
      );
    });

    // Even as Room Owner, User A still sees ONLY User A's chanting records — never User B's!
    const aVisibleRecords = await asUser(testDb.db, USER_A, async (tx) => {
      return tx.query<{ user_id: string }>(`SELECT DISTINCT user_id FROM public.chanting_records`);
    });
    expect(aVisibleRecords.rows).toEqual([{ user_id: USER_A }]);

    // User B cannot self-escalate role in room_memberships
    await expect(
      asUser(testDb.db, USER_B, async (tx) => {
        await tx.query(
          `UPDATE public.room_memberships SET role = 'admin' WHERE room_id = $1 AND user_id = $2`,
          [roomId, USER_B]
        );
      })
    ).rejects.toThrow();

    // User A promotes User B via audited RPC, and cannot demote self (owner)
    await asUser(testDb.db, USER_A, async (tx) => {
      const updated = await tx.query<{ role: string }>(
        `SELECT (public.update_room_member_role($1, $2, 'admin')).role AS role`,
        [roomId, USER_B]
      );
      expect(updated.rows[0]!.role).toBe("admin");
    });

    await expect(
      asUser(testDb.db, USER_B, async (tx) => {
        await tx.query(
          `SELECT public.update_room_member_role($1, $2, 'member')`,
          [roomId, USER_A]
        );
      })
    ).rejects.toThrow(/owner/);

    // Verify audit log recorded the role update
    const logs = await asUser(testDb.db, USER_A, async (tx) => {
      return tx.query<{ action: string }>(
        `SELECT action FROM public.audit_logs WHERE room_id = $1 ORDER BY id ASC`,
        [roomId]
      );
    });
    expect(logs.rows.map((r) => r.action)).toContain("room_member_role_updated");
  });

  it("enforces Bhagavad Gita review status and AI human-review checks", async () => {
    // AI-assisted explanation cannot be approved without reviewed_by
    await testDb.db.query(
      `INSERT INTO public.gita_chapters
       (chapter_number, sanskrit_title, transliteration_title, english_title, summary, verse_count)
       VALUES (2, 'सांख्ययोगः', 'Sāṅkhya-yoga', 'Contents of the Gita Summarized', 'Summary', 72)`
    );

    const verseRes = await testDb.db.query<{ id: string }>(
      `INSERT INTO public.gita_verses
       (chapter_number, verse_number, sanskrit_devanagari, transliteration_iast, review_status)
       VALUES (2, 47, 'कर्मण्येवाधिकारस्ते...', 'karmaṇy evādhikāras te...', 'pending_review')
       RETURNING id`
    );
    const verseId = verseRes.rows[0]!.id;

    // Unapproved verse is invisible to anon and authenticated users
    const anonHidden = await asAnon(testDb.db, async (tx) => {
      return tx.query(`SELECT id FROM public.gita_verses WHERE id = $1`, [verseId]);
    });
    expect(anonHidden.rows).toEqual([]);

    // Cannot mark AI-assisted explanation approved without a human reviewer
    await expect(
      testDb.db.query(
        `INSERT INTO public.gita_explanations
         (verse_id, explanation_text, is_ai_assisted, review_status, reviewed_by)
         VALUES ($1, 'AI draft', TRUE, 'approved', NULL)`,
        [verseId]
      )
    ).rejects.toThrow(/gita_explanations_ai_human_review/);
  });
});

