"use client";

import * as React from "react";
import { Check, Edit2, Plus, Sparkles, Trash2, X } from "lucide-react";
import type { MantraRecord } from "@/lib/mantra/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

interface MantraSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mantras: MantraRecord[];
  activeMantra: MantraRecord | null;
  preferredMantraId: string | null;
  onSelectMantra: (mantra: MantraRecord) => void;
  onSetPreferredMantra: (mantraId: string) => Promise<void>;
  onMantraCreated: (mantra: MantraRecord) => void;
  onMantraUpdated: (mantra: MantraRecord) => void;
  onMantraDeleted: (mantraId: string) => void;
}

export function MantraSelectorDialog({
  isOpen,
  onClose,
  mantras,
  activeMantra,
  preferredMantraId,
  onSelectMantra,
  onSetPreferredMantra,
  onMantraCreated,
  onMantraUpdated,
  onMantraDeleted,
}: MantraSelectorDialogProps) {
  const [isCreating, setIsCreating] = React.useState(false);
  const [editingMantra, setEditingMantra] = React.useState<MantraRecord | null>(null);

  // Form fields
  const [name, setName] = React.useState("");
  const [sanskrit, setSanskrit] = React.useState("");
  const [transliteration, setTransliteration] = React.useState("");
  const [meaning, setMeaning] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingMantra(null);
    setName("");
    setSanskrit("");
    setTransliteration("");
    setMeaning("");
    setFormError(null);
    setIsCreating(true);
  };

  const handleStartEdit = (m: MantraRecord) => {
    setEditingMantra(m);
    setName(m.name);
    setSanskrit(m.sanskrit);
    setTransliteration(m.transliteration);
    setMeaning(m.meaning ?? "");
    setFormError(null);
    setIsCreating(true);
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingMantra(null);
    setFormError(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sanskrit.trim() || !transliteration.trim()) {
      setFormError("Name, Sanskrit, and transliteration are required.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingMantra) {
        const res = await fetch("/api/mantras", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingMantra.id,
            name: name.trim(),
            sanskrit: sanskrit.trim(),
            transliteration: transliteration.trim(),
            meaning: meaning.trim() || null,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to update mantra");
        onMantraUpdated(json.mantra);
      } else {
        const res = await fetch("/api/mantras", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            sanskrit: sanskrit.trim(),
            transliteration: transliteration.trim(),
            meaning: meaning.trim() || null,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to create mantra");
        onMantraCreated(json.mantra);
        onSelectMantra(json.mantra);
      }
      setIsCreating(false);
      setEditingMantra(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error saving mantra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (m: MantraRecord) => {
    if (!confirm(`Are you sure you want to remove "${m.name}"?`)) return;
    try {
      const res = await fetch(`/api/mantras?id=${m.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to delete");
      }
      onMantraDeleted(m.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mantra-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-sandalwood-border/90 bg-paper p-6 shadow-sacred-lg text-ink">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-sandalwood-border/70">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-gold-border/70 bg-gold-wash/80 text-gold-ink shadow-2xs">
              <Sparkles className="size-4.5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="mantra-dialog-title" className="font-serif text-lg font-bold text-ink">
                Sacred Mantra Selection
              </h2>
              <p className="text-[11px] text-ink-muted">
                Canonical and personal Vedic mantras for Japa meditation
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

        {isCreating ? (
          <form onSubmit={handleSubmitForm} className="mt-5 space-y-4">
            <h3 className="font-serif text-base font-bold text-ink">
              {editingMantra ? "Edit Custom Mantra" : "Add Custom Devotional Mantra"}
            </h3>

            {formError && (
              <div className="p-3 text-xs text-kumkum bg-kumkum/10 rounded-xl border border-kumkum/30 font-medium">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                Mantra Title / Name *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mahāmṛtyuñjaya Mantra"
                className="rounded-xl border-sandalwood-border/80 bg-paper text-ink"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                Sanskrit / Original Script *
              </label>
              <Input
                value={sanskrit}
                onChange={(e) => setSanskrit(e.target.value)}
                placeholder="e.g. ॐ त्र्यम्बकं यजामहे..."
                className="rounded-xl border-sandalwood-border/80 bg-paper text-ink font-serif"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                Transliteration *
              </label>
              <Input
                value={transliteration}
                onChange={(e) => setTransliteration(e.target.value)}
                placeholder="e.g. oṁ tryambakaṁ yajāmahe..."
                className="rounded-xl border-sandalwood-border/80 bg-paper text-ink"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                Meaning / Devotional Purport (Optional)
              </label>
              <Textarea
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="Enter devotional significance or contemplation..."
                rows={2}
                className="rounded-xl border-sandalwood-border/80 bg-paper text-ink font-serif text-xs leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-sandalwood-border/60">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancelForm}
                disabled={isSubmitting}
                className="rounded-xl text-xs text-ink-muted hover:text-ink"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="rounded-xl font-bold px-4 shadow-2xs text-xs"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingMantra
                  ? "Update Mantra"
                  : "Save Mantra"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-muted">
                Choose the sacred vibration for your Japa practice. Rounds will be
                recorded with this mantra identity.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleStartCreate}
                className="flex items-center gap-1.5 rounded-xl border-sandalwood-border/80 bg-paper text-ink hover:bg-linen font-semibold shadow-2xs text-xs px-3 py-1.5"
              >
                <Plus className="size-3.5 text-gold-antique" />
                <span>Add Custom</span>
              </Button>
            </div>

            <div className="space-y-3">
              {mantras.map((m) => {
                const isActive = activeMantra?.id === m.id;
                const isPreferred = preferredMantraId === m.id;

                return (
                  <div
                    key={m.id}
                    className={`relative p-4 rounded-xl border transition-all ${
                      isActive
                        ? "border-peacock-green/50 bg-tulsi-wash/70 shadow-2xs"
                        : "border-sandalwood-border/80 bg-paper hover:border-gold-border/70 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif font-bold text-base text-ink">
                            {m.name}
                          </span>
                          {m.is_system && (
                            <Badge variant="gold" className="text-[10px] py-0 px-2 font-semibold">
                              Canonical
                            </Badge>
                          )}
                          {isPreferred && (
                            <Badge variant="neutral" className="text-[10px] py-0 px-2 font-semibold">
                              Default Choice
                            </Badge>
                          )}
                          {isActive && (
                            <Badge variant="peacock" className="text-[10px] py-0 px-2 font-semibold">
                              Current Session
                            </Badge>
                          )}
                        </div>

                        <div className="mt-2 text-sm font-serif text-peacock-deep leading-relaxed">
                          {m.sanskrit}
                        </div>
                        <div className="mt-1 text-xs text-ink-muted font-sans italic leading-relaxed">
                          {m.transliteration}
                        </div>
                        {m.meaning && (
                          <div className="mt-2 text-xs text-ink-muted leading-relaxed bg-linen/50 p-2.5 rounded-lg border border-sandalwood-border/60">
                            {m.meaning}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant={isActive ? "primary" : "secondary"}
                          onClick={() => {
                            onSelectMantra(m);
                            onClose();
                          }}
                          className={`flex items-center gap-1.5 min-w-[90px] justify-center rounded-xl text-xs font-bold shadow-2xs ${
                            isActive
                              ? "bg-peacock-deep text-paper"
                              : "border-sandalwood-border/80 bg-paper hover:bg-linen text-ink"
                          }`}
                        >
                          {isActive ? (
                            <>
                              <Check className="size-3.5" /> Selected
                            </>
                          ) : (
                            "Select"
                          )}
                        </Button>

                        {!isPreferred && (
                          <button
                            type="button"
                            onClick={() => void onSetPreferredMantra(m.id)}
                            className="text-[11px] text-ink-muted hover:text-gold-ink font-medium underline transition-colors"
                          >
                            Set as default
                          </button>
                        )}

                        {!m.is_system && (
                          <div className="flex items-center gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(m)}
                              className="flex size-7 items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-linen transition-colors"
                              title="Edit mantra"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(m)}
                              className="flex size-7 items-center justify-center rounded-lg text-ink-muted hover:text-kumkum hover:bg-kumkum/10 transition-colors"
                              title="Delete custom mantra"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
