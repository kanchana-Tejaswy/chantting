"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  HelpCircle,
  Info,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  HeatmapCellStatus,
  HeatmapDayCell,
  HeatmapWeekColumn,
} from "@/lib/sadhana/analytics";
import type { SadhanaDayDetailPayload } from "@/lib/sadhana/queries";
import { LotusEmblem } from "@/components/sacred/ornaments";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const WEEKDAY_LABELS = ["Sun", "", "Tue", "", "Thu", "", "Sat"] as const;

function getCellClass(status: HeatmapCellStatus): string {
  switch (status) {
    case "future":
      return "border border-sandalwood-border/30 bg-paper/30 opacity-30 cursor-not-allowed";
    case "missing_data":
      return "border border-dashed border-sandalwood-strong/60 bg-transparent hover:border-gold-antique hover:bg-gold-wash/40";
    case "zero_activity":
      return "border border-[#A89F91] bg-[#DFD9CE] hover:border-krishna-midnight hover:scale-110 shadow-2xs";
    case "partial_low":
      return "border border-[#F59E0B] bg-[#FEF08A] hover:border-[#D97706] hover:scale-110 shadow-2xs";
    case "partial_medium":
      return "border border-[#D97706] bg-[#FBBF24] hover:border-[#B45309] hover:scale-110 shadow-2xs";
    case "partial_high":
      return "border border-[#B45309] bg-[#F59E0B] hover:border-krishna-midnight hover:scale-110 shadow-2xs";
    case "target_met":
      return "border border-peacock-ink bg-peacock-green hover:border-krishna-midnight hover:scale-110 shadow-xs";
  }
}

function describeCellAria(cell: HeatmapDayCell): string {
  if (cell.status === "future") return `${cell.date}: Upcoming date`;
  if (cell.status === "missing_data") return `${cell.date}: No record (missing / pre-join)`;
  if (cell.status === "zero_activity") {
    return `${cell.date}: 0 rounds recorded (target ${cell.effectiveTarget})`;
  }
  return `${cell.date}: ${cell.completedRounds} of ${cell.effectiveTarget} rounds${
    cell.targetMet ? " (target met)" : ""
  }`;
}

function formatReadableDate(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split("-").map(Number);
    if (!y || !m || !d) return isoDate;
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return isoDate;
  }
}

export interface ConsistencyHeatmapProps {
  selectedYear: number;
  currentYear: number;
  todayDate: string;
  weeks: HeatmapWeekColumn[];
  initialDayDetail: SadhanaDayDetailPayload;
  baseHref?: string;
}

export function ConsistencyHeatmap({
  selectedYear,
  currentYear,
  todayDate,
  weeks,
  initialDayDetail,
  baseHref = "/sadhana/analytics",
}: ConsistencyHeatmapProps) {
  const [selectedDate, setSelectedDate] = React.useState(initialDayDetail.date);
  const [detail, setDetail] =
    React.useState<SadhanaDayDetailPayload>(initialDayDetail);
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [showGuide, setShowGuide] = React.useState(false);
  const [hoveredCell, setHoveredCell] = React.useState<HeatmapDayCell | null>(null);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const todayButtonRef = React.useRef<HTMLButtonElement | null>(null);

  // Month header alignments
  const monthHeaders = React.useMemo(() => {
    const labels: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    for (const week of weeks) {
      const firstCell = week.days.find((d) => d !== null);
      if (firstCell && firstCell.month !== lastMonth) {
        labels.push({
          weekIndex: week.weekIndex,
          label: MONTH_ABBR[firstCell.month]!,
        });
        lastMonth = firstCell.month;
      }
    }
    return labels;
  }, [weeks]);

  // Year summary metrics for quick understanding
  const yearSummary = React.useMemo(() => {
    let activeDays = 0;
    let targetMetDays = 0;
    let totalRounds = 0;
    let recordedDays = 0;

    for (const week of weeks) {
      for (const cell of week.days) {
        if (!cell || cell.status === "future") continue;
        if (cell.hasRecord) recordedDays++;
        if (cell.completedRounds > 0) {
          activeDays++;
          totalRounds += cell.completedRounds;
        }
        if (cell.targetMet) {
          targetMetDays++;
        }
      }
    }

    return { activeDays, targetMetDays, totalRounds, recordedDays };
  }, [weeks]);

  // Scroll to today's week on initial mount if viewing current year
  React.useEffect(() => {
    if (selectedYear === currentYear && scrollContainerRef.current) {
      // Find today's week index
      let targetWeekIndex = -1;
      for (const week of weeks) {
        if (week.days.some((d) => d?.date === todayDate)) {
          targetWeekIndex = week.weekIndex;
          break;
        }
      }

      if (targetWeekIndex >= 0) {
        const container = scrollContainerRef.current;
        // Each week column is 14px + 4px gap = 18px
        const scrollPosition = Math.max(0, targetWeekIndex * 18 - container.clientWidth / 2);
        container.scrollTo({ left: scrollPosition, behavior: "smooth" });
      }
    }
  }, [selectedYear, currentYear, todayDate, weeks]);

  const handleScrollToToday = () => {
    if (scrollContainerRef.current) {
      let targetWeekIndex = -1;
      let todayCell: HeatmapDayCell | null = null;
      for (const week of weeks) {
        const found = week.days.find((d) => d?.date === todayDate);
        if (found) {
          targetWeekIndex = week.weekIndex;
          todayCell = found;
          break;
        }
      }

      if (targetWeekIndex >= 0) {
        const container = scrollContainerRef.current;
        const scrollPosition = Math.max(0, targetWeekIndex * 18 - container.clientWidth / 2);
        container.scrollTo({ left: scrollPosition, behavior: "smooth" });
      }

      if (todayCell) {
        void handleSelectDate(todayCell);
      }
    }
  };

  const handleSelectDate = async (cell: HeatmapDayCell) => {
    if (cell.status === "future") return;
    setSelectedDate(cell.date);
    setIsLoadingDetail(true);
    setDetailError(null);

    try {
      const res = await fetch(
        `/api/sadhana/day-detail?date=${encodeURIComponent(cell.date)}`
      );
      const json = (await res.json()) as SadhanaDayDetailPayload & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Unable to load selected day details.");
      }
      setDetail(json);
    } catch (err) {
      setDetailError(
        err instanceof Error ? err.message : "Could not load date detail."
      );
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card surface="parchment" className="border-gold-border/70 shadow-xs">
        <CardHeader className="flex flex-col gap-4 border-b border-sandalwood-border/40 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gold" className="text-xs">
                <LotusEmblem size={13} className="text-[#8C6F2D]" />
                <span>Daily Sādhana Map</span>
              </Badge>
              <button
                type="button"
                onClick={() => setShowGuide((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-medium text-gold-ink hover:text-ink transition-colors cursor-pointer"
                aria-expanded={showGuide}
              >
                <HelpCircle className="size-3.5" />
                <span>{showGuide ? "Hide Beginner Guide" : "How to read this calendar"}</span>
              </button>
            </div>

            <CardTitle className="flex items-center gap-2 font-display text-2xl text-ink">
              <CalendarDays
                className="size-5 text-peacock-deep"
                strokeWidth={1.75}
                aria-hidden={true}
              />
              <span>Annual Consistency Calendar ({selectedYear})</span>
            </CardTitle>

            <CardDescription className="text-xs sm:text-sm text-ink-muted">
              Every tile represents one day of your chanting year. As you complete your rounds, each day blossoms with sacred color.
            </CardDescription>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedYear === currentYear && (
              <button
                type="button"
                onClick={handleScrollToToday}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gold-border/80 bg-paper hover:bg-gold-wash/50 px-2.5 py-1.5 text-xs font-semibold text-gold-ink shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
                title="Scroll directly to today's date"
              >
                <Flame className="size-3.5 text-gold-antique" />
                <span>Jump to Today</span>
              </button>
            )}

            <div className="flex items-center gap-1 rounded-xl border border-sandalwood-border/80 bg-paper p-1 shadow-2xs">
              <Link
                href={`${baseHref}?year=${selectedYear - 1}`}
                aria-label={`View year ${selectedYear - 1}`}
                className={buttonStyles({
                  variant: "ghost",
                  size: "sm",
                  className: "h-8 px-2 text-xs text-ink-muted hover:text-ink",
                })}
              >
                <ChevronLeft className="size-3.5" aria-hidden={true} />
                <span>{selectedYear - 1}</span>
              </Link>

              <span className="min-w-14 text-center text-xs font-bold text-ink tabular-nums">
                {selectedYear}
              </span>

              {selectedYear < currentYear ? (
                <Link
                  href={`${baseHref}?year=${selectedYear + 1}`}
                  aria-label={`View year ${selectedYear + 1}`}
                  className={buttonStyles({
                    variant: "ghost",
                    size: "sm",
                    className: "h-8 px-2 text-xs text-ink-muted hover:text-ink",
                  })}
                >
                  <span>{selectedYear + 1}</span>
                  <ChevronRight className="size-3.5" aria-hidden={true} />
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex h-8 items-center gap-1 px-2 text-xs text-ink-muted/40 cursor-not-allowed"
                >
                  <span>{selectedYear + 1}</span>
                  <ChevronRight className="size-3.5" aria-hidden={true} />
                </span>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-5">
          {/* Beginner Onboarding Guide Banner */}
          {showGuide && (
            <div className="rounded-2xl border border-gold-border/80 bg-gradient-to-br from-paper to-gold-wash/40 p-4 sm:p-5 shadow-2xs animate-in fade-in-50 duration-200">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gold-antique/15 text-gold-ink">
                  <Sparkles className="size-4" />
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <h3 className="font-semibold text-ink text-sm">
                      How to Read Your Annual Sādhana Calendar
                    </h3>
                    <p className="text-ink-muted leading-relaxed mt-0.5">
                      Think of this as a 365-day garland of devotion. Each vertical column is 1 week (Sunday to Saturday). Each box is 1 day. Click or tap any box to see exact rounds and times!
                    </p>
                  </div>

                  {/* 4 Interactive Visual Tiles Explained */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1.5">
                    <div className="flex items-center gap-2.5 rounded-xl border border-sandalwood-border/60 bg-paper p-2.5 shadow-2xs">
                      <span className="size-4 rounded-[4px] border border-dashed border-sandalwood-strong/60 bg-transparent shrink-0" />
                      <div>
                        <span className="block font-semibold text-ink">1. Unrecorded Day</span>
                        <span className="text-[11px] text-ink-muted leading-tight block">
                          Before you joined or no chanting logged.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 rounded-xl border border-sandalwood-border/60 bg-paper p-2.5 shadow-2xs">
                      <span className="flex size-4 items-center justify-center rounded-[4px] border border-[#A89F91] bg-[#DFD9CE] shrink-0">
                        <span className="h-[2px] w-2 rounded-full bg-[#6B6357]" />
                      </span>
                      <div>
                        <span className="block font-semibold text-ink">2. Rest Day (0 rounds recorded)</span>
                        <span className="text-[11px] text-ink-muted leading-tight block">
                          Muted ash-stone tile with dash · 0 rounds logged.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 rounded-xl border border-gold-border/80 bg-paper p-2.5 shadow-2xs">
                      <span className="size-4 rounded-[4px] border border-[#D97706] bg-[#FBBF24] shadow-2xs shrink-0" />
                      <div>
                        <span className="block font-semibold text-amber-900">3. Partial intensity (Active)</span>
                        <span className="text-[11px] text-ink-muted leading-tight block">
                          Radiant saffron gold · Chanted 1+ rounds!
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 rounded-xl border border-peacock-ink/30 bg-paper p-2.5 shadow-2xs">
                      <span className="flex size-4 items-center justify-center rounded-[4px] border border-peacock-ink bg-peacock-green shrink-0">
                        <span className="size-1 rounded-full bg-gold-antique" />
                      </span>
                      <div>
                        <span className="block font-semibold text-peacock-deep">4. Target Fulfilled!</span>
                        <span className="text-[11px] text-ink-muted leading-tight block">
                          Your full daily round commitment met 🌸
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Year Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-sandalwood-border/60 bg-paper/60 p-3">
              <span className="block text-[11px] font-medium text-ink-muted uppercase">
                Active Days
              </span>
              <span className="mt-0.5 block text-lg font-bold text-ink tabular-nums">
                {yearSummary.activeDays}
                <span className="text-xs font-normal text-ink-muted ml-1">days</span>
              </span>
            </div>

            <div className="rounded-xl border border-sandalwood-border/60 bg-paper/60 p-3">
              <span className="block text-[11px] font-medium text-ink-muted uppercase">
                Rounds Offered
              </span>
              <span className="mt-0.5 block text-lg font-bold text-gold-ink tabular-nums">
                {yearSummary.totalRounds.toLocaleString()}
                <span className="text-xs font-normal text-ink-muted ml-1">rounds</span>
              </span>
            </div>

            <div className="rounded-xl border border-sandalwood-border/60 bg-paper/60 p-3">
              <span className="block text-[11px] font-medium text-ink-muted uppercase">
                Targets Fulfilled
              </span>
              <span className="mt-0.5 block text-lg font-bold text-peacock-deep tabular-nums">
                {yearSummary.targetMetDays}
                <span className="text-xs font-normal text-ink-muted ml-1">days met</span>
              </span>
            </div>

            <div className="rounded-xl border border-sandalwood-border/60 bg-paper/60 p-3">
              <span className="block text-[11px] font-medium text-ink-muted uppercase">
                Days Recorded
              </span>
              <span className="mt-0.5 block text-lg font-bold text-ink tabular-nums">
                {yearSummary.recordedDays}
                <span className="text-xs font-normal text-ink-muted ml-1">in {selectedYear}</span>
              </span>
            </div>
          </div>

          {/* Heatmap Grid & Tooltip Section */}
          <div className="relative">
            {/* Live Hover Tooltip Card */}
            {hoveredCell && (
              <div
                aria-live="polite"
                className="mb-2 flex items-center justify-between rounded-xl border border-gold-border/70 bg-paper px-3.5 py-2 text-xs shadow-sm transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">
                    {formatReadableDate(hoveredCell.date)}
                  </span>
                  <span className="text-ink-muted">·</span>
                  {hoveredCell.status === "future" ? (
                    <span className="text-ink-muted">Upcoming date</span>
                  ) : hoveredCell.status === "missing_data" ? (
                    <span className="text-ink-muted">No chanting record</span>
                  ) : hoveredCell.status === "zero_activity" ? (
                    <span className="text-ink-muted flex items-center gap-1.5 font-medium">
                      <span className="inline-flex size-3 items-center justify-center rounded-[2px] border border-[#A89F91] bg-[#DFD9CE]">
                        <span className="h-[2px] w-1.5 rounded-full bg-[#6B6357]" />
                      </span>
                      <span>Rest Day (0 rounds recorded)</span>
                    </span>
                  ) : hoveredCell.targetMet ? (
                    <span className="font-semibold text-peacock-green">
                      🌸 Target Met ({hoveredCell.completedRounds} / {hoveredCell.effectiveTarget} rounds)
                    </span>
                  ) : (
                    <span className="font-medium text-amber-900 flex items-center gap-1.5">
                      <span className="inline-block size-3 rounded-[2px] border border-[#D97706] bg-[#FBBF24]" />
                      <span>Partial activity: {hoveredCell.completedRounds} of {hoveredCell.effectiveTarget} rounds</span>
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-ink-muted hidden sm:inline">
                  Click to inspect details below
                </span>
              </div>
            )}

            {/* Scrollable Annual Heatmap Matrix */}
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-sandalwood-border scrollbar-track-transparent"
            >
              <div className="inline-block min-w-full">
                {/* Month Header Row */}
                <div className="mb-2 flex pl-9">
                  <div
                    className="grid gap-1"
                    style={{
                      gridTemplateColumns: `repeat(${weeks.length}, 14px)`,
                    }}
                  >
                    {weeks.map((w) => {
                      const match = monthHeaders.find(
                        (m) => m.weekIndex === w.weekIndex
                      );
                      const hasToday = w.days.some((d) => d?.date === todayDate);

                      return (
                        <div key={w.weekIndex} className="relative flex flex-col items-center">
                          {match && (
                            <span className="text-[10px] font-semibold text-ink-muted">
                              {match.label}
                            </span>
                          )}
                          {hasToday && (
                            <span
                              title="Today"
                              className="absolute -top-3.5 text-[9px] font-bold text-gold-ink uppercase tracking-wider"
                            >
                              ▼
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Weekday Labels + Week Columns */}
                <div className="flex gap-1.5">
                  <div className="grid w-7 shrink-0 grid-rows-7 gap-1 text-[10px] text-ink-muted font-medium">
                    {WEEKDAY_LABELS.map((lbl, idx) => (
                      <span key={idx} className="flex h-3.5 items-center">
                        {lbl}
                      </span>
                    ))}
                  </div>

                  <div
                    className="grid gap-1"
                    style={{
                      gridTemplateColumns: `repeat(${weeks.length}, 14px)`,
                    }}
                  >
                    {weeks.map((week) => (
                      <div key={week.weekIndex} className="grid grid-rows-7 gap-1">
                        {week.days.map((cell, dayIdx) => {
                          if (!cell) {
                            return (
                              <span
                                key={`empty-${week.weekIndex}-${dayIdx}`}
                                className="size-3.5"
                                aria-hidden="true"
                              />
                            );
                          }

                          const isToday = cell.date === todayDate;
                          const isSelected = cell.date === selectedDate;

                          return (
                            <button
                              key={cell.date}
                              type="button"
                              ref={isToday ? todayButtonRef : undefined}
                              disabled={cell.status === "future"}
                              onClick={() => void handleSelectDate(cell)}
                              onMouseEnter={() => setHoveredCell(cell)}
                              onMouseLeave={() => setHoveredCell(null)}
                              onFocus={() => setHoveredCell(cell)}
                              onBlur={() => setHoveredCell(null)}
                              title={describeCellAria(cell)}
                              aria-label={describeCellAria(cell)}
                              aria-pressed={isSelected}
                              className={cn(
                                "relative flex size-3.5 cursor-pointer items-center justify-center rounded-[3px] transition-all duration-150 focus:outline-none",
                                getCellClass(cell.status),
                                isToday &&
                                  "ring-2 ring-gold-antique ring-offset-1 ring-offset-paper z-10 scale-105",
                                isSelected &&
                                  "ring-2 ring-krishna-midnight ring-offset-1 ring-offset-paper z-20 scale-110 shadow-sm"
                              )}
                            >
                              {cell.status === "zero_activity" && (
                                <span
                                  aria-hidden="true"
                                  className="h-[2px] w-1.5 rounded-full bg-[#6B6357]"
                                />
                              )}
                              {cell.status === "target_met" && (
                                <span
                                  aria-hidden="true"
                                  className="size-1 rounded-full bg-gold-antique shadow-2xs"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile horizontal scroll hint */}
            <p className="text-[11px] text-ink-muted/80 text-center sm:hidden mt-1">
              ← Swipe horizontally to explore all months →
            </p>
          </div>

          {/* Explicit Accessible Legend with Beginner Guidance */}
          <div className="flex flex-wrap items-center justify-between gap-y-3 border-t border-sandalwood-border/60 pt-4 text-xs text-ink-muted">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="inline-flex items-center gap-1.5" title="Dates before registration or days with no records">
                <span className="inline-block size-3.5 rounded-[3px] border border-dashed border-sandalwood-strong/60 bg-transparent" />
                <span>No record (missing / pre-join)</span>
              </span>

              <span className="inline-flex items-center gap-1.5" title="Day was opened but 0 rounds were completed">
                <span className="inline-flex size-3.5 items-center justify-center rounded-[3px] border border-[#A89F91] bg-[#DFD9CE] shadow-2xs">
                  <span className="h-[2px] w-1.5 rounded-full bg-[#6B6357]" />
                </span>
                <span className="font-medium text-ink">0 rounds recorded</span>
                <span className="text-[11px] text-ink-muted">(Rest day)</span>
              </span>

              <span className="inline-flex items-center gap-1.5" title="Chanted rounds toward daily goal">
                <span className="inline-block size-3.5 rounded-[3px] border border-[#F59E0B] bg-[#FEF08A] shadow-2xs" />
                <span className="inline-block size-3.5 rounded-[3px] border border-[#D97706] bg-[#FBBF24] shadow-2xs" />
                <span className="inline-block size-3.5 rounded-[3px] border border-[#B45309] bg-[#F59E0B] shadow-2xs" />
                <span className="font-semibold text-amber-900">Partial intensity</span>
                <span className="text-[11px] text-amber-800/80">(1+ rounds active)</span>
              </span>

              <span className="inline-flex items-center gap-1.5" title="Daily round commitment fully achieved">
                <span className="inline-flex size-3.5 items-center justify-center rounded-[3px] border border-peacock-ink bg-peacock-green">
                  <span className="size-1 rounded-full bg-gold-antique" />
                </span>
                <span className="font-semibold text-peacock-deep">Daily target met</span>
              </span>
            </div>

            <span className="text-[11px] text-ink-muted font-medium">
              Tip: Click any box to inspect rounds
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Detail Panel */}
      <Card surface="elevated" className="border-gold-border/80 shadow-sm">
        <CardHeader className="flex flex-col gap-2 border-b border-sandalwood-border/40 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="tabular-nums font-display text-xl sm:text-2xl text-ink">
                Daily Detail · {selectedDate}
              </CardTitle>
              {selectedDate === todayDate && (
                <Badge variant="gold" className="text-[10px]">
                  Today
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs sm:text-sm text-ink-muted mt-0.5">
              {formatReadableDate(selectedDate)} ·{" "}
              {selectedDate === todayDate
                ? "Live chanting progress for today"
                : "Historical sādhana record"}
            </CardDescription>
          </div>

          <div>
            {isLoadingDetail ? (
              <Badge variant="neutral">Loading day...</Badge>
            ) : !detail.hasRecord ? (
              <Badge variant="neutral">No record (missing / pre-join)</Badge>
            ) : detail.dailySadhana &&
              detail.dailySadhana.completed_rounds >=
                detail.dailySadhana.effective_daily_target ? (
              <Badge variant="peacock">
                <CheckCircle2 className="size-3 mr-1" />
                <span>Target met</span>
              </Badge>
            ) : detail.dailySadhana && detail.dailySadhana.completed_rounds > 0 ? (
              <Badge variant="gold">
                <Sparkles className="size-3 mr-1 text-[#8C6F2D]" />
                <span>Partial activity</span>
              </Badge>
            ) : (
              <Badge variant="neutral">0 rounds recorded</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {detailError && (
            <p role="alert" className="text-xs text-kumkum">
              {detailError}
            </p>
          )}

          {!detail.hasRecord ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-dashed border-sandalwood-strong/80 bg-linen/50 p-4 sm:p-5 text-sm text-ink-muted">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 size-5 shrink-0 text-gold-ink" aria-hidden={true} />
                <div className="space-y-0.5">
                  <p className="font-semibold text-ink text-sm">
                    No Sādhana record exists for {formatReadableDate(detail.date)}
                  </p>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    This is completely normal for days before you began chanting on Smaran, or rest days without logs. Every new day is a fresh opportunity to connect with the holy names!
                  </p>
                </div>
              </div>

              {selectedDate === todayDate && (
                <Link
                  href="/sadhana/chant"
                  className={buttonStyles({
                    variant: "primary",
                    size: "sm",
                    className: "shrink-0 shadow-xs",
                  })}
                >
                  <Flame className="size-3.5" />
                  <span>Chant Today</span>
                </Link>
              )}
            </div>
          ) : detail.dailySadhana ? (
            <div className="space-y-5">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-xl border border-sandalwood-border/60 bg-linen/70 p-3.5">
                  <dt className="text-xs text-ink-muted font-medium">Completed</dt>
                  <dd className="mt-1 font-serif text-2xl font-bold text-peacock-ink tabular-nums">
                    {detail.dailySadhana.completed_rounds}
                  </dd>
                  <span className="text-[10px] text-ink-muted">rounds</span>
                </div>

                <div className="rounded-xl border border-sandalwood-border/60 bg-linen/70 p-3.5">
                  <dt className="text-xs text-ink-muted font-medium">Original target</dt>
                  <dd className="mt-1 font-serif text-2xl font-bold text-ink tabular-nums">
                    {detail.dailySadhana.original_daily_target}
                  </dd>
                  <span className="text-[10px] text-ink-muted">rounds</span>
                </div>

                <div className="rounded-xl border border-sandalwood-border/60 bg-linen/70 p-3.5">
                  <dt className="text-xs text-ink-muted font-medium">Carried pending</dt>
                  <dd className="mt-1 font-serif text-2xl font-bold text-gold-ink tabular-nums">
                    +{detail.dailySadhana.previous_pending_balance}
                  </dd>
                  <span className="text-[10px] text-ink-muted">from previous day</span>
                </div>

                <div className="rounded-xl border border-sandalwood-border/60 bg-linen/70 p-3.5">
                  <dt className="text-xs text-ink-muted font-medium">Effective target</dt>
                  <dd className="mt-1 font-serif text-2xl font-bold text-ink tabular-nums">
                    {detail.dailySadhana.effective_daily_target}
                  </dd>
                  <span className="text-[10px] text-ink-muted">commitment</span>
                </div>

                <div className="rounded-xl border border-sandalwood-border/60 bg-linen/70 p-3.5">
                  <dt className="text-xs text-ink-muted font-medium">Remaining / Extra</dt>
                  <dd className="mt-1 font-serif text-2xl font-bold text-ink tabular-nums">
                    {detail.dailySadhana.remaining_balance} /{" "}
                    <span className="text-peacock-deep">{detail.dailySadhana.extra_rounds}</span>
                  </dd>
                  <span className="text-[10px] text-ink-muted">
                    {detail.dailySadhana.remaining_balance === 0 ? "Target met!" : "Rounds left"}
                  </span>
                </div>
              </dl>

              {detail.records.length > 0 && (
                <div className="rounded-xl border border-sandalwood-border/50 bg-paper/70 p-4">
                  <p className="mb-2.5 text-xs font-semibold text-ink flex items-center gap-1.5">
                    <LotusEmblem size={13} className="text-gold-antique" />
                    <span>
                      Completed rounds logged on {formatReadableDate(detail.date)} ({detail.records.length})
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {detail.records.map((rec, idx) => (
                      <Badge key={rec.id} variant="neutral" className="border-sandalwood-border/80">
                        #{detail.records.length - idx} ·{" "}
                        {rec.method === "japa_mala" ? "Japa Mala" : "Manual"} ·{" "}
                        {rec.recorded_at.slice(11, 16)} UTC
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
