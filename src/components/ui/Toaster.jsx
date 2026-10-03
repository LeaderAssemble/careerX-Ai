import { X, CircleCheck, TriangleAlert, CircleAlert, Info } from 'lucide-react';
import { useApp } from '../../store/AppStore';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/utils';

/** Global toast viewport — success / error / warn / info with a next action. */
export default function Toaster() {
  const { toasts, dismissToast } = useApp();
  const { L } = useI18n();
  if (!toasts.length) return null;

  const styles = {
    success: { icon: CircleCheck, ring: 'border-ok/40', tint: 'text-ok', bar: 'bg-ok' },
    error: { icon: TriangleAlert, ring: 'border-bad/40', tint: 'text-bad', bar: 'bg-bad' },
    warn: { icon: CircleAlert, ring: 'border-warn/40', tint: 'text-warn', bar: 'bg-warn' },
    info: { icon: Info, ring: 'border-brand/40', tint: 'text-brand', bar: 'bg-brand' },
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex flex-col items-center gap-2 px-3 pb-24 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end sm:pb-5"
      role="region" aria-live="polite" aria-label="Notifications"
    >
      {toasts.map((t) => {
        const s = styles[t.kind] || styles.info;
        const Icon = s.icon;
        return (
          <div
            key={t.id}
            className={cn('pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-xl border bg-surface/95 p-3.5 pr-10 shadow-lift backdrop-blur-xl animate-slide-in-right', s.ring)}
          >
            <span className={cn('absolute inset-y-0 left-0 w-[3px]', s.bar)} aria-hidden />
            <div className="flex items-start gap-2.5">
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', s.tint)} aria-hidden />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-snug text-ink">{L(t.title)}</p>
                {t.body ? <p className="muted mt-0.5 text-xs leading-relaxed">{L(t.body)}</p> : null}
                {t.action ? (
                  <button type="button" onClick={t.action.onClick} className="mt-2 text-xs font-bold text-brand underline-offset-2 hover:underline">
                    {L(t.action.label)}
                  </button>
                ) : null}
              </div>
            </div>
            <button
              type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss"
              className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-md text-muted transition hover:bg-surface2 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
