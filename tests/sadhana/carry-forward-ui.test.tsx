import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { CarryForwardPanel } from "@/components/sadhana/carry-forward-panel";
import {
  getPendingOptionalCarryOffer,
  getUnappliedPendingNotice,
  type CarryForwardLedgerEntry,
} from "@/lib/sadhana/carry-forward";

const SAMPLE_LEDGER: CarryForwardLedgerEntry[] = [
  {
    id: 1,
    from_date: "2026-11-10",
    to_date: "2026-11-11",
    policy_applied: "custom",
    source_remaining_balance: 14,
    carried_amount: 5,
    notes: null,
    created_at: "2026-11-11T00:00:00Z",
  },
];

describe("Phase 5 CarryForwardPanel UI & helpers", () => {
  it("computes unapplied pending overflow notice under custom cap", () => {
    const notice = getUnappliedPendingNotice({
      todayDate: "2026-11-11",
      ledger: SAMPLE_LEDGER,
    });
    expect(notice).toEqual({
      fromDate: "2026-11-10",
      sourceRemaining: 14,
      carriedAmount: 5,
      unappliedRounds: 9,
      policyApplied: "custom",
    });
  });

  it("renders optional carry-forward prompt and ledger table clearly", () => {
    const optionalLedger: CarryForwardLedgerEntry[] = [
      {
        id: 2,
        from_date: "2026-11-10",
        to_date: "2026-11-11",
        policy_applied: "optional",
        source_remaining_balance: 11,
        carried_amount: 0,
        notes: "Awaiting optional confirmation",
        created_at: "2026-11-11T00:00:00Z",
      },
    ];

    const offer = getPendingOptionalCarryOffer({
      todayDate: "2026-11-11",
      policyApplied: "optional",
      carryForwardAccepted: null,
      ledger: optionalLedger,
    });
    expect(offer).toEqual({
      sadhanaDate: "2026-11-11",
      fromDate: "2026-11-10",
      pendingRounds: 11,
    });

    const html = renderToStaticMarkup(
      <CarryForwardPanel
        todayDate="2026-11-11"
        currentPolicy="optional"
        todayPolicyApplied="optional"
        todayCompletedRounds={0}
        pendingOptionalOffer={offer}
        unappliedPendingNotice={null}
        ledger={optionalLedger}
      />
    );

    expect(html).toContain("Optional carry-forward awaiting your decision");
    expect(html).toContain("Carry forward (+11)");
    expect(html).toContain("Start fresh today");
    expect(html).toContain("2026-11-10 to 2026-11-11");
  });

  it("renders transparent overflow explanation when custom cap leaves pending rounds unapplied", () => {
    const notice = getUnappliedPendingNotice({
      todayDate: "2026-11-11",
      ledger: SAMPLE_LEDGER,
    });

    const html = renderToStaticMarkup(
      <CarryForwardPanel
        todayDate="2026-11-11"
        currentPolicy="custom"
        todayPolicyApplied="custom"
        currentMaxCarryCap={5}
        todayCompletedRounds={0}
        pendingOptionalOffer={null}
        unappliedPendingNotice={notice}
        ledger={SAMPLE_LEDGER}
      />
    );

    expect(html).toContain("14");
    expect(html).toContain("5");
    expect(html).toContain("9");
    expect(html).toContain("never erased");
    expect(html).toContain("(cap: 5 rounds)");
  });
});

