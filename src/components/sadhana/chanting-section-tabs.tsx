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
      className="grid grid-cols-2 gap-1.5 rounded-[14px] border border-sandalwood-border bg-linen p-1.5 shadow-sacred-sm sm:inline-grid sm:min-w-[360px]"
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
              "flex min-h-12 items-center gap-2.5 rounded-[10px] px-3.5 py-2 transition-[background-color,color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]",
              isActive
                ? "bg-peacock-deep text-ink-on-dark shadow-sacred-sm"
                : "text-ink-muted hover:bg-paper/80 hover:text-ink"
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-[8px]",
                isActive
                  ? "bg-krishna-elevated text-gold-antique"
                  : "bg-paper text-peacock-deep shadow-sacred-sm"
              )}
            >
              <Icon
                className="size-4"
                strokeWidth={isActive ? 2 : 1.75}
                aria-hidden={true}
              />
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-sm font-semibold leading-tight">
                {tab.label}
              </span>
              <span
                className={cn(
                  "block truncate text-[11px] leading-tight",
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

