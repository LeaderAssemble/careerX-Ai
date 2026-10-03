import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Eye, Database, Trash2, Download, BrainCircuit, KeyRound, Lock,
  AlertTriangle, Accessibility, Globe, Server, ArrowRight, FileText, Info, Check, X,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../store/AppStore';
import Logo from '../components/Logo';
import { PageHeader, Card, Badge, Button, Chip, Meter, Modal, DemoTag, KeyValue, Accordion } from '../components/ui/primitives';
import { GlowOrb } from '../components/Background';
import { cn } from '../lib/utils';

const COLLECTED = [
  { icon: FileText, en: 'Name, email, college, degree, branch and graduation year', hi: 'नाम, ईमेल, कॉलेज, डिग्री, ब्रांच और स्नातक वर्ष', why: ['prof.title', 'auth.college'] },
  { icon: BrainCircuit, en: 'Self-rated skill levels, interests, preferred career areas, goal and work type', hi: 'स्व-मूल्यांकित स्किल स्तर, रुचियाँ, पसंदीदा करियर क्षेत्र, लक्ष्य और कार्य प्रकार', why: ['nav.skillgap', 'nav.aiCareer'] },
  { icon: FileText, en: 'Resume text, projects, certifications and mock interview answers you type', hi: 'रिज़्यूमे टेक्स्ट, प्रोजेक्ट, प्रमाणपत्र और आपके लिखे मॉक इंटरव्यू उत्तर', why: ['nav.resume', 'nav.interview'] },
  { icon: Database, en: 'Actions taken in the app: tasks ticked, courses saved, applications tracked, badges earned', hi: 'ऐप में किए गए कार्य: टिक किए कार्य, सेव कोर्स, ट्रैक किए आवेदन, अर्जित बैज', why: ['nav.roadmap', 'ach.title'] },
];

const NEVER = [
  { en: 'Payment details, bank or card numbers', hi: 'भुगतान विवरण, बैंक या कार्ड नंबर' },
  { en: 'Government ID numbers, Aadhaar or documents', hi: 'सरकारी पहचान संख्या, आधार या दस्तावेज़' },
  { en: 'Your microphone audio — voice answers are transcribed in the browser and only the text is stored', hi: 'आपका माइक्रोफ़ोन ऑडियो — वॉइस उत्तर ब्राउज़र में ट्रांसक्राइब होते हैं और केवल टेक्स्ट सेव होता है' },
  { en: 'Location from GPS or IP — you choose a city in a dropdown', hi: 'GPS या IP से लोकेशन — आप ड्रॉपडाउन से शहर चुनते हैं' },
  { en: 'Data sold to, or shared with, third parties or advertisers', hi: 'किसी तीसरे पक्ष या विज्ञापनदाता को बेचा या साझा किया गया डेटा' },
];

const LIMITS = [
  { en: 'Match percentages are computed from your self-rated skills against a sample role definition. They are not a validated psychometric or hiring prediction.', hi: 'मैच प्रतिशत आपके स्व-मूल्यांकित कौशल और नमूना भूमिका परिभाषा से बनते हैं। ये मान्य साइकोमेट्रिक या भर्ती भविष्यवाणी नहीं हैं।' },
  { en: 'Interview and resume scores come from transparent rule-based checks (length, action verbs, metrics, keywords), not from a hiring model.', hi: 'इंटरव्यू और रिज़्यूमे स्कोर पारदर्शी नियम-आधारित जाँच (लंबाई, एक्शन वर्ब, मेट्रिक, कीवर्ड) से आते हैं, किसी हायरिंग मॉडल से नहीं।' },
  { en: 'Course, job, internship and government listings are illustrative samples. Nothing is a live feed, a partnership or an official notification.', hi: 'कोर्स, जॉब, इंटर्नशिप और सरकारी सूचियाँ नमूना हैं। कुछ भी लाइव फ़ीड, साझेदारी या आधिकारिक अधिसूचना नहीं है।' },
  { en: 'The AI mentor answers from a keyword and profile rule engine. It can be wrong and should not replace a qualified counsellor.', hi: 'AI मेंटर कीवर्ड और प्रोफ़ाइल नियम इंजन से उत्तर देता है। यह ग़लत हो सकता है और किसी योग्य काउंसलर का विकल्प नहीं है।' },
  { en: 'No salary predictions are offered anywhere in the product.', hi: 'उत्पाद में कहीं भी वेतन भविष्यवाणी नहीं दी जाती।' },
];

export default function Privacy() {
  const { t, L } = useI18n();
  const { user, profile, progress, settings, wipeData, toast } = useApp();
  const [confirmWipe, setConfirmWipe] = useState(false);

  /* Transparency panel: exactly which keys this browser holds right now. */
  const storage = useMemo(() => {
    try {
      const rows = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (!key || !key.startsWith('careerx')) continue;
        const raw = window.localStorage.getItem(key) || '';
        let records = null;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) records = parsed.length;
          else if (parsed && typeof parsed === 'object') records = Object.keys(parsed).length;
        } catch { /* not JSON */ }
        rows.push({ key, bytes: raw.length, records });
      }
      return rows.sort((a, b) => b.bytes - a.bytes);
    } catch { return []; }
  }, [profile, progress, settings]);

  const totalBytes = storage.reduce((s, r) => s + r.bytes, 0);

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      note: 'CareerX demo export — generated in your browser',
      profile: profile || null,
      progress: progress || null,
      settings: settings || null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `careerx-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: ['Data exported', 'डेटा निर्यात हुआ'], body: ['A JSON file was downloaded to this device.', 'इस डिवाइस पर JSON फ़ाइल डाउनलोड हुई।'] });
  };

  return (
    <div className="space-y-6">
      {/* hero */}
      <section className="relative overflow-hidden rounded-2xl border border-line bg-surface2/60 px-5 py-8 sm:px-8 sm:py-11">
        <GlowOrb className="-left-16 -top-16 h-64 w-64" tone="brand" />
        <GlowOrb className="-right-10 -bottom-10 h-56 w-56" tone="accent" />
        <div className="relative">
          <Logo size={34} />
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge tone="ok" icon={ShieldCheck}>{L(['No server in this demo build', 'इस डेमो बिल्ड में कोई सर्वर नहीं'])}</Badge>
            <Badge tone="brand" icon={Database}>{L(['Stored in your browser', 'आपके ब्राउज़र में सेव'])}</Badge>
            <Badge tone="muted" icon={Globe}>{L(['EN / हिंदी · no tracking scripts', 'कोई ट्रैकिंग स्क्रिप्ट नहीं'])}</Badge>
          </div>
          <h1 className="h-display mt-4 max-w-2xl text-3xl sm:text-4xl">{t('trust.title')}</h1>
          <p className="muted mt-3 max-w-3xl text-sm leading-relaxed sm:text-[15px]">{t('trust.sub')}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {profile ? <Button icon={Download} onClick={exportData}>{L(['Download my data', 'मेरा डेटा डाउनलोड करें'])}</Button> : null}
            {profile ? <Button variant="ghost" icon={Trash2} onClick={() => setConfirmWipe(true)}>{t('prof.deleteData')}</Button> : null}
            {user ? <Button variant="quiet" to={user.role === 'admin' ? '/admin/dashboard' : '/app/dashboard'} iconRight={ArrowRight}>{t('nav.dashboard')}</Button>
              : <Button variant="quiet" to="/login" iconRight={ArrowRight}>{t('land.nav.login')}</Button>}
          </div>
        </div>
      </section>

      {/* live storage transparency */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-brand" aria-hidden />
            <h2 className="font-display text-[15px] font-bold">{L(['Exactly what this browser stores right now', 'इस ब्राउज़र में अभी क्या सेव है'])}</h2>
          </div>
          <p className="muted mt-1.5 text-[12px]">{L(['Live read of LocalStorage keys starting with “careerx”. Nothing else is written by this app.', '“careerx” से शुरू होने वाली LocalStorage कुंजियों का लाइव पाठ। यह ऐप और कुछ नहीं लिखता।'])}</p>
          {storage.length ? (
            <>
              <ul className="mt-3.5 divide-y divide-line rounded-xl border border-line bg-surface2/40">
                {storage.map((r) => (
                  <li key={r.key} className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <code className="font-mono text-[11px] font-semibold text-ink">{r.key}</code>
                    {r.records != null ? <Badge tone="muted">{r.records} {L(['records', 'रिकॉर्ड'])}</Badge> : null}
                    <span className="muted ml-auto text-[11px] tabular-nums">{(r.bytes / 1024).toFixed(1)} KB</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <Meter value={100} size="sm" tone="brand" label={L(['Total local footprint', 'कुल लोकल फ़ुटप्रिंट'])} right={`${(totalBytes / 1024).toFixed(1)} KB`} />
              </div>
            </>
          ) : (
            <Card className="mt-3 bg-surface2/40">
              <p className="muted text-[12.5px]">{L(['Nothing is stored yet in this browser.', 'इस ब्राउज़र में अभी कुछ सेव नहीं है।'])}</p>
            </Card>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <DemoTag />
            <span className="muted text-[10.5px]">{t('common.methodNote')}</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-ok" aria-hidden />
            <h2 className="font-display text-[15px] font-bold">{L(['What we never collect', 'हम कभी क्या एकत्र नहीं करते'])}</h2>
          </div>
          <ul className="mt-3.5 space-y-2">
            {NEVER.map((x, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface2/40 p-2.5">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ok/30 bg-ok/10 text-ok"><X className="h-3 w-3" aria-hidden /></span>
                <span className="text-[12px] leading-snug text-ink">{L([x.en, x.hi])}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3.5 rounded-xl border border-warn/30 bg-warn/[0.07] p-3">
            <div className="flex items-start gap-2.5">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
              <div>
                <h3 className="text-[12.5px] font-bold">{L(['Demo authentication — read this', 'डेमो प्रमाणीकरण — इसे पढ़ें'])}</h3>
                <p className="muted mt-1 text-[11.5px] leading-relaxed">
                  {L(['Passwords are salted and hashed in the local MySQL database. Profile data may be cached in this browser. This development setup is not production-hardened; do not reuse a real password.',
                    'पासवर्ड लोकल MySQL डेटाबेस में salted hash के रूप में सेव होते हैं। प्रोफ़ाइल डेटा इस ब्राउज़र में cache हो सकता है। यह development setup production-hardened नहीं है; असली पासवर्ड दोबारा उपयोग न करें।'])}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* collected + why */}
      <Card>
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-brand" aria-hidden />
          <h2 className="font-display text-[16px] font-bold">{t('trust.collected')}</h2>
        </div>
        <p className="muted mt-1.5 text-[12.5px]">{t('trust.why')}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {COLLECTED.map((c, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface2/40 p-3.5">
              <div className="flex items-start gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-brand/25 bg-brand/10 text-brand"><c.icon className="h-3.5 w-3.5" aria-hidden /></span>
                <div className="min-w-0">
                  <p className="text-[12.5px] leading-snug font-medium">{L([c.en, c.hi])}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.why.map((k) => <Chip key={k} className="px-1.5 py-0 text-[9.5px]">{t(k)}</Chip>)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* how recommendations work */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-accent" aria-hidden />
            <h2 className="font-display text-[15px] font-bold">{t('trust.how')}</h2>
          </div>
          <ol className="mt-3.5 space-y-2.5">
            {[
              { en: 'Your answers are turned into a skill map of 0–4 levels', hi: 'आपके उत्तर 0–4 स्तर के स्किल मैप में बदलते हैं' },
              { en: 'Each career’s required skill list is compared to that map with weights', hi: 'हर करियर की आवश्यक स्किल सूची उस मैप से भार के साथ तुलना होती है' },
              { en: 'Gaps are ranked by weight × missing level and grouped by category', hi: 'गैप भार × कमी स्तर से क्रमबद्ध और श्रेणी में समूहित होते हैं' },
              { en: 'Courses and projects are scored by how much of those gaps they cover', hi: 'कोर्स और प्रोजेक्ट इस आधार पर स्कोर होते हैं कि वे कितना गैप भरते हैं' },
              { en: 'Readiness blends skills, roadmap, projects, resume, interview and profile completeness', hi: 'रेडीनेस कौशल, रोडमैप, प्रोजेक्ट, रिज़्यूमे, इंटरव्यू और प्रोफ़ाइल पूर्णता मिलाकर बनता है' },
            ].map((s, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-accent/25 bg-accent/10 text-[11px] font-bold text-accent">{i + 1}</span>
                <span className="text-[12.5px] leading-snug text-ink">{L([s.en, s.hi])}</span>
              </li>
            ))}
          </ol>
          <div className="mt-3.5 flex flex-wrap gap-2 border-t border-line pt-3">
            <Button size="sm" variant="ghost" to="/app/ai-career">{L(['See it applied to a profile', 'प्रोफ़ाइल पर लागू देखें'])}</Button>
            <Button size="sm" variant="quiet" to="/app/skill-gap" iconRight={ArrowRight}>{t('nav.skillgap')}</Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warn" aria-hidden />
            <h2 className="font-display text-[15px] font-bold">{t('trust.limits')}</h2>
          </div>
          <ul className="mt-3.5 space-y-2">
            {LIMITS.map((x, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-xl border border-warn/20 bg-warn/[0.05] p-2.5">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" aria-hidden />
                <span className="text-[12px] leading-snug text-ink">{L([x.en, x.hi])}</span>
              </li>
            ))}
          </ul>
          <p className="muted mt-3 text-[11.5px] leading-relaxed">
            {L(['Every AI-generated panel in the app carries a visible label so you always know what is computed versus what is sample content.',
              'ऐप के हर AI-जनरेटेड पैनल पर दृश्यमान लेबल है ताकि आप हमेशा जान सकें कि क्या गणना है और क्या नमूना सामग्री।'])}
          </p>
        </Card>
      </div>

      {/* control + deletion */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-ok" aria-hidden />
            <h2 className="font-display text-[15px] font-bold">{t('trust.control')}</h2>
          </div>
          <ul className="mt-3.5 space-y-2">
            {[
              { icon: FileText, en: 'Edit every field of your profile, education, skills and preferences at any time', hi: 'अपनी प्रोफ़ाइल, शिक्षा, कौशल और प्राथमिकताओं के हर फ़ील्ड को कभी भी संपादित करें', to: '/app/profile' },
              { icon: Download, en: 'Export a JSON copy of everything stored about you', hi: 'आपके बारे में सेव हर चीज़ की JSON कॉपी निर्यात करें', action: exportData },
              { icon: Trash2, en: 'Delete all local data in one click and sign out', hi: 'एक क्लिक में सारा लोकल डेटा हटाएँ और साइन आउट करें', action: () => setConfirmWipe(true) },
              { icon: Globe, en: 'Switch language and theme; both choices persist locally', hi: 'भाषा और थीम बदलें; दोनों विकल्प लोकल सेव होते हैं', to: '/app/profile' },
            ].map((x, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2.5 rounded-xl border border-line bg-surface2/40 p-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-ok/25 bg-ok/10 text-ok"><x.icon className="h-3.5 w-3.5" aria-hidden /></span>
                <span className="min-w-0 flex-1 text-[12px] leading-snug text-ink">{L([x.en, x.hi])}</span>
                {x.to ? <Button size="sm" variant="quiet" to={x.to} iconRight={ArrowRight}>{L(['Open', 'खोलें'])}</Button>
                  : <Button size="sm" variant="quiet" onClick={x.action}>{L(['Do it', 'करें'])}</Button>}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-brand" aria-hidden />
            <h2 className="font-display text-[15px] font-bold">{t('trust.delete')}</h2>
          </div>
          <p className="muted mt-1.5 text-[12.5px] leading-relaxed">
            {L(['Delete all my data removes your MySQL account, synced profile/progress and this browser’s cache, then signs you out. Shared published listings are retained for other students.',
              'मेरा सारा डेटा हटाने पर आपका MySQL खाता, synced प्रोफ़ाइल/प्रगति और इस ब्राउज़र का cache हटेगा, फिर आप sign out होंगे। साझा प्रकाशित सूचियाँ अन्य छात्रों के लिए रहेंगी।'])}
          </p>
          <KeyValue className="mt-3.5" items={[
            { k: L(['Where data lives', 'डेटा कहाँ रहता है']), v: L(['Local MySQL plus a browser cache', 'लोकल MySQL और ब्राउज़र cache']) },
            { k: L(['Server transmission', 'सर्वर प्रेषण']), v: L(['Synced to this machine’s local API', 'इस मशीन की लोकल API से synced']) },
            { k: L(['Retention period', 'रिटेंशन अवधि']), v: L(['Until account deletion', 'खाता हटाने तक']) },
            { k: L(['Third-party analytics', 'तृतीय-पक्ष एनालिटिक्स']), v: L(['Not loaded', 'लोड नहीं होता']) },
            { k: L(['Account recovery', 'खाता पुनर्प्राप्ति']), v: L(['Password reset by email', 'ईमेल से पासवर्ड रीसेट']) },
          ]} />
          <div className="mt-3.5 flex flex-wrap gap-2 border-t border-line pt-3">
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => setConfirmWipe(true)}>{t('prof.deleteData')}</Button>
            <Button size="sm" variant="ghost" icon={Download} onClick={exportData}>{L(['Export first', 'पहले निर्यात करें'])}</Button>
          </div>
        </Card>
      </div>

      {/* accessibility */}
      <Card>
        <div className="flex items-center gap-2">
          <Accessibility className="h-4 w-4 text-accent" aria-hidden />
          <h2 className="font-display text-[15px] font-bold">{L(['Accessibility commitment', 'सुगम्यता प्रतिबद्धता'])}</h2>
        </div>
        <div className="mt-3.5 grid gap-2.5 md:grid-cols-2">
          {[
            { en: 'Full keyboard navigation with visible focus rings on every control', hi: 'हर नियंत्रण पर दृश्यमान फ़ोकस रिंग के साथ पूर्ण कीबोर्ड नेविगेशन' },
            { en: 'Labels and ARIA states on forms, toggles, tabs, modals and the voice mic', hi: 'फ़ॉर्म, टॉगल, टैब, मोडल और वॉइस माइक पर लेबल और ARIA स्थिति' },
            { en: 'Text alternatives for icons and charts; scores are also written as words', hi: 'आइकन और चार्ट के लिए टेक्स्ट विकल्प; स्कोर शब्दों में भी लिखे जाते हैं' },
            { en: 'Dark and light themes both meet readable contrast targets', hi: 'डार्क और लाइट दोनों थीम पठनीय कंट्रास्ट लक्ष्य पूरा करती हैं' },
            { en: 'Reduced-motion support: animations shorten when your OS asks for it', hi: 'कम-गति समर्थन: आपके OS के कहने पर एनिमेशन छोटे हो जाते हैं' },
            { en: 'Responsive down to small phones, with a bottom navigation bar', hi: 'छोटे फ़ोन तक रिस्पॉन्सिव, बॉटम नेविगेशन बार के साथ' },
          ].map((x, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface2/40 p-2.5">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" aria-hidden />
              <span className="text-[12px] leading-snug text-ink">{L([x.en, x.hi])}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* faq */}
      <Card>
        <h2 className="font-display text-[15px] font-bold">{L(['Privacy questions, answered', 'गोपनीयता प्रश्नों के उत्तर'])}</h2>
        <Accordion
          className="mt-3"
          items={[
            { q: L(['Can my college see my data?', 'क्या मेरा कॉलेज मेरा डेटा देख सकता है?']), a: L(['In this demo build the admin analytics view uses sample institutional data, not your personal records. A real deployment would show a college only aggregated, consented statistics.', 'इस डेमो बिल्ड में एडमिन एनालिटिक्स नमूना संस्थागत डेटा उपयोग करता है, आपके व्यक्तिगत रिकॉर्ड नहीं। वास्तविक तैनाती में कॉलेज केवल समग्र, सहमति-आधारित आँकड़े देखेगा।']) },
            { q: L(['Is my voice recorded?', 'क्या मेरी आवाज़ रिकॉर्ड होती है?']), a: L(['No. The Web Speech API transcribes inside your browser and CareerX stores only the resulting text of answers you choose to save.', 'नहीं। Web Speech API आपके ब्राउज़र में ट्रांसक्राइब करता है और CareerX केवल उन उत्तरों का टेक्स्ट सेव करता है जिन्हें आप सेव करना चुनते हैं।']) },
            { q: L(['Do you use an external AI provider?', 'क्या आप बाहरी AI प्रदाता उपयोग करते हैं?']), a: L(['Not in this build. Recommendations and the mentor run on a local rule engine, so no profile text leaves your device. Connecting a hosted model later would require an explicit, disclosed integration with a server-side API key.', 'इस बिल्ड में नहीं। सुझाव और मेंटर लोकल नियम इंजन पर चलते हैं, इसलिए कोई प्रोफ़ाइल टेक्स्ट आपके डिवाइस से बाहर नहीं जाता। बाद में होस्टेड मॉडल जोड़ने के लिए सर्वर-साइड API कुंजी के साथ स्पष्ट, घोषित एकीकरण चाहिए।']) },
            { q: L(['Are the job and course listings real?', 'क्या जॉब और कोर्स सूचियाँ असली हैं?']), a: L(['They are illustrative samples marked as demo data. No provider partnership exists and no application is submitted anywhere when you click Apply.', 'वे नमूना हैं जिन्हें डेमो डेटा चिह्नित किया गया है। कोई प्रदाता साझेदारी नहीं है और Apply दबाने पर कहीं कोई आवेदन नहीं जाता।']) },
          ]}
        />
        <div className={cn('mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3')}>
          <DemoTag />
          <Info className="h-3.5 w-3.5 text-muted" aria-hidden />
          <span className="muted text-[10.5px]">{t('gov.disclaimer')}</span>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-center gap-3 pb-2">
        <Link to="/" className="muted text-[11.5px] hover:text-brand">← {t('err.goHome')}</Link>
        <span className="muted text-[11.5px]">·</span>
        <span className="muted text-[11.5px]">{t('misc.betaNote')}</span>
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
          <Button size="sm" variant="quiet" icon={Download} onClick={exportData}>{L(['Download a copy first', 'पहले कॉपी डाउनलोड करें'])}</Button>
        </div>
      </Modal>
    </div>
  );
}
