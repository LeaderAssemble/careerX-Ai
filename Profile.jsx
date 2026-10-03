import { useEffect, useMemo, useRef, useState } from 'react';
import {
  User, GraduationCap, Wrench, Sparkles, Briefcase, Award, Link2, Database, Trash2,
  Download, Save, Check, X, Plus, RotateCw, AlertTriangle, ShieldCheck, Target,
  Camera, Pencil, BookOpen, Compass, ArrowRight, Volume2, Eye, Upload,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import {
  PageHeader, Card, Badge, Button, Chip, Input, Textarea, Select, Field, Meter, Modal,
  ProgressRing, Avatar, KeyValue, DemoTag, Tabs, EmptyState, Segmented, Switch, Tooltip,
} from '../../components/ui/primitives';
import { NeedsProfile, SkillLevelPicker, DemoNotice, AILabel } from '../../components/app/parts';
import {
  SKILLS, INTERESTS, DEGREES, CITIES, WORK_TYPES, CAREER_GOALS,
  DEGREE_DEPARTMENTS, SEMESTERS_BY_DEGREE, INDIAN_COLLEGES, INDIAN_BOARDS,
  INDIAN_STATES, ACADEMIC_YEAR_OPTIONS, TWELFTH_PASSOUT_OPTIONS,
  TENTH_PASSOUT_OPTIONS, ACTIVITY_TYPES,
} from '../../data/catalog';
import { CAREERS } from '../../data/careers';
import { missingProfileParts } from '../../services/scoreService';
import { cn, uid, clamp } from '../../lib/utils';

const AVATAR_PRESETS = ['aarav', 'nova', 'pixel', 'orbit', 'spark', 'zen', 'code', 'lotus'];
const AVATAR_COLORS = ['#6366f1', '#22d3ee', '#a78bfa', '#34d399', '#f59e0b', '#fb7185', '#60a5fa', '#f472b6'];

const CATS = [
  { id: 'technical', icon: Wrench, key: 'gap.technical' },
  { id: 'soft', icon: Sparkles, key: 'gap.soft' },
  { id: 'tools', icon: Compass, key: 'gap.tools' },
  { id: 'domain', icon: Briefcase, key: 'gap.industry' },
];

/* A text field that keeps its own draft and commits on blur / Enter. */
function AutoField({ label, hint, value, onCommit, type = 'text', placeholder, maxLength, min, max, step, required, textarea, rows = 3 }) {
  const [draft, setDraft] = useState(value ?? '');
  const [touched, setTouched] = useState(false);
  const id = useMemo(() => uid('f'), []);
  const dirty = String(draft ?? '') !== String(value ?? '');
  const commit = () => {
    if (!dirty) return;
    onCommit(type === 'number' ? (draft === '' ? '' : Number(draft)) : draft);
    setTouched(true);
    setTimeout(() => setTouched(false), 1600);
  };
  const Comp = textarea ? Textarea : Input;
  return (
    <Field label={label} hint={hint} htmlFor={id} required={required}>
      <div className="relative">
        <Comp
          id={id} type={type} value={draft} rows={textarea ? rows : undefined}
          min={min} max={max} step={step} maxLength={maxLength} placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter' && !textarea) { e.preventDefault(); commit(); } }}
          className={cn(textarea ? 'pr-9' : 'pr-9')}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" aria-hidden>
          {touched ? <Check className="h-3.5 w-3.5 text-ok" /> : dirty ? <Pencil className="h-3 w-3 text-warn" /> : null}
        </span>
      </div>
    </Field>
  );
}

export default function Profile() {
  const { t, L, lang } = useI18n();
  const {
    user, profile, progress, derived, gaps, roadmapStats, settings, updateSettings, patchProfile,
    updateProgress, rebuildIntelligence, wipeData, toast,
  } = useApp();

  const [skillCat, setSkillCat] = useState('technical');
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  const [addKind, setAddKind] = useState(null); // 'project' | 'cert' | 'experience'
  const [draftItem, setDraftItem] = useState({});
  const [activityDraft, setActivityDraft] = useState({ type: '', title: '', organization: '', year: '', certificateName: '', certificateData: '' });
  const [previewFile, setPreviewFile] = useState(null);
  const fileRef = useRef(null);
  const activityFileRef = useRef(null);

  const personal = profile?.personal || {};
  const education = profile?.education || {};
  const links = profile?.links || {};
  const extraCurricularActivities = profile?.extraCurricularActivities || [];

  const completion = derived?.completion ?? 0;
  const missing = useMemo(() => missingProfileParts(profile || {}, progress || {}), [profile, progress]);

  useEffect(() => () => {
    if (previewFile?.url) URL.revokeObjectURL(previewFile.url);
  }, [previewFile]);

  if (!derived || !profile) return <NeedsProfile />;

  const cityValue = Array.isArray(personal.city) ? personal.city[0] : (personal.city || '');
  const targetRequired = new Set((derived.career?.skills || []).map((s) => s.id));
  const degreeDepartments = DEGREE_DEPARTMENTS[education.degree] || [];
  const semesterOptions = SEMESTERS_BY_DEGREE[education.degree] || [];

  /* --------------------------------- helpers -------------------------------- */
  const save = (label, patch) => {
    patchProfile(patch);
    toast({ title: [`${label[0]} saved`, `${label[1]} सेव हुआ`], body: ['Stored in this browser only.', 'केवल इस ब्राउज़र में सेव।'] });
  };
  const patchPersonal = (patch) => patchProfile((p) => ({ ...p, personal: { ...p.personal, ...patch } }));
  const patchEducation = (patch) => patchProfile((p) => ({ ...p, education: { ...p.education, ...patch } }));
  const patchLinks = (patch) => patchProfile((p) => ({ ...p, links: { ...(p.links || {}), ...patch } }));
  const viewUploadedFile = async (data, name = 'Uploaded file') => {
    if (!data) return;
    try {
      const response = await fetch(data);
      const blob = await response.blob();
      setPreviewFile({ name, type: blob.type, url: URL.createObjectURL(blob) });
    } catch {
      toast({ kind: 'error', title: ['Could not open file', 'फ़ाइल नहीं खुल सकी'], body: ['Please upload the file again and retry.', 'कृपया फ़ाइल फिर से अपलोड करके कोशिश करें।'] });
    }
  };

  const setSkillLevel = (id, lvl) => {
    updateProgress((p) => ({ ...p, skillUpdates: { ...(p.skillUpdates || {}), [id]: lvl } }));
  };

  const onPickPhoto = (file) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ kind: 'error', title: ['Image too large', 'छवि बहुत बड़ी'], body: ['Please choose a file under 50 MB.', 'कृपया 50 MB से छोटी फ़ाइल चुनें।'] });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      patchPersonal({ avatar: String(reader.result) });
      toast({ title: ['Photo updated', 'फ़ोटो अपडेट हुई'], body: ['Saved locally in this browser.', 'इस ब्राउज़र में लोकल सेव।'] });
    };
    reader.onerror = () => toast({ kind: 'error', title: ['Could not read that file', 'फ़ाइल पढ़ी नहीं जा सकी'] });
    reader.readAsDataURL(file);
  };

  const addItem = () => {
    if (addKind === 'project') {
      if (!draftItem.title?.trim()) return;
      const item = {
        id: uid('pr'), title: [draftItem.title.trim(), draftItem.title.trim()],
        desc: [draftItem.desc || '', draftItem.desc || ''], tech: draftItem.tech || '',
        status: draftItem.status || 'in-progress', link: draftItem.link || '',
      };
      patchProfile((p) => ({ ...p, projects: [...(p.projects || []), item] }));
    } else if (addKind === 'cert') {
      if (!draftItem.name?.trim()) return;
      const item = { id: uid('ct'), name: [draftItem.name.trim(), draftItem.name.trim()], issuer: draftItem.issuer || '', year: Number(draftItem.year) || new Date().getFullYear() };
      patchProfile((p) => ({ ...p, certifications: [...(p.certifications || []), item] }));
    } else if (addKind === 'experience') {
      if (!draftItem.role?.trim()) return;
      const item = {
        id: uid('ex'), role: [draftItem.role.trim(), draftItem.role.trim()],
        company: [draftItem.company || '', draftItem.company || ''], period: [draftItem.period || '', draftItem.period || ''],
        bullets: (draftItem.bullets || '').split('\n').map((b) => b.trim()).filter(Boolean),
      };
      patchProfile((p) => ({ ...p, experience: [...(p.experience || []), item] }));
    }
    setAddKind(null);
    setDraftItem({});
    toast({ title: ['Added to profile', 'प्रोफ़ाइल में जोड़ा गया'], body: ['Your resume and scores pick this up immediately.', 'आपका रिज़्यूमे और स्कोर इसे तुरंत ले लेते हैं।'] });
  };

  const handleProfileFile = (file) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ kind: 'error', title: ['File too large', 'फ़ाइल बहुत बड़ी है'], body: ['Please upload a file under 50 MB.', 'कृपया 50 MB से छोटी फ़ाइल अपलोड करें।'] });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      patchPersonal({ avatar: String(reader.result) });
      toast({ title: ['Photo uploaded', 'फ़ोटो अपलोड हुई'], body: ['Saved locally in this browser.', 'इस ब्राउज़र में लोकल सेव।'] });
    };
    reader.readAsDataURL(file);
  };

  const handleActivityCertificate = (file) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ kind: 'error', title: ['Certificate too large', 'सर्टिफिकेट बहुत बड़ा है'], body: ['Please upload a certificate under 50 MB.', 'कृपया 50 MB से छोटी सर्टिफिकेट अपलोड करें।'] });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setActivityDraft((prev) => ({ ...prev, certificateName: file.name, certificateData: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  };

  const addActivity = () => {
    if (!activityDraft.type?.trim() || !activityDraft.title?.trim()) return;
    const item = {
      id: uid('act'),
      type: activityDraft.type.trim(),
      title: activityDraft.title.trim(),
      organization: activityDraft.organization?.trim() || '',
      year: activityDraft.year || new Date().getFullYear(),
      certificateName: activityDraft.certificateName || '',
      certificateData: activityDraft.certificateData || '',
    };
    patchProfile((p) => ({ ...p, extraCurricularActivities: [...(p.extraCurricularActivities || []), item] }));
    setActivityDraft({ type: '', title: '', organization: '', year: '', certificateName: '', certificateData: '' });
    toast({ title: ['Activity added', 'एक्टिविटी जोड़ दी गई'], body: ['Your extracurricular record is saved in the profile.', 'आपकी एक्स्ट्रा करिकुलर रिकॉर्ड प्रोफ़ाइल में सेव हो गया है।'] });
  };

  const removeActivity = (id) => {
    patchProfile((p) => ({ ...p, extraCurricularActivities: (p.extraCurricularActivities || []).filter((a) => a.id !== id) }));
  };

  const removeItem = (kind, id) => {
    patchProfile((p) => ({ ...p, [kind]: (p[kind] || []).filter((x) => x.id !== id) }));
    toast({ kind: 'warn', title: ['Removed', 'हटाया गया'], body: ['The item was deleted from your local profile.', 'वह मद आपके लोकल प्रोफ़ाइल से हटा दिया गया।'] });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile, progress, settings }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `careerx-profile-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast({ title: ['Data exported', 'डेटा निर्यात हुआ'], body: ['A JSON file was downloaded.', 'JSON फ़ाइल डाउनलोड हुई।'] });
  };

  const skillsInCat = SKILLS.filter((s) => s.cat === skillCat);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><User className="h-3 w-3" aria-hidden />{t('nav.profile')}</>}
        title={t('prof.title')}
        sub={L(['Everything the AI reads about you, and every control you have over it.', 'AI आपके बारे में जो पढ़ता है, और उस पर आपका हर नियंत्रण।'])}
        tags={[
          <Badge key="r" tone="ok" icon={Check}>{derived.readiness.score}/100 {t('dash.readiness')}</Badge>,
          <Badge key="c" tone="brand" icon={Sparkles}>{completion}% {t('prof.completion')}</Badge>,
          <AILabel key="ai" />,
        ]}
        actions={
          <>
            <Button
              size="sm"
              variant="primary"
              icon={Pencil}
              onClick={() => document.getElementById('profile-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              {t('prof.edit')}
            </Button>
            <Button size="sm" variant="ghost" icon={Download} onClick={exportData}>{L(['Export', 'निर्यात'])}</Button>
            <Button size="sm" icon={RotateCw} onClick={() => setConfirmRebuild(true)}>{t('career.regenerate')}</Button>
          </>
        }
      />

      {/* identity + completion */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card grad className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/10 blur-3xl" aria-hidden />
          <div className="relative flex flex-wrap items-start gap-4">
            <div className="relative">
              <Avatar name={personal.name || user?.email || 'Student'} src={personal.avatar} size={72} />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-line bg-surface text-muted shadow-sm transition hover:text-brand"
                aria-label={t('prof.uploadPhoto')} title={t('prof.uploadPhoto')}>
                <Camera className="h-3.5 w-3.5" aria-hidden />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="sr-only"
                onChange={(e) => { onPickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-bold">{personal.name || L(['Your name', 'आपका नाम'])}</h2>
              <p className="muted mt-0.5 text-[12.5px]">{user?.email}</p>
              <p className="muted mt-1 text-[12px]">{personal.college || L(['College not set', 'कॉलेज सेट नहीं'])}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="muted" icon={GraduationCap}>{education.degree || '—'}</Badge>
                <Badge tone="muted">{education.branch || '—'}</Badge>
                <Badge tone="brand" icon={Target}>{L(derived.career?.n || ['No target career', 'कोई लक्षित करियर नहीं'])}</Badge>
              </div>
            </div>
          </div>

          <div className="relative mt-4 border-t border-line pt-3.5">
            <div className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{t('prof.avatar')}</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {AVATAR_PRESETS.map((seed, i) => (
                <button key={seed} type="button" onClick={() => patchPersonal({ avatarSeed: seed, avatar: null })}
                  aria-label={`${t('prof.avatar')} ${seed}`} aria-pressed={personal.avatarSeed === seed && !personal.avatar}
                  className={cn('grid h-9 w-9 place-items-center rounded-xl border text-[12px] font-bold text-white transition hover:scale-105',
                    personal.avatarSeed === seed && !personal.avatar ? 'border-brand ring-2 ring-brand/40' : 'border-line')}
                  style={{ background: `linear-gradient(135deg, ${AVATAR_COLORS[i]}, ${AVATAR_COLORS[(i + 3) % AVATAR_COLORS.length]})` }}>
                  {seed.slice(0, 2).toUpperCase()}
                </button>
              ))}
              {personal.avatar ? (
                <Button size="sm" variant="quiet" icon={X} onClick={() => patchPersonal({ avatar: null })}>{L(['Remove photo', 'फ़ोटो हटाएँ'])}</Button>
              ) : (
                <Button size="sm" variant="quiet" icon={Camera} onClick={() => fileRef.current?.click()}>{t('prof.uploadPhoto')}</Button>
              )}
            </div>
            <p className="muted mt-2 text-[11px]">{t('prof.avatarNote')}</p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <ProgressRing value={completion} size={88} stroke={9} tone={completion >= 80 ? 'ok' : completion >= 50 ? 'brand' : 'warn'} label={`${completion}%`} sublabel={t('prof.completion')} />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[15px] font-bold">{completion >= 90 ? L(['Profile looks strong', 'प्रोफ़ाइल मज़बूत दिखती है']) : L(['Complete your profile for better matches', 'बेहतर मैच के लिए प्रोफ़ाइल पूरी करें'])}</h2>
              <p className="muted mt-1 text-[12px] leading-snug">
                {missing.length
                  ? L([`${missing.length} part(s) still missing. Each one directly changes your matches, gaps and readiness score.`, `${missing.length} भाग अभी शेष हैं। हर एक सीधे आपके मैच, गैप और रेडीनेस स्कोर बदलता है।`])
                  : L(['Nothing is missing — every recommendation below is built from a complete profile.', 'कुछ शेष नहीं — नीचे हर सुझाव पूर्ण प्रोफ़ाइल से बना है।'])}
              </p>
              <Meter className="mt-2.5" value={completion} size="sm" tone={completion >= 80 ? 'ok' : 'brand'} right={`${completion}%`} />
            </div>
          </div>
          <div className="mt-3.5 border-t border-line pt-3">
            <div className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['What the AI reads', 'AI क्या पढ़ता है'])}</div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { ok: !!personal.name, k: ['Name', 'नाम'] },
                { ok: !!personal.college, k: ['College', 'कॉलेज'] },
                { ok: !!education.degree && !!education.branch, k: ['Degree & branch', 'डिग्री और ब्रांच'] },
                { ok: !!education.gradYear, k: ['Graduation year', 'स्नातक वर्ष'] },
                { ok: (profile.interests || []).length > 0, k: ['Interests', 'रुचियाँ'] },
                { ok: (profile.careerAreas || []).length > 0, k: ['Career areas', 'करियर क्षेत्र'] },
                { ok: Object.keys(derived.skillMap || {}).length > 8, k: ['Skill ratings', 'स्किल रेटिंग'] },
                { ok: (profile.projects || []).length > 0, k: ['Projects', 'प्रोजेक्ट'] },
                { ok: !!profile.goal, k: ['Career goal', 'करियर लक्ष्य'] },
                { ok: !!profile.workType, k: ['Work type', 'कार्य प्रकार'] },
              ].map((x) => (
                <Badge key={x.k[0]} tone={x.ok ? 'ok' : 'muted'} icon={x.ok ? Check : X}>{L(x.k)}</Badge>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* personal details */}
      <Card id="profile-editor">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-brand" aria-hidden />
          <h2 className="font-display text-[15px] font-bold">{L(['Personal details', 'व्यक्तिगत विवरण'])}</h2>
          <Badge tone="muted" className="ml-auto">{L(['Auto-saves on blur', 'ब्लर पर ऑटो-सेव'])}</Badge>
        </div>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          <AutoField label={t('auth.fullName')} required value={personal.name} placeholder="Aarav Sharma"
            onCommit={(v) => v.trim() && patchPersonal({ name: v.trim() })} />
          <AutoField label={L(['Phone number', 'फ़ोन नंबर'])} value={personal.phone} placeholder="+91 98xxx xxxxx" type="tel"
            onCommit={(v) => patchPersonal({ phone: v })} />
          <AutoField label={t('auth.email')} hint={L(['Sign-in email cannot be changed here.', 'साइन-इन ईमेल यहाँ नहीं बदला जा सकता।'])} value={user?.email}
            onCommit={() => toast({ kind: 'warn', title: ['Email cannot be changed', 'ईमेल नहीं बदला जा सकता'], body: ['Contact your account administrator to update it.', 'ईमेल बदलने के लिए अकाउंट एडमिन से संपर्क करें।'] })} />
          <Field label={t('res.cityLabel')} htmlFor="pf-city">
            <Select id="pf-city" value={CITIES.some((c) => c[0] === cityValue) ? cityValue : ''}
              onChange={(e) => {
                const hit = CITIES.find((c) => c[0] === e.target.value);
                patchPersonal({ city: hit ? [hit[0], hit[1]] : e.target.value });
              }}>
              <option value="">{t('common.select')}</option>
              {CITIES.map((c) => <option key={c[0]} value={c[0]}>{L(c)}</option>)}
            </Select>
          </Field>
          <Field label={L(['State', 'राज्य'])} htmlFor="pf-state">
            <Select id="pf-state" value={personal.state || ''} onChange={(e) => patchPersonal({ state: e.target.value })}>
              <option value="">{t('common.select')}</option>
              {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </Select>
          </Field>
          <Field label={L(['Address', 'पता'])} htmlFor="pf-address">
            <Input id="pf-address" value={personal.address || ''} onChange={(e) => patchPersonal({ address: e.target.value })} placeholder="House no., Street, City, State" />
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface2/40 p-3">
          <div>
            <div className="text-[12.5px] font-semibold">{L(['Profile photo', 'प्रोफ़ाइल फोटो'])}</div>
            <div className="muted text-[11px]">{L(['Upload a clear photo up to 50 MB', '50 MB तक साफ़ फोटो अपलोड करें'])}</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-primary btn-sm">{L(['Upload photo', 'फोटो अपलोड'])}</button>
            {personal.avatar ? <button type="button" onClick={() => viewUploadedFile(personal.avatar, L(['Profile photo', 'प्रोफ़ाइल फोटो']))} className="btn btn-ghost btn-sm"><Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden />{L(['View', 'देखें'])}</button> : null}
            {personal.avatar ? <button type="button" onClick={() => patchPersonal({ avatar: null })} className="btn btn-ghost btn-sm">{L(['Remove', 'हटाएँ'])}</button> : null}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => { handleProfileFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </Card>

      {/* academic details */}
      <Card>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-accent" aria-hidden />
          <h2 className="font-display text-[15px] font-bold">{L(['Academic details', 'शैक्षणिक विवरण'])}</h2>
        </div>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t('auth.degree')} htmlFor="pf-degree">
            <Select id="pf-degree" value={education.degree || ''} onChange={(e) => patchEducation({ degree: e.target.value, department: '', semester: '' })}>
              <option value="">{t('common.select')}</option>
              {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label={L(['Department / Specialization', 'डिपार्टमेंट / स्पेशलाइज़ेशन'])} htmlFor="pf-department">
            <Select id="pf-department" value={education.department || ''} onChange={(e) => patchEducation({ department: e.target.value })} disabled={!degreeDepartments.length}>
              <option value="">{t('common.select')}</option>
              {degreeDepartments.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label={L(['College / Institute', 'कॉलेज / इंस्टीट्यूट'])} htmlFor="pf-academic-college">
            <Select id="pf-academic-college" value={education.college || ''} onChange={(e) => patchEducation({ college: e.target.value })}>
              <option value="">{t('common.select')}</option>
              {INDIAN_COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label={L(['Semester', 'सेमेस्टर'])} htmlFor="pf-semester">
            <Select id="pf-semester" value={education.semester || ''} onChange={(e) => patchEducation({ semester: e.target.value })} disabled={!semesterOptions.length}>
              <option value="">{t('common.select')}</option>
              {semesterOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </Field>
        </div>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <AutoField label={t('onb.cgpa')} type="number" min="0" max="10" step="0.1" value={education.cgpa ?? ''} placeholder="8.2"
            onCommit={(v) => patchEducation({ cgpa: v === '' ? null : clamp(Number(v), 0, 10) })} />
          <Field label={t('auth.gradYear')} htmlFor="pf-year">
            <Select id="pf-year" value={education.gradYear || ''} onChange={(e) => patchEducation({ gradYear: Number(e.target.value) })}>
              <option value="">{t('common.select')}</option>
              {ACADEMIC_YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-brand" aria-hidden />
          <h2 className="font-display text-[15px] font-bold">{L(['12th details', '12वीं की जानकारी'])}</h2>
        </div>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={L(['Roll number', 'रोल नंबर'])} htmlFor="twelfth-roll">
            <Input id="twelfth-roll" value={education.twelfth?.rollNo || ''} onChange={(e) => patchEducation({ twelfth: { ...(education.twelfth || {}), rollNo: e.target.value } })} />
          </Field>
          <Field label={L(['Board', 'बोर्ड'])} htmlFor="twelfth-board">
            <Select id="twelfth-board" value={education.twelfth?.board || ''} onChange={(e) => patchEducation({ twelfth: { ...(education.twelfth || {}), board: e.target.value } })}>
              <option value="">{t('common.select')}</option>
              {INDIAN_BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </Select>
          </Field>
          <Field label={L(['Passout year', 'पासआउट वर्ष'])} htmlFor="twelfth-year">
            <Select id="twelfth-year" value={education.twelfth?.passoutYear || ''} onChange={(e) => patchEducation({ twelfth: { ...(education.twelfth || {}), passoutYear: e.target.value } })}>
              <option value="">{t('common.select')}</option>
              {TWELFTH_PASSOUT_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </Field>
          <Field label={L(['Percentage', 'प्रतिशत'])} htmlFor="twelfth-percentage">
            <Input id="twelfth-percentage" type="number" min="0" max="100" step="0.01" value={education.twelfth?.percentage ?? ''} onChange={(e) => patchEducation({ twelfth: { ...(education.twelfth || {}), percentage: e.target.value } })} placeholder="85.5" />
          </Field>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent" aria-hidden />
          <h2 className="font-display text-[15px] font-bold">{L(['10th details', '10वीं की जानकारी'])}</h2>
        </div>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={L(['Roll number', 'रोल नंबर'])} htmlFor="tenth-roll">
            <Input id="tenth-roll" value={education.tenth?.rollNo || ''} onChange={(e) => patchEducation({ tenth: { ...(education.tenth || {}), rollNo: e.target.value } })} />
          </Field>
          <Field label={L(['Board', 'बोर्ड'])} htmlFor="tenth-board">
            <Select id="tenth-board" value={education.tenth?.board || ''} onChange={(e) => patchEducation({ tenth: { ...(education.tenth || {}), board: e.target.value } })}>
              <option value="">{t('common.select')}</option>
              {INDIAN_BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </Select>
          </Field>
          <Field label={L(['Passout year', 'पासआउट वर्ष'])} htmlFor="tenth-year">
            <Select id="tenth-year" value={education.tenth?.passoutYear || ''} onChange={(e) => patchEducation({ tenth: { ...(education.tenth || {}), passoutYear: e.target.value } })}>
              <option value="">{t('common.select')}</option>
              {TENTH_PASSOUT_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </Field>
          <Field label={L(['Percentage', 'प्रतिशत'])} htmlFor="tenth-percentage">
            <Input id="tenth-percentage" type="number" min="0" max="100" step="0.01" value={education.tenth?.percentage ?? ''} onChange={(e) => patchEducation({ tenth: { ...(education.tenth || {}), percentage: e.target.value } })} placeholder="85.5" />
          </Field>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-ok" aria-hidden />
          <h2 className="font-display text-[15px] font-bold">{L(['Extra curricular activities', 'एक्स्ट्रा करिकुलर एक्टिविटीज़'])}</h2>
        </div>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          <Field label={L(['Activity type', 'एक्टिविटी प्रकार'])} htmlFor="activity-type">
            <Select id="activity-type" value={activityDraft.type || ''} onChange={(e) => setActivityDraft((d) => ({ ...d, type: e.target.value }))}>
              <option value="">{t('common.select')}</option>
              {ACTIVITY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </Select>
          </Field>
          <Field label={L(['Activity title', 'एक्टिविटी शीर्षक'])} htmlFor="activity-title">
            <Input id="activity-title" value={activityDraft.title || ''} onChange={(e) => setActivityDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Inter-school football tournament" />
          </Field>
          <Field label={L(['Organization / Club', 'संगठन / क्लब'])} htmlFor="activity-org">
            <Input id="activity-org" value={activityDraft.organization || ''} onChange={(e) => setActivityDraft((d) => ({ ...d, organization: e.target.value }))} placeholder="College Sports Council" />
          </Field>
          <Field label={L(['Year', 'वर्ष'])} htmlFor="activity-year">
            <Select id="activity-year" value={activityDraft.year || ''} onChange={(e) => setActivityDraft((d) => ({ ...d, year: e.target.value }))}>
              <option value="">{t('common.select')}</option>
              {ACADEMIC_YEAR_OPTIONS.filter((year) => year >= 1930 && year <= 2030).map((year) => <option key={year} value={year}>{year}</option>)}
            </Select>
          </Field>
          <div className="flex flex-wrap items-end gap-2">
            <Field label={L(['Certificate', 'सर्टिफिकेट'])} className="flex-1">
              <div className="flex min-h-10 items-center gap-2">
                <input ref={activityFileRef} type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => { handleActivityCertificate(e.target.files?.[0]); e.target.value = ''; }} />
                <Button size="sm" variant="ghost" icon={Upload} onClick={() => activityFileRef.current?.click()}>{L(['Upload', 'अपलोड'])}</Button>
                {activityDraft.certificateName ? <span className="min-w-0 flex-1 truncate text-[11px] text-muted" title={activityDraft.certificateName}>{activityDraft.certificateName}</span> : null}
                {activityDraft.certificateData ? <Badge tone="ok" icon={Check}>{L(['Uploaded', 'अपलोड हो गया'])}</Badge> : null}
                {activityDraft.certificateData ? <Button size="sm" variant="quiet" icon={Eye} onClick={() => viewUploadedFile(activityDraft.certificateData, activityDraft.certificateName)}>{L(['View', 'देखें'])}</Button> : null}
              </div>
            </Field>
            <Button size="sm" variant="primary" onClick={addActivity}>{L(['Add activity', 'एक्टिविटी जोड़ें'])}</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {extraCurricularActivities.length ? extraCurricularActivities.map((activity) => (
            <div key={activity.id} className="rounded-xl border border-line bg-surface2/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[12.5px] font-semibold">{activity.title}</div>
                  <div className="muted text-[11px]">{activity.type} · {activity.organization || '—'} · {activity.year || '—'}</div>
                </div>
                <button type="button" onClick={() => removeActivity(activity.id)} className="rounded p-1 text-muted hover:text-bad" aria-label={t('common.delete')}><X className="h-3 w-3" aria-hidden /></button>
              </div>
              {activity.certificateName ? <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="min-w-0 flex-1 truncate text-[11px] text-brand" title={activity.certificateName}>{activity.certificateName}</span><Badge tone="ok" icon={Check}>{L(['Uploaded', 'अपलोड हो गया'])}</Badge><Button size="sm" variant="quiet" icon={Eye} onClick={() => viewUploadedFile(activity.certificateData, activity.certificateName)}>{L(['View', 'देखें'])}</Button></div> : null}
            </div>
          )) : <div className="sm:col-span-2"><EmptyState className="py-4" icon={Award} title={L(['No activities added', 'कोई एक्टिविटी नहीं'])} body={L(['Add sports, arts, volunteering or tech events.', 'स्पोर्ट्स, आर्ट्स, वॉलंटियरिंग या टेक इवेंट जोड़ें।'])} /></div>}
        </div>
      </Card>

      {/* skills */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Wrench className="h-4 w-4 text-brand" aria-hidden />
          <h2 className="font-display text-[15px] font-bold">{L(['Self-rated skills', 'स्व-मूल्यांकित कौशल'])}</h2>
          <Badge tone="muted">{Object.keys(derived.skillMap || {}).filter((k) => derived.skillMap[k] > 0).length} {L(['rated', 'रेट किए'])}</Badge>
          <Tooltip label={L(['Changing a rating instantly recomputes gaps, matches and readiness.', 'रेटिंग बदलते ही गैप, मैच और रेडीनेस फिर बनते हैं।'])}>
            <span className="muted ml-auto inline-flex items-center gap-1 text-[10.5px]"><Sparkles className="h-3 w-3" aria-hidden />{t('common.live')}</span>
          </Tooltip>
        </div>

        <Tabs className="mt-3.5" value={skillCat} onChange={setSkillCat}
          tabs={CATS.map((c) => ({ id: c.id, icon: c.icon, label: t(c.key), count: SKILLS.filter((s) => s.cat === c.id).length }))} />

        <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
          {skillsInCat.map((s) => {
            const lvl = derived.skillMap?.[s.id] ?? 0;
            const needed = targetRequired.has(s.id);
            const labelId = `sk-${s.id}`;
            return (
              <div key={s.id} className={cn('rounded-xl border p-2.5 transition', needed ? 'border-brand/30 bg-brand/[0.05]' : 'border-line bg-surface2/40')}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span id={labelId} className="block truncate text-[12.5px] font-semibold">{L(s.n)}</span>
                    <span className="muted text-[10.5px]">{needed ? L([`Needed for ${L(derived.career?.n || ['', ''])}`, `${L(derived.career?.n || ['', ''])} के लिए आवश्यक`]) : L(['Optional for your target', 'आपके लक्ष्य के लिए वैकल्पिक'])}</span>
                  </div>
                  {needed ? <Badge tone="brand" icon={Target}>{L(['Target needs this', 'लक्ष्य को यह चाहिए'])}</Badge> : null}
                </div>
                <div className="mt-2">
                  <SkillLevelPicker value={lvl} labelledBy={labelId} onChange={(v) => setSkillLevel(s.id, v)} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <DemoTag />
          <span className="muted text-[10.5px]">{L(['These are your own ratings — CareerX never claims they are assessed scores.', 'ये आपकी स्वयं की रेटिंग हैं — CareerX इन्हें आकलित स्कोर नहीं कहता।'])}</span>
          <Button size="sm" variant="ghost" className="ml-auto" to="/app/skill-gap" iconRight={Check}>{t('nav.skillgap')}</Button>
        </div>
      </Card>

      {/* goals & preferences */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-ok" aria-hidden />
            <h2 className="font-display text-[15px] font-bold">{L(['Goal & preferences', 'लक्ष्य और प्राथमिकताएँ'])}</h2>
          </div>
          <div className="mt-4 space-y-3.5">
            <Field label={t('prof.careerGoal')} htmlFor="pf-goal">
              <Select id="pf-goal" value={CAREER_GOALS.some((g) => g[0] === profile.goal) ? profile.goal : ''}
                onChange={(e) => {
                  const hit = CAREER_GOALS.find((g) => g[0] === e.target.value);
                  patchProfile({ goal: hit ? hit[0] : e.target.value });
                }}>
                <option value="">{t('common.select')}</option>
                {CAREER_GOALS.map((g) => <option key={g[0]} value={g[0]}>{L(g)}</option>)}
              </Select>
            </Field>
            <AutoField label={t('prof.careerGoal')} hint={L(['Or write your own goal', 'या अपना लक्ष्य लिखें'])} textarea rows={2} value={profile.goal}
              onCommit={(v) => patchProfile({ goal: v })} />
            <Field label={t('onb.workType')} htmlFor="pf-work">
              <Segmented value={profile.workType || 'any'} onChange={(v) => patchProfile({ workType: v })}
                options={WORK_TYPES.map((w) => ({ value: w.id, label: L(w.n) }))} />
            </Field>
            <AutoField label={t('onb.locationPref')} hint={L(['Cities you would consider for work', 'काम के लिए आप किन शहरों पर विचार करेंगे'])} value={profile.locationPref}
              placeholder="Bengaluru, Pune, Remote (India)" onCommit={(v) => patchProfile({ locationPref: v })} />
            <div>
              <div className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{t('career.interests')}</div>
              <div className="flex flex-wrap gap-1.5">
                {INTERESTS.map((x) => {
                  const on = (profile.interests || []).includes(x.id);
                  return (
                    <Chip key={x.id} active={on} onClick={() => patchProfile({ interests: on ? (profile.interests || []).filter((i) => i !== x.id) : [...(profile.interests || []), x.id] })}>
                      {L(x.n)}
                    </Chip>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{t('onb.s6')}</div>
              <div className="flex flex-wrap gap-1.5">
                {CAREERS.map((c) => {
                  const on = (profile.careerAreas || []).includes(c.id);
                  const isTarget = profile.targetCareer === c.id;
                  return (
                    <Chip key={c.id} active={on || isTarget} icon={isTarget ? Target : undefined}
                      onClick={() => patchProfile({ careerAreas: on && !isTarget ? (profile.careerAreas || []).filter((i) => i !== c.id) : [...new Set([...(profile.careerAreas || []), c.id])] })}>
                      {L(c.n)}
                    </Chip>
                  );
                })}
              </div>
              <Button size="sm" variant="ghost" className="mt-2.5" to="/app/ai-career" iconRight={Check}>{L(['Change target career', 'लक्षित करियर बदलें'])}</Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-accent" aria-hidden />
              <h2 className="font-display text-[15px] font-bold">{L(['Links & profiles', 'लिंक और प्रोफ़ाइल'])}</h2>
            </div>
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              <AutoField label="GitHub" value={links.github} placeholder="github.com/yourname" onCommit={(v) => patchLinks({ github: v })} />
              <AutoField label="LinkedIn" value={links.linkedin} placeholder="linkedin.com/in/yourname" onCommit={(v) => patchLinks({ linkedin: v })} />
              <AutoField label={L(['Portfolio / website', 'पोर्टफ़ोलियो / वेबसाइट'])} value={links.portfolio} placeholder="yourname.dev" onCommit={(v) => patchLinks({ portfolio: v })} />
              <AutoField label={t('prof.resumeLink')} value={links.resume} placeholder={L(['Drive or hosted PDF link', 'ड्राइव या होस्टेड PDF लिंक'])} onCommit={(v) => patchLinks({ resume: v })} />
            </div>
            <p className="muted mt-2.5 text-[11px]">{L(['Links are used by the resume builder and are not fetched or verified.', 'लिंक रिज़्यूमे बिल्डर में उपयोग होते हैं; इन्हें फ़ेच या सत्यापित नहीं किया जाता।'])}</p>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-warn" aria-hidden />
              <h2 className="font-display text-[15px] font-bold">{t('prof.dangerZone')}</h2>
            </div>
            <p className="muted mt-1.5 text-[12px] leading-relaxed">{L(['Everything below lives in this browser only. Export first if you want a copy.', 'नीचे की हर चीज़ केवल इस ब्राउज़र में है। कॉपी चाहिए तो पहले निर्यात करें।'])}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" icon={Download} onClick={exportData}>{L(['Export my data', 'मेरा डेटा निर्यात करें'])}</Button>
              <Button size="sm" variant="ghost" icon={RotateCw} onClick={() => setConfirmRebuild(true)}>{t('career.regenerate')}</Button>
              <Button size="sm" variant="danger" icon={Trash2} onClick={() => setConfirmWipe(true)}>{t('prof.deleteData')}</Button>
            </div>
            <div className="mt-3 flex flex-wrap items-start gap-2 rounded-xl border border-line bg-surface2/40 p-2.5">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
              <p className="muted text-[11px] leading-relaxed">
                {L(['Your account data is stored in this browser. Do not reuse a sensitive password; see Privacy & Trust for storage details.',
                  'आपके खाते का डेटा इस ब्राउज़र में सेव है। संवेदनशील पासवर्ड दोबारा उपयोग न करें; स्टोरेज जानकारी के लिए गोपनीयता और भरोसा देखें।'])}
              </p>
            </div>
            <Button size="sm" variant="quiet" className="mt-2.5" to="/privacy" iconRight={ArrowRight}>{t('trust.title')}</Button>
          </Card>
        </div>
      </div>

      {/* projects / experience / certifications */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Briefcase className="h-4 w-4 text-brand" aria-hidden />
          <h2 className="font-display text-[15px] font-bold">{L(['Projects, experience & certifications', 'प्रोजेक्ट, अनुभव और प्रमाणपत्र'])}</h2>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Button size="sm" variant="ghost" icon={Plus} onClick={() => { setAddKind('project'); setDraftItem({}); }}>{L(['Project', 'प्रोजेक्ट'])}</Button>
            <Button size="sm" variant="ghost" icon={Plus} onClick={() => { setAddKind('experience'); setDraftItem({}); }}>{L(['Experience', 'अनुभव'])}</Button>
            <Button size="sm" variant="ghost" icon={Plus} onClick={() => { setAddKind('cert'); setDraftItem({}); }}>{t('prof.addCert')}</Button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* projects */}
          <div>
            <h3 className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{t('lab.title')} · {(profile.projects || []).length}</h3>
            {(profile.projects || []).length ? (
              <ul className="space-y-2">
                {(profile.projects || []).map((p) => (
                  <li key={p.id} className="rounded-xl border border-line bg-surface2/40 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 text-[12.5px] font-semibold leading-snug">{L(p.title)}</span>
                      <button type="button" onClick={() => removeItem('projects', p.id)} className="shrink-0 rounded p-1 text-muted transition hover:text-bad" aria-label={t('common.delete')}>
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </div>
                    {p.desc?.[0] ? <p className="muted mt-1 line-clamp-2 text-[11px] leading-snug">{L(p.desc)}</p> : null}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.status ? (
                        <Badge tone={p.status === 'completed' ? 'ok' : 'brand'}>
                          {p.status === 'completed' ? t('common.completed') : p.status === 'in-progress' ? L(['In progress', 'जारी']) : L(['Planned', 'योजना'])}
                        </Badge>
                      ) : null}
                      {p.tech ? <Badge tone="muted">{p.tech}</Badge> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : <EmptyState className="py-4" icon={BookOpen} title={L(['No projects added', 'कोई प्रोजेक्ट नहीं'])} body={L(['Add one — it feeds your resume and readiness score.', 'एक जोड़ें — यह आपके रिज़्यूमे और रेडीनेस को भरता है।'])} />}
          </div>

          {/* experience */}
          <div>
            <h3 className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Experience', 'अनुभव'])} · {(profile.experience || []).length}</h3>
            {(profile.experience || []).length ? (
              <ul className="space-y-2">
                {(profile.experience || []).map((x) => (
                  <li key={x.id} className="rounded-xl border border-line bg-surface2/40 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 text-[12.5px] font-semibold leading-snug">{L(x.role)}</span>
                      <button type="button" onClick={() => removeItem('experience', x.id)} className="shrink-0 rounded p-1 text-muted transition hover:text-bad" aria-label={t('common.delete')}>
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </div>
                    <div className="muted mt-0.5 text-[11px]">{L(x.company)}{x.period?.[0] ? ` · ${L(x.period)}` : ''}</div>
                    {x.bullets?.length ? (
                      <ul className="muted mt-1.5 space-y-1 text-[11px] leading-snug">
                        {x.bullets.slice(0, 3).map((b, i) => <li key={i} className="flex gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" aria-hidden />{b}</li>)}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : <EmptyState className="py-4" icon={Briefcase} title={L(['No experience added', 'कोई अनुभव नहीं'])} body={L(['Internships and campus roles count too.', 'इंटर्नशिप और कैंपस भूमिकाएँ भी गिनी जाती हैं।'])} />}
          </div>

          {/* certifications */}
          <div>
            <h3 className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{t('prof.certs')} · {(profile.certifications || []).length}</h3>
            {(profile.certifications || []).length ? (
              <ul className="space-y-2">
                {(profile.certifications || []).map((c) => (
                  <li key={c.id} className="rounded-xl border border-line bg-surface2/40 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 text-[12.5px] font-semibold leading-snug">{L(c.name)}</span>
                      <button type="button" onClick={() => removeItem('certifications', c.id)} className="shrink-0 rounded p-1 text-muted transition hover:text-bad" aria-label={t('common.delete')}>
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </div>
                    <div className="muted mt-0.5 text-[11px]">{c.issuer || L(['Issuer not set', 'जारीकर्ता सेट नहीं'])} · {c.year || '—'}</div>
                  </li>
                ))}
              </ul>
            ) : <EmptyState className="py-4" icon={Award} title={L(['No certifications yet', 'अभी कोई प्रमाणपत्र नहीं'])} body={L(['Finished courses appear here once you add them.', 'पूरे किए कोर्स यहाँ जोड़ने पर दिखते हैं।'])} />}
          </div>
        </div>
      </Card>

      {/* progress summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-[15px] font-bold">{t('prof.progressSummary')}</h2>
          <KeyValue className="mt-3.5" items={[
            { k: t('dash.readiness'), v: `${derived.readiness.score}/100 (${derived.readiness.career})` },
            { k: t('dash.employability'), v: `${derived.employability.score}/100` },
            { k: t('prof.completion'), v: `${completion}%` },
            { k: t('gap.title'), v: `${gaps.filter((g) => g.status !== 'met').length} ${L(['open', 'खुले'])}` },
            { k: t('nav.roadmap'), v: `${roadmapStats.done}/${roadmapStats.total} (${roadmapStats.pct}%)` },
            { k: t('nav.resume'), v: `${derived.resume.score}/100` },
            { k: t('nav.interview'), v: derived.interview.best ? `${derived.interview.best}/100 · ${derived.interview.attempts} ${L(['attempts', 'प्रयास'])}` : L(['No session yet', 'अभी कोई सत्र नहीं']) },
            { k: t('job.title'), v: `${(progress.applications || []).length} ${L(['saved', 'सेव'])}` },
            { k: t('nav.gov'), v: `${(progress.trackedGov || []).length} ${L(['tracked', 'ट्रैक'])}` },
            { k: t('ach.title'), v: `${Object.keys(progress.badges || {}).length} ${L(['badges', 'बैज'])}` },
          ]} />
          <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
            <Button size="sm" variant="ghost" to="/app/achievements" iconRight={ArrowRight}>{t('nav.achievements')}</Button>
            <Button size="sm" variant="quiet" to="/app/challenge">{t('nav.challenge')}</Button>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-[15px] font-bold">{L(['App preferences', 'ऐप प्राथमिकताएँ'])}</h2>
          <p className="muted mt-1 text-[12px]">{L(['Language and theme can also be changed from the top bar at any time.', 'भाषा और थीम किसी भी समय टॉप बार से भी बदली जा सकती हैं।'])}</p>
          <div className="mt-3.5 space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface2/40 p-3">
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold">{L(['Voice input', 'वॉइस इनपुट'])}</div>
                <div className="muted text-[11px]">{L(['Use the microphone in the AI mentor and mock interview', 'AI मेंटर और मॉक इंटरव्यू में माइक्रोफ़ोन उपयोग करें'])}</div>
              </div>
              <Switch checked={settings.voiceInput !== false} onChange={(v) => updateSettings({ voiceInput: v })} label={L(['Voice input', 'वॉइस इनपुट'])} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface2/40 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold"><Volume2 className="h-3.5 w-3.5 text-brand" aria-hidden />{L(['Read AI answers aloud', 'AI उत्तर बोलकर सुनाएँ'])}</div>
                <div className="muted text-[11px]">{L(['Uses your browser’s speech synthesis; nothing is uploaded', 'आपके ब्राउज़र का स्पीच सिंथेसिस; कुछ भी अपलोड नहीं होता'])}</div>
              </div>
              <Switch checked={!!settings.tts} onChange={(v) => updateSettings({ tts: v })} label={L(['Read AI answers aloud', 'AI उत्तर बोलकर सुनाएँ'])} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface2/40 p-3">
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold">{L(['Reduce motion', 'गति कम करें'])}</div>
                <div className="muted text-[11px]">{L(['Shorten reveal and chart animations', 'रिवील और चार्ट एनिमेशन छोटे करें'])}</div>
              </div>
              <Switch checked={!!settings.reducedMotion} onChange={(v) => updateSettings({ reducedMotion: v })} label={L(['Reduce motion', 'गति कम करें'])} />
            </div>
          </div>
          <DemoNotice className="mt-3.5" tone="brand" icon={AlertTriangle}>
            {L(['Preferences are stored locally with your profile. A production build would sync them to your account on a server.',
              'प्राथमिकताएँ आपकी प्रोफ़ाइल के साथ लोकल सेव होती हैं। प्रोडक्शन बिल्ड इन्हें सर्वर पर आपके खाते से सिंक करेगा।'])}
          </DemoNotice>
        </Card>
      </div>

      <Modal
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        title={previewFile?.name || L(['File preview', 'फ़ाइल प्रीव्यू'])}
        icon={Eye}
        footer={<Button variant="ghost" onClick={() => setPreviewFile(null)}>{t('common.close')}</Button>}
      >
        {previewFile?.type === 'application/pdf' ? (
          <iframe title={previewFile.name} src={previewFile.url} className="h-[70vh] min-h-80 w-full rounded-lg border border-line bg-white" />
        ) : previewFile ? (
          <img src={previewFile.url} alt={previewFile.name} className="mx-auto max-h-[70vh] max-w-full rounded-lg object-contain" />
        ) : null}
      </Modal>

      {/* add item modal */}
      <Modal
        open={!!addKind}
        onClose={() => { setAddKind(null); setDraftItem({}); }}
        title={addKind === 'project' ? L(['Add a project', 'प्रोजेक्ट जोड़ें']) : addKind === 'cert' ? t('prof.addCert') : L(['Add experience', 'अनुभव जोड़ें'])}
        icon={addKind === 'project' ? BookOpen : addKind === 'cert' ? Award : Briefcase}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setAddKind(null); setDraftItem({}); }}>{t('common.cancel')}</Button>
            <Button icon={Save} onClick={addItem}>{t('common.save')}</Button>
          </>
        }
      >
        {addKind === 'project' ? (
          <div className="space-y-3">
            <Field label={L(['Project title', 'प्रोजेक्ट शीर्षक'])} required htmlFor="np-title">
              <Input id="np-title" value={draftItem.title || ''} onChange={(e) => setDraftItem((d) => ({ ...d, title: e.target.value }))} placeholder="Campus Event Portal" />
            </Field>
            <Field label={L(['What it does & your role', 'यह क्या करता है और आपकी भूमिका'])} htmlFor="np-desc">
              <Textarea id="np-desc" rows={3} value={draftItem.desc || ''} onChange={(e) => setDraftItem((d) => ({ ...d, desc: e.target.value }))} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={L(['Tech used', 'उपयोग की गई तकनीक'])} htmlFor="np-tech">
                <Input id="np-tech" value={draftItem.tech || ''} onChange={(e) => setDraftItem((d) => ({ ...d, tech: e.target.value }))} placeholder="React, Node.js, MySQL" />
              </Field>
              <Field label={L(['Status', 'स्थिति'])} htmlFor="np-status">
                <Select id="np-status" value={draftItem.status || 'in-progress'} onChange={(e) => setDraftItem((d) => ({ ...d, status: e.target.value }))}>
                  <option value="planned">{L(['Planned', 'योजना'])}</option>
                  <option value="in-progress">{L(['In progress', 'जारी'])}</option>
                  <option value="completed">{t('common.completed')}</option>
                </Select>
              </Field>
            </div>
            <Field label={L(['Link (optional)', 'लिंक (वैकल्पिक)'])} htmlFor="np-link">
              <Input id="np-link" value={draftItem.link || ''} onChange={(e) => setDraftItem((d) => ({ ...d, link: e.target.value }))} placeholder="github.com/you/project" />
            </Field>
          </div>
        ) : null}

        {addKind === 'cert' ? (
          <div className="space-y-3">
            <Field label={t('prof.certName')} required htmlFor="nc-name">
              <Input id="nc-name" value={draftItem.name || ''} onChange={(e) => setDraftItem((d) => ({ ...d, name: e.target.value }))} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('prof.certIssuer')} htmlFor="nc-issuer">
                <Input id="nc-issuer" value={draftItem.issuer || ''} onChange={(e) => setDraftItem((d) => ({ ...d, issuer: e.target.value }))} />
              </Field>
              <Field label={t('prof.certYear')} htmlFor="nc-year">
                <Input id="nc-year" type="number" min="1990" max="2100" value={draftItem.year || ''} onChange={(e) => setDraftItem((d) => ({ ...d, year: e.target.value }))} />
              </Field>
            </div>
          </div>
        ) : null}

        {addKind === 'experience' ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={L(['Role', 'भूमिका'])} required htmlFor="ne-role">
                <Input id="ne-role" value={draftItem.role || ''} onChange={(e) => setDraftItem((d) => ({ ...d, role: e.target.value }))} placeholder="Web Development Intern" />
              </Field>
              <Field label={L(['Organisation', 'संस्था'])} htmlFor="ne-company">
                <Input id="ne-company" value={draftItem.company || ''} onChange={(e) => setDraftItem((d) => ({ ...d, company: e.target.value }))} />
              </Field>
            </div>
            <Field label={L(['Period', 'अवधि'])} htmlFor="ne-period">
              <Input id="ne-period" value={draftItem.period || ''} onChange={(e) => setDraftItem((d) => ({ ...d, period: e.target.value }))} placeholder="Jun 2025 – Aug 2025" />
            </Field>
            <Field label={L(['Achievements — one per line', 'उपलब्धियाँ — एक प्रति पंक्ति'])} hint={L(['Start each line with an action verb and add a number where you can.', 'हर पंक्ति एक्शन वर्ब से शुरू करें और जहाँ संभव हो संख्या जोड़ें।'])} htmlFor="ne-bullets">
              <Textarea id="ne-bullets" rows={4} value={draftItem.bullets || ''} onChange={(e) => setDraftItem((d) => ({ ...d, bullets: e.target.value }))} />
            </Field>
          </div>
        ) : null}
      </Modal>

      {/* rebuild confirm */}
      <Modal
        open={confirmRebuild}
        onClose={() => setConfirmRebuild(false)}
        title={t('career.regenerate')}
        icon={RotateCw}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRebuild(false)}>{t('common.cancel')}</Button>
            <Button icon={RotateCw} onClick={() => { rebuildIntelligence(); setConfirmRebuild(false); }}>{t('career.regenerate')}</Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-muted">
          {L(['Regenerates your roadmap, skill gaps and 30-60-90 challenge from the profile you just edited. Ticked tasks and saved items are kept where they still apply.',
            'आपकी अभी संपादित प्रोफ़ाइल से रोडमैप, स्किल गैप और 30-60-90 चुनौती दोबारा बनती है। टिक किए कार्य और सेव की गई चीज़ें जहाँ लागू हों बनी रहती हैं।'])}
        </p>
      </Modal>

      {/* wipe confirm */}
      <Modal
        open={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        title={t('prof.deleteData')}
        icon={Trash2}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmWipe(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" icon={Trash2} onClick={() => { wipeData(); setConfirmWipe(false); }}>{t('prof.deleteData')}</Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-muted">{t('prof.deleteConfirm')}</p>
        <div className="mt-3">
          <Button size="sm" variant="quiet" icon={Download} onClick={exportData}>{L(['Download a copy first', 'पहले कॉपी डाउनलोड करें'])}</Button>
        </div>
      </Modal>
    </div>
  );
}

