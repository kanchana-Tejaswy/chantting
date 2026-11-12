import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { JapaMalaWheel } from "@/components/chant/japa-mala-wheel";
import { ChantingWorkspace } from "@/components/chant/chanting-workspace";
import {
  enqueueOfflineRound,
  readDraftBeadState,
  readOfflineRoundQueue,
  removeOfflineRound,
  writeDraftBeadState,
} from "@/lib/chant/offline-queue";
import type { ChantWorkspacePayload } from "@/lib/chant/types";

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe("Phase 4 Digital Japa Mala, Manual Counter UI & Offline Queue", () => {
  beforeEach(() => {
    const storage = createMemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
  });

  it("renders all 108 beads plus Sumaru bead and shows current bead progress", () => {
    const html = renderToStaticMarkup(
      <JapaMalaWheel
        currentBead={37}
        isPaused={false}
        isBusy={false}
        onAdvanceBead={() => {}}
        sessionRounds={2}
      />
    );

    expect(html).toContain("37");
    expect(html).toContain("/108");
    expect(html).toContain("71 remaining");
    expect(html).toContain("Session rounds: 2");
    expect(html).toContain("Advance to bead 38 of 108");
    expect(html).toContain("ks-tulsi-");
    expect(html).toContain("ks-gold-");
    expect(html).toContain("ks-sandal-");
    expect(html).toContain("ks-sumaru-");
    expect(html).toContain("stroke-dashoffset");
    expect(html).toContain("animate-ks-bead-halo");
    expect(html).toContain("animate-ks-center-ripple");
    expect(html).toContain("motion-reduce:hidden");

    // 108 chanting beads + Sumaru rings + active halos + specular highlights >= 109 <circle> tags
    const circleCount = (html.match(/<circle/g) ?? []).length;
    expect(circleCount).toBeGreaterThanOrEqual(109);
  });

  it("disables bead taps and shows saved state when Japa Mala is paused", () => {
    const html = renderToStaticMarkup(
      <JapaMalaWheel
        currentBead={54}
        isPaused={true}
        isBusy={false}
        onAdvanceBead={() => {}}
        sessionRounds={1}
      />
    );
    expect(html).toContain("Session Paused");
    expect(html).toContain("54/108 beads saved");
    expect(html).toContain("disabled");
  });

  it("renders ChantingWorkspace with recovered session, manual/japa switcher, and daily progress", () => {
    const payload: ChantWorkspacePayload = {
      userId: "11111111-1111-4111-8111-111111111111",
      userEmail: "devotee@example.org",
      displayName: "Radhika",
      timezone: "Asia/Kolkata",
      preferences: {
        dailyRoundTarget: 16,
        defaultCountingMethod: "japa_mala",
        tactileFeedbackEnabled: true,
        soundFeedbackEnabled: false,
        carryForwardPolicy: "automatic",
      },
      dailySadhana: {
        id: "22222222-2222-4222-8222-222222222222",
        user_id: "11111111-1111-4111-8111-111111111111",
        sadhana_date: "2026-11-11",
        timezone_snapshot: "Asia/Kolkata",
        original_daily_target: 16,
        previous_pending_balance: 2,
        effective_daily_target: 18,
        completed_rounds: 6,
        remaining_balance: 12,
        extra_rounds: 0,
        policy_applied: "automatic",
        carry_forward_accepted: true,
        has_activity: true,
      },
      pendingOptionalOffer: null,
      recoverableSession: {
        id: "33333333-3333-4333-8333-333333333333",
        user_id: "11111111-1111-4111-8111-111111111111",
        sadhana_date: "2026-11-11",
        method: "japa_mala",
        status: "paused",
        current_bead_count: 37,
        rounds_completed: 2,
        client_session_key: "sess-key-0001",
        started_at: "2026-11-11T05:00:00Z",
        last_activity_at: "2026-11-11T05:25:00Z",
        paused_at: "2026-11-11T05:25:00Z",
        ended_at: null,
      },
      todaySessions: [],
      todayRecords: [],
    };

    const html = renderToStaticMarkup(<ChantingWorkspace initialData={payload} />);
    expect(html).toContain("Recovered paused Japa Mala session.");
    expect(html).toContain(">Japa<");
    expect(html).toContain(">Lakshya<");
    expect(html).toContain("Digital Japa Mala");
    expect(html).toContain("Manual Counter");
    expect(html).toContain("Resume session");
    expect(html).toContain("37/108 beads saved");
    expect(html).toContain("Partial bead progress does not count");
    expect(html).toContain("108 beads 1 by 1");
    expect(html).toContain("Quarter 1");
    expect(html).toContain("Halfway");
    expect(html).toContain("Next bead (38)");

    // Active session with prior manual rounds: wheel and top bar must agree on today's total (6)
    const unifiedHtml = renderToStaticMarkup(
      <ChantingWorkspace
        initialData={{
          ...payload,
          recoverableSession: {
            ...payload.recoverableSession!,
            status: "active",
            paused_at: null,
          },
        }}
      />
    );
    expect(unifiedHtml).toContain("6 / 18");
    expect(unifiedHtml).toContain("Rounds today: 6");
    expect(unifiedHtml).not.toContain(">Offline<");
    expect(unifiedHtml).toContain("Duration 25:00");

    // Manual Counter does not render session controls or session duration
    const manualHtml = renderToStaticMarkup(
      <ChantingWorkspace
        initialData={{
          ...payload,
          preferences: {
            ...payload.preferences,
            defaultCountingMethod: "manual",
          },
          recoverableSession: null,
        }}
      />
    );
    expect(manualHtml).toContain("Add 1 completed round");
    expect(manualHtml).not.toContain("Start new session");
    expect(manualHtml).not.toContain("Pause session");
    expect(manualHtml).not.toContain("Finish session");
    expect(manualHtml).not.toContain("Duration 00:00");
  });

  it("deduplicates offline round queue submissions and preserves partial bead drafts", () => {
    const uid = "11111111-1111-4111-8111-111111111111";

    enqueueOfflineRound(uid, {
      idempotencyKey: "round-offline-1234",
      method: "manual",
      sessionId: null,
      clientRecordedAt: "2026-11-11T05:00:00.000Z",
    });
    enqueueOfflineRound(uid, {
      idempotencyKey: "round-offline-1234", // duplicate key ignored
      method: "manual",
      sessionId: null,
      clientRecordedAt: "2026-11-11T05:00:00.000Z",
    });

    expect(readOfflineRoundQueue(uid)).toHaveLength(1);
    removeOfflineRound(uid, "round-offline-1234");
    expect(readOfflineRoundQueue(uid)).toHaveLength(0);

    writeDraftBeadState(uid, {
      sessionId: "sess-1",
      currentBeadCount: 84,
      updatedAt: "2026-11-11T05:10:00.000Z",
    });
    expect(readDraftBeadState(uid)?.currentBeadCount).toBe(84);
  });
});

