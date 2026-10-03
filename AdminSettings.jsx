import { useEffect, useMemo, useState } from 'react';
import {
  Settings2, Building2, Save, Palette, Languages, Volume2, Mic, Activity, Plug,
  Database, Trash2, Download, ShieldCheck, AlertTriangle, Check, KeyRound,
  Server, Info, ArrowRight, RotateCw, Eye,
} from 'lucide-react';
import { useI18n, LANGS } from '../../i18n';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../store/AppStore';
import {
  PageHeader, Card, Badge, Button, Input, Field, Switch, Segmented, Modal, DemoTag,
  KeyValue, Meter, Divider,
} from '../../components/ui/primitives';
import { DemoNotice } from '../../components/app/parts';
import storage from '../../lib/storage';
import { getCohort } from '../../services/adminService';
import { sttSupported, ttsSupported } from '../../services/speechService';
import { cn } from '../../lib/utils';

const DEFAULTS = {
  institution: 'Institution name',
  city: 'Bhopal',
  placementHead: 'Placement cell head',
  contactEmail: 'placement@example.edu.in',
  website: 'https://example.edu.in',
  academicYear: '2026–27',
  cohortNote: 'Final-year B.Tech cohort',
};

/* Server-side variables a real deployment would provide. Values are NEVER stored
   in the client — this list only documents the integration points. */
const INTEGRATIONS = [
  { id: 'ai', var: 'VITE_AI_PROVIDER (server-side key: AI_API_KEY)', where: 'src/services/aiService.js', purpose: ['Hosted LLM for the mentor chat and answer evaluation', 'मेंटर चैट और उत्तर मूल्यांकन के लिए होस्टेड LLM'] },
  { id: 'jobs', var: 'JOB_FEED_NAUKRI_URL · JOB_FEED_UNSTOP_JOBS_URL · JOB_FEED_LINKEDIN_JOBS_URL', where: 'server/jobFeedService.js', purpose: ['HTTPS RSS/Atom job feeds; private APIs and HTML scraping are not used.', 'HTTPS RSS/Atom job feeds; private API या HTML scraping उपयोग नहीं होते।'] },
  { id: 'internships', var: 'JOB_FEED_UNSTOP_INTERNSHIPS_URL · JOB_FEED_LINKEDIN_INTERNSHIPS_URL · JOB_FEED_NAUKRI_INTERNSHIPS_URL', where: 'server/jobFeedService.js', purpose: ['Authorized RSS/Atom internship feeds.', 'Authorized RSS/Atom internship feeds।'] },
  { id: 'courses', var: 'COURSE_CATALOGUE_API_KEY', where: 'src/services/courseService.js', purpose: ['Real course catalogue with provider metadata', 'प्रदाता मेटाडेटा के साथ वास्तविक कोर्स कैटलॉग'] },
  { id: 'auth', var: 'AUTH_PROVIDER_URL', where: 'src/services/authService.js', purpose: ['Server-side identity, hashed credentials and sessions', 'सर्वर-साइड पहचान, हैश किए क्रेडेंशियल और सेशन'] },
  { id: 'gov', var: 'GOV_FEED_UPSC_URL · GOV_FEED_SSC_URL · GOV_FEED_MPPSC_URL · GOV_FEED_NCS_URL', where: 'server/jobFeedService.js', purpose: ['Official government HTTPS RSS/Atom feeds.', 'सरकारी वेबसाइटों की official HTTPS RSS/Atom feeds।'] },
];

function reportLabel(value) {
  return String(value).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function reportScalar(value) {
  if (value == null || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^data:image\/[^;]+;base64,/i.test(value)) return '[Image omitted from text report]';
  return String(value);
}

function formatReportValue(value, depth = 0) {
  const indent = '  '.repeat(depth);
  if (Array.isArray(value)) {
    if (!value.length) return `${indent}None`;
    return value.map((item, index) => {
      if (item && typeof item === 'object') return `${indent}Item ${index + 1}:\n${formatReportValue(item, depth + 1)}`;
      return `${indent}- ${reportScalar(item)}`;
    }).join('\n');
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return `${indent}No data`;
    return entries.map(([key, item]) => {
      const label = reportLabel(key);
      if (item && typeof item === 'object') return `${indent}${label}:\n${formatReportValue(item, depth + 1)}`;
      return `${indent}${label}: ${reportScalar(item)}`;
    }).join('\n');
  }
  return `${indent}${reportScalar(value)}`;
}

export default function AdminSettings() {
  const { t, L, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const { user, settings, updateSettings, profile, progress, wipeData, toast } = useApp();
  const cohort = useMemo(() => getCohort(), []);
  const settingsKey = user?.id ? `adminSettings:${user.id}` : 'adminSettings';
  const accountDefaults = {
    institution: user?.institution || DEFAULTS.institution,
    city: user?.city || DEFAULTS.city,
    placementHead: user?.placementHead || DEFAULTS.placementHead,
    contactEmail: user?.contactEmail || DEFAULTS.contactEmail,
    website: user?.website || DEFAULTS.website,
    academicYear: user?.academicYear || DEFAULTS.academicYear,
    cohortNote: user?.cohortNote || DEFAULTS.cohortNote,
  };

  const [form, setForm] = useState(() => ({ ...DEFAULTS, ...accountDefaults, ...storage.get(settingsKey, {}) }));
  const [saved, setSaved] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!saved) return undefined;
    const id = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(id);
  }, [saved]);

  const emailError = form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)
    ? L(['Enter a valid email address', 'मान्य ईमेल पता दर्ज करें']) : null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveInstitution = () => {
    if (emailError) {
      toast({ kind: 'error', title: ['Check the contact email', 'संपर्क ईमेल जाँचें'], body: [emailError, emailError] });
      return;
    }
    storage.set(settingsKey, form);
    setSaved(true);
    toast({ title: ['Institution profile saved', 'संस्था प्रोफ़ाइल सेव हुई'], body: ['Shown in the admin sidebar of this browser.', 'इस ब्राउज़र के एडमिन साइडबार में दिखेगी।'] });
  };

  const resetInstitution = () => {
    storage.remove(settingsKey);
    setForm({ ...DEFAULTS, ...accountDefaults });
    setConfirmReset(false);
    toast({ kind: 'warn', title: ['Institution profile reset', 'संस्था प्रोफ़ाइल रीसेट हुई'], body: ['Institution details were restored to defaults.', 'संस्था विवरण डिफ़ॉल्ट पर लौटाए गए।'] });
  };

  const footprint = useMemo(() => {
    try {
      let total = 0;
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (!k) continue;
        const size = (window.localStorage.getItem(k) || '').length;
        total += size;
        keys.push({ key: k, kb: Number((size / 1024).toFixed(1)) });
      }
      return { total: Number((total / 1024).toFixed(1)), keys: keys.sort((a, b) => b.kb - a.kb) };
    } catch { return { total: 0, keys: [] }; }
  }, [form, profile, progress, settings]);

  const exportAll = () => {
    const exportedAt = new Date().toLocaleString();
    const sections = [
      ['Administrator', { name: user?.name, email: user?.email, role: user?.role }],
      ['Institution profile', form],
      ['App preferences', settings],
      ['Student profile', profile || null],
      ['Student progress', progress || null],
    ];
    const report = [
      'CAREERX ADMIN REPORT',
      `Generated: ${exportedAt}`,
      ...sections.flatMap(([title, value]) => ['', title, '='.repeat(title.length), formatReportValue(value)]),
      '',
    ].join('\n');
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `careerx-admin-report-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast({ title: ['Admin report downloaded', 'एडमिन रिपोर्ट डाउनलोड हुई'], body: ['A readable text report of this browser’s CareerX data.', 'इस ब्राउज़र के CareerX डेटा की पढ़ने योग्य टेक्स्ट रिपोर्ट।'] });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><Settings2 className="h-3 w-3" aria-hidden />{t('nav.admin.settings')}</>}
        title={t('nav.admin.settings')}
        sub={L(['Institution profile, app preferences, integration points and every control you have over locally stored data.', 'संस्था प्रोफ़ाइल, ऐप प्राथमिकताएँ, एकीकरण बिंदु और लोकल सेव डेटा पर आपका हर नियंत्रण।'])}
        tags={[
          <Badge key="u" tone="accent" icon={ShieldCheck}>{user?.email}</Badge>,
          saved ? <Badge key="s" tone="ok" icon={Check}>{t('common.saved')}</Badge> : null,
          <DemoTag key="d" />,
        ]}
        actions={
          <>
            <Button size="sm" variant="ghost" icon={Download} onClick={exportAll}>{L(['Export report', 'रिपोर्ट निर्यात करें'])}</Button>
            <Button size="sm" icon={Save} onClick={saveInstitution}>{t('common.save')}</Button>
          </>
        }
      />

      <DemoNotice tone="brand" icon={Info}>{t('adm.settings.note')}</DemoNotice>

      {/* institution */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Building2 className="h-4 w-4 text-brand" aria-hidden />
          <h2 className="font-display text-[15px] font-bold">{L(['Institution profile', 'संस्था प्रोफ़ाइल'])}</h2>
          <Badge tone="muted" className="ml-auto">{L(['Shown in the admin sidebar', 'एडमिन साइडबार में दिखती है'])}</Badge>
        </div>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          <Field label={L(['Institution name', 'संस्था का नाम'])} htmlFor="as-inst" required>
            <Input id="as-inst" value={form.institution} onChange={(e) => set('institution', e.target.value)} maxLength={80} />
          </Field>
          <Field label={t('res.cityLabel')} htmlFor="as-city">
            <Input id="as-city" value={form.city} onChange={(e) => set('city', e.target.value)} maxLength={40} />
          </Field>
          <Field label={L(['Placement cell head', 'प्लेसमेंट सेल प्रमुख'])} htmlFor="as-head">
            <Input id="as-head" value={form.placementHead} onChange={(e) => set('placementHead', e.target.value)} maxLength={60} />
          </Field>
          <Field label={L(['Contact email', 'संपर्क ईमेल'])} htmlFor="as-email" error={emailError}>
            <Input id="as-email" type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
          </Field>
          <Field label={L(['Website', 'वेबसाइट'])} htmlFor="as-site">
            <Input id="as-site" value={form.website} onChange={(e) => set('website', e.target.value)} />
          </Field>
          <Field label={L(['Academic year', 'शैक्षणिक वर्ष'])} htmlFor="as-year">
            <Input id="as-year" value={form.academicYear} onChange={(e) => set('academicYear', e.target.value)} maxLength={20} />
          </Field>
          <Field className="sm:col-span-2" label={L(['Cohort description', 'कोहोर्ट विवरण'])} htmlFor="as-note"
            hint={L(['Appears on exported reports so the placement cell knows which batch the numbers describe.', 'निर्यात की गई रिपोर्ट पर दिखता है ताकि प्लेसमेंट सेल जान सके कि आँकड़े किस बैच के हैं।'])}>
            <Input id="as-note" value={form.cohortNote} onChange={(e) => set('cohortNote', e.target.value)} maxLength={120} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
          <Button icon={Save} onClick={saveInstitution}>{t('common.save')}</Button>
          <Button variant="ghost" icon={RotateCw} onClick={() => setConfirmReset(true)}>{L(['Reset to sample values', 'नमूना मानों पर रीसेट'])}</Button>
          <span className={cn('muted ml-auto text-[11px] transition-opacity', saved ? 'opacity-100' : 'opacity-0')} aria-live="polite">
            <Check className="mr-1 inline h-3 w-3 text-ok" aria-hidden />{t('common.saved')}
          </span>
        </div>
      </Card>

      {/* appearance + language + accessibility */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-accent" aria-hidden />
            <h2 className="font-display text-[15px] font-bold">{L(['Language & appearance', 'भाषा और रूप'])}</h2>
          </div>
          <div className="mt-4 space-y-3.5">
            <Field label={t('common.lang')} htmlFor="as-lang">
              <Segmented value={lang} onChange={setLang} options={LANGS.map((l) => ({ value: l.code, label: l.label }))} />
            </Field>
            <Field label={t('common.theme')} htmlFor="as-theme">
              <Segmented value={theme} onChange={setTheme} options={[
                { value: 'dark', label: L(['Dark', 'डार्क']) },
                { value: 'light', label: L(['Light', 'लाइट']) },
              ]} />
            </Field>
            <p className="muted text-[11.5px] leading-relaxed">
              {L(['Both choices apply instantly across the whole interface and persist in this browser. Students can change them from the top bar too.',
                'दोनों विकल्प पूरे इंटरफ़ेस पर तुरंत लागू होते हैं और इस ब्राउज़र में सेव रहते हैं। छात्र इन्हें टॉप बार से भी बदल सकते हैं।'])}
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-ok" aria-hidden />
            <h2 className="font-display text-[15px] font-bold">{L(['Voice & accessibility', 'वॉइस और सुगम्यता'])}</h2>
          </div>
          <div className="mt-4 space-y-2.5">
            {[
              {
                key: 'voiceInput', on: settings.voiceInput !== false, icon: Mic,
                title: L(['Voice input', 'वॉइस इनपुट']),
                body: sttSupported
                  ? L(['Browser speech recognition is available on this device', 'इस डिवाइस पर ब्राउज़र स्पीच रिकग्निशन उपलब्ध है'])
                  : L(['Not supported by this browser — text input still works everywhere', 'इस ब्राउज़र में समर्थित नहीं — टेक्स्ट इनपुट हर जगह काम करता है']),
              },
              {
                key: 'tts', on: !!settings.tts, icon: Volume2,
                title: L(['Read AI answers aloud', 'AI उत्तर बोलकर सुनाएँ']),
                body: ttsSupported
                  ? L(['Speech synthesis runs locally in the browser', 'स्पीच सिंथेसिस ब्राउज़र में लोकल चलता है'])
                  : L(['Not supported by this browser', 'इस ब्राउज़र में समर्थित नहीं']),
              },
              {
                key: 'reducedMotion', on: !!settings.reducedMotion, icon: Eye,
                title: L(['Reduce motion', 'गति कम करें']),
                body: L(['Shortens reveal, chart and hover animations for everyone using this browser', 'इस ब्राउज़र का उपयोग करने वाले सभी के लिए रिवील, चार्ट और होवर एनिमेशन छोटे करता है']),
              },
            ].map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface2/40 p-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line bg-surface text-brand"><row.icon className="h-3.5 w-3.5" aria-hidden /></span>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold">{row.title}</div>
                    <div className="muted mt-0.5 text-[11px] leading-snug">{row.body}</div>
                  </div>
                </div>
                <Switch checked={row.on} onChange={(v) => updateSettings({ [row.key]: v })} label={row.title} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* integrations */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Plug className="h-4 w-4 text-warn" aria-hidden />
          <h2 className="font-display text-[15px] font-bold">{L(['Integrations (not connected in this build)', 'एकीकरण (इस बिल्ड में नहीं जुड़े)'])}</h2>
          <Badge tone="warn" className="ml-auto" icon={KeyRound}>{L(['No keys in client code', 'क्लाइंट कोड में कोई कुंजी नहीं'])}</Badge>
        </div>
        <p className="muted mt-1.5 text-[12px] leading-relaxed">
          {L(['Every service below already isolates the data layer, so a real backend can be connected without touching the UI. Credentials must live in server-side environment variables — never in the browser bundle.',
            'नीचे की हर सेवा डेटा परत को पहले से अलग रखती है, ताकि UI छुए बिना वास्तविक बैकएंड जुड़ सके। क्रेडेंशियल सर्वर-साइड एनवायरनमेंट वेरिएबल में रहें — ब्राउज़र बंडल में कभी नहीं।'])}
        </p>
        <ul className="mt-3.5 divide-y divide-line rounded-xl border border-line">
          {INTEGRATIONS.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center gap-2 bg-surface2/40 p-3">
              <Server className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <code className="font-mono text-[11px] font-semibold text-ink">{x.var}</code>
                <div className="muted mt-0.5 text-[11px]">{L(x.purpose)} · <span className="font-mono">{x.where}</span></div>
              </div>
              <Badge tone="muted">{L(['Not configured', 'कॉन्फ़िगर नहीं'])}</Badge>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DemoTag />
          <span className="muted text-[10.5px]">{L(['Connect these providers to use their live services. Keep credentials on the server, never in the browser.', 'लाइव सेवाएँ इस्तेमाल करने के लिए इन प्रदाताओं को जोड़ें। क्रेडेंशियल सर्वर पर रखें, ब्राउज़र में नहीं।'])}</span>
        </div>
      </Card>

      {/* data & privacy */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-accent" aria-hidden />
            <h2 className="font-display text-[15px] font-bold">{L(['Local storage footprint', 'लोकल स्टोरेज फ़ुटप्रिंट'])}</h2>
          </div>
          <Meter className="mt-3" value={Math.min(100, (footprint.total / 5120) * 100)} size="sm" tone="accent"
            label={L(['Used of a typical 5 MB browser quota', 'सामान्य 5 MB ब्राउज़र कोटा में से उपयोग'])} right={`${footprint.total} KB`} />
          <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line bg-surface2/40 p-2">
            {footprint.keys.map((k) => (
              <li key={k.key} className="flex items-center gap-2 px-1.5 py-1">
                <code className="min-w-0 flex-1 truncate font-mono text-[10.5px]">{k.key}</code>
                <span className="muted shrink-0 text-[10.5px] tabular-nums">{k.kb} KB</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" to="/privacy" iconRight={ArrowRight}>{t('trust.title')}</Button>
            <span className="muted text-[10.5px]">{L([`${cohort.students.length} students in the institution cohort`, `संस्थान कोहोर्ट में ${cohort.students.length} छात्र`])}</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-bad" aria-hidden />
            <h2 className="font-display text-[15px] font-bold">{L(['Destructive actions', 'विनाशकारी क्रियाएँ'])}</h2>
          </div>
          <p className="muted mt-1.5 text-[12px] leading-relaxed">
            {L(['These affect this browser only. There is no server copy to restore from, so export first if the data matters.',
              'ये केवल इस ब्राउज़र को प्रभावित करते हैं। बहाल करने के लिए कोई सर्वर कॉपी नहीं है, इसलिए डेटा महत्वपूर्ण हो तो पहले निर्यात करें।'])}
          </p>
          <div className="mt-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface2/40 p-3">
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold">{L(['Reset institution profile', 'संस्था प्रोफ़ाइल रीसेट करें'])}</div>
                <div className="muted mt-0.5 text-[11px]">{L(['Restores default institution values', 'संस्थान के डिफ़ॉल्ट मान लौटाता है'])}</div>
              </div>
              <Button size="sm" variant="ghost" icon={RotateCw} onClick={() => setConfirmReset(true)}>{L(['Reset', 'रीसेट'])}</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-bad/30 bg-bad/[0.05] p-3">
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold">{t('prof.deleteData')}</div>
                <div className="muted mt-0.5 text-[11px]">{L(['Removes every CareerX key from this browser and signs you out', 'इस ब्राउज़र से हर CareerX कुंजी हटाता है और साइन आउट करता है'])}</div>
              </div>
              <Button size="sm" variant="danger" icon={Trash2} onClick={() => setConfirmWipe(true)}>{t('prof.deleteData')}</Button>
            </div>
          </div>
          <Divider className="my-3.5" />
          <KeyValue items={[
            { k: L(['Build', 'बिल्ड']), v: t('misc.betaNote') },
            { k: L(['Signed in as', 'साइन इन']) , v: `${user?.email} (${t('common.admin')})` },
            { k: L(['Cohort dataset', 'कोहोर्ट डेटासेट']), v: L([`${cohort.students.length} students · ${cohort.activities.length} activities`, `${cohort.students.length} छात्र · ${cohort.activities.length} गतिविधियाँ`]) },
          ]} />
        </Card>
      </div>

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
          <Button size="sm" variant="quiet" icon={Download} onClick={exportAll}>{L(['Download a copy first', 'पहले कॉपी डाउनलोड करें'])}</Button>
        </div>
      </Modal>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={L(['Reset institution profile', 'संस्था प्रोफ़ाइल रीसेट करें'])}
        icon={RotateCw}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>{t('common.cancel')}</Button>
            <Button icon={RotateCw} onClick={resetInstitution}>{L(['Reset', 'रीसेट'])}</Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-muted">
          {L(['Restores default institution name, contact details and cohort description. Student data and scores are unchanged.',
            'संस्थान का डिफ़ॉल्ट नाम, संपर्क विवरण और कोहोर्ट विवरण लौटाता है। छात्र डेटा और स्कोर अपरिवर्तित रहते हैं।'])}
        </p>
      </Modal>
    </div>
  );
}
