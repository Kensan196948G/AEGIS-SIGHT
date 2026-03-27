/**
 * Date formatting utilities for AEGIS-SIGHT
 * All functions accept Date objects, ISO strings, or timestamps.
 */

type DateInput = Date | string | number;

function toDate(input: DateInput): Date {
  if (input instanceof Date) return input;
  return new Date(input);
}

/**
 * Format date as YYYY/MM/DD
 * @example formatDate('2026-03-27') => '2026/03/27'
 */
export function formatDate(input: DateInput): string {
  const d = toDate(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

/**
 * Format date and time as YYYY/MM/DD HH:mm
 * @example formatDateTime('2026-03-27T10:30:00') => '2026/03/27 10:30'
 */
export function formatDateTime(input: DateInput): string {
  const d = toDate(input);
  const date = formatDate(d);
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${date} ${h}:${min}`;
}

/**
 * Format as relative time string (Japanese)
 * @example formatRelative(threeMinutesAgo) => '3分前'
 */
export function formatRelative(input: DateInput, now?: Date): string {
  const d = toDate(input);
  const ref = now || new Date();
  const diffMs = ref.getTime() - d.getTime();

  // Future dates
  if (diffMs < 0) {
    return formatDate(d);
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days === 1) return '昨日';
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}週間前`;
  if (days < 365) return `${Math.floor(days / 30)}ヶ月前`;
  return `${Math.floor(days / 365)}年前`;
}

/**
 * Check if date is today
 */
export function isToday(input: DateInput, now?: Date): boolean {
  const d = toDate(input);
  const ref = now || new Date();
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

/**
 * Check if date is yesterday
 */
export function isYesterday(input: DateInput, now?: Date): boolean {
  const d = toDate(input);
  const ref = now || new Date();
  const yesterday = new Date(ref);
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  );
}

/**
 * Check if date is within this week (Monday-based)
 */
export function isThisWeek(input: DateInput, now?: Date): boolean {
  const d = toDate(input);
  const ref = now || new Date();

  // Get Monday of current week
  const monday = new Date(ref);
  const dayOfWeek = ref.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
  monday.setDate(ref.getDate() - diff);
  monday.setHours(0, 0, 0, 0);

  // Get next Monday
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  return d >= monday && d < nextMonday;
}
