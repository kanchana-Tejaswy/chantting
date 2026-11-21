import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DrstiDashboard } from "@/components/drsti/drsti-dashboard";
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
import { loadDrstiDashboardData } from "@/lib/sadhana/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DṚṢṬI · Personal Spiritual Vision · SMARAN",
  description:
    "A calm, sacred personal progress dashboard providing clear vision into your daily Japa practice, Sankalpa commitments, chanting consistency, and lifetime journey.",
};

export default async function DrstiPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const parsedYear = params.year ? Number.parseInt(params.year, 10) : undefined;
  const validYear =
    parsedYear !== undefined &&
    Number.isInteger(parsedYear) &&
    parsedYear >= 2000 &&
    parsedYear <= 2100
      ? parsedYear
      : undefined;

  const parsedMonth = params.month ? Number.parseInt(params.month, 10) : undefined;
  // month in query param is 1-based (1..12) or 0-based (0..11)
  const validMonth =
    parsedMonth !== undefined &&
    Number.isInteger(parsedMonth) &&
    parsedMonth >= 1 &&
    parsedMonth <= 12
      ? parsedMonth - 1
      : parsedMonth !== undefined &&
          Number.isInteger(parsedMonth) &&
          parsedMonth >= 0 &&
          parsedMonth <= 11
        ? parsedMonth
        : undefined;

  const result = await loadDrstiDashboardData(validYear, validMonth);

  if (result.status === "unauthenticated") {
    redirect("/auth?next=/drsti");
  }

  if (result.status === "needs_onboarding") {
    redirect("/onboarding");
  }

  if (result.status === "schema_not_ready") {
    return (
      <AppShell
        pageTitle="DṚṢṬI"
        userSummary={{
          displayName: result.userEmail ?? "Devotee",
          email: result.userEmail,
        }}
      >
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="gold" className="w-fit">
                Database Setup Required
              </Badge>
              <CardTitle className="mt-2 font-display text-3xl">
                Supabase migrations have not been applied yet
              </CardTitle>
              <CardDescription>
                Apply database migrations before viewing DṚṢṬI analytics.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-ink-muted">
              {result.detail}
            </CardContent>
            <CardFooter>
              <Link
                href="/sadhana"
                className={buttonStyles({ variant: "secondary", size: "md" })}
              >
                Return to Dashboard
              </Link>
            </CardFooter>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (result.status === "error") {
    return (
      <AppShell
        pageTitle="DṚṢṬI"
        userSummary={{
          displayName: result.userEmail ?? "Devotee",
          email: result.userEmail,
        }}
      >
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="kumkum" className="w-fit">
                Unable to Load DṚṢṬI Dashboard
              </Badge>
              <CardTitle className="mt-2 font-display text-2xl">
                A problem occurred while retrieving your spiritual analytics
              </CardTitle>
              <CardDescription>{result.message}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Link
                href="/sadhana"
                className={buttonStyles({ variant: "secondary", size: "md" })}
              >
                Return to Sādhana
              </Link>
            </CardFooter>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      pageTitle="DṚṢṬI"
      userSummary={{
        displayName: result.displayName,
        email: result.userEmail,
        avatarUrl: result.avatarUrl,
      }}
    >
      <DrstiDashboard
        displayName={result.displayName}
        timezone={result.timezone}
        todayDate={result.todayDate}
        todaySadhana={result.todaySadhana}
        metrics={result.metrics}
        analytics={result.analytics}
        activeSankalpa={result.activeSankalpa}
        sankalpas={result.sankalpas}
        initialDayDetail={result.initialDayDetail}
      />
    </AppShell>
  );
}
