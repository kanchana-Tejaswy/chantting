"use client";

import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { LotusEmblem, ManuscriptDivider } from "@/components/sacred/ornaments";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log error cleanly for client diagnostics
    console.error("SMARAN runtime caught error:", error);
  }, [error]);

  return (
    <AppShell pageTitle="Serenity Preserved">
      <div className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
        <Card surface="parchment" className="text-center shadow-sacred-md">
          <CardHeader className="flex flex-col items-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-gold-wash text-gold-antique shadow-sacred-xs">
              <LotusEmblem size={28} />
            </div>
            <span className="mt-3 font-devanagari text-sm font-semibold text-peacock-deep">
              शांति · Peaceful Recovery
            </span>
            <CardTitle className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
              Something Interrupted Your Flow
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-muted">
              A temporary interruption occurred while loading this view. Your
              recorded chanting rounds, Sankalpas, and devotional progress remain
              completely safe in the database.
            </p>
            {error.message && process.env.NODE_ENV !== "production" && (
              <p className="rounded-[10px] border border-sandalwood-border bg-linen p-3 text-left font-mono text-xs text-kumkum">
                {error.message}
              </p>
            )}
            <ManuscriptDivider className="mx-auto max-w-xs opacity-60" />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className={buttonStyles({ variant: "gold", size: "md" })}
              >
                Try Again
              </button>
              <Link
                href="/sadhana"
                className={buttonStyles({ variant: "secondary", size: "md" })}
              >
                Return to Sādhana
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

