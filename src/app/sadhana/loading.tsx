import { AppShell } from "@/components/layout/app-shell";

export default function SadhanaLoading() {
  return (
    <AppShell pageTitle="Personal Sādhana">
      <div
        aria-busy="true"
        aria-label="Loading personal Sadhana dashboard"
        className="mx-auto max-w-5xl space-y-8 px-5 py-8 sm:px-8 sm:py-10"
      >
        <div className="flex flex-col gap-4 border-b border-sandalwood-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="h-3.5 w-36 animate-pulse rounded bg-linen" />
            <div className="h-9 w-64 animate-pulse rounded bg-linen" />
          </div>
          <div className="flex gap-3">
            <div className="h-11 w-36 animate-pulse rounded-[10px] bg-linen" />
            <div className="h-12 w-40 animate-pulse rounded-[12px] bg-linen" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="h-80 animate-pulse rounded-[16px] border border-sandalwood-border bg-paper" />
          <div className="h-80 animate-pulse rounded-[16px] border border-sandalwood-border bg-paper" />
        </div>

        <div className="h-44 animate-pulse rounded-[16px] border border-sandalwood-border bg-linen" />
      </div>
    </AppShell>
  );
}

