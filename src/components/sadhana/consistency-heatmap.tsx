"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  HeatmapCellStatus,
  HeatmapDayCell,
  HeatmapWeekColumn,
} from "@/lib/sadhana/analytics";
import type { SadhanaDayDetailPayload } from "@/lib/sadhana/queries";
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
      return "border border-sandalwood-border/40 bg-paper/40 opacity-40 cursor-default";
    case "missing_data":
      return "border border-dashed border-sandalwood-strong bg-transparent hover:border-krishna-midnight";
    case "zero_activity":
      return "border border-sandalwood-strong bg-linen hover:border-krishna-midnight";
    case "partial_low":
      return "border border-gold-border/40 bg-gold-wash hover:border-krishna-midnight";
    case "partial_medium":
      return "border border-gold-border/60 bg-gold-antique/45 hover:border-krishna-midnight";
    case "partial_high":
      return "border border-gold-border bg-gold-antique/75 hover:border-krishna-midnight";
    case "target_met":
      return "border border-peacock-ink bg-peacock-green hover:border-krishna-midnight";
  }
}

function describeCellAria(cell: HeatmapDayCell): string {
  if (cell.status === "future") return `${cell.date}: Upcoming date`;
  if (cell.status === "missing_data") return `${cell.date}: No record`;
  if (cell.status === "zero_activity") {
    return `${cell.date}: 0 rounds recorded (target ${cell.effectiveTarget})`;
  }
  return `${cell.date}: ${cell.completedRounds} of ${cell.effectiveTarget} rounds${
    cell.targetMet ? " (target met)" : ""
  }`;
}

export interface ConsistencyHeatmapProps {
  selectedYear: number;
  currentYear: number;
  todayDate: string;
  weeks: HeatmapWeekColumn[];
  initialDayDetail: SadhanaDayDetailPayload;
}

export function ConsistencyHeatmap({
  selectedYear,
  currentYear,
  todayDate,
  weeks,
  initialDayDetail,
}: ConsistencyHeatmapProps) {
  const [selectedDate, setSelectedDate] = React.useState(initialDayDetail.date);
  const [detail, setDetail] =
    React.useState<SadhanaDayDetailPayload>(initialDayDetail);
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

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
      <Card surface="parchment">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays
                className="size-4 text-peacock-deep"
                strokeWidth={1.75}
                aria-hidden={true}
              />
              <span>Annual Consistency Calendar ({selectedYear})</span>
            </CardTitle>
            <CardDescription>
              Zero-round recorded days are shown distinctly from unrecorded or
              pre-join dates. Select any past date to inspect rounds.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/sadhana/analytics?year=${selectedYear - 1}`}
              aria-label={`View year ${selectedYear - 1}`}
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <ChevronLeft className="size-4" aria-hidden={true} />
              <span>{selectedYear - 1}</span>
            </Link>

            <span className="min-w-16 text-center text-sm font-semibold text-ink tabular-nums">
              {selectedYear}
            </span>

            {selectedYear < currentYear ? (
              <Link
                href={`/sadhana/analytics?year=${selectedYear + 1}`}
                aria-label={`View year ${selectedYear + 1}`}
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                <span>{selectedYear + 1}</span>
                <ChevronRight className="size-4" aria-hidden={true} />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex min-h-10 items-center gap-1 rounded-[10px] border border-sandalwood-border bg-linen px-3 text-sm text-ink-muted opacity-50"
              >
                <span>{selectedYear + 1}</span>
                <ChevronRight className="size-4" aria-hidden={true} />
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Scrollable Annual Heatmap Matrix */}
          <div className="overflow-x-auto pb-2">
            <div className="inline-block min-w-full">
              {/* Month Header Row */}
              <div className="mb-1.5 flex pl-9">
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
                    return (
                      <span
                        key={w.weekIndex}
                        className="text-[10px] font-medium text-ink-muted"
                      >
                        {match?.label ?? ""}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Weekday Labels + Week Columns */}
              <div className="flex gap-1.5">
                <div className="grid w-7 shrink-0 grid-rows-7 gap-1 text-[10px] text-ink-muted">
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
                            disabled={cell.status === "future"}
                            onClick={() => void handleSelectDate(cell)}
                            title={describeCellAria(cell)}
                            aria-label={describeCellAria(cell)}
                            aria-pressed={isSelected}
                            className={cn(
                              "relative flex size-3.5 cursor-pointer items-center justify-center rounded-[3px] transition-[border-color,transform] duration-100",
                              getCellClass(cell.status),
                              isToday &&
                                "ring-2 ring-gold-antique ring-offset-1 ring-offset-paper",
                              isSelected &&
                                "ring-2 ring-krishna-midnight ring-offset-1 ring-offset-paper"
                            )}
                          >
                            {cell.status === "zero_activity" && (
                              <span
                                aria-hidden="true"
                                className="size-1 rounded-full bg-sandalwood-strong"
                              />
                            )}
                            {cell.status === "target_met" && (
                              <span
                                aria-hidden="true"
                                className="size-1 rounded-full bg-gold-antique"
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

          {/* Explicit Accessible Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-sandalwood-border pt-4 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-3.5 rounded-[3px] border border-dashed border-sandalwood-strong bg-transparent" />
              <span>No record (missing / pre-join)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex size-3.5 items-center justify-center rounded-[3px] border border-sandalwood-strong bg-linen">
                <span className="size-1 rounded-full bg-sandalwood-strong" />
              </span>
              <span>0 rounds recorded</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-3.5 rounded-[3px] border border-gold-border/40 bg-gold-wash" />
              <span className="inline-block size-3.5 rounded-[3px] border border-gold-border/60 bg-gold-antique/45" />
              <span className="inline-block size-3.5 rounded-[3px] border border-gold-border bg-gold-antique/75" />
              <span>Partial intensity</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex size-3.5 items-center justify-center rounded-[3px] border border-peacock-ink bg-peacock-green">
                <span className="size-1 rounded-full bg-gold-antique" />
              </span>
              <span>Daily target met</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Detail Panel */}
      <Card surface="elevated">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="tabular-nums">
              Daily Detail · {selectedDate}
            </CardTitle>
            <CardDescription>
              {selectedDate === todayDate
                ? "Today's live local Sādhana record"
                : "Historical Sādhana record"}
            </CardDescription>
          </div>
          {isLoadingDetail ? (
            <Badge variant="neutral">Loading day...</Badge>
          ) : !detail.hasRecord ? (
            <Badge variant="neutral">No record (missing / pre-join)</Badge>
          ) : detail.dailySadhana &&
            detail.dailySadhana.completed_rounds >=
              detail.dailySadhana.effective_daily_target ? (
            <Badge variant="peacock">Target met</Badge>
          ) : detail.dailySadhana && detail.dailySadhana.completed_rounds > 0 ? (
            <Badge variant="gold">Partial activity</Badge>
          ) : (
            <Badge variant="neutral">0 rounds recorded</Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {detailError && (
            <p role="alert" className="text-xs text-kumkum">
              {detailError}
            </p>
          )}

          {!detail.hasRecord ? (
            <div className="flex items-start gap-2.5 rounded-[10px] border border-dashed border-sandalwood-strong bg-linen/50 px-4 py-3 text-sm text-ink-muted">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden={true} />
              <span>
                No Sādhana record exists for {detail.date}. Because records are
                created only when days are initialized or rounds are synced, this
                date is marked as unrecorded rather than zero activity.
              </span>
            </div>
          ) : detail.dailySadhana ? (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-[10px] bg-linen p-3">
                  <dt className="text-xs text-ink-muted">Completed</dt>
                  <dd className="mt-0.5 font-serif text-xl font-semibold text-peacock-ink tabular-nums">
                    {detail.dailySadhana.completed_rounds}
                  </dd>
                </div>
                <div className="rounded-[10px] bg-linen p-3">
                  <dt className="text-xs text-ink-muted">Original target</dt>
                  <dd className="mt-0.5 font-serif text-xl font-semibold text-ink tabular-nums">
                    {detail.dailySadhana.original_daily_target}
                  </dd>
                </div>
                <div className="rounded-[10px] bg-linen p-3">
                  <dt className="text-xs text-ink-muted">Carried pending</dt>
                  <dd className="mt-0.5 font-serif text-xl font-semibold text-gold-ink tabular-nums">
                    +{detail.dailySadhana.previous_pending_balance}
                  </dd>
                </div>
                <div className="rounded-[10px] bg-linen p-3">
                  <dt className="text-xs text-ink-muted">Effective target</dt>
                  <dd className="mt-0.5 font-serif text-xl font-semibold text-ink tabular-nums">
                    {detail.dailySadhana.effective_daily_target}
                  </dd>
                </div>
                <div className="rounded-[10px] bg-linen p-3">
                  <dt className="text-xs text-ink-muted">Remaining / Extra</dt>
                  <dd className="mt-0.5 font-serif text-xl font-semibold text-ink tabular-nums">
                    {detail.dailySadhana.remaining_balance} /{" "}
                    {detail.dailySadhana.extra_rounds}
                  </dd>
                </div>
              </dl>

              {detail.records.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-ink-muted">
                    Completed rounds logged on {detail.date} (
                    {detail.records.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {detail.records.map((rec, idx) => (
                      <Badge key={rec.id} variant="neutral">
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

