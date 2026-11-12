import { AppShell } from "@/components/layout/app-shell";

export default function AccountLoading() {
  return (
    <AppShell pageTitle="Account & Privacy">
      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
        <div className="h-10 w-72 animate-pulse rounded-[10px] bg-linen" />
        <div className="h-44 animate-pulse rounded-[16px] border border-sandalwood-border bg-paper" />
      </div>
    </AppShell>
  );
}

