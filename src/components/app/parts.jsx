import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, ArrowRight, Check, Plus, Bookmark, BookmarkCheck, ExternalLink, MapPin, Clock,
  GraduationCap, Award, Briefcase, Landmark, FlaskConical, Circle, CircleDot, CircleCheck, Info,
  ChevronDown, Target, AlertTriangle,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import { Badge, Button, Card, Chip, DemoTag, Meter, ProgressRing, SkillChip, Tooltip, EmptyState, ErrorState } from '../ui/primitives';
import { SKILL_BY_ID } from '../../data/catalog';
import { opportunityApplyUrl } from '../../services/jobService';
import { cn, clamp, levelToScore } from '../../lib/utils';

/* ------------------------------------------------------------------ *
 * Honesty markers — used everywhere sample data or demo AI appears.
 * ------------------------------------------------------------------ */
export function DemoNotice({ children, tone = 'warn', icon: Icon = Info, className }) {
  const { user } = useApp();
  if (user) return null;
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl border p-3 text-[12px] leading-relaxed',
      tone === 'warn' ? 'border-warn/30 bg-warn/[0.07]' : 'border-brand/30 bg-brand/[0.06]', className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function AILabel({ className }) {
  const { t } = useI18n();
  const { user } = useApp();
  if (user) return null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand', className)}>
      <Sparkles className="h-2.5 w-2.5" aria-hidden />{t('common.aiDemo')}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Score displays
 * ------------------------------------------------------------------ */
export function ScoreDial({ value = 0, label, sub, tone = 'brand', size = 132, to, footer, className }) {
  const ring = (
    <ProgressRing value={value} size={size} stroke={size > 120 ? 11 : 8} tone={tone} label={label} sublabel={sub} />
  );
  return (
    <Card className={cn('flex flex-col items-center gap-3 text-center', className)}>
      {to ? <Link to={to} className="transition hover:scale-[1.02]">{ring}</Link> : ring}
      {label ? <div className="font-display text-[13px] font-bold leading-tight">{label}</div> : null}
      {footer}
    </Card>
  );
}

export function MatchBadge({ value, size = 'md', showIcon = true }) {
  const tone = value >= 75 ? 'ok' : value >= 55 ? 'brand' : value >= 35 ? 'warn' : 'bad';
  return (
    <Badge tone={tone} className={cn('tabular-nums', size === 'lg' && 'px-2.5 py-1 text-[11px]')}>
      {showIcon ? <Target className="h-3 w-3" aria-hidden /> : null}{Math.round(value)}%
    </Badge>
  );
}

/** Five-step skill level selector used in onboarding and profile editing. */
export function SkillLevelPicker({ value = 0, onChange, labelledBy }) {
  const { t, L } = useI18n();
  const labels = [
    ['No experience', 'कोई अनुभव नहीं'], ['Aware', 'जानकारी है'], ['Basic', 'बेसिक'],
    ['Comfortable', 'अच्छा'], ['Strong', 'मजबूत'],
  ];
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1" role="radiogroup" aria-labelledby={labelledBy}>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <button
            key={lvl} type="button" role="radio" aria-checked={value === lvl}
            aria-label={L(labels[lvl])} title={L(labels[lvl])}
            onClick={() => onChange(lvl)}
            className={cn('h-7 w-7 rounded-lg border text-[10px] font-bold transition-all duration-200 hover:scale-105',
              value >= lvl && lvl > 0 ? 'border-brand/60 bg-brand/25 text-brand' : 'border-line bg-surface2 text-muted')}
          >
            {lvl || '–'}
          </button>
        ))}
      </div>
      <span className="muted min-w-[5.5rem] text-[10.5px] font-semibold">{L(labels[value] || labels[0])}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Gate: pages that need a usable profile
 * ------------------------------------------------------------------ */
export function NeedsProfile({ onAction, actionLabel }) {
  const { t } = useI18n();
  return (
    <ErrorState
      kind="warn"
      title={t('err.needProfile')}
      body={t('err.needOnboarding')}
      action={<Button to="/onboarding" icon={ArrowRight}>{actionLabel || t('err.startOnboarding')}</Button>}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Career card (AI Career Intelligence + dashboard recommendations)
 * ------------------------------------------------------------------ */
export function CareerCard({ match, expanded = false, compact = false, onSetTarget, isTarget }) {
  const { t, L } = useI18n();
  const { derived } = useApp();
  const [open, setOpen] = useState(expanded);
  const career = match.career;
  const skillMap = derived?.skillMap || {};
  const Icon = CAREER_ICONS[career.icon] || Briefcase;

  return (
    <Card hover className={cn('relative flex flex-col', isTarget && 'grad-border')}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-brand/30 bg-brand/10 text-brand">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[15px] font-bold leading-tight">{L(career.n)}</h3>
            {isTarget ? <Badge tone="ok" icon={Check}>{t('career.isTarget')}</Badge> : null}
          </div>
          <p className="muted mt-1 text-[12.5px] leading-snug">{L(career.short)}</p>
        </div>
        <div className="shrink-0 text-right">
          <ProgressRing value={match.match} size={compact ? 54 : 64} stroke={6} tone={match.match >= 70 ? 'ok' : match.match >= 50 ? 'brand' : 'warn'} />
          <div className="muted mt-1 text-[9.5px] font-bold uppercase tracking-wider">{t('common.match')}</div>
        </div>
      </div>

      {/* Why it matches */}
      <div className="mt-3.5 rounded-xl border border-brand/20 bg-brand/[0.06] p-3">
        <div className="muted mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">
          <Sparkles className="h-3 w-3 text-brand" aria-hidden />{t('career.whyMatch')}
        </div>
        <ul className="space-y-1">
          {match.reasons.slice(0, open ? 4 : 2).map((r, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[12px] leading-snug text-ink">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" aria-hidden />{L(r)}
            </li>
          ))}
        </ul>
      </div>

      {/* Skills you have */}
      <div className="mt-3.5">
        <div className="muted mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">{t('career.yourLevel')}</div>
        <div className="flex flex-wrap gap-1.5">
          {match.have.slice(0, open ? 12 : 5).map((r) => (
            <SkillChip key={r.id} name={L(r.skill?.n || [r.id, r.id])} level={r.current} />
          ))}
          {match.have.length > (open ? 12 : 5) ? <Chip>+{match.have.length - (open ? 12 : 5)}</Chip> : null}
        </div>
      </div>

      {/* Missing skills */}
      {match.missing.length ? (
        <div className="mt-3.5">
          <div className="muted mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">{t('career.missing')}</div>
          <div className="flex flex-wrap gap-1.5">
            {match.missing.slice(0, open ? 10 : 4).map((r) => (
              <Chip key={r.id} className="border-bad/30 bg-bad/10 text-bad">{L(r.skill?.n || [r.id, r.id])}</Chip>
            ))}
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink">{t('career.learningPath')}</h4>
            <ol className="mt-2 space-y-1.5">
              {career.roadmap.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px]">
                  <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded bg-brand/15 font-display text-[9px] font-bold text-brand">{i + 1}</span>
                  <span className="text-ink"><strong className="font-semibold">{L(m.title)}</strong> <span className="muted">— {L(m.focus)}</span></span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink">{t('career.responsibilities')}</h4>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {career.responsibilities.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[12px] leading-snug text-muted">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-ok" aria-hidden />{L(r)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
        {onSetTarget && !isTarget ? (
          <Button size="sm" icon={Target} onClick={() => onSetTarget(career.id)}>{t('career.setTarget')}</Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} iconRight={open ? ChevronDown : ArrowRight} className={cn(open && '[&>svg]:rotate-180')}>
          {open ? t('common.close') : t('common.learnMore')}
        </Button>
        <Link to="/app/simulator" className="muted ml-auto text-[11px] font-semibold hover:text-brand">{L(['Compare paths', 'पथों की तुलना'])}</Link>
      </div>
      <div className="mt-2"><span className="muted text-[10px]">{t('career.matchLabel')}</span></div>
      <span className="sr-only">{t('career.match')}: {match.match}% — {L(career.n)}</span>
      <span className="hidden">{skillMap ? '' : ''}</span>
    </Card>
  );
}

import { Code2, BarChart3, BrainCircuit, Cloud, ShieldCheck, LayoutDashboard, Rocket, Palette } from 'lucide-react';
export const CAREER_ICONS = { Code2, BarChart3, BrainCircuit, Cloud, ShieldCheck, LayoutDashboard, Rocket, Palette, Briefcase };

/* ------------------------------------------------------------------ *
 * Course card
 * ------------------------------------------------------------------ */
export function CourseCard({ entry, onSave, onComplete, index = 0 }) {
  const { t, L } = useI18n();
  const { derived, progress } = useApp();
  const c = entry.course || entry;
  const saved = entry.saved;
  const planItem = (progress.savedCourses || []).find((x) => x.id === c.id);
  const done = !!planItem?.done;
  const careerName = derived?.career ? L(derived.career.n) : '';

  return (
    <Card hover className="reveal flex h-full flex-col" data-reveal data-reveal-index={index}>
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/30 bg-brand/10 text-brand">
          <GraduationCap className="h-4 w-4" aria-hidden />
        </span>
        <div className="flex flex-wrap justify-end gap-1">
          <Badge tone={c.free ? 'ok' : 'warn'}>{c.free ? t('common.free') : t('common.paid')}</Badge>
          {c.cert ? <Badge tone="brand" icon={Award}>{t('common.certificate')}</Badge> : null}
        </div>
      </div>

      <h3 className="mt-3 font-display text-[14px] font-bold leading-snug">{L(c.t)}</h3>
      <p className="muted mt-1 text-[11.5px]">{c.provider}</p>

      <div className="muted mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden />{c.weeks} {t('common.weeks')} · {c.hrs}h</span>
        <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" aria-hidden />{L([c.diff, c.diff === 'beginner' ? 'शुरुआती' : c.diff === 'intermediate' ? 'मध्यम' : 'उन्नत'])}</span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {c.skills.map((s) => <Chip key={s}>{L(SKILL_BY_ID[s]?.n || [s, s])}</Chip>)}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface2/60 p-2.5">
        <div className="muted mb-1 text-[9.5px] font-bold uppercase tracking-[0.14em]">{t('common.whyRecommended')}</div>
        <p className="text-[12px] leading-relaxed text-ink">{L(c.why).replace('{role}', careerName)}</p>
        {entry.covered?.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {entry.covered.map((s) => (
              <Badge key={s} tone="accent">{t('course.gapImpact', { skill: L(SKILL_BY_ID[s]?.n || [s, s]) })}</Badge>
            ))}
          </div>
        ) : null}
      </div>

      {typeof entry.score === 'number' ? (
        <div className="mt-3">
          <Meter value={entry.score} size="xs" label={L(['Recommendation strength', 'सुझाव की मज़बूती'])} right={`${entry.score}`} />
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        {done ? (
          <Badge tone="ok" icon={CircleCheck}>{t('common.completed')}</Badge>
        ) : (
          <Button size="sm" variant={saved ? 'ghost' : 'primary'} icon={saved ? BookmarkCheck : Bookmark} onClick={() => onSave?.(c.id)}>
            {saved ? t('common.saved') : t('course.save')}
          </Button>
        )}
        {saved && !done ? <Button size="sm" variant="ok" icon={Check} onClick={() => onComplete?.(c.id)}>{t('common.markDone')}</Button> : null}
        {c.url && !c.url.includes('.example') ? (
          <a href={c.url} target="_blank" rel="noreferrer noopener" className="muted ml-auto inline-flex items-center gap-1 text-[11px] font-semibold hover:text-brand">
            {L(['Enroll / apply', 'नामांकन / आवेदन करें'])}<ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : null}
      </div>
      <div className="mt-2.5">
        {c.status === 'published' ? <Badge tone="accent">{L(['Institution published', 'संस्थान द्वारा प्रकाशित'])}</Badge> : <DemoTag label={[t('common.sample'), t('common.sample')]} />}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Opportunity card (jobs / internships)
 * ------------------------------------------------------------------ */
export function OpportunityCard({ opp, index = 0 }) {
  const { t, L } = useI18n();
  const [open, setOpen] = useState(false);
  const modeTone = opp.mode === 'remote' ? 'ok' : opp.mode === 'hybrid' ? 'brand' : 'muted';
  const modeLabel = opp.mode === 'remote' ? t('common.remote') : opp.mode === 'hybrid' ? t('common.hybrid') : t('common.onsite');

  return (
    <Card hover className="reveal flex h-full flex-col" data-reveal data-reveal-index={index}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={opp.type === 'internship' ? 'accent' : 'brand'}>
              {opp.type === 'internship' ? t('nav.internships') : t('nav.jobs')}
            </Badge>
            <Badge tone={modeTone}>{modeLabel}</Badge>
            {opp.ppo ? <Badge tone="ok">{L(['PPO possible', 'PPO संभव'])}</Badge> : null}
          </div>
          <h3 className="mt-2 font-display text-[14.5px] font-bold leading-snug">{L(opp.t)}</h3>
          <p className="muted mt-0.5 text-[12px]">{L(opp.co)} · {L(opp.sector)}</p>
        </div>
        <div className="shrink-0 text-center">
          <ProgressRing value={opp.match} size={56} stroke={5.5} tone={opp.match >= 70 ? 'ok' : opp.match >= 50 ? 'brand' : 'warn'} />
          <div className="muted mt-0.5 text-[9px] font-bold uppercase tracking-wider">{t('common.match')}</div>
        </div>
      </div>

      <div className="muted mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden />{L(opp.loc)}</span>
        <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" aria-hidden />{opp.exp ? t('job.yrs', { n: opp.exp }) : t('job.fresh')}</span>
        {opp.durWeeks ? <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden />{opp.durWeeks} {t('common.weeks')}</span> : null}
        {opp.comp ? <span className="inline-flex items-center gap-1 text-ok">{L(opp.comp)}</span> : null}
      </div>

      <div className="mt-3">
        <div className="muted mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em]">
          <span>{t('job.reqSkills')}</span>
          <span className="tabular-nums">{t('job.youHave', { n: opp.haveCount, m: opp.requiredCount })}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(opp.skills || []).map((s) => {
            const have = (opp.have || []).includes(s);
            const lvl = have ? (opp.strong || []).includes(s) ? 4 : 3 : 1;
            return <SkillChip key={s} name={L(SKILL_BY_ID[s]?.n || [s, s])} level={lvl} />;
          })}
        </div>
      </div>

      {open ? (
        <div className="mt-3 space-y-2.5 border-t border-line pt-3">
          <p className="text-[12px] leading-relaxed text-muted">{L(opp.desc)}</p>
          <div className="rounded-lg border border-brand/20 bg-brand/[0.06] p-2.5">
            <div className="muted mb-1 text-[9.5px] font-bold uppercase tracking-[0.14em]">{t('common.matchExplanation')}</div>
            <ul className="space-y-1">
              {(opp.reasons || []).map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11.5px] leading-snug text-ink">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" aria-hidden />{L(r)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <a href={opportunityApplyUrl(opp)} target="_blank" rel="noreferrer noopener" className="btn btn-primary btn-sm">
          {t('job.applyNow')}<ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
        <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} iconRight={ChevronDown} className={cn(open && '[&>svg]:rotate-180')}>
          {open ? t('common.close') : t('common.matchExplanation')}
        </Button>
        {opp.sample === false ? <Badge className="ml-auto" tone="accent">{L(['Institution published', 'संस्थान द्वारा प्रकाशित'])}</Badge> : <DemoTag className="ml-auto" label={[t('common.sample'), t('common.sample')]} />}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Government opportunity card
 * ------------------------------------------------------------------ */
export function GovCard({ gov, index = 0 }) {
  const { t, L } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Card hover className="reveal flex h-full flex-col" data-reveal data-reveal-index={index}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent"><Landmark className="h-4 w-4" aria-hidden /></span>
          <h3 className="mt-2.5 font-display text-[14px] font-bold leading-snug">{L(gov.t).replace(/\s*\((?:sample entry|नमूना प्रविष्टि)\)/gi, '')}</h3>
          <p className="muted mt-0.5 text-[12px] font-medium">{gov.org}</p>
        </div>
        <MatchBadge value={gov.match} />
      </div>

      <dl className="mt-3 space-y-1.5 text-[11.5px]">
        <Row k={t('gov.qualification')} v={L(gov.qual)} />
        <Row k={t('gov.age')} v={L(gov.age)} />
        <Row k={t('gov.eligibility')} v={L(gov.elig)} />
        <Row k={t('gov.appStatus')} v={<Badge tone={gov.status === 'published' ? 'ok' : 'warn'}>{gov.status === 'published' ? L(['Published', 'प्रकाशित']) : L(['Verify official portal', 'आधिकारिक पोर्टल पर जाँचें'])}</Badge>} />
        <Row k={t('gov.dates')} v={<span className="muted">{t('gov.notPublished')}</span>} />
      </dl>

      {open ? (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <div>
            <div className="muted text-[10px] font-bold uppercase tracking-[0.14em]">{L(['How to prepare', 'तैयारी कैसे करें'])}</div>
            <p className="mt-1 text-[12px] leading-relaxed text-ink">{L(gov.prep)}</p>
          </div>
          {gov.skills?.length ? (
            <div>
              <div className="muted mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">{t('common.skills')}</div>
              <div className="flex flex-wrap gap-1.5">
                {gov.skills.map((s) => <Chip key={s} className={gov.have?.includes(s) ? 'chip-on' : ''}>{L(SKILL_BY_ID[s]?.n || [s, s])}</Chip>)}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <a href={gov.site} target="_blank" rel="noreferrer noopener" className="btn btn-primary btn-sm">
          {L(['Apply', 'आवेदन करें'])}<ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
        <Button size="sm" variant="quiet" className="ml-auto" onClick={() => setOpen((o) => !o)} iconRight={ChevronDown}>
          {open ? t('common.close') : t('common.learnMore')}
        </Button>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {gov.status === 'published' ? <Badge tone="accent">{L(['Institution published', 'संस्थान द्वारा प्रकाशित'])}</Badge> : <DemoTag label={[t('common.sample'), t('common.sample')]} />}
        <span className="muted text-[10px]">{t('gov.website')}: {gov.site.replace('https://', '')}</span>
      </div>
    </Card>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="muted shrink-0 text-[10.5px] font-semibold uppercase tracking-wider">{k}</dt>
      <dd className="min-w-0 flex-1 text-right text-[11.5px] leading-snug text-ink">{v}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Project card
 * ------------------------------------------------------------------ */
const STATUS_ICON = { planned: Circle, 'in-progress': CircleDot, completed: CircleCheck };
export function ProjectCard({ entry, onStatus, index = 0 }) {
  const { t, L } = useI18n();
  const p = entry.project || entry;
  const status = entry.status || null;
  const [open, setOpen] = useState(false);
  const Icon = STATUS_ICON[status] || Circle;
  const tone = status === 'completed' ? 'ok' : status === 'in-progress' ? 'brand' : 'muted';

  return (
    <Card hover className="reveal flex h-full flex-col" data-reveal data-reveal-index={index}>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/30 bg-brand/10 text-brand"><FlaskConical className="h-4 w-4" aria-hidden /></span>
        <div className="flex items-center gap-1.5">
          <Badge tone={p.diff === 'advanced' ? 'bad' : p.diff === 'intermediate' ? 'warn' : 'ok'}>
            {L([p.diff, p.diff === 'beginner' ? 'शुरुआती' : p.diff === 'intermediate' ? 'मध्यम' : 'उन्नत'])}
          </Badge>
          <Badge tone="muted">{p.weeks} {t('common.weeks')}</Badge>
        </div>
      </div>

      <h3 className="mt-3 font-display text-[14px] font-bold leading-snug">{L(p.t)}</h3>

      {status ? (
        <div className="mt-2 inline-flex items-center gap-1.5 self-start">
          <Icon className={cn('h-3.5 w-3.5', tone === 'ok' ? 'text-ok' : tone === 'brand' ? 'text-brand' : 'text-muted')} aria-hidden />
          <span className={cn('text-[11px] font-bold', tone === 'ok' ? 'text-ok' : tone === 'brand' ? 'text-brand' : 'text-muted')}>
            {status === 'completed' ? t('common.completed') : status === 'in-progress' ? t('common.inProgress') : t('common.planned')}
          </span>
        </div>
      ) : null}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {p.skills.map((s) => <Chip key={s}>{L(SKILL_BY_ID[s]?.n || [s, s])}</Chip>)}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface2/60 p-2.5">
        <div className="muted mb-1 text-[9.5px] font-bold uppercase tracking-[0.14em]">{t('lab.problem')}</div>
        <p className="text-[12px] leading-relaxed text-ink">{L(p.problem)}</p>
      </div>

      {open ? (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          <div>
            <div className="muted text-[10px] font-bold uppercase tracking-[0.14em]">{t('lab.stack')}</div>
            <p className="mt-1 text-[12px] text-ink">{L(p.stack)}</p>
          </div>
          <div>
            <div className="muted text-[10px] font-bold uppercase tracking-[0.14em]">{t('lab.outcome')}</div>
            <p className="mt-1 text-[12px] leading-relaxed text-ink">{L(p.outcome)}</p>
          </div>
          <div>
            <div className="muted mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">{t('lab.checklist')}</div>
            <ul className="space-y-1.5">
              {p.checklist.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-[11.5px] leading-snug text-muted">
                  <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded border border-line bg-surface2"><Check className="h-2.5 w-2.5 text-line" aria-hidden /></span>
                  {L(c)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {typeof entry.score === 'number' ? (
        <div className="mt-3"><Meter value={entry.score} size="xs" label={L(['Recommended for you', 'आपके लिए सुझाया गया'])} right={`${entry.score}`} /></div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <div className="flex overflow-hidden rounded-lg border border-line">
          {['planned', 'in-progress', 'completed'].map((s) => (
            <button
              key={s} type="button" onClick={() => onStatus?.(p.id, s)} aria-pressed={status === s}
              className={cn('px-2.5 py-1.5 text-[10.5px] font-bold transition', status === s
                ? s === 'completed' ? 'bg-ok/15 text-ok' : s === 'in-progress' ? 'bg-brand/15 text-brand' : 'bg-surface2 text-ink'
                : 'text-muted hover:bg-surface2 hover:text-ink')}
            >
              {s === 'completed' ? t('common.completed') : s === 'in-progress' ? t('common.inProgress') : t('common.planned')}
            </button>
          ))}
        </div>
        <Button size="sm" variant="quiet" className="ml-auto" onClick={() => setOpen((o) => !o)} iconRight={ChevronDown}>
          {open ? t('common.close') : t('common.learnMore')}
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Next Best Action card (Career Command Center)
 * ------------------------------------------------------------------ */
export function NextBestAction({ action, className }) {
  const { t, L } = useI18n();
  if (!action) return null;
  const tone = action.priority === 'high' ? 'bad' : action.priority === 'medium' ? 'warn' : 'brand';
  return (
    <Card grad className={cn('relative overflow-hidden', className)}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/10 blur-3xl" aria-hidden />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow"><Sparkles className="h-3 w-3" aria-hidden />{t('dash.nextBest')}</span>
          <Badge tone={tone}>{L([action.priority, action.priority === 'high' ? 'उच्च' : action.priority === 'medium' ? 'मध्यम' : 'निम्न'])}</Badge>
        </div>
        <h3 className="mt-2 font-display text-lg font-bold leading-snug text-balance sm:text-xl">{L(action.title)}</h3>
        <p className="muted mt-2 text-[13px] leading-relaxed">{L(action.why)}</p>
        {action.impact ? (
          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-ok/30 bg-ok/10 px-2.5 py-1 text-[11px] font-semibold text-ok">
            <ArrowRight className="h-3 w-3" aria-hidden />{L(action.impact)}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button to={action.to} size="sm" iconRight={ArrowRight}>{L(action.cta)}</Button>
        </div>
        <div className="mt-3"><span className="muted text-[10px]">{t('common.methodNote')}</span></div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Small helpers reused by several pages
 * ------------------------------------------------------------------ */
export function EmptyResults({ title, body, onClear, clearLabel, icon = AlertTriangle }) {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={icon}
      title={title || t('job.empty')}
      body={body || t('job.emptyHint')}
      action={onClear ? <Button size="sm" variant="ghost" onClick={onClear}>{clearLabel || t('job.clearFilters')}</Button> : null}
    />
  );
}

export function LevelBar({ value, label, right, tone = 'brand' }) {
  return <Meter value={clamp(levelToScore(value))} label={label} right={right} tone={tone} size="sm" />;
}

export function TooltipChip({ text, children }) {
  return <Tooltip label={text}>{children}</Tooltip>;
}

export function SectionCard({ title, sub, action, children, className }) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-bold leading-tight">{title}</h2>
          {sub ? <p className="muted mt-1 text-[12px] leading-snug">{sub}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}
