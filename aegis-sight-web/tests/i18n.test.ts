import { describe, it, expect, beforeEach } from 'vitest';
import { getMessage, t } from '../lib/i18n';
import { ja } from '../lib/i18n/ja';
import { en } from '../lib/i18n/en';

// ============================================================
// getMessage helper
// ============================================================
describe('getMessage', () => {
  it('resolves a simple dotted key from ja catalog', () => {
    expect(getMessage(ja, 'common.save')).toBe('保存');
  });

  it('resolves a simple dotted key from en catalog', () => {
    expect(getMessage(en, 'common.save')).toBe('Save');
  });

  it('resolves nested keys', () => {
    expect(getMessage(ja, 'dashboard.totalDevices')).toBe('端末数');
    expect(getMessage(en, 'dashboard.totalDevices')).toBe('Total Devices');
  });

  it('returns the key itself for unknown paths', () => {
    expect(getMessage(ja, 'nonexistent.key')).toBe('nonexistent.key');
  });

  it('returns the key for partial paths that resolve to an object', () => {
    expect(getMessage(ja, 'common')).toBe('common');
  });
});

// ============================================================
// t() standalone function
// ============================================================
describe('t()', () => {
  it('defaults to Japanese locale', () => {
    expect(t('common.cancel')).toBe('キャンセル');
  });

  it('returns English when locale is en', () => {
    expect(t('common.cancel', 'en')).toBe('Cancel');
  });

  it('returns the key for unknown keys', () => {
    expect(t('unknown.key')).toBe('unknown.key');
  });
});

// ============================================================
// Catalog structure consistency
// ============================================================
describe('Catalog structure', () => {
  const jaKeys = getAllKeys(ja);
  const enKeys = getAllKeys(en);

  it('ja and en catalogs have the same top-level sections', () => {
    expect(Object.keys(ja).sort()).toEqual(Object.keys(en).sort());
  });

  it('ja and en catalogs have the same keys', () => {
    expect(jaKeys.sort()).toEqual(enKeys.sort());
  });

  it('all ja values are non-empty strings', () => {
    for (const key of jaKeys) {
      const val = getMessage(ja, key);
      expect(val).not.toBe(key); // resolved, not fallback
      expect(val.length).toBeGreaterThan(0);
    }
  });

  it('all en values are non-empty strings', () => {
    for (const key of enKeys) {
      const val = getMessage(en, key);
      expect(val).not.toBe(key);
      expect(val.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// Section-specific tests
// ============================================================
describe('common section', () => {
  it('has essential action keys', () => {
    const essentials = ['save', 'cancel', 'delete', 'confirm', 'search'];
    for (const key of essentials) {
      expect(getMessage(ja, `common.${key}`)).toBeTruthy();
      expect(getMessage(en, `common.${key}`)).toBeTruthy();
    }
  });
});

describe('navigation section', () => {
  it('has dashboard and assets keys', () => {
    expect(getMessage(ja, 'navigation.dashboard')).toBe('ダッシュボード');
    expect(getMessage(en, 'navigation.dashboard')).toBe('Dashboard');
    expect(getMessage(ja, 'navigation.assets')).toBe('資産管理');
    expect(getMessage(en, 'navigation.assets')).toBe('Asset Management');
  });
});

describe('errors section', () => {
  it('has all standard error keys', () => {
    const errorKeys = [
      'connectionError',
      'authenticationError',
      'permissionError',
      'notFound',
      'serverError',
      'timeout',
      'rateLimited',
      'unknown',
    ];
    for (const key of errorKeys) {
      expect(getMessage(ja, `errors.${key}`)).toBeTruthy();
      expect(getMessage(en, `errors.${key}`)).toBeTruthy();
    }
  });
});

describe('dashboard section', () => {
  it('has device and alert metrics', () => {
    expect(getMessage(ja, 'dashboard.totalDevices')).toBe('端末数');
    expect(getMessage(ja, 'dashboard.activeAlerts')).toBe('アラート数');
    expect(getMessage(ja, 'dashboard.licenseComplianceRate')).toBe(
      'ライセンス遵守率'
    );
  });
});

// ============================================================
// Helpers
// ============================================================
function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null) {
      keys.push(...getAllKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}
