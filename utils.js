import { useCallback, useEffect, useRef, useState } from 'react';
import storage from './storage';

/** className joiner (avoids pulling in clsx for one line of logic). */
export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

export const clamp = (v, min = 0, max = 100) => Math.min(max, Math.max(min, v));

export const pct = (v) => `${Math.round(clamp(v))}%`;

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

/** Deterministic pseudo-random generator (mulberry32) — used for stable demo cohorts. */
export function seeded(seed) {
  let a = seed >>> 0;
  return function next() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str = '') {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

export const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0);

export const avg = (arr) => (arr.length ? sum(arr) / arr.length : 0);

export function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const k = keyFn(item);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'CX';
}

export function relativeTime(date, locale = 'en-IN') {
  try {
    const d = date instanceof Date ? date : new Date(date);
    const diff = (Date.now() - d.getTime()) / 1000;
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (diff < 60) return rtf.format(-Math.round(diff), 'second');
    if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
    if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
    if (diff < 2592000) return rtf.format(-Math.round(diff / 86400), 'day');
    return rtf.format(-Math.round(diff / 2592000), 'month');
  } catch {
    return '';
  }
}

/* ------------------------- hooks ------------------------- */

/** State mirrored into the local cache and authenticated data sync. */
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    return storage.get(key, initial);
  });
  useEffect(() => {
    storage.set(key, value);
  }, [key, value]);
  return [value, setValue];
}

/**
 * Scroll-reveal: adds `.in` once the element enters the viewport.
 * Respects prefers-reduced-motion (CSS already neutralises the transform).
 */
export function useReveal(options = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('in');
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px', ...options }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/** Reveals every [data-reveal] child inside a container, staggered. */
export function useRevealGroup(deps = []) {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const items = root.querySelectorAll('[data-reveal]');
    // No IntersectionObserver (old browsers, some test environments): show everything.
    if (typeof IntersectionObserver === 'undefined') {
      items.forEach((el) => el.classList.add('in'));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number(e.target.dataset.revealIndex || 0);
            e.target.style.transitionDelay = `${Math.min(idx * 70, 420)}ms`;
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    try { return window.matchMedia(query).matches; } catch { return false; }
  });
  useEffect(() => {
    try {
      const mq = window.matchMedia(query);
      const on = () => setMatches(mq.matches);
      on();
      mq.addEventListener('change', on);
      return () => mq.removeEventListener('change', on);
    } catch { return undefined; }
  }, [query]);
  return matches;
}

/** Count-up animation for statistic numbers. */
export function useCountUp(target = 0, duration = 900, start = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    const reduce = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setValue(target); return; }
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return value;
}

/** Locks body scroll while a modal/drawer is open. */
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [active]);
}

/** Basic focus trap + Escape handling for modals and drawers. */
export function useFocusTrap(active, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) return undefined;
    const node = ref.current;
    const prev = document.activeElement;
    const sel = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';
    const focusables = () => (node ? Array.from(node.querySelectorAll(sel)).filter((el) => el.offsetParent !== null) : []);
    const t = setTimeout(() => focusables()[0]?.focus(), 40);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
    };
  }, [active, onClose]);
  return ref;
}

/** Copy-to-clipboard with a transient success flag. */
export function useCopy(timeout = 1600) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
      return true;
    } catch {
      return false;
    }
  }, [timeout]);
  return [copied, copy];
}

export const LEVEL_LABELS = [
  ['No experience', 'कोई अनुभव नहीं'],
  ['Aware', 'जानकारी है'],
  ['Basic', 'बेसिक'],
  ['Comfortable', 'अच्छा'],
  ['Strong', 'मजबूत'],
];

/** skill level 0..4 → 0..100 */
export const levelToScore = (l = 0) => clamp((Number(l) || 0) * 25);
export const scoreToLevel = (s = 0) => Math.round(clamp(s) / 25);
