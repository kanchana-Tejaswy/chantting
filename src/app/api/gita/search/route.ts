import { NextResponse } from "next/server";
import { gitaSearchQuerySchema } from "@/lib/gita/validation";
import { searchGitaContent } from "@/lib/gita/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = gitaSearchQuerySchema.safeParse({
    q: searchParams.get("q") ?? "",
    chapter: searchParams.get("chapter") ?? undefined,
    verse: searchParams.get("verse") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid search parameters." },
      { status: 400 }
    );
  }

  const { q, chapter, verse } = parsed.data;
  if (!q && chapter === undefined && verse === undefined) {
    return NextResponse.json({
      results: [],
      message: "Enter a verse reference (e.g. 2.47), text, or select a chapter.",
    });
  }

  const outcome = await searchGitaContent({ q, chapter, verse });
  if (outcome.status === "schema_not_ready") {
    return NextResponse.json(
      { error: "Scripture schema not ready.", detail: outcome.detail },
      { status: 503 }
    );
  }
  if (outcome.status === "error") {
    return NextResponse.json(
      { error: outcome.detail ?? "Search failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({ results: outcome.results });
}

