import { AppShell } from "@/components/layout/app-shell";

export default function ChantLoading() {
  return (
    <AppShell pageTitle="Chanting Practice">
      <div
        aria-busy="true"
        aria-label="Loading chanting workspace"
        className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-8 sm:py-8"
      >
        <div className="mx-auto h-12 max-w-md animate-pulse rounded-[12px] bg-linen" />
        <div className="h-28 animate-pulse rounded-[16px] border border-sandalwood-border bg-paper" />
        <div className="h-[460px] animate-pulse rounded-[16px] border border-sandalwood-border bg-paper" />
      </div>
    </AppShell>
  );
}

