import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Lock, Check, Flame, ArrowRight, Sparkles, Target, FileText, Mic, Rocket,
  BookOpen, Briefcase, Landmark, MessageSquare, Map,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import { PageHeader, Card, Badge, Button, Meter, ProgressRing, Timeline, DemoTag, Chip } from '../../components/ui/primitives';
import { NeedsProfile, DemoNotice } from '../../components/app/parts';
import { nextBadgeProgress } from '../../services/achievementService';
import { BADGES } from '../../data/badges';
import { cn, relativeTime } from '../../lib/utils';

const BADGE_ICONS = {
  BadgeCheck: Check, Code2: Rocket, BookOpen, Mic, FileText, Briefcase, Landmark,
  MessageSquare, Map, Trophy, Target, Flame, Sparkles,
};

const SNAPSHOT_META = [
  { key: 'profileCompletion', icon: Sparkles, unit: '%', to: '/app/profile' },
  { key: 'gapsClosed', icon: Target, unit: '', to: '/app/skill-gap' },
  { key: 'roadmapProgress', icon: Map, unit: '%', to: '/app/roadmap' },
  { key: 'completedProjects', icon: Rocket, unit: '', to: '/app/project-lab' },
  { key: 'activeProjects', icon: BookOpen, unit: '', to: '/app/project-lab' },
  { key: 'resumeScore', icon: FileText, unit: '/100', to: '/app/resume' },
  { key: 'bestInterviewScore', icon: Mic, unit: '/100', to: '/app/interview' },
  { key: 'interviewAttempts', icon: Mic, unit: '', to: '/app/interview' },
  { key: 'applications', icon: Briefcase, unit: '', to: '/app/jobs' },
  { key: 'savedCourses', icon: BookOpen, unit: '', to: '/app/courses' },
  { key: 'trackedGov', icon: Landmark, unit: '', to: '/app/government' },
  { key: 'chatMessages', icon: MessageSquare, unit: '', to: '/app/dashboard' },
];

const LABELS = {
  profileCompletion: ['Profile completion', 'प्रोफ़ाइल पूर्णता'],
  gapsClosed: ['Skill gaps closed', 'भरे गए स्किल गैप'],
  roadmapProgress: ['Roadmap progress', 'रोडमैप प्रगति'],
  completedProjects: ['Projects completed', 'पूर्ण प्रोजेक्ट'],
  activeProjects: ['Projects in progress', 'जारी प्रोजेक्ट'],
  resumeScore: ['Resume score', 'रिज़्यूमे स्कोर'],
  bestInterviewScore: ['Best interview score', 'सर्वोत्तम इंटरव्यू स्कोर'],
  interviewAttempts: ['Interview attempts', 'इंटरव्यू प्रयास'],
  applications: ['Applications saved', 'सेव किए आवेदन'],
  savedCourses: ['Courses in plan', 'योजना में कोर्स'],
  trackedGov: ['Gov opportunities tracked', 'ट्रैक किए सरकारी अवसर'],
  chatMessages: ['AI mentor messages', 'AI मेंटर संदेश'],
};

export default function Achievements() {
  const { t, L, lang } = useI18n();
  const { derived, profile, progress, badgeSnapshot } = useApp();

  const earned = progress.badges || {};
  const earnedList = useMemo(
    () => BADGES.filter((b) => earned[b.id]).map((b) => ({ badge: b, at: earned[b.id] }))
      .sort((a, b) => new Date(b.at) - new Date(a.at)),
    [earned]
  );
  const locked = useMemo(() => BADGES.filter((b) => !earned[b.id]), [earned]);
  const nextBadge = badgeSnapshot ? nextBadgeProgress(badgeSnapshot) : null;

  if (!derived || !profile) return <NeedsProfile />;

  const pct = Math.round((earnedList.length / BADGES.length) * 100);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><Trophy className="h-3 w-3" aria-hidden />{t('nav.achievements')}</>}
        title={t('ach.title')}
        sub={t('ach.sub')}
        tags={[
          <Badge key="n" tone="ok" icon={Trophy}>{t('ach.earned', { n: earnedList.length, m: BADGES.length })}</Badge>,
          <Badge key="s" tone="warn" icon={Flame}>{progress.streak?.count || 0} {t('dash.streak')}</Badge>,
        ]}
        actions={<Button size="sm" variant="ghost" to="/app/dashboard" iconRight={ArrowRight}>{t('nav.dashboard')}</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card grad className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-ok/10 blur-3xl" aria-hidden />
          <div className="relative flex items-center gap-4">
            <ProgressRing value={pct} size={104} stroke={10} tone="ok" label={`${pct}%`} sublabel={t('ach.unlocked')} />
            <div className="min-w-0">
              <h2 className="font-display text-[15px] font-bold">{earnedList.length} / {BADGES.length}</h2>
              <p className="muted mt-1 text-[12px] leading-snug">{L(['Every badge is earned by a real action in the app — nothing is granted for visiting a page.', 'हर बैज ऐप में वास्तविक कार्य से मिलता है — केवल पेज खोलने पर कुछ नहीं मिलता।'])}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Badge tone="ok">{earnedList.length} {t('ach.unlocked')}</Badge>
                <Badge tone="muted" icon={Lock}>{locked.length} {t('ach.locked')}</Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-[15px] font-bold">{t('prof.progressSummary')}</h2>
          <p className="muted mt-1 text-[12px]">{L(['The exact numbers the badge engine checks.', 'वही संख्याएँ जो बैज इंजन जाँचता है।'])}</p>
          <div className="mt-3.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SNAPSHOT_META.map((m) => {
              const Icon = m.icon;
              const value = badgeSnapshot?.[m.key] ?? 0;
              return (
                <Link key={m.key} to={m.to} className="group rounded-xl border border-line bg-surface2/40 p-2.5 transition hover:border-brand/40 hover:bg-surface2">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3 shrink-0 text-brand" aria-hidden />
                    <span className="muted truncate text-[10px] font-bold uppercase tracking-wider">{L(LABELS[m.key])}</span>
                  </div>
                  <div className="mt-1 font-display text-base font-bold tabular-nums">{value}{m.unit}</div>
                </Link>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <DemoTag />
            <span className="muted text-[10.5px]">{t('common.methodNote')}</span>
          </div>
        </Card>
      </div>

      {/* next badge */}
      {nextBadge?.badge ? (
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-brand/30 bg-brand/10 text-2xl" aria-hidden>{nextBadge.badge.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-[15px] font-bold">{L(nextBadge.badge.n)}</h2>
                <Badge tone="brand">{L(['Closest to unlocking', 'अनलॉक के सबसे करीब'])}</Badge>
              </div>
              <p className="muted mt-1 text-[12px]">{t('ach.howTo')}: {L(nextBadge.badge.how)}</p>
              <Meter className="mt-2" value={nextBadge.ratio * 100} size="sm" tone="ok" right={`${Math.round(nextBadge.ratio * 100)}%`} />
            </div>
          </div>
        </Card>
      ) : null}

      {/* earned */}
      <div>
        <h2 className="mb-3 font-display text-[15px] font-bold">{t('ach.unlocked')} · {earnedList.length}</h2>
        {earnedList.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {earnedList.map(({ badge, at }) => (
              <Card key={badge.id} hover className={cn('grad-border relative overflow-hidden')}>
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-ok/30 bg-ok/10 text-xl" aria-hidden>{badge.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-display text-[13.5px] font-bold">{L(badge.n)}</h3>
                      <Check className="h-3.5 w-3.5 shrink-0 text-ok" aria-hidden />
                    </div>
                    <p className="muted mt-1 text-[11.5px] leading-snug">{L(badge.d)}</p>
                    <div className="muted mt-2 text-[10.5px]">{L(['Unlocked', 'अनलॉक'])} {relativeTime(at, lang === 'hi' ? 'hi-IN' : 'en-IN')}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <DemoNotice tone="brand" icon={Sparkles}>
              {L(['No badges yet. Complete your profile, close a skill gap or finish a project and the first one unlocks immediately.',
                'अभी कोई बैज नहीं। प्रोफ़ाइल पूरी करें, स्किल गैप भरें या प्रोजेक्ट पूरा करें — पहला बैज तुरंत अनलॉक होगा।'])}
            </DemoNotice>
          </Card>
        )}
      </div>

      {/* locked */}
      <div>
        <h2 className="mb-3 font-display text-[15px] font-bold">{t('ach.locked')} · {locked.length}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {locked.map((b) => {
            const Icon = BADGE_ICONS[b.icon] || Lock;
            const isNext = nextBadge?.badge?.id === b.id;
            return (
              <Card key={b.id} className={cn('opacity-95', isNext && 'border-brand/40')}>
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-line bg-surface2 text-muted">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-display text-[13.5px] font-bold text-muted">{L(b.n)}</h3>
                      <Lock className="h-3 w-3 shrink-0 text-muted" aria-hidden />
                      {isNext ? <Badge tone="brand" className="ml-auto">{L(['Next', 'अगला'])}</Badge> : null}
                    </div>
                    <p className="muted mt-1 text-[11.5px] leading-snug">{L(b.d)}</p>
                    <p className="mt-2 text-[11px] font-semibold text-brand">{t('ach.howTo')}: {L(b.how)}</p>
                    {isNext ? <Meter className="mt-2" value={nextBadge.ratio * 100} size="xs" tone="brand" right={`${Math.round(nextBadge.ratio * 100)}%`} /> : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* timeline */}
      {earnedList.length > 1 ? (
        <Card>
          <h2 className="font-display text-[15px] font-bold">{L(['Your achievement timeline', 'आपकी उपलब्धि टाइमलाइन'])}</h2>
          <Timeline
            className="mt-4"
            items={earnedList.slice().reverse().map(({ badge, at }) => ({
              title: `${badge.emoji} ${L(badge.n)}`,
              body: L(badge.d),
              done: true,
              meta: [<Badge key="at" tone="muted">{relativeTime(at, lang === 'hi' ? 'hi-IN' : 'en-IN')}</Badge>],
            }))}
          />
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-[14px] font-bold">{L(['Keep the streak going', 'लगातार बनाए रखें'])}</h2>
            <p className="muted mt-1 text-[12px]">{L(['Streaks, badges and scores are stored in this browser only.', 'स्ट्रीक, बैज और स्कोर केवल इस ब्राउज़र में सेव होते हैं।'])}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip><Flame className="h-3 w-3 text-warn" aria-hidden />{progress.streak?.count || 0} {t('dash.streak')}</Chip>
            <Button size="sm" to="/app/challenge" iconRight={ArrowRight}>{t('nav.challenge')}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
