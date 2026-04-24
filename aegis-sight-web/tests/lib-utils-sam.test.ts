import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  computeStatus,
  getDaysUntilExpiry,
  getSamDonutColor,
  statusConfig,
  licenseTypeLabels,
} from '@/lib/utils/sam';
import type { SamLicense } from '@/lib/types';

const BASE_LICENSE: SamLicense = {
  id: '1', software_name: 'Test', vendor: 'TestVendor',
  license_type: 'subscription', license_key: null,
  purchased_count: 100, installed_count: 80, m365_assigned: 0,
  cost_per_unit: 1000, currency: 'JPY',
  purchase_date: null, expiry_date: null,
  vendor_contract_id: null, notes: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

afterEach(() => { vi.useRealTimers(); });

// ─── getDaysUntilExpiry ────────────────────────────────────────────────────

describe('getDaysUntilExpiry', () => {
  it('returns positive days for future date', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(getDaysUntilExpiry(future.toISOString())).toBe(10);
  });

  it('returns 0 for today', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(getDaysUntilExpiry(today.toISOString())).toBe(0);
  });

  it('returns negative days for past date', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    expect(getDaysUntilExpiry(past.toISOString())).toBe(-5);
  });
});

// ─── computeStatus — no expiry_date ──────────────────────────────────────

describe('computeStatus — no expiry_date', () => {
  it('compliant when used <= total and utilization >= 50%', () => {
    expect(computeStatus({ ...BASE_LICENSE, purchased_count: 100, installed_count: 80 })).toBe('compliant');
  });

  it('over-deployed when installed_count > purchased_count', () => {
    expect(computeStatus({ ...BASE_LICENSE, purchased_count: 100, installed_count: 110 })).toBe('over-deployed');
  });

  it('over-deployed includes m365_assigned in used count', () => {
    expect(computeStatus({ ...BASE_LICENSE, purchased_count: 100, installed_count: 90, m365_assigned: 15 })).toBe('over-deployed');
  });

  it('under-utilized when used < 50% of total', () => {
    expect(computeStatus({ ...BASE_LICENSE, purchased_count: 100, installed_count: 40 })).toBe('under-utilized');
  });

  it('compliant when exactly 50% utilized', () => {
    // 50 / 100 = 0.5, NOT < 0.5 → compliant
    expect(computeStatus({ ...BASE_LICENSE, purchased_count: 100, installed_count: 50 })).toBe('compliant');
  });

  it('compliant when total is 0 (division by zero guard)', () => {
    expect(computeStatus({ ...BASE_LICENSE, purchased_count: 0, installed_count: 0 })).toBe('compliant');
  });
});

// ─── computeStatus — with expiry_date ────────────────────────────────────

describe('computeStatus — with expiry_date', () => {
  function makeExpiryDate(daysFromNow: number): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString();
  }

  it('expired when expiry is in the past', () => {
    const lic = { ...BASE_LICENSE, expiry_date: makeExpiryDate(-1) };
    expect(computeStatus(lic)).toBe('expired');
  });

  it('expiring-soon when expiry is within 90 days', () => {
    const lic = { ...BASE_LICENSE, expiry_date: makeExpiryDate(30) };
    expect(computeStatus(lic)).toBe('expiring-soon');
  });

  it('expiring-soon at exactly 90 days', () => {
    const lic = { ...BASE_LICENSE, expiry_date: makeExpiryDate(90) };
    expect(computeStatus(lic)).toBe('expiring-soon');
  });

  it('over-deployed when expiry > 90 days and used > total', () => {
    const lic = { ...BASE_LICENSE, purchased_count: 100, installed_count: 110, expiry_date: makeExpiryDate(200) };
    expect(computeStatus(lic)).toBe('over-deployed');
  });

  it('under-utilized when expiry > 90 days and used < 50%', () => {
    const lic = { ...BASE_LICENSE, purchased_count: 100, installed_count: 30, expiry_date: makeExpiryDate(200) };
    expect(computeStatus(lic)).toBe('under-utilized');
  });

  it('compliant when expiry > 90 days and 50% <= used <= total', () => {
    const lic = { ...BASE_LICENSE, purchased_count: 100, installed_count: 75, expiry_date: makeExpiryDate(200) };
    expect(computeStatus(lic)).toBe('compliant');
  });
});

// ─── getSamDonutColor ──────────────────────────────────────────────────────

describe('getSamDonutColor', () => {
  it('returns green for rate >= 90', () => expect(getSamDonutColor(90)).toBe('#10b981'));
  it('returns green for rate = 100', () => expect(getSamDonutColor(100)).toBe('#10b981'));
  it('returns amber for 70 <= rate < 90', () => expect(getSamDonutColor(70)).toBe('#f59e0b'));
  it('returns amber for rate = 89', () => expect(getSamDonutColor(89)).toBe('#f59e0b'));
  it('returns red for rate < 70', () => expect(getSamDonutColor(69)).toBe('#ef4444'));
  it('returns red for rate = 0', () => expect(getSamDonutColor(0)).toBe('#ef4444'));
});

// ─── statusConfig ──────────────────────────────────────────────────────────

describe('statusConfig', () => {
  it('compliant maps to success', () => expect(statusConfig.compliant.variant).toBe('success'));
  it('over-deployed maps to danger', () => expect(statusConfig['over-deployed'].variant).toBe('danger'));
  it('under-utilized maps to warning', () => expect(statusConfig['under-utilized'].variant).toBe('warning'));
  it('expiring-soon maps to warning', () => expect(statusConfig['expiring-soon'].variant).toBe('warning'));
  it('expired maps to danger', () => expect(statusConfig.expired.variant).toBe('danger'));
});

// ─── licenseTypeLabels ────────────────────────────────────────────────────

describe('licenseTypeLabels', () => {
  it('subscription → サブスクリプション', () => expect(licenseTypeLabels.subscription).toBe('サブスクリプション'));
  it('perpetual → 永続', () => expect(licenseTypeLabels.perpetual).toBe('永続'));
  it('volume → ボリューム', () => expect(licenseTypeLabels.volume).toBe('ボリューム'));
  it('oem → OEM', () => expect(licenseTypeLabels.oem).toBe('OEM'));
  it('site → サイト', () => expect(licenseTypeLabels.site).toBe('サイト'));
});
