import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft, Sun, Moon, Languages, BellOff } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import { useTheme } from '../../context/ThemeContext';
import { STUDENT_NAV } from '../../config/nav';
import { cn } from '../../lib/utils';

/**
 * v8 Command Palette — Ctrl/⌘+K fuzzy jump-to-page + instant actions.
 * Fully keyboard driven (↑ ↓ Enter Esc), labelled for screen readers,
 * and animated with the same motion language as the rest of the app.
 */
function score(label, q) {
  const L = label.toLowerCase();
  const Q = q.toLowerCase();
  if (!Q) return 1;
  const idx = L.indexOf(Q);
  if (idx === 0) return 100;
  if (idx > 0) return 60;
  // subsequence match
  let i = 0;
  for (const ch of L) if (ch === Q[i]) i += 1;
  return i === Q.length ? 20 : 0;
}

function Highlight({ label, q }) {
  if (!q) return label;
  const idx = label.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return label;
  return (
    <>
      {label.slice(0, idx)}
      <span className="text-brand">{label.slice(idx, idx + q.length)}</span>
      {label.slice(idx + q.length)}
    </>
  );
}

export function CommandPalette() {
  const { t, L, lang, setLang } = useI18n();
  const { markAllRead } = useApp();
  const { toggle, isDark } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const entries = useMemo(() => {
    const pages = STUDENT_NAV.flatMap((g) => g.items).map((it) => ({
      kind: 'page', id: it.to, label: t(it.labelKey), icon: it.icon, run: () => navigate(it.to),
    }));
    const actions = [
      { kind: 'action', id: 'theme', label: t('cmdk.theme'), icon: isDark ? Sun : Moon, run: toggle },
      { kind: 'action', id: 'lang', label: t('cmdk.lang'), icon: Languages, run: () => setLang(lang === 'hi' ? 'en' : 'hi') },
      { kind: 'action', id: 'markall', label: t('cmdk.markAll'), icon: BellOff, run: markAllRead },
    ];
    return [...pages, ...actions];
  }, [t, lang, isDark, navigate, toggle, setLang, markAllRead]);

  const results = useMemo(() => {
    if (!q.trim()) return entries;
    return entries
      .map((e) => ({ e, s: score(e.label, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.e);
  }, [entries, q]);

  useEffect(() => {
    const onKey = (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
        ev.preventDefault();
        setOpen((o) => !o);
        setQ('');
        setCursor(0);
      }
      if (ev.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);
  useEffect(() => { setCursor(0); }, [q]);
  useEffect(() => {
    listRef.current?.querySelector('[data-cursor="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const runEntry = (e) => { setOpen(false); setQ(''); e.run(); };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="icon-btn gap-1.5" aria-label={t('cmdk.open')} aria-haspopup="dialog">
        <Search className="h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/45 p-4 pt-[12vh] backdrop-blur-sm animate-fade-in"
          role="presentation" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={t('cmdk.title')}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-lift animate-scale-in"
            onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-line px-3.5 py-3">
              <Search className="h-4 w-4 shrink-0 text-brand" aria-hidden />
              <input
                ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={t('cmdk.placeholder')} aria-label={t('cmdk.placeholder')}
                className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted/70"
                onKeyDown={(ev) => {
                  if (ev.key === 'ArrowDown') { ev.preventDefault(); setCursor((c) => Math.min(results.length - 1, c + 1)); }
                  if (ev.key === 'ArrowUp') { ev.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
                  if (ev.key === 'Enter' && results[cursor]) { ev.preventDefault(); runEntry(results[cursor]); }
                }}
              />
              <kbd className="rounded border border-line bg-surface2/60 px-1.5 py-0.5 text-[9px] font-bold text-muted">ESC</kbd>
            </div>
            <ul ref={listRef} role="listbox" aria-label={t('cmdk.title')} className="max-h-[46vh] overflow-y-auto p-2">
              {results.length ? results.map((e, i) => {
                const Icon = e.icon;
                return (
                  <li key={e.id} role="option" aria-selected={i === cursor} data-cursor={i === cursor}>
                    <button type="button" onClick={() => runEntry(e)} onMouseEnter={() => setCursor(i)}
                      className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold transition',
                        i === cursor ? 'bg-brand/15 text-brand' : 'text-ink hover:bg-surface2')}>
                      <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg border',
                        i === cursor ? 'border-brand/40 bg-brand/10 text-brand' : 'border-line bg-surface2/60 text-muted')}>
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 truncate"><Highlight label={e.label} q={q} /></span>
                      <span className="muted shrink-0 text-[9px] font-bold uppercase tracking-wider">{e.kind === 'page' ? t('cmdk.pages') : t('cmdk.actions')}</span>
                      {i === cursor ? <CornerDownLeft className="h-3 w-3 shrink-0 text-brand" aria-hidden /> : null}
                    </button>
                  </li>
                );
              }) : (
                <li className="muted px-3 py-6 text-center text-[12px]">{t('cmdk.empty')}</li>
              )}
            </ul>
            <div className="muted border-t border-line px-3.5 py-2 text-[10px] font-semibold">{t('cmdk.hint')}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default CommandPalette;
