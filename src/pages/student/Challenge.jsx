import { useMemo, useState } from 'react';
import {
  Rocket, Check, RotateCw, Play, CalendarDays, Flame, Trophy, ArrowRight, Clock,
  BookOpen, FlaskConical, FileText, Mic, Landmark, Target, Sparkles,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import { PageHeader, Card, Badge, Button, Chip, Meter, ProgressRing, Modal, EmptyState, DemoTag } from '../../components/ui/primitives';
import { NeedsProfile, DemoNotice, AILabel } from '../../components/app/parts';
import { generateChallenge } from '../../services/careerService';
import { SKILL_BY_ID } from '../../data/catalog';
import { cn, clamp } from '../../lib/utils';

const PHASE_LINKS = {
  p30: { to: '/app/courses', icon: BookOpen, key: 'nav.courses' },
  p60: { to: '/app/project-lab', icon: FlaskConical, key: 'nav.lab' },
  p90: { to: '/app/resume', icon: FileText, key: 'nav.resume' },
};
const TASK_LINKS = [
  { test: /interview|इंटरव्यू/i, to: '/app/interview', icon: Mic, key: 'nav.interview' },
  { test: /resume|linkedin|रिज़्यूमे/i, to: '/app/resume', icon: FileText, key: 'nav.resume' },
  { test: /government|सरकार/i, to: '/app/government', icon: Landmark, key: 'nav.gov' },
  { test: /opportunit|apply|आवेदन|अवसर/i, to: '/app/jobs', icon: Target, key: 'nav.jobs' },
  { test: /project|github|प्रोजेक्ट/i, to: '/app/project-lab', icon: FlaskConical, key: 'nav.lab' },
  { test: /course|certification|कोर्स|प्रमाणपत्र/i, to: '/app/courses', icon: BookOpen, key: 'nav.courses' },
  { test: /profile|प्रोफ़ाइल/i, to: '/app/profile', icon: Sparkles, key: 'nav.profile' },
];

export default function Challenge() {
  const { t, L, d } = useI18n();
  const { challenge, activeCareer, gaps, profile, roadmap, derived, startChallenge, toggleChallengeTask, resetChallenge, toast } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);

  /* Preview plan (not saved) so the empty state can show what is coming. */
  const preview = useMemo(() => {
    if (challenge || !activeCareer || !derived) return null;
    return generateChallenge({ career: activeCareer, gaps, profile, roadmap });
  }, [challenge, activeCareer, gaps, profile, roadmap, derived]);

  if (!derived || !profile) return <NeedsProfile />;

  const plan = challenge || preview;
  const done = new Set(challenge?.done || []);
  const phases = plan?.phases || [];
  const allTasks = phases.flatMap((p) => p.tasks);
  const total = allTasks.length;
  const doneCount = allTasks.filter((x) => done.has(x.id)).length;
  const pctDone = total ? Math.round((doneCount / total) * 100) : 0;

  const startedAt = challenge?.startedAt ? new Date(challenge.startedAt) : null;
  const dayNumber = startedAt ? clamp(Math.floor((Date.now() - startedAt.getTime()) / 86400000) + 1, 1, 90) : null;

  if (!plan) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow={<><Rocket className="h-3 w-3" aria-hidden />{t('nav.challenge')}</>} title={t('ch.title')} sub={t('ch.sub')} tags={[<AILabel key="ai" />]} />
        <EmptyState
          icon={Target}
          title={t('road.noTarget')}
          body={L(['The 30-60-90 challenge is generated from your target career and open skill gaps.', '30-60-90 चुनौती आपके लक्षित करियर और खुले स्किल गैप से बनती है।'])}
          action={<Button to="/app/ai-career" iconRight={ArrowRight}>{t('career.setTarget')}</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><Rocket className="h-3 w-3" aria-hidden />{t('nav.challenge')}</>}
        title={t('ch.title')}
        sub={t('ch.sub')}
        tags={[
          activeCareer ? <Badge key="c" tone="brand" icon={Target}>{L(activeCareer.n)}</Badge> : null,
          dayNumber ? <Badge key="d" tone="warn" icon={CalendarDays}>{t('ch.day', { n: dayNumber })}</Badge> : null,
          <AILabel key="ai" />,
        ]}
        actions={
          <>
            {challenge ? (
              <Button size="sm" variant="ghost" icon={RotateCw} onClick={() => setConfirmReset(true)}>{t('ch.reset')}</Button>
            ) : (
              <Button size="sm" icon={Play} onClick={() => startChallenge()}>{t('ch.startChallenge')}</Button>
            )}
          </>
        }
      />

      {/* progress hero */}
      <Card grad className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-5">
          <ProgressRing value={pctDone} size={112} stroke={10} tone={pctDone >= 66 ? 'ok' : pctDone >= 33 ? 'brand' : 'warn'} label={`${pctDone}%`} sublabel={t('ch.progress')} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold">{challenge ? L([`Day ${dayNumber} of 90`, `दिन ${dayNumber} / 90`]) : L(['Ready to start', 'शुरू होने के लिए तैयार'])}</h2>
            <p className="muted mt-1.5 text-[12.5px] leading-relaxed">
              {L([`${doneCount} of ${total} tasks complete. ${total - doneCount} left across three phases.`, `${total} में से ${doneCount} कार्य पूर्ण। तीन चरणों में ${total - doneCount} शेष।`])}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {phases.map((p) => {
                const pd = p.tasks.filter((x) => done.has(x.id)).length;
                return (
                  <Badge key={p.id} tone={pd === p.tasks.length ? 'ok' : pd ? 'brand' : 'muted'}>
                    {L(p.title)} · {pd}/{p.tasks.length}
                  </Badge>
                );
              })}
            </div>
          </div>
          {challenge ? (
            <div className="shrink-0 text-center">
              <div className="muted text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Started', 'शुरू'])}</div>
              <div className="font-display text-[13px] font-bold">{d(startedAt)}</div>
              <div className="muted mt-1 inline-flex items-center gap-1 text-[11px]"><Flame className="h-3 w-3 text-warn" aria-hidden />{t('dash.streak')}</div>
            </div>
          ) : (
            <Button size="lg" icon={Play} onClick={() => { startChallenge(); toast({ title: ['Challenge started', 'चुनौती शुरू'], body: ['Day 1 begins now — tasks are tracked locally.', 'दिन 1 अभी शुरू — कार्य लोकल ट्रैक होते हैं।'] }); }}>
              {t('ch.startChallenge')}
            </Button>
          )}
        </div>
        <div className="relative mt-4 border-t border-line pt-3">
          <Meter value={pctDone} size="sm" tone="ok" right={`${doneCount}/${total}`} />
        </div>
      </Card>

      {!challenge ? (
        <DemoNotice tone="brand" icon={Sparkles}>
          {L(['This is a preview of the plan CareerX will generate. Press “Start challenge” to begin tracking from Day 1.',
            'यह उस योजना का पूर्वदर्शन है जो CareerX बनाएगा। दिन 1 से ट्रैकिंग शुरू करने के लिए “चुनौती शुरू करें” दबाएँ।'])}
        </DemoNotice>
      ) : null}

      {/* phases */}
      <div className="grid gap-4 lg:grid-cols-3">
        {phases.map((p, pi) => {
          const pd = p.tasks.filter((x) => done.has(x.id)).length;
          const pPct = p.tasks.length ? Math.round((pd / p.tasks.length) * 100) : 0;
          const link = PHASE_LINKS[p.id];
          const weeks = [...new Set(p.tasks.map((x) => x.w))].sort((a, b) => a - b);
          const tone = pi === 0 ? 'brand' : pi === 1 ? 'accent' : 'ok';
          return (
            <Card key={p.id} className={cn('flex flex-col', pPct === 100 && 'grad-border')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    tone === 'brand' ? 'border-brand/30 bg-brand/10 text-brand' : tone === 'accent' ? 'border-accent/30 bg-accent/10 text-accent' : 'border-ok/30 bg-ok/10 text-ok')}>
                    <Clock className="h-3 w-3" aria-hidden />{p.days} {t('common.days')}
                  </div>
                  <h3 className="mt-2 font-display text-[15px] font-bold leading-tight">{L(p.title)}</h3>
                  <p className="muted mt-1 text-[12px]">{L(p.theme)}</p>
                </div>
                <ProgressRing value={pPct} size={54} stroke={5.5} tone={pPct === 100 ? 'ok' : tone} />
              </div>

              <div className="mt-3.5 space-y-3">
                {weeks.map((w) => (
                  <div key={w}>
                    <div className="muted mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">{t('ch.week', { n: w })}</div>
                    <ul className="space-y-1.5">
                      {p.tasks.filter((x) => x.w === w).map((task) => {
                        const isDone = done.has(task.id);
                        const jump = TASK_LINKS.find((x) => x.test.test(String(task.title?.[0] || '')));
                        return (
                          <li key={task.id}>
                            <div className={cn('rounded-xl border p-2.5 transition-all duration-200',
                              isDone ? 'border-ok/30 bg-ok/[0.07]' : 'border-line bg-surface2/40 hover:border-brand/40')}>
                              <button type="button" onClick={() => toggleChallengeTask(task.id)} aria-pressed={isDone} disabled={!challenge}
                                aria-label={`${L(isDone ? ['Completed: ', 'पूर्ण: '] : ['Mark complete: ', 'पूर्ण चिह्नित करें: '])}${L(task.title)}`}
                                className="flex w-full items-start gap-2.5 text-left disabled:cursor-not-allowed">
                                <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition',
                                  isDone ? 'border-ok bg-ok text-white' : 'border-line bg-surface')} aria-hidden>
                                  {isDone ? <Check className="h-2.5 w-2.5" /> : null}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className={cn('block text-[12px] leading-snug', isDone ? 'text-muted line-through' : 'text-ink')}>{L(task.title)}</span>
                                  {task.skills?.length ? (
                                    <span className="mt-1 flex flex-wrap gap-1">
                                      {task.skills.map((s) => <Chip key={s} className="px-1.5 py-0 text-[9.5px]">{L(SKILL_BY_ID[s]?.n || [s, s])}</Chip>)}
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                              {jump && !isDone ? (
                                <Button size="sm" variant="quiet" className="mt-2" to={jump.to} iconRight={ArrowRight}>{t(jump.key)}</Button>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
                {pPct === 100 ? <Badge tone="ok" icon={Trophy}>{t('common.completed')}</Badge> : <Badge tone="muted">{pd}/{p.tasks.length}</Badge>}
                {link ? <Button size="sm" variant="ghost" className="ml-auto" to={link.to} iconRight={ArrowRight}>{t(link.key)}</Button> : null}
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[14px] font-bold">{L(['How this plan was built', 'यह योजना कैसे बनी'])}</h2>
            <p className="muted mt-1.5 max-w-2xl text-[12px] leading-relaxed">
              {L([`Tasks come from your ${gaps.filter((g) => g.status !== 'met').length} open skill gaps, your target career’s roadmap and the standard 30-60-90 onboarding pattern recruiters expect. Tick a task and it is stored in this browser only.`,
                `कार्य आपके ${gaps.filter((g) => g.status !== 'met').length} खुले स्किल गैप, आपके लक्षित करियर के रोडमैप और भर्तीकर्ताओं की अपेक्षित 30-60-90 शैली से आते हैं। कार्य टिक करने पर वह केवल इस ब्राउज़र में सेव होता है।`])}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" to="/app/roadmap">{t('nav.roadmap')}</Button>
            <Button size="sm" variant="quiet" to="/app/achievements" iconRight={ArrowRight}>{t('nav.achievements')}</Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <DemoTag />
          <span className="muted text-[10.5px]">{t('common.methodNote')}</span>
        </div>
      </Card>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={t('ch.reset')}
        icon={RotateCw}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" icon={RotateCw} onClick={() => { resetChallenge(); setConfirmReset(false); }}>{t('ch.reset')}</Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-muted">
          {L(['This regenerates all 19 tasks from your current gaps and clears your ticked items. Your readiness score, roadmap and badges are not affected.',
            'यह आपके वर्तमान गैप से सभी 19 कार्य दोबारा बनाता है और टिक किए मद हटा देता है। आपका रेडीनेस स्कोर, रोडमैप और बैज प्रभावित नहीं होते।'])}
        </p>
      </Modal>
    </div>
  );
}
