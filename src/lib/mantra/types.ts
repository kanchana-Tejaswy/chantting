export interface MantraRecord {
  id: string;
  user_id: string | null;
  slug: string;
  name: string;
  sanskrit: string;
  transliteration: string;
  meaning: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface MantraHistoricalStat {
  mantraId: string | null;
  mantraName: string;
  completedRounds: number;
  totalSessions: number;
}

