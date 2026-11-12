"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import type {
  GitaChapter,
  GitaContentSource,
  GitaExplanation,
  GitaFeedbackRecord,
  GitaTranslation,
  GitaVerse,
} from "@/lib/gita/domain";
import type {
  GitaAdminAuditItem,
  GitaViewerContext,
} from "@/lib/gita/queries";
import type { ContentReviewStatus, FeedbackStatus } from "@/lib/gita/validation";

export interface GitaAdminStudioProps {
  viewer: GitaViewerContext;
  sources: GitaContentSource[];
  chapters: GitaChapter[];
  verses: GitaVerse[];
  translations: GitaTranslation[];
  explanations: GitaExplanation[];
  feedback: GitaFeedbackRecord[];
  auditLogs: GitaAdminAuditItem[];
}

type AdminTab =
  | "sources"
  | "chapters"
  | "verses"
  | "translations"
  | "explanations"
  | "feedback";

const REVIEW_BADGE: Record<
  ContentReviewStatus,
  "peacock" | "gold" | "kumkum" | "neutral"
> = {
  approved: "peacock",
  pending_review: "gold",
  needs_correction: "kumkum",
  draft: "neutral",
};

export function GitaAdminStudio({
  viewer,
  sources,
  chapters,
  verses,
  translations,
  explanations,
  feedback,
  auditLogs,
}: GitaAdminStudioProps) {
  const router = useRouter();
  const [tab, setTab] = React.useState<AdminTab>("sources");
  const [busy, setBusy] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // --- Source Form State ---
  const [editingSourceId, setEditingSourceId] = React.useState<string | null>(
    null
  );
  const [srcSlug, setSrcSlug] = React.useState("");
  const [srcTitle, setSrcTitle] = React.useState("");
  const [srcAuthor, setSrcAuthor] = React.useState("");
  const [srcLineage, setSrcLineage] = React.useState("");
  const [srcLicense, setSrcLicense] = React.useState("Public Domain");
  const [srcLicenseUrl, setSrcLicenseUrl] = React.useState("");
  const [srcAttribution, setSrcAttribution] = React.useState("");
  const [srcUrl, setSrcUrl] = React.useState("");
  const [srcStatus, setSrcStatus] =
    React.useState<ContentReviewStatus>("pending_review");

  // --- Chapter Form State ---
  const [chNum, setChNum] = React.useState(1);
  const [chSanskrit, setChSanskrit] = React.useState("");
  const [chIast, setChIast] = React.useState("");
  const [chEnglish, setChEnglish] = React.useState("");
  const [chSummary, setChSummary] = React.useState("");
  const [chVerseCount, setChVerseCount] = React.useState(1);
  const [chTags, setChTags] = React.useState("");

  // --- Verse Form State ---
  const [editingVerseId, setEditingVerseId] = React.useState<string | null>(
    null
  );
  const [vChapter, setVChapter] = React.useState(1);
  const [vNumber, setVNumber] = React.useState(1);
  const [vSanskrit, setVSanskrit] = React.useState("");
  const [vIast, setVIast] = React.useState("");
  const [vWordJson, setVWordJson] = React.useState("");
  const [vSourceId, setVSourceId] = React.useState("");
  const [vStatus, setVStatus] =
    React.useState<ContentReviewStatus>("pending_review");

  // --- Translation Form State ---
  const [editingTranslationId, setEditingTranslationId] = React.useState<
    string | null
  >(null);
  const [trVerseId, setTrVerseId] = React.useState(verses[0]?.id ?? "");
  const [trSourceId, setTrSourceId] = React.useState(sources[0]?.id ?? "");
  const [trLang, setTrLang] = React.useState("en");
  const [trText, setTrText] = React.useState("");
  const [trPrimary, setTrPrimary] = React.useState(true);
  const [trStatus, setTrStatus] =
    React.useState<ContentReviewStatus>("pending_review");

  // --- Explanation Form State ---
  const [editingExplanationId, setEditingExplanationId] = React.useState<
    string | null
  >(null);
  const [expVerseId, setExpVerseId] = React.useState(verses[0]?.id ?? "");
  const [expSourceId, setExpSourceId] = React.useState("");
  const [expTitle, setExpTitle] = React.useState("");
  const [expText, setExpText] = React.useState("");
  const [expAiAssisted, setExpAiAssisted] = React.useState(false);
  const [expHumanConfirmed, setExpHumanConfirmed] = React.useState(false);
  const [expStatus, setExpStatus] =
    React.useState<ContentReviewStatus>("pending_review");

  const verseById = new Map(verses.map((v) => [v.id, v]));

  async function runApi(
    url: string,
    method: "POST" | "PATCH" | "DELETE",
    payload: Record<string, unknown>,
    successText: string
  ) {
    setBusy(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMessage(json.error ?? "Request failed.");
        return false;
      }
      setStatusMessage(successText);
      router.refresh();
      return true;
    } catch {
      setErrorMessage("Network error while saving scripture content.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSource(e: React.FormEvent) {
    e.preventDefault();
    const ok = await runApi(
      "/api/gita/admin/sources",
      editingSourceId ? "PATCH" : "POST",
      {
        ...(editingSourceId ? { id: editingSourceId } : {}),
        slug: srcSlug,
        title: srcTitle,
        authorOrTranslator: srcAuthor,
        traditionOrLineage: srcLineage || null,
        licenseName: srcLicense,
        licenseUrl: srcLicenseUrl || null,
        attributionText: srcAttribution,
        sourceUrl: srcUrl || null,
        reviewStatus: srcStatus,
      },
      editingSourceId ? "Source updated." : "Source created."
    );
    if (ok) {
      setEditingSourceId(null);
      setSrcSlug("");
      setSrcTitle("");
      setSrcAuthor("");
      setSrcLineage("");
      setSrcLicenseUrl("");
      setSrcAttribution("");
      setSrcUrl("");
      setSrcStatus("pending_review");
    }
  }

  async function handleSaveChapter(e: React.FormEvent) {
    e.preventDefault();
    await runApi(
      "/api/gita/admin/chapters",
      "POST",
      {
        chapterNumber: chNum,
        sanskritTitle: chSanskrit,
        transliterationTitle: chIast,
        englishTitle: chEnglish,
        summary: chSummary,
        verseCount: chVerseCount,
        themeTags: chTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      },
      `Chapter ${chNum} saved.`
    );
  }

  async function handleSaveVerse(e: React.FormEvent) {
    e.preventDefault();
    let parsedWords: unknown = null;
    if (vWordJson.trim().length > 0) {
      try {
        parsedWords = JSON.parse(vWordJson);
      } catch {
        setErrorMessage(
          'Word-by-word field must be valid JSON (e.g. [{"sanskrit":"...","meaning":"..."}]).'
        );
        return;
      }
    }
    const ok = await runApi(
      "/api/gita/admin/verses",
      editingVerseId ? "PATCH" : "POST",
      {
        ...(editingVerseId ? { id: editingVerseId } : {}),
        chapterNumber: vChapter,
        verseNumber: vNumber,
        sanskritDevanagari: vSanskrit,
        transliterationIast: vIast,
        wordByWord: parsedWords,
        sourceId: vSourceId || null,
        reviewStatus: vStatus,
      },
      `Verse ${vChapter}.${vNumber} saved.`
    );
    if (ok) {
      setEditingVerseId(null);
      setVSanskrit("");
      setVIast("");
      setVWordJson("");
      setVStatus("pending_review");
    }
  }

  async function handleSaveTranslation(e: React.FormEvent) {
    e.preventDefault();
    const ok = await runApi(
      "/api/gita/admin/translations",
      editingTranslationId ? "PATCH" : "POST",
      {
        ...(editingTranslationId ? { id: editingTranslationId } : {}),
        verseId: trVerseId,
        sourceId: trSourceId,
        languageCode: trLang,
        translationText: trText,
        isPrimary: trPrimary,
        reviewStatus: trStatus,
      },
      editingTranslationId ? "Translation updated." : "Translation added."
    );
    if (ok) {
      setEditingTranslationId(null);
      setTrText("");
      setTrStatus("pending_review");
    }
  }

  async function handleSaveExplanation(e: React.FormEvent) {
    e.preventDefault();
    const ok = await runApi(
      "/api/gita/admin/explanations",
      editingExplanationId ? "PATCH" : "POST",
      {
        ...(editingExplanationId ? { id: editingExplanationId } : {}),
        verseId: expVerseId,
        sourceId: expSourceId || null,
        title: expTitle || null,
        explanationText: expText,
        isAiAssisted: expAiAssisted,
        humanReviewedConfirmed: expHumanConfirmed,
        reviewStatus: expStatus,
      },
      editingExplanationId ? "Explanation updated." : "Explanation saved."
    );
    if (ok) {
      setEditingExplanationId(null);
      setExpTitle("");
      setExpText("");
      setExpAiAssisted(false);
      setExpHumanConfirmed(false);
      setExpStatus("pending_review");
    }
  }

  async function handleUpdateFeedback(
    id: string,
    status: FeedbackStatus,
    notes: string
  ) {
    await runApi(
      "/api/gita/admin/feedback",
      "PATCH",
      { id, status, resolutionNotes: notes || null },
      `Feedback marked ${status}.`
    );
  }

  const pendingReviewCount =
    sources.filter((s) => s.review_status !== "approved").length +
    verses.filter((v) => v.review_status !== "approved").length +
    translations.filter((t) => t.review_status !== "approved").length +
    explanations.filter((e) => e.review_status !== "approved").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-sandalwood-border pb-6">
        <div>
          <Badge variant="gold">
            <ShieldCheck className="size-3.5" aria-hidden={true} />
            <span>
              Scripture Content Studio · {viewer.adminRole ?? "scripture_admin"}
            </span>
          </Badge>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
            Bhagavad Gītā Content Management
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Manage verified Sanskrit, IAST transliteration, licensed translations,
            human-reviewed explanations, and source attribution. Only approved
            content is visible to readers.
          </p>
        </div>

        <Link
          href="/gita"
          className={buttonStyles({ variant: "secondary", size: "md" })}
        >
          <ArrowLeft className="size-4" aria-hidden={true} />
          <span>Public Gītā View</span>
        </Link>
      </header>

      {/* Moderation Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-[12px] border border-sandalwood-border bg-paper p-3.5">
          <p className="text-xs text-ink-muted">Sources</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">
            {sources.length}
          </p>
        </div>
        <div className="rounded-[12px] border border-sandalwood-border bg-paper p-3.5">
          <p className="text-xs text-ink-muted">Chapters</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">
            {chapters.length}/18
          </p>
        </div>
        <div className="rounded-[12px] border border-sandalwood-border bg-paper p-3.5">
          <p className="text-xs text-ink-muted">Verses</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">
            {verses.filter((v) => v.review_status === "approved").length}/
            {verses.length}
          </p>
        </div>
        <div className="rounded-[12px] border border-sandalwood-border bg-paper p-3.5">
          <p className="text-xs text-ink-muted">Unpublished / Review</p>
          <p className="mt-1 font-display text-2xl font-semibold text-gold-ink tabular-nums">
            {pendingReviewCount}
          </p>
        </div>
        <div className="rounded-[12px] border border-sandalwood-border bg-paper p-3.5">
          <p className="text-xs text-ink-muted">Open Feedback</p>
          <p className="mt-1 font-display text-2xl font-semibold text-peacock-ink tabular-nums">
            {feedback.filter((f) => f.status === "open" || f.status === "reviewing").length}
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div
        role="tablist"
        aria-label="Content management sections"
        className="flex flex-wrap gap-2"
      >
        {(
          [
            ["sources", "Sources & Licenses"],
            ["chapters", "Chapters (1–18)"],
            ["verses", "Verses"],
            ["translations", "Translations"],
            ["explanations", "Explanations"],
            ["feedback", "Feedback & Audit"],
          ] as Array<[AdminTab, string]>
        ).map(([key, label]) => (
          <Button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            variant={tab === key ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 rounded-[12px] border border-peacock-green/35 bg-tulsi-wash px-4 py-3 text-sm text-peacock-ink">
          <CheckCircle2 className="size-4" aria-hidden={true} />
          <span>{statusMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-[12px] border border-kumkum/35 bg-kumkum-wash px-4 py-3 text-sm text-kumkum"
        >
          <ShieldAlert className="size-4" aria-hidden={true} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: Sources & Licenses */}
      {tab === "sources" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                {editingSourceId
                  ? "Edit Content Source"
                  : "Register Content Source & License"}
              </CardTitle>
              <CardDescription>
                Every translation and scripture edition requires explicit license
                and attribution before publication.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSource} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField id="src-slug" label="Slug" required>
                    <Input
                      id="src-slug"
                      value={srcSlug}
                      onChange={(e) => setSrcSlug(e.target.value)}
                      placeholder="public-domain-edition"
                      required
                    />
                  </FormField>
                  <FormField id="src-status" label="Review Status">
                    <Select
                      id="src-status"
                      value={srcStatus}
                      onChange={(e) =>
                        setSrcStatus(e.target.value as ContentReviewStatus)
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="pending_review">Pending review</option>
                      <option value="approved">Approved (Published)</option>
                      <option value="needs_correction">Needs correction</option>
                    </Select>
                  </FormField>
                </div>

                <FormField id="src-title" label="Edition / Work Title" required>
                  <Input
                    id="src-title"
                    value={srcTitle}
                    onChange={(e) => setSrcTitle(e.target.value)}
                    required
                  />
                </FormField>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    id="src-author"
                    label="Author / Translator"
                    required
                  >
                    <Input
                      id="src-author"
                      value={srcAuthor}
                      onChange={(e) => setSrcAuthor(e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField
                    id="src-lineage"
                    label="Tradition / Lineage (Optional)"
                  >
                    <Input
                      id="src-lineage"
                      value={srcLineage}
                      onChange={(e) => setSrcLineage(e.target.value)}
                    />
                  </FormField>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField id="src-license" label="License Name" required>
                    <Input
                      id="src-license"
                      value={srcLicense}
                      onChange={(e) => setSrcLicense(e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField id="src-license-url" label="License URL (Optional)">
                    <Input
                      id="src-license-url"
                      value={srcLicenseUrl}
                      onChange={(e) => setSrcLicenseUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </FormField>
                </div>

                <FormField id="src-attr" label="Attribution Statement" required>
                  <Textarea
                    id="src-attr"
                    rows={2}
                    value={srcAttribution}
                    onChange={(e) => setSrcAttribution(e.target.value)}
                    required
                  />
                </FormField>

                <FormField id="src-url" label="Source Reference URL (Optional)">
                  <Input
                    id="src-url"
                    value={srcUrl}
                    onChange={(e) => setSrcUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </FormField>

                <div className="flex gap-2">
                  <Button type="submit" variant="primary" disabled={busy}>
                    {editingSourceId ? "Update Source" : "Save Source"}
                  </Button>
                  {editingSourceId && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditingSourceId(null)}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Registered Sources ({sources.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sources.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No sources registered yet. Add an attributed public-domain or
                  licensed source first.
                </p>
              ) : (
                sources.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-[12px] border border-sandalwood-border bg-ivory p-3.5 text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-ink">
                          {s.title}
                        </p>
                        <p className="text-ink-muted">
                          {s.author_or_translator} · {s.license_name}
                        </p>
                      </div>
                      <Badge variant={REVIEW_BADGE[s.review_status]}>
                        {s.review_status}
                      </Badge>
                    </div>
                    <p className="text-ink-muted">{s.attribution_text}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingSourceId(s.id);
                          setSrcSlug(s.slug);
                          setSrcTitle(s.title);
                          setSrcAuthor(s.author_or_translator);
                          setSrcLineage(s.tradition_or_lineage ?? "");
                          setSrcLicense(s.license_name);
                          setSrcLicenseUrl(s.license_url ?? "");
                          setSrcAttribution(s.attribution_text);
                          setSrcUrl(s.source_url ?? "");
                          setSrcStatus(s.review_status);
                        }}
                      >
                        Edit / Review
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          runApi(
                            "/api/gita/admin/sources",
                            "DELETE",
                            { id: s.id },
                            "Source deleted."
                          )
                        }
                      >
                        <Trash2 className="size-3.5" aria-hidden={true} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: Chapters */}
      {tab === "chapters" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Create or Update Chapter (1–18)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveChapter} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField id="ch-num" label="Chapter Number (1–18)" required>
                    <Input
                      id="ch-num"
                      type="number"
                      min={1}
                      max={18}
                      value={chNum}
                      onChange={(e) => setChNum(Number(e.target.value))}
                      required
                    />
                  </FormField>
                  <FormField id="ch-vc" label="Chapter Verse Count" required>
                    <Input
                      id="ch-vc"
                      type="number"
                      min={1}
                      max={200}
                      value={chVerseCount}
                      onChange={(e) => setChVerseCount(Number(e.target.value))}
                      required
                    />
                  </FormField>
                </div>
                <FormField id="ch-sa" label="Sanskrit Title (Devanāgarī)" required>
                  <Input
                    id="ch-sa"
                    value={chSanskrit}
                    onChange={(e) => setChSanskrit(e.target.value)}
                    required
                  />
                </FormField>
                <FormField id="ch-iast" label="IAST Transliteration Title" required>
                  <Input
                    id="ch-iast"
                    value={chIast}
                    onChange={(e) => setChIast(e.target.value)}
                    required
                  />
                </FormField>
                <FormField id="ch-en" label="English Title" required>
                  <Input
                    id="ch-en"
                    value={chEnglish}
                    onChange={(e) => setChEnglish(e.target.value)}
                    required
                  />
                </FormField>
                <FormField id="ch-sum" label="Chapter Summary" required>
                  <Textarea
                    id="ch-sum"
                    rows={3}
                    value={chSummary}
                    onChange={(e) => setChSummary(e.target.value)}
                    required
                  />
                </FormField>
                <FormField
                  id="ch-tags"
                  label="Theme Tags (comma separated)"
                >
                  <Input
                    id="ch-tags"
                    value={chTags}
                    onChange={(e) => setChTags(e.target.value)}
                    placeholder="karma-yoga, equanimity"
                  />
                </FormField>
                <Button type="submit" variant="primary" disabled={busy}>
                  Save Chapter Metadata
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Populated Chapters ({chapters.length}/18)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {chapters.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No chapters populated yet.
                </p>
              ) : (
                chapters.map((ch) => (
                  <div
                    key={ch.chapter_number}
                    className="rounded-[12px] border border-sandalwood-border bg-ivory p-3.5 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-ink">
                        Ch. {ch.chapter_number}: {ch.english_title}
                      </p>
                      <Badge variant="neutral">{ch.verse_count} verses</Badge>
                    </div>
                    <p className="font-devanagari text-sm text-peacock-ink">
                      {ch.sanskrit_title}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setChNum(ch.chapter_number);
                        setChSanskrit(ch.sanskrit_title);
                        setChIast(ch.transliteration_title);
                        setChEnglish(ch.english_title);
                        setChSummary(ch.summary);
                        setChVerseCount(ch.verse_count);
                        setChTags(ch.theme_tags.join(", "));
                      }}
                    >
                      Edit Chapter
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Verses */}
      {tab === "verses" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                {editingVerseId ? "Edit Verse" : "Ingest / Publish Verse"}
              </CardTitle>
              <CardDescription>
                New verses default to Pending Review until verified and approved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveVerse} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField id="v-ch" label="Chapter" required>
                    <Input
                      id="v-ch"
                      type="number"
                      min={1}
                      max={18}
                      value={vChapter}
                      onChange={(e) => setVChapter(Number(e.target.value))}
                      required
                    />
                  </FormField>
                  <FormField id="v-num" label="Verse" required>
                    <Input
                      id="v-num"
                      type="number"
                      min={1}
                      max={200}
                      value={vNumber}
                      onChange={(e) => setVNumber(Number(e.target.value))}
                      required
                    />
                  </FormField>
                  <FormField id="v-status" label="Review Status">
                    <Select
                      id="v-status"
                      value={vStatus}
                      onChange={(e) =>
                        setVStatus(e.target.value as ContentReviewStatus)
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="pending_review">Pending review</option>
                      <option value="approved">Approved</option>
                      <option value="needs_correction">Needs correction</option>
                    </Select>
                  </FormField>
                </div>

                <FormField id="v-src" label="Sanskrit Edition Source (Optional)">
                  <Select
                    id="v-src"
                    value={vSourceId}
                    onChange={(e) => setVSourceId(e.target.value)}
                  >
                    <option value="">No source linked</option>
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({s.review_status})
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField
                  id="v-sa"
                  label="Sanskrit (Devanāgarī)"
                  required
                >
                  <Textarea
                    id="v-sa"
                    rows={3}
                    value={vSanskrit}
                    onChange={(e) => setVSanskrit(e.target.value)}
                    required
                  />
                </FormField>

                <FormField id="v-iast" label="IAST Transliteration" required>
                  <Textarea
                    id="v-iast"
                    rows={3}
                    value={vIast}
                    onChange={(e) => setVIast(e.target.value)}
                    required
                  />
                </FormField>

                <FormField
                  id="v-words"
                  label="Word-by-Word JSON (Optional)"
                  hint='Example: [{"sanskrit":"योगः","transliteration":"yogaḥ","meaning":"equanimity"}]'
                >
                  <Textarea
                    id="v-words"
                    rows={2}
                    value={vWordJson}
                    onChange={(e) => setVWordJson(e.target.value)}
                  />
                </FormField>

                <div className="flex gap-2">
                  <Button type="submit" variant="primary" disabled={busy}>
                    {editingVerseId ? "Update Verse" : "Save Verse"}
                  </Button>
                  {editingVerseId && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditingVerseId(null)}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Verse Registry ({verses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
              {verses.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No verses entered yet. Ensure the chapter exists first.
                </p>
              ) : (
                verses.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-[12px] border border-sandalwood-border bg-ivory p-3 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-ink tabular-nums">
                        BG {v.verse_ref}
                      </span>
                      <Badge variant={REVIEW_BADGE[v.review_status]}>
                        {v.review_status}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 font-devanagari text-sm text-ink">
                      {v.sanskrit_devanagari}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingVerseId(v.id);
                          setVChapter(v.chapter_number);
                          setVNumber(v.verse_number);
                          setVSanskrit(v.sanskrit_devanagari);
                          setVIast(v.transliteration_iast);
                          setVSourceId(v.source_id ?? "");
                          setVStatus(v.review_status);
                          setVWordJson(
                            v.word_by_word ? JSON.stringify(v.word_by_word) : ""
                          );
                        }}
                      >
                        Edit / Review
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          runApi(
                            "/api/gita/admin/verses",
                            "DELETE",
                            { id: v.id },
                            `Verse ${v.verse_ref} deleted.`
                          )
                        }
                      >
                        <Trash2 className="size-3.5" aria-hidden={true} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: Translations */}
      {tab === "translations" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                {editingTranslationId
                  ? "Edit Translation"
                  : "Add Attributed Translation"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveTranslation} className="space-y-3">
                <FormField id="tr-verse" label="Target Verse" required>
                  <Select
                    id="tr-verse"
                    value={trVerseId}
                    onChange={(e) => setTrVerseId(e.target.value)}
                    required
                  >
                    <option value="">Select verse...</option>
                    {verses.map((v) => (
                      <option key={v.id} value={v.id}>
                        BG {v.verse_ref} ({v.review_status})
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField
                  id="tr-source"
                  label="Attributed Translator & License Source"
                  required
                >
                  <Select
                    id="tr-source"
                    value={trSourceId}
                    onChange={(e) => setTrSourceId(e.target.value)}
                    required
                  >
                    <option value="">Select source...</option>
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.author_or_translator} — {s.title} ({s.license_name})
                      </option>
                    ))}
                  </Select>
                </FormField>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField id="tr-lang" label="Language Code" required>
                    <Input
                      id="tr-lang"
                      value={trLang}
                      onChange={(e) => setTrLang(e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField id="tr-status" label="Review Status">
                    <Select
                      id="tr-status"
                      value={trStatus}
                      onChange={(e) =>
                        setTrStatus(e.target.value as ContentReviewStatus)
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="pending_review">Pending review</option>
                      <option value="approved">Approved</option>
                      <option value="needs_correction">Needs correction</option>
                    </Select>
                  </FormField>
                </div>

                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={trPrimary}
                    onChange={(e) => setTrPrimary(e.target.checked)}
                    className="size-4 accent-peacock-deep"
                  />
                  <span>Mark as primary translation for this language</span>
                </label>

                <FormField id="tr-text" label="Translation Text" required>
                  <Textarea
                    id="tr-text"
                    rows={4}
                    value={trText}
                    onChange={(e) => setTrText(e.target.value)}
                    required
                  />
                </FormField>

                <div className="flex gap-2">
                  <Button type="submit" variant="primary" disabled={busy}>
                    {editingTranslationId
                      ? "Update Translation"
                      : "Save Translation"}
                  </Button>
                  {editingTranslationId && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditingTranslationId(null)}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Translations ({translations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
              {translations.map((t) => {
                const v = verseById.get(t.verse_id);
                return (
                  <div
                    key={t.id}
                    className="rounded-[12px] border border-sandalwood-border bg-ivory p-3 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-ink tabular-nums">
                        BG {v?.verse_ref ?? "?"} ·{" "}
                        {t.source?.author_or_translator ?? "Unknown source"}
                      </span>
                      <Badge variant={REVIEW_BADGE[t.review_status]}>
                        {t.review_status}
                      </Badge>
                    </div>
                    <p className="line-clamp-3 text-ink-muted">
                      {t.translation_text}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingTranslationId(t.id);
                          setTrVerseId(t.verse_id);
                          setTrSourceId(t.source_id);
                          setTrLang(t.language_code);
                          setTrText(t.translation_text);
                          setTrPrimary(t.is_primary);
                          setTrStatus(t.review_status);
                        }}
                      >
                        Edit / Review
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          runApi(
                            "/api/gita/admin/translations",
                            "DELETE",
                            { id: t.id },
                            "Translation deleted."
                          )
                        }
                      >
                        <Trash2 className="size-3.5" aria-hidden={true} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: Explanations & Commentary */}
      {tab === "explanations" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                {editingExplanationId
                  ? "Edit Commentary"
                  : "Add Verse Explanation"}
              </CardTitle>
              <CardDescription>
                AI-assisted explanations require explicit human review
                confirmation before publication and are always marked separately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveExplanation} className="space-y-3">
                <FormField id="exp-verse" label="Target Verse" required>
                  <Select
                    id="exp-verse"
                    value={expVerseId}
                    onChange={(e) => setExpVerseId(e.target.value)}
                    required
                  >
                    <option value="">Select verse...</option>
                    {verses.map((v) => (
                      <option key={v.id} value={v.id}>
                        BG {v.verse_ref} ({v.review_status})
                      </option>
                    ))}
                  </Select>
                </FormField>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField id="exp-source" label="Commentary Source (Optional)">
                    <Select
                      id="exp-source"
                      value={expSourceId}
                      onChange={(e) => setExpSourceId(e.target.value)}
                    >
                      <option value="">No external source</option>
                      {sources.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.author_or_translator} — {s.title}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField id="exp-status" label="Review Status">
                    <Select
                      id="exp-status"
                      value={expStatus}
                      onChange={(e) =>
                        setExpStatus(e.target.value as ContentReviewStatus)
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="pending_review">Pending review</option>
                      <option value="approved">Approved</option>
                      <option value="needs_correction">Needs correction</option>
                    </Select>
                  </FormField>
                </div>

                <FormField id="exp-title" label="Section Heading (Optional)">
                  <Input
                    id="exp-title"
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    placeholder="Context & Contemplation"
                  />
                </FormField>

                <FormField id="exp-text" label="Explanation Text" required>
                  <Textarea
                    id="exp-text"
                    rows={5}
                    value={expText}
                    onChange={(e) => setExpText(e.target.value)}
                    required
                  />
                </FormField>

                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={expAiAssisted}
                    onChange={(e) => setExpAiAssisted(e.target.checked)}
                    className="size-4 accent-peacock-deep"
                  />
                  <span>Mark as AI-assisted draft / study aid</span>
                </label>

                {expAiAssisted && (
                  <label className="flex items-start gap-2 rounded-[10px] border border-gold-border/40 bg-gold-wash p-3 text-xs text-ink">
                    <input
                      type="checkbox"
                      checked={expHumanConfirmed}
                      onChange={(e) => setExpHumanConfirmed(e.target.checked)}
                      className="mt-0.5 size-4 accent-peacock-deep"
                    />
                    <span>
                      I confirm a human scholar/administrator reviewed this
                      AI-assisted explanation for accuracy and non-authoritative
                      labeling before approval.
                    </span>
                  </label>
                )}

                <div className="flex gap-2">
                  <Button type="submit" variant="primary" disabled={busy}>
                    {editingExplanationId
                      ? "Update Explanation"
                      : "Save Explanation"}
                  </Button>
                  {editingExplanationId && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditingExplanationId(null)}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Explanations ({explanations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
              {explanations.map((exp) => {
                const v = verseById.get(exp.verse_id);
                return (
                  <div
                    key={exp.id}
                    className="rounded-[12px] border border-sandalwood-border bg-ivory p-3 text-xs space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-ink tabular-nums">
                        BG {v?.verse_ref ?? "?"}
                        {exp.title ? ` · ${exp.title}` : ""}
                      </span>
                      <div className="flex gap-1.5">
                        {exp.is_ai_assisted && (
                          <Badge variant="gold">AI-assisted</Badge>
                        )}
                        <Badge variant={REVIEW_BADGE[exp.review_status]}>
                          {exp.review_status}
                        </Badge>
                      </div>
                    </div>
                    <p className="line-clamp-3 text-ink-muted">
                      {exp.explanation_text}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingExplanationId(exp.id);
                          setExpVerseId(exp.verse_id);
                          setExpSourceId(exp.source_id ?? "");
                          setExpTitle(exp.title ?? "");
                          setExpText(exp.explanation_text);
                          setExpAiAssisted(exp.is_ai_assisted);
                          setExpHumanConfirmed(Boolean(exp.reviewed_by));
                          setExpStatus(exp.review_status);
                        }}
                      >
                        Edit / Review
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          runApi(
                            "/api/gita/admin/explanations",
                            "DELETE",
                            { id: exp.id },
                            "Explanation deleted."
                          )
                        }
                      >
                        <Trash2 className="size-3.5" aria-hidden={true} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 6: Feedback Queue & Audit Logs */}
      {tab === "feedback" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Reader Correction Reports ({feedback.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedback.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No correction feedback submitted yet.
                </p>
              ) : (
                feedback.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-[12px] border border-sandalwood-border bg-ivory p-3.5 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold capitalize text-ink">
                        {f.category.replaceAll("_", " ")}
                      </span>
                      <Badge
                        variant={
                          f.status === "resolved"
                            ? "peacock"
                            : f.status === "declined"
                              ? "kumkum"
                              : "gold"
                        }
                      >
                        {f.status}
                      </Badge>
                    </div>
                    <p className="text-ink">{f.message}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          handleUpdateFeedback(
                            f.id,
                            "resolved",
                            "Verified and updated by scripture administrator."
                          )
                        }
                      >
                        Mark Resolved
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          handleUpdateFeedback(
                            f.id,
                            "declined",
                            "Reviewed; current verified source retained."
                          )
                        }
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card surface="parchment">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Scripture CMS Audit Log
              </CardTitle>
              <CardDescription>
                Immutable PostgreSQL audit entries recorded automatically on every
                CMS mutation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[540px] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No CMS audit entries logged yet.
                </p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between gap-2 rounded-[10px] border border-sandalwood-border bg-ivory px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-medium text-ink">
                        {log.action}
                      </span>{" "}
                      <span className="text-ink-muted">
                        on {log.target_table}
                      </span>
                    </div>
                    <span className="text-ink-muted tabular-nums">
                      {log.created_at.slice(0, 16).replace("T", " ")}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

