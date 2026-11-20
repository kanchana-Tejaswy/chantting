import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { LotusEmblem, ManuscriptDivider } from "@/components/sacred/ornaments";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <AppShell pageTitle="Page Not Found">
      <div className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
        <Card surface="parchment" className="text-center shadow-sacred-md">
          <CardHeader className="flex flex-col items-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-gold-wash text-gold-antique shadow-sacred-xs">
              <LotusEmblem size={28} />
            </div>
            <span className="mt-3 font-devanagari text-sm font-semibold text-peacock-deep">
              मार्ग संशय · Route Unfound
            </span>
            <CardTitle className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
              Peace in the Sacred Path
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-muted">
              The sacred page or meditation space you sought does not exist or may
              have moved. Return calmly to your personal Sādhana sanctuary.
            </p>
            <ManuscriptDivider className="mx-auto max-w-xs opacity-60" />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sadhana"
                className={buttonStyles({ variant: "gold", size: "md" })}
              >
                Personal Sādhana
              </Link>
              <Link
                href="/"
                className={buttonStyles({ variant: "secondary", size: "md" })}
              >
                Return to Sanctum
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

