"use client";

import * as React from "react";
import { BookOpen, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import type { SessionNoteRecord } from "@/lib/notes/types";

interface SessionNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionRounds?: number;
  sessionDate?: string;
  initialNote?: SessionNoteRecord | null;
  onNoteSaved: (note: SessionNoteRecord) => void;
}

export function SessionNotesModal({
  isOpen,
  onClose,
  sessionId,
  sessionRounds = 1,
  sessionDate,
  initialNote,
  onNoteSaved,
}: SessionNotesModalProps) {
  const [content, setContent] = React.useState(initialNote?.content ?? "");
  const [prevNoteId, setPrevNoteId] = React.useState(initialNote?.id);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (initialNote?.id !== prevNoteId) {
    setPrevNoteId(initialNote?.id);
    setContent(initialNote?.content ?? "");
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Please write your devotional reflection before saving.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/chant/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          content: content.trim(),
          isPrivate: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save note");

      onNoteSaved(json.note);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving reflection");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reflection-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-sandalwood-border/90 bg-paper p-6 shadow-sacred-lg text-ink">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-sandalwood-border/70">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-gold-border/70 bg-gold-wash/80 text-gold-ink shadow-2xs">
              <BookOpen className="size-4.5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="reflection-dialog-title" className="font-serif text-lg font-bold text-ink">
                Devotional Reflection
              </h2>
              <p className="text-[11px] text-ink-muted">
                Capture spiritual thoughts, prayers, and insights
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-linen transition-colors"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="text-xs text-ink-muted flex items-center justify-between p-3 rounded-xl border border-sandalwood-border/70 bg-linen/40">
            <span className="font-medium">
              Session: <strong className="text-ink">{sessionRounds} {sessionRounds === 1 ? "round" : "rounds"}</strong>
              {sessionDate ? ` · ${sessionDate}` : ""}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-gold-ink font-semibold">
              <Lock className="size-3" /> Strictly Private
            </span>
          </div>

          {error && (
            <div className="p-3 text-xs text-kumkum bg-kumkum/10 rounded-xl border border-kumkum/30 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
              Heart Realization & Prayer
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Record any devotional realizations, prayerful focus, or gratitude experienced during this chanting session..."
              rows={5}
              className="font-serif text-sm leading-relaxed rounded-xl border-sandalwood-border/80 bg-paper text-ink placeholder:text-ink-muted/50 focus:border-peacock-green/50"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-sandalwood-border/60">
            <span className="text-[11px] text-ink-muted">
              Optional · Captured for your personal sanctuary
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl text-xs text-ink-muted hover:text-ink"
              >
                Skip / Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="rounded-xl font-bold px-4 shadow-2xs text-xs"
              >
                {isSubmitting ? "Saving..." : "Save Reflection"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
