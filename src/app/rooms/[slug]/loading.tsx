import { AppShell } from "@/components/layout/app-shell";

export default function RoomDetailLoading() {
  return (
    <AppShell pageTitle="Chanting Room">
      <div
        aria-busy="true"
        aria-label="Loading chanting room"
        className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8 sm:py-10"
      >
        <div className="h-16 animate-pulse rounded-[12px] bg-linen" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-44 animate-pulse rounded-[16px] border border-sandalwood-border bg-paper" />
          <div className="h-44 animate-pulse rounded-[16px] border border-sandalwood-border bg-paper" />
        </div>
        <div className="h-52 animate-pulse rounded-[16px] border border-sandalwood-border bg-paper" />
      </div>
    </AppShell>
  );
}

