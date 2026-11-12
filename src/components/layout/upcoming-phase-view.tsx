import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { LotusEmblem } from "@/components/sacred/ornaments";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface UpcomingPhaseViewProps {
  pageTitle: string;
  phaseLabel: string;
  heading: string;
  description: string;
  plannedItems: string[];
}

export function UpcomingPhaseView({
  pageTitle,
  phaseLabel,
  heading,
  description,
  plannedItems,
}: UpcomingPhaseViewProps) {
  return (
    <AppShell pageTitle={pageTitle}>
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <Card surface="parchment">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-[10px] bg-krishna-midnight text-gold-antique">
                <LotusEmblem size={20} />
              </span>
              <Badge variant="gold">{phaseLabel}</Badge>
            </div>
            <CardTitle className="mt-4 font-display text-3xl">
              {heading}
            </CardTitle>
            <CardDescription className="text-base text-ink-muted opacity-100">
              {description}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ul className="space-y-2.5 border-t border-sandalwood-border pt-4 text-sm text-ink">
              {plannedItems.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-gold-antique"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter>
            <Link
              href="/design-system"
              className={buttonStyles({ variant: "primary", size: "md" })}
            >
              Inspect Phase 2 Design System
            </Link>
            <Link
              href="/"
              className={buttonStyles({ variant: "secondary", size: "md" })}
            >
              Return to Sanctum
            </Link>
          </CardFooter>
        </Card>
      </div>
    </AppShell>
  );
}

