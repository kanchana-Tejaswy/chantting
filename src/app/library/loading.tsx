import { AppShell } from "@/components/layout/app-shell";

export default function LibraryLoading() {
  return (
    <AppShell pageTitle="Spiritual Library">
      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
        <div className="h-10 w-64 animate-pulse rounded-[10px] bg-linen" />
        <div className="h-28 animate-pulse rounded-[16px] border border-sandalwood-border bg-paper" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="h-60 animate-pulse rounded-[16px] border border-sandalwood-border bg-paper"
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

