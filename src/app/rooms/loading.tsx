import { AppShell } from "@/components/layout/app-shell";

export default function RoomsLoading() {
  return (
    <AppShell pageTitle="Satsang">
      <div
        aria-busy="true"
        aria-label="Loading chanting rooms"
        className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8 sm:py-10"
      >
        <div className="h-14 w-64 animate-pulse rounded-[12px] bg-linen" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-44 animate-pulse rounded-[16px] border border-sandalwood-border bg-paper" />
          <div className="h-44 animate-pulse rounded-[16px] border border-sandalwood-border bg-paper" />
        </div>
        <div className="h-56 animate-pulse rounded-[16px] border border-sandalwood-border bg-paper" />
      </div>
    </AppShell>
  );
}

