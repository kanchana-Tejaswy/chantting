export interface ChantingReminderRecord {
  id: string;
  user_id: string;
  title: string;
  time_of_day: string;
  days_of_week: number[];
  is_enabled: boolean;
  reminder_type: "browser" | "in_app";
  created_at: string;
  updated_at: string;
}

