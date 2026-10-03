import { forwardRef, useEffect, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Loader2, ChevronDown, Info, TriangleAlert, CircleCheck, CircleAlert, ArrowLeft } from 'lucide-react';
import { cn, clamp, initials, useFocusTrap, useScrollLock } from '../../lib/utils';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';

/**
 * CareerX UI primitives — one design system, used by every screen.
 * All components are keyboard accessible, labelled, and theme-aware via CSS variables.
 */

/* ------------------------------- Button ------------------------------- */
export const Button = forwardRef(function Button(
  { as, to, href, variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, loading, className, children, ...rest },
  ref
) {
  const sizes = { sm: 'btn-sm', md: '', lg: 'btn-lg' };
  const variants = {
    primary: 'btn-primary', ghost: 'btn-ghost', quiet: 'btn-quiet',
    danger: 'btn border border-bad/50 text-bad hover:bg-bad/10',
    ok: 'btn border border-ok/50 text-ok hover:bg-ok/10',
  };
  const cls = cn(variants[variant] || variants.primary, sizes[size], className);
  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon ? <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden /> : null}
      {children}
      {IconRight ? <IconRight className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden /> : null}
    </>
  );
  if (to) return <Link ref={ref} to={to} className={cls} {...rest}>{content}</Link>;
  if (href) return <a ref={ref} href={href} target="_blank" rel="noreferrer noopener" className={cls} {...rest}>{content}</a>;
  const Comp = as || 'button';
  return <Comp ref={ref} className={cls} disabled={loading || rest.disabled} {...rest}>{content}</Comp>;
});

export const IconButton = forwardRef(function IconButton({ icon: Icon, label, className, active, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn('icon-btn', active && 'border-brand/60 text-brand bg-brand/10', className)}
      {...rest}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
});

/* -------------------------------- Card -------------------------------- */
/** True when the caller supplied its own padding utility (so the default is skipped). */
const hasPaddingClass = (cls = '') => /(^|\s)(?:[a-z-]+:)?-?(?:p|px|py|pt|pb|pl|pr)-\d/.test(cls);

export function Card({ as: Comp = 'div', className, hover, grad, padded = true, children, ...rest }) {
  return (
    <Comp
      className={cn('card', padded && !hasPaddingClass(className) && 'p-4 sm:p-5', hover && 'card-hover', grad && 'grad-border', className)}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/* ------------------------------- Badges ------------------------------- */
const TONES = {
  brand: 'text-brand bg-brand/[0.12] border-brand/30',
  accent: 'text-accent bg-accent/[0.12] border-accent/30',
  ok: 'text-ok bg-ok/[0.12] border-ok/30',
  warn: 'text-warn bg-warn/[0.12] border-warn/30',
  bad: 'text-bad bg-bad/[0.12] border-bad/30',
  muted: 'text-muted bg-surface2 border-line',
};
export function Badge({ tone = 'muted', className, children, icon: Icon }) {
  return (
    <span className={cn('badge border', TONES[tone] || TONES.muted, className)}>
      {Icon ? <Icon className="h-3 w-3" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function DemoTag({ label = ['Demo Data', 'डेमो डेटा'], tone = 'warn', className }) {
  const { L } = useI18n();
  const { user } = useApp();
  if (user) return null;
  return <Badge tone={tone} className={className}>{L(label)}</Badge>;
}

export function Chip({ active, onClick, children, className, icon: Icon, ...rest }) {
  const Comp = onClick ? 'button' : 'span';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={cn('chip', active && 'chip-on', onClick && 'cursor-pointer hover:border-brand/50 hover:text-ink', className)}
      {...rest}
    >
      {Icon ? <Icon className="h-3 w-3" aria-hidden /> : null}
      {children}
    </Comp>
  );
}

/* ------------------------------ Typography ------------------------------ */
export function SectionHeading({ eyebrow, title, sub, align = 'left', className, children }) {
  return (
    <div className={cn('mb-6 sm:mb-8', align === 'center' && 'text-center mx-auto max-w-2xl', className)}>
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2 className="h-display mt-2 text-2xl sm:text-3xl md:text-[2.1rem] text-balance">{title}</h2>
      {sub ? <p className="muted mt-2.5 text-sm sm:text-[15px] leading-relaxed text-balance">{sub}</p> : null}
      {children}
    </div>
  );
}

export function BackButton({ label, className, fallbackTo = '/app/dashboard', children }) {
  const navigate = useNavigate();
  const { L } = useI18n();
  const text = label || L(['Back', 'वापस']);

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallbackTo);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-line bg-surface2/70 px-3 py-1.5 text-[12px] font-semibold text-ink transition hover:border-brand/50 hover:bg-brand/8 hover:text-brand',
        className
      )}
      aria-label={typeof text === 'string' ? text : 'Back'}
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      {children || text}
    </button>
  );
}

export function PageHeader({ eyebrow, title, sub, actions, tags, className, showBackButton = true }) {
  return (
    <header className={cn('mb-5 sm:mb-7', className)}>
      {showBackButton ? <div className="mb-3"><BackButton /></div> : null}
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="h-display text-2xl sm:text-[1.9rem] text-balance">{title}</h1>
          {sub ? <p className="muted mt-1.5 max-w-3xl text-sm leading-relaxed">{sub}</p> : null}
          {tags?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{tags}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/* ------------------------------- Progress ------------------------------- */
export function ProgressRing({ value = 0, size = 128, stroke = 10, label, sublabel, tone = 'brand', className, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = clamp(value);
  const colors = {
    brand: ['rgb(var(--c-brand-soft))', 'rgb(var(--c-accent))'],
    ok: ['rgb(var(--c-ok))', 'rgb(var(--c-accent))'],
    warn: ['rgb(var(--c-warn))', 'rgb(var(--c-brand-2))'],
    bad: ['rgb(var(--c-bad))', 'rgb(var(--c-warn))'],
  };
  const [c1, c2] = colors[tone] || colors.brand;
  const gid = useId();
  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label || 'Score'}: ${Math.round(v)}`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-line))" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * v) / 100}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children || (
          <div>
            <div className="font-display text-2xl font-bold tabular-nums sm:text-3xl">{Math.round(v)}</div>
            {sublabel ? <div className="muted mt-0.5 text-[10px] font-semibold uppercase tracking-wider">{sublabel}</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function Meter({ value = 0, label, right, tone = 'brand', size = 'md', showTrack = true, className }) {
  const v = clamp(value);
  const heights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2', lg: 'h-3' };
  const bars = {
    brand: 'linear-gradient(90deg, rgb(var(--c-brand-soft)), rgb(var(--c-accent)))',
    ok: 'linear-gradient(90deg, rgb(var(--c-ok)), rgb(var(--c-accent)))',
    warn: 'linear-gradient(90deg, rgb(var(--c-warn)), rgb(var(--c-brand-2)))',
    bad: 'linear-gradient(90deg, rgb(var(--c-bad)), rgb(var(--c-warn)))',
  };
  return (
    <div className={cn('w-full', className)}>
      {(label || right) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label ? <span className="text-xs font-semibold text-ink">{label}</span> : <span />}
          {right ? <span className="muted text-[11px] font-semibold tabular-nums">{right}</span> : null}
        </div>
      )}
      <div
        className={cn('skillbar w-full', heights[size], !showTrack && 'bg-transparent')}
        role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label || 'progress'}
      >
        <span style={{ width: `${v}%`, backgroundImage: bars[tone] || bars.brand, transition: 'width .9s cubic-bezier(.22,1,.36,1)' }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, icon: Icon, tone = 'brand', to, className, hint }) {
  const body = (
    <Card hover={!!to} className={cn('h-full', to && 'cursor-pointer', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="muted text-[11px] font-semibold uppercase tracking-wider">{label}</div>
          <div className="mt-1.5 font-display text-2xl font-bold tabular-nums sm:text-[1.7rem]">{value}</div>
          {sub ? <div className="muted mt-1 text-xs leading-snug">{sub}</div> : null}
        </div>
        {Icon ? (
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl border', TONES[tone])}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
      </div>
      {hint ? <div className="muted mt-3 border-t border-line pt-2.5 text-[11px] leading-snug">{hint}</div> : null}
    </Card>
  );
  return to ? <Link to={to} className="block h-full">{body}</Link> : body;
}

/* -------------------------------- States -------------------------------- */
export function Skeleton({ className, style }) {
  return <div className={cn('skeleton', className)} style={style} aria-hidden />;
}

export function CardSkeleton({ lines = 3, className }) {
  return (
    <Card className={className}>
      <Skeleton className="mb-3 h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="mb-2 h-3" style={{ width: `${92 - i * 14}%` }} />
      ))}
    </Card>
  );
}

export function EmptyState({ icon: Icon = Info, title, body, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl2 border border-dashed border-line bg-surface2/40 px-6 py-12 text-center', className)}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-surface text-brand">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
      {body ? <p className="muted mt-1.5 max-w-md text-sm leading-relaxed">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

const STATE_ICONS = { error: TriangleAlert, warn: CircleAlert, success: CircleCheck, info: Info };
export function ErrorState({ kind = 'error', title, body, action, className }) {
  const Icon = STATE_ICONS[kind] || Info;
  const tone = kind === 'success' ? 'ok' : kind === 'warn' ? 'warn' : kind === 'info' ? 'brand' : 'bad';
  return (
    <div className={cn('rounded-xl2 border p-5', TONES[tone], 'bg-surface/60', className)} role={kind === 'error' ? 'alert' : 'status'}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <h3 className="font-display text-sm font-bold text-ink">{title}</h3>
          {body ? <p className="muted mt-1 text-sm leading-relaxed">{body}</p> : null}
          {action ? <div className="mt-3.5">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Tabs --------------------------------- */
export function Tabs({ tabs, value, onChange, className, size = 'md' }) {
  return (
    <div role="tablist" aria-orientation="horizontal" className={cn('no-scrollbar flex gap-1.5 overflow-x-auto rounded-xl border border-line bg-surface2/60 p-1.5', className)}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => {
              const i = tabs.findIndex((t) => t.id === value);
              if (e.key === 'ArrowRight') { e.preventDefault(); onChange(tabs[(i + 1) % tabs.length].id); }
              if (e.key === 'ArrowLeft') { e.preventDefault(); onChange(tabs[(i - 1 + tabs.length) % tabs.length].id); }
            }}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3 font-semibold transition-all duration-200',
              size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-[13px]',
              active ? 'bg-surface text-ink shadow-soft ring-1 ring-brand/30' : 'text-muted hover:text-ink'
            )}
          >
            {tab.icon ? <tab.icon className="h-3.5 w-3.5" aria-hidden /> : null}
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] tabular-nums', active ? 'bg-brand/15 text-brand' : 'bg-surface2 text-muted')}>{tab.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented({ options, value, onChange, label, className }) {
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {label ? <span className="muted mr-1 text-xs font-semibold">{label}</span> : null}
      <div className="flex rounded-lg border border-line bg-surface2/60 p-0.5" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)} type="button" aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn('rounded-md px-2.5 py-1.5 text-xs font-semibold transition', value === o.value ? 'bg-surface text-brand shadow-soft ring-1 ring-brand/25' : 'text-muted hover:text-ink')}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- Tooltip -------------------------------- */
export function Tooltip({ label, side = 'top', className, children }) {
  const [open, setOpen] = useState(false);
  const pos = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };
  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
    >
      {children}
      {open && label ? (
        <span role="tooltip" className={cn('tooltip-body w-max max-w-[240px] whitespace-normal text-center', pos[side])}>{label}</span>
      ) : null}
    </span>
  );
}

/* --------------------------------- Modal --------------------------------- */
export function Modal({ open, onClose, title, sub, children, footer, size = 'md', icon: Icon }) {
  const ref = useFocusTrap(open, onClose);
  useScrollLock(open);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Dialog'}>
      <button type="button" aria-label="Close overlay" className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div ref={ref} className={cn('relative w-full rounded-t-3xl border border-line bg-surface shadow-lift animate-slide-up-sheet sm:rounded-2xl sm:animate-scale-in', widths[size])}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/30 bg-brand/10 text-brand"><Icon className="h-4 w-4" aria-hidden /></span> : null}
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold">{title}</h2>
              {sub ? <p className="muted mt-0.5 text-xs leading-relaxed">{sub}</p> : null}
            </div>
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div> : null}
      </div>
    </div>
  );
}

/* --------------------------------- Drawer --------------------------------- */
export function Drawer({ open, onClose, title, sub, children, side = 'right', footer }) {
  const ref = useFocusTrap(open, onClose);
  useScrollLock(open);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Panel'}>
      <button type="button" aria-label="Close overlay" className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        ref={ref}
        className={cn(
          'absolute top-0 flex h-full w-full max-w-md flex-col border-line bg-surface shadow-lift',
          side === 'right' ? 'right-0 border-l animate-slide-in-right' : 'left-0 border-r'
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold truncate">{title}</h2>
            {sub ? <p className="muted mt-0.5 text-xs">{sub}</p> : null}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-line px-5 py-3.5">{footer}</div> : null}
      </div>
    </div>
  );
}

/* -------------------------------- Accordion -------------------------------- */
export function Accordion({ items, className }) {
  const [open, setOpen] = useState(0);
  return (
    <div className={cn('divide-y divide-line overflow-hidden rounded-xl2 border border-line bg-surface/60', className)}>
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q || i}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-surface2/60 sm:px-5"
            >
              <span className="font-display text-sm font-semibold sm:text-[15px]">{it.q}</span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-brand transition-transform duration-300', isOpen && 'rotate-180')} aria-hidden />
            </button>
            <div className={cn('grid transition-all duration-300 ease-spring', isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
              <div className="overflow-hidden">
                <p className="muted px-4 pb-4 text-sm leading-relaxed sm:px-5">{it.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------- Forms --------------------------------- */
export function Field({ label, hint, error, required, children, className, htmlFor }) {
  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <label className="label" htmlFor={htmlFor}>
          {label}{required ? <span className="ml-1 text-bad">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-bad" role="alert">
          <CircleAlert className="h-3 w-3" aria-hidden />{error}
        </p>
      ) : hint ? <p className="muted mt-1.5 text-[11px] leading-snug">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, invalid, ...rest }, ref) {
  return <input ref={ref} className={cn('field', invalid && 'field-error', className)} aria-invalid={invalid || undefined} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ className, invalid, rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn('field resize-y leading-relaxed', invalid && 'field-error', className)} aria-invalid={invalid || undefined} {...rest} />;
});

export function Select({ className, invalid, children, ...rest }) {
  return (
    <div className="relative">
      <select className={cn('field appearance-none pr-9', invalid && 'field-error', className)} aria-invalid={invalid || undefined} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
}

export function Switch({ checked, onChange, label, description, id }) {
  const auto = useId();
  const inputId = id || auto;
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label className="block text-sm font-semibold text-ink" htmlFor={inputId}>{label}</label>
        {description ? <p className="muted mt-0.5 text-xs leading-snug">{description}</p> : null}
      </div>
      <button
        id={inputId} type="button" role="switch" aria-checked={!!checked} aria-label={typeof label === 'string' ? label : undefined}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200', checked ? 'border-brand/60 bg-brand/30' : 'border-line bg-surface2')}
      >
        <span className={cn('absolute top-0.5 h-4.5 w-4.5 rounded-full transition-all duration-200', checked ? 'left-[calc(100%-1.375rem)] bg-brand' : 'left-0.5 bg-muted')}
          style={{ height: '1.125rem', width: '1.125rem' }} />
      </button>
    </div>
  );
}

/* --------------------------------- Avatar --------------------------------- */
export function Avatar({ name = '', src, size = 40, className, ring = true }) {
  const s = { width: size, height: size, fontSize: Math.max(11, size * 0.36) };
  if (src) {
    return <img src={src} alt={name} style={s} className={cn('shrink-0 rounded-xl object-cover', ring && 'ring-2 ring-brand/40', className)} />;
  }
  return (
    <span
      aria-hidden={!!name} role={name ? undefined : 'img'}
      style={s}
      className={cn('grid shrink-0 place-items-center rounded-xl border border-brand/30 bg-gradient-to-br from-brand/25 to-accent/20 font-display font-bold text-brand', ring && 'ring-2 ring-brand/25', className)}
    >
      {initials(name)}
    </span>
  );
}

/* -------------------------------- Timeline -------------------------------- */
export function Timeline({ items, className }) {
  return (
    <ol className={cn('relative space-y-5 border-l border-line pl-5', className)}>
      {items.map((it, i) => (
        <li key={it.id || i} className="relative">
          <span
            className={cn('absolute -left-[26px] top-1 grid h-3.5 w-3.5 place-items-center rounded-full border-2',
              it.done ? 'border-ok bg-ok' : it.active ? 'border-brand bg-brand/30' : 'border-line bg-surface2')}
            aria-hidden
          />
          <div className="font-display text-sm font-semibold">{it.title}</div>
          {it.body ? <p className="muted mt-1 text-xs leading-relaxed">{it.body}</p> : null}
          {it.meta ? <div className="mt-1.5 flex flex-wrap gap-1.5">{it.meta}</div> : null}
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------- Skill chip ------------------------------- */
export function SkillChip({ name, level, max = 4, tone, className }) {
  const ratio = max ? clamp((level / max) * 100) : 0;
  const auto = tone || (ratio >= 75 ? 'ok' : ratio >= 45 ? 'warn' : 'bad');
  return (
    <Tooltip label={level != null ? `${Math.round(ratio)}%` : null}>
      <span className={cn('chip border', TONES[auto], className)}>
        {name}
        {level != null ? (
          <span className="ml-1 inline-flex h-1 w-8 overflow-hidden rounded-full bg-current/25 align-middle">
            <span className="block h-full rounded-full bg-current" style={{ width: `${ratio}%` }} />
          </span>
        ) : null}
      </span>
    </Tooltip>
  );
}

export function Divider({ className }) {
  return <div className={cn('divider', className)} />;
}

export function KeyValue({ items, className }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-3 sm:grid-cols-2', className)}>
      {items.map((it, i) => (
        <div key={it.k || i} className="min-w-0">
          <dt className="muted text-[11px] font-semibold uppercase tracking-wider">{it.k}</dt>
          <dd className="mt-0.5 truncate text-sm font-medium text-ink">{it.v}</dd>
        </div>
      ))}
    </dl>
  );
}
