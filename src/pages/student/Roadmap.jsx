import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Map, Check, RotateCw, ArrowRight, CalendarDays, Target, Flame, Trophy, ChevronDown,
  ListChecks, Clock, Sparkles,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import { PageHeader, Card, Badge, Button, Chip, Meter, ProgressRing, EmptyState, DemoTag } from '../../components/ui/primitives';
import { NeedsProfile, DemoNotice } from '../../components/app/parts';
import { SKILL_BY_ID } from '../../data/catalog';
import { cn } from '../../lib/utils';

export default function Roadmap() {
  const { t, L, d } = useI18n();
  const { roadmap, roadmapStats, activeCareer, derived, profile, toggleTask, rebuildIntelligence, toast } = useApp();
  const [openMonth, setOpenMonth] = useState(null);

  const months = useMemo(() => (roadmap?.months || []).slice().sort((a, b) => (a.order || a.index) - (b.order || b.index)), [roadmap]);
  const monthStats = useMemo(() => months.map((m) => {
    const done = m.tasks.filter((x) => x.done).length;
    return { ...m, done, total: m.tasks.length, pct: m.tasks.length ? Math.round((done / m.tasks.length) * 100) : 0 };
  }), [months]);

  if (!derived || !profile) return <NeedsProfile />;

  if (!roadmap || !months.length) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow={<><Map className="h-3 w-3" aria-hidden />{t('nav.roadmap')}</>} title={t('road.title')} sub={t('road.sub')} />
        <EmptyState
          icon={Map}
          title={t('road.noTarget')}
          body={L(['Choose a target career and CareerX builds a six-month plan, ordered so the months that attack your biggest gaps come first.',
            'लक्षित करियर चुनें और CareerX छह महीने की योजना बनाएगा, जिसमें सबसे बड़े गैप वाले महीने पहले आते हैं।'])}
          action={<Button to="/app/ai-career" iconRight={ArrowRight}>{t('career.setTarget')}</Button>}
        />
      </div>
    );
  }

  const completedMonths = monthStats.filter((m) => m.pct === 100).length;
  const nextMonth = monthStats.find((m) => m.pct < 100) || monthStats[0];
  const remaining = roadmapStats.total - roadmapStats.done;
  const opened = openMonth ?? nextMonth?.order ?? 1;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><Map className="h-3 w-3" aria-hidden />{t('nav.roadmap')}</>}
        title={t('road.title')}
        sub={t('road.sub')}
        tags={[
          activeCareer ? <Badge key="c" tone="brand" icon={Target}>{L(activeCareer.n)}</Badge> : null,
          <Badge key="g" tone="muted" icon={CalendarDays}>{L([`Generated ${d(roadmap.generatedAt)}`, `बनाया गया ${d(roadmap.generatedAt)}`])}</Badge>,
        ]}
        actions={
          <Button size="sm" variant="ghost" icon={RotateCw} onClick={() => {
            rebuildIntelligence();
            toast({ title: ['Roadmap rebuilt', 'रोडमैप फिर बना'], body: ['Completed tasks were kept.', 'पूर्ण कार्य बरकरार रहे।'] });
          }}>{t('road.rebuild')}</Button>
        }
      />

      {/* overview */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card grad className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-brand/10 blur-3xl" aria-hidden />
          <div className="relative flex items-center gap-4">
            <ProgressRing value={roadmapStats.pct} size={104} stroke={9} tone={roadmapStats.pct >= 60 ? 'ok' : 'brand'} label={`${roadmapStats.pct}%`} />
            <div className="min-w-0">
              <h2 className="font-display text-[15px] font-bold">{t('road.progress')}</h2>
              <p className="muted mt-1 text-[12.5px]">{t('road.tasksDone', { n: roadmapStats.done, m: roadmapStats.total })}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Badge tone="ok" icon={Trophy}>{completedMonths}/{months.length} {L(['months done', 'महीने पूर्ण'])}</Badge>
                <Badge tone="warn" icon={Clock}>{remaining} {L(['tasks left', 'कार्य शेष'])}</Badge>
              </div>
            </div>
          </div>
          <div className="relative mt-4 grid grid-cols-6 gap-1.5">
            {monthStats.map((m) => (
              <button
                key={m.index} type="button" onClick={() => setOpenMonth(m.order)}
                className="group rounded-lg border border-line bg-surface2/60 p-1.5 text-center transition hover:border-brand/50"
                aria-label={`${L(['Month', 'महीना'])} ${m.order}: ${m.pct}%`}
              >
                <div className="muted text-[9px] font-bold uppercase">M{m.order}</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                  <span className={cn('block h-full rounded-full transition-all duration-500', m.pct === 100 ? 'bg-ok' : 'bg-brand')} style={{ width: `${m.pct}%` }} />
                </div>
                <div className="mt-1 text-[9.5px] font-bold tabular-nums text-ink">{m.done}/{m.total}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="eyebrow"><Flame className="h-3 w-3 text-warn" aria-hidden />{L(['Work on this now', 'अभी इस पर काम करें'])}</span>
              <h2 className="mt-1.5 font-display text-[15px] font-bold">{t('road.month')} {nextMonth?.order} · {nextMonth ? L(nextMonth.title) : ''}</h2>
              <p className="muted mt-1 text-[12.5px] leading-snug">{nextMonth ? L(nextMonth.focus) : ''}</p>
            </div>
            {nextMonth ? <ProgressRing value={nextMonth.pct} size={54} stroke={5.5} tone="brand" /> : null}
          </div>
          <ul className="mt-3.5 space-y-1.5">
            {(nextMonth?.tasks || []).filter((x) => !x.done).slice(0, 3).map((task) => (
              <li key={task.id} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface2/40 p-2.5">
                <button
                  type="button" onClick={() => toggleTask(task.id)} aria-pressed={false}
                  className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border border-line bg-surface transition hover:border-brand"
                  aria-label={L(['Mark complete', 'पूर्ण चिह्नित करें'])}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] leading-snug text-ink">{L(task.title)}</span>
                  {task.skills?.length ? (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {task.skills.map((s) => <Chip key={s} className="px-1.5 py-0 text-[9.5px]">{L(SKILL_BY_ID[s]?.n || [s, s])}</Chip>)}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
            {!(nextMonth?.tasks || []).some((x) => !x.done) ? (
              <li className="rounded-xl border border-ok/30 bg-ok/[0.07] p-3 text-[12.5px] font-semibold text-ok">{t('dash.noTasks')}</li>
            ) : null}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3.5">
            <Button size="sm" to="/app/challenge" icon={ListChecks}>{t('nav.challenge')}</Button>
            <Button size="sm" variant="ghost" to="/app/courses" iconRight={ArrowRight}>{t('nav.courses')}</Button>
          </div>
        </Card>
      </div>

      <DemoNotice tone="brand" icon={Sparkles}>
        {L(['Months are re-ordered by your live skill gaps, so the hardest gap gets attacked first. Tick a task and your readiness score updates immediately.',
          'महीने आपके लाइव स्किल गैप के अनुसार पुनः क्रमबद्ध होते हैं, इसलिए सबसे कठिन गैप पहले टूटता है। कार्य टिक करें और आपका रेडीनेस स्कोर तुरंत बदलेगा।'])}
      </DemoNotice>

      {/* month timeline */}
      <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-line sm:before:left-[23px]">
        {monthStats.map((m) => {
          const isOpen = opened === m.order;
          const complete = m.pct === 100;
          return (
            <li key={m.index} className="relative pl-11 sm:pl-14">
              <span
                className={cn('absolute left-0 top-3 grid h-8 w-8 place-items-center rounded-xl border font-display text-[11px] font-bold sm:h-9 sm:w-9 sm:text-xs',
                  complete ? 'border-ok/40 bg-ok/15 text-ok' : isOpen ? 'border-brand/50 bg-brand/15 text-brand' : 'border-line bg-surface2 text-muted')}
                aria-hidden
              >
                {complete ? <Check className="h-4 w-4" /> : m.order}
              </span>

              <Card className={cn('transition', isOpen && 'border-brand/35')}>
                <button
                  type="button" onClick={() => setOpenMonth(isOpen ? null : m.order)}
                  className="flex w-full items-center gap-3 text-left" aria-expanded={isOpen}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-[14px] font-bold">{L(m.title)}</h3>
                      {complete ? <Badge tone="ok" icon={Trophy}>{t('common.completed')}</Badge> : null}
                      {m.index !== m.order ? (
                        <Badge tone="muted">{L([`Template month ${m.index}`, `टेम्पलेट महीना ${m.index}`])}</Badge>
                      ) : null}
                    </div>
                    <p className="muted mt-1 line-clamp-1 text-[12px]">{L(m.focus)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Meter value={m.pct} size="xs" className="flex-1" tone={complete ? 'ok' : 'brand'} />
                      <span className="muted shrink-0 text-[10.5px] font-bold tabular-nums">{m.done}/{m.total}</span>
                    </div>
                  </div>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition-transform duration-300', isOpen && 'rotate-180')} aria-hidden />
                </button>

                {isOpen ? (
                  <div className="mt-4 space-y-2 border-t border-line pt-4">
                    <p className="muted text-[12px] leading-relaxed">{L(m.focus)}</p>
                    {m.skills?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {m.skills.map((s) => <Chip key={s}>{L(SKILL_BY_ID[s]?.n || [s, s])}</Chip>)}
                      </div>
                    ) : null}
                    <ul className="mt-1 space-y-1.5">
                      {m.tasks.map((task) => (
                        <li key={task.id}>
                          <button
                            type="button" onClick={() => toggleTask(task.id)} aria-pressed={!!task.done}
                            className={cn('flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-200',
                              task.done ? 'border-ok/30 bg-ok/[0.07]' : 'border-line bg-surface2/40 hover:border-brand/40 hover:bg-surface2')}
                          >
                            <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition',
                              task.done ? 'border-ok bg-ok text-white' : 'border-line bg-surface')} aria-hidden>
                              {task.done ? <Check className="h-2.5 w-2.5" /> : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={cn('block text-[12.5px] leading-snug', task.done ? 'text-muted line-through' : 'text-ink')}>{L(task.title)}</span>
                              {task.skills?.length ? (
                                <span className="mt-1 flex flex-wrap gap-1">
                                  {task.skills.map((s) => (
                                    <Chip key={s} className={cn('px-1.5 py-0 text-[9.5px]', task.done && 'opacity-60')}>{L(SKILL_BY_ID[s]?.n || [s, s])}</Chip>
                                  ))}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {complete ? (
                      <p className="rounded-xl border border-ok/30 bg-ok/[0.07] p-3 text-[12px] font-semibold text-ok">
                        {t('road.milestone')} · {L(m.title)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ol>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-[14px] font-bold">{L(['Roadmap finished — what next?', 'रोडमैप पूरा — आगे क्या?'])}</h2>
            <p className="muted mt-1 text-[12px]">{L(['Keep the momentum with applications and interviews.', 'आवेदन और इंटरव्यू से गति बनाए रखें।'])}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" to="/app/resume" iconRight={ArrowRight}>{t('nav.resume')}</Button>
            <Button size="sm" variant="ghost" to="/app/interview">{t('nav.interview')}</Button>
            <Button size="sm" variant="ghost" to="/app/jobs">{t('nav.jobs')}</Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DemoTag />
          <Link to="/app/privacy" className="muted text-[10.5px] hover:text-brand">{t('trust.title')}</Link>
        </div>
      </Card>
    </div>
  );
}
