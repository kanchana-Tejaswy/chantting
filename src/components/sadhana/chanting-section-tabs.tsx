import Link from "next/link";
import { Flame, Target } from "lucide-react";
import { cn } from "@/lib/cn";

export function ChantingSectionTabs({
  active,
}: {
  active: "japa" | "lakshya";
}) {
  const tabs = [
    {
      id: "japa" as const,
      href: "/sadhana/chant",
      label: "Japa",
      subtitle: "Chanting Mala",
      icon: Flame,
    },
    {
      id: "lakshya" as const,
      href: "/sadhana",
      label: "Lakshya",
      subtitle: "Daily Goal & History",
      icon: Target,
    },
  ];

  return (
    <nav
      aria-label="Chanting sections"
      className="grid grid-cols-2 gap-1.5 rounded-[16px] border border-sandalwood-border/80 bg-linen/90 p-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] sm:inline-grid sm:min-w-[370px]"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex min-h-12 items-center gap-2.5 rounded-[12px] px-3.5 py-2 transition-[background-color,color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-antique focus-visible:ring-offset-1",
              isActive
                ? "bg-peacock-deep text-ink-on-dark shadow-sacred-sm"
                : "text-ink-muted hover:bg-paper hover:text-ink"
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-[9px] transition-colors duration-150",
                isActive
                  ? "bg-krishna-elevated text-gold-antique shadow-inner"
                  : "bg-paper text-peacock-deep shadow-sacred-xs group-hover:bg-linen/80"
              )}
            >
              <Icon
                className="size-4"
                strokeWidth={isActive ? 2 : 1.75}
                aria-hidden={true}
              />
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-sm font-semibold leading-tight tracking-tight">
                {tab.label}
              </span>
              <span
                className={cn(
                  "block truncate text-[11px] leading-tight font-medium",
                  isActive ? "text-ink-on-dark/80" : "text-ink-muted"
                )}
              >
                {tab.subtitle}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

