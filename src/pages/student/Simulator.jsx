import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass, Check, Clock, ArrowRight, Trophy, FlaskConical, MessageSquare, Briefcase,
  Target, AlertTriangle, TrendingUp,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import { PageHeader, Card, Badge, Button, Chip, Meter, EmptyState, DemoTag } from '../../components/ui/primitives';
import { BarListChart } from '../../components/ui/Charts';
import { NeedsProfile, DemoNotice, AILabel, CAREER_ICONS } from '../../components/app/parts';
import { simulateCareer } from '../../services/careerService';
import { CAREERS } from '../../data/careers';
import { cn } from '../../lib/utils';

const MAX_PICK = 3;

export default function Simulator() {
  const { t, L } = useI18n();
  const { derived, profile, matches, activeCareer, setTargetCareer, toast } = useApp();
  const [picked, setPicked] = useState(() => {
    const first = derived?.targetCareerId || matches?.[0]?.career?.id;
    const second = (matches || []).map((m) => m.career.id).find((id) => id !== first);
    return [first, second].filter(Boolean);
  });

  const sims = useMemo(() => {
    if (!derived) return [];
    return picked
      .map((id) => CAREERS.find((c) => c.id === id))
      .filter(Boolean)
      .map((career) => simulateCareer(career, derived.skillMap, profile));
  }, [picked, derived, profile]);

  if (!derived || !profile) return <NeedsProfile />;

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_PICK ? p : [...p, id]));

  const best = sims.length
    ? sims.slice().sort((a, b) => (b.fitNow - a.fitNow) * 1.2 + (a.hoursToReady - b.hoursToReady) * 0.6)[0]
    : null;

  const chartFit = sims.map((s) => ({ name: L(s.career.n).slice(0, 22), value: s.fitNow, color: 'brand' }));
  const chartHours = sims.map((s) => ({ name: L(s.career.n).slice(0, 22), value: s.hoursToReady, color: 'accent' }));
  const chartDiff = sims.map((s) => ({ name: L(s.career.n).slice(0, 22), value: s.difficultyIndex, color: 'warn' }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><Compass className="h-3 w-3" aria-hidden />{t('nav.simulator')}</>}
        title={t('sim.title')}
        sub={t('sim.sub')}
        tags={[<AILabel key="ai" />, <Badge key="n" tone="muted">{sims.length}/{MAX_PICK} {t('sim.selectUpTo')}</Badge>]}
        actions={best ? <Button size="sm" variant="ghost" to="/app/roadmap" iconRight={ArrowRight}>{t('nav.roadmap')}</Button> : null}
      />

      <DemoNotice tone="warn" icon={AlertTriangle}>
        {L(['CareerX compares learning effort, current fit and difficulty. It deliberately does not predict salaries or placement chances — those depend on market conditions no model can promise.',
          'CareerX सीखने के प्रयास, वर्तमान फ़िट और कठिनाई की तुलना करता है। यह जानबूझकर वेतन या प्लेसमेंट की संभावना का अनुमान नहीं लगाता — वे बाज़ार स्थितियों पर निर्भर हैं, जिनका कोई मॉडल वादा नहीं कर सकता।'])}
      </DemoNotice>

      {/* picker */}
      <Card>
        <h2 className="font-display text-[15px] font-bold">{t('sim.pick')}</h2>
        <p className="muted mt-1 text-[12px]">{L(['Choose up to three paths. Everything below is computed live from your current skill levels.', 'तीन तक पथ चुनें। नीचे सब कुछ आपके वर्तमान कौशल स्तर से लाइव गिना जाता है।'])}</p>
        <div className="mt-3.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {CAREERS.map((c) => {
            const active = picked.includes(c.id);
            const match = (matches || []).find((m) => m.career.id === c.id)?.match;
            const Icon = CAREER_ICONS[c.icon] || Briefcase;
            return (
              <button key={c.id} type="button" onClick={() => toggle(c.id)} aria-pressed={active}
                disabled={!active && picked.length >= MAX_PICK}
                className={cn('flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all duration-200',
                  active ? 'border-brand/60 bg-brand/10 shadow-glow' : 'border-line bg-surface2/50 hover:border-brand/40',
                  !active && picked.length >= MAX_PICK && 'cursor-not-allowed opacity-50')}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-brand/25 bg-brand/10 text-brand"><Icon className="h-3.5 w-3.5" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[12.5px] font-bold">{L(c.n)}</span>
                    {match ? <span className="muted ml-auto shrink-0 text-[10.5px] font-bold tabular-nums">{match}%</span> : null}
                  </span>
                  <span className="muted mt-0.5 block truncate text-[11px]">{L(c.short)}</span>
                </span>
                {active ? <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </Card>

      {!sims.length ? (
        <EmptyState icon={Compass} title={t('sim.pick')} body={L(['Select at least one career path to see the comparison.', 'तुलना देखने के लिए कम से कम एक करियर पथ चुनें।'])} />
      ) : (
        <>
          {/* headline comparison */}
          <div className="grid gap-4 lg:grid-cols-3">
            {sims.map((s) => {
              const isBest = best?.career.id === s.career.id && sims.length > 1;
              const Icon = CAREER_ICONS[s.career.icon] || Briefcase;
              return (
                <Card key={s.career.id} hover className={cn('relative flex flex-col', isBest && 'grad-border')}>
                  {isBest ? (
                    <span className="absolute -top-2.5 left-4"><Badge tone="ok" icon={Trophy}>{t('sim.bestForYou')}</Badge></span>
                  ) : null}
                  <div className="mt-1 flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand/30 bg-brand/10 text-brand"><Icon className="h-4 w-4" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-[14px] font-bold leading-tight">{L(s.career.n)}</h3>
                      <p className="muted mt-0.5 text-[11.5px] leading-snug">{L(s.career.short)}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="muted text-[10.5px] font-bold uppercase tracking-wider">{L(['Your fit today', 'आज आपका फ़िट'])}</span>
                        <span className="font-display text-sm font-bold tabular-nums">{s.fitNow}%</span>
                      </div>
                      <Meter className="mt-1" value={s.fitNow} size="sm" tone={s.fitNow >= 70 ? 'ok' : s.fitNow >= 45 ? 'brand' : 'warn'} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Metric icon={Clock} label={t('sim.learningDiff')} value={L([`${s.hoursToReady} h`, `${s.hoursToReady} घंटे`])} />
                      <Metric icon={TrendingUp} label={L(['Time to ready', 'तैयार होने का समय'])} value={L([`${s.monthsToReady} mo`, `${s.monthsToReady} माह`])} />
                    </div>
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="muted text-[10.5px] font-bold uppercase tracking-wider">{L(['Difficulty index', 'कठिनाई सूचकांक'])}</span>
                        <span className="font-display text-sm font-bold tabular-nums">{s.difficultyIndex}</span>
                      </div>
                      <Meter className="mt-1" value={s.difficultyIndex} size="sm" tone={s.difficultyIndex > 66 ? 'bad' : s.difficultyIndex > 40 ? 'warn' : 'ok'} />
                      <p className="muted mt-1 text-[10.5px]">{L(s.difficultyLabel)} · {L([`${s.openGaps.length} open gaps`, `${s.openGaps.length} खुले गैप`])}</p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-line pt-3">
                    <div className="muted mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Already strong', 'पहले से मज़बूत'])}</div>
                    <div className="flex flex-wrap gap-1">
                      {s.strengthsNow.length ? s.strengthsNow.slice(0, 6).map((g) => <Chip key={g.id} className="chip-on">{L(g.skill?.n || [g.id, g.id])}</Chip>)
                        : <span className="muted text-[11px]">{L(['None yet', 'अभी कोई नहीं'])}</span>}
                    </div>
                    <div className="muted mt-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Biggest gaps', 'सबसे बड़े गैप'])}</div>
                    <div className="flex flex-wrap gap-1">
                      {s.openGaps.slice(0, 6).map((g) => (
                        <Chip key={g.id} className="border-bad/30 bg-bad/10 text-bad">{L(g.skill?.n || [g.id, g.id])}</Chip>
                      ))}
                      {!s.openGaps.length ? <span className="text-[11px] font-semibold text-ok">{t('gap.allGood', { role: L(s.career.n) })}</span> : null}
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    {derived.targetCareerId === s.career.id
                      ? <Badge tone="ok" icon={Check}>{t('career.isTarget')}</Badge>
                      : <Button size="sm" icon={Target} onClick={() => {
                        setTargetCareer(s.career.id);
                        toast({ title: ['Target career set', 'लक्षित करियर तय हुआ'], body: [`${s.career.n[0]} roadmap generated.`, `${s.career.n[1]} रोडमैप बना।`] });
                      }}>{t('career.setTarget')}</Button>}
                    <Button size="sm" variant="ghost" to="/app/ai-career">{t('common.learnMore')}</Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* charts */}
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title={L(['Current fit', 'वर्तमान फ़िट'])} note={L(['Weighted skill coverage of each path', 'प्रत्येक पथ का भारित कौशल कवरेज'])} data={chartFit} unit="%" />
            <ChartCard title={L(['Hours to become job-ready', 'जॉब-रेडी होने के घंटे'])} note={L(['Sum of estimated hours for every open gap', 'हर खुले गैप के अनुमानित घंटों का योग'])} data={chartHours} unit="h" color="accent" />
            <ChartCard title={L(['Difficulty index', 'कठिनाई सूचकांक'])} note={L([`Path difficulty (1–3) plus open gaps`, `पथ कठिनाई (1–3) और खुले गैप`])} data={chartDiff} unit="" color="warn" />
          </div>

          {/* detail comparison */}
          <div className="grid gap-4 lg:grid-cols-2">
            {sims.map((s) => (
              <Card key={`d-${s.career.id}`}>
                <h3 className="font-display text-[14px] font-bold">{L(s.career.n)} · {L(['Path detail', 'पथ विवरण'])}</h3>
                <div className="mt-3 space-y-3">
                  <Block icon={FlaskConical} title={t('sim.projectIdeas')}>
                    <ul className="space-y-1">
                      {s.projects.slice(0, 3).map((p) => (
                        <li key={p.id} className="text-[12px] leading-snug text-ink">· {L(p.t)} <span className="muted">({p.weeks} {t('common.weeks')})</span></li>
                      ))}
                      {!s.projects.length ? <li className="muted text-[12px]">{L(['No mapped projects yet', 'अभी मैप किए प्रोजेक्ट नहीं'])}</li> : null}
                    </ul>
                    <Link to="/app/project-lab" className="muted mt-1.5 inline-block text-[11px] font-semibold hover:text-brand">{t('lab.title')} →</Link>
                  </Block>

                  <Block icon={MessageSquare} title={t('sim.interviewPrep')}>
                    <ul className="space-y-1">
                      {(s.interviewFocus || []).slice(0, 4).map((f, i) => <li key={i} className="text-[12px] leading-snug text-ink">· {L(f)}</li>)}
                    </ul>
                    <Link to="/app/interview" className="muted mt-1.5 inline-block text-[11px] font-semibold hover:text-brand">{t('int.start')} →</Link>
                  </Block>

                  <Block icon={Briefcase} title={t('sim.oppCategories')}>
                    <div className="flex flex-wrap gap-1.5">
                      {(s.oppCategories || []).map((c, i) => <Badge key={i} tone="muted">{L(c)}</Badge>)}
                    </div>
                    <Link to="/app/jobs" className="muted mt-1.5 inline-block text-[11px] font-semibold hover:text-brand">{t('nav.jobs')} →</Link>
                  </Block>

                  <Block icon={Compass} title={t('sim.roadmap')}>
                    <ol className="space-y-1">
                      {s.roadmap.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] leading-snug">
                          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded bg-brand/15 font-display text-[9px] font-bold text-brand">{i + 1}</span>
                          <span className="text-ink"><strong className="font-semibold">{L(m.title)}</strong> <span className="muted">— {L(m.focus)}</span></span>
                        </li>
                      ))}
                    </ol>
                  </Block>
                </div>
              </Card>
            ))}
          </div>

          {/* verdict */}
          {best && sims.length > 1 ? (
            <Card grad>
              <div className="flex flex-wrap items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ok/15 text-ok"><Trophy className="h-4 w-4" aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[15px] font-bold">{t('sim.bestForYou')}: {L(best.career.n)}</h3>
                  <p className="muted mt-1.5 text-[12.5px] leading-relaxed">
                    {L([
                      `Highest current fit (${best.fitNow}%) with ${best.hoursToReady} estimated hours across ${best.openGaps.length} open gaps. That is the shortest route from where you are today to an interview-ready profile.`,
                      `सबसे अधिक वर्तमान फ़िट (${best.fitNow}%) और ${best.openGaps.length} खुले गैप में अनुमानित ${best.hoursToReady} घंटे। आज की आपकी स्थिति से इंटरव्यू-तैयार प्रोफ़ाइल तक यह सबसे छोटा रास्ता है।`,
                    ])}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {derived.targetCareerId !== best.career.id ? (
                      <Button size="sm" icon={Target} onClick={() => setTargetCareer(best.career.id)}>{t('career.setTarget')}</Button>
                    ) : <Badge tone="ok" icon={Check}>{t('career.isTarget')}</Badge>}
                    <Button size="sm" variant="ghost" to="/app/roadmap" iconRight={ArrowRight}>{t('nav.roadmap')}</Button>
                  </div>
                </div>
              </div>
              <p className="muted mt-3 border-t border-line pt-3 text-[10.5px] leading-relaxed">{t('common.methodNote')}</p>
            </Card>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <DemoTag />
            <span className="muted text-[11px]">{L(['Hours are planning estimates from the skill catalogue, not promises.', 'घंटे स्किल सूची से योजना अनुमान हैं, वादे नहीं।'])}</span>
            <Button size="sm" variant="quiet" className="ml-auto" to="/app/ai-career">{t('nav.aiCareer')}</Button>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-line bg-surface2/50 p-2.5">
      <div className="muted flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"><Icon className="h-3 w-3" aria-hidden />{label}</div>
      <div className="mt-1 font-display text-[15px] font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Block({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-line bg-surface2/40 p-3">
      <div className="muted mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">
        <Icon className="h-3 w-3" aria-hidden />{title}
      </div>
      {children}
    </div>
  );
}

function ChartCard({ title, note, data, unit, color = 'brand' }) {
  return (
    <Card>
      <h3 className="font-display text-[13.5px] font-bold">{title}</h3>
      <p className="muted mt-1 text-[11.5px] leading-snug">{note}</p>
      <BarListChart data={data} height={Math.max(120, data.length * 52)} color={color} unit={unit} className="mt-2" />
    </Card>
  );
}
