import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatDate, formatDateTime, formatRelative, isToday, isYesterday, isThisWeek } from '@/lib/date-utils';

// Freeze time at 2026-04-24 12:00:00 JST (UTC+9)
const FIXED_NOW = new Date('2026-04-24T03:00:00Z'); // 12:00 JST

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(FIXED_NOW); });
afterEach(() => { vi.useRealTimers(); });

// ─── formatDate ───────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats ISO string as YYYY/MM/DD', () => {
    expect(formatDate('2026-03-27')).toBe('2026/03/27');
  });

  it('formats Date object', () => {
    expect(formatDate(new Date('2026-01-05T00:00:00Z'))).toBe('2026/01/05');
  });

  it('formats timestamp (number)', () => {
    expect(formatDate(new Date('2026-06-15').getTime())).toBe('2026/06/15');
  });

  it('pads single-digit month and day', () => {
    expect(formatDate('2026-01-01')).toBe('2026/01/01');
  });
});

// ─── formatDateTime ──────────────────────────────────────────────────────

describe('formatDateTime', () => {
  it('includes time as HH:mm', () => {
    expect(formatDateTime('2026-03-27T10:30:00')).toBe('2026/03/27 10:30');
  });

  it('pads single-digit hours and minutes', () => {
    expect(formatDateTime('2026-01-05T09:05:00')).toBe('2026/01/05 09:05');
  });
});

// ─── formatRelative ──────────────────────────────────────────────────────

describe('formatRelative — with explicit now param', () => {
  const now = new Date('2026-04-24T12:00:00');

  it('returns たった今 for < 60 seconds ago', () => {
    const d = new Date(now.getTime() - 30000);
    expect(formatRelative(d, now)).toBe('たった今');
  });

  it('returns N分前 for < 60 minutes ago', () => {
    const d = new Date(now.getTime() - 3 * 60 * 1000);
    expect(formatRelative(d, now)).toBe('3分前');
  });

  it('returns N時間前 for < 24 hours ago', () => {
    const d = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    expect(formatRelative(d, now)).toBe('3時間前');
  });

  it('returns 昨日 for 1 day ago', () => {
    const d = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    expect(formatRelative(d, now)).toBe('昨日');
  });

  it('returns N日前 for 2-6 days ago', () => {
    const d = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelative(d, now)).toBe('3日前');
  });

  it('returns N週間前 for 7-29 days ago', () => {
    const d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    expect(formatRelative(d, now)).toBe('2週間前');
  });

  it('returns NヶMemo前 for 30-364 days ago', () => {
    const d = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    expect(formatRelative(d, now)).toBe('2ヶ月前');
  });

  it('returns N年前 for 365+ days ago', () => {
    const d = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000);
    expect(formatRelative(d, now)).toBe('1年前');
  });

  it('returns formatted date for future dates', () => {
    const d = new Date(now.getTime() + 60 * 1000);
    expect(formatRelative(d, now)).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
  });
});

describe('formatRelative — without now param (uses system time)', () => {
  it('uses current system time when now is omitted', () => {
    // 30 seconds ago from FIXED_NOW
    const d = new Date(FIXED_NOW.getTime() - 30000);
    expect(formatRelative(d)).toBe('たった今');
  });
});

// ─── isToday ─────────────────────────────────────────────────────────────

describe('isToday — with explicit now', () => {
  const now = new Date('2026-04-24T12:00:00Z');

  it('returns true for same date', () => {
    expect(isToday('2026-04-24T08:00:00Z', now)).toBe(true);
  });

  it('returns false for yesterday', () => {
    // Use noon UTC which is unambiguously yesterday in any timezone
    expect(isToday('2026-04-23T12:00:00Z', now)).toBe(false);
  });
});

describe('isToday — without now param', () => {
  it('uses current system time when now is omitted', () => {
    expect(isToday(FIXED_NOW)).toBe(true);
  });
});

// ─── isYesterday ─────────────────────────────────────────────────────────

describe('isYesterday — with explicit now', () => {
  const now = new Date('2026-04-24T12:00:00Z');

  it('returns true for yesterday', () => {
    expect(isYesterday('2026-04-23T10:00:00Z', now)).toBe(true);
  });

  it('returns false for today', () => {
    expect(isYesterday('2026-04-24T10:00:00Z', now)).toBe(false);
  });

  it('returns false for 2 days ago', () => {
    expect(isYesterday('2026-04-22T10:00:00Z', now)).toBe(false);
  });
});

describe('isYesterday — without now param', () => {
  it('uses current system time when now is omitted', () => {
    const yesterday = new Date(FIXED_NOW.getTime() - 24 * 60 * 60 * 1000);
    expect(isYesterday(yesterday)).toBe(true);
  });
});

// ─── isThisWeek ──────────────────────────────────────────────────────────

describe('isThisWeek — with explicit now', () => {
  // 2026-04-24 is Friday
  const now = new Date('2026-04-24T12:00:00Z');

  it('returns true for this Monday (same week)', () => {
    expect(isThisWeek('2026-04-20T12:00:00Z', now)).toBe(true);
  });

  it('returns true for today', () => {
    expect(isThisWeek('2026-04-24T12:00:00Z', now)).toBe(true);
  });

  it('returns false for last week', () => {
    expect(isThisWeek('2026-04-13T12:00:00Z', now)).toBe(false);
  });

  it('returns false for next week', () => {
    expect(isThisWeek('2026-04-27T12:00:00Z', now)).toBe(false);
  });
});

describe('isThisWeek — without now param (Sunday edge case)', () => {
  it('uses system time; Sunday = previous week boundary', () => {
    vi.setSystemTime(new Date('2026-04-26T12:00:00Z')); // Sunday
    const monday = new Date('2026-04-20T00:00:00Z');
    expect(isThisWeek(monday)).toBe(true);
  });
});
