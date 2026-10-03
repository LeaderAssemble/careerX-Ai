import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, CheckCheck, Trash2, BookOpen, Briefcase, Target, Map, FileText, Mic, Trophy,
  ArrowRight, Filter, Info,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import { PageHeader, Card, Badge, Button, Chip, EmptyState, DemoTag } from '../../components/ui/primitives';
import { cn, relativeTime } from '../../lib/utils';

const TYPES = [
  { id: 'course', icon: BookOpen, tone: 'brand' },
  { id: 'internship', icon: Briefcase, tone: 'accent' },
  { id: 'gap', icon: Target, tone: 'warn' },
  { id: 'roadmap', icon: Map, tone: 'brand' },
  { id: 'resume', icon: FileText, tone: 'ok' },
  { id: 'interview', icon: Mic, tone: 'accent' },
  { id: 'achievement', icon: Trophy, tone: 'ok' },
];
const TYPE_BY_ID = Object.fromEntries(TYPES.map((x) => [x.id, x]));

export default function Notifications() {
  const { t, L, lang } = useI18n();
  const { notifications, unread, markNotificationRead, markAllRead, clearNotifications } = useApp();
  const [filter, setFilter] = useState('all');
  const [showRead, setShowRead] = useState(true);

  const list = useMemo(() => {
    const rows = [...(notifications || [])].sort((a, b) => new Date(b.at) - new Date(a.at));
    return rows.filter((n) => (filter === 'all' || n.type === filter) && (showRead || !n.read));
  }, [notifications, filter, showRead]);

  const counts = useMemo(() => {
    const c = {};
    (notifications || []).forEach((n) => { c[n.type] = (c[n.type] || 0) + 1; });
    return c;
  }, [notifications]);

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden border-line bg-gradient-to-br from-brand/[0.14] via-accent/[0.05] to-transparent p-4 sm:p-5">
        <span aria-hidden className="pointer-events-none absolute -top-28 left-1/2 h-72 w-[38rem] -translate-x-1/2 rounded-full bg-brand/[0.10] blur-3xl dark:bg-brand/[0.16]" />
      <PageHeader
        eyebrow={<><Bell className="h-3 w-3" aria-hidden />{t('nav.notifications')}</>}
        title={t('notif.title')}
        sub={t('notif.sub')}
        tags={[
          unread ? <Badge key="u" tone="warn">{t('notif.unread', { n: unread })}</Badge> : <Badge key="u" tone="ok" icon={CheckCheck}>{t('notif.empty')}</Badge>,
          <Badge key="n" tone="muted">{t('common.results', { n: (notifications || []).length })}</Badge>,
        ]}
        actions={
          <>
            <Button size="sm" variant="ghost" icon={CheckCheck} onClick={markAllRead} disabled={!unread}>{t('notif.markAll')}</Button>
            <Button size="sm" variant="quiet" icon={Trash2} onClick={clearNotifications} disabled={!(notifications || []).length}>{t('common.clear')}</Button>
          </>
        }
      />
      </Card>

      <Card className="bg-surface p-3.5 dark:bg-surface2">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted" aria-hidden />
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>{t('common.all')} <span className="opacity-60">{(notifications || []).length}</span></Chip>
          {TYPES.map((x) => (
            <Chip key={x.id} active={filter === x.id} onClick={() => setFilter(x.id)} icon={x.icon}>
              {t(`notif.${x.id}`)} <span className="opacity-60">{counts[x.id] || 0}</span>
            </Chip>
          ))}
          <Chip className="ml-auto px-3 py-2" active={!showRead} onClick={() => setShowRead((v) => !v)}>
            {L(['Unread only', 'केवल अपठित'])}
          </Chip>
        </div>
      </Card>

      {list.length ? (
        <ul className="space-y-2.5">
          {list.map((n) => {
            const meta = TYPE_BY_ID[n.type] || { icon: Info, tone: 'muted' };
            const Icon = meta.icon;
            const body = Array.isArray(n.body) ? L(n.body) : n.body;
            const title = Array.isArray(n.title) ? L(n.title) : (n.title || t(`notif.${n.type}`));
            return (
              <li key={n.id}>
                <Card className={cn('relative overflow-hidden transition',
                  !n.read
                    ? 'border-brand/60 bg-surface bg-gradient-to-br from-brand/[0.20] via-brand/[0.09] to-transparent shadow-lift dark:bg-surface2'
                    : 'border-line bg-surface shadow-sm dark:bg-surface2')}>
                  {!n.read ? <span className="absolute inset-y-0 left-0 w-1 bg-brand/70" aria-hidden /> : null}
                  <div className="flex items-start gap-3">
                    <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl border',
                      meta.tone === 'ok' ? 'border-ok/40 bg-ok/15 text-ok'
                        : meta.tone === 'warn' ? 'border-warn/40 bg-warn/15 text-warn'
                        : meta.tone === 'accent' ? 'border-accent/40 bg-accent/15 text-accent'
                        : 'border-brand/40 bg-brand/15 text-brand')}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-[13.5px] font-bold">{title}</h2>
                        {!n.read ? <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-label={t('common.new')} /> : null}
                        <span className="muted ml-auto text-[11px]">{relativeTime(n.at, lang === 'hi' ? 'hi-IN' : 'en-IN')}</span>
                      </div>
                      <p className={cn('mt-1 text-[12.5px] leading-relaxed', n.read ? 'muted' : 'text-ink/90')}>{body}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {n.link ? (
                          <Link to={n.link} onClick={() => markNotificationRead(n.id)}
                            className="btn btn-ghost btn-sm">
                            {L(['Open', 'खोलें'])}<ArrowRight className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        ) : null}
                        {!n.read ? (
                          <Button size="sm" variant="quiet" icon={CheckCheck} onClick={() => markNotificationRead(n.id)}>{L(['Mark read', 'पढ़ा हुआ चिह्नित करें'])}</Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={Bell}
          title={(notifications || []).length ? t('common.noResults') : t('notif.empty')}
          body={(notifications || []).length ? L(['Nothing matches this filter.', 'इस फ़िल्टर से कुछ मेल नहीं खाता।']) : t('notif.emptyHint')}
          action={(notifications || []).length
            ? <Button size="sm" variant="ghost" onClick={() => { setFilter('all'); setShowRead(true); }}>{t('common.clear')}</Button>
            : <Button size="sm" icon={ArrowRight} to="/app/courses">{t('notif.browse')}</Button>}
        />
      )}

      <Card className="bg-surface dark:bg-surface2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
            <div>
              <h2 className="font-display text-[13.5px] font-bold">{L(['How notifications are generated', 'सूचनाएँ कैसे बनती हैं'])}</h2>
              <p className="muted mt-1 max-w-2xl text-[12px] leading-relaxed">
                {L(['They come from your activity: a new skill gap, roadmap milestone, saved application, completed interview or unlocked badge. No push service, email or third party is involved.',
                  'वे आपकी गतिविधि से आती हैं: नया स्किल गैप, रोडमैप माइलस्टोन, सेव आवेदन, पूर्ण इंटरव्यू या अनलॉक बैज। कोई पुश सेवा, ईमेल या तीसरा पक्ष शामिल नहीं है।'])}
              </p>
            </div>
          </div>
          <DemoTag />
        </div>
      </Card>
    </div>
  );
}
