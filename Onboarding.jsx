import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Sparkles, Check, Camera, Plus, Trash2, Loader2, Target,
  BrainCircuit, GraduationCap, Users, Compass, Briefcase, Rocket, BookOpen,
} from 'lucide-react';
import Logo from '../components/Logo';
import { TopControls } from '../components/layout/Controls';
import { Button, Card, Chip, Field, Input, Select, Textarea, Badge, Meter, SkillChip, ProgressRing } from '../components/ui/primitives';
import { SkillLevelPicker, DemoNotice } from '../components/app/parts';
import { useI18n } from '../i18n';
import { useApp } from '../store/AppStore';
import { DEGREES, BRANCHES, CITIES, COLLEGES, INTERESTS, SKILLS, WORK_TYPES, CAREER_GOALS } from '../data/catalog';
import { CAREERS } from '../data/careers';
import { cn, uid, sleep } from '../lib/utils';
import { GlowOrb } from '../components/Background';

const SUBJECTS = [
  ['Data Structures', 'डेटा स्ट्रक्चर'], ['DBMS', 'DBMS'], ['Operating Systems', 'ऑपरेटिंग सिस्टम'],
  ['Computer Networks', 'कंप्यूटर नेटवर्क'], ['Object Oriented Programming', 'ऑब्जेक्ट ओरिएंटेड प्रोग्रामिंग'],
  ['Software Engineering', 'सॉफ्टवेयर इंजीनियरिंग'], ['Machine Learning', 'मशीन लर्निंग'],
  ['Statistics & Probability', 'सांख्यिकी और प्रायिकता'], ['Web Technologies', 'वेब तकनीक'],
  ['Cloud Computing', 'क्लाउड कंप्यूटिंग'], ['Cyber Security', 'साइबर सुरक्षा'],
  ['Digital Electronics', 'डिजिटल इलेक्ट्रॉनिक्स'], ['Microprocessors', 'माइक्रोप्रोसेसर'],
  ['Thermodynamics', 'थर्मोडायनामिक्स'], ['Fluid Mechanics', 'फ्लूइड मेकैनिक्स'],
  ['Financial Accounting', 'वित्तीय लेखांकन'], ['Business Economics', 'व्यवसाय अर्थशास्त्र'],
  ['Discrete Mathematics', 'डिस्क्रीट गणित'],
];

const STEPS = [
  { key: 'onb.s1', desc: 'onb.s1d', icon: Users },
  { key: 'onb.s2', desc: 'onb.s2d', icon: GraduationCap },
  { key: 'onb.s3', desc: 'onb.s3d', icon: BookOpen },
  { key: 'onb.s4', desc: 'onb.s4d', icon: Compass },
  { key: 'onb.s5', desc: 'onb.s5d', icon: Sparkles },
  { key: 'onb.s6', desc: 'onb.s6d', icon: Target },
  { key: 'onb.s7', desc: 'onb.s7d', icon: Briefcase },
  { key: 'onb.s8', desc: 'onb.s8d', icon: Rocket },
];

const ANALYSIS_STEPS = [
  ['Reading your academic profile', 'आपकी अकादमिक प्रोफ़ाइल पढ़ी जा रही है'],
  ['Mapping technical and soft skills', 'तकनीकी और सॉफ्ट कौशल मैप किए जा रहे हैं'],
  ['Ranking career matches with reasons', 'कारणों सहित करियर मैच रैंक किए जा रहे हैं'],
  ['Detecting skill gaps and hours needed', 'स्किल गैप और आवश्यक घंटे पहचाने जा रहे हैं'],
  ['Building your six-month roadmap', 'आपका छह महीने का रोडमैप बनाया जा रहा है'],
  ['Generating your 30-60-90 challenge', 'आपकी 30-60-90 चुनौती बन रही है'],
];

export default function Onboarding() {
  const { t, L } = useI18n();
  const { profile, user, completeOnboarding, matches } = useApp();
  const navigate = useNavigate();

  const [draft, setDraft] = useState(() => ({
    personal: {
      name: profile?.personal?.name || user?.name || '',
      email: profile?.personal?.email || user?.email || '',
      phone: profile?.personal?.phone || '',
      city: profile?.personal?.city || '',
      college: profile?.personal?.college || user?.college || '',
      avatar: null,
    },
    education: {
      degree: profile?.education?.degree || user?.degree || '',
      branch: profile?.education?.branch || user?.branch || '',
      cgpa: profile?.education?.cgpa || '',
      gradYear: profile?.education?.gradYear || user?.gradYear || '',
      subjects: profile?.education?.subjects || [],
    },
    techSkills: profile?.techSkills || [],
    softSkills: profile?.softSkills || [],
    interests: profile?.interests || [],
    careerAreas: profile?.careerAreas || [],
    projects: profile?.projects || [],
    experience: profile?.experience || [],
    certifications: profile?.certifications || [],
    workType: profile?.workType || 'any',
    locationPref: profile?.locationPref || '',
    goal: profile?.goal || '',
    targetCareer: profile?.targetCareer || null,
  }));

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState('form'); // form | analysing | done
  const [analysisStep, setAnalysisStep] = useState(0);

  const set = (path, value) => setDraft((d) => {
    if (path.includes('.')) {
      const [a, b] = path.split('.');
      return { ...d, [a]: { ...d[a], [b]: value } };
    }
    return { ...d, [path]: value };
  });

  const validate = (i) => {
    const e = {};
    if (i === 0) {
      if (!draft.personal.name.trim()) e.name = t('common.requiredField');
      if (!draft.personal.email.trim()) e.email = t('common.requiredField');
      if (!draft.personal.college) e.college = t('common.requiredField');
    }
    if (i === 1) {
      if (!draft.education.degree) e.degree = t('common.requiredField');
      if (!draft.education.branch) e.branch = t('common.requiredField');
      const cg = Number(draft.education.cgpa);
      if (!cg || cg <= 0 || cg > 100) e.cgpa = L(['Enter CGPA (0–10) or percentage (0–100)', 'CGPA (0–10) या प्रतिशत (0–100) दर्ज करें']);
      if (!draft.education.gradYear) e.gradYear = t('common.requiredField');
    }
    if (i === 2 && !draft.techSkills.length) e.skills = t('onb.atLeastOne');
    if (i === 5 && !draft.careerAreas.length) e.areas = t('onb.atLeastOne');
    return e;
  };

  const next = () => {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => { setStep((s) => Math.max(0, s - 1)); setErrors({}); };

  const skillLevels = (list) => Object.fromEntries(list.map((s) => [s.id, s.level]));
  const setSkill = (bucket, id, level) => {
    setDraft((d) => {
      const arr = [...(d[bucket] || [])];
      const i = arr.findIndex((x) => x.id === id);
      if (i >= 0) { if (level === 0) arr.splice(i, 1); else arr[i] = { ...arr[i], level }; }
      else if (level > 0) arr.push({ id, level });
      return { ...d, [bucket]: arr };
    });
  };

  const toggleIn = (bucket, id, max = 99) => {
    setDraft((d) => {
      const arr = d[bucket] || [];
      const has = arr.includes(id);
      if (has) return { ...d, [bucket]: arr.filter((x) => x !== id) };
      if (arr.length >= max) return d;
      return { ...d, [bucket]: [...arr, id] };
    });
  };

  const completion = useMemo(() => {
    const checks = [
      !!draft.personal.name, !!draft.personal.city, !!draft.personal.college,
      !!draft.education.degree, !!draft.education.branch, !!draft.education.cgpa, !!draft.education.gradYear,
      draft.education.subjects.length >= 2, draft.techSkills.length >= 4, draft.softSkills.length >= 3,
      draft.interests.length >= 2, draft.careerAreas.length >= 1, draft.projects.length >= 1,
      !!draft.goal, !!draft.workType, !!draft.targetCareer,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [draft]);

  const finish = async () => {
    setPhase('analysing');
    for (let i = 0; i < ANALYSIS_STEPS.length; i += 1) {
      setAnalysisStep(i);
      await sleep(360);
    }
    completeOnboarding({ ...draft, onboarded: true });
    await sleep(420);
    setPhase('done');
  };

  /* ---------------------------- analysing / done ---------------------------- */
  if (phase !== 'form') {
    return (
      <Shell>
        <div className="mx-auto max-w-2xl">
          {phase === 'analysing' ? (
            <Card grad className="p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/15 text-brand"><BrainCircuit className="h-5 w-5 animate-pulse" aria-hidden /></span>
                <div>
                  <h2 className="font-display text-lg font-bold">{t('common.generating')}</h2>
                  <p className="muted text-[12.5px]">{L(['This runs locally on your profile data — no external AI API is connected.', 'यह आपके प्रोफ़ाइल डेटा पर लोकल चलता है — कोई बाहरी AI API कनेक्ट नहीं है।'])}</p>
                </div>
              </div>
              <ul className="mt-6 space-y-3">
                {ANALYSIS_STEPS.map((s, i) => {
                  const state = i < analysisStep ? 'done' : i === analysisStep ? 'active' : 'wait';
                  return (
                    <li key={i} className="flex items-center gap-3">
                      <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition',
                        state === 'done' ? 'border-ok/40 bg-ok/15 text-ok' : state === 'active' ? 'border-brand/50 bg-brand/15 text-brand' : 'border-line bg-surface2 text-muted')}>
                        {state === 'done' ? <Check className="h-3.5 w-3.5" aria-hidden /> : state === 'active' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
                      </span>
                      <span className={cn('text-[13px]', state === 'wait' ? 'text-muted' : 'font-medium text-ink')}>{L(s)}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-6"><Meter value={Math.round(((analysisStep + 1) / ANALYSIS_STEPS.length) * 100)} size="lg" /></div>
            </Card>
          ) : (
            <Card grad className="p-6 text-center sm:p-9">
              <GlowOrb className="-left-10 -top-10 h-52 w-52" tone="brand" />
              <div className="relative">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ok/15 text-ok"><Check className="h-7 w-7" aria-hidden /></span>
                <h2 className="h-display mt-5 text-2xl sm:text-3xl">{t('onb.doneTitle')}</h2>
                <p className="muted mt-2 text-sm">{t('onb.doneSub')}</p>

                <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
                  {(matches || []).slice(0, 4).map((m, i) => (
                    <div key={m.career.id} className="rounded-xl border border-line bg-surface2/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[12.5px] font-bold text-ink">{L(m.career.n)}</span>
                        <Badge tone={i === 0 ? 'ok' : 'brand'}>{m.match}%</Badge>
                      </div>
                      <div className="mt-2"><Meter value={m.match} size="xs" tone={i === 0 ? 'ok' : 'brand'} /></div>
                      <p className="muted mt-1.5 line-clamp-2 text-[11px] leading-snug">{L(m.reasons[0])}</p>
                    </div>
                  ))}
                </div>

                <DemoNotice className="mt-5 text-left" tone="brand" icon={Sparkles}>
                  {t('common.methodNote')}
                </DemoNotice>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button size="lg" iconRight={ArrowRight} onClick={() => navigate('/app/dashboard')}>{t('onb.goDashboard')}</Button>
                  <Button size="lg" variant="ghost" icon={Target} onClick={() => navigate('/app/ai-career')}>{t('nav.aiCareer')}</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </Shell>
    );
  }

  /* --------------------------------- form --------------------------------- */
  const current = STEPS[step];
  return (
    <Shell>
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[260px_1fr]">
        {/* stepper */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-xs font-bold uppercase tracking-[0.14em] text-muted">{t('onb.sub', { i: step + 1, n: STEPS.length })}</span>
              <span className="font-display text-sm font-bold tabular-nums text-brand">{completion}%</span>
            </div>
            <Meter value={completion} className="mt-2" size="sm" />
            <ol className="mt-4 space-y-1">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const state = i < step ? 'done' : i === step ? 'active' : 'wait';
                return (
                  <li key={s.key}>
                    <button
                      type="button" onClick={() => { if (i <= step) { setStep(i); setErrors({}); } }}
                      disabled={i > step}
                      className={cn('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12px] transition',
                        state === 'active' ? 'bg-brand/10 font-bold text-brand' : state === 'done' ? 'text-ink hover:bg-surface2' : 'text-muted opacity-70')}
                      aria-current={state === 'active' ? 'step' : undefined}
                    >
                      <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-md border text-[10px] font-bold',
                        state === 'done' ? 'border-ok/40 bg-ok/15 text-ok' : state === 'active' ? 'border-brand/50 bg-brand/15 text-brand' : 'border-line bg-surface2')}>
                        {state === 'done' ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
                      </span>
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{t(s.key)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </Card>
        </aside>

        {/* step body */}
        <Card className="p-5 sm:p-6">
          <div key={step} className="animate-fade-up">
            <span className="eyebrow"><current.icon className="h-3 w-3" aria-hidden />{t('onb.sub', { i: step + 1, n: STEPS.length })}</span>
            <h2 className="h-display mt-2 text-xl sm:text-2xl">{t(current.key)}</h2>
            <p className="muted mt-1.5 text-[13px] leading-relaxed">{t(current.desc)}</p>

            <div className="mt-6">
              {step === 0 && <StepPersonal draft={draft} set={set} errors={errors} />}
              {step === 1 && <StepEducation draft={draft} set={set} errors={errors} toggleIn={toggleIn} />}
              {step === 2 && <StepSkills draft={draft} setSkill={setSkill} cat={['technical', 'tools']} errors={errors} />}
              {step === 3 && <StepSkills draft={draft} setSkill={setSkill} cat={['soft', 'industry']} errors={errors} />}
              {step === 4 && <StepInterests draft={draft} toggleIn={toggleIn} />}
              {step === 5 && <StepAreas draft={draft} toggleIn={toggleIn} errors={errors} />}
              {step === 6 && <StepExperience draft={draft} setDraft={setDraft} set={set} />}
              {step === 7 && <StepGoal draft={draft} set={set} completion={completion} />}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-line pt-5">
            <Button variant="ghost" icon={ArrowLeft} onClick={back} disabled={step === 0}>{t('common.back')}</Button>
            {step < STEPS.length - 1 ? (
              <Button className="ml-auto" iconRight={ArrowRight} onClick={next}>{t('common.next')}</Button>
            ) : (
              <Button className="ml-auto" size="lg" icon={Sparkles} onClick={finish}>{t('onb.generate')}</Button>
            )}
          </div>
        </Card>
      </div>
    </Shell>
  );
}

/* --------------------------------- shell --------------------------------- */
function Shell({ children }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen px-4 pb-14 pt-5 sm:px-6">
      <header className="mx-auto mb-6 flex w-full max-w-5xl items-center justify-between gap-3">
        <button type="button" onClick={() => navigate('/')} aria-label="CareerX home"><Logo size={34} /></button>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="quiet" onClick={() => navigate('/app/profile')}>{t('onb.skip')}</Button>
          <TopControls compact />
        </div>
      </header>
      {children}
    </div>
  );
}

/* --------------------------------- steps --------------------------------- */
function StepPersonal({ draft, set, errors }) {
  const { t, L } = useI18n();
  const p = draft.personal;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t('auth.fullName')} htmlFor="ob-name" error={errors.name} required>
        <Input id="ob-name" value={p.name} onChange={(e) => set('personal.name', e.target.value)} invalid={!!errors.name} autoComplete="name" />
      </Field>
      <Field label={t('auth.email')} htmlFor="ob-email" error={errors.email} required>
        <Input id="ob-email" type="email" value={p.email} onChange={(e) => set('personal.email', e.target.value)} invalid={!!errors.email} autoComplete="email" />
      </Field>
      <Field label={t('res.phone')} htmlFor="ob-phone" hint={t('common.optional')}>
        <Input id="ob-phone" value={p.phone} onChange={(e) => set('personal.phone', e.target.value)} placeholder="+91 …" autoComplete="tel" />
      </Field>
      <Field label={t('res.cityLabel')} htmlFor="ob-city">
        <Select id="ob-city" value={typeof p.city === 'string' ? p.city : (p.city?.[0] || '')} onChange={(e) => set('personal.city', e.target.value)}>
          <option value="">{L(['Select city…', 'शहर चुनें…'])}</option>
          {CITIES.map((c) => <option key={c[0]} value={c[0]}>{L(c)}</option>)}
        </Select>
      </Field>
      <Field label={t('auth.college')} htmlFor="ob-college" error={errors.college} required className="sm:col-span-2">
        <Select id="ob-college" value={p.college} onChange={(e) => set('personal.college', e.target.value)} invalid={!!errors.college}>
          <option value="">{L(['Select college…', 'कॉलेज चुनें…'])}</option>
          {COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label={t('prof.avatar')} hint={t('prof.avatarNote')}>
          <div className="flex flex-wrap items-center gap-2">
            {['🎓', '🚀', '💻', '📊', '🎯', '🧠'].map((e, i) => (
              <button key={e} type="button" onClick={() => set('personal.avatar', null) || set('personal.avatarSeed', `emoji-${i}`)}
                className={cn('grid h-11 w-11 place-items-center rounded-xl border text-lg transition hover:scale-105',
                  draft.personal.avatarSeed === `emoji-${i}` ? 'border-brand bg-brand/15' : 'border-line bg-surface2')}
                aria-label={`${L(['Avatar', 'अवतार'])} ${i + 1}`}>{e}</button>
            ))}
            <label className="btn btn-ghost btn-sm cursor-pointer">
              <Camera className="h-3.5 w-3.5" aria-hidden />{t('prof.uploadPhoto')}
              <input
                type="file" accept="image/*" className="sr-only"
                onChange={(ev) => {
                  const file = ev.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => set('personal.avatar', String(reader.result).slice(0, 400000));
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
        </Field>
      </div>
    </div>
  );
}

function StepEducation({ draft, set, errors, toggleIn }) {
  const { t, L } = useI18n();
  const e = draft.education;
  const years = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + i - 2);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('auth.degree')} htmlFor="ob-deg" error={errors.degree} required>
          <Select id="ob-deg" value={e.degree} onChange={(ev) => set('education.degree', ev.target.value)} invalid={!!errors.degree}>
            <option value="">{L(['Select…', 'चुनें…'])}</option>
            {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label={t('auth.branch')} htmlFor="ob-br" error={errors.branch} required>
          <Select id="ob-br" value={e.branch} onChange={(ev) => set('education.branch', ev.target.value)} invalid={!!errors.branch}>
            <option value="">{L(['Select…', 'चुनें…'])}</option>
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
        </Field>
        <Field label={t('onb.cgpa')} htmlFor="ob-cg" error={errors.cgpa} required hint={L(['CGPA out of 10, or percentage out of 100.', '10 में से CGPA, या 100 में से प्रतिशत।'])}>
          <Input id="ob-cg" inputMode="decimal" value={e.cgpa} onChange={(ev) => set('education.cgpa', ev.target.value)} placeholder="8.4" invalid={!!errors.cgpa} />
        </Field>
        <Field label={t('auth.gradYear')} htmlFor="ob-gy" error={errors.gradYear} required>
          <Select id="ob-gy" value={e.gradYear} onChange={(ev) => set('education.gradYear', ev.target.value)} invalid={!!errors.gradYear}>
            <option value="">{L(['Select…', 'चुनें…'])}</option>
            {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </Select>
        </Field>
      </div>
      <Field label={t('onb.subjects')} hint={t('onb.subjectsHint')}>
        <div className="flex flex-wrap gap-1.5">
          {SUBJECTS.map((s) => (
            <Chip key={s[0]} active={e.subjects.includes(s[0])} onClick={() => {
              const has = e.subjects.includes(s[0]);
              set('education.subjects', has ? e.subjects.filter((x) => x !== s[0]) : [...e.subjects, s[0]]);
            }}>{L(s)}</Chip>
          ))}
        </div>
      </Field>
      {errors.skills ? <p className="text-[11px] font-semibold text-bad">{errors.skills}</p> : null}
    </div>
  );
}

function StepSkills({ draft, setSkill, cat, errors }) {
  const { t, L } = useI18n();
  const list = SKILLS.filter((s) => cat.includes(s.cat));
  const levels = { ...skillLevelsOf(draft.techSkills), ...skillLevelsOf(draft.softSkills), ...skillLevelsOf(draft.toolSkills), ...skillLevelsOf(draft.industrySkills) };
  const bucketFor = (s) => (s.cat === 'soft' ? 'softSkills' : s.cat === 'tools' ? 'techSkills' : s.cat === 'industry' ? 'softSkills' : 'techSkills');
  const chosen = Object.values(levels).filter((v) => v > 0).length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{chosen} {L(['selected', 'चुने गए'])}</Badge>
        <span className="muted text-[11.5px]">{L(['Rate honestly — recommendations adapt to it.', 'ईमानदारी से बताएँ — सुझाव उसी से बनते हैं।'])}</span>
        {errors.skills ? <span className="text-[11px] font-semibold text-bad">{errors.skills}</span> : null}
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {list.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 bg-surface2/40 px-3 py-2.5 transition hover:bg-surface2">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-ink">{L(s.n)}</div>
              <div className="muted mt-0.5 line-clamp-1 text-[11px]">{L(s.why)}</div>
            </div>
            <SkillLevelPicker value={levels[s.id] || 0} onChange={(v) => setSkill(bucketFor(s), s.id, v)} labelledBy={`skill-${s.id}`} />
          </li>
        ))}
      </ul>
      <p className="muted text-[11px]">{t('common.methodNote')}</p>
    </div>
  );
}
function skillLevelsOf(list = []) { return Object.fromEntries(list.map((x) => [x.id, x.level])); }

function StepInterests({ draft, toggleIn }) {
  const { L } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      {INTERESTS.map((i) => (
        <Chip key={i.id} active={draft.interests.includes(i.id)} onClick={() => toggleIn('interests', i.id, 6)} className="px-3 py-2 text-[12px]">
          {L(i.n)}
        </Chip>
      ))}
    </div>
  );
}

function StepAreas({ draft, toggleIn, errors }) {
  const { L, t } = useI18n();
  return (
    <div className="space-y-3">
      {errors.areas ? <p className="text-[11px] font-semibold text-bad">{errors.areas}</p> : null}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {CAREERS.map((c) => {
          const active = draft.careerAreas.includes(c.id);
          return (
            <button
              key={c.id} type="button" aria-pressed={active}
              onClick={() => toggleIn('careerAreas', c.id, 3)}
              className={cn('rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5',
                active ? 'border-brand bg-brand/10 shadow-glow' : 'border-line bg-surface2/50 hover:border-brand/40')}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[13px] font-bold">{L(c.n)}</span>
                {active ? <span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-white"><Check className="h-3 w-3" aria-hidden /></span> : <span className="h-5 w-5 rounded-full border border-line" aria-hidden />}
              </div>
              <p className="muted mt-1 text-[11.5px] leading-snug">{L(c.short)}</p>
            </button>
          );
        })}
      </div>
      <p className="muted text-[11px]">{t('onb.s6d')} · {L(['Maximum 3.', 'अधिकतम 3।'])}</p>
    </div>
  );
}

function StepExperience({ draft, setDraft, set }) {
  const { t, L } = useI18n();
  const addProject = () => setDraft((d) => ({ ...d, projects: [...d.projects, { id: uid('pr'), title: ['', ''], desc: ['', ''], tech: '', status: 'planned', link: '' }] }));
  const addExp = () => setDraft((d) => ({ ...d, experience: [...d.experience, { id: uid('ex'), role: ['', ''], company: ['', ''], period: ['', ''], bullets: [] }] }));
  const update = (list, idx, patch) => setDraft((d) => ({ ...d, [list]: d[list].map((x, i) => (i === idx ? { ...x, ...patch } : x)) }));
  const remove = (list, idx) => setDraft((d) => ({ ...d, [list]: d[list].filter((_, i) => i !== idx) }));

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-bold">{t('onb.projectName')}</h3>
          <Button size="sm" variant="ghost" icon={Plus} onClick={addProject}>{t('onb.addProject')}</Button>
        </div>
        {!draft.projects.length ? (
          <p className="muted rounded-xl border border-dashed border-line p-4 text-center text-[12px]">
            {L(['No projects yet — even a class assignment counts. Add one to raise your match scores.', 'अभी कोई प्रोजेक्ट नहीं — क्लास असाइनमेंट भी मान्य है। मैच स्कोर बढ़ाने के लिए एक जोड़ें।'])}
          </p>
        ) : (
          <div className="space-y-3">
            {draft.projects.map((p, i) => (
              <div key={p.id || i} className="rounded-xl border border-line bg-surface2/40 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2.5">
                    <Input value={typeof p.title === 'string' ? p.title : p.title?.[0] || ''} placeholder={t('onb.projectName')}
                      onChange={(e) => update('projects', i, { title: [e.target.value, e.target.value] })} />
                    <Textarea rows={2} value={typeof p.desc === 'string' ? p.desc : p.desc?.[0] || ''} placeholder={t('onb.projectDesc')}
                      onChange={(e) => update('projects', i, { desc: [e.target.value, e.target.value] })} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input value={p.tech || ''} placeholder={L(['Technologies used', 'उपयोग की गई तकनीकें'])} onChange={(e) => update('projects', i, { tech: e.target.value })} />
                      <Select value={p.status || 'planned'} onChange={(e) => update('projects', i, { status: e.target.value })}>
                        <option value="planned">{t('common.planned')}</option>
                        <option value="in-progress">{t('common.inProgress')}</option>
                        <option value="completed">{t('common.completed')}</option>
                      </Select>
                    </div>
                  </div>
                  <button type="button" onClick={() => remove('projects', i)} className="icon-btn h-8 w-8 shrink-0" aria-label={t('common.clear')}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-bold">{t('onb.s7')}</h3>
          <Button size="sm" variant="ghost" icon={Plus} onClick={addExp}>{L(['Add experience', 'अनुभव जोड़ें'])}</Button>
        </div>
        <div className="space-y-3">
          {draft.experience.map((x, i) => (
            <div key={x.id || i} className="grid gap-2 rounded-xl border border-line bg-surface2/40 p-3 sm:grid-cols-3">
              <Input value={typeof x.role === 'string' ? x.role : x.role?.[0] || ''} placeholder={t('res.roleTitle')} onChange={(e) => update('experience', i, { role: [e.target.value, e.target.value] })} />
              <Input value={typeof x.company === 'string' ? x.company : x.company?.[0] || ''} placeholder={t('res.company')} onChange={(e) => update('experience', i, { company: [e.target.value, e.target.value] })} />
              <div className="flex gap-2">
                <Input value={typeof x.period === 'string' ? x.period : x.period?.[0] || ''} placeholder={t('res.period')} onChange={(e) => update('experience', i, { period: [e.target.value, e.target.value] })} />
                <button type="button" onClick={() => remove('experience', i)} className="icon-btn h-8 w-8 shrink-0" aria-label={t('common.clear')}><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('onb.workType')}>
          <div className="flex flex-wrap gap-1.5">
            {WORK_TYPES.map((w) => (
              <Chip key={w.id} active={draft.workType === w.id} onClick={() => set('workType', w.id)}>{L(w.n)}</Chip>
            ))}
          </div>
        </Field>
        <Field label={t('onb.locationPref')} hint={L(['Comma separated — used to rank opportunities.', 'कॉमा से अलग — अवसर रैंक करने में उपयोग होता है।'])}>
          <Input value={draft.locationPref} onChange={(e) => set('locationPref', e.target.value)} placeholder="Bengaluru, Remote (India)" />
        </Field>
      </div>
    </div>
  );
}

function StepGoal({ draft, set, completion }) {
  const { t, L } = useI18n();
  const [freeText, setFreeText] = useState('');
  return (
    <div className="space-y-5">
      <Field label={t('onb.goal')}>
        <div className="grid gap-2 sm:grid-cols-2">
          {CAREER_GOALS.map((g) => (
            <button key={g[0]} type="button" aria-pressed={draft.goal === g[0]}
              onClick={() => set('goal', g[0])}
              className={cn('rounded-xl border px-3 py-2.5 text-left text-[12.5px] font-medium transition',
                draft.goal === g[0] ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-surface2/50 text-ink hover:border-brand/40')}>
              {L(g)}
            </button>
          ))}
        </div>
      </Field>
      <Field label={L(['Or write your own goal', 'या अपना लक्ष्य लिखें'])}>
        <Textarea rows={2} value={freeText} onChange={(e) => { setFreeText(e.target.value); set('goal', e.target.value); }} placeholder={L(['e.g. Get a data analyst internship before December', 'जैसे दिसंबर से पहले डेटा एनालिस्ट इंटर्नशिप पाना'])} />
      </Field>

      <div className="rounded-xl border border-line bg-surface2/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-sm font-bold">{L(['Set your target career (optional)', 'लक्षित करियर तय करें (वैकल्पिक)'])}</h3>
          <ProgressRing value={completion} size={52} stroke={5} />
        </div>
        <p className="muted mt-1 text-[11.5px]">{L(['Skip this and CareerX picks your best match automatically. You can change it any time.', 'छोड़ दें तो CareerX आपका सर्वोत्तम मैच स्वयं चुनेगा। कभी भी बदल सकते हैं।'])}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CAREERS.filter((c) => draft.careerAreas.includes(c.id)).concat(CAREERS.filter((c) => !draft.careerAreas.includes(c.id))).map((c) => (
            <Chip key={c.id} active={draft.targetCareer === c.id} onClick={() => set('targetCareer', draft.targetCareer === c.id ? null : c.id)}>
              {L(c.n)}
            </Chip>
          ))}
        </div>
      </div>

      <DemoNotice tone="brand" icon={Sparkles}>
        {L(['Everything you enter stays in this browser. Nothing is uploaded in this demo build, and you can delete it all later from Profile → Data controls.',
          'आपका दर्ज किया सब कुछ इस ब्राउज़र में रहता है। इस डेमो बिल्ड में कुछ भी अपलोड नहीं होता, और बाद में Profile → Data controls से सब हटा सकते हैं।'])}
      </DemoNotice>
    </div>
  );
}
