"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  FolderPlus,
  Lock,
  MessageSquarePlus,
  Trash2,
} from "lucide-react";
import { ManuscriptDivider } from "@/components/sacred/ornaments";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import type {
  GitaChapter,
  GitaChapterSlot,
  GitaNavReference,
  GitaNoteItem,
  GitaVerseBundle,
} from "@/lib/gita/domain";
import type { GitaViewerContext } from "@/lib/gita/queries";
import type { FeedbackCategory } from "@/lib/gita/validation";
import { GitaChapterNavigator } from "./chapter-navigator";

export interface GitaVerseReaderProps {
  viewer: GitaViewerContext | null;
  chapter: GitaChapter | null;
  chapterSlots: GitaChapterSlot[];
  bundle: GitaVerseBundle;
  chapterVerseRefs: GitaNavReference[];
  previousVerse: GitaNavReference | null;
  nextVerse: GitaNavReference | null;
  initialBookmarked: boolean;
  initialRead: boolean;
  initialNote: GitaNoteItem | null;
  initialCollections: Array<{ id: string; title: string; containsVerse: boolean }>;
}

const FEEDBACK_LABELS: Record<FeedbackCategory, string> = {
  sanskrit_typo: "Sanskrit / Devanāgarī Typo",
  transliteration: "IAST Transliteration",
  translation_accuracy: "Translation Accuracy",
  attribution: "Source / License Attribution",
  respectful_tone: "Tone & Clarity",
  other: "Other Suggestion",
};

export function GitaVerseReader({
  viewer,
  chapter,
  chapterSlots,
  bundle,
  chapterVerseRefs,
  previousVerse,
  nextVerse,
  initialBookmarked,
  initialRead,
  initialNote,
  initialCollections,
}: GitaVerseReaderProps) {
  const router = useRouter();
  const { verse, verseSource, translations, explanations } = bundle;

  const [selectedTranslationId, setSelectedTranslationId] = React.useState<
    string
  >(translations[0]?.id ?? "");
  const [isBookmarked, setIsBookmarked] = React.useState(initialBookmarked);
  const [bookmarkBusy, setBookmarkBusy] = React.useState(false);
  const [isRead, setIsRead] = React.useState(initialRead);
  const [noteText, setNoteText] = React.useState(initialNote?.note_text ?? "");
  const [savedNoteText, setSavedNoteText] = React.useState(
    initialNote?.note_text ?? ""
  );
  const [noteBusy, setNoteBusy] = React.useState(false);
  const [noteFeedback, setNoteFeedback] = React.useState<string | null>(null);

  const [collections, setCollections] = React.useState(initialCollections);
  const [newCollectionTitle, setNewCollectionTitle] = React.useState("");
  const [collectionBusy, setCollectionBusy] = React.useState(false);

  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const [feedbackCategory, setFeedbackCategory] =
    React.useState<FeedbackCategory>("sanskrit_typo");
  const [feedbackMessage, setFeedbackMessage] = React.useState("");
  const [feedbackStatusMsg, setFeedbackStatusMsg] = React.useState<
    string | null
  >(null);
  const [feedbackBusy, setFeedbackBusy] = React.useState(false);

  const [statusError, setStatusError] = React.useState<string | null>(null);

  // Record reading history once on mount for signed-in reader
  React.useEffect(() => {
    if (!viewer) return;
    let cancelled = false;
    void fetch("/api/gita/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verseId: verse.id }),
    })
      .then((res) => {
        if (res.ok && !cancelled) {
          setIsRead(true);
        }
      })
      .catch(() => {
        // Non-blocking history tracking
      });
    return () => {
      cancelled = true;
    };
  }, [viewer, verse.id]);

  // Keyboard navigation between previous/next verses
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && previousVerse) {
        router.push(
          `/gita/${previousVerse.chapter_number}/${previousVerse.verse_number}`
        );
      } else if (e.key === "ArrowRight" && nextVerse) {
        router.push(
          `/gita/${nextVerse.chapter_number}/${nextVerse.verse_number}`
        );
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previousVerse, nextVerse, router]);

  const activeTranslation =
    translations.find((t) => t.id === selectedTranslationId) ??
    translations[0] ??
    null;

  async function toggleBookmark() {
    if (!viewer || bookmarkBusy) return;
    setBookmarkBusy(true);
    setStatusError(null);
    const nextState = !isBookmarked;
    try {
      const res = await fetch("/api/gita/bookmarks", {
        method: nextState ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verseId: verse.id }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setStatusError(json.error ?? "Unable to update bookmark.");
      } else {
        setIsBookmarked(nextState);
        router.refresh();
      }
    } catch {
      setStatusError("Network error while updating bookmark.");
    } finally {
      setBookmarkBusy(false);
    }
  }

  async function savePersonalNote(e: React.FormEvent) {
    e.preventDefault();
    if (!viewer || noteBusy) return;
    setNoteBusy(true);
    setNoteFeedback(null);
    setStatusError(null);
    try {
      const res = await fetch("/api/gita/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verseId: verse.id, noteText }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setStatusError(json.error ?? "Unable to save note.");
      } else {
        setSavedNoteText(noteText.trim());
        setNoteFeedback("Private note saved.");
        router.refresh();
      }
    } catch {
      setStatusError("Network error while saving note.");
    } finally {
      setNoteBusy(false);
    }
  }

  async function deletePersonalNote() {
    if (!viewer || noteBusy) return;
    setNoteBusy(true);
    setNoteFeedback(null);
    setStatusError(null);
    try {
      const res = await fetch("/api/gita/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verseId: verse.id }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setStatusError(json.error ?? "Unable to delete note.");
      } else {
        setNoteText("");
        setSavedNoteText("");
        setNoteFeedback("Personal note deleted.");
        router.refresh();
      }
    } catch {
      setStatusError("Network error while deleting note.");
    } finally {
      setNoteBusy(false);
    }
  }

  async function toggleCollectionMembership(
    collectionId: string,
    currentlyIncluded: boolean
  ) {
    if (!viewer || collectionBusy) return;
    setCollectionBusy(true);
    setStatusError(null);
    try {
      const res = await fetch("/api/gita/collections/items", {
        method: currentlyIncluded ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId, verseId: verse.id }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setStatusError(json.error ?? "Unable to update collection.");
      } else {
        setCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId
              ? { ...c, containsVerse: !currentlyIncluded }
              : c
          )
        );
        router.refresh();
      }
    } catch {
      setStatusError("Network error updating collection.");
    } finally {
      setCollectionBusy(false);
    }
  }

  async function handleQuickCreateCollection(e: React.FormEvent) {
    e.preventDefault();
    const title = newCollectionTitle.trim();
    if (!viewer || !title || collectionBusy) return;
    setCollectionBusy(true);
    setStatusError(null);
    try {
      const createRes = await fetch("/api/gita/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const createJson = (await createRes.json()) as {
        error?: string;
        collection?: { id: string; title: string };
      };
      if (!createRes.ok || !createJson.collection) {
        setStatusError(createJson.error ?? "Unable to create collection.");
        return;
      }

      const addRes = await fetch("/api/gita/collections/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId: createJson.collection.id,
          verseId: verse.id,
        }),
      });
      if (addRes.ok) {
        setCollections((prev) => [
          {
            id: createJson.collection!.id,
            title: createJson.collection!.title,
            containsVerse: true,
          },
          ...prev,
        ]);
        setNewCollectionTitle("");
        router.refresh();
      }
    } catch {
      setStatusError("Network error creating collection.");
    } finally {
      setCollectionBusy(false);
    }
  }

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!viewer || feedbackBusy) return;
    setFeedbackBusy(true);
    setFeedbackStatusMsg(null);
    try {
      const res = await fetch("/api/gita/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verseId: verse.id,
          translationId: activeTranslation?.id ?? null,
          category: feedbackCategory,
          message: feedbackMessage,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedbackStatusMsg(json.error ?? "Unable to submit feedback.");
      } else {
        setFeedbackMessage("");
        setFeedbackStatusMsg(
          "Thank you. Your suggestion has been queued for human review."
        );
      }
    } catch {
      setFeedbackStatusMsg("Network error submitting correction report.");
    } finally {
      setFeedbackBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
      <GitaChapterNavigator
        chapterSlots={chapterSlots}
        activeChapter={verse.chapter_number}
        compact={true}
      />

      {/* Breadcrumb & Prev/Next Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sandalwood-border pb-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href={`/gita/${verse.chapter_number}`}
            className="font-medium text-peacock-ink hover:underline"
          >
            Chapter {verse.chapter_number}
            {chapter ? `: ${chapter.english_title}` : ""}
          </Link>
          <span className="text-ink-muted">/</span>
          <span className="font-semibold text-ink tabular-nums">
            Verse {verse.verse_ref}
          </span>
          {isRead && (
            <Badge variant="peacock">
              <CheckCircle2 className="size-3" aria-hidden={true} />
              <span>Read</span>
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {previousVerse ? (
            <Link
              href={`/gita/${previousVerse.chapter_number}/${previousVerse.verse_number}`}
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <ArrowLeft className="size-4" aria-hidden={true} />
              <span>Prev ({previousVerse.verse_ref})</span>
            </Link>
          ) : (
            <span className="text-xs text-ink-muted">Start of published verses</span>
          )}
          {nextVerse && (
            <Link
              href={`/gita/${nextVerse.chapter_number}/${nextVerse.verse_number}`}
              className={buttonStyles({ variant: "primary", size: "sm" })}
            >
              <span>Next ({nextVerse.verse_ref})</span>
              <ArrowRight className="size-4" aria-hidden={true} />
            </Link>
          )}
        </div>
      </div>

      {/* Verse Jump Ribbon within Current Chapter */}
      {chapterVerseRefs.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-ink-muted">
            Chapter {verse.chapter_number} verses:
          </span>
          {chapterVerseRefs.map((ref) => {
            const active = ref.verse_number === verse.verse_number;
            return (
              <Link
                key={ref.verse_ref}
                href={`/gita/${ref.chapter_number}/${ref.verse_number}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-8 min-w-10 items-center justify-center rounded-[8px] border px-2 text-xs font-medium tabular-nums transition-colors ${
                  active
                    ? "border-gold-antique bg-krishna-midnight text-ink-on-dark"
                    : "border-sandalwood-border bg-paper text-ink hover:bg-linen"
                }`}
              >
                {ref.verse_ref}
              </Link>
            );
          })}
        </div>
      )}

      {statusError && (
        <div
          role="alert"
          className="rounded-[12px] border border-kumkum/30 bg-kumkum-wash px-4 py-3 text-sm text-kumkum"
        >
          {statusError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left / Primary Reading Column (Strictly Separated Scripture Layers) */}
        <div className="space-y-6 lg:col-span-2">
          {/* 1. Original Sanskrit (Devanagari) */}
          <Card surface="sanctum">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="sanctum">
                  Original Sanskrit · Bhagavad Gītā {verse.verse_ref}
                </Badge>
                {verseSource && (
                  <span className="text-xs text-ink-muted-dark">
                    Sanskrit Edition: {verseSource.title} ({verseSource.license_name})
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <p
                lang="sa"
                className="font-devanagari text-2xl leading-[1.95] whitespace-pre-line text-ink-on-dark sm:text-3xl"
              >
                {verse.sanskrit_devanagari}
              </p>

              {/* 2. IAST Transliteration */}
              <div className="border-t border-gold-antique/25 pt-4">
                <p className="text-xs font-medium tracking-wider uppercase text-gold-antique">
                  IAST Transliteration
                </p>
                <p className="mt-2 font-serif text-base italic leading-relaxed whitespace-pre-line text-ink-muted-dark sm:text-lg">
                  {verse.transliteration_iast}
                </p>
              </div>

              {verse.word_by_word && verse.word_by_word.length > 0 && (
                <div className="border-t border-gold-antique/25 pt-4">
                  <p className="mb-2.5 text-xs font-medium tracking-wider uppercase text-gold-antique">
                    Word-by-Word Analysis
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {verse.word_by_word.map((item, idx) => (
                      <div
                        key={`${item.sanskrit}-${idx}`}
                        className="rounded-[10px] border border-gold-antique/20 bg-krishna-elevated/75 px-3 py-2 text-xs"
                      >
                        <p className="font-devanagari text-sm text-ink-on-dark">
                          {item.sanskrit}
                          {item.transliteration ? (
                            <span className="ml-1.5 font-serif italic text-gold-antique">
                              ({item.transliteration})
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-ink-muted-dark">
                          {item.meaning}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Attributed Translations */}
          <Card surface="parchment">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium tracking-wider uppercase text-peacock-ink">
                    Attributed Translation
                  </p>
                  <CardTitle className="mt-1 font-display text-2xl">
                    Verified English Rendering
                  </CardTitle>
                </div>
                {translations.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {translations.map((tr) => (
                      <button
                        key={tr.id}
                        type="button"
                        onClick={() => setSelectedTranslationId(tr.id)}
                        className={`min-h-9 cursor-pointer rounded-full border px-3 text-xs font-medium transition-colors ${
                          activeTranslation?.id === tr.id
                            ? "border-peacock-deep bg-peacock-deep text-ink-on-dark"
                            : "border-sandalwood-border bg-linen text-ink hover:bg-ivory"
                        }`}
                      >
                        {tr.source?.author_or_translator ?? tr.language_code}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {activeTranslation ? (
                <div className="space-y-4">
                  <blockquote className="font-serif text-lg leading-relaxed whitespace-pre-line text-ink">
                    {activeTranslation.translation_text}
                  </blockquote>

                  {activeTranslation.source && (
                    <div className="rounded-[12px] border border-sandalwood-border bg-linen p-4 text-xs leading-relaxed text-ink-muted">
                      <p className="font-semibold text-ink">
                        Source &amp; License Attribution
                      </p>
                      <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                        <div>
                          <dt className="inline font-medium text-ink">
                            Translator:{" "}
                          </dt>
                          <dd className="inline">
                            {activeTranslation.source.author_or_translator}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline font-medium text-ink">
                            Edition:{" "}
                          </dt>
                          <dd className="inline">
                            {activeTranslation.source.title}
                          </dd>
                        </div>
                        {activeTranslation.source.tradition_or_lineage && (
                          <div>
                            <dt className="inline font-medium text-ink">
                              Lineage:{" "}
                            </dt>
                            <dd className="inline">
                              {activeTranslation.source.tradition_or_lineage}
                            </dd>
                          </div>
                        )}
                        <div>
                          <dt className="inline font-medium text-ink">
                            License:{" "}
                          </dt>
                          <dd className="inline">
                            {activeTranslation.source.license_url ? (
                              <a
                                href={activeTranslation.source.license_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-peacock-ink underline"
                              >
                                {activeTranslation.source.license_name}
                              </a>
                            ) : (
                              activeTranslation.source.license_name
                            )}
                          </dd>
                        </div>
                      </dl>
                      <p className="mt-2 border-t border-sandalwood-border/70 pt-2 text-ink-muted">
                        {activeTranslation.source.attribution_text}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-ink-muted">
                  No approved translation is published for this verse yet. Only
                  human-reviewed, properly licensed translations are displayed.
                </p>
              )}
            </CardContent>
          </Card>

          <ManuscriptDivider />

          {/* 4. Verse-by-Verse Explanations / Commentary (Strictly Separated from Scripture) */}
          <Card surface="linen">
            <CardHeader>
              <p className="text-xs font-medium tracking-wider uppercase text-gold-ink">
                Commentary &amp; Study Explanation
              </p>
              <CardTitle className="mt-1 font-display text-2xl">
                Human-Reviewed Reflections
              </CardTitle>
              <CardDescription>
                Explanations remain clearly separated from canonical Sanskrit and
                verified translations. AI-assisted study notes are always labeled
                and never presented as scriptural authority.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {explanations.length > 0 ? (
                explanations.map((exp) => (
                  <article
                    key={exp.id}
                    className="rounded-[12px] border border-sandalwood-border bg-paper p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-serif text-base font-semibold text-ink">
                        {exp.title ?? "Study Explanation"}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {exp.is_ai_assisted ? (
                          <Badge variant="gold">
                            <AlertTriangle
                              className="size-3"
                              aria-hidden={true}
                            />
                            <span>
                              AI-Assisted · Human Reviewed · Not Authoritative Scripture
                            </span>
                          </Badge>
                        ) : (
                          <Badge variant="peacock">
                            <span>Attributed Commentary</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed whitespace-pre-line text-ink">
                      {exp.explanation_text}
                    </p>

                    {exp.source && (
                      <p className="border-t border-sandalwood-border/60 pt-2 text-xs text-ink-muted">
                        Commentator / Source:{" "}
                        <span className="font-medium text-ink">
                          {exp.source.author_or_translator}
                        </span>{" "}
                        · {exp.source.title} ({exp.source.license_name})
                      </p>
                    )}
                  </article>
                ))
              ) : (
                <p className="text-sm text-ink-muted">
                  No approved commentary is published for Bhagavad Gītā{" "}
                  {verse.verse_ref} yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right / Personal Study Column */}
        <aside className="space-y-5">
          {viewer ? (
            <>
              <Card surface="parchment">
                <CardHeader>
                  <CardTitle className="font-display text-xl">
                    Personal Study Controls
                  </CardTitle>
                  <CardDescription>
                    Bookmarks, notes, and collections are private to your account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    type="button"
                    variant={isBookmarked ? "gold" : "secondary"}
                    className="w-full"
                    disabled={bookmarkBusy}
                    onClick={toggleBookmark}
                  >
                    <Bookmark className="size-4" aria-hidden={true} />
                    <span>
                      {bookmarkBusy
                        ? "Updating..."
                        : isBookmarked
                          ? "Bookmarked (Remove)"
                          : "Bookmark Verse"}
                    </span>
                  </Button>

                  <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                      >
                        <MessageSquarePlus
                          className="size-4"
                          aria-hidden={true}
                        />
                        <span>Suggest correction / attribution fix</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      title={`Report Issue — BG ${verse.verse_ref}`}
                      description="Flag Devanāgarī typos, IAST diacritic fixes, attribution details, or translation accuracy concerns for administrator review."
                    >
                      <form onSubmit={submitFeedback} className="space-y-4">
                        <FormField id="feedback-cat" label="Category" required>
                          <Select
                            id="feedback-cat"
                            value={feedbackCategory}
                            onChange={(e) =>
                              setFeedbackCategory(
                                e.target.value as FeedbackCategory
                              )
                            }
                          >
                            {Object.entries(FEEDBACK_LABELS).map(
                              ([val, label]) => (
                                <option key={val} value={val}>
                                  {label}
                                </option>
                              )
                            )}
                          </Select>
                        </FormField>
                        <FormField
                          id="feedback-msg"
                          label="Suggested Correction"
                          required
                        >
                          <Textarea
                            id="feedback-msg"
                            rows={4}
                            value={feedbackMessage}
                            onChange={(e) => setFeedbackMessage(e.target.value)}
                            placeholder="Share the exact character, reference, or attribution note..."
                            required
                          />
                        </FormField>
                        {feedbackStatusMsg && (
                          <p className="text-xs font-medium text-peacock-ink">
                            {feedbackStatusMsg}
                          </p>
                        )}
                        <div className="flex justify-end gap-2">
                          <Button
                            type="submit"
                            variant="primary"
                            disabled={feedbackBusy}
                          >
                            {feedbackBusy ? "Submitting..." : "Submit Report"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              {/* Private Personal Note */}
              <Card surface="parchment">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="font-display text-xl">
                      Private Study Note
                    </CardTitle>
                    <Badge variant="neutral">
                      <Lock className="size-3" aria-hidden={true} />
                      <span>Private</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={savePersonalNote} className="space-y-3">
                    <Textarea
                      aria-label={`Private note for Bhagavad Gita ${verse.verse_ref}`}
                      rows={5}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Write personal contemplations, cross-references, or reflections on this verse..."
                    />
                    {noteFeedback && (
                      <p className="text-xs font-medium text-peacock-ink">
                        {noteFeedback}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={noteBusy || noteText.trim().length === 0}
                      >
                        {noteBusy ? "Saving..." : "Save Note"}
                      </Button>
                      {savedNoteText && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={noteBusy}
                          onClick={deletePersonalNote}
                        >
                          <Trash2 className="size-3.5" aria-hidden={true} />
                          <span>Delete</span>
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Personal Collections */}
              <Card surface="parchment">
                <CardHeader>
                  <CardTitle className="font-display text-xl">
                    Save to Collection
                  </CardTitle>
                  <CardDescription>
                    Organize verified verses into personal thematic study lists.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {collections.length > 0 ? (
                    <div className="space-y-2">
                      {collections.map((col) => (
                        <label
                          key={col.id}
                          className="flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-[10px] border border-sandalwood-border bg-ivory px-3 py-2 text-sm"
                        >
                          <span className="truncate font-medium text-ink">
                            {col.title}
                          </span>
                          <input
                            type="checkbox"
                            checked={col.containsVerse}
                            disabled={collectionBusy}
                            onChange={() =>
                              toggleCollectionMembership(
                                col.id,
                                col.containsVerse
                              )
                            }
                            className="size-4 accent-peacock-deep"
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-ink-muted">
                      You have not created any collections yet.
                    </p>
                  )}

                  <form
                    onSubmit={handleQuickCreateCollection}
                    className="flex gap-2 border-t border-sandalwood-border pt-3"
                  >
                    <Input
                      value={newCollectionTitle}
                      onChange={(e) => setNewCollectionTitle(e.target.value)}
                      placeholder="New collection name..."
                      aria-label="New collection title"
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      size="md"
                      disabled={
                        collectionBusy || newCollectionTitle.trim().length === 0
                      }
                      aria-label="Create collection and add verse"
                    >
                      <FolderPlus className="size-4" aria-hidden={true} />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card surface="linen">
              <CardHeader>
                <CardTitle className="font-display text-xl">
                  Personal Study Tools
                </CardTitle>
                <CardDescription>
                  Sign in to bookmark verses, keep private study notes, build
                  collections, and track reading progress across chapters.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/auth?next=${encodeURIComponent(
                    `/gita/${verse.chapter_number}/${verse.verse_number}`
                  )}`}
                  className={buttonStyles({
                    variant: "primary",
                    size: "md",
                    className: "w-full",
                  })}
                >
                  Sign in to keep study notes
                </Link>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

