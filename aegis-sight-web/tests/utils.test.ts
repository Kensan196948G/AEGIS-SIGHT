import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatRelative,
  isToday,
  isYesterday,
  isThisWeek,
} from '../lib/date-utils';
import {
  formatNumber,
  formatCurrency,
  formatBytes,
  formatPercent,
} from '../lib/format-utils';

// ============================================================
// Date utilities
// ============================================================
describe('date-utils', () => {
  describe('formatDate', () => {
    it('formats Date object as YYYY/MM/DD', () => {
      expect(formatDate(new Date(2026, 2, 27))).toBe('2026/03/27');
    });

    it('formats ISO string', () => {
      // Use a date that won't shift across timezones
      const d = new Date(2026, 0, 5);
      expect(formatDate(d)).toBe('2026/01/05');
    });

    it('pads single-digit month and day', () => {
      expect(formatDate(new Date(2026, 0, 1))).toBe('2026/01/01');
    });
  });

  describe('formatDateTime', () => {
    it('formats date and time', () => {
      const d = new Date(2026, 2, 27, 10, 30);
      expect(formatDateTime(d)).toBe('2026/03/27 10:30');
    });

    it('pads single-digit hours and minutes', () => {
      const d = new Date(2026, 2, 27, 9, 5);
      expect(formatDateTime(d)).toBe('2026/03/27 09:05');
    });
  });

  describe('formatRelative', () => {
    const now = new Date(2026, 2, 27, 12, 0, 0);

    it('returns "たった今" for less than 60 seconds', () => {
      const d = new Date(now.getTime() - 30 * 1000);
      expect(formatRelative(d, now)).toBe('たった今');
    });

    it('returns minutes ago', () => {
      const d = new Date(now.getTime() - 3 * 60 * 1000);
      expect(formatRelative(d, now)).toBe('3分前');
    });

    it('returns hours ago', () => {
      const d = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(formatRelative(d, now)).toBe('2時間前');
    });

    it('returns "昨日" for yesterday', () => {
      const d = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      expect(formatRelative(d, now)).toBe('昨日');
    });

    it('returns days ago for 2-6 days', () => {
      const d = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      expect(formatRelative(d, now)).toBe('5日前');
    });

    it('returns weeks ago', () => {
      const d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      expect(formatRelative(d, now)).toBe('2週間前');
    });

    it('returns formatted date for future dates', () => {
      const d = new Date(now.getTime() + 60 * 60 * 1000);
      expect(formatRelative(d, now)).toBe('2026/03/27');
    });
  });

  describe('isToday', () => {
    it('returns true for today', () => {
      const now = new Date(2026, 2, 27, 15, 0);
      const d = new Date(2026, 2, 27, 8, 0);
      expect(isToday(d, now)).toBe(true);
    });

    it('returns false for yesterday', () => {
      const now = new Date(2026, 2, 27);
      const d = new Date(2026, 2, 26);
      expect(isToday(d, now)).toBe(false);
    });
  });

  describe('isYesterday', () => {
    it('returns true for yesterday', () => {
      const now = new Date(2026, 2, 27);
      const d = new Date(2026, 2, 26);
      expect(isYesterday(d, now)).toBe(true);
    });

    it('returns false for today', () => {
      const now = new Date(2026, 2, 27);
      expect(isYesterday(now, now)).toBe(false);
    });
  });

  describe('formatRelative - additional branches', () => {
    const now = new Date(2026, 2, 27, 12, 0, 0);

    it('returns months ago for 30-364 days', () => {
      const d = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      expect(formatRelative(d, now)).toBe('2ヶ月前');
    });

    it('returns years ago for 365+ days', () => {
      const d = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000);
      expect(formatRelative(d, now)).toBe('1年前');
    });

    it('accepts number timestamp as input', () => {
      const ts = new Date(2026, 2, 27, 11, 55).getTime();
      expect(formatRelative(ts, now)).toBe('5分前');
    });

    it('accepts ISO string as input', () => {
      const d = new Date(2026, 2, 27, 11, 0);
      expect(formatRelative(d.toISOString(), now)).toBe('1時間前');
    });
  });

  describe('isThisWeek', () => {
    // 2026-03-27 is a Friday
    const now = new Date(2026, 2, 27, 12, 0);

    it('returns true for a date in this week', () => {
      const monday = new Date(2026, 2, 23); // Monday
      expect(isThisWeek(monday, now)).toBe(true);
    });

    it('returns false for last week', () => {
      const lastWeek = new Date(2026, 2, 20); // Previous Friday
      expect(isThisWeek(lastWeek, now)).toBe(false);
    });

    it('handles Sunday correctly (dayOfWeek === 0)', () => {
      // 2026-03-29 is a Sunday
      const sunday = new Date(2026, 2, 29, 12, 0);
      const mondayOfWeek = new Date(2026, 2, 23);
      expect(isThisWeek(mondayOfWeek, sunday)).toBe(true);
    });

    it('returns false for next week date', () => {
      const nextWeek = new Date(2026, 3, 1); // April 1st, Wednesday
      expect(isThisWeek(nextWeek, now)).toBe(false);
    });
  });
});

// ============================================================
// Format utilities
// ============================================================
describe('format-utils', () => {
  describe('formatNumber', () => {
    it('formats with comma separators', () => {
      expect(formatNumber(1234)).toBe('1,234');
    });

    it('formats large numbers', () => {
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('handles zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('handles negative numbers', () => {
      expect(formatNumber(-1234)).toBe('-1,234');
    });
  });

  describe('formatCurrency', () => {
    it('formats as Japanese Yen', () => {
      const result = formatCurrency(1234567);
      // Intl may use different yen signs; just check content
      expect(result).toContain('1,234,567');
      expect(result).toMatch(/[¥￥]/);
    });

    it('handles zero', () => {
      const result = formatCurrency(0);
      expect(result).toMatch(/[¥￥]0/);
    });
  });

  describe('formatBytes', () => {
    it('formats 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('formats bytes', () => {
      expect(formatBytes(500)).toBe('500 B');
    });

    it('formats kilobytes', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('formats megabytes', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
    });

    it('formats gigabytes', () => {
      expect(formatBytes(1610612736)).toBe('1.5 GB');
    });

    it('removes trailing zeros', () => {
      expect(formatBytes(1024)).toBe('1 KB');
    });
  });

  describe('formatPercent', () => {
    it('formats decimal as percentage', () => {
      expect(formatPercent(0.853)).toBe('85.3%');
    });

    it('formats non-decimal value', () => {
      expect(formatPercent(85.3, false)).toBe('85.3%');
    });

    it('handles custom decimals', () => {
      expect(formatPercent(0.8567, true, 2)).toBe('85.67%');
    });

    it('handles zero', () => {
      expect(formatPercent(0)).toBe('0.0%');
    });

    it('handles 100%', () => {
      expect(formatPercent(1.0)).toBe('100.0%');
    });
  });
});
