import { useEffect, useMemo, useState } from 'react';
import {
  GraduationCap, Search, X, Check, Clock, BookOpen, Filter, ArrowRight, Trash2, Loader2, Award, ExternalLink,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import {
  PageHeader, Card, Badge, Button, Chip, Input, Select, Switch, Segmented, Meter,
  EmptyState, CardSkeleton, DemoTag,
} from '../../components/ui/primitives';
import { CourseCard, NeedsProfile, DemoNotice, EmptyResults } from '../../components/app/parts';
import { getCatalog, filterCourses, planSummary } from '../../services/courseService';
import { SKILL_BY_ID } from '../../data/catalog';
import { cn, useRevealGroup } from '../../lib/utils';

const SORTS = [
  { value: 'recommended', label: ['Recommended', 'सुझाया गया'] },
  { value: 'free', label: ['Free first', 'मुफ़्त पहले'] },
  { value: 'short', label: ['Shortest', 'सबसे छोटा'] },
  { value: 'hours', label: ['Most hours', 'सबसे अधिक घंटे'] },
];

const GOVERNMENT_COURSE_PORTALS = [
  { name: 'SWAYAM', url: 'https://swayam.gov.in/explorer', detail: 'Ministry of Education' },
  { name: 'NPTEL', url: 'https://nptel.ac.in/', detail: 'IITs / IISc' },
  { name: 'DIKSHA', url: 'https://diksha.gov.in/explore', detail: 'MoE / NCERT' },
  { name: 'Skill India Digital', url: 'https://www.skillindiadigital.gov.in/', detail: 'MSDE' },
  { name: 'NIELIT', url: 'https://student.nielit.gov.in/', detail: 'MeitY' },
];

export default function Courses() {
  const { t, L } = useI18n();
  const { derived, profile, gaps, courses, progress, toggleCourse, completeCourse } = useApp();

  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [skill, setSkill] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [duration, setDuration] = useState('all');
  const [freeOnly, setFreeOnly] = useState(false);
  const [certOnly, setCertOnly] = useState(false);
  const [sort, setSort] = useState('recommended');

  const gridRef = useRevealGroup([catalog, q, skill, difficulty, duration, freeOnly, certOnly, sort]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getCatalog({ simulate: true, profile })
      .then((list) => { if (alive) setCatalog(list); })
      .catch((e) => { if (alive) setError(String(e?.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [profile]);

  const ranked = useMemo(() => {
    if (!catalog) return [];
    const byId = Object.fromEntries(courses.map((c) => [c.course.id, c]));
    const entries = catalog.map((c) => byId[c.id] || { course: c, score: null, covered: [], saved: (progress.savedCourses || []).some((s) => s.id === c.id) });
    const filtered = filterCourses(entries, { skill, difficulty, duration, freeOnly, certOnly, q });
    const sorted = [...filtered];
    if (sort === 'free') sorted.sort((a, b) => Number(b.course.free) - Number(a.course.free) || (b.score || 0) - (a.score || 0));
    if (sort === 'short') sorted.sort((a, b) => a.course.weeks - b.course.weeks);
    if (sort === 'hours') sorted.sort((a, b) => b.course.hrs - a.course.hrs);
    if (sort === 'recommended') sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
    return sorted;
  }, [catalog, courses, progress.savedCourses, skill, difficulty, duration, freeOnly, certOnly, q, sort]);

  const plan = useMemo(() => planSummary(progress.savedCourses || [], derived?.skillMap || {}), [progress.savedCourses, derived]);
  const skillOptions = useMemo(() => {
    const ids = [...new Set((catalog || []).flatMap((c) => c.skills))];
    return ids.map((id) => ({ id, label: SKILL_BY_ID[id]?.n || [id, id] })).sort((a, b) => a.label[0].localeCompare(b.label[0]));
  }, [catalog]);

  if (!derived || !profile) return <NeedsProfile />;

  const activeFilters = [skill !== 'all', difficulty !== 'all', duration !== 'all', freeOnly, certOnly, !!q].filter(Boolean).length;
  const clearAll = () => { setQ(''); setSkill('all'); setDifficulty('all'); setDuration('all'); setFreeOnly(false); setCertOnly(false); };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><GraduationCap className="h-3 w-3" aria-hidden />{t('nav.courses')}</>}
        title={t('course.title')}
        sub={t('course.sub')}
        tags={[
          <Badge key="n" tone="muted">{catalog ? `${catalog.length} ${t('common.results')}` : t('common.loading')}</Badge>,
          <DemoTag key="d" />,
        ]}
        actions={<Button size="sm" variant="ghost" to="/app/skill-gap" iconRight={ArrowRight}>{t('nav.skillgap')}</Button>}
      />

      <DemoNotice>{t('course.providerNote')}</DemoNotice>

      <Card className="p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-[14px] font-bold">{L(['Government learning portals', 'सरकारी लर्निंग पोर्टल'])}</h2>
            <p className="muted mt-0.5 text-[11px]">{L(['Browse current courses and enroll on the official provider site.', 'मौजूदा कोर्स देखें और आधिकारिक पोर्टल पर नामांकन करें।'])}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {GOVERNMENT_COURSE_PORTALS.map((portal) => (
            <div key={portal.name} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-line bg-surface2/40 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold">{portal.name}</div>
                <div className="muted truncate text-[10px]">{portal.detail}</div>
              </div>
              <a href={portal.url} target="_blank" rel="noreferrer noopener" className="btn btn-ghost btn-sm shrink-0">
                {L(['Enroll', 'नामांकन'])}<ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4">
          {/* filters */}
          <Card className="p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
                <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} aria-label={t('common.search')} />
                {q ? (
                  <button type="button" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink" aria-label={t('common.clear')}>
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>
              <Select value={skill} onChange={(e) => setSkill(e.target.value)} aria-label={t('course.filterSkill')} className="w-auto min-w-[150px]">
                <option value="all">{t('course.filterSkill')}: {t('common.all')}</option>
                {skillOptions.map((s) => <option key={s.id} value={s.id}>{L(s.label)}</option>)}
              </Select>
              <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label={t('course.filterDiff')} className="w-auto min-w-[130px]">
                <option value="all">{t('course.filterDiff')}: {t('common.all')}</option>
                <option value="beginner">{t('common.beginner')}</option>
                <option value="intermediate">{t('common.intermediate')}</option>
                <option value="advanced">{t('common.advanced')}</option>
              </Select>
              <Select value={duration} onChange={(e) => setDuration(e.target.value)} aria-label={t('course.filterDur')} className="w-auto min-w-[130px]">
                <option value="all">{t('course.filterDur')}: {t('common.all')}</option>
                <option value="short">{L(['Under 4 weeks', '4 सप्ताह से कम'])}</option>
                <option value="medium">{L(['4–8 weeks', '4–8 सप्ताह'])}</option>
                <option value="long">{L(['Over 8 weeks', '8 सप्ताह से अधिक'])}</option>
              </Select>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3">
              <Switch id="f-free" checked={freeOnly} onChange={setFreeOnly} label={t('course.filterFree')} />
              <Switch id="f-cert" checked={certOnly} onChange={setCertOnly} label={t('course.filterCert')} />
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Segmented value={sort} onChange={setSort} options={SORTS.map((s) => ({ value: s.value, label: L(s.label) }))} />
                {activeFilters ? (
                  <Button size="sm" variant="quiet" icon={X} onClick={clearAll}>{t('common.clear')} ({activeFilters})</Button>
                ) : null}
              </div>
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="muted text-[12px]">
              {loading ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" aria-hidden />{t('common.loading')}</span>
                : <>{ranked.length} {t('common.results')}{gaps.length ? ` · ${L([`ranked against ${gaps.filter((g) => g.status !== 'met').length} open gaps`, `${gaps.filter((g) => g.status !== 'met').length} खुले गैप के अनुसार रैंक`])}` : ''}</>}
            </p>
            {skill !== 'all' && gaps.some((g) => g.id === skill) ? (
              <Chip className="border-brand/30 bg-brand/10 text-brand"><Filter className="h-3 w-3" aria-hidden />{L(['Filtered to a gap skill', 'गैप कौशल पर फ़िल्टर'])}</Chip>
            ) : null}
          </div>

          {error ? (
            <EmptyState
              icon={X}
              title={t('err.generic')}
              body={error}
              action={<Button size="sm" onClick={() => window.location.reload()}>{t('common.tryAgain')}</Button>}
            />
          ) : loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} lines={5} />)}
            </div>
          ) : ranked.length ? (
            <div ref={gridRef} className="grid gap-4 sm:grid-cols-2">
              {ranked.map((entry, i) => (
                <CourseCard
                  key={entry.course.id}
                  entry={entry}
                  index={i}
                  onSave={(id) => toggleCourse(id)}
                  onComplete={(id) => completeCourse(id)}
                />
              ))}
            </div>
          ) : (
            <EmptyResults title={t('course.empty')} body={t('job.emptyHint')} onClear={clearAll} clearLabel={t('job.clearFilters')} />
          )}
        </div>

        {/* learning plan */}
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-[15px] font-bold">{t('course.myPlan')}</h2>
              <Badge tone="brand">{plan.count}</Badge>
            </div>

            {plan.count ? (
              <>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    { k: t('common.weeks'), v: plan.totalWeeks },
                    { k: t('common.hours'), v: plan.totalHours },
                    { k: t('common.completed'), v: plan.done },
                  ].map((x) => (
                    <div key={x.k} className="rounded-xl border border-line bg-surface2/50 p-2">
                      <div className="font-display text-base font-bold tabular-nums">{x.v}</div>
                      <div className="muted text-[10px] font-semibold uppercase tracking-wider">{x.k}</div>
                    </div>
                  ))}
                </div>
                <Meter className="mt-3" value={plan.count ? (plan.done / plan.count) * 100 : 0} size="sm" tone="ok"
                  label={L(['Plan completion', 'योजना पूर्णता'])} right={`${plan.done}/${plan.count}`} />

                <ul className="mt-3 space-y-2">
                  {(progress.savedCourses || []).map((sc) => {
                    const c = (catalog || []).find((x) => x.id === sc.id);
                    if (!c) return null;
                    return (
                      <li key={sc.id} className={cn('rounded-xl border p-2.5', sc.done ? 'border-ok/30 bg-ok/[0.06]' : 'border-line bg-surface2/40')}>
                        <div className="flex items-start gap-2">
                          <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border', sc.done ? 'border-ok bg-ok text-white' : 'border-line bg-surface')} aria-hidden>
                            {sc.done ? <Check className="h-2.5 w-2.5" /> : null}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className={cn('text-[12px] font-semibold leading-snug', sc.done && 'text-muted line-through')}>{L(c.t)}</div>
                            <div className="muted mt-0.5 text-[10.5px]">{c.weeks} {t('common.weeks')} · {c.hrs}h {c.cert ? `· ${t('common.certificate')}` : ''}</div>
                          </div>
                          <button type="button" onClick={() => toggleCourse(sc.id)} className="shrink-0 rounded p-1 text-muted transition hover:text-bad" aria-label={L(['Remove from plan', 'योजना से हटाएँ'])}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                        {!sc.done ? (
                          <Button size="sm" variant="quiet" className="mt-2 w-full" icon={Check} onClick={() => completeCourse(sc.id)}>
                            {t('common.markDone')}
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <EmptyState
                className="mt-2"
                icon={BookOpen}
                title={L(['Your plan is empty', 'आपकी योजना खाली है'])}
                body={L(['Save a course and it appears here with total weeks and hours.', 'कोर्स सेव करें और वह कुल सप्ताह व घंटों के साथ यहाँ दिखेगा।'])}
              />
            )}
          </Card>

          <Card>
            <h2 className="font-display text-[14px] font-bold">{L(['Completing a course', 'कोर्स पूरा करना'])}</h2>
            <p className="muted mt-1.5 text-[12px] leading-relaxed">
              {L(['Marking a course complete records your own progress and raises the skill levels it teaches, which updates your gap analysis, roadmap and readiness score.',
                'कोर्स पूर्ण चिह्नित करने पर आपकी स्वयं की प्रगति दर्ज होती है और उस कोर्स के कौशल स्तर बढ़ते हैं, जिससे गैप विश्लेषण, रोडमैप और रेडीनेस स्कोर अपडेट होते हैं।'])}
            </p>
            <ul className="mt-3 space-y-1.5">
              {plan.skills.slice(0, 6).map((s) => (
                <li key={s} className="flex items-center gap-2 text-[11.5px]">
                  <Award className="h-3 w-3 shrink-0 text-brand" aria-hidden />
                  <span className="truncate">{L(SKILL_BY_ID[s]?.n || [s, s])}</span>
                  <span className="muted ml-auto shrink-0 text-[10.5px]">{L([`level ${Math.round(((derived.skillMap[s] || 0) / 4) * 100)}%`, `स्तर ${Math.round(((derived.skillMap[s] || 0) / 4) * 100)}%`])}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
              <Clock className="h-3.5 w-3.5 text-muted" aria-hidden />
              <span className="muted text-[10.5px]">{t('common.methodNote')}</span>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
