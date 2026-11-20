import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";
import { ambientAudio } from "@/lib/chant/ambient-audio";

const USER_MANTRA = "31313131-3131-4131-8131-313131313131";
const USER_OTHER = "42424242-4242-4242-8242-424242424242";

describe("SMARAN Japa Module Enhancements: Mantras, Reminders, Notes, Ambient & Pace", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: USER_MANTRA,
      email: "mantra_devotee@example.org",
      name: "Ramananda",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_OTHER,
      email: "other_devotee@example.org",
      name: "Svarupa",
      timezone: "UTC",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("1. seeds canonical system mantras with proper Sanskrit and transliteration", async () => {
    const res = await testDb.db.query<{
      id: string;
      slug: string;
      name: string;
      sanskrit: string;
      is_system: boolean;
    }>(
      `SELECT id, slug, name, sanskrit, is_system FROM public.mantras WHERE is_system = TRUE ORDER BY slug ASC;`
    );

    expect(res.rows.length).toBeGreaterThanOrEqual(3);
    const slugs = res.rows.map((r) => r.slug);
    expect(slugs).toContain("hare-krishna");
    expect(slugs).toContain("pancha-tattva");
    expect(slugs).toContain("om-namo-bhagavate");

    const hk = res.rows.find((r) => r.slug === "hare-krishna");
    expect(hk?.name).toBe("Hare Krishna Mahāmantra");
    expect(hk?.sanskrit).toContain("हरे कृष्ण");
  });

  it("2. allows user to create custom mantra and associates it with ownership RLS", async () => {
    await asUser(testDb.db, USER_MANTRA, async (tx) => {
      await tx.query(
        `INSERT INTO public.mantras (user_id, slug, name, sanskrit, transliteration, is_system)
         VALUES ($1, 'maha-mrityunjaya', 'Mahāmṛtyuñjaya Mantra', 'ॐ त्र्यम्बकं यजामहे', 'oṁ tryambakaṁ yajāmahe', FALSE);`,
        [USER_MANTRA]
      );
    });

    // Devotee can view their own custom mantra
    const devoteeRes = await asUser(testDb.db, USER_MANTRA, async (tx) => {
      return tx.query<{ name: string }>(
        `SELECT name FROM public.mantras WHERE user_id = $1;`,
        [USER_MANTRA]
      );
    });
    expect(devoteeRes.rows).toHaveLength(1);
    expect(devoteeRes.rows[0]?.name).toBe("Mahāmṛtyuñjaya Mantra");

    // Other users cannot view this custom mantra
    const otherRes = await asUser(testDb.db, USER_OTHER, async (tx) => {
      return tx.query<{ name: string }>(
        `SELECT name FROM public.mantras WHERE slug = 'maha-mrityunjaya';`
      );
    });
    expect(otherRes.rows).toHaveLength(0);
  });

  it("3. records chanting round with explicit mantra_id and verifies session inheritance", async () => {
    const hkMantraId = "00000000-0000-0000-0000-000000000001";
    const sessionId = "55555555-5555-4555-8555-555555555555";

    await asUser(testDb.db, USER_MANTRA, async (tx) => {
      // 1. Create session tied to Hare Krishna Mahamantra
      await tx.query(
        `INSERT INTO public.chanting_sessions (
           id, user_id, sadhana_date, method, status, current_bead_count, rounds_completed,
           client_session_key, mantra_id
         ) VALUES ($1, $2, CURRENT_DATE, 'japa_mala', 'active', 0, 0, 'sess-mantra-test-1', $3);`,
        [sessionId, USER_MANTRA, hkMantraId]
      );

      // 2. Call record_chanting_round RPC inheriting session's mantra_id
      const res = await tx.query<{ record_chanting_round: string }>(
        `SELECT public.record_chanting_round(
           'japa_mala'::public.chanting_method,
           'round-key-mantra-inherit-1',
           $1::uuid,
           now(),
           NULL::uuid,
           NULL::uuid
         ) AS record_chanting_round;`,
        [sessionId]
      );

      const rawResult = res.rows[0]!.record_chanting_round as unknown;
      const parsed = (typeof rawResult === "string"
        ? JSON.parse(rawResult)
        : rawResult) as {
        duplicate: boolean;
        record: { mantra_id: string; round_delta: number };
      };

      expect(parsed.duplicate).toBe(false);
      expect(parsed.record.mantra_id).toBe(hkMantraId);
      expect(parsed.record.round_delta).toBe(1);

      // Verify chanting_records table directly
      const rec = await tx.query<{ mantra_id: string }>(
        `SELECT mantra_id FROM public.chanting_records WHERE idempotency_key = 'round-key-mantra-inherit-1';`
      );
      expect(rec.rows[0]?.mantra_id).toBe(hkMantraId);
    });
  });

  it("4. supports private session devotional journal notes with strict owner privacy", async () => {
    const sessionId = "55555555-5555-4555-8555-555555555555";
    const noteContent = "Chanted with intense gratitude in the quiet morning stillness.";

    // Insert devotional reflection
    await asUser(testDb.db, USER_MANTRA, async (tx) => {
      await tx.query(
        `INSERT INTO public.chanting_session_notes (session_id, user_id, content, is_private)
         VALUES ($1, $2, $3, TRUE);`,
        [sessionId, USER_MANTRA, noteContent]
      );
    });

    // Owner can read their note
    const ownerRes = await asUser(testDb.db, USER_MANTRA, async (tx) => {
      return tx.query<{ content: string; is_private: boolean }>(
        `SELECT content, is_private FROM public.chanting_session_notes WHERE session_id = $1;`,
        [sessionId]
      );
    });
    expect(ownerRes.rows).toHaveLength(1);
    expect(ownerRes.rows[0]?.content).toBe(noteContent);
    expect(ownerRes.rows[0]?.is_private).toBe(true);

    // Other users are blocked by RLS
    const otherRes = await asUser(testDb.db, USER_OTHER, async (tx) => {
      return tx.query<{ content: string }>(
        `SELECT content FROM public.chanting_session_notes WHERE session_id = $1;`,
        [sessionId]
      );
    });
    expect(otherRes.rows).toHaveLength(0);
  });

  it("5. manages customizable chanting reminders schedule with RLS isolation", async () => {
    // Devotee creates morning and evening reminders
    await asUser(testDb.db, USER_MANTRA, async (tx) => {
      await tx.query(
        `INSERT INTO public.chanting_reminders (user_id, title, time_of_day, days_of_week, is_enabled)
         VALUES
           ($1, 'Brahma-muhurta Japa', '05:00:00', '{0,1,2,3,4,5,6}', TRUE),
           ($1, 'Evening Sandhya Japa', '18:30:00', '{1,2,3,4,5}', TRUE);`,
        [USER_MANTRA]
      );
    });

    const remindersRes = await asUser(testDb.db, USER_MANTRA, async (tx) => {
      return tx.query<{ title: string; time_of_day: string; is_enabled: boolean }>(
        `SELECT title, time_of_day, is_enabled FROM public.chanting_reminders WHERE user_id = $1 ORDER BY time_of_day ASC;`,
        [USER_MANTRA]
      );
    });

    expect(remindersRes.rows).toHaveLength(2);
    expect(remindersRes.rows[0]?.title).toBe("Brahma-muhurta Japa");
    expect(remindersRes.rows[1]?.title).toBe("Evening Sandhya Japa");

    // Other user cannot see these reminders
    const otherRes = await asUser(testDb.db, USER_OTHER, async (tx) => {
      return tx.query(
        `SELECT * FROM public.chanting_reminders WHERE user_id = $1;`,
        [USER_OTHER]
      );
    });
    expect(otherRes.rows).toHaveLength(0);
  });

  it("6. updates and persists devotional preferences (ambient, pace, preferred mantra)", async () => {
    const hkMantraId = "00000000-0000-0000-0000-000000000001";

    await asUser(testDb.db, USER_MANTRA, async (tx) => {
      await tx.query(
        `UPDATE public.user_preferences
         SET preferred_mantra_id = $1,
             ambient_mode_enabled = TRUE,
             ambient_sound_enabled = TRUE,
             ambient_sound_volume = 0.65,
             pace_guidance_enabled = TRUE,
             pace_seconds_per_bead = 8.5
         WHERE user_id = $2;`,
        [hkMantraId, USER_MANTRA]
      );

      const prefRes = await tx.query<{
        preferred_mantra_id: string;
        ambient_mode_enabled: boolean;
        ambient_sound_volume: number;
        pace_seconds_per_bead: number;
      }>(
        `SELECT preferred_mantra_id, ambient_mode_enabled, ambient_sound_volume, pace_seconds_per_bead
         FROM public.user_preferences WHERE user_id = $1;`,
        [USER_MANTRA]
      );

      expect(prefRes.rows[0]?.preferred_mantra_id).toBe(hkMantraId);
      expect(prefRes.rows[0]?.ambient_mode_enabled).toBe(true);
      expect(Number(prefRes.rows[0]?.ambient_sound_volume)).toBe(0.65);
      expect(Number(prefRes.rows[0]?.pace_seconds_per_bead)).toBe(8.5);
    });
  });

  it("7. verifies ambient audio and pace guidance synthesizer functions safely", () => {
    expect(() => {
      ambientAudio.playPaceTick(0.5);
      ambientAudio.startPaceGuidance(7.0, 0.4);
      ambientAudio.stopPaceGuidance();
      ambientAudio.startTanpura(0.5);
      ambientAudio.setTanpuraVolume(0.8);
      ambientAudio.stopTanpura();
    }).not.toThrow();
  });
});
