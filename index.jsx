import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { S } from './strings';
import storage from '../lib/storage';

/**
 * Global language system.
 * Every UI string goes through t() / L(), so switching language re-renders the
 * whole app instantly. The choice is cached locally and synced when signed in.
 */
export const LANGS = [
  { code: 'en', label: 'English', short: 'EN', flag: '🇬🇧', locale: 'en-IN', speech: 'en-IN' },
  { code: 'hi', label: 'हिंदी', short: 'HI', flag: '🇮🇳', locale: 'hi-IN', speech: 'hi-IN' },
];

const INDEX = { en: 0, hi: 1 };
const LS_KEY = 'careerx:v1:lang';
const LangCtx = createContext(null);

function readLang() {
  try {
    const v = storage.get('lang', null) || localStorage.getItem(LS_KEY);
    if (v === 'en' || v === 'hi') return v;
    const nav = (navigator.language || 'en').toLowerCase();
    return nav.startsWith('hi') ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readLang);
  const i = INDEX[lang] ?? 0;

  useEffect(() => {
    storage.set('lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  /** Translate a dictionary key. Falls back to English, then to the key. */
  const t = useCallback(
    (key, vars) => {
      const entry = S[key];
      if (!entry) return interpolate(key, vars);
      const val = entry[i] ?? entry[0] ?? key;
      return interpolate(val, vars);
    },
    [i]
  );

  /** Localize an inline [en, hi] pair used by content/data modules. */
  const L = useCallback(
    (pair, fallback = '') => {
      if (pair == null) return fallback;
      if (typeof pair === 'string' || typeof pair === 'number') return String(pair);
      if (Array.isArray(pair)) return pair[i] ?? pair[0] ?? fallback;
      if (typeof pair === 'object') return pair[lang] ?? pair.en ?? fallback;
      return String(pair);
    },
    [i, lang]
  );

  const setLang = useCallback((code) => {
    if (code === 'en' || code === 'hi') setLangState(code);
  }, []);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      L,
      langs: LANGS,
      locale: LANGS[i].locale,
      speech: LANGS[i].speech,
      isHindi: lang === 'hi',
      /** Localized number formatting (Indian grouping). */
      n: (v, opts) => {
        try { return new Intl.NumberFormat(LANGS[i].locale, opts).format(v); } catch { return String(v); }
      },
      /** Localized date formatting. */
      d: (value, opts) => {
        try {
          const date = value instanceof Date ? value : new Date(value);
          if (Number.isNaN(date.getTime())) return '—';
          return new Intl.DateTimeFormat(LANGS[i].locale, opts || { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
        } catch { return String(value); }
      },
    }),
    [lang, setLang, t, L, i]
  );

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>');
  return ctx;
}

export default useI18n;
