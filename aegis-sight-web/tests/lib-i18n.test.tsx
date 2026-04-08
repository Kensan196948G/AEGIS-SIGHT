import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { getMessage, t, useTranslation } from '@/lib/i18n';
import { ja } from '@/lib/i18n/ja';
import { en } from '@/lib/i18n/en';

// ─── getMessage ────────────────────────────────────────────────────────────
describe('getMessage', () => {
  it('resolves top-level key', () => {
    // ja should have 'common' object
    const result = getMessage(ja, 'common.save');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('common.save'); // should be translated
  });

  it('returns key itself when not found', () => {
    expect(getMessage(ja, 'nonexistent.key')).toBe('nonexistent.key');
  });

  it('returns key when intermediate path is missing', () => {
    expect(getMessage(ja, 'common.missing.deep')).toBe('common.missing.deep');
  });

  it('returns key when value is not a string', () => {
    // 'common' itself is an object, not a string
    expect(getMessage(ja, 'common')).toBe('common');
  });

  it('works with en catalog', () => {
    const result = getMessage(en, 'common.save');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── t (standalone function) ───────────────────────────────────────────────
describe('t function', () => {
  it('translates with default locale (ja)', () => {
    const result = t('common.save');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('common.save');
  });

  it('translates with explicit ja locale', () => {
    expect(t('common.save', 'ja')).toBe(t('common.save'));
  });

  it('translates with explicit en locale', () => {
    const enResult = t('common.save', 'en');
    const jaResult = t('common.save', 'ja');
    // Both should resolve to strings, may differ
    expect(typeof enResult).toBe('string');
    expect(typeof jaResult).toBe('string');
  });

  it('returns key for unknown key', () => {
    expect(t('completely.unknown.key')).toBe('completely.unknown.key');
  });
});

// ─── useTranslation hook ───────────────────────────────────────────────────
describe('useTranslation', () => {
  beforeEach(() => {
    // Reset localStorage before each test
    localStorage.clear();
    // Mock navigator.language
    Object.defineProperty(navigator, 'language', {
      value: 'ja-JP',
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('returns locale, setLocale, and t', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.locale).toBeDefined();
    expect(typeof result.current.setLocale).toBe('function');
    expect(typeof result.current.t).toBe('function');
  });

  it('defaults to ja when browser is ja', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.locale).toBe('ja');
  });

  it('defaults to en when localStorage has en', () => {
    localStorage.setItem('aegis-locale', 'en');
    const { result } = renderHook(() => useTranslation());
    expect(result.current.locale).toBe('en');
  });

  it('defaults to ja when localStorage has ja', () => {
    localStorage.setItem('aegis-locale', 'ja');
    const { result } = renderHook(() => useTranslation());
    expect(result.current.locale).toBe('ja');
  });

  it('t function translates keys', () => {
    const { result } = renderHook(() => useTranslation());
    const translated = result.current.t('common.save');
    expect(typeof translated).toBe('string');
    expect(translated).not.toBe('common.save');
  });

  it('setLocale changes locale and persists to localStorage', () => {
    const { result } = renderHook(() => useTranslation());
    act(() => { result.current.setLocale('en'); });
    expect(result.current.locale).toBe('en');
    expect(localStorage.getItem('aegis-locale')).toBe('en');
  });

  it('t function updates after setLocale', () => {
    const { result } = renderHook(() => useTranslation());
    const jaResult = result.current.t('common.save');
    act(() => { result.current.setLocale('en'); });
    const enResult = result.current.t('common.save');
    // Both should be non-empty strings
    expect(typeof enResult).toBe('string');
    expect(enResult.length).toBeGreaterThan(0);
    // ja and en may differ
    expect(jaResult).not.toBe('common.save');
    expect(enResult).not.toBe('common.save');
  });

  it('setLocale back to ja works', () => {
    const { result } = renderHook(() => useTranslation());
    act(() => { result.current.setLocale('en'); });
    act(() => { result.current.setLocale('ja'); });
    expect(result.current.locale).toBe('ja');
    expect(localStorage.getItem('aegis-locale')).toBe('ja');
  });
});
