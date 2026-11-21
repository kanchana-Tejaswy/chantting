"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Compass,
  Flame,
  LogOut,
  Palette,
  Settings,
  Target,
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
  match?: (pathname: string) => boolean;
  phaseNote?: string;
  bgImageSrc?: string;
  bgImagePositionClass?: string;
  bgImageMobilePositionClass?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/drsti",
    label: "DṚṢṬI",
    shortLabel: "DṚṢṬI",
    icon: Compass,
    match: (pathname) =>
      pathname === "/" ||
      pathname.startsWith("/drsti") ||
      pathname.startsWith("/dristi"),
    bgImageSrc: "/media/nav-drsti.jpg",
    bgImagePositionClass: "object-center",
    bgImageMobilePositionClass: "object-center",
  },
  {
    href: "/sadhana/chant",
    label: "Japa",
    shortLabel: "Japa",
    icon: Flame,
    match: (pathname) => pathname.startsWith("/sadhana/chant"),
    bgImageSrc: "/media/nav-japa.jpg",
    bgImagePositionClass: "object-[center_64%]",
    bgImageMobilePositionClass: "object-[center_64%]",
  },
  {
    href: "/sadhana",
    label: "Lakshya",
    shortLabel: "Lakshya",
    icon: Target,
    match: (pathname) =>
      pathname.startsWith("/sadhana") &&
      !pathname.startsWith("/sadhana/chant"),
    bgImageSrc: "/media/nav-lakshya.jpg",
    bgImagePositionClass: "object-center",
    bgImageMobilePositionClass: "object-[49%_center]",
  },
  {
    href: "/rooms",
    label: "Satsang",
    shortLabel: "Satsang",
    icon: Users,
    bgImageSrc: "/media/nav-satsang.jpg",
    bgImagePositionClass: "object-center",
    bgImageMobilePositionClass: "object-[52%_center]",
  },
];

function isNavItemActive(item: NavItem, pathname: string | null | undefined): boolean {
  if (!pathname) {
    return false;
  }
  if (item.match) {
    return item.match(pathname);
  }
  if (item.href === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(item.href);
}

function NavItemBackdrop({
  src,
  isActive,
  positionClass = "object-center",
  mobilePositionClass,
  mobile = false,
}: {
  src: string;
  isActive: boolean;
  positionClass?: string;
  mobilePositionClass?: string;
  mobile?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] transition-opacity duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
        isActive
          ? "opacity-100"
          : "opacity-0 [@media(hover:hover)]:group-hover:opacity-100 group-focus-visible:opacity-100"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className={cn(
          "size-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
          mobile ? (mobilePositionClass ?? positionClass) : positionClass,
          isActive
            ? "scale-100"
            : "scale-[1.04] [@media(hover:hover)]:group-hover:scale-100"
        )}
      />
      <span
        className={cn(
          "absolute inset-0",
          mobile
            ? "bg-gradient-to-t from-[#0D131F]/88 via-[#111927]/56 to-[#0D131F]/35"
            : "bg-gradient-to-r from-[#0D131F]/86 via-[#111927]/56 to-[#0D131F]/28"
        )}
      />
    </span>
  );
}

export interface AppShellUserSummary {
  displayName: string;
  email?: string | null;
  unreadNotificationsCount?: number;
  avatarUrl?: string | null;
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
  const homeHref = userSummary ? "/sadhana" : "/";

  return (
    <div
      data-reduced-motion={reducedMotion ? "true" : undefined}
      className="min-h-dvh overflow-x-clip bg-ivory text-ink"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[10px] focus:bg-peacock-deep focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-ink-on-dark"
      >
        Skip to main content
      </a>

      {/* Soft ambient dusk/tulsi wash behind frosted glass rail on light interior pages */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-0 z-0 hidden w-64 bg-[radial-gradient(circle_at_24%_18%,rgba(214,168,72,0.16),transparent_60%),radial-gradient(circle_at_75%_82%,rgba(42,134,121,0.12),transparent_58%)] lg:block"
      />

      {/* Desktop Left Navigation Rail (Frosted Glass) */}
      <aside
        aria-label="Primary navigation"
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/45 bg-gradient-to-b from-[#FAF6EC]/76 via-[#F7F1E3]/68 to-[#FAF6EC]/78 backdrop-blur-2xl backdrop-saturate-150 shadow-[8px_0_32px_-12px_rgba(13,22,40,0.14)] lg:flex"
      >
        <div className="flex items-center gap-3 border-b border-sandalwood-border/60 px-5 py-5">
          <div className="flex size-10 items-center justify-center rounded-[12px] bg-krishna-midnight/95 text-gold-antique shadow-sacred-sm">
            <LotusEmblem size={22} />
          </div>
          <div className="min-w-0">
            <Link
              href={homeHref}
              className="block truncate font-display text-lg font-semibold tracking-wide text-ink hover:text-peacock-deep transition-colors"
            >
              SMARAN{" "}
              <span className="font-devanagari text-sm font-normal text-ink/75">
                स्मरण
              </span>
            </Link>
            <p className="text-xs text-ink/75">
              Remember Him. Stay Connected.
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = isNavItemActive(item, pathname);
            const hasImage = Boolean(item.bgImageSrc);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-11 items-center justify-between overflow-hidden rounded-[11px] px-3 py-2 text-sm transition-[background-color,color,box-shadow] duration-200 ease-out",
                  isActive
                    ? hasImage
                      ? "bg-krishna-midnight font-medium text-ink-on-dark ring-1 ring-gold-antique/40 shadow-[0_6px_18px_-6px_rgba(17,46,64,0.45)]"
                      : "bg-peacock-deep/92 font-medium text-ink-on-dark shadow-[0_6px_18px_-6px_rgba(17,46,64,0.45)] backdrop-blur-sm"
                    : cn(
                        "text-ink/90 hover:bg-white/55 hover:text-ink hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
                        hasImage &&
                          "[@media(hover:hover)]:hover:text-ink-on-dark focus-visible:text-ink-on-dark"
                      )
                )}
              >
                {item.bgImageSrc && (
                  <NavItemBackdrop
                    src={item.bgImageSrc}
                    isActive={isActive}
                    positionClass={item.bgImagePositionClass}
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 flex items-center gap-2.5",
                    hasImage &&
                      (isActive
                        ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                        : "[@media(hover:hover)]:group-hover:drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] group-focus-visible:drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]")
                  )}
                >
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
                      "relative z-10 rounded-full px-2 py-0.5 text-[11px] tabular-nums",
                      isActive
                        ? "bg-krishna-elevated text-ink-muted-dark"
                        : "bg-white/60 text-ink/75"
                    )}
                  >
                    {item.phaseNote}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sandalwood-border/60 px-5 py-4 text-xs leading-relaxed text-ink/75">
          <div className="mb-3 space-y-1">
            {userSummary && (
              <>
                <Link
                  href="/account"
                  className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-white/55"
                >
                  {userSummary.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={userSummary.avatarUrl}
                      alt=""
                      className="size-4 shrink-0 rounded-full object-cover border border-gold-antique/50"
                    />
                  ) : (
                    <User className="size-3.5" aria-hidden={true} />
                  )}
                  <span>Account, Privacy &amp; Inbox</span>
                </Link>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-white/55 hover:text-kumkum"
                  >
                    <LogOut className="size-3.5" aria-hidden={true} />
                    <span>Sign out</span>
                  </button>
                </form>
              </>
            )}
            <Link
              href="/design-system"
              className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-xs font-medium text-ink/80 transition-colors hover:bg-white/55 hover:text-ink"
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
        <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between border-b border-sandalwood-border/60 bg-ivory/72 px-4 backdrop-blur-xl backdrop-saturate-150 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 lg:hidden">
            <Link
              href={homeHref}
              className="flex items-center gap-2.5 text-ink hover:text-peacock-deep transition-colors"
              aria-label="SMARAN Home"
            >
              <span className="flex size-8 items-center justify-center rounded-[8px] bg-krishna-midnight text-gold-antique">
                <LotusEmblem size={18} />
              </span>
              <span className="font-display text-base font-semibold">
                SMARAN{" "}
                <span className="font-devanagari text-xs font-normal text-ink-muted">
                  स्मरण
                </span>
              </span>
            </Link>
          </div>

          <p className="hidden text-sm font-medium text-ink-muted lg:block">
            {pageTitle ?? "SMARAN"}
          </p>

          <div className="flex items-center gap-2">
            {userSummary ? (
              <>
                <Link
                  href="/account?tab=notifications"
                  aria-label={
                    typeof userSummary.unreadNotificationsCount === "number" &&
                    userSummary.unreadNotificationsCount > 0
                      ? `Open notifications inbox (${userSummary.unreadNotificationsCount} unread)`
                      : "Open notifications inbox"
                  }
                  className="relative inline-flex size-9 items-center justify-center rounded-full border border-sandalwood-border bg-paper text-ink-muted transition-colors duration-150 hover:bg-linen hover:text-ink"
                >
                  <Bell className="size-4" strokeWidth={1.75} aria-hidden={true} />
                  {typeof userSummary.unreadNotificationsCount === "number" &&
                  userSummary.unreadNotificationsCount > 0 ? (
                    <span
                      className="absolute -top-1 -right-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-gold-ink px-1 text-[10px] font-bold text-ink-on-dark shadow-sacred-sm"
                      aria-hidden={true}
                    >
                      {userSummary.unreadNotificationsCount > 99
                        ? "99+"
                        : userSummary.unreadNotificationsCount}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href="/account"
                  className="inline-flex min-h-9 max-w-48 items-center gap-2 rounded-full border border-sandalwood-border bg-paper py-1 pr-3 pl-1.5 text-xs font-medium text-ink transition-colors duration-150 hover:bg-linen"
                  title="Devotee Profile & Account"
                >
                  {userSummary.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={userSummary.avatarUrl}
                      alt=""
                      className="size-6 shrink-0 rounded-full object-cover border border-gold-antique/60 shadow-sacred-xs"
                    />
                  ) : (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sandalwood-light border border-gold-antique/40 font-display text-[11px] font-bold text-gold-ink">
                      {userSummary.displayName.trim().charAt(0).toUpperCase() || "D"}
                    </span>
                  )}
                  <span className="truncate">{userSummary.displayName}</span>
                </Link>
                <Link
                  href="/account"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-sandalwood-border bg-paper px-3 text-xs font-medium text-ink transition-colors duration-150 hover:bg-linen hover:border-gold-antique/50"
                  title="Settings & Privacy"
                  aria-label="Settings & Privacy"
                >
                  <Settings
                    className="size-3.5 text-peacock-deep"
                    strokeWidth={1.75}
                    aria-hidden={true}
                  />
                  <span>Settings</span>
                </Link>
              </>
            ) : !pathname?.startsWith("/auth") ? (
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

      {/* Mobile Bottom Navigation (44px+ hit areas, safe-area aware frosted glass) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/45 bg-[#FAF6EC]/78 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-2xl backdrop-saturate-150 shadow-[0_-8px_28px_-12px_rgba(13,22,40,0.12)] lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = isNavItemActive(item, pathname);
            const hasImage = Boolean(item.bgImageSrc);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative flex min-h-11 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[10px] px-1 py-1 text-[11px] transition-colors duration-200",
                    isActive
                      ? hasImage
                        ? "bg-krishna-midnight font-medium text-ink-on-dark ring-1 ring-gold-antique/40"
                        : "bg-peacock-deep font-medium text-ink-on-dark"
                      : cn(
                          "text-ink-muted hover:bg-linen hover:text-ink",
                          hasImage &&
                            "[@media(hover:hover)]:hover:text-ink-on-dark focus-visible:text-ink-on-dark"
                        )
                  )}
                >
                  {item.bgImageSrc && (
                    <NavItemBackdrop
                      src={item.bgImageSrc}
                      isActive={isActive}
                      positionClass={item.bgImagePositionClass}
                      mobilePositionClass={item.bgImageMobilePositionClass}
                      mobile
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex flex-col items-center justify-center gap-0.5",
                      hasImage &&
                        isActive &&
                        "drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                    )}
                  >
                    <Icon
                      className="size-4 shrink-0"
                      strokeWidth={isActive ? 2 : 1.5}
                      aria-hidden={true}
                    />
                    <span className="truncate">{item.shortLabel}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

