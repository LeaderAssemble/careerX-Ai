import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, RotateCw, ArrowRight, Target, Check, Trophy, Compass, GraduationCap,
  Briefcase, ListChecks, FlaskConical, BrainCircuit, Loader2,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import {
  PageHeader, Card, Badge, Button, Chip, Meter, ProgressRing, KeyValue, EmptyState, DemoTag,
} from '../../components/ui/primitives';
import { CareerCard, NeedsProfile, DemoNotice, AILabel, CAREER_ICONS } from '../../components/app/parts';
import { cn, sleep } from '../../lib/utils';
import { CAREERS } from '../../data/careers';

const CAREER_NAME = Object.fromEntries(CAREERS.map((c) => [c.id, c.n]));

export default function AICareer() {
  const { t, L } = useI18n();
  const { derived, matches, profile, setTargetCareer, rebuildIntelligence, toast } = useApp();
  const [busy, setBusy] = useState(false);

  if (!derived || !profile) return <NeedsProfile />;

  const top = matches[0] || null;
  const rest = matches.slice(1);
  const isTargetSet = !!derived.targetCareerId;

  const regenerate = async () => {
    setBusy(true);
    await sleep(760);
    rebuildIntelligence();
    setBusy(false);
    toast({
      title: ['Career matches recalculated', 'करियर मैच दोबारा गिने गए'],
      body: ['Ranking rebuilt from your latest skills, interests and projects.', 'आपके नवीनतम कौशल, रुचियों और प्रोजेक्ट से रैंकिंग फिर बनी।'],
    });
  };

  const inputs = [
    { k: L(['Academics', 'अकादमिक']), v: `${profile.education?.degree || '—'} · ${profile.education?.branch || '—'} · CGPA ${profile.education?.cgpa ?? '—'}` },
    { k: L(['Skills rated', 'रेट किए गए कौशल']), v: L([`${countSkills(profile)} skills across 4 categories`, `${countSkills(profile)} कौशल, 4 श्रेणियों में`]) },
    { k: t('career.interests'), v: (profile.interests || []).length ? profile.interests.join(', ') : '—' },
    { k: L(['Chosen career areas', 'चुने गए करियर क्षेत्र']), v: (profile.careerAreas || []).length ? profile.careerAreas.map((c) => L(CAREER_NAME[c] || [c, c])).join(', ') : '—' },
    { k: t('career.projects'), v: `${(profile.projects || []).length}` },
    { k: t('career.experience'), v: `${(profile.experience || []).length}` },
    { k: t('career.goals'), v: profile.goal || '—' },
    { k: t('career.prefWork'), v: profile.workType || '—' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><Sparkles className="h-3 w-3" aria-hidden />{t('nav.aiCareer')}</>}
        title={t('career.title')}
        sub={t('career.sub')}
        tags={[<AILabel key="ai" />, <Badge key="n" tone="muted">{matches.length} {t('common.results')}</Badge>]}
        actions={
          <>
            <Button size="sm" variant="ghost" icon={busy ? Loader2 : RotateCw} onClick={regenerate} loading={busy}>
              {busy ? t('career.analysing') : t('career.regenerate')}
            </Button>
            <Button size="sm" to="/app/simulator" iconRight={ArrowRight}>{t('sim.compare')}</Button>
          </>
        }
      />

      {!isTargetSet ? (
        <DemoNotice tone="brand" icon={Compass}>
          {L(['No target career selected yet — CareerX is showing your best match first. Set a target to unlock your roadmap, gap plan and matched opportunities.',
            'अभी कोई लक्षित करियर नहीं चुना गया — CareerX आपका सर्वोत्तम मैच पहले दिखा रहा है। रोडमैप, गैप प्लान और मैच्ड अवसर खोलने के लिए लक्ष्य तय करें।'])}
        </DemoNotice>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {/* top pick */}
          {top ? (
            <Card grad className="relative overflow-hidden">
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand/10 blur-3xl" aria-hidden />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="ok" icon={Trophy}>{L(['Top match', 'शीर्ष मैच'])}</Badge>
                  {derived.targetCareerId === top.career.id ? <Badge tone="brand" icon={Check}>{t('career.isTarget')}</Badge> : null}
                  <span className="muted ml-auto text-[10.5px]">{t('career.matchLabel')}</span>
                </div>

                <div className="mt-4 flex flex-wrap items-start gap-4">
                  <ProgressRing value={top.match} size={104} stroke={9} tone="ok" label={t('common.match')} />
                  <div className="min-w-0 flex-1">
                    <h2 className="h-display text-2xl">{L(top.career.n)}</h2>
                    <p className="muted mt-1.5 text-[13px] leading-relaxed">{L(top.career.short)}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge tone="muted" icon={ListChecks}>{L([`${top.career.roadmap.length}-month plan available`, `${top.career.roadmap.length} महीने की योजना उपलब्ध`])}</Badge>
                      <Badge tone="muted" icon={Target}>{L([`${top.missing.length} skills to build`, `${top.missing.length} कौशल बनाने हैं`])}</Badge>
                      <Badge tone="muted" icon={Check}>{L([`${top.have.length} already met`, `${top.have.length} पहले से पूरे`])}</Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{t('career.whyMatch')}</div>
                    <ul className="space-y-1.5">
                      {top.reasons.slice(0, 4).map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12.5px] leading-snug text-ink">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" aria-hidden />{L(r)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{t('career.missing')}</div>
                    {top.missing.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {top.missing.slice(0, 6).map((r) => (
                          <Chip key={r.id} className="border-bad/30 bg-bad/10 text-bad">
                            {L(r.skill?.n || [r.id, r.id])} <span className="opacity-70">{Math.round((r.current / 4) * 100)}%</span>
                          </Chip>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12.5px] text-ok">{t('gap.allGood')}</p>
                    )}
                    <div className="muted mt-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Where this leads', 'यह कहाँ ले जाता है'])}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(top.career.oppCategories || []).slice(0, 4).map((c, i) => <Badge key={i} tone="muted">{L(c)}</Badge>)}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                  {derived.targetCareerId !== top.career.id ? (
                    <Button icon={Target} onClick={() => {
                      setTargetCareer(top.career.id);
                      toast({ title: ['Target career set', 'लक्षित करियर तय हुआ'], body: [`${top.career.n[0]} — roadmap and gap plan updated.`, `${top.career.n[1]} — रोडमैप और गैप प्लान अपडेट हुए।`] });
                    }}>{t('career.setTarget')}</Button>
                  ) : (
                    <Button to="/app/roadmap" iconRight={ArrowRight}>{t('dash.continueRoadmap')}</Button>
                  )}
                  <Button variant="ghost" to="/app/skill-gap">{t('nav.skillgap')}</Button>
                  <Button variant="ghost" to="/app/jobs">{t('nav.jobs')}</Button>
                </div>
              </div>
            </Card>
          ) : (
            <EmptyState icon={Compass} title={t('career.noMatch')} body={L(['Add a few skills in your profile and matches will appear.', 'प्रोफ़ाइल में कुछ कौशल जोड़ें, मैच दिखने लगेंगे।'])}
              action={<Button size="sm" to="/app/profile">{t('prof.edit')}</Button>} />
          )}

          {/* ranked list */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-[15px] font-bold">{L(['All ranked matches', 'सभी रैंक किए गए मैच'])}</h2>
              <span className="muted text-[11px]">{L(['Ordered by weighted fit to your profile', 'आपकी प्रोफ़ाइल के भारित फ़िट के अनुसार क्रमबद्ध'])}</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {rest.map((m) => (
                <CareerCard
                  key={m.career.id} match={m}
                  isTarget={derived.targetCareerId === m.career.id}
                  onSetTarget={(id) => {
                    setTargetCareer(id);
                    toast({ title: ['Target career set', 'लक्षित करियर तय हुआ'], body: [`${m.career.n[0]} is now your target.`, `${m.career.n[1]} अब आपका लक्ष्य है।`] });
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* side panel */}
        <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Card>
            <h2 className="font-display text-[15px] font-bold">{t('career.inputs')}</h2>
            <p className="muted mt-1 text-[12px] leading-snug">{L(['Every signal the ranking used. Change any of them and re-run.', 'रैंकिंग ने जिन संकेतों का उपयोग किया। किसी को भी बदलें और दोबारा चलाएँ।'])}</p>
            <KeyValue className="mt-3" items={inputs} />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" to="/app/profile" iconRight={ArrowRight}>{t('prof.edit')}</Button>
              <Button size="sm" variant="quiet" icon={RotateCw} onClick={regenerate} loading={busy}>{t('career.regenerate')}</Button>
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-[15px] font-bold">{L(['How the ranking works', 'रैंकिंग कैसे काम करती है'])}</h2>
            <ul className="mt-3 space-y-2.5">
              {[
                { icon: BrainCircuit, w: 58, en: 'Skill coverage against each career’s weighted requirement list', hi: 'प्रत्येक करियर की भारित आवश्यकता सूची के मुकाबले कौशल कवरेज' },
                { icon: Compass, w: 12, en: 'Career areas you selected during onboarding', hi: 'ऑनबोर्डिंग में आपके चुने गए करियर क्षेत्र' },
                { icon: Sparkles, w: 12, en: 'Interest overlap with the role’s typical interest profile', hi: 'भूमिका की सामान्य रुचि प्रोफ़ाइल से रुचि समानता' },
                { icon: FlaskConical, w: 8, en: 'Projects that already use this role’s tools', hi: 'प्रोजेक्ट जो पहले से इस भूमिका के टूल उपयोग करते हैं' },
                { icon: Target, w: 5, en: 'Stated career goal keywords', hi: 'बताए गए करियर लक्ष्य के कीवर्ड' },
                { icon: GraduationCap, w: 5, en: 'Academic score (normalised, capped influence)', hi: 'अकादमिक स्कोर (सामान्यीकृत, सीमित प्रभाव)' },
              ].map((r) => (
                <li key={r.en} className="flex items-start gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-brand/25 bg-brand/10 text-brand"><r.icon className="h-3.5 w-3.5" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold leading-snug">{L([r.en, r.hi])}</div>
                    <Meter className="mt-1.5" value={r.w} size="xs" showTrack right={`${r.w}%`} />
                  </div>
                </li>
              ))}
            </ul>
            <DemoNotice className="mt-4" tone="warn">{t('common.methodNote')}</DemoNotice>
          </Card>

          <Card>
            <h2 className="font-display text-[15px] font-bold">{L(['Your next step', 'आपका अगला कदम'])}</h2>
            <ul className="mt-3 space-y-2">
              {[
                { to: '/app/roadmap', icon: ListChecks, label: t('nav.roadmap'), note: L(['Six-month plan ordered by your gaps', 'आपके गैप के अनुसार छह महीने की योजना']) },
                { to: '/app/skill-gap', icon: Target, label: t('nav.skillgap'), note: L([`${matches[0]?.missing?.length || 0} skills below expectation`, `${matches[0]?.missing?.length || 0} कौशल अपेक्षा से नीचे`]) },
                { to: '/app/simulator', icon: Compass, label: t('nav.simulator'), note: L(['Compare two or three paths side by side', 'दो-तीन पथों की तुलना करें']) },
                { to: '/app/jobs', icon: Briefcase, label: t('nav.jobs'), note: L(['Matched openings ranked for you', 'आपके लिए रैंक की गई वैकेंसी']) },
              ].map((x) => (
                <li key={x.to}>
                  <Link to={x.to} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface2/40 p-2.5 transition hover:border-brand/40 hover:bg-surface2">
                    <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-brand/25 bg-brand/10 text-brand')}><x.icon className="h-3.5 w-3.5" aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-semibold">{x.label}</span>
                      <span className="muted block text-[11px] leading-snug">{x.note}</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3"><DemoTag /></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function countSkills(profile) {
  return ['techSkills', 'softSkills', 'toolSkills', 'industrySkills']
    .reduce((a, k) => a + ((profile[k] || []).filter((s) => s.level > 0).length), 0);
}
