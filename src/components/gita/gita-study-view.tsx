"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Clock,
  FileText,
  FolderPlus,
  Lock,
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
import { ProgressBar } from "@/components/ui/progress";
import type {
  GitaBookmarkItem,
  GitaChapterSlot,
  GitaCollectionRecord,
  GitaFeedbackRecord,
  GitaNoteItem,
  GitaReadingHistoryItem,
} from "@/lib/gita/domain";
import type { GitaViewerContext } from "@/lib/gita/queries";

export interface GitaStudyViewProps {
  viewer: GitaViewerContext;
  chapterSlots: GitaChapterSlot[];
  totalPublishedVerses: number;
  totalReadVerses: number;
  overallProgressPct: number;
  bookmarks: GitaBookmarkItem[];
  notes: GitaNoteItem[];
  history: GitaReadingHistoryItem[];
  collections: GitaCollectionRecord[];
  feedback: GitaFeedbackRecord[];
  approvedVerseOptions: Array<{
    id: string;
    verse_ref: string;
    chapter_number: number;
    verse_number: number;
  }>;
}

export function GitaStudyView({
  viewer,
  chapterSlots,
  totalPublishedVerses,
  totalReadVerses,
  overallProgressPct,
  bookmarks,
  notes,
  history,
  collections,
  feedback,
  approvedVerseOptions,
}: GitaStudyViewProps) {
  const router = useRouter();
  const [newColTitle, setNewColTitle] = React.useState("");
  const [newColDesc, setNewColDesc] = React.useState("");
  const [selectedAddVerse, setSelectedAddVerse] = React.useState<
    Record<string, string>
  >({});
  const [busy, setBusy] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  async function removeBookmark(verseId: string) {
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/gita/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verseId }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setErrorMsg(j.error ?? "Unable to remove bookmark.");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteNote(verseId: string) {
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/gita/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verseId }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setErrorMsg(j.error ?? "Unable to delete note.");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function createCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!newColTitle.trim() || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/gita/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newColTitle,
          description: newColDesc || null,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMsg(j.error ?? "Unable to create collection.");
      } else {
        setNewColTitle("");
        setNewColDesc("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteCollection(id: string) {
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/gita/collections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setErrorMsg(j.error ?? "Unable to delete collection.");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function addVerseToCollection(collectionId: string) {
    const verseId =
      selectedAddVerse[collectionId] ?? approvedVerseOptions[0]?.id;
    if (!verseId || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/gita/collections/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId, verseId }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setErrorMsg(j.error ?? "Unable to add verse.");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeVerseFromCollection(
    collectionId: string,
    verseId: string
  ) {
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/gita/collections/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId, verseId }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setErrorMsg(j.error ?? "Unable to remove verse.");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-sandalwood-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="neutral">
              <Lock className="size-3" aria-hidden={true} />
              <span>Private to {viewer.displayName}</span>
            </Badge>
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
            Personal Gītā Study Vault
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Your private bookmarks, study notes, collections, and reading
            progress across all 18 chapters.
          </p>
        </div>

        <Link
          href="/gita"
          className={buttonStyles({ variant: "secondary", size: "md" })}
        >
          <ArrowLeft className="size-4" aria-hidden={true} />
          <span>Back to Gītā Chapters</span>
        </Link>
      </header>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-[12px] border border-kumkum/30 bg-kumkum-wash px-4 py-3 text-sm text-kumkum"
        >
          {errorMsg}
        </div>
      )}

      {/* Chapter Reading Progress */}
      <Card surface="parchment">
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Reading Progress by Chapter
          </CardTitle>
          <CardDescription>
            {totalReadVerses} of {totalPublishedVerses} published verses read (
            {overallProgressPct}%)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressBar
            value={totalReadVerses}
            max={Math.max(totalPublishedVerses, 1)}
            label="Overall verified verses read"
            tone="peacock"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chapterSlots.map((slot) => (
              <Link
                key={slot.chapterNumber}
                href={`/gita/${slot.chapterNumber}`}
                className="rounded-[12px] border border-sandalwood-border bg-ivory p-3 transition-colors hover:bg-linen"
              >
                <div className="flex items-center justify-between text-xs font-medium text-ink tabular-nums">
                  <span>
                    Ch. {slot.chapterNumber}
                    {slot.chapter ? ` · ${slot.chapter.english_title}` : ""}
                  </span>
                  <span className="text-ink-muted">
                    {slot.readVerseCount}/{slot.publishedVerseCount}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-linen">
                  <div
                    className="h-full rounded-full bg-peacock-green"
                    style={{ width: `${slot.progressPercentage}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bookmarks */}
        <Card surface="parchment">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bookmark className="size-4 text-gold-ink" aria-hidden={true} />
              <CardTitle className="font-display text-2xl">
                Bookmarks ({bookmarks.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {bookmarks.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No verses bookmarked yet. Open any verified verse to bookmark it.
              </p>
            ) : (
              bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex items-start justify-between gap-3 rounded-[12px] border border-sandalwood-border bg-ivory p-3.5"
                >
                  <div className="min-w-0">
                    {bm.verse ? (
                      <Link
                        href={`/gita/${bm.verse.chapter_number}/${bm.verse.verse_number}`}
                        className="font-semibold text-peacock-deep hover:underline tabular-nums"
                      >
                        Bhagavad Gītā {bm.verse.verse_ref}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-ink">
                        Saved verse
                      </span>
                    )}
                    {bm.verse && (
                      <p className="mt-1 line-clamp-2 font-devanagari text-sm text-ink-muted">
                        {bm.verse.sanskrit_devanagari}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => removeBookmark(bm.verse_id)}
                    aria-label="Remove bookmark"
                  >
                    <Trash2 className="size-4" aria-hidden={true} />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Private Notes */}
        <Card surface="parchment">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-peacock-ink" aria-hidden={true} />
              <CardTitle className="font-display text-2xl">
                Private Notes ({notes.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {notes.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No personal notes yet. Your contemplations on any verse stay
                private to you.
              </p>
            ) : (
              notes.map((n) => (
                <div
                  key={n.id}
                  className="rounded-[12px] border border-sandalwood-border bg-ivory p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    {n.verse ? (
                      <Link
                        href={`/gita/${n.verse.chapter_number}/${n.verse.verse_number}`}
                        className="text-sm font-semibold text-peacock-deep hover:underline tabular-nums"
                      >
                        BG {n.verse.verse_ref}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-ink">Note</span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => deleteNote(n.verse_id)}
                      aria-label="Delete personal note"
                    >
                      <Trash2 className="size-4" aria-hidden={true} />
                    </Button>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink">
                    {n.note_text}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Personal Collections */}
      <Card surface="parchment">
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Personal Learning Collections ({collections.length})
          </CardTitle>
          <CardDescription>
            Curate private thematic verse study collections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            onSubmit={createCollection}
            className="grid gap-3 rounded-[12px] border border-sandalwood-border bg-linen p-4 sm:grid-cols-3 sm:items-end"
          >
            <FormField id="col-title" label="Collection Title" required>
              <Input
                id="col-title"
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                placeholder="e.g. Karma Yoga Verses"
                required
              />
            </FormField>
            <FormField id="col-desc" label="Description (Optional)">
              <Textarea
                id="col-desc"
                rows={1}
                className="min-h-11"
                value={newColDesc}
                onChange={(e) => setNewColDesc(e.target.value)}
                placeholder="Study intention..."
              />
            </FormField>
            <Button type="submit" variant="primary" disabled={busy}>
              <FolderPlus className="size-4" aria-hidden={true} />
              <span>Create Collection</span>
            </Button>
          </form>

          {collections.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No personal collections created yet.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {collections.map((col) => (
                <div
                  key={col.id}
                  className="rounded-[12px] border border-sandalwood-border bg-ivory p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-ink">
                        {col.title}
                      </h3>
                      {col.description && (
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {col.description}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => deleteCollection(col.id)}
                      aria-label={`Delete collection ${col.title}`}
                    >
                      <Trash2 className="size-4" aria-hidden={true} />
                    </Button>
                  </div>

                  {col.items.length > 0 ? (
                    <ul className="space-y-1.5">
                      {col.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-[8px] border border-sandalwood-border/70 bg-paper px-3 py-1.5 text-xs"
                        >
                          {item.verse ? (
                            <Link
                              href={`/gita/${item.verse.chapter_number}/${item.verse.verse_number}`}
                              className="font-medium text-peacock-deep hover:underline tabular-nums"
                            >
                              BG {item.verse.verse_ref}
                            </Link>
                          ) : (
                            <span>Verse</span>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              removeVerseFromCollection(col.id, item.verse_id)
                            }
                            className="cursor-pointer text-xs text-ink-muted hover:text-kumkum"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-ink-muted">
                      No verses added to this collection yet.
                    </p>
                  )}

                  {approvedVerseOptions.length > 0 && (
                    <div className="flex gap-2 border-t border-sandalwood-border/70 pt-3">
                      <Select
                        aria-label={`Select verse to add to ${col.title}`}
                        value={
                          selectedAddVerse[col.id] ?? approvedVerseOptions[0]!.id
                        }
                        onChange={(e) =>
                          setSelectedAddVerse((prev) => ({
                            ...prev,
                            [col.id]: e.target.value,
                          }))
                        }
                      >
                        {approvedVerseOptions.map((v) => (
                          <option key={v.id} value={v.id}>
                            BG {v.verse_ref}
                          </option>
                        ))}
                      </Select>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => addVerseToCollection(col.id)}
                      >
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reading History & Feedback Status */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card surface="parchment">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-ink-muted" aria-hidden={true} />
              <CardTitle className="font-display text-2xl">
                Recent Reading History
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No reading sessions logged yet.
              </p>
            ) : (
              history.slice(0, 20).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-2 rounded-[10px] border border-sandalwood-border bg-ivory px-3 py-2 text-xs"
                >
                  {entry.verse ? (
                    <Link
                      href={`/gita/${entry.verse.chapter_number}/${entry.verse.verse_number}`}
                      className="font-medium text-peacock-deep hover:underline tabular-nums"
                    >
                      Bhagavad Gītā {entry.verse.verse_ref}
                    </Link>
                  ) : (
                    <span>Verse</span>
                  )}
                  <span className="text-ink-muted tabular-nums">
                    {entry.read_at.slice(0, 16).replace("T", " ")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card surface="parchment">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              My Correction Suggestions ({feedback.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {feedback.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No scripture correction suggestions submitted yet.
              </p>
            ) : (
              feedback.map((f) => (
                <div
                  key={f.id}
                  className="rounded-[10px] border border-sandalwood-border bg-ivory p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium capitalize text-ink">
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
                  <p className="text-ink-muted">{f.message}</p>
                  {f.resolution_notes && (
                    <p className="border-t border-sandalwood-border/60 pt-1 text-peacock-ink">
                      Reviewer note: {f.resolution_notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

