import * as React from "react";
import type { RoomHeatmapDay } from "@/lib/rooms/analytics";
import { cn } from "@/lib/cn";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface RoomHeatmapProps {
  days: RoomHeatmapDay[];
  todayDate: string;
}

function getRoomCellTone(day: RoomHeatmapDay): string {
  if (day.participatingMembers === 0) {
    return "border border-sandalwood-border bg-paper";
  }
  if (day.targetMetMembers > 0 && day.participatingMembers >= 3) {
    return "border border-peacock-ink bg-peacock-green";
  }
  if (day.targetMetMembers > 0) {
    return "border border-peacock-green/60 bg-peacock-green/65";
  }
  return "border border-gold-border/60 bg-gold-wash";
}

/**
 * 12-week (84-day) community participation heatmap built solely from consented
 * room_activity_feed milestones (never querying private daily_sadhana).
 */
export function RoomHeatmap({ days, todayDate }: RoomHeatmapProps) {
  // Chunk into 7-day columns (12 weeks)
  const weeks: RoomHeatmapDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <Card surface="parchment">
      <CardHeader>
        <CardTitle className="text-lg">Sangha 12-Week Participation</CardTitle>
        <CardDescription>
          Reflects consented check-ins and target completions shared with this
          room.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto pb-1">
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${weeks.length}, 18px)` }}
          >
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-rows-7 gap-1.5">
                {week.map((day) => {
                  const isToday = day.date === todayDate;
                  const label = `${day.date}: ${day.participatingMembers} active, ${day.targetMetMembers} target met`;
                  return (
                    <div
                      key={day.date}
                      title={label}
                      aria-label={label}
                      className={cn(
                        "size-4 rounded-[3px]",
                        getRoomCellTone(day),
                        isToday &&
                          "ring-2 ring-gold-antique ring-offset-1 ring-offset-paper"
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-[2px] border border-sandalwood-border bg-paper" />
            <span>No shared check-ins</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-[2px] border border-gold-border/60 bg-gold-wash" />
            <span>Rounds shared</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-[2px] border border-peacock-ink bg-peacock-green" />
            <span>Targets met</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

