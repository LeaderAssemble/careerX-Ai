import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Flame, ArrowRight, Target, TrendingUp, TrendingDown, Minus, Compass, FileText,
  Mic, BookOpen, Map, Briefcase, Landmark, FlaskConical, Rocket, RotateCw, Check,
  Clock, CheckCircle2, Users, Zap, Trophy, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import {
  PageHeader, Card, Badge, Button, Stat, Meter, Chip, ProgressRing, DemoTag, EmptyState,
} from '../../components/ui/primitives';
import { SkillDNA, TrendChart } from '../../components/ui/Charts';
import { IsoBarChart, IsoLineRibbon, HoloTile } from '../../components/ui/Charts3D';
import { NextBestAction, NeedsProfile, DemoNotice, CAREER_ICONS, MatchBadge } from '../../components/app/parts';
import { readinessExplanation } from '../../services/scoreService';
import { nextBadgeProgress } from '../../services/achievementService';
import { opportunityApplyUrl, rankOpportunities } from '../../services/jobService';
import { OPPORTUNITIES } from '../../data/opportunities';
import { BADGES } from '../../data/badges';
import { SKILL_BY_ID } from '../../data/catalog';
import { COURSES } from '../../data/courses';

const COURSE_LOOKUP = Object.fromEntries(COURSES.map((c) => [c.id, c]));
import { cn, relativeTime } from '../../lib/utils';

const QUICK_ACTIONS = [
  { to: '/app/ai-career', label: 'nav.aiCareer', icon: Sparkles, tone: 'brand' },
  { to: '/app/roadmap', label: 'nav.roadmap', icon: Map, tone: 'accent' },
  { to: '/app/skill-gap', label: 'nav.skillgap', icon: Target, tone: 'warn' },
  { to: '/app/courses', label: 'nav.courses', icon: BookOpen, tone: 'brand' },
  { to: '/app/resume', label: 'nav.resume', icon: FileText, tone: 'ok' },
  { to: '/app/interview', label: 'nav.interview', icon: Mic, tone: 'accent' },
  { to: '/app/project-lab', label: 'nav.lab', icon: FlaskConical, tone: 'brand' },
  { to: '/app/jobs', label: 'nav.jobs', icon: Briefcase, tone: 'ok' },
];

export default function Dashboard() {
  const { t, L, d, lang } = useI18n();
  const {
    derived, matches, activeCareer, gaps, roadmap, roadmapStats, nextAction, challenge,
    badgeSnapshot, progress, profile, user, rebuildIntelligence, toggleTask, toast,
  } = useApp();

  const rankedOpportunities = useMemo(() => {
    if (!derived) return [];
    return rankOpportunities(OPPORTUNITIES, { skillMap: derived.skillMap, profile, derived }).slice(0, 3);
  }, [derived, profile]);

  if (!derived || !profile) {
    return <NeedsProfile onAction actionLabel={t('dash.finishOnboarding')} />;
  }

  const readiness = derived.readiness;
  const employability = derived.employability;
  const history = (progress.readinessHistory || []).filter((h) => typeof h.score === 'number');
  const trend = history.map((h) => ({ label: d(h.at, { day: 'numeric', month: 'short' }), value: h.score }));
  const delta = trend.length >= 2 ? trend[trend.length - 1].value - trend[trend.length - 2].value : null;
  const topGap = gaps.find((g) => g.status !== 'met') || null;
  const earnedBadges = Object.keys(progress.badges || {}).length;
  const nextBadge = badgeSnapshot ? nextBadgeProgress(badgeSnapshot) : null;
  const weakestPart = Object.entries(readiness.parts).sort((a, b) => a[1].value - b[1].value)[0];
  const currentMonth = (roadmap?.months || []).find((m) => m.tasks.some((x) => !x.done)) || roadmap?.months?.[0] || null;
  const explanation = readinessExplanation({ parts: readiness.parts, skillMap: derived.skillMap, targetCareerId: derived.targetCareerId, lang });

  const employabilityBand = employability.score >= 75
    ? L(['Strong — interview-ready signal', 'मज़बूत — इंटरव्यू-तैयार संकेत'])
    : employability.score >= 55
      ? L(['Developing — close the top gaps', 'विकास हो रहा है — मुख्य गैप भरें'])
      : L(['Early stage — build fundamentals', 'शुरुआती चरण — बुनियाद बनाएँ']);

  const DeltaIcon = delta == null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><Flame className="h-3 w-3 text-warn" aria-hidden />{progress.streak?.count || 0} {t('dash.streak')}</>}
        title={t('dash.welcome', { name: (user?.name || profile.personal?.name || '').split(' ')[0] })}
        sub={t('dash.welcomeSub')}
        tags={[
          activeCareer ? <Badge key="c" tone="brand" icon={Target}>{L(activeCareer.n)}</Badge> : <Badge key="c" tone="warn">{t('career.noMatch')}</Badge>,
          <Badge key="r" tone={readiness.score >= 70 ? 'ok' : readiness.score >= 45 ? 'brand' : 'warn'}>{t('dash.readiness')} · {readiness.score}/100</Badge>,
          <Badge key="p" tone="muted">{t('dash.profileCompletion')} · {derived.completion}%</Badge>,
        ]}
        actions={
          <>
            <Button size="sm" variant="ghost" icon={RotateCw} onClick={() => { rebuildIntelligence(); toast({ title: ['Intelligence rebuilt', 'इंटेलिजेंस फिर बनाई गई'], body: ['Scores, gaps and roadmap recalculated from your latest profile.', 'आपकी नवीनतम प्रोफ़ाइल से स्कोर, गैप और रोडमैप दोबारा गिने गए।'] }); }}>
              {t('career.regenerate')}
            </Button>
            <Button size="sm" to="/app/roadmap" iconRight={ArrowRight}>{t('dash.continueRoadmap')}</Button>
          </>
        }
      />

      {/* headline scores */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('dash.readiness')} value={`${readiness.score}/100`} icon={Sparkles} tone="brand" to="/app/ai-career"
          sub={L(['Weighted from 6 measurable areas', '6 मापने योग्य क्षेत्रों से भारित'])} />
        <Stat label={t('dash.employability')} value={`${employability.score}/100`} icon={Zap} tone="accent" to="/app/skill-gap" sub={employabilityBand} />
        <Stat label={t('dash.resumeScore')} value={`${derived.resume.score}/100`} icon={FileText} tone="ok" to="/app/resume"
          sub={derived.resume.ats ? `${t('res.ats')} ${Math.round(derived.resume.ats)}%` : L(['Build your first resume', 'अपना पहला रिज़्यूमे बनाएँ'])} />
        <Stat label={t('dash.interviewScore')} value={derived.interview.attempts ? `${derived.interview.score}/100` : '—'} icon={Mic} tone="warn" to="/app/interview"
          sub={derived.interview.attempts ? L([`${derived.interview.attempts} attempt(s) · best ${derived.interview.best}`, `${derived.interview.attempts} प्रयास · सर्वोत्तम ${derived.interview.best}`]) : t('int.noHistory')} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* ------------------------------- left column ------------------------------- */}
        <div className="space-y-5">
          <NextBestAction action={nextAction} />

          {/* Career Command Center */}
          <Card grad className="relative overflow-hidden">
            <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-brand/10 blur-3xl" aria-hidden />
            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="eyebrow"><Sparkles className="h-3 w-3" aria-hidden />{t('dash.commandCenter')}</span>
                  <p className="muted mt-1.5 text-[12.5px] leading-snug">{t('dash.commandCenterSub')}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <CommandTile
                  icon={Target} tone="brand"
                  title={L(['Focus area this week', 'इस सप्ताह का फ़ोकस'])}
                  value={topGap ? L(topGap.skill.n) : L(['Maintain your strengths', 'अपनी मज़बूती बनाए रखें'])}
                  body={topGap
                    ? L([`Level ${Math.round((topGap.current / 4) * 100)}% · needs about ${topGap.hours} focused hours`, `स्तर ${Math.round((topGap.current / 4) * 100)}% · लगभग ${topGap.hours} घंटे की मेहनत`])
                    : L(['No open gaps for your target career.', 'आपके लक्षित करियर के लिए कोई खुला गैप नहीं।'])}
                  to="/app/skill-gap"
                />
                <CommandTile
                  icon={DeltaIcon} tone={delta == null ? 'muted' : delta > 0 ? 'ok' : 'bad'}
                  title={L(['Momentum', 'गति'])}
                  value={delta == null ? L(['Not enough checkpoints yet', 'अभी पर्याप्त चेकपॉइंट नहीं']) : `${delta > 0 ? '+' : ''}${delta} ${L(['points', 'अंक'])}`}
                  body={L([`Readiness moved across ${trend.length} checkpoints. Streak: ${progress.streak?.count || 0} day(s).`, `${trend.length} चेकपॉइंट में रेडीनेस बदली। लगातार: ${progress.streak?.count || 0} दिन।`])}
                  to="/app/achievements"
                />
                <CommandTile
                  icon={weakestPart ? Compass : Compass} tone="warn"
                  title={L(['Weakest component', 'सबसे कमज़ोर घटक'])}
                  value={weakestPart ? L(weakestPart[1].n) : '—'}
                  body={weakestPart ? L([`${weakestPart[1].value}/100 · weighted ${Math.round(weakestPart[1].weight * 100)}% of your readiness score`, `${weakestPart[1].value}/100 · आपके रेडीनेस स्कोर का ${Math.round(weakestPart[1].weight * 100)}%`]) : ''}
                  to="/app/ai-career"
                />
                <CommandTile
                  icon={Briefcase} tone="ok"
                  title={L(['Pipeline', 'पाइपलाइन'])}
                  value={L([`${(progress.applications || []).length} applications`, `${(progress.applications || []).length} आवेदन`])}
                  body={L([`${rankedOpportunities.filter((o) => o.match >= 60).length} of the top matches are 60%+ for you right now.`, `शीर्ष मैच में से ${rankedOpportunities.filter((o) => o.match >= 60).length} अभी आपके लिए 60%+ हैं।`])}
                  to="/app/jobs"
                />
              </div>

              <p className="muted mt-4 border-t border-line pt-3 text-[11px] leading-relaxed">{t('common.methodNote')}</p>
            </div>
          </Card>

          {/* readiness breakdown */}
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-[15px] font-bold">{t('dash.readiness')}</h2>
                <p className="muted mt-1 text-[12px] leading-snug">{L(['Exactly how the number is built — weights are fixed and visible.', 'यह संख्या कैसे बनती है — भार निश्चित और दिखने योग्य हैं।'])}</p>
              </div>
              <div className="flex items-center gap-2">
                <ProgressRing value={readiness.score} size={54} stroke={5.5} tone={readiness.score >= 70 ? 'ok' : readiness.score >= 45 ? 'brand' : 'warn'} />
              </div>
            </div>
            <ul className="mt-4 space-y-3">
              {Object.entries(readiness.parts).map(([k, p]) => (
                <li key={k}>
                  <Meter
                    value={p.value} size="sm"
                    label={L(p.n)}
                    right={`${p.value}/100 · ${Math.round(p.weight * 100)}%`}
                    tone={p.value >= 70 ? 'ok' : p.value >= 45 ? 'brand' : 'warn'}
                  />
                </li>
              ))}
            </ul>
            <DemoNotice className="mt-4" tone="brand" icon={Sparkles}>{explanation}</DemoNotice>
          </Card>

          {/* charts */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <h2 className="font-display text-[15px] font-bold">{L(['Your Skill DNA', 'आपका स्किल DNA'])}</h2>
              <p className="muted mt-1 text-[12px]">{L(['Seven capability axes computed from your profile, projects and interviews.', 'आपकी प्रोफ़ाइल, प्रोजेक्ट और इंटरव्यू से गिने गए सात क्षमता अक्ष।'])}</p>
              <SkillDNA data={derived.dna} height={288} className="mt-2" />
              <DemoTag className="mt-1" />
            </Card>
            <Card>
              <h2 className="font-display text-[15px] font-bold">{t('dash.progress')}</h2>
              <p className="muted mt-1 text-[12px]">{t('dash.progressSub')}</p>
              {trend.length >= 2 ? (
                <TrendChart data={trend} height={288} className="mt-2" series={[{ key: 'value', name: t('dash.readiness'), color: 'brand' }]} />
              ) : (
                <EmptyState
                  className="mt-4"
                  icon={TrendingUp}
                  title={L(['Trend starts after two checkpoints', 'ट्रेंड दो चेकपॉइंट के बाद शुरू होता है'])}
                  body={L(['Your readiness score is recorded once per active day. Keep working on tasks and the curve builds itself.', 'आपका रेडीनेस स्कोर हर सक्रिय दिन एक बार दर्ज होता है। कार्यों पर काम करते रहें, ग्राफ़ स्वयं बनेगा।'])}
                />
              )}
            </Card>
          </div>

          {/* 3D results board (isometric, PowerBI-style) */}
          <Card className="relative overflow-hidden">
            <span className="scanline" aria-hidden />
            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-[15px] font-bold">{L(['Results — 3D view', 'परिणाम — 3D दृश्य'])}</h2>
                  <p className="muted mt-0.5 text-[12px]">{L(['Readiness components and your score climb, rendered as isometric charts.', 'रेडीनेस घटक और स्कोर की चढ़ाई — आइसोमेट्रिक चार्ट के रूप में।'])}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <HoloTile label={t('dash.readiness')} value={`${readiness.score}/100`} icon={TrendingUp}
                  tone={delta != null && delta >= 0 ? 'ok' : 'brand'}
                  sub={delta != null ? `${delta >= 0 ? '+' : ''}${delta} ${L(['since last checkpoint', 'पिछले चेकपॉइंट से'])}` : L(['First checkpoint today', 'आज पहला चेकपॉइंट'])} />
                <HoloTile label={L(['Employability', 'रोज़गार-योग्यता'])} value={`${employability.score}/100`} icon={Sparkles} tone="accent" sub={employabilityBand} />
                <HoloTile label={L(['Weakest component', 'कमज़ोरतम घटक'])} value={`${weakestPart ? weakestPart[1].value : 0}`} icon={AlertTriangle} tone="warn"
                  sub={weakestPart ? L(weakestPart[1].n) : '—'} />
                <HoloTile label={L(['Badges earned', 'अर्जित बैज'])} value={earnedBadges} icon={Trophy} sub={nextBadge?.badge ? `${L(nextBadge.badge.n)} · ${Math.round((nextBadge.ratio || 0) * 100)}%` : L(['Keep building', 'बनाते रहें'])} />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="muted mb-1 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Readiness components (0–100)', 'रेडीनेस घटक (0–100)'])}</div>
                  <IsoBarChart
                    height={230} max={100} depth={13}
                    data={Object.entries(readiness.parts).map(([k, pt], i) => ({
                      label: L(pt.n), value: pt.value, color: ['brand', 'accent', 'ok', 'warn', 'brand2', 'text'][i % 6],
                    }))}
                  />
                </div>
                <div>
                  <div className="muted mb-1 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Readiness climb', 'रेडीनेस चढ़ाई'])}</div>
                  {trend.length >= 2 ? (
                    <IsoLineRibbon data={trend} height={230} color="ok" />
                  ) : (
                    <div className="grid h-[230px] place-items-center rounded-xl border border-dashed border-line bg-surface2/30 p-4 text-center">
                      <p className="muted max-w-[280px] text-[11.5px] leading-relaxed">{L(['The 3D trend appears after two daily checkpoints — your score is recorded once per active day.', '3D ट्रेंड दो दैनिक चेकपॉइंट के बाद दिखेगा — स्कोर हर सक्रिय दिन एक बार दर्ज होता है।'])}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* roadmap snapshot */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-[15px] font-bold">{t('dash.currentRoadmap')}</h2>
                <p className="muted mt-1 text-[12px]">
                  {roadmapStats.total ? t('road.tasksDone', { n: roadmapStats.done, m: roadmapStats.total }) : L(['No roadmap yet — set a target career.', 'अभी रोडमैप नहीं — लक्षित करियर चुनें।'])}
                </p>
              </div>
              <Button size="sm" variant="ghost" to="/app/roadmap" iconRight={ArrowRight}>{t('common.viewAll')}</Button>
            </div>

            {roadmapStats.total ? <Meter value={roadmapStats.pct} className="mt-3" size="sm" right={`${roadmapStats.pct}%`} /> : null}

            {currentMonth ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone="brand">{t('road.month')} {currentMonth.order || currentMonth.index}</Badge>
                  <span className="font-display text-[13px] font-bold">{L(currentMonth.title)}</span>
                </div>
                <p className="muted text-[12px] leading-snug">{L(currentMonth.focus)}</p>
                <ul className="mt-3 space-y-1.5">
                  {currentMonth.tasks.map((task) => (
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
                              {task.skills.map((s) => <Chip key={s} className="px-1.5 py-0 text-[9.5px]">{L(SKILL_BY_ID[s]?.n || [s, s])}</Chip>)}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState
                className="mt-4" icon={Map}
                title={t('road.noTarget')}
                body={L(['Pick a target career and CareerX generates a six-month plan ordered by your gaps.', 'लक्षित करियर चुनें और CareerX आपके गैप के अनुसार छह महीने की योजना बनाएगा।'])}
                action={<Button size="sm" to="/app/ai-career" iconRight={ArrowRight}>{t('career.setTarget')}</Button>}
              />
            )}
          </Card>

          {/* quick actions */}
          <Card>
            <h2 className="font-display text-[15px] font-bold">{t('dash.quickActions')}</h2>
            <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.to} to={a.to}
                  className="group flex flex-col items-start gap-2 rounded-xl border border-line bg-surface2/40 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:bg-surface2 hover:shadow-lift"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-brand/25 bg-brand/10 text-brand transition group-hover:scale-110">
                    <a.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="text-[11.5px] font-semibold leading-tight">{t(a.label)}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* ------------------------------- right column ------------------------------- */}
        <div className="space-y-5">
          {/* top matches */}
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-[15px] font-bold">{t('career.matches')}</h2>
              <Link to="/app/ai-career" className="muted text-[11px] font-semibold hover:text-brand">{t('common.viewAll')}</Link>
            </div>
            <ul className="mt-3 space-y-2">
              {(matches || []).slice(0, 4).map((m) => {
                const Icon = CAREER_ICONS[m.career.icon] || Briefcase;
                const isTarget = derived.targetCareerId === m.career.id;
                return (
                  <li key={m.career.id}>
                    <Link to="/app/ai-career" className="flex items-center gap-2.5 rounded-xl border border-line bg-surface2/40 p-2.5 transition hover:border-brand/40 hover:bg-surface2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-brand/25 bg-brand/10 text-brand"><Icon className="h-3.5 w-3.5" aria-hidden /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold">{L(m.career.n)}</span>
                        <span className="muted mt-1 block"><Meter value={m.match} size="xs" showTrack /></span>
                      </span>
                      <span className="shrink-0 text-right">
                        <MatchBadge value={m.match} size="lg" />
                        {isTarget ? <span className="muted mt-1 block text-[9px] font-bold uppercase tracking-wider text-ok">{t('career.isTarget')}</span> : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="muted mt-3 text-[10.5px] leading-relaxed">{t('career.matchLabel')}</p>
          </Card>

          {/* priority gaps */}
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-[15px] font-bold">{t('dash.skillGap')}</h2>
              <Link to="/app/skill-gap" className="muted text-[11px] font-semibold hover:text-brand">{t('common.viewAll')}</Link>
            </div>
            {topGap ? (
              <>
                <ul className="mt-3 space-y-2.5">
                  {gaps.filter((g) => g.status !== 'met').slice(0, 4).map((g) => (
                    <li key={g.id} className="rounded-xl border border-line bg-surface2/40 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[12.5px] font-semibold">{L(g.skill.n)}</span>
                        <span className="muted shrink-0 inline-flex items-center gap-1 text-[10.5px]"><Clock className="h-3 w-3" aria-hidden />{g.hours}h</span>
                      </div>
                      <Meter className="mt-1.5" value={(g.current / g.required) * 100} size="xs" tone={g.status === 'partial' ? 'warn' : 'bad'}
                        right={`${Math.round((g.current / 4) * 100)}% → ${Math.round((g.required / 4) * 100)}%`} />
                    </li>
                  ))}
                </ul>
                <Button size="sm" variant="ghost" className="mt-3 w-full" to="/app/courses" iconRight={ArrowRight}>{t('dash.closeGaps')}</Button>
              </>
            ) : (
              <EmptyState className="mt-3" icon={CheckCircle2} title={t('gap.allGood')} body={L(['Every required skill meets the expected level for your target career.', 'आपके लक्षित करियर के सभी आवश्यक कौशल अपेक्षित स्तर पर हैं।'])} />
            )}
          </Card>

          {/* opportunities */}
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-[15px] font-bold">{t('dash.recommendedOpp')}</h2>
              <Link to="/app/jobs" className="muted text-[11px] font-semibold hover:text-brand">{t('common.viewAll')}</Link>
            </div>
            <ul className="mt-3 space-y-2">
              {rankedOpportunities.map((o) => (
                <li key={o.id} className="rounded-xl border border-line bg-surface2/40 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-semibold">{L(o.t)}</div>
                      <div className="muted truncate text-[11px]">{L(o.co)} · {L(o.loc)}</div>
                    </div>
                    <MatchBadge value={o.match} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone={o.type === 'internship' ? 'accent' : 'brand'}>{o.type === 'internship' ? t('nav.internships') : t('nav.jobs')}</Badge>
                    <a href={opportunityApplyUrl(o)} target="_blank" rel="noreferrer noopener" className="btn btn-ghost btn-sm">
                      {t('job.applyNow')}<ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="muted text-[10px]">{L(['Listings open on external portals; confirm details before applying.', 'लिस्टिंग बाहरी पोर्टल पर खुलेगी; आवेदन से पहले विवरण जाँचें।'])}</span>
            </div>
          </Card>

          {/* challenge */}
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-[15px] font-bold">{t('nav.challenge')}</h2>
              <Link to="/app/challenge" className="muted text-[11px] font-semibold hover:text-brand">{t('common.viewAll')}</Link>
            </div>
            {challenge ? (
              <>
                <ChallengeMini challenge={challenge} progress={progress} />
                <Button size="sm" variant="ghost" className="mt-3 w-full" to="/app/challenge" iconRight={ArrowRight}>{L(['Open challenge', 'चुनौती खोलें'])}</Button>
              </>
            ) : (
              <>
                <p className="muted mt-2 text-[12px] leading-relaxed">{t('ch.sub')}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone="brand">{t('ch.d30')}</Badge><Badge tone="accent">{t('ch.d60')}</Badge><Badge tone="ok">{t('ch.d90')}</Badge>
                </div>
                <Button size="sm" className="mt-3.5 w-full" icon={Rocket} to="/app/challenge">{t('ch.startChallenge')}</Button>
              </>
            )}
          </Card>

          {/* achievements */}
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-[15px] font-bold">{t('nav.achievements')}</h2>
              <Link to="/app/achievements" className="muted text-[11px] font-semibold hover:text-brand">{t('common.viewAll')}</Link>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <ProgressRing value={(earnedBadges / BADGES.length) * 100} size={62} stroke={6} tone="ok" />
              <div className="min-w-0">
                <div className="font-display text-lg font-bold tabular-nums">{earnedBadges}<span className="muted text-xs font-semibold"> / {BADGES.length}</span></div>
                <div className="muted text-[11.5px]">{t('ach.earned', { n: earnedBadges, m: BADGES.length })}</div>
              </div>
            </div>
            {nextBadge?.badge ? (
              <div className="mt-3 rounded-xl border border-line bg-surface2/40 p-2.5">
                <div className="flex items-center gap-2">
                  <span aria-hidden className="text-base">{nextBadge.badge.emoji}</span>
                  <span className="truncate text-[12px] font-semibold">{L(nextBadge.badge.n)}</span>
                  <span className="muted ml-auto text-[10.5px] font-bold tabular-nums">{Math.round(nextBadge.ratio * 100)}%</span>
                </div>
                <Meter className="mt-1.5" value={nextBadge.ratio * 100} size="xs" tone="ok" />
                <p className="muted mt-1.5 text-[10.5px] leading-snug">{t('ach.howTo')}: {L(nextBadge.badge.how)}</p>
              </div>
            ) : null}
          </Card>

          {/* learning plan */}
          <Card>
            <h2 className="font-display text-[15px] font-bold">{t('course.myPlan')}</h2>
            {(progress.savedCourses || []).length ? (
              <ul className="mt-3 space-y-1.5">
                {progress.savedCourses.slice(0, 3).map((sc) => {
                  const c = COURSE_LOOKUP[sc.id];
                  return (
                    <li key={sc.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface2/40 p-2">
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium">{c ? L(c.t) : sc.id}</span>
                      {sc.done ? <Badge tone="ok">{t('common.completed')}</Badge> : <span className="muted text-[10px]">{relativeTime(sc.at, lang === 'hi' ? 'hi-IN' : 'en-IN')}</span>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted mt-2 text-[12px] leading-relaxed">{L(['Save a course from the recommendations and it appears here.', 'सुझावों से एक कोर्स सेव करें और वह यहाँ दिखेगा।'])}</p>
            )}
            <Button size="sm" variant="ghost" className="mt-3 w-full" to="/app/courses" iconRight={ArrowRight}>{t('nav.courses')}</Button>
          </Card>

          {/* government hub teaser */}
          <Card>
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent"><Landmark className="h-4 w-4" aria-hidden /></span>
              <div className="min-w-0">
                <h2 className="font-display text-[13.5px] font-bold">{t('nav.gov')}</h2>
                <p className="muted mt-1 text-[11.5px] leading-snug">{t('gov.sub')}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge tone="muted">{(progress.trackedGov || []).length} {L(['tracked', 'ट्रैक किए'])}</Badge>
                  <Button size="sm" variant="quiet" to="/app/government">{L(['Explore', 'देखें'])}</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* employability components — full transparency */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[15px] font-bold">{t('dash.employability')}</h2>
            <p className="muted mt-1 text-[12px]">{L(['Six weighted components, all visible. Nothing is hidden behind a black box.', 'छह भारित घटक, सभी दृश्यमान। कुछ भी ब्लैक बॉक्स में छिपा नहीं।'])}</p>
          </div>
          <Badge tone="accent">{employability.score}/100</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {employability.components.map((c) => (
            <div key={c.id} className="rounded-xl border border-line bg-surface2/40 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-semibold">{L(c.n)}</span>
                <span className="font-display text-[13px] font-bold tabular-nums">{c.earned}<span className="muted text-[10.5px] font-semibold">/{c.max}</span></span>
              </div>
              <Meter className="mt-2" value={(c.earned / c.max) * 100} size="xs" tone={c.earned / c.max >= 0.7 ? 'ok' : c.earned / c.max >= 0.4 ? 'brand' : 'warn'} />
              <p className="muted mt-2 text-[10.5px] leading-snug">{L(c.how)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <Users className="h-3.5 w-3.5 text-muted" aria-hidden />
          <span className="muted text-[11px]">{t('common.methodNote')}</span>
          <Button size="sm" variant="quiet" className="ml-auto" to="/app/simulator" iconRight={ArrowRight}>{t('nav.simulator')}</Button>
        </div>
      </Card>
    </div>
  );
}

function CommandTile({ icon: Icon, title, value, body, to, tone = 'brand' }) {
  const tones = { brand: 'border-brand/30 bg-brand/10 text-brand', accent: 'border-accent/30 bg-accent/10 text-accent', ok: 'border-ok/30 bg-ok/10 text-ok', warn: 'border-warn/30 bg-warn/10 text-warn', bad: 'border-bad/30 bg-bad/10 text-bad', muted: 'border-line bg-surface2 text-muted' };
  return (
    <Link to={to} className="group rounded-xl border border-line bg-surface2/50 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:bg-surface2 hover:shadow-lift">
      <div className="flex items-center gap-2">
        <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg border', tones[tone])}><Icon className="h-3.5 w-3.5" aria-hidden /></span>
        <span className="muted truncate text-[10.5px] font-bold uppercase tracking-[0.12em]">{title}</span>
      </div>
      <div className="mt-2 font-display text-[13.5px] font-bold leading-tight">{value}</div>
      {body ? <p className="muted mt-1 text-[11px] leading-snug">{body}</p> : null}
    </Link>
  );
}

function ChallengeMini({ challenge, progress }) {
  const { t, L } = useI18n();
  const done = challenge.done || [];
  const phases = challenge.phases || [];
  const total = phases.length ? phases.reduce((a, p) => a + p.tasks.length, 0) : 19;
  const pct = Math.round((done.length / total) * 100);
  return (
    <>
      <div className="mt-3 flex items-center gap-3">
        <ProgressRing value={pct} size={58} stroke={6} tone="ok" />
        <div className="min-w-0">
          <div className="font-display text-sm font-bold tabular-nums">{done.length}/{total} <span className="muted text-[11px] font-semibold">{t('common.completed')}</span></div>
          <div className="muted mt-0.5 text-[11px]">{L([`Started ${new Date(challenge.startedAt).toLocaleDateString()}`, `शुरू: ${new Date(challenge.startedAt).toLocaleDateString()}`])}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {(phases.length ? phases : [{ id: 'p30', title: [t('ch.d30'), ''] }, { id: 'p60', title: [t('ch.d60'), ''] }, { id: 'p90', title: [t('ch.d90'), ''] }]).map((p) => {
          const tasks = p.tasks || [];
          const doneCount = tasks.filter((x) => done.includes(x.id)).length;
          return (
            <div key={p.id} className="rounded-lg border border-line bg-surface2/50 p-2 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{L(p.title) || p.id}</div>
              <div className="mt-1 font-display text-[13px] font-bold tabular-nums">{tasks.length ? `${doneCount}/${tasks.length}` : '—'}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
