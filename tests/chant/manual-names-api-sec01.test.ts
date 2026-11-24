import { describe, expect, it, vi } from "vitest";

describe("SEC-01: Manual Names Route Critical Security & Idempotency Audit", () => {
  it("returns HTTP 503 with Retry-After header when PostgREST schema-cache error occurs, and never calls recordAuthoritativeRound", async () => {
    vi.resetModules();

    const mockRecordAuthoritativeRound = vi.fn();
    const mockRecordAuthoritativeManualNames = vi.fn().mockRejectedValue(
      new Error("Could not find the function public.record_manual_names(p_client_recorded_at, p_idempotency_key) in the schema cache")
    );

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => ({
            data: { user: { id: "test-user-uuid" } },
            error: null,
          }),
        },
      }),
    }));

    vi.doMock("@/lib/chant/unified-engine", () => ({
      getAuthoritativeManualCounterState: vi.fn(),
      recordAuthoritativeManualNames: mockRecordAuthoritativeManualNames,
      recordAuthoritativeRound: mockRecordAuthoritativeRound,
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const { POST } = await import("@/app/api/chant/manual-names/route");

    const req = new Request("http://localhost:3000/api/chant/manual-names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        namesCount: 108,
        idempotencyKey: "test-idemp-key-12345",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("2");

    const json = (await res.json()) as { error: string; retryable: boolean };
    expect(json.retryable).toBe(true);
    expect(json.error).toContain("schema cache");

    // CRITICAL INVARIANT: The surrogate round recorder must NEVER be called
    expect(mockRecordAuthoritativeRound).not.toHaveBeenCalled();
    expect(mockRecordAuthoritativeManualNames).toHaveBeenCalledTimes(1);
  });

  it("preserves the original idempotency key on retry and returns existing committed state without creating a second entry", async () => {
    vi.resetModules();

    const idempotencyKey = "original-client-key-88888";
    let executionCount = 0;

    // Simulate scenario:
    // Call 1 executes and commits in database, but response timed out or connection reset.
    // Call 2 retries with the EXACT SAME idempotency key, returning the duplicate entry from DB.
    const committedMockResponse = {
      duplicate: false,
      entry: { id: "entry-1", names_count: 108, rounds_earned: 1 },
      counter_state: { cumulative_names: 108, cumulative_rounds: 1, current_remainder: 0 },
      rounds_earned: 1,
      current_remainder: 0,
      daily_sadhana: {
        id: "daily-1",
        sadhana_date: "2026-11-24",
        completed_rounds: 1,
        remaining_balance: 15,
        effective_daily_target: 16,
      },
      session: null,
      sankalpa: null,
    };

    const mockRecordAuthoritativeManualNames = vi.fn().mockImplementation(async (_client, _userId, input) => {
      executionCount++;
      expect(input.idempotencyKey).toBe(idempotencyKey);
      if (executionCount === 1) {
        return committedMockResponse;
      }
      // On retry with same key, database idempotency returns duplicate: true
      return {
        ...committedMockResponse,
        duplicate: true,
      };
    });

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => ({
            data: { user: { id: "test-user-uuid" } },
            error: null,
          }),
        },
        rpc: vi.fn(),
      }),
    }));

    vi.doMock("@/lib/chant/unified-engine", () => ({
      getAuthoritativeManualCounterState: vi.fn(),
      recordAuthoritativeManualNames: mockRecordAuthoritativeManualNames,
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const { POST } = await import("@/app/api/chant/manual-names/route");

    // First attempt
    const req1 = new Request("http://localhost:3000/api/chant/manual-names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        namesCount: 108,
        idempotencyKey,
      }),
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.duplicate).toBe(false);
    expect(json1.rounds_earned).toBe(1);

    // Second attempt (retry using the exact same idempotency key)
    const req2 = new Request("http://localhost:3000/api/chant/manual-names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        namesCount: 108,
        idempotencyKey,
      }),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.duplicate).toBe(true);
    expect(json2.entry.id).toBe("entry-1");
  });

  it("enforces authentication (401) and schema validation (400)", async () => {
    vi.resetModules();

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => ({
            data: { user: null },
            error: null,
          }),
        },
      }),
    }));

    vi.doMock("@/lib/chant/unified-engine", () => ({
      getAuthoritativeManualCounterState: vi.fn(),
      recordAuthoritativeManualNames: vi.fn(),
    }));

    const { POST } = await import("@/app/api/chant/manual-names/route");

    // Unauthenticated
    const unauthRes = await POST(
      new Request("http://localhost:3000/api/chant/manual-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namesCount: 108,
          idempotencyKey: "test-valid-key-1234",
        }),
      })
    );
    expect(unauthRes.status).toBe(401);

    // Authenticated but invalid body
    vi.resetModules();
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => ({
            data: { user: { id: "test-user-uuid" } },
            error: null,
          }),
        },
      }),
    }));
    vi.doMock("@/lib/chant/unified-engine", () => ({
      getAuthoritativeManualCounterState: vi.fn(),
      recordAuthoritativeManualNames: vi.fn(),
    }));

    const { POST: ValidatedPOST } = await import("@/app/api/chant/manual-names/route");

    const badPayloadRes = await ValidatedPOST(
      new Request("http://localhost:3000/api/chant/manual-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namesCount: -5, // Invalid negative count
          idempotencyKey: "short", // Invalid key length < 8
        }),
      })
    );
    expect(badPayloadRes.status).toBe(400);
  });
});
