export type SankalpaStatus = "active" | "completed" | "paused" | "cancelled";

export interface SankalpaRecord {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_rounds: number;
  completed_rounds: number;
  start_date: string;
  end_date: string | null;
  status: SankalpaStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SankalpaProgressSummary {
  id: string;
  title: string;
  description: string | null;
  targetRounds: number;
  completedRounds: number;
  remainingRounds: number;
  progressPercentage: number;
  startDate: string;
  endDate: string | null;
  status: SankalpaStatus;
  isCompleted: boolean;
}

export interface SankalpaPortfolioVowItem {
  id: string;
  title: string;
  targetRounds: number;
  completedRounds: number;
  remainingRounds: number;
  status: SankalpaStatus;
  percentageOfTotal: number;
  stepIndex: number;
  letter: string;
}

export interface SankalpaPortfolioSummary {
  totalTargetRounds: number;
  totalCompletedRounds: number;
  totalRemainingRounds: number;
  overallProgressPercentage: number;
  count: number;
  activeCount: number;
  queuedCount: number;
  completedCount: number;
  vowsBreakdown: SankalpaPortfolioVowItem[];
  equationText: string;
  equationShort: string;
}


