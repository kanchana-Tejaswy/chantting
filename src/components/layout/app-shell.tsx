"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  Compass,
  Flame,
  Library,
  LogOut,
  Palette,
  User,
  Users,
} from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { cn } from "@/lib/cn";
import { LotusEmblem } from "@/components/sacred/ornaments";

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  phaseNote?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Sanctum", shortLabel: "Sanctum", icon: Compass },
  {
    href: "/sadhana",
    label: "Sādhana",
    shortLabel: "Sādhana",
    icon: Flame,
  },
  {
    href: "/gita",
    label: "Bhagavad Gītā",
    shortLabel: "Gītā",
    icon: BookOpen,
  },
  {
    href: "/library",
    label: "Spiritual Library",
    shortLabel: "Library",
    icon: Library,
  },
  {
    href: "/rooms",
    label: "Chanting Rooms",
    shortLabel: "Rooms",
    icon: Users,
  },
];

export interface AppShellUserSummary {
  displayName: string;
  email?: string | null;
}

export interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
  userSummary?: AppShellUserSummary | null;
  reducedMotion?: boolean;
}

export function AppShell({
  children,
  pageTitle,
  userSummary,
  reducedMotion = false,
}: AppShellProps) {
  const pathname = usePathname();

  return (
    <div
      data-reduced-motion={reducedMotion ? "true" : undefined}
      className="min-h-dvh bg-ivory text-ink"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[10px] focus:bg-peacock-deep focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-ink-on-dark"
      >
        Skip to main content
      </a>

      {/* Desktop Left Navigation Rail */}
      <aside
        aria-label="Primary navigation"
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sandalwood-border bg-paper lg:flex"
      >
        <div className="flex items-center gap-3 border-b border-sandalwood-border px-5 py-5">
          <div className="flex size-10 items-center justify-center rounded-[12px] bg-krishna-midnight text-gold-antique">
            <LotusEmblem size={22} />
          </div>
          <div className="min-w-0">
            <Link
              href="/"
              className="block truncate font-display text-lg font-semibold tracking-wide text-ink"
            >
              KRISHNA SĀDHANA
            </Link>
            <p className="text-xs text-ink-muted">Non-profit devotional space</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center justify-between rounded-[10px] px-3 py-2 text-sm transition-colors duration-150 ease-out",
                  isActive
                    ? "bg-peacock-deep font-medium text-ink-on-dark"
                    : "text-ink hover:bg-linen"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Icon
                    className="size-4 shrink-0"
                    strokeWidth={isActive ? 2 : 1.5}
                    aria-hidden={true}
                  />
                  <span>{item.label}</span>
                </span>
                {item.phaseNote && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] tabular-nums",
                      isActive
                        ? "bg-krishna-elevated text-ink-muted-dark"
                        : "bg-linen text-ink-muted"
                    )}
                  >
                    {item.phaseNote}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sandalwood-border px-5 py-4 text-xs leading-relaxed text-ink-muted">
          <div className="mb-3 space-y-1">
            {userSummary && (
              <Link
                href="/account"
                className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-linen"
              >
                <User className="size-3.5" aria-hidden={true} />
                <span>Account, Privacy &amp; Inbox</span>
              </Link>
            )}
            <Link
              href="/design-system"
              className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-linen hover:text-ink"
            >
              <Palette className="size-3.5" aria-hidden={true} />
              <span>Design System</span>
            </Link>
          </div>
          <p className="font-medium text-ink">Accessible to all</p>
          <p className="mt-1">
            No paid tiers, no spiritual rankings, private records by default.
          </p>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-h-dvh flex-col pb-20 lg:pb-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between border-b border-sandalwood-border bg-ivory/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 lg:hidden">
            <span className="flex size-8 items-center justify-center rounded-[8px] bg-krishna-midnight text-gold-antique">
              <LotusEmblem size={18} />
            </span>
            <Link
              href="/"
              className="font-display text-base font-semibold text-ink"
            >
              KRISHNA SĀDHANA
            </Link>
          </div>

          <p className="hidden text-sm font-medium text-ink-muted lg:block">
            {pageTitle ?? "KRISHNA SĀDHANA"}
          </p>

          <div className="flex items-center gap-2">
            {userSummary ? (
              <>
                <Link
                  href="/account?tab=notifications"
                  aria-label="Open notifications inbox"
                  className="inline-flex size-9 items-center justify-center rounded-full border border-sandalwood-border bg-paper text-ink-muted transition-colors duration-150 hover:bg-linen hover:text-ink"
                >
                  <Bell className="size-4" strokeWidth={1.75} aria-hidden={true} />
                </Link>
                <Link
                  href="/account"
                  className="inline-flex min-h-9 max-w-44 items-center gap-1.5 rounded-full border border-sandalwood-border bg-paper px-3 text-xs font-medium text-ink transition-colors duration-150 hover:bg-linen"
                >
                  <User className="size-3.5 shrink-0 text-peacock-ink" aria-hidden={true} />
                  <span className="truncate">{userSummary.displayName}</span>
                </Link>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-sandalwood-border bg-paper px-3 text-xs font-medium text-ink transition-colors duration-150 hover:bg-linen"
                  >
                    <LogOut
                      className="size-3.5"
                      strokeWidth={1.75}
                      aria-hidden={true}
                    />
                    <span>Sign out</span>
                  </button>
                </form>
              </>
            ) : !pathname.startsWith("/auth") ? (
              <Link
                href="/auth"
                className="inline-flex min-h-9 items-center rounded-full border border-sandalwood-border bg-paper px-3.5 text-xs font-medium text-ink transition-colors duration-150 hover:bg-linen"
              >
                Sign in
              </Link>
            ) : null}
          </div>
        </header>

        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (<= 5 destinations, 44px+ hit areas, safe-area aware) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-sandalwood-border bg-paper/95 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[10px] px-1 py-1 text-[11px] transition-colors duration-150",
                    isActive
                      ? "bg-peacock-deep font-medium text-ink-on-dark"
                      : "text-ink-muted hover:bg-linen hover:text-ink"
                  )}
                >
                  <Icon
                    className="size-4 shrink-0"
                    strokeWidth={isActive ? 2 : 1.5}
                    aria-hidden={true}
                  />
                  <span className="truncate">{item.shortLabel}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

