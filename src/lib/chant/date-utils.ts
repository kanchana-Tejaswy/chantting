/**
 * Date attribution helpers for Sādhana and Chanting history.
 * Handles timezone-aware date math for logging and editing past-day Sādhana (e.g. yesterday).
 */

export function getYesterdayDateString(todayDateStr: string): string {
  try {
    const [y, m, d] = todayDateStr.split("-").map(Number);
    if (!y || !m || !d) return todayDateStr;
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    dateObj.setUTCDate(dateObj.getUTCDate() - 1);
    return dateObj.toISOString().slice(0, 10);
  } catch {
    return todayDateStr;
  }
}

export function formatShortDate(isoDateStr: string): string {
  try {
    const [y, m, d] = isoDateStr.split("-").map(Number);
    if (!y || !m || !d) return isoDateStr;
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return isoDateStr;
  }
}

export function formatReadableDateWithWeekday(isoDateStr: string): string {
  try {
    const [y, m, d] = isoDateStr.split("-").map(Number);
    if (!y || !m || !d) return isoDateStr;
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return isoDateStr;
  }
}

/**
 * Returns an ISO timestamp anchored at evening/night (21:30 local) on the specified date.
 * When sent to PostgreSQL RPCs, this accurately attributes the entry to the target sadhana date.
 */
export function getClientRecordedAtForDate(dateStr: string, hour = 21, minute = 30): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return new Date().toISOString();
    // Anchor to evening time on that specific day in client local time
    const localDate = new Date(y, m - 1, d, hour, minute, 0);
    // Safety clamp: never exceed current time
    if (localDate.getTime() > Date.now()) {
      return new Date().toISOString();
    }
    return localDate.toISOString();
  } catch {
    return new Date().toISOString();
  }
}
