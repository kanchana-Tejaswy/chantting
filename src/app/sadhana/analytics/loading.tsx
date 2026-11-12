import { AppShell } from "@/components/layout/app-shell";

export default function AnalyticsLoading() {
  return (
    <AppShell pageTitle="Consistency & Analytics">
      <div
        aria-busy="true"
        aria-label="Loading consistency heatmap and analytics"
        className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-10"
      >
        <div className="h-16 animate-pulse rounded-[12px] bg-linen" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-[16px] border border-sandalwood-border bg-paper"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-[16px] border border-sandalwood-border bg-paper" />
      </div>
    </AppShell>
  );
}

