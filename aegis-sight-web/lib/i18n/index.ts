/**
 * AEGIS-SIGHT Internationalization (i18n) module.
 *
 * Provides locale management and a translation helper.
 *
 * Usage:
 *   import { useTranslation } from '@/lib/i18n';
 *   const { t, locale, setLocale } = useTranslation();
 *   t('common.save')   // => '保存'
 *   t('errors.timeout') // => 'リクエストがタイムアウトしました。再試行してください。'
 */

import { useCallback, useMemo, useState } from 'react';
import { ja, type MessageCatalog } from './ja';
import { en } from './en';

export type Locale = 'ja' | 'en';

const catalogs: Record<Locale, MessageCatalog> = { ja, en };

const DEFAULT_LOCALE: Locale = 'ja';

/** Detect initial locale from browser or localStorage. */
function detectLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  const stored = localStorage.getItem('aegis-locale');
  if (stored === 'en' || stored === 'ja') return stored;

  const browserLang = navigator.language.slice(0, 2);
  return browserLang === 'en' ? 'en' : DEFAULT_LOCALE;
}

/**
 * Resolve a dotted key path (e.g. "common.save") from a catalog object.
 * Returns the key itself if not found.
 */
export function getMessage(catalog: MessageCatalog, key: string): string {
  const parts = key.split('.');
  let current: unknown = catalog;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : key;
}

/**
 * Get a translated message for a given locale and key.
 */
export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return getMessage(catalogs[locale], key);
}

/**
 * React hook for translations.
 *
 * Returns the current locale, a setter, and a `t` function.
 */
export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aegis-locale', newLocale);
    }
  }, []);

  const translate = useMemo(() => {
    const catalog = catalogs[locale];
    return (key: string): string => getMessage(catalog, key);
  }, [locale]);

  return { t: translate, locale, setLocale } as const;
}

// Re-export types and catalogs for direct access
export { ja, en };
export type { MessageCatalog };
