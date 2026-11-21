"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calculator,
  CheckCircle2,
  Edit3,
  Flame,
  History,
  ListOrdered,
  Pause,
  Play,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { LotusEmblem } from "@/components/sacred/ornaments";
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
} from "@/components/ui/dialog";
import { FormField, Input, Textarea } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress";
import type { SankalpaRecord } from "@/lib/sankalpa/types";
import { summarizeSankalpa, summarizeSankalpaPortfolio } from "@/lib/sankalpa/queries";

export interface SankalpaSectionProps {
  sankalpas: SankalpaRecord[];
  activeSankalpa: SankalpaRecord | null;
  todayDate: string;
  lifetimeRounds?: number;
}

const MILESTONES = [
  {
    pct: 25,
    label: "25%",
    title: "Prathama Charana · First Quarter",
    verse: "दृढव्रताः — Firm in sacred purpose.",
    message: "A noble beginning to your vow. May Sri Krishna grant you steadfastness and deep absorption.",
  },
  {
    pct: 50,
    label: "50%",
    title: "Madhyama Parva · Halfway Milestone",
    verse: "सततं कीर्तयन्तो मां यतन्तश्च दृढव्रताः",
    message: "You have crossed the halfway mark of your sacred offering. Keep your mind fixed on the Holy Names.",
  },
  {
    pct: 75,
    label: "75%",
    title: "Tritiya Sopana · Three Quarters",
    verse: "अनन्यचेताः सततं यो मां स्मरति नित्यशः",
    message: "The sacred summit is in sight. Your perseverance illuminates your bhakti and devotion.",
  },
  {
    pct: 100,
    label: "100%",
    title: "Sankalpa Siddhi · Vow Fulfilled!",
    verse: "दृढव्रताः · सिद्धिमवाप्नुयात्",
    message: "Sacred vow fulfilled! Through unwavering devotion, your complete offering of Holy Names is accomplished.",
  },
] as const;

const QUICK_PRESETS = [
  { title: "108 Rounds Focused Japa", rounds: 108, description: "One intense weekend offering of Holy Names" },
  { title: "Month of Damodara Vow", rounds: 500, description: "Kartik month deep meditation and prayer" },
  { title: "Gita Jayanti Offering", rounds: 1008, description: "Dedicated to the divine words of Sri Krishna" },
  { title: "1 Lakh Nama Japa", rounds: 100000, description: "The supreme vow of one hundred thousand holy names" },
];

function formatRounds(n: number): string {
  return n.toLocaleString("en-US");
}

function readAcknowledgedMilestones(sankalpaId: string | null): number[] {
  if (typeof window === "undefined" || !sankalpaId) return [];
  try {
    const stored = localStorage.getItem(`smaran_sankalpa_ack_${sankalpaId}`);
    return stored ? (JSON.parse(stored) as number[]) : [];
  } catch {
    return [];
  }
}

export function SankalpaSection({
  sankalpas: initialSankalpas,
  todayDate,
  lifetimeRounds = 0,
}: SankalpaSectionProps) {
  const router = useRouter();
  const [localSankalpas, setLocalSankalpas] = React.useState<SankalpaRecord[] | null>(null);
  const [prevInitialSankalpas, setPrevInitialSankalpas] = React.useState(initialSankalpas);

  if (prevInitialSankalpas !== initialSankalpas) {
    setPrevInitialSankalpas(initialSankalpas);
    setLocalSankalpas(null);
  }

  const sankalpas = localSankalpas ?? initialSankalpas;
  const activeSankalpa = React.useMemo(() => {
    return sankalpas.find((s) => s.status === "active") ?? null;
  }, [sankalpas]);

  const portfolio = React.useMemo(() => {
    return summarizeSankalpaPortfolio(sankalpas);
  }, [sankalpas]);

  const upcomingSankalpas = React.useMemo(() => {
    const paused = sankalpas.filter((s) => s.status === "paused" && s.id !== activeSankalpa?.id);
    return paused.sort((a, b) => {
      const stepA = portfolio.vowsBreakdown.find((v) => v.id === a.id)?.stepIndex ?? 999;
      const stepB = portfolio.vowsBreakdown.find((v) => v.id === b.id)?.stepIndex ?? 999;
      return stepA - stepB;
    });
  }, [sankalpas, activeSankalpa?.id, portfolio.vowsBreakdown]);

  const completedSankalpas = React.useMemo(() => {
    return sankalpas.filter((s) => s.status === "completed" && s.id !== activeSankalpa?.id);
  }, [sankalpas, activeSankalpa?.id]);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingSankalpa, setEditingSankalpa] = React.useState<SankalpaRecord | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);

  // Form states
  const [formTitle, setFormTitle] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formTargetRounds, setFormTargetRounds] = React.useState<number>(1008);
  const [formStartDate, setFormStartDate] = React.useState(todayDate);
  const [formEndDate, setFormEndDate] = React.useState("");
  const [includeLifetimeRounds, setIncludeLifetimeRounds] = React.useState(false);
  const [autoPauseExisting, setAutoPauseExisting] = React.useState(true);
  const [creditCurrentChanting, setCreditCurrentChanting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = React.useState<string | null>(null);

  // Add Rounds dialog state
  const [isAddRoundsOpen, setIsAddRoundsOpen] = React.useState(false);
  const [targetSankalpaForAdd, setTargetSankalpaForAdd] = React.useState<SankalpaRecord | null>(null);
  const [addRoundsMode, setAddRoundsMode] = React.useState<"new_vow" | "extend_existing">("new_vow");
  const [addRoundsTitle, setAddRoundsTitle] = React.useState("");
  const [addRoundsDescription, setAddRoundsDescription] = React.useState("");
  const [additionalRounds, setAdditionalRounds] = React.useState<number>(1000);
  const [newVowTargetType, setNewVowTargetType] = React.useState<"standalone" | "combined">("standalone");
  const [newVowQueueOption, setNewVowQueueOption] = React.useState<"queue_after" | "activate_now">("queue_after");
  const [addRoundsStartDate, setAddRoundsStartDate] = React.useState(todayDate);
  const [addRoundsEndDate, setAddRoundsEndDate] = React.useState("");
  const [addRoundsCreditProgress, setAddRoundsCreditProgress] = React.useState(false);
  const [addRoundsError, setAddRoundsError] = React.useState<string | null>(null);
  const [isSubmittingAddRounds, setIsSubmittingAddRounds] = React.useState(false);

  // Milestone acknowledgement versioning
  const [ackVersion, setAckVersion] = React.useState(0);
  const acknowledgedMilestones = React.useMemo(() => {
    // Reference ackVersion so re-render recalculates
    void ackVersion;
    return readAcknowledgedMilestones(activeSankalpa?.id ?? null);
  }, [activeSankalpa?.id, ackVersion]);

  const activeSummary = activeSankalpa ? summarizeSankalpa(activeSankalpa) : null;

  // Find the highest unacknowledged milestone reached
  const currentUnacknowledgedMilestone = React.useMemo(() => {
    if (!activeSummary) return null;
    const reached = MILESTONES.filter(
      (m) => activeSummary.progressPercentage >= m.pct && !acknowledgedMilestones.includes(m.pct)
    );
    return reached.length > 0 ? reached[reached.length - 1] : null;
  }, [activeSummary, acknowledgedMilestones]);

  const handleAcknowledgeMilestone = (pct: number) => {
    if (!activeSankalpa) return;
    const current = readAcknowledgedMilestones(activeSankalpa.id);
    const nextAck = [...current, pct];
    try {
      localStorage.setItem(`smaran_sankalpa_ack_${activeSankalpa.id}`, JSON.stringify(nextAck));
    } catch {
      // ignore
    }
    setAckVersion((v) => v + 1);
  };

  const handleOpenCreate = (preset?: { title: string; rounds: number; description: string }) => {
    setFormTitle(preset?.title ?? "");
    setFormDescription(preset?.description ?? "");
    setFormTargetRounds(preset?.rounds ?? 1008);
    setFormStartDate(todayDate);
    setFormEndDate("");
    setIncludeLifetimeRounds(false);
    setCreditCurrentChanting(false);
    setAutoPauseExisting(true);
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleOpenAddRounds = (sankalpa: SankalpaRecord) => {
    setTargetSankalpaForAdd(sankalpa);
    setAddRoundsMode("new_vow");
    setAddRoundsTitle(""); // Fresh empty title for the new vow!
    setAddRoundsDescription("");
    setAdditionalRounds(1000);
    setNewVowTargetType("standalone");
    setNewVowQueueOption("queue_after");
    setAddRoundsStartDate(todayDate);
    setAddRoundsEndDate("");
    setAddRoundsCreditProgress(false);
    setAddRoundsError(null);
    setIsAddRoundsOpen(true);
  };

  const handleSwitchAddRoundsMode = (mode: "new_vow" | "extend_existing") => {
    setAddRoundsMode(mode);
    setAddRoundsError(null);
    if (!targetSankalpaForAdd) return;
    if (mode === "extend_existing") {
      setAddRoundsTitle(targetSankalpaForAdd.title);
      setAddRoundsDescription(targetSankalpaForAdd.description ?? "");
      setAddRoundsEndDate(targetSankalpaForAdd.end_date ?? "");
    } else {
      // Switching to new vow: clear title so user can enter fresh new name
      if (addRoundsTitle === targetSankalpaForAdd.title) {
        setAddRoundsTitle("");
      }
      setAddRoundsDescription("");
      setAddRoundsEndDate("");
    }
  };

  const handleOpenEdit = (sankalpa: SankalpaRecord) => {
    setEditingSankalpa(sankalpa);
    setFormTitle(sankalpa.title);
    setFormDescription(sankalpa.description ?? "");
    setFormTargetRounds(sankalpa.target_rounds);
    setFormStartDate(sankalpa.start_date);
    setFormEndDate(sankalpa.end_date ?? "");
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formTitle.trim().length < 2) {
      setFormError("Title must be at least 2 characters.");
      return;
    }
    if (formTargetRounds < 1) {
      setFormError("Target rounds must be at least 1.");
      return;
    }
    if (formEndDate && formEndDate < formStartDate) {
      setFormError("Target completion date cannot precede the start date.");
      return;
    }

    let initialCompletedRounds: number | undefined = undefined;
    if (creditCurrentChanting && activeSankalpa) {
      initialCompletedRounds = activeSankalpa.completed_rounds;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sankalpa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription.trim() || null,
          targetRounds: formTargetRounds,
          startDate: formStartDate || todayDate,
          endDate: formEndDate.trim() || null,
          includeLifetimeRounds,
          initialCompletedRounds,
          autoPauseExisting: !!activeSankalpa && autoPauseExisting,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create Sankalpa.");
      }

      const created = data.sankalpa as SankalpaRecord;
      setLocalSankalpas((prev) => {
        const currentList = prev ?? initialSankalpas;
        if (autoPauseExisting && activeSankalpa) {
          return [
            created,
            ...currentList.map((s) =>
              s.id === activeSankalpa.id ? { ...s, status: "paused" as const } : s
            ),
          ];
        }
        return [created, ...currentList];
      });
      setIsCreateOpen(false);
      setActionSuccessMessage(
        autoPauseExisting && activeSankalpa
          ? `Sacred vow "${created.title}" established and activated. "${activeSankalpa.title}" is safely paused.`
          : `Sacred vow "${created.title}" successfully established.`
      );
      setTimeout(() => setActionSuccessMessage(null), 5000);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create Sankalpa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRoundsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSankalpaForAdd) return;
    setAddRoundsError(null);

    if (addRoundsTitle.trim().length < 2) {
      setAddRoundsError("Please enter a title (at least 2 characters) for the vow.");
      return;
    }

    const rounds = Number(additionalRounds);
    if (!rounds || rounds < 1) {
      setAddRoundsError("Please enter at least 1 round.");
      return;
    }

    const effectiveTarget =
      addRoundsMode === "new_vow"
        ? newVowTargetType === "combined"
          ? targetSankalpaForAdd.target_rounds + rounds
          : rounds
        : targetSankalpaForAdd.target_rounds + rounds;

    if (effectiveTarget > 1_000_000) {
      setAddRoundsError("Target rounds cannot exceed 1,000,000 rounds.");
      return;
    }

    const effectiveStart = addRoundsStartDate || todayDate;
    if (addRoundsEndDate && addRoundsEndDate < effectiveStart) {
      setAddRoundsError("Target completion date cannot precede the start date.");
      return;
    }

    setIsSubmittingAddRounds(true);
    try {
      if (addRoundsMode === "new_vow") {
        const isQueueAfter = newVowQueueOption === "queue_after";
        const initialCompleted = addRoundsCreditProgress ? targetSankalpaForAdd.completed_rounds : 0;

        const res = await fetch("/api/sankalpa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: addRoundsTitle.trim(),
            description: addRoundsDescription.trim() || null,
            targetRounds: effectiveTarget,
            startDate: effectiveStart,
            endDate: addRoundsEndDate.trim() || null,
            initialCompletedRounds: initialCompleted,
            autoPauseExisting: !isQueueAfter,
            status: isQueueAfter ? "paused" : "active",
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to create new Sankalpa.");
        }

        const created = data.sankalpa as SankalpaRecord;
        setLocalSankalpas((prev) => {
          const currentList = prev ?? initialSankalpas;
          if (!isQueueAfter) {
            return [
              created,
              ...currentList.map((s) =>
                s.id === targetSankalpaForAdd.id ? { ...s, status: "paused" as const } : s
              ),
            ];
          } else {
            return [created, ...currentList];
          }
        });

        setIsAddRoundsOpen(false);
        if (isQueueAfter) {
          setActionSuccessMessage(
            `New vow "${created.title}" planned (${formatRounds(created.target_rounds)} rounds). Kept "${targetSankalpaForAdd.title}" active so you can clear it first.`
          );
        } else {
          setActionSuccessMessage(
            `New vow "${created.title}" is now active (${formatRounds(created.target_rounds)} rounds). "${targetSankalpaForAdd.title}" is safely paused.`
          );
        }
      } else {
        const res = await fetch("/api/sankalpa", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: targetSankalpaForAdd.id,
            title: addRoundsTitle.trim(),
            description: addRoundsDescription.trim() || null,
            addRounds: rounds,
            startDate: effectiveStart,
            endDate: addRoundsEndDate.trim() || null,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to add rounds to Sankalpa.");
        }

        const updated = data.sankalpa as SankalpaRecord;
        setLocalSankalpas((prev) =>
          (prev ?? initialSankalpas).map((s) => (s.id === updated.id ? updated : s))
        );
        setIsAddRoundsOpen(false);
        setActionSuccessMessage(
          `Added ${formatRounds(rounds)} rounds to "${updated.title}". New target: ${formatRounds(updated.target_rounds)} rounds.`
        );
      }
      setTimeout(() => setActionSuccessMessage(null), 5000);
      router.refresh();
    } catch (err) {
      setAddRoundsError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setIsSubmittingAddRounds(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSankalpa) return;
    setFormError(null);

    if (formTitle.trim().length < 2) {
      setFormError("Title must be at least 2 characters.");
      return;
    }
    if (formTargetRounds < 1) {
      setFormError("Target rounds must be at least 1.");
      return;
    }
    if (formEndDate && formEndDate < editingSankalpa.start_date) {
      setFormError("Target completion date cannot precede the start date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sankalpa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSankalpa.id,
          title: formTitle,
          description: formDescription.trim() || null,
          targetRounds: formTargetRounds,
          endDate: formEndDate.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update Sankalpa.");
      }

      const updated = data.sankalpa as SankalpaRecord;
      setLocalSankalpas((prev) =>
        (prev ?? initialSankalpas).map((s) => (s.id === updated.id ? updated : s))
      );
      setIsEditOpen(false);
      setActionSuccessMessage(`Sankalpa "${updated.title}" updated successfully.`);
      setTimeout(() => setActionSuccessMessage(null), 5000);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update Sankalpa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (
    sankalpa: SankalpaRecord,
    nextStatus: "active" | "paused" | "completed"
  ) => {
    try {
      const res = await fetch("/api/sankalpa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sankalpa.id,
          status: nextStatus,
          autoPauseExisting: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update status.");
      }

      const updated = data.sankalpa as SankalpaRecord;
      setLocalSankalpas((prev) =>
        (prev ?? initialSankalpas).map((s) => {
          if (s.id === updated.id) return updated;
          if (nextStatus === "active" && s.status === "active") {
            return { ...s, status: "paused" as const };
          }
          return s;
        })
      );

      if (nextStatus === "active") {
        setActionSuccessMessage(`Sankalpa "${updated.title}" is now your active vow.`);
      } else {
        setActionSuccessMessage(
          nextStatus === "paused"
            ? `Sankalpa "${updated.title}" paused.`
            : `Sankalpa "${updated.title}" marked as complete! Sri Krishna bless your offering.`
        );
      }
      setTimeout(() => setActionSuccessMessage(null), 5000);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to change vow status.");
    }
  };

  const handleDeleteSankalpa = async (sankalpa: SankalpaRecord) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the vow "${sankalpa.title}"? Your recorded chanting rounds will remain safely in your sadhana history.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/sankalpa?id=${encodeURIComponent(sankalpa.id)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete Sankalpa.");
      }

      setLocalSankalpas((prev) =>
        (prev ?? initialSankalpas).filter((s) => s.id !== sankalpa.id)
      );
      setActionSuccessMessage(`Sankalpa "${sankalpa.title}" deleted.`);
      setTimeout(() => setActionSuccessMessage(null), 5000);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete Sankalpa.");
    }
  };

  const handleMergeIntoActive = async (sourceVow: SankalpaRecord) => {
    if (!activeSankalpa) return;
    const combined = activeSankalpa.target_rounds + sourceVow.target_rounds;
    if (
      !window.confirm(
        `Merge ${formatRounds(sourceVow.target_rounds)} rounds from "${sourceVow.title}" into active vow "${activeSankalpa.title}"?\n\nYour active vow's target will become ${formatRounds(combined)} rounds (${formatRounds(activeSankalpa.target_rounds)} + ${formatRounds(sourceVow.target_rounds)} = ${formatRounds(combined)}).`
      )
    ) {
      return;
    }

    try {
      const patchRes = await fetch("/api/sankalpa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeSankalpa.id,
          addRounds: sourceVow.target_rounds,
        }),
      });

      const patchData = await patchRes.json();
      if (!patchRes.ok) {
        throw new Error(patchData.error ?? "Failed to extend active vow.");
      }

      await fetch(`/api/sankalpa?id=${encodeURIComponent(sourceVow.id)}`, {
        method: "DELETE",
      });

      const updatedActive = patchData.sankalpa as SankalpaRecord;
      setLocalSankalpas((prev) => {
        const list = prev ?? initialSankalpas;
        return list
          .filter((s) => s.id !== sourceVow.id)
          .map((s) => (s.id === updatedActive.id ? updatedActive : s));
      });

      setActionSuccessMessage(
        `Merged ${formatRounds(sourceVow.target_rounds)} rounds from "${sourceVow.title}" into "${activeSankalpa.title}". Active vow target is now ${formatRounds(updatedActive.target_rounds)} rounds.`
      );
      setTimeout(() => setActionSuccessMessage(null), 6000);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to merge vows.");
    }
  };

  return (
    <section aria-labelledby="sankalpa-section-heading" className="space-y-5">
      {/* Action Success Toast Banner */}
      {actionSuccessMessage && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-[14px] border border-peacock-green/40 bg-tulsi-wash/90 px-4 py-3 text-sm text-peacock-ink shadow-sacred-xs backdrop-blur-sm animate-in fade-in slide-in-from-top-1"
        >
          <CheckCircle2 className="size-4 shrink-0 text-peacock-deep" aria-hidden="true" />
          <span className="font-medium">{actionSuccessMessage}</span>
        </div>
      )}

      {/* Radiant Milestone Celebration Banner */}
      {currentUnacknowledgedMilestone && activeSankalpa && (
        <div
          role="alert"
          aria-live="polite"
          className="relative overflow-hidden rounded-[20px] border border-gold-border/80 bg-gradient-to-br from-gold-wash via-paper to-gold-wash/50 p-5 shadow-sacred-md sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gold-wash border border-gold-border/60 text-gold-ink shadow-2xs">
                <Trophy className="size-6 text-gold-ink" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="gold" className="text-xs font-semibold">
                    {currentUnacknowledgedMilestone.label} Milestone
                  </Badge>
                  <span className="font-devanagari text-xs font-semibold text-peacock-deep">
                    {currentUnacknowledgedMilestone.verse}
                  </span>
                </div>
                <h3 className="font-serif text-xl font-semibold text-ink">
                  {currentUnacknowledgedMilestone.title}
                </h3>
                <p className="max-w-xl text-sm leading-relaxed text-ink-muted text-pretty">
                  {currentUnacknowledgedMilestone.message}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleAcknowledgeMilestone(currentUnacknowledgedMilestone.pct)}
              className="shrink-0 rounded-[12px] px-5 py-2.5"
            >
              <LotusEmblem size={16} className="text-gold-antique mr-1.5" />
              <span>Acknowledge Blessing</span>
            </Button>
          </div>
        </div>
      )}

      {/* Main Sankalpa Section Header & Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-paper text-gold-ink shadow-sacred-xs border border-sandalwood-border">
            <LotusEmblem size={18} className="text-gold-antique" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="sankalpa-section-heading"
                className="font-serif text-xl font-semibold text-ink sm:text-2xl"
              >
                Personal Sankalpa
              </h2>
              <span className="rounded-full border border-gold-border/40 bg-gold-wash/80 px-2 py-0.5 font-devanagari text-[11px] font-semibold text-ink">
                संकल्प
              </span>
              {portfolio.count > 1 && (
                <Badge variant="gold" className="text-[11px] font-semibold">
                  {portfolio.count} Vows · {formatRounds(portfolio.totalTargetRounds)} Total Rounds
                </Badge>
              )}
            </div>
            <p className="text-xs text-ink-muted">
              Sacred Chanting Vows &amp; Spiritual Milestones
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenCreate()}
            className="rounded-[12px] px-4 shadow-sacred-xs"
          >
            <Plus className="size-4 mr-1" aria-hidden="true" />
            <span>{activeSankalpa ? "+ Add Sankalpa" : "Begin a Sankalpa"}</span>
          </Button>

          {completedSankalpas.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory((prev) => !prev)}
              className="rounded-[12px] px-3 text-xs"
            >
              <History className="size-3.5 mr-1.5" aria-hidden="true" />
              <span>{showHistory ? "Hide completed vows" : `Completed vows (${completedSankalpas.length})`}</span>
            </Button>
          )}
        </div>
      </div>

      {/* ACTIVE SANKALPA CARD (Primary Focus Hero) */}
      {activeSankalpa && activeSummary ? (
        <Card
          surface="elevated"
          className="overflow-hidden rounded-2xl border border-sandalwood-border/80 bg-paper p-5 sm:p-7 shadow-sm transition-all"
        >
          <CardHeader className="p-0 pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-peacock-green/30 bg-tulsi-wash px-2.5 py-0.5 text-xs font-semibold text-peacock-deep">
                    <span className="size-1.5 rounded-full bg-peacock-deep animate-pulse" />
                    <span>Active Vow</span>
                  </span>
                  {portfolio.count > 1 && (
                    <span className="rounded-full border border-sandalwood-border/70 bg-linen/60 px-2 py-0.5 text-xs text-ink-muted">
                      Step 1 of {portfolio.count} in Roadmap
                    </span>
                  )}
                  <span className="text-xs text-ink-muted tabular-nums">
                    Started {activeSankalpa.start_date}
                  </span>
                  {activeSankalpa.end_date && (
                    <>
                      <span aria-hidden="true" className="text-xs text-ink-muted">·</span>
                      <span className="text-xs text-ink-muted tabular-nums">
                        Target completion: {activeSankalpa.end_date}
                      </span>
                    </>
                  )}
                </div>

                <CardTitle className="font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl text-balance">
                  {activeSankalpa.title}
                </CardTitle>

                {activeSankalpa.description && (
                  <blockquote className="mt-2 rounded-xl border-l-2 border-sandalwood-border bg-linen/50 px-3.5 py-2 text-xs italic leading-relaxed text-ink-muted">
                    &ldquo;{activeSankalpa.description}&rdquo;
                  </blockquote>
                )}
              </div>

              {/* Action Controls for Active Sankalpa */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link
                  href="/sadhana/chant"
                  className={buttonStyles({
                    variant: "gold",
                    size: "sm",
                    className: "rounded-xl px-4 py-2 text-xs font-bold shadow-xs active:scale-[0.97] transition-all",
                  })}
                >
                  <Flame className="size-3.5 mr-1.5 text-ink fill-current" aria-hidden="true" />
                  <span>Chant for this Vow</span>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenAddRounds(activeSankalpa)}
                  className="rounded-xl px-3 py-2 text-xs font-semibold hover:border-gold-border active:scale-[0.97]"
                  aria-label="Add rounds to active vow"
                >
                  <Plus className="size-3.5 mr-1" aria-hidden="true" />
                  <span>+ Add Rounds</span>
                </Button>

                <div className="flex items-center gap-0.5 rounded-xl border border-sandalwood-border/70 bg-linen/50 p-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(activeSankalpa)}
                    className="rounded-lg px-2.5 py-1.5 text-xs text-ink-muted hover:text-ink hover:bg-paper"
                    aria-label="Edit commitment details"
                    title="Edit vow details"
                  >
                    <Edit3 className="size-3.5 mr-1" aria-hidden="true" />
                    <span>Edit</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(activeSankalpa, "paused")}
                    className="rounded-lg px-2.5 py-1.5 text-xs text-ink-muted hover:text-ink hover:bg-paper"
                    aria-label="Pause active vow"
                    title="Pause vow"
                  >
                    <Pause className="size-3.5 mr-1" aria-hidden="true" />
                    <span>Pause</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(activeSankalpa, "completed")}
                    className="rounded-lg px-2.5 py-1.5 text-xs text-peacock-deep hover:bg-tulsi-wash"
                    aria-label="Mark vow complete"
                    title="Complete vow"
                  >
                    <CheckCircle2 className="size-3.5 mr-1 text-peacock-deep" aria-hidden="true" />
                    <span>Complete</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSankalpa(activeSankalpa)}
                    className="rounded-lg px-2 py-1.5 text-xs text-ink-muted hover:text-kumkum hover:bg-kumkum/10"
                    aria-label="Delete active vow"
                    title="Delete vow"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-0 pt-3">
            {/* Clean Progress & Metrics Row (No duplicate cards) */}
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-sandalwood-border/60 pt-4">
              <div>
                <span className="font-serif text-3xl sm:text-4xl font-bold text-ink tabular-nums">
                  {formatRounds(activeSummary.completedRounds)}
                </span>
                <span className="ml-2 text-sm text-ink-muted font-normal">
                  of {formatRounds(activeSummary.targetRounds)} rounds completed
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-ink-muted">
                  Remaining:{" "}
                  <strong className="font-serif text-sm font-semibold text-ink tabular-nums">
                    {formatRounds(activeSummary.remainingRounds)} rounds
                  </strong>
                </span>
                <span className="rounded-md border border-sandalwood-border bg-linen/80 px-2.5 py-0.5 font-bold text-peacock-deep tabular-nums">
                  {activeSummary.progressPercentage}%
                </span>
              </div>
            </div>

            {/* Visual Progress Bar with Subtle Milestone Ticks */}
            <div className="space-y-2">
              <div className="relative">
                <ProgressBar
                  value={activeSummary.completedRounds}
                  max={activeSummary.targetRounds}
                  label="Vow progress"
                  showValueLabel={false}
                  tone={activeSummary.isCompleted ? "peacock" : "gold"}
                />

                {/* Milestone Tick Marks (25%, 50%, 75%) */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-between px-[25%] opacity-60"
                >
                  <span className="h-3 w-0.5 bg-paper rounded-full" />
                </div>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-between px-[50%] opacity-60"
                >
                  <span className="h-3 w-0.5 bg-paper rounded-full" />
                </div>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-between px-[75%] opacity-60"
                >
                  <span className="h-3 w-0.5 bg-paper rounded-full" />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-ink-muted pt-0.5">
                <span>0 rounds</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100% Target ({formatRounds(activeSummary.targetRounds)})</span>
              </div>
            </div>

            {portfolio.count > 1 && (
              <p className="text-xs text-ink-muted pt-1">
                Step 1 of your sacred roadmap. Completing this vow advances you to your next planned offerings ({formatRounds(portfolio.totalTargetRounds)} total rounds across {portfolio.count} vows).
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        /* INACTIVE / EMPTY STATE: Inviting Devotees to Begin a Sacred Vow */
        <Card surface="linen" className="rounded-2xl p-6 sm:p-8">
          <CardContent className="space-y-6 p-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-linen border border-sandalwood-border text-peacock-deep shadow-2xs">
                  <Target className="size-6 text-peacock-deep" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <h3 className="font-serif text-2xl font-semibold text-ink">
                    Begin a Sacred Chanting Vow (Sankalpa)
                  </h3>
                  <p className="max-w-xl text-sm leading-relaxed text-ink-muted text-pretty">
                    A Sankalpa is a formal spiritual commitment that anchors your mind
                    and elevates your chanting. Every round you chant with dedication
                    simultaneously counts toward your daily Sadhana and your personal vow.
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={() => handleOpenCreate()}
                className="shrink-0 rounded-xl px-5 py-2.5 shadow-sacred-xs"
              >
                <Plus className="size-4 mr-1.5" aria-hidden="true" />
                <span>Begin a Sankalpa</span>
              </Button>
            </div>

            {/* Quick Template Presets */}
            <div className="space-y-2.5 border-t border-sandalwood-border pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-peacock-deep">
                Suggested Sacred Commitments
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => handleOpenCreate(preset)}
                    className="flex flex-col justify-between rounded-xl border border-sandalwood-border/80 bg-paper p-3.5 text-left transition-all duration-150 hover:border-gold-border hover:shadow-sacred-xs active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-antique"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-ink">
                          {preset.title}
                        </span>
                        <Badge variant="gold" className="text-[10px] tabular-nums">
                          {formatRounds(preset.rounds)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                        {preset.description}
                      </p>
                    </div>
                    <span className="mt-3 flex items-center text-[11px] font-medium text-peacock-deep">
                      Select vow →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SACRED VOWS ROADMAP (Single Unified Roadmap & Formula Card) */}
      {(portfolio.count > 1 || upcomingSankalpas.length > 0) && (
        <Card
          surface="elevated"
          className="overflow-hidden rounded-2xl border border-sandalwood-border/80 bg-paper p-5 sm:p-7 shadow-sm space-y-6"
        >
          <CardHeader className="p-0 pb-1">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sandalwood-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-tulsi-wash border border-peacock-green/40 text-peacock-deep shadow-2xs">
                  <ListOrdered className="size-4 text-peacock-deep" aria-hidden="true" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="font-serif text-lg font-bold text-ink sm:text-xl">
                      Sacred Vows Roadmap
                    </CardTitle>
                    <span className="rounded-full border border-sandalwood-border/80 bg-linen/70 px-2 py-0.5 font-devanagari text-[11px] font-semibold text-ink-muted">
                      संकल्प माला
                    </span>
                  </div>
                  <CardDescription className="text-xs text-ink-muted">
                    Your sequential offerings · Clear Step 1 first, then advance in order
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full border border-sandalwood-border/80 bg-linen/80 px-3 py-1 text-xs font-semibold text-ink tabular-nums">
                  {portfolio.count} Vows · {formatRounds(portfolio.totalTargetRounds)} Total Rounds
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-0">
            {/* Sequential Roadmap Vows List (Ascending chronological order) */}
            <div className="space-y-2.5">
              {portfolio.vowsBreakdown.map((item) => {
                const isCurrentActive = item.status === "active";
                const isNextInLine = !isCurrentActive && item.stepIndex === 2;
                const matchingRecord = sankalpas.find((s) => s.id === item.id);

                return (
                  <div
                    key={item.id}
                    className={`group flex flex-col gap-3 rounded-xl border p-3.5 transition-all sm:flex-row sm:items-center sm:justify-between ${
                      isCurrentActive
                        ? "border-peacock-green/40 bg-tulsi-wash/40 shadow-2xs"
                        : isNextInLine
                        ? "border-sandalwood-border/90 bg-paper hover:border-gold-border/70 shadow-2xs"
                        : "border-sandalwood-border/60 bg-paper/60 hover:bg-paper hover:border-sandalwood-border"
                    }`}
                  >
                    {/* Left: Step indicator + Title + Meta */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isCurrentActive
                            ? "bg-peacock-deep text-paper"
                            : isNextInLine
                            ? "border border-gold-border/80 bg-linen text-gold-ink font-bold"
                            : "border border-sandalwood-border bg-linen text-ink-muted"
                        }`}
                      >
                        {item.stepIndex}
                      </span>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4
                            className="font-serif text-sm sm:text-base font-semibold text-ink truncate max-w-[260px] sm:max-w-[340px]"
                            title={item.title}
                          >
                            {item.title}
                          </h4>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              isCurrentActive
                                ? "border border-peacock-green/30 bg-tulsi-wash text-peacock-deep flex items-center gap-1"
                                : isNextInLine
                                ? "border border-gold-border/60 bg-gold-wash/80 text-gold-ink"
                                : "border border-sandalwood-border/60 bg-linen/70 text-ink-muted"
                            }`}
                          >
                            {isCurrentActive ? (
                              <>
                                <span className="size-1.5 rounded-full bg-peacock-deep animate-pulse" />
                                <span>Active Now</span>
                              </>
                            ) : isNextInLine ? (
                              "Up Next"
                            ) : (
                              `Queued`
                            )}
                          </span>
                        </div>

                        <p className="text-xs text-ink-muted">
                          <span className="font-serif font-bold text-ink tabular-nums">
                            {formatRounds(item.targetRounds)} rounds
                          </span>{" "}
                          · {item.percentageOfTotal}% of total portfolio
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isCurrentActive ? (
                        <span className="text-xs font-medium text-peacock-deep italic px-2">
                          Currently in progress
                        </span>
                      ) : (
                        <>
                          {matchingRecord && (
                            <Button
                              variant={isNextInLine ? "primary" : "outline"}
                              size="sm"
                              onClick={() => handleToggleStatus(matchingRecord, "active")}
                              className={`rounded-lg text-xs font-semibold px-3 py-1.5 ${
                                isNextInLine
                                  ? "bg-peacock-deep text-paper hover:bg-peacock-deep/90 shadow-2xs"
                                  : "border-sandalwood-border/80 bg-paper hover:border-gold-border text-ink"
                              }`}
                              title={
                                activeSankalpa
                                  ? `Start now (safely pauses "${activeSankalpa.title}")`
                                  : "Start this vow now"
                              }
                            >
                              <Play className="size-3 mr-1 fill-current" aria-hidden="true" />
                              <span>{isNextInLine ? "Start Vow Now" : "Make Active"}</span>
                            </Button>
                          )}

                          {activeSankalpa && matchingRecord && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMergeIntoActive(matchingRecord)}
                              className="rounded-lg text-xs text-ink-muted hover:text-ink hover:bg-gold-wash/40 px-2.5 py-1.5"
                              title={`Combine ${formatRounds(item.targetRounds)} rounds into "${activeSankalpa.title}"`}
                            >
                              <Plus className="size-3 mr-1 text-gold-antique" aria-hidden="true" />
                              <span>Merge</span>
                            </Button>
                          )}

                          {matchingRecord && (
                            <div className="flex items-center gap-1 border-l border-sandalwood-border/60 pl-1.5 ml-0.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(matchingRecord)}
                                className="flex size-7 items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-linen transition-colors"
                                title="Edit vow details"
                                aria-label={`Edit ${item.title}`}
                              >
                                <Edit3 className="size-3.5" aria-hidden="true" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSankalpa(matchingRecord)}
                                className="flex size-7 items-center justify-center rounded-lg text-ink-muted hover:text-kumkum hover:bg-kumkum/10 transition-colors"
                                title="Delete vow"
                                aria-label={`Delete ${item.title}`}
                              >
                                <Trash2 className="size-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grounded Mathematical Summation Strip (A + B + C = Total) */}
            <div className="rounded-xl border border-sandalwood-border/70 bg-linen/40 p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Calculator className="size-3.5 text-peacock-deep" aria-hidden="true" />
                  <span className="tracking-wide">Sacred Vow Target Formula (A + B + C = Total)</span>
                </span>
                <span className="rounded-full border border-sandalwood-border/70 bg-paper px-2.5 py-0.5 text-[11px] font-medium text-ink-muted tabular-nums">
                  {portfolio.count} vows = 100% target accounted
                </span>
              </div>

              {/* Equation Terms: Operands with letter badges + Operators bound neatly */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {portfolio.vowsBreakdown.map((item, idx) => (
                  <div key={item.id} className="inline-flex items-center gap-2">
                    <div
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs shadow-2xs transition-all ${
                        item.status === "active"
                          ? "border-peacock-green/40 bg-tulsi-wash/90 text-peacock-deep font-semibold"
                          : "border-sandalwood-border/80 bg-paper text-ink"
                      }`}
                    >
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase ${
                          item.status === "active"
                            ? "bg-peacock-deep text-paper"
                            : "bg-sandalwood-border/60 text-ink-muted"
                        }`}
                      >
                        {item.letter}
                      </span>
                      <span className="max-w-[140px] truncate" title={item.title}>
                        {item.title}
                      </span>
                      <span className="font-serif font-bold text-peacock-deep tabular-nums">
                        {formatRounds(item.targetRounds)}
                      </span>
                    </div>

                    {idx < portfolio.vowsBreakdown.length - 1 && (
                      <span aria-hidden="true" className="font-serif text-sm font-bold text-ink-muted px-0.5">
                        +
                      </span>
                    )}
                  </div>
                ))}

                <div className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="font-serif text-base font-bold text-ink px-0.5">
                    =
                  </span>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-gold-border/80 bg-paper px-3.5 py-1.5 text-xs font-bold text-ink shadow-2xs">
                    <LotusEmblem size={14} className="text-gold-antique shrink-0" />
                    <span>Total Combined Target:</span>
                    <span className="font-serif text-sm font-bold text-peacock-deep tabular-nums">
                      {formatRounds(portfolio.totalTargetRounds)}
                    </span>
                    <span className="font-normal text-ink-muted text-[11px]">rounds</span>
                  </div>
                </div>
              </div>

              {/* Grounded text formula summary */}
              {portfolio.equationShort && (
                <p className="text-[11px] text-ink-muted leading-relaxed border-t border-sandalwood-border/50 pt-2.5">
                  <strong className="font-semibold text-ink">Equation summary:</strong> {portfolio.equationShort}
                </p>
              )}

              {/* Overall Roadmap Progress Bar */}
              <div className="space-y-1.5 pt-2 border-t border-sandalwood-border/50">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span>Total Roadmap Progress</span>
                  <span className="font-semibold text-peacock-deep tabular-nums">
                    {formatRounds(portfolio.totalCompletedRounds)} / {formatRounds(portfolio.totalTargetRounds)} rounds ({portfolio.overallProgressPercentage}%)
                  </span>
                </div>
                <ProgressBar
                  value={portfolio.totalCompletedRounds}
                  max={portfolio.totalTargetRounds}
                  label="Total roadmap progress"
                  tone={portfolio.overallProgressPercentage >= 100 ? "peacock" : "gold"}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* COMPLETED VOWS DRAWER / ARCHIVE */}
      {showHistory && completedSankalpas.length > 0 && (
        <Card surface="parchment" className="rounded-[20px] p-5 sm:p-6 animate-in fade-in duration-200">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <History className="size-4 text-peacock-deep" aria-hidden="true" />
              <span>Completed Vows Archive</span>
            </CardTitle>
            <CardDescription className="text-xs">
              All personal chanting resolutions successfully fulfilled.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-sandalwood-border">
              {completedSankalpas.map((sankalpa) => {
                const summary = summarizeSankalpa(sankalpa);
                return (
                  <li
                    key={sankalpa.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-ink">{sankalpa.title}</span>
                        <Badge variant="peacock" className="capitalize text-[10px]">
                          Completed
                        </Badge>
                      </div>
                      <p className="text-xs text-ink-muted tabular-nums">
                        {summary.completedRounds} / {summary.targetRounds} rounds completed ({summary.progressPercentage}%)
                        {sankalpa.completed_at ? ` · Fulfilled on ${sankalpa.completed_at.slice(0, 10)}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => handleOpenAddRounds(sankalpa)}
                        className="rounded-[10px] px-2.5 text-xs font-semibold"
                        title="Add rounds to re-open this vow"
                      >
                        <Plus className="size-3 mr-1" aria-hidden="true" />
                        <span>Add Rounds</span>
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleToggleStatus(sankalpa, "active")}
                        className="rounded-[10px] text-xs"
                        title={
                          activeSankalpa
                            ? `Reactivate (will pause "${activeSankalpa.title}")`
                            : "Reactivate this vow"
                        }
                      >
                        <Play className="size-3 mr-1" aria-hidden="true" />
                        <span>Reactivate</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(sankalpa)}
                        className="rounded-[10px] text-xs"
                      >
                        <Edit3 className="size-3 mr-1" aria-hidden="true" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSankalpa(sankalpa)}
                        className="rounded-[10px] px-2.5 text-xs text-kumkum hover:bg-kumkum/10 hover:text-kumkum"
                        aria-label="Delete completed vow"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* CREATE SANKALPA DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent
          title="Begin a Sacred Sankalpa"
          description="Establish a formal personal vow for your chanting practice. Every round dedicated to this vow also strengthens your daily, monthly, and lifetime progress."
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="rounded-[10px] border border-kumkum/40 bg-kumkum/10 p-3 text-xs font-medium text-kumkum"
              >
                {formError}
              </div>
            )}

            {/* Quick helper if user already has an active vow */}
            {activeSankalpa && (
              <div className="rounded-[14px] border border-gold-border/60 bg-gold-wash/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gold-ink">
                    Active Vow: {activeSankalpa.title} ({formatRounds(activeSankalpa.completed_rounds)} / {formatRounds(activeSankalpa.target_rounds)} rounds)
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-ink-muted">
                  Looking to add more rounds to &ldquo;{activeSankalpa.title}&rdquo;? You can extend it directly instead of creating a separate vow.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreateOpen(false);
                    handleOpenAddRounds(activeSankalpa);
                  }}
                  className="rounded-[8px] border-gold-border/60 bg-paper text-xs font-semibold text-peacock-deep hover:bg-gold-wash"
                >
                  <Plus className="size-3.5 mr-1" />
                  <span>Add rounds to &ldquo;{activeSankalpa.title}&rdquo; instead</span>
                </Button>
              </div>
            )}

            <FormField
              id="create-sankalpa-title"
              label="Sankalpa Title / Name"
              hint="e.g. Kartik 1 Lakh Nama Japa, Gita Jayanti Offering"
              required
            >
              <Input
                id="create-sankalpa-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Name your sacred vow"
                required
                maxLength={120}
              />
            </FormField>

            <FormField
              id="create-sankalpa-desc"
              label="Personal Intention (Optional)"
              hint="Express your sincere devotional purpose or prayer"
            >
              <Textarea
                id="create-sankalpa-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="e.g. Dedicated for spiritual purification and love for Sri Sri Radha Krishna"
                rows={2}
                maxLength={500}
              />
            </FormField>

            <FormField
              id="create-sankalpa-target"
              label="Target Number of Rounds"
              hint="Total rounds you resolve to complete"
              required
            >
              <Input
                id="create-sankalpa-target"
                type="number"
                min={1}
                max={1000000}
                value={formTargetRounds}
                onChange={(e) => setFormTargetRounds(Number(e.target.value))}
                required
              />
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {[108, 500, 1008, 5000, 10000, 100000].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setFormTargetRounds(num)}
                    className="rounded-[8px] border border-sandalwood-border bg-linen px-2.5 py-1 text-[11px] font-medium text-ink transition-colors hover:border-gold-border hover:bg-paper"
                  >
                    {formatRounds(num)} rounds
                  </button>
                ))}
              </div>
            </FormField>

            {/* Seamless Multi-Vow Options */}
            {activeSankalpa && (
              <div className="space-y-2 rounded-[12px] border border-sandalwood-border bg-linen/50 p-3 text-xs">
                <label className="flex cursor-pointer items-start gap-2.5 text-ink">
                  <input
                    type="checkbox"
                    checked={autoPauseExisting}
                    onChange={(e) => setAutoPauseExisting(e.target.checked)}
                    className="mt-0.5 size-4 rounded accent-peacock-deep"
                  />
                  <span className="space-y-0.5">
                    <span className="block font-semibold">
                      Make this new vow active immediately
                    </span>
                    <span className="block text-ink-muted text-[11px]">
                      Safely pauses &ldquo;{activeSankalpa.title}&rdquo; so upcoming rounds count toward this new vow. You can resume &ldquo;{activeSankalpa.title}&rdquo; anytime.
                    </span>
                  </span>
                </label>

                {activeSankalpa.completed_rounds > 0 && (
                  <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-ink border-t border-sandalwood-border/60">
                    <input
                      type="checkbox"
                      checked={creditCurrentChanting}
                      onChange={(e) => setCreditCurrentChanting(e.target.checked)}
                      className="mt-0.5 size-4 rounded accent-peacock-deep"
                    />
                    <span className="space-y-0.5">
                      <span className="block font-semibold">
                        Credit current completed chanting ({formatRounds(activeSankalpa.completed_rounds)} rounds)
                      </span>
                      <span className="block text-ink-muted text-[11px]">
                        Start this new vow with {formatRounds(activeSankalpa.completed_rounds)} rounds already completed.
                      </span>
                    </span>
                  </label>
                )}
              </div>
            )}

            {lifetimeRounds > 0 && (
              <label className="flex cursor-pointer items-start gap-2.5 rounded-[12px] border border-gold-border/50 bg-gold-wash/50 p-3 text-xs text-ink transition-colors hover:bg-gold-wash/70">
                <input
                  type="checkbox"
                  checked={includeLifetimeRounds}
                  onChange={(e) => setIncludeLifetimeRounds(e.target.checked)}
                  className="mt-0.5 size-4 rounded accent-peacock-deep"
                />
                <span className="space-y-0.5">
                  <span className="block font-semibold text-ink">
                    Include verified previous lifetime chanting ({formatRounds(lifetimeRounds)} rounds)
                  </span>
                  <span className="block text-ink-muted leading-relaxed">
                    Credit your previously verified chanting rounds toward this vow, beginning with{" "}
                    <strong className="font-semibold text-gold-ink">
                      {formatRounds(Math.min(formTargetRounds, lifetimeRounds))} rounds
                    </strong>{" "}
                    already completed.
                  </span>
                </span>
              </label>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="create-sankalpa-start" label="Start Date">
                <Input
                  id="create-sankalpa-start"
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  required
                />
              </FormField>

              <FormField
                id="create-sankalpa-end"
                label="Target End Date (Optional)"
                hint="Target date for completion"
              >
                <Input
                  id="create-sankalpa-end"
                  type="date"
                  value={formEndDate}
                  min={formStartDate || todayDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                />
              </FormField>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-sandalwood-border/80 pt-4">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting}
                className="rounded-xl px-5 font-bold shadow-xs active:scale-[0.97]"
              >
                <LotusEmblem size={15} className="mr-1.5 text-gold-antique" />
                <span>{isSubmitting ? "Saving Vow..." : "Save & Begin Sankalpa"}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD ROUNDS / PLAN NEW SANKALPA DIALOG */}
      <Dialog open={isAddRoundsOpen} onOpenChange={setIsAddRoundsOpen}>
        <DialogContent
          title={addRoundsMode === "new_vow" ? "Plan New Sacred Sankalpa" : "Add Rounds & Extend Vow"}
          description={
            targetSankalpaForAdd
              ? addRoundsMode === "new_vow"
                ? `Establish a new sacred vow. You can queue it to clear after "${targetSankalpaForAdd.title}", or start it now.`
                : `Extend your committed rounds for "${targetSankalpaForAdd.title}". Your completed chanting progress is strictly preserved.`
              : "Plan or extend your sacred chanting vow."
          }
        >
          {targetSankalpaForAdd && (
            <form onSubmit={handleAddRoundsSubmit} className="space-y-4">
              {addRoundsError && (
                <div
                  role="alert"
                  className="rounded-[10px] border border-kumkum/40 bg-kumkum/10 p-3 text-xs font-medium text-kumkum"
                >
                  {addRoundsError}
                </div>
              )}

              {/* Mode Selection Pills */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-linen/70 p-1 border border-sandalwood-border/80">
                  <button
                    type="button"
                    onClick={() => handleSwitchAddRoundsMode("new_vow")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 px-3 text-xs font-semibold transition-all ${
                      addRoundsMode === "new_vow"
                        ? "bg-paper text-peacock-deep shadow-xs border border-peacock-green/40"
                        : "text-ink-muted hover:text-ink hover:bg-paper/40"
                    }`}
                  >
                    <Sparkles className="size-3.5 text-gold-antique shrink-0" aria-hidden="true" />
                    <span>Plan Next Vow</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchAddRoundsMode("extend_existing")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 px-3 text-xs font-semibold transition-all ${
                      addRoundsMode === "extend_existing"
                        ? "bg-paper text-peacock-deep shadow-xs border border-peacock-green/40"
                        : "text-ink-muted hover:text-ink hover:bg-paper/40"
                    }`}
                  >
                    <Edit3 className="size-3.5 text-peacock-deep shrink-0" aria-hidden="true" />
                    <span>Extend Current Vow</span>
                  </button>
                </div>
                <p className="text-[11px] text-ink-muted px-1">
                  {addRoundsMode === "new_vow"
                    ? `Establish a separate new sacred vow to queue or start.`
                    : `Add more rounds to "${targetSankalpaForAdd.title}". Your completed rounds stay saved.`}
                </p>
              </div>

              {/* Sankalpa Title / Name */}
              <FormField
                id="add-rounds-title"
                label={addRoundsMode === "new_vow" ? "New Sankalpa Title / Name" : "Sankalpa Title"}
                hint={
                  addRoundsMode === "new_vow"
                    ? "Give this new vow its own unique name (e.g. Kartik 1 Lakh Nama Japa)"
                    : "Update or keep current vow title"
                }
                required
              >
                <Input
                  id="add-rounds-title"
                  value={addRoundsTitle}
                  onChange={(e) => setAddRoundsTitle(e.target.value)}
                  placeholder={
                    addRoundsMode === "new_vow"
                      ? "e.g. Kartik 1 Lakh Nama Japa, Gita Jayanti Offering"
                      : "Title of your vow"
                  }
                  required
                  maxLength={120}
                />
              </FormField>

              {/* Personal Intention */}
              <FormField
                id="add-rounds-desc"
                label="Personal Intention (Optional)"
                hint="Express your sincere devotional purpose or prayer"
              >
                <Textarea
                  id="add-rounds-desc"
                  value={addRoundsDescription}
                  onChange={(e) => setAddRoundsDescription(e.target.value)}
                  placeholder="e.g. Dedicated for spiritual purification and love for Sri Sri Radha Krishna"
                  rows={2}
                  maxLength={500}
                />
              </FormField>

              {/* Current Active Vow Reference Card */}
              <div className="grid grid-cols-2 gap-3 rounded-[14px] border border-gold-border/40 bg-gold-wash/40 p-3.5">
                <div>
                  <span className="text-[11px] font-medium text-ink-muted">
                    {addRoundsMode === "new_vow" ? "Current Active Vow Target" : "Committed Target"}
                  </span>
                  <p className="mt-0.5 font-serif text-xl font-bold text-ink tabular-nums">
                    {formatRounds(targetSankalpaForAdd.target_rounds)} rounds
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-peacock-ink">Offered So Far</span>
                  <p className="mt-0.5 font-serif text-xl font-bold text-peacock-deep tabular-nums">
                    {formatRounds(targetSankalpaForAdd.completed_rounds)} rounds
                  </p>
                </div>
              </div>

              {/* Target Rounds for this Vow */}
              <FormField
                id="add-rounds-input"
                label={addRoundsMode === "new_vow" ? "Target Rounds for New Vow" : "Additional Rounds to Add"}
                hint={
                  addRoundsMode === "new_vow"
                    ? "Total rounds you resolve to offer for this new vow"
                    : "Specify how many more rounds you resolve to add to current vow"
                }
                required
              >
                <Input
                  id="add-rounds-input"
                  type="number"
                  min={1}
                  max={1000000}
                  value={additionalRounds}
                  onChange={(e) => setAdditionalRounds(Math.max(0, Number(e.target.value)))}
                  placeholder="e.g. 1000"
                  required
                />
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {[108, 500, 1000, 1008, 5000, 10000].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAdditionalRounds(num)}
                      className={`rounded-[8px] border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        additionalRounds === num
                          ? "border-peacock-deep bg-tulsi-wash font-semibold text-peacock-deep"
                          : "border-sandalwood-border bg-linen text-ink hover:border-gold-border hover:bg-paper"
                      }`}
                    >
                      +{formatRounds(num)} rounds
                    </button>
                  ))}
                </div>
              </FormField>

              {/* In New Vow Mode: Target Type Selector (Standalone vs Combined) */}
              {addRoundsMode === "new_vow" && (
                <div className="space-y-1.5 rounded-[12px] border border-gold-border/60 bg-gold-wash/40 p-3 text-xs">
                  <span className="font-semibold text-gold-ink block">New Vow Target Type</span>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className={`flex cursor-pointer items-center gap-2 rounded-[8px] border p-2 text-xs transition-colors ${
                      newVowTargetType === "standalone"
                        ? "border-peacock-deep bg-paper font-semibold text-peacock-deep shadow-xs"
                        : "border-sandalwood-border bg-linen/60 text-ink-muted hover:bg-paper"
                    }`}>
                      <input
                        type="radio"
                        name="targetType"
                        value="standalone"
                        checked={newVowTargetType === "standalone"}
                        onChange={() => setNewVowTargetType("standalone")}
                        className="size-3.5 accent-peacock-deep"
                      />
                      <span>Fresh: {formatRounds(additionalRounds || 0)} rounds</span>
                    </label>

                    <label className={`flex cursor-pointer items-center gap-2 rounded-[8px] border p-2 text-xs transition-colors ${
                      newVowTargetType === "combined"
                        ? "border-peacock-deep bg-paper font-semibold text-peacock-deep shadow-xs"
                        : "border-sandalwood-border bg-linen/60 text-ink-muted hover:bg-paper"
                    }`}>
                      <input
                        type="radio"
                        name="targetType"
                        value="combined"
                        checked={newVowTargetType === "combined"}
                        onChange={() => setNewVowTargetType("combined")}
                        className="size-3.5 accent-peacock-deep"
                      />
                      <span>Combined: {formatRounds(targetSankalpaForAdd.target_rounds + (additionalRounds || 0))} rounds</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Target Calculation Preview */}
              <div className="rounded-[14px] border border-peacock-green/40 bg-tulsi-wash/60 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-peacock-deep">
                  <span>Target Summary</span>
                  <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] shadow-xs">
                    {addRoundsMode === "new_vow" ? "New Vow Setup" : "Extending Target"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-ink tabular-nums">
                  {addRoundsMode === "extend_existing" || newVowTargetType === "combined" ? (
                    <>
                      <div className="rounded-[8px] border border-sandalwood-border bg-paper px-2.5 py-1 font-semibold">
                        {formatRounds(targetSankalpaForAdd.target_rounds)} current
                      </div>
                      <span className="font-bold text-ink-muted">+</span>
                      <div className="rounded-[8px] border border-gold-border bg-gold-wash px-2.5 py-1 font-bold text-gold-ink">
                        {formatRounds(additionalRounds || 0)} added
                      </div>
                      <span className="font-bold text-ink-muted">=</span>
                      <div className="rounded-[8px] border border-peacock-deep/30 bg-paper px-2.5 py-1 font-bold text-peacock-deep">
                        {formatRounds(targetSankalpaForAdd.target_rounds + (additionalRounds || 0))} target rounds
                      </div>
                    </>
                  ) : (
                    <div className="rounded-[8px] border border-peacock-deep/30 bg-paper px-3 py-1 font-bold text-peacock-deep">
                      {formatRounds(additionalRounds || 0)} total target rounds for this new vow
                    </div>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-ink-muted">
                  {addRoundsMode === "new_vow"
                    ? `This vow will be committed for ${formatRounds(
                        newVowTargetType === "combined"
                          ? targetSankalpaForAdd.target_rounds + (additionalRounds || 0)
                          : (additionalRounds || 0)
                      )} rounds.`
                    : `Your completed chanting (${formatRounds(targetSankalpaForAdd.completed_rounds)} rounds) remains counted. Remaining rounds will become ${formatRounds(
                        Math.max(
                          0,
                          targetSankalpaForAdd.target_rounds +
                            (additionalRounds || 0) -
                            targetSankalpaForAdd.completed_rounds
                        )
                      )} rounds.`}
                </p>
              </div>

              {/* Chanting Order / Sequence Options in New Vow Mode */}
              {addRoundsMode === "new_vow" && (
                <div className="space-y-2 rounded-[14px] border border-sandalwood-border bg-linen/60 p-3.5 text-xs">
                  <span className="font-semibold text-ink flex items-center justify-between">
                    <span>Chanting Order &amp; Scheduling</span>
                    <span className="text-[11px] font-normal text-peacock-deep">
                      {newVowQueueOption === "queue_after" ? "Clear current vow first" : "Active immediately"}
                    </span>
                  </span>

                  <div className="space-y-2 pt-0.5">
                    <label className={`flex cursor-pointer items-start gap-2.5 rounded-[10px] border p-2.5 transition-colors ${
                      newVowQueueOption === "queue_after"
                        ? "border-gold-border/80 bg-paper shadow-xs"
                        : "border-sandalwood-border bg-paper/50 hover:bg-paper"
                    }`}>
                      <input
                        type="radio"
                        name="queueOption"
                        value="queue_after"
                        checked={newVowQueueOption === "queue_after"}
                        onChange={() => setNewVowQueueOption("queue_after")}
                        className="mt-0.5 size-4 accent-peacock-deep"
                      />
                      <div className="space-y-0.5">
                        <span className="block font-semibold text-ink">
                          Queue as Next Vow (Clear &ldquo;{targetSankalpaForAdd.title}&rdquo; first)
                        </span>
                        <span className="block text-ink-muted text-[11px] leading-relaxed">
                          &ldquo;{targetSankalpaForAdd.title}&rdquo; remains active so you can clear it first. This new vow waits safely under Upcoming Vows ready to start once you finish!
                        </span>
                      </div>
                    </label>

                    <label className={`flex cursor-pointer items-start gap-2.5 rounded-[10px] border p-2.5 transition-colors ${
                      newVowQueueOption === "activate_now"
                        ? "border-gold-border/80 bg-paper shadow-xs"
                        : "border-sandalwood-border bg-paper/50 hover:bg-paper"
                    }`}>
                      <input
                        type="radio"
                        name="queueOption"
                        value="activate_now"
                        checked={newVowQueueOption === "activate_now"}
                        onChange={() => setNewVowQueueOption("activate_now")}
                        className="mt-0.5 size-4 accent-peacock-deep"
                      />
                      <div className="space-y-0.5">
                        <span className="block font-semibold text-ink">
                          Start Chanting Now (Pauses &ldquo;{targetSankalpaForAdd.title}&rdquo;)
                        </span>
                        <span className="block text-ink-muted text-[11px] leading-relaxed">
                          Make this new vow active immediately. &ldquo;{targetSankalpaForAdd.title}&rdquo; is safely paused and can be resumed anytime.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Start Date & Target End Date */}
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="add-rounds-start-date" label="Start Date" required>
                  <Input
                    id="add-rounds-start-date"
                    type="date"
                    value={addRoundsStartDate}
                    onChange={(e) => setAddRoundsStartDate(e.target.value)}
                    required
                  />
                </FormField>

                <FormField
                  id="add-rounds-end-date"
                  label="Target End Date (Optional)"
                  hint="Target date for completion"
                >
                  <Input
                    id="add-rounds-end-date"
                    type="date"
                    value={addRoundsEndDate}
                    min={addRoundsStartDate || todayDate}
                    onChange={(e) => setAddRoundsEndDate(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-sandalwood-border/80 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsAddRoundsOpen(false)}
                  disabled={isSubmittingAddRounds}
                  className="rounded-xl px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={
                    isSubmittingAddRounds ||
                    !additionalRounds ||
                    additionalRounds < 1 ||
                    addRoundsTitle.trim().length < 2
                  }
                  className="rounded-xl px-5 font-bold shadow-xs active:scale-[0.97]"
                >
                  <LotusEmblem size={15} className="mr-1.5 text-gold-antique" />
                  <span>
                    {isSubmittingAddRounds
                      ? "Saving Vow..."
                      : addRoundsMode === "new_vow"
                      ? newVowQueueOption === "queue_after"
                        ? `Queue Next Vow (${formatRounds(
                            newVowTargetType === "combined"
                              ? targetSankalpaForAdd.target_rounds + (additionalRounds || 0)
                              : (additionalRounds || 0)
                          )} Rounds)`
                        : `Save & Begin New Vow (${formatRounds(
                            newVowTargetType === "combined"
                              ? targetSankalpaForAdd.target_rounds + (additionalRounds || 0)
                              : (additionalRounds || 0)
                          )} Rounds)`
                      : `Update & Extend Vow (${formatRounds(targetSankalpaForAdd.target_rounds + (additionalRounds || 0))} Rounds)`}
                  </span>
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT SANKALPA DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent
          title="Edit Sankalpa Details"
          description="Adjust your commitment title, target, or completion date. Your accumulated progress of completed rounds is strictly preserved."
        >
          {editingSankalpa && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {formError && (
                <div
                  role="alert"
                  className="rounded-[10px] border border-kumkum/40 bg-kumkum/10 p-3 text-xs font-medium text-kumkum"
                >
                  {formError}
                </div>
              )}

              {/* Progress Protection Callout */}
              <div className="rounded-[10px] border border-peacock-green/40 bg-tulsi-wash/70 p-3 text-xs text-peacock-ink">
                <strong>Progress preserved:</strong> You have completed{" "}
                <span className="font-bold tabular-nums">
                  {editingSankalpa.completed_rounds} rounds
                </span>
                . Editing your target will update remaining rounds without altering your history.
              </div>

              <FormField
                id="edit-sankalpa-title"
                label="Sankalpa Title"
                required
              >
                <Input
                  id="edit-sankalpa-title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  maxLength={120}
                />
              </FormField>

              <FormField
                id="edit-sankalpa-desc"
                label="Personal Intention"
              >
                <Textarea
                  id="edit-sankalpa-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  maxLength={500}
                />
              </FormField>

              <FormField
                id="edit-sankalpa-target"
                label="Target Number of Rounds"
                required
              >
                <Input
                  id="edit-sankalpa-target"
                  type="number"
                  min={1}
                  max={1000000}
                  value={formTargetRounds}
                  onChange={(e) => setFormTargetRounds(Number(e.target.value))}
                  required
                />
              </FormField>

              <FormField
                id="edit-sankalpa-end"
                label="Target End Date (Optional)"
              >
                <Input
                  id="edit-sankalpa-end"
                  type="date"
                  value={formEndDate}
                  min={editingSankalpa.start_date}
                  onChange={(e) => setFormEndDate(e.target.value)}
                />
              </FormField>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-sandalwood-border/80 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                  className="rounded-xl px-5 font-bold shadow-xs active:scale-[0.97]"
                >
                  <LotusEmblem size={15} className="mr-1.5 text-gold-antique" />
                  <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
