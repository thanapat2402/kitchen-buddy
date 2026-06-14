/** Date helpers — kept tiny and dependency-free (no date-fns/dayjs needed yet). */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Today's date at midnight, local time. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Format a Date as an ISO date string (YYYY-MM-DD), local time. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** ISO date string for today. */
export function todayIso(): string {
  return toIsoDate(startOfToday());
}

/** ISO date string for today + N days (N can be negative). */
export function addDaysIso(days: number, from: Date = startOfToday()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Whole-day difference between an ISO date and today (negative = past). */
export function daysUntil(isoDate: string): number {
  const target = new Date(`${isoDate}T00:00:00`);
  const today = startOfToday();
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}

/**
 * Human-friendly Thai relative label for an expiry date.
 * Examples: "หมดอายุวันนี้", "พรุ่งนี้หมดอายุ", "เหลืออีก 3 วัน", "หมดอายุแล้ว 2 วัน"
 */
export function expiryLabelTh(isoDate: string): string {
  const diff = daysUntil(isoDate);
  if (diff < 0) return `หมดอายุแล้ว ${Math.abs(diff)} วัน`;
  if (diff === 0) return 'หมดอายุวันนี้';
  if (diff === 1) return 'พรุ่งนี้หมดอายุ';
  return `เหลืออีก ${diff} วัน`;
}

/** Format an ISO date as Thai short date, e.g. "11 มิ.ย." */
export function formatThaiShortDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(d);
}

/**
 * Thai meal-period word for the current time of day, used to make the
 * "เมนู…" tab + heading shift with when the user opens the app:
 *   04:00–10:59 → "เช้านี้"  (breakfast)
 *   11:00–15:59 → "เที่ยงนี้" (lunch)
 *   16:00–03:59 → "เย็นนี้"  (dinner)
 */
export function mealPeriodTh(now: Date = new Date()): string {
  const h = now.getHours();
  if (h >= 4 && h < 11) return 'เช้านี้';
  if (h >= 11 && h < 16) return 'เที่ยงนี้';
  return 'เย็นนี้';
}
