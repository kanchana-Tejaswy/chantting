"use client";

import * as React from "react";
import { Bell, BellOff, Clock, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ChantingReminderRecord } from "@/lib/reminders/types";

interface ChantingRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: ChantingReminderRecord[];
  userTimezone: string;
  onReminderAdded: (reminder: ChantingReminderRecord) => void;
  onReminderUpdated: (reminder: ChantingReminderRecord) => void;
  onReminderDeleted: (reminderId: string) => void;
}

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function ChantingRemindersModal({
  isOpen,
  onClose,
  reminders,
  userTimezone,
  onReminderAdded,
  onReminderUpdated,
  onReminderDeleted,
}: ChantingRemindersModalProps) {
  const [isAdding, setIsAdding] = React.useState(false);
  const [title, setTitle] = React.useState("Morning Japa (Brahma-muhurta)");
  const [timeOfDay, setTimeOfDay] = React.useState("05:30");
  const [selectedDays, setSelectedDays] = React.useState<number[]>([
    0, 1, 2, 3, 4, 5, 6,
  ]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [notificationPermission, setNotificationPermission] =
    React.useState<NotificationPermission>(() =>
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "default"
    );

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === "granted") {
        new Notification("SMARAN Sacred Reminders Active", {
          body: "You will receive peaceful reminders for your holy chanting practice.",
          icon: "/favicon.ico",
        });
      }
    }
  };

  const handleToggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleToggleEnable = async (rem: ChantingReminderRecord) => {
    try {
      const res = await fetch("/api/chant/reminders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rem.id,
          isEnabled: !rem.is_enabled,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update");
      onReminderUpdated(json.reminder);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating reminder");
    }
  };

  const handleDelete = async (remId: string) => {
    if (!confirm("Are you sure you want to remove this reminder?")) return;
    try {
      const res = await fetch(`/api/chant/reminders?id=${remId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to delete");
      }
      onReminderDeleted(remId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error deleting reminder");
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !timeOfDay.trim()) {
      setError("Please specify title and time.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/chant/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          timeOfDay: timeOfDay.trim(),
          daysOfWeek: selectedDays,
          isEnabled: true,
          reminderType: "browser",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create reminder");

      onReminderAdded(json.reminder);
      setIsAdding(false);
      setTitle("");
      setTimeOfDay("05:30");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating reminder");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminders-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-sandalwood-border/90 bg-paper p-6 shadow-sacred-lg text-ink">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-sandalwood-border/70">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-gold-border/70 bg-gold-wash/80 text-gold-ink shadow-2xs">
              <Bell className="size-4.5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="reminders-dialog-title" className="font-serif text-lg font-bold text-ink">
                Sacred Chanting Reminders
              </h2>
              <p className="text-[11px] text-ink-muted">
                Gentle notifications to maintain steady daily sadhana
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

        <div className="mt-5 space-y-4">
          {/* Notification Permission Card */}
          <div className="p-4 rounded-xl border border-sandalwood-border/80 bg-linen/50 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-ink flex items-center gap-2">
                {notificationPermission === "granted" ? (
                  <Badge variant="peacock" className="text-[10px] py-0 px-2 font-semibold">
                    Browser Alerts Enabled
                  </Badge>
                ) : notificationPermission === "denied" ? (
                  <Badge variant="neutral" className="text-[10px] py-0 px-2">
                    Permission Denied (In-App Only)
                  </Badge>
                ) : (
                  <Badge variant="gold" className="text-[10px] py-0 px-2 font-semibold">
                    Permission Needed
                  </Badge>
                )}
                <span className="text-ink-muted font-normal text-[11px]">
                  ({userTimezone})
                </span>
              </div>
              <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
                {notificationPermission === "granted"
                  ? "Alerts will notify you gently at your scheduled sadhana hours."
                  : "Allow browser notifications to receive timely chanting alerts."}
              </p>
            </div>
            {notificationPermission !== "granted" && (
              <Button
                size="sm"
                variant="primary"
                onClick={handleRequestPermission}
                className="shrink-0 text-xs rounded-xl font-bold px-3 py-1.5 shadow-2xs"
              >
                Enable
              </Button>
            )}
          </div>

          {/* New reminder form or list */}
          {isAdding ? (
            <form onSubmit={handleAddSubmit} className="space-y-4 p-4 sm:p-5 rounded-xl border border-gold-border/70 bg-gold-wash/30">
              <h3 className="font-serif text-base font-bold text-ink">
                Add Chanting Reminder
              </h3>

              {error && (
                <div className="p-3 text-xs text-kumkum bg-kumkum/10 rounded-xl border border-kumkum/30 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                  Reminder Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Evening Sandhya Japa"
                  className="rounded-xl border-sandalwood-border/80 bg-paper text-ink"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                  Time of Day ({userTimezone})
                </label>
                <Input
                  type="time"
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  className="rounded-xl border-sandalwood-border/80 bg-paper text-ink"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-2">
                  Repeat Days
                </label>
                <div className="flex items-center gap-1.5">
                  {DAY_LABELS.map((dayLabel, idx) => {
                    const isSelected = selectedDays.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleToggleDay(idx)}
                        className={`size-8 rounded-full text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-peacock-deep text-paper shadow-2xs"
                            : "bg-paper border border-sandalwood-border/80 text-ink-muted hover:border-gold-border hover:text-ink"
                        }`}
                      >
                        {dayLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-sandalwood-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                  className="rounded-xl text-ink-muted hover:text-ink"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  className="rounded-xl font-bold px-4 shadow-2xs"
                >
                  {isSubmitting ? "Adding..." : "Save Reminder"}
                </Button>
              </div>
            </form>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-ink-muted">
                  {reminders.length} scheduled {reminders.length === 1 ? "reminder" : "reminders"}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-1.5 rounded-xl border-sandalwood-border/80 bg-paper text-ink hover:bg-linen font-semibold shadow-2xs text-xs px-3 py-1.5"
                >
                  <Plus className="size-3.5 text-gold-antique" />
                  <span>Add Reminder</span>
                </Button>
              </div>

              {reminders.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-sandalwood-border/80 bg-linen/20 rounded-2xl">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-gold-border/70 bg-gold-wash/80 text-gold-ink shadow-2xs mx-auto mb-3">
                    <Clock className="size-6 text-gold-antique" />
                  </div>
                  <p className="font-serif text-sm font-bold text-ink">
                    No chanting reminders set
                  </p>
                  <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto leading-relaxed">
                    Set a gentle reminder for Brahma-muhurta or evening sadhana to build unwavering consistency.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAdding(true)}
                    className="mt-4 rounded-xl font-bold px-4 shadow-xs"
                  >
                    Set First Reminder
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reminders.map((rem) => {
                    const timeFormatted = rem.time_of_day.slice(0, 5);
                    return (
                      <div
                        key={rem.id}
                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          rem.is_enabled
                            ? "border-sandalwood-border/90 bg-paper shadow-2xs"
                            : "border-sandalwood-border/50 bg-linen/30 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => void handleToggleEnable(rem)}
                            className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
                              rem.is_enabled
                                ? "bg-tulsi-wash text-peacock-deep hover:bg-tulsi-wash/80"
                                : "bg-linen text-ink-muted hover:text-ink"
                            }`}
                            title={rem.is_enabled ? "Disable" : "Enable"}
                          >
                            {rem.is_enabled ? (
                              <Bell className="size-4" />
                            ) : (
                              <BellOff className="size-4" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-serif font-bold text-ink text-sm tabular-nums">
                                {timeFormatted}
                              </span>
                              <span className="text-xs font-medium text-ink truncate">
                                {rem.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {DAY_LABELS.map((label, dIdx) => (
                                <span
                                  key={dIdx}
                                  className={`text-[9px] px-1 py-0.2 rounded font-medium ${
                                    rem.days_of_week.includes(dIdx)
                                      ? "bg-gold-wash text-gold-ink font-bold"
                                      : "text-ink-muted/40"
                                  }`}
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleDelete(rem.id)}
                          className="flex size-7 items-center justify-center text-ink-muted hover:text-kumkum rounded-lg hover:bg-kumkum/10 transition-colors shrink-0"
                          title="Delete reminder"
                          aria-label={`Delete reminder ${rem.title}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
