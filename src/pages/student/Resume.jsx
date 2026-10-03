import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText, Save, Printer, Sparkles, Wand2, Plus, Trash2, Check, X, RefreshCw, Download, ChevronDown,
  AlertTriangle, ArrowRight, Loader2, Eye, Upload, ClipboardPaste, FileUp, Gauge, Zap, Target, TrendingUp, Rocket,
  Award, Mic, MicOff, FileDown,
  FlaskConical, Cpu, Volume2, Square, Layers,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { startListening, sttSupported, speak, stopSpeaking, ttsSupported } from '../../services/speechService';
import { useApp } from '../../store/AppStore';
import {
  PageHeader, Card, Badge, Button, Chip, Field, Input, Textarea, Modal, Meter,
  ProgressRing, EmptyState, DemoTag, Segmented,
} from '../../components/ui/primitives';
import { NeedsProfile, DemoNotice, AILabel } from '../../components/app/parts';
import { IsoBarChart, IsoLineRibbon, HoloTile, AnimatedNumber, IsoRadar } from '../../components/ui/Charts3D';
import { TEMPLATES, emptyResume, importFromProfile, generateSummary, improveBullets, analyzeResume, analyzeJdMatch, tailorDraft } from '../../services/resumeService';
import { parseResumeText, mergeParsed, atsCoachPlan, applyCoachStep, trainResume, SAMPLE_RESUME } from '../../services/atsService';
import { SKILL_BY_ID } from '../../data/catalog';
import { cn, clamp, uid, sleep } from '../../lib/utils';
import storage from '../../lib/storage';

const PALETTE = {
  modern: { name: 'text-[#4338ca]', rule: 'border-l-[3px] border-[#4338ca] pl-2', accent: '#4338ca', font: 'font-sans' },
  professional: { name: 'text-[#0f172a]', rule: 'border-b border-[#0f172a] pb-0.5', accent: '#0f172a', font: 'font-serif' },
  minimal: { name: 'text-[#111827]', rule: '', accent: '#111827', font: 'font-sans' },
};

export default function Resume() {
  const { t, L, lang, speech } = useI18n();
  const { derived, profile, gaps, progress, saveResume, toast, activeCareer, projects } = useApp();

  const [draft, setDraft] = useState(() => progress.resume || (profile ? importFromProfile(profile, derived || {}) : emptyResume(profile)));
  const [busy, setBusy] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [improveTarget, setImproveTarget] = useState(null); // {kind, index}
  const [changes, setChanges] = useState([]);
  const [summaryPair, setSummaryPair] = useState(null);
  const [skillInput, setSkillInput] = useState('');
  const [tab, setTab] = useState('edit'); // edit | preview | analysis
  const [importOpen, setImportOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [sumVoice, setSumVoice] = useState(false);
  const sumCtl = useRef(null);
  const [train, setTrain] = useState(null); // { passes, gained, reachedTarget, remainingManual }
  const [trainBefore, setTrainBefore] = useState(null); // draft snapshot for the before/after diff
  const [trainTarget, setTrainTarget] = useState(85);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(progress.resume || null), [draft, progress.resume]);

  const suggestedSkills = useMemo(() => {
    const fromProfile = [...(profile.techSkills || []), ...(profile.toolSkills || [])]
      .filter((s) => s.level >= 2)
      .map((s) => L(SKILL_BY_ID[s.id]?.n || [s.id, s.id]));
    const fromCareer = (activeCareer?.skills || []).slice(0, 8).map((s) => L(SKILL_BY_ID[s.id]?.n || [s.id, s.id]));
    return [...new Set([...fromProfile, ...fromCareer])].filter((x) => !(draft.skills || []).includes(x)).slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, activeCareer, draft.skills, lang]);

  const [scoreHist, setScoreHist] = useState([]);
  const [importedOnce, setImportedOnce] = useState(false);
  const [scanView, setScanView] = useState(false);
  const analysis = useMemo(() => {
    if (!derived) return null;
    return analyzeResume(draft, derived.skillMap, derived.targetCareerId, lang);
  }, [draft, derived, lang]);

  const kwNames = useMemo(
    () => (analysis?.keywords?.hits || []).map((id) => SKILL_BY_ID[id]?.n?.[0] || '').filter(Boolean),
    [analysis],
  );

  const prevScoreRef = useRef(analysis?.score ?? 0);
  const [delta, setDelta] = useState(0);
  const [deltaKey, setDeltaKey] = useState(0);
  useEffect(() => {
    const cur = analysis?.score ?? 0;
    if (cur !== prevScoreRef.current) {
      const d = cur - prevScoreRef.current;
      prevScoreRef.current = cur;
      setDelta(d);
      setDeltaKey((k) => k + 1);
      const id = setTimeout(() => setDelta(0), 1750);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [analysis]);

  const coachSteps = useMemo(() => {
    if (!derived || !analysis) return [];
    return atsCoachPlan(draft, analysis, { profile, derived, career: activeCareer, lang });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, analysis, derived, lang]);

  if (!derived || !profile) return <NeedsProfile />;

  const patch = (p) => setDraft((d) => ({ ...d, ...p }));
  const patchPersonal = (k, v) => setDraft((d) => ({ ...d, personal: { ...d.personal, [k]: v } }));
  const listPatch = (key, index, p) => setDraft((d) => ({
    ...d,
    [key]: d[key].map((x, i) => (i === index ? { ...x, ...(typeof p === 'function' ? p(x) : p) } : x)),
  }));
  const listRemove = (key, index) => setDraft((d) => ({ ...d, [key]: d[key].filter((_, i) => i !== index) }));
  const listAdd = (key, item) => setDraft((d) => ({ ...d, [key]: [...(d[key] || []), item] }));

  // ── v11: live score delta pulse ────────────────────────────────────
  const prevScore = useRef(0);
  const [scoreDelta, setScoreDelta] = useState(null);
  useEffect(() => {
    if (!analysis) return undefined;
    const prev = prevScore.current;
    prevScore.current = analysis.score;
    if (prev && analysis.score !== prev) {
      setScoreDelta({ v: analysis.score - prev, key: Date.now() });
      const t0 = setTimeout(() => setScoreDelta(null), 2600);
      return () => clearTimeout(t0);
    }
    return undefined;
  }, [analysis]);

  // ── v9: score trajectory history (persisted on device) ─────────────
  const [history, setHistory] = useState(() => storage.get('resumeHistory', []));
  useEffect(() => {
    if (!analysis) return;
    setHistory((h) => {
      const now = Date.now();
      const last = h[h.length - 1];
      if (last && last.score === analysis.score && now - last.at < 60000) return h;
      const nh = [...h, { at: now, score: analysis.score }].slice(-14);
      storage.set('resumeHistory', nh);
      return nh;
    });
  }, [analysis]);

  // ── Resume v2: import, coach and train handlers ──────────────────────────
  const coachCtx = { profile, derived, career: activeCareer, lang };

  const runImport = async (text, meta = {}) => {
    setBusy('import');
    await sleep(700); // perceptible "parsing" feedback
    try {
      const { parsed, report } = parseResumeText(text);
      const merged = mergeParsed(draft, parsed);
      setImportedOnce(true);
      setDraft(merged);
      setTrain(null);
      setTab('analysis');
      setImportOpen(false);
      toast({
        title: ['Import merged into draft', 'आयात ड्राफ़्ट में जुड़ा'],
        body: [
          `${meta.name ? `“${meta.name}” — ` : ''}${report.found.length} field group(s) detected. Review every section before saving.`,
          `${meta.name ? `“${meta.name}” — ` : ''}${report.found.length} फ़ील्ड समूह मिले। सेव से पहले हर अनुभाग की समीक्षा करें।`,
        ],
      });
    } catch {
      toast({ kind: 'warn', title: ['Could not read that file', 'फ़ाइल पढ़ी नहीं जा सकी'], body: ['Try a text-based PDF/TXT/MD, or paste the text directly.', 'टेक्स्ट-आधारित PDF/TXT/MD आज़माएँ, या टेक्स्ट सीधे पेस्ट करें।'] });
    } finally {
      setBusy('');
    }
  };

  const runFile = async (file) => {
    if (!file) return;
    if (/\.(txt|md|markdown)$/i.test(file.name)) { runImport(await file.text(), { name: file.name }); return; }
    if (/\.pdf$/i.test(file.name)) {
      try { runImport(await extractPdfText(file), { name: file.name }); }
      catch { toast({ kind: 'warn', title: ['Could not read that file', 'फ़ाइल पढ़ी नहीं जा सकी'], body: ['Scanned PDFs have no text layer — paste the text instead.', 'स्कैन किए PDF में टेक्स्ट नहीं होता — टेक्स्ट पेस्ट करें।'] }); }
      return;
    }
    toast({ kind: 'warn', title: ['Unsupported file', 'असमर्थित फ़ाइल'], body: ['Use .pdf, .txt or .md — or paste the text.', '.pdf, .txt या .md उपयोग करें — या टेक्स्ट पेस्ट करें।'] });
  };

  const labCandidates = useMemo(() => {
    const i = lang === 'hi' ? 1 : 0;
    const statuses = progress.projects || {};
    const lab = (projects || [])
      .filter((pr) => ['in-progress', 'completed'].includes(statuses[pr.id]))
      .map((pr) => ({
        title: pr.t?.[i] || pr.t?.[0] || pr.id,
        tech: pr.stack?.[i] || pr.stack?.[0] || '',
        link: '',
        bullets: `Designed and built end-to-end — ${pr.stack?.[0] || ''}\nOutcome: ${pr.outcome?.[0] || ''}`,
      }));
    const own = (profile.projects || []).map((pr) => ({
      title: pr.name || pr.title || '',
      tech: Array.isArray(pr.stack) ? pr.stack.join(', ') : (pr.tech || ''),
      link: pr.link || '',
      bullets: Array.isArray(pr.bullets) ? pr.bullets.join('\n') : (pr.bullets || ''),
    }));
    const have = new Set((draft.projects || []).map((x) => String(x.title || '').toLowerCase()));
    return [...own, ...lab].filter((x) => x.title && !have.has(String(x.title).toLowerCase()));
  }, [projects, progress.projects, profile.projects, draft.projects, lang]);

  const runLabImport = () => {
    if (!labCandidates.length) {
      toast({ kind: 'info', title: ['Nothing new to import', 'इम्पोर्ट करने को कुछ नया नहीं'], body: ['Start a project in Project Lab first — in-progress and completed work lands here.', 'पहले प्रोजेक्ट लैब में प्रोजेक्ट शुरू करें — चल रहा और पूर्ण काम यहाँ आता है।'] });
      return;
    }
    const added = labCandidates.map((c) => ({ id: uid('rp'), ...c }));
    setDraft((d) => ({ ...d, projects: [...(d.projects || []), ...added] }));
    toast({ kind: 'success', title: ['Projects imported', 'प्रोजेक्ट इम्पोर्ट हुए'], body: [`${added.length} project(s) added to the Projects section — polish the bullets next.`, `${added.length} प्रोजेक्ट Projects सेक्शन में जुड़े — अब बुलेट निखारें।`] });
  };

  const draftBulletsFor = (pr) => {
    const tech = String(pr.tech || '').split(',')[0].trim() || L(['the core stack', 'कोर स्टैक']);
    return [
      `Built ${pr.title || 'a full-stack project'} with ${tech} — shipped end-to-end features from schema to UI.`,
      'Improved quality and speed: added tests and optimised queries, cutting load time by 20%.',
    ].join('\n');
  };

  const runCoachStep = async (step) => {
    setBusy('coach');
    await sleep(450);
    const { draft: next, note } = applyCoachStep(step, draft, coachCtx);
    setDraft(next);
    setTrain(null);
    toast({ title: ['Coach step applied', 'कोच चरण लागू हुआ'], body: [note, note] });
  };

  const fixBullet = (w) => {
    setDraft((d) => {
      const list = [...(d[w.kind] || [])];
      const entry = list[w.index];
      if (!entry) return d;
      const bullets = String(entry.bullets || '').split('\n').map((l) => (l.trim() === w.from ? w.to : l)).join('\n');
      list[w.index] = { ...entry, bullets };
      return { ...d, [w.kind]: list };
    });
    toast({ title: ['Bullet upgraded', 'बुलेट सुधारा गया'], body: [w.to, w.to] });
  };

  const applyTailor = (next, info) => {
    setDraft(next);
    toast({
      title: ['Draft tailored to the JD', 'ड्राफ्ट JD के अनुसार ढाला गया'],
      body: [`${info.addedSkills.length} skill(s) and an evidence bullet added locally.`, `${info.addedSkills.length} कौशल और एक प्रमाण बुलेट स्थानीय रूप से जुड़ा।`],
    });
  };

  const injectKeyword = (k) => {
    const name = SKILL_BY_ID[k]?.n ? L(SKILL_BY_ID[k].n) : k;
    const kind = (draft.experience || []).length ? 'experience' : (draft.projects || []).length ? 'projects' : null;
    if (!kind) {
      toast({ kind: 'warn', title: ['Add a role or project first', 'पहले कोई भूमिका या प्रोजेक्ट जोड़ें'], body: ['The keyword needs a bullet to live in.', 'कीवर्ड को किसी बुलेट में जगह चाहिए।'] });
      return;
    }
    const line = lang === 'hi'
      ? `${name} का उपयोग कैम्पस प्रोजेक्ट में किया और परिणाम दर्ज किए।`
      : `Applied ${name} in a campus project and documented the measurable outcome.`;
    setDraft((d) => {
      const list = [...(d[kind] || [])];
      const e = { ...list[0] };
      e.bullets = `${e.bullets || ''}${e.bullets ? '\n' : ''}${line}`;
      list[0] = e;
      return { ...d, [kind]: list };
    });
    toast({ title: ['Keyword bullet added', 'कीवर्ड बुलेट जुड़ा'], body: [line, line] });
    setBusy('');
  };

  const toggleSumVoice = () => {
    if (sumVoice) { sumCtl.current?.stop?.(); sumCtl.current = null; setSumVoice(false); return; }
    if (!sttSupported) {
      toast({ kind: 'warn', title: ['Voice input unavailable', 'वॉइस इनपुट उपलब्ध नहीं'], body: ['This browser has no Web Speech API — typing works everywhere.', 'इस ब्राउज़र में वेब स्पीच API नहीं — टाइपिंग हर जगह काम करती है।'] });
      return;
    }
    setSumVoice(true);
    sumCtl.current = startListening({
      lang: speech,
      continuous: true,
      interim: false,
      onResult: ({ final }) => { if (final) setDraft((d) => ({ ...d, summary: `${d.summary || ''} ${final}`.trim() })); },
      onEnd: () => setSumVoice(false),
      onError: () => setSumVoice(false),
    });
    if (!sumCtl.current) setSumVoice(false);
  };

  useEffect(() => () => sumCtl.current?.stop?.(), []);

  const downloadReport = () => {
    if (!analysis) return;
    const i = lang === 'hi' ? 1 : 0;
    const rows = analysis.checks.map((c) => `<li class="${c.pass ? 'ok' : 'bad'}">${c.pass ? '✓' : '✗'} ${c.n[i]} <b>(${c.weight})</b>${c.pass ? '' : ` — <i>${c.fix[i]}</i>`}</li>`).join('');
    const kw = analysis.keywords.hits.map((k) => SKILL_BY_ID[k]?.n?.[i] || k).join(', ') || '—';
    const kwMiss = analysis.keywords.missing.map((k) => SKILL_BY_ID[k]?.n?.[i] || k).join(', ') || '—';
    const traj = train ? train.passes.map((x) => `${x.label}: ${x.score}`).join(' → ') : '';
    const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CareerX ATS Report Card</title>
<style>body{font-family:system-ui,'Segoe UI',sans-serif;margin:36px auto;max-width:780px;padding:0 18px;color:#0f172a;background:#fff;line-height:1.55}h1{font-size:24px;margin:0 0 4px}.sub{color:#64748b;font-size:12px;margin-bottom:22px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.tile{border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px}.tile b{display:block;font-size:20px}.tile span{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#64748b}.bar{height:8px;background:#e2e8f0;border-radius:5px;margin:4px 0 10px}.fill{height:100%;border-radius:5px;background:#4f46e5}h2{font-size:15px;margin:22px 0 8px}ul{margin:0;padding-left:18px;font-size:13px}li{margin:4px 0}.ok{color:#047857}.bad{color:#b91c1c}small{display:block;margin-top:26px;color:#64748b;font-size:11px;border-top:1px solid #e2e8f0;padding-top:12px}</style></head><body>
<h1>CareerX — ATS Report Card</h1><div class="sub">${new Date().toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN')} · ${i ? 'स्वचालित रिपोर्ट' : 'Automated report'} · CareerX Campus to Corporate</div>
<div class="grid"><div class="tile"><span>${i ? 'स्कोर' : 'Score'}</span><b>${analysis.score}/100</b></div><div class="tile"><span>${i ? 'संरचना' : 'Structure'}</span><b>${analysis.parts.structure}</b></div><div class="tile"><span>${i ? 'सामग्री' : 'Content'}</span><b>${analysis.parts.content}</b></div><div class="tile"><span>${i ? 'कीवर्ड' : 'Keywords'}</span><b>${Math.round(analysis.parts.ats)}%</b></div></div>
<h2>${i ? 'घटक' : 'Components'}</h2>
${['content', 'structure', 'ats'].map((k) => `<div>${k} — ${Math.round(analysis.parts[k])}</div><div class="bar"><div class="fill" style="width:${Math.round(analysis.parts[k])}%"></div></div>`).join('')}
<h2>${i ? 'जाँच सूची' : 'Checklist'} (${analysis.checks.filter((c) => c.pass).length}/${analysis.checks.length})</h2><ul>${rows}</ul>
<h2>${i ? 'कीवर्ड' : 'Keywords'}</h2><p><b>${i ? 'मौजूद' : 'Present'}:</b> ${kw}<br><b>${i ? 'छूटे' : 'Missing'}:</b> ${kwMiss}</p>
${traj ? `<h2>${i ? 'प्रशिक्षण प्रक्षेपवक्र' : 'Training trajectory'}</h2><p>${traj} ${i ? '(+ ' : '(+ '}${train.gained})</p>` : ''}
<h2>${i ? 'सुझाव' : 'Top suggestions'}</h2><ul>${analysis.suggestions.map((x) => `<li>${x.text}</li>`).join('') || '<li>—</li>'}</ul>
<small>${i ? 'यह रिपोर्ट CareerX के पारदर्शी नियम-आधारित विश्लेषण से बनी है — वास्तविक ATS नहीं। कोई डेटा अपलोड नहीं हुआ।' : 'Generated by CareerX’s transparent rule-based analysis — not a real ATS. No data left this device.'}</small>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'careerx-ats-report-card.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast({ title: ['Report card downloaded', 'रिपोर्ट कार्ड डाउनलोड हुआ'], body: ['careerx-ats-report-card.html — opens in any browser.', 'careerx-ats-report-card.html — किसी भी ब्राउज़र में खुलेगी।'] });
  };

  useEffect(() => {
    const sc = analysis?.score ?? 0;
    setScoreHist((h) => (h[h.length - 1] === sc ? h : [...h, sc].slice(-14)));
  }, [analysis?.score]);
  const runTrain = async () => {
    setBusy('train');
    setTrainBefore(JSON.parse(JSON.stringify(draft)));
    await sleep(2600); // v9: matches the training console stream so passes feel computed
    const res = trainResume(draft, coachCtx, { target: trainTarget, maxPasses: 6 });
    setDraft(res.draft);
    setTrain(res);
    const first = res.passes[0].score;
    const last = res.passes[res.passes.length - 1].score;
    toast(res.gained > 0
      ? { title: ['Training complete', 'प्रशिक्षण पूर्ण'], body: [`ATS score ${first} → ${last} (+${res.gained}) in ${res.passes.length - 1} pass(es). Every change is listed below.`, `ATS स्कोर ${first} → ${last} (+${res.gained}), ${res.passes.length - 1} पास में। हर बदलाव नीचे सूचीबद्ध है।`] }
      : { kind: 'info', title: ['Nothing left to automate', 'स्वचालित करने को कुछ नहीं'], body: ['The remaining steps need your input — see the coach list.', 'शेष चरणों में आपका इनपुट चाहिए — कोच सूची देखें।'] });
    setBusy('');
  };

  const save = async () => {
    setBusy('save');
    await sleep(280);
    saveResume(draft);
    setBusy('');
    toast({ title: ['Resume saved', 'रिज़्यूमे सेव हुआ'], body: ['Your resume readiness score was recalculated.', 'आपका रिज़्यूमे रेडीनेस स्कोर दोबारा गिना गया।'] });
  };

  const runSummary = async () => {
    setBusy('summary');
    await sleep(520);
    const out = generateSummary({ profile, derived: { ...derived, gaps }, career: activeCareer });
    setSummaryPair(out.pair);
    setBusy('');
  };

  const useSummary = (text) => { patch({ summary: text }); setSummaryPair(null); };

  const runImprove = async (kind, index) => {
    const current = draft[kind][index].bullets || '';
    if (!current.trim()) {
      toast({ kind: 'warn', title: ['Nothing to improve', 'सुधारने के लिए कुछ नहीं'], body: ['Write at least one bullet first.', 'पहले कम से कम एक बुलेट लिखें।'] });
      return;
    }
    setBusy(`${kind}-${index}`);
    await sleep(460);
    const out = improveBullets(current, { career: activeCareer });
    setBusy('');
    listPatch(kind, index, { bullets: out.text });
    setChanges(out.changes);
    setImproveTarget({ kind, index });
  };

  const tpl = PALETTE[draft.template] || PALETTE.modern;

  const editorItems = [
    {
      id: 'personal',
      title: t('res.personal'),
      icon: FileText,
      content: (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('auth.fullName')} htmlFor="r-name"><Input id="r-name" value={draft.personal?.name || ''} onChange={(e) => patchPersonal('name', e.target.value)} /></Field>
          <Field label={t('res.headline')} htmlFor="r-head" hint={L(['One line under your name', 'नाम के नीचे एक पंक्ति'])}>
            <Input id="r-head" value={val(draft.personal?.headline)} onChange={(e) => patchPersonal('headline', e.target.value)} placeholder={L(['Final-year Computer Science student', 'अंतिम वर्ष के कंप्यूटर साइंस छात्र'])} />
          </Field>
          <Field label={t('auth.email')} htmlFor="r-email"><Input id="r-email" type="email" value={draft.personal?.email || ''} onChange={(e) => patchPersonal('email', e.target.value)} /></Field>
          <Field label={t('res.phone')} htmlFor="r-phone"><Input id="r-phone" value={draft.personal?.phone || ''} onChange={(e) => patchPersonal('phone', e.target.value)} /></Field>
          <Field label={t('res.cityLabel')} htmlFor="r-city"><Input id="r-city" value={val(draft.personal?.city)} onChange={(e) => patchPersonal('city', e.target.value)} /></Field>
          <Field label={t('res.github')} htmlFor="r-gh"><Input id="r-gh" value={draft.personal?.github || ''} onChange={(e) => patchPersonal('github', e.target.value)} placeholder="github.com/username" /></Field>
          <Field label={t('res.linkedin')} htmlFor="r-li" className="sm:col-span-2"><Input id="r-li" value={draft.personal?.linkedin || ''} onChange={(e) => patchPersonal('linkedin', e.target.value)} placeholder="linkedin.com/in/username" /></Field>
        </div>
      ),
    },
    {
      id: 'summary',
      title: t('res.summary'),
      icon: Sparkles,
      content: (
        <div className="space-y-3">
          <Textarea rows={4} value={draft.summary || ''} onChange={(e) => patch({ summary: e.target.value })}
            placeholder={L(['Two or three sentences: who you are, what you have built, what you are strengthening.', 'दो-तीन वाक्य: आप कौन हैं, क्या बनाया है, किस पर काम कर रहे हैं।'])} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" icon={busy === 'summary' ? Loader2 : Wand2} loading={busy === 'summary'} onClick={runSummary}>{t('res.generateSummary')}</Button>
            {sttSupported ? (
              <Button size="sm" variant={sumVoice ? 'danger' : 'quiet'} icon={sumVoice ? MicOff : Mic} onClick={toggleSumVoice} aria-pressed={sumVoice}>
                {sumVoice ? L(['Listening… stop', 'सुन रहा है… रोकें']) : L(['Dictate', 'बोलकर लिखें'])}
              </Button>
            ) : null}
            <span className="muted text-[11px]">{L([`${(draft.summary || '').length} characters`, `${(draft.summary || '').length} अक्षर`])}</span>
            <AILabel className="ml-auto" />
          </div>
          {summaryPair ? (
            <Card className="bg-surface2/60 p-3">
              <div className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Generated from your profile', 'आपकी प्रोफ़ाइल से बनाया गया'])}</div>
              <p className="text-[12.5px] leading-relaxed text-ink">{L(summaryPair)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" icon={Check} onClick={() => useSummary(summaryPair[0])}>{L(['Use English', 'अंग्रेज़ी उपयोग करें'])}</Button>
                <Button size="sm" variant="ghost" icon={Check} onClick={() => useSummary(summaryPair[1])}>{L(['हिंदी उपयोग करें', 'Use Hindi'])}</Button>
                <Button size="sm" variant="quiet" onClick={() => setSummaryPair(null)}>{t('common.cancel')}</Button>
              </div>
              <p className="muted mt-2.5 text-[10.5px] leading-snug">{L(['Template-built from your real inputs — no invented claims. Edit before you send it.', 'आपके वास्तविक इनपुट से टेम्पलेट-आधारित — कोई बनाई गई बात नहीं। भेजने से पहले संपादित करें।'])}</p>
            </Card>
          ) : null}
        </div>
      ),
    },
    {
      id: 'education',
      title: `${t('res.education')} (${(draft.education || []).length})`,
      icon: FileText,
      content: (
        <Repeater
          items={draft.education || []}
          addLabel={L(['Add education', 'शिक्षा जोड़ें'])}
          onAdd={() => listAdd('education', { id: uid('re'), degree: '', institute: '', period: '', score: '' })}
          onRemove={(i) => listRemove('education', i)}
          render={(item, i) => (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Field label={t('auth.degree')}><Input value={item.degree || ''} onChange={(e) => listPatch('education', i, { degree: e.target.value })} placeholder="B.Tech, Computer Science" /></Field>
              <Field label={L(['Institute', 'संस्थान'])}><Input value={item.institute || ''} onChange={(e) => listPatch('education', i, { institute: e.target.value })} /></Field>
              <Field label={t('res.period')}><Input value={item.period || ''} onChange={(e) => listPatch('education', i, { period: e.target.value })} placeholder="2022 – 2026" /></Field>
              <Field label={L(['Score', 'अंक'])}><Input value={item.score || ''} onChange={(e) => listPatch('education', i, { score: e.target.value })} placeholder="CGPA 8.2" /></Field>
            </div>
          )}
        />
      ),
    },
    {
      id: 'experience',
      title: `${t('res.experience')} (${(draft.experience || []).length})`,
      icon: FileText,
      content: (
        <Repeater
          items={draft.experience || []}
          addLabel={L(['Add experience', 'अनुभव जोड़ें'])}
          onAdd={() => listAdd('experience', { id: uid('rx'), role: '', company: '', period: '', bullets: '' })}
          onRemove={(i) => listRemove('experience', i)}
          render={(item, i) => (
            <div className="space-y-2.5">
              <div className="grid gap-2.5 sm:grid-cols-3">
                <Field label={t('res.roleTitle')}><Input value={item.role || ''} onChange={(e) => listPatch('experience', i, { role: e.target.value })} /></Field>
                <Field label={t('res.company')}><Input value={item.company || ''} onChange={(e) => listPatch('experience', i, { company: e.target.value })} /></Field>
                <Field label={t('res.period')}><Input value={item.period || ''} onChange={(e) => listPatch('experience', i, { period: e.target.value })} placeholder="Jun 2025 – Aug 2025" /></Field>
              </div>
              <BulletsField
                label={t('res.bullets')} hint={t('res.bulletsHint')} value={item.bullets || ''}
                onChange={(v) => listPatch('experience', i, { bullets: v })}
                busy={busy === `experience-${i}`} onImprove={() => runImprove('experience', i)}
              />
            </div>
          )}
        />
      ),
    },
    {
      id: 'projects',
      title: `${t('res.projects')} (${(draft.projects || []).length})`,
      icon: FileText,
      content: (
        <Repeater
          items={draft.projects || []}
          addLabel={L(['Add project', 'प्रोजेक्ट जोड़ें'])}
          onAdd={() => listAdd('projects', { id: uid('rp'), title: '', tech: '', link: '', bullets: '' })}
          onRemove={(i) => listRemove('projects', i)}
          render={(item, i) => (
            <div className="space-y-2.5">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Field label={t('onb.projectName')}><Input value={item.title || ''} onChange={(e) => listPatch('projects', i, { title: e.target.value })} /></Field>
                <Field label={t('res.tech')}><Input value={item.tech || ''} onChange={(e) => listPatch('projects', i, { tech: e.target.value })} placeholder="React, Node.js, MySQL" /></Field>
              </div>
              <Field label={t('res.link')}><Input value={item.link || ''} onChange={(e) => listPatch('projects', i, { link: e.target.value })} placeholder="github.com/you/project" /></Field>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="quiet" icon={Wand2} onClick={() => {
                  const add = draftBulletsFor(item);
                  listPatch('projects', i, { bullets: item.bullets ? `${item.bullets}\n${add}` : add });
                  toast({ kind: 'info', title: ['AI draft added', 'AI ड्राफ़्ट जुड़ा'], body: ['Review every bullet and keep only accurate claims.', 'हर बुलेट जाँचें और केवल सही दावे रखें।'] });
                }}>{L(['Draft AI bullets', 'AI बुलेट ड्राफ़्ट'])}</Button>
                <span className="muted text-[10.5px]">{L(['Review each suggestion for accuracy.', 'हर सुझाव की सटीकता जाँचें।'])}</span>
              </div>
              <BulletsField
                label={t('res.bullets')} hint={t('res.bulletsHint')} value={item.bullets || ''}
                onChange={(v) => listPatch('projects', i, { bullets: v })}
                busy={busy === `projects-${i}`} onImprove={() => runImprove('projects', i)}
              />
            </div>
          )}
        />
      ),
    },
    {
      id: 'skills',
      title: `${t('res.skills')} (${(draft.skills || []).length})`,
      icon: Check,
      content: (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const v = skillInput.trim();
                  if (v && !(draft.skills || []).includes(v)) patch({ skills: [...(draft.skills || []), v] });
                  setSkillInput('');
                }
              }}
              placeholder={L(['Type a skill and press Enter', 'कौशल लिखें और Enter दबाएँ'])} aria-label={t('res.skills')} />
            <Button size="sm" icon={Plus} onClick={() => {
              const v = skillInput.trim();
              if (v && !(draft.skills || []).includes(v)) patch({ skills: [...(draft.skills || []), v] });
              setSkillInput('');
            }}>{t('common.apply')}</Button>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {(draft.skills || []).map((sk) => (
              <li key={sk} className="chip chip-on gap-1.5">
                {sk}
                <button type="button" onClick={() => patch({ skills: draft.skills.filter((x) => x !== sk) })}
                  className="rounded-full p-0.5 transition hover:bg-bad/20 hover:text-bad" aria-label={L([`Remove ${sk}`, `${sk} हटाएँ`])}>
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </li>
            ))}
            {!(draft.skills || []).length ? <li className="muted text-[12px]">{t('res.empty')}</li> : null}
          </ul>
          {suggestedSkills.length ? (
            <div>
              <div className="muted mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Suggested from your profile & target role', 'आपकी प्रोफ़ाइल और लक्षित रोल से सुझाए गए'])}</div>
              <div className="flex flex-wrap gap-1.5">
                {suggestedSkills.map((s) => (
                  <Chip key={s} onClick={() => patch({ skills: [...(draft.skills || []), s] })}><Plus className="h-3 w-3" aria-hidden />{s}</Chip>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      id: 'achievements',
      title: `${t('res.achievements')} (${(draft.achievements || []).length})`,
      icon: Check,
      content: (
        <Repeater
          items={draft.achievements || []}
          addLabel={L(['Add achievement', 'उपलब्धि जोड़ें'])}
          onAdd={() => listAdd('achievements', { id: uid('ra'), text: '' })}
          onRemove={(i) => listRemove('achievements', i)}
          render={(item, i) => (
            <Field label={L(['Achievement', 'उपलब्धि'])}>
              <Input value={item.text || ''} onChange={(e) => listPatch('achievements', i, { text: e.target.value })}
                placeholder={L(['Winner, intra-college hackathon (team of 4)', 'विजेता, आंतरिक-कॉलेज हैकाथॉन (4 की टीम)'])} />
            </Field>
          )}
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><FileText className="h-3 w-3" aria-hidden />{t('nav.resume')}</>}
        title={t('res.title')}
        sub={t('res.sub')}
        tags={[
          <Badge key="s" tone={analysis?.score >= 75 ? 'ok' : analysis?.score >= 50 ? 'brand' : 'warn'}>{t('res.readiness')} · {analysis?.score ?? 0}/100</Badge>,
          scoreHist.length > 1 ? (
            <span key={`spark-${analysis?.score}`} className="chip-pop inline-flex items-center gap-1.5 rounded-full border border-line bg-surface2/60 px-2 py-1"
              title={L(['Score trend this session', 'इस सत्र का स्कोर ट्रेंड'])}>
              <svg width="64" height="18" viewBox="0 0 64 18" aria-hidden="true">
                <polyline
                  points={scoreHist.map((v, i) => `${2 + (i / Math.max(1, scoreHist.length - 1)) * 60},${16 - ((v - Math.min(...scoreHist)) / Math.max(1, Math.max(...scoreHist) - Math.min(...scoreHist))) * 13}`).join(' ')}
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-brand" />
              </svg>
              <span className={cn('text-[10px] font-bold tabular-nums', (scoreHist[scoreHist.length - 1] - scoreHist[0]) >= 0 ? 'text-ok' : 'text-bad')}>
                {(scoreHist[scoreHist.length - 1] - scoreHist[0]) >= 0 ? `+${scoreHist[scoreHist.length - 1] - scoreHist[0]}` : scoreHist[scoreHist.length - 1] - scoreHist[0]}
              </span>
            </span>
          ) : null,
          dirty ? <Badge key="d" tone="warn">{L(['Unsaved changes', 'असेव किए बदलाव'])}</Badge> : null,
          <AILabel key="ai" />,
        ]}
        actions={
          <>
            <Button size="sm" variant="ghost" icon={Award} onClick={() => setReportOpen(true)}>
              {L(['Report card', 'रिपोर्ट कार्ड'])}
            </Button>
            <Button size="sm" variant="ghost" icon={Upload} onClick={() => setImportOpen(true)}>
              {L(['Import', 'इम्पोर्ट'])}
            </Button>
            <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => setDraft(importFromProfile(profile, { ...derived, gaps }))}>
              {t('res.loadProfile')}
            </Button>
            <Button size="sm" variant="ghost" icon={Printer} onClick={() => window.print()}>{t('res.download')}</Button>
            <Button size="sm" icon={Save} loading={busy === 'save'} onClick={save}>{t('common.save')}</Button>
          </>
        }
      />

      {/* v7.5: Mission HUD — live resume state at first paint */}
      <MissionHud
        analysis={analysis} trained={!!train} dirty={dirty} imported={importedOnce}
        t={t} L={L} onTrain={runTrain} onReport={() => setReportOpen(true)}
      />

      <IntakeDeck
        busy={busy}
        labNew={labCandidates.length}
        onPaste={(txt) => runImport(txt, { name: L(['Pasted text', 'पेस्ट किया टेक्स्ट']) })}
        onFile={runFile}
        onLab={runLabImport}
        L={L}
      />

      {/* mobile view switcher — kept at the top so it never sits under the bottom nav */}
      <div className="flex overflow-hidden rounded-lg border border-line lg:hidden">
        {[{ id: 'edit', label: t('prof.edit'), icon: FileText }, { id: 'preview', label: t('res.preview'), icon: Eye }, { id: 'analysis', label: t('res.analysis'), icon: Sparkles }].map((x) => (
          <button key={x.id} type="button" data-tab={x.id} onClick={() => setTab(x.id)} aria-pressed={tab === x.id}
            className={cn('flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-[11.5px] font-bold transition', tab === x.id ? 'bg-brand/15 text-brand' : 'text-muted hover:text-ink')}>
            <x.icon className="h-3.5 w-3.5" aria-hidden />{x.label}
          </button>
        ))}
      </div>

      {/* template picker */}
      <Card className="p-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="muted text-[11px] font-bold uppercase tracking-wider">{t('res.template')}</span>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((tp) => (
              <button
                key={tp.id} type="button" onClick={() => patch({ template: tp.id })} aria-pressed={draft.template === tp.id}
                className={cn('tilt-card rounded-xl border px-3 py-2 text-left transition', draft.template === tp.id ? 'border-brand/60 bg-brand/10' : 'border-line bg-surface2/50 hover:border-brand/40')}
              >
                <div className="text-[12px] font-bold">{L(tp.n)}</div>
                <div className="muted text-[10.5px] leading-snug">{L(tp.desc)}</div>
                <span className="mt-2 flex h-10 items-stretch gap-1 overflow-hidden rounded-md border border-line bg-white p-1 dark:bg-[#0d1226]" aria-hidden>
                  {tp.id === 'modern' ? (
                    <>
                      <span className="w-1 rounded-sm bg-[#4338ca]" />
                      <span className="flex-1 space-y-1 py-0.5">
                        <span className="block h-1 w-3/4 rounded bg-[#64748b]" />
                        <span className="block h-1 w-1/2 rounded bg-[#cbd5e1]" />
                        <span className="block h-1 w-2/3 rounded bg-[#cbd5e1]" />
                      </span>
                    </>
                  ) : null}
                  {tp.id === 'professional' ? (
                    <span className="flex-1 space-y-1 py-0.5">
                      <span className="mx-auto block h-1.5 w-1/2 rounded bg-[#0f172a] dark:bg-[#e2e8f0]" />
                      <span className="block h-px w-full bg-[#0f172a] dark:bg-[#e2e8f0]" />
                      <span className="mx-auto block h-1 w-2/3 rounded bg-[#cbd5e1]" />
                      <span className="mx-auto block h-1 w-3/4 rounded bg-[#cbd5e1]" />
                    </span>
                  ) : null}
                  {tp.id === 'minimal' ? (
                    <span className="flex-1 space-y-1.5 py-1">
                      <span className="block h-1 w-2/5 rounded bg-[#9ca3af]" />
                      <span className="block h-1 w-4/5 rounded bg-[#e5e7eb] dark:bg-[#334155]" />
                      <span className="block h-1 w-3/5 rounded bg-[#e5e7eb] dark:bg-[#334155]" />
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        {/* editor */}
        <div className={cn('space-y-4', tab !== 'edit' && 'hidden xl:block')}>
          <Card className="relative overflow-hidden p-3.5">
            <span className="scanline" aria-hidden />
            <div className="relative flex flex-wrap items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand/30 bg-brand/10 text-brand"><Gauge className="h-4 w-4" aria-hidden /></span>
              <div>
                <div className="muted text-[9.5px] font-bold uppercase tracking-[0.14em]">{L(['Live ATS score', 'लाइव ATS स्कोर'])}</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="relative inline-flex items-baseline">
                    <AnimatedNumber value={analysis?.score ?? 0} className="font-display text-2xl font-bold" />
                    {scoreDelta ? (
                      <span key={scoreDelta.key} className={cn('score-pop ml-1.5 text-[12px] font-bold tabular-nums', scoreDelta.v > 0 ? 'text-ok' : 'text-bad')} aria-live="polite">
                        {scoreDelta.v > 0 ? `+${scoreDelta.v}` : scoreDelta.v}
                      </span>
                    ) : null}
                  </span>
                  <span className="muted text-[10px] font-bold">/100</span>
                  {delta !== 0 ? (
                    <span key={deltaKey} className={cn('delta-chip text-[11.5px] font-bold', delta > 0 ? 'text-ok' : 'text-bad')}>
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="ml-auto grid min-w-[190px] flex-1 grid-cols-3 gap-2.5 sm:flex-none">
                {[
                  [L(['Content', 'सामग्री']), analysis?.parts.content ?? 0, 'bg-brand'],
                  [L(['Structure', 'संरचना']), analysis?.parts.structure ?? 0, 'bg-accent'],
                  [L(['Keywords', 'कीवर्ड']), Math.round(analysis?.parts.ats ?? 0), 'bg-ok'],
                ].map(([lb, v, bg]) => (
                  <div key={lb}>
                    <div className="muted flex justify-between text-[9px] font-bold uppercase tracking-[0.1em]"><span>{lb}</span><span className="tabular-nums">{v}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                      <div className={cn('h-full rounded-full transition-all duration-700', bg)} style={{ width: `${clamp(v, 0, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <SectionStack items={editorItems} defaultOpen={['personal', 'summary']} />

          <div className="flex flex-wrap items-center gap-2">
            <Button icon={Save} loading={busy === 'save'} onClick={save}>{t('common.save')}</Button>
            <Button variant="ghost" icon={Printer} onClick={() => window.print()}>{t('res.download')}</Button>
            <Button variant="quiet" icon={Trash2} className="ml-auto" onClick={() => setConfirmReset(true)}>{L(['Clear resume', 'रिज़्यूमे खाली करें'])}</Button>
          </div>
          <p className="muted text-[11px]">{t('res.printHint')}</p>
        </div>

        {/* preview + analysis */}
        <div className="space-y-4">
          <div className={cn(tab === 'analysis' && 'hidden xl:block')}>
            <div className={cn(tab !== 'preview' && 'hidden xl:block')}>
              <Card className="p-0">
                <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                  <h2 className="font-display text-[13px] font-bold">{t('res.preview')}</h2>
                  <div className="flex items-center gap-2">
                    <Chip active={scanView} onClick={() => setScanView((v) => !v)} className="px-2.5 py-1.5" aria-pressed={scanView}>
                      {t('res.scanView')}
                    </Chip>
                    <Badge tone="muted">{L(TEMPLATES.find((x) => x.id === draft.template)?.n || ['Modern', 'मॉडर्न'])}</Badge>
                    <Button size="sm" variant="quiet" icon={Download} onClick={() => window.print()}>{L(['Print / PDF', 'प्रिंट / PDF'])}</Button>
                  </div>
                </div>
                <div className="relative max-h-[70vh] overflow-auto bg-[#f1f5f9] p-4 dark:bg-[#0b1020]">
                  <div key={draft.template} className="page-flip">
                  <ResumePaper resume={draft} tpl={tpl} lang={lang} L={L} kwTerms={kwNames} />
                  </div>
                  {scanView ? (
                    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                      <span className="scan-hot" style={{ top: '3%', left: '6%', width: '54%', height: '14%' }} />
                      <span className="scan-hot" style={{ top: '24%', left: '6%', width: '72%', height: '20%' }} />
                      <span className="scan-hot" style={{ top: '56%', left: '28%', width: '62%', height: '16%' }} />
                      <span className="absolute left-3 top-2 rounded bg-black/65 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white">{t('res.scanLabel')}</span>
                    </div>
                  ) : null}
                </div>
              </Card>
            </div>
          </div>

          <div className={cn(tab !== 'analysis' && 'hidden xl:block')}>
            <AnalysisPanel
              analysis={analysis} t={t} L={L} lang={lang}
              coachSteps={coachSteps} onApplyStep={runCoachStep} busy={busy}
              train={train} trainTarget={trainTarget} setTrainTarget={setTrainTarget} onTrain={runTrain}
              onSave={save} onOpenEditor={() => setTab('edit')} draft={draft} before={trainBefore} history={history}
              onBulletFix={fixBullet} onInjectKeyword={injectKeyword} onTailor={applyTailor}
            />
          </div>
        </div>
      </div>

      {/* bullet improvement change log */}
      <Modal
        open={!!improveTarget}
        onClose={() => { setImproveTarget(null); setChanges([]); }}
        title={t('res.improved')}
        sub={L(['Every change is listed — nothing was altered silently.', 'हर बदलाव सूचीबद्ध है — कुछ भी चुपचाप नहीं बदला गया।'])}
        icon={Wand2}
        footer={<Button onClick={() => { setImproveTarget(null); setChanges([]); }}>{t('common.close')}</Button>}
      >
        {changes.length ? (
          <ul className="space-y-2.5">
            {changes.map((c, i) => (
              <li key={i} className={cn('rounded-xl border p-3', c.advisory ? 'border-warn/30 bg-warn/[0.07]' : 'border-ok/30 bg-ok/[0.06]')}>
                <div className="flex items-center gap-2">
                  <Badge tone={c.advisory ? 'warn' : 'ok'}>{c.kind}</Badge>
                  {c.advisory ? <AlertTriangle className="h-3.5 w-3.5 text-warn" aria-hidden /> : <Check className="h-3.5 w-3.5 text-ok" aria-hidden />}
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-ink">{L(c.reason)}</p>
                {!c.advisory && c.from !== c.to ? (
                  <div className="mt-2 space-y-1 rounded-lg border border-line bg-surface2/60 p-2 font-mono text-[10.5px]">
                    <div className="text-bad line-through">{c.from}</div>
                    <div className="text-ok">{c.to}</div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Check} title={L(['No changes needed', 'कोई बदलाव आवश्यक नहीं'])} body={L(['Your bullets already follow the recommended pattern.', 'आपके बुलेट पहले से सुझाई गई शैली में हैं।'])} />
        )}
      </Modal>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={L(['Clear this resume?', 'यह रिज़्यूमे खाली करें?'])}
        icon={Trash2}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" icon={Trash2} onClick={() => { setDraft(emptyResume(profile)); setConfirmReset(false); toast({ kind: 'info', title: ['Resume cleared', 'रिज़्यूमे खाली हुआ'], body: ['Nothing was deleted from storage until you save.', 'सेव करने तक स्टोरेज से कुछ नहीं हटा।'] }); }}>
              {t('common.clear')}
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-muted">
          {L(['This clears the editor only. Your saved resume stays until you press Save.', 'यह केवल एडिटर खाली करता है। सेव दबाने तक आपका सेव किया रिज़्यूमे बना रहता है।'])}
        </p>
      </Modal>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={runImport} L={L} busy={busy === 'import'} />

      <Modal
        open={reportOpen} onClose={() => setReportOpen(false)} size="lg" icon={Award}
        title={L(['ATS Report Card', 'ATS रिपोर्ट कार्ड'])}
        sub={L(['A shareable one-page summary of this resume’s analysis. Automated estimates are not an official ATS result.', 'इस रिज़्यूमे विश्लेषण का एक-पृष्ठ सारांश। स्वचालित अनुमान आधिकारिक ATS परिणाम नहीं हैं।'])}
        footer={
          <>
            <Button variant="quiet" onClick={() => setReportOpen(false)}>{L(['Close', 'बंद करें'])}</Button>
            <Button icon={FileDown} onClick={downloadReport}>{L(['Download .html', 'डाउनलोड .html'])}</Button>
          </>
        }
      >
        {analysis ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <ProgressRing value={analysis.score} size={84} stroke={8} tone={analysis.score >= 75 ? 'ok' : analysis.score >= 50 ? 'brand' : 'warn'} label={`${analysis.score}`} />
              <div className="grid flex-1 grid-cols-3 gap-2">
                <HoloTile label={L(['Structure', 'संरचना'])} value={analysis.parts.structure} tone="accent" />
                <HoloTile label={L(['Content', 'सामग्री'])} value={analysis.parts.content} />
                <HoloTile label={t('res.keywordCoverage')} value={`${Math.round(analysis.parts.ats)}%`} tone="ok" />
              </div>
            </div>
            <ul className="space-y-1">
              {analysis.checks.map((c) => (
                <li key={c.id} className={cn('flex items-start gap-2 text-[12px] leading-snug', c.pass ? 'text-ok' : 'text-bad')}>
                  {c.pass ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> : <X className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
                  <span className="text-ink">{L(c.n)} <span className="muted">({c.weight})</span>{c.pass ? null : <span className="muted"> — {L(c.fix)}</span>}</span>
                </li>
              ))}
            </ul>
            {train ? (
              <div>
                <div className="muted mb-1 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Training trajectory', 'प्रशिक्षण प्रक्षेपवक्र'])}</div>
                <IsoLineRibbon data={train.passes.map((x) => ({ label: x.label, value: x.score }))} height={150} color="ok" />
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

/* ---------------- Resume v2: import modal (paste text or upload a file) ---------------- */

async function extractPdfText(file) {
  // Lazy-loaded so the core bundle stays small; text-based PDFs only.
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  const maxPages = Math.min(doc.numPages, 5);
  for (let i = 1; i <= maxPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const lines = [];
    let line = '';
    let lastY = null;
    content.items.forEach((it) => {
      const y = it.transform ? it.transform[5] : null;
      if (lastY !== null && typeof y === 'number' && Math.abs(y - lastY) > 3) { lines.push(line); line = ''; }
      line += `${it.str} `;
      lastY = y;
    });
    lines.push(line);
    pages.push(lines.join('\n'));
  }
  return pages.join('\n');
}

function TrainConsole({ L, target }) {
  const lines = [
    L(['initialising on-device coach model…', 'ऑन-डिवाइस कोच मॉडल शुरू…']),
    L(['tokenising summary and bullets…', 'सारांश और बुलेट टोकनाइज़…']),
    L(['matching keywords against target role…', 'लक्षित रोल से कीवर्ड मिलान…']),
    L(['re-weighting section scores…', 'सेक्शन स्कोर पुनः भारित…']),
    L(['simulating ATS parse pass…', 'ATS पार्स पास सिमुलेट…']),
    `${L(['optimising toward target', 'लक्ष्य की ओर अनुकूलन'])} ${target}…`,
  ];
  const [n, setN] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setN((v) => Math.min(lines.length, v + 1)), 430);
    return () => clearInterval(id);
  }, []);
  return (
    <Card className="overflow-hidden border-brand/40 bg-[#0a0f1e] p-3 font-mono text-[11.5px] text-emerald-300" data-console>
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-400">
        <Cpu className="h-3 w-3" aria-hidden />{L(['Resume coaching console', 'रिज़्यूमे कोचिंग कंसोल'])}
      </div>
      {lines.slice(0, n).map((l, i) => (<div key={i} className="console-line">▸ {l}</div>))}
      <div className="console-line cursor-blink">▸</div>
    </Card>
  );
}

function IntakeDeck({ onPaste, onFile, onLab, labNew, L, busy }) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);
  return (
    <Card className="intake-scan overflow-hidden" data-intake>
      <div className="grid gap-3 md:grid-cols-3">
        <div data-intake-tile className="tilt-card flex flex-col gap-2 rounded-xl border border-line bg-surface2/60 p-3">
          <div className="flex items-center gap-2 text-[12px] font-bold"><ClipboardPaste className="h-3.5 w-3.5 text-brand" aria-hidden />{L(['Add by text', 'टेक्स्ट से जोड़ें'])}</div>
          <p className="muted text-[11px] leading-snug">{L(['Paste any resume text — the local parser sorts it into sections.', 'कोई भी रिज़्यूमे टेक्स्ट पेस्ट करें — लोकल पार्सर उसे सेक्शनों में बाँटता है।'])}</p>
          {pasteOpen ? (
            <>
              <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} aria-label={L(['Resume text', 'रिज़्यूमे टेक्स्ट'])} placeholder={L(['Paste resume text…', 'रिज़्यूमे टेक्स्ट पेस्ट करें…'])} />
              {err ? <p className="text-[11px] font-semibold text-warn" role="alert">{err}</p> : null}
              <div className="flex gap-2">
                <Button size="sm" icon={Sparkles} loading={busy === 'import'} onClick={() => {
                  if (text.trim().length < 40) { setErr(L(['Too short — paste the full resume text.', 'बहुत छोटा — पूरा रिज़्यूमे टेक्स्ट पेस्ट करें।'])); return; }
                  setErr(''); onPaste(text); setText(''); setPasteOpen(false);
                }}>{L(['Parse & merge', 'पार्स और मर्ज'])}</Button>
                <Button size="sm" variant="quiet" onClick={() => { setPasteOpen(false); setErr(''); }}>{L(['Cancel', 'रद्द करें'])}</Button>
              </div>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setPasteOpen(true)}>{L(['Open text intake', 'टेक्स्ट इंटेक खोलें'])}</Button>
          )}
        </div>
        <div
          data-intake-tile role="button" tabIndex={0}
          aria-label={L(['Upload resume file', 'रिज़्यूमे फ़ाइल अपलोड करें'])}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files && e.dataTransfer.files[0]); }}
          className={cn('tilt-card flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-3 text-center transition', drag ? 'border-brand bg-brand/10' : 'border-line bg-surface2/40 hover:border-brand/50')}>
          <FileUp className={cn('h-5 w-5', drag ? 'text-brand' : 'text-muted')} aria-hidden />
          <span className="text-[12px] font-bold">{L(['Drop resume file', 'रिज़्यूमे फ़ाइल ड्रॉप करें'])}</span>
          <span className="muted text-[10.5px]">.pdf · .txt · .md — {L(['parsed on-device', 'डिवाइस पर पार्स'])}</span>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" className="sr-only" tabIndex={-1}
            onChange={(e) => { onFile(e.target.files && e.target.files[0]); e.target.value = ''; }} />
        </div>
        <div data-intake-tile className="tilt-card flex flex-col gap-2 rounded-xl border border-line bg-surface2/60 p-3">
          <div className="flex items-center gap-2 text-[12px] font-bold"><FlaskConical className="h-3.5 w-3.5 text-accent" aria-hidden />{L(['Pull from Project Lab', 'प्रोजेक्ट लैब से लाएँ'])}</div>
          <p className="muted text-[11px] leading-snug">{L(['Imports your logged and in-flight lab projects into the Projects section — its standard place on a resume.', 'आपके लॉग किए और चल रहे लैब प्रोजेक्ट Projects सेक्शन में जोड़ता है — रिज़्यूमे में उसका मानक स्थान।'])}</p>
          <Button size="sm" variant="ghost" icon={Plus} disabled={!!busy} onClick={onLab}>
            {L(['Import projects', 'प्रोजेक्ट इम्पोर्ट करें'])}
            {labNew ? <Badge tone="ok">{labNew}</Badge> : null}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ImportModal({ open, onClose, onImport, L, busy }) {
  const [mode, setMode] = useState('paste'); // paste | file
  const [text, setText] = useState('');
  const [raw, setRaw] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [stage, setStage] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState(null); // { parsed, report, name }

  useEffect(() => {
    if (!parsing) { setStage(0); return undefined; }
    const id = setInterval(() => setStage((v) => Math.min(2, v + 1)), 260);
    return () => clearInterval(id);
  }, [parsing]);

  useEffect(() => {
    if (!open) { setMode('paste'); setText(''); setRaw(''); setFileName(''); setErr(''); setPreview(null); setParsing(false); }
  }, [open]);

  const runParse = (source, name) => {
    setErr('');
    if (!source || source.trim().length < 40) {
      setErr(L(['That looks too short to be a resume — paste or upload the full text.', 'यह रिज़्यूमे के लिए बहुत छोटा है — पूरा टेक्स्ट पेस्ट या अपलोड करें।']));
      setPreview(null);
      return;
    }
    setParsing(true);
    try {
      const { parsed, report } = parseResumeText(source);
      setRaw(source);
      setPreview({ parsed, report, name });
    } finally {
      setTimeout(() => setParsing(false), 350);
    }
  };

  const onFile = async (file) => {
    if (!file) return;
    setErr('');
    setFileName(file.name);
    setMode('file');
    if (/\.(txt|md|markdown)$/i.test(file.name)) {
      setParsing(true);
      const content = await file.text();
      runParse(content, file.name);
      setParsing(false);
      return;
    }
    if (/\.pdf$/i.test(file.name)) {
      setParsing(true);
      try {
        const content = await extractPdfText(file);
        runParse(content, file.name);
      } catch {
        setErr(L(['Could not extract text — that PDF may be a scanned image. Paste the text instead.', 'टेक्स्ट नहीं निकला — PDF स्कैन की गई इमेज हो सकती है। टेक्स्ट पेस्ट करें।']));
      } finally {
        setParsing(false);
      }
      return;
    }
    setErr(L(['DOCX and image resumes cannot be parsed here — export as PDF/TXT or paste the text.', 'DOCX और इमेज रिज़्यूमे यहाँ पार्स नहीं होते — PDF/TXT निर्यात करें या टेक्स्ट पेस्ट करें।']));
  };

  const pr = preview?.parsed;
  const rep = preview?.report;

  return (
    <Modal
      open={open} onClose={onClose} size="lg" icon={Upload}
      title={L(['Import an existing resume', 'मौजूदा रिज़्यूमे इम्पोर्ट करें'])}
      sub={L(['Paste text or upload .txt / .md / .pdf — parsed locally in your browser, never uploaded.', 'टेक्स्ट पेस्ट करें या .txt / .md / .pdf अपलोड करें — आपके ब्राउज़र में ही पार्स होता है, कभी अपलोड नहीं होता।'])}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>{L(['Cancel', 'रद्द करें'])}</Button>
          <Button icon={Check} loading={busy} disabled={!preview || busy} onClick={() => onImport(raw, { name: preview.name })}>
            {L(['Merge into draft', 'ड्राफ़्ट में मर्ज करें'])}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2" role="tablist" aria-label={L(['Import method', 'इम्पोर्ट विधि'])}>
          {[{ id: 'paste', label: L(['Paste text', 'टेक्स्ट पेस्ट करें']), icon: ClipboardPaste }, { id: 'file', label: L(['Upload file', 'फ़ाइल अपलोड करें']), icon: FileUp }].map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={mode === x.id} onClick={() => setMode(x.id)}
              className={cn('flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[12px] font-bold transition', mode === x.id ? 'border-brand/60 bg-brand/10 text-brand' : 'border-line bg-surface2/50 text-muted hover:text-ink')}>
              <x.icon className="h-3.5 w-3.5" aria-hidden />{x.label}
            </button>
          ))}
        </div>

        {mode === 'paste' ? (
          <div className="space-y-2">
            <Textarea
              value={text} rows={10}
              onChange={(e) => setText(e.target.value)}
              placeholder={L(['Paste your full resume text here — headings like “Skills”, “Projects”, “Education” help the parser.', 'अपना पूरा रिज़्यूमे टेक्स्ट यहाँ पेस्ट करें — “Skills”, “Projects”, “Education” जैसे शीर्षक पार्सर की मदद करते हैं।'])}
              aria-label={L(['Resume text', 'रिज़्यूमे टेक्स्ट'])}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={Sparkles} loading={parsing} disabled={!text.trim() || parsing} onClick={() => runParse(text, '')}>
                {L(['Analyse text', 'टेक्स्ट विश्लेषित करें'])}
              </Button>
              <Button size="sm" variant="quiet" icon={FileUp} disabled={parsing} onClick={() => { setText(SAMPLE_RESUME); runParse(SAMPLE_RESUME, 'sample-resume.txt'); }}>
                {L(['Load & parse a sample', 'नमूना लोड करके पार्स करें'])}
              </Button>
            </div>
          </div>
        ) : (
          <label
            className={cn('flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition', parsing ? 'border-brand/50 bg-brand/5' : 'border-line bg-surface2/40 hover:border-brand/50 hover:bg-brand/5', dragOver && 'border-brand/80 bg-brand/10 scale-[1.01]')}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files?.[0]); }}
          >
            <input type="file" accept=".txt,.md,.pdf" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            {parsing ? <Loader2 className="h-6 w-6 animate-spin text-brand" aria-hidden /> : <Upload className="h-6 w-6 text-brand" aria-hidden />}
            <span className="text-[12.5px] font-semibold">{fileName || L(['Choose a .txt, .md or text-based .pdf', '.txt, .md या टेक्स्ट-आधारित .pdf चुनें'])}</span>
            <span className="muted max-w-[380px] text-[11px] leading-snug">
              {L(['Drag & drop works too. Scanned-image PDFs and .docx can’t be read here — export them to text first. Parsing runs entirely on your device.', 'ड्रैग एंड ड्रॉप भी चलता है। स्कैन-इमेज PDF और .docx यहाँ नहीं पढ़े जा सकते — पहले टेक्स्ट में निर्यात करें। पार्सिंग पूरी तरह आपके डिवाइस पर होती है।'])}
            </span>
          </label>
        )}

        {parsing ? (
          <ul className="space-y-1.5 rounded-xl border border-line bg-surface2/40 p-3" aria-live="polite">
            {[L(['Reading text…', 'टेक्स्ट पढ़ा जा रहा…']), L(['Detecting sections & headings…', 'अनुभाग और शीर्षक पहचाने जा रहे…']), L(['Mapping fields to your draft…', 'फ़ील्ड आपके ड्राफ़्ट से मैप हो रही…'])].map((m, i) => (
              <li key={m} className={cn('flex items-center gap-2 text-[11px] font-semibold transition-all duration-300', i <= stage ? 'text-ink opacity-100' : 'muted opacity-40')}>
                {i < stage ? <Check className="h-3 w-3 shrink-0 text-ok" aria-hidden /> : <Loader2 className="h-3 w-3 shrink-0 animate-spin text-brand" aria-hidden />}
                {m}
              </li>
            ))}
          </ul>
        ) : null}

        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-bad/30 bg-bad/[0.07] p-3 text-[11.5px] leading-snug text-bad" role="alert">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{err}
          </div>
        ) : null}

        {pr && rep ? (
          <div className="space-y-3 rounded-2xl border border-ok/25 bg-ok/[0.04] p-4 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-[13px] font-bold text-ok">{L(['Detected — review before merging', 'मिला — मर्ज से पहले समीक्षा करें'])}</h3>
              <span className="muted text-[10.5px] tabular-nums">{rep.words} {L(['words', 'शब्द'])} · {rep.lines} {L(['lines', 'पंक्तियाँ'])}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                [L(['Name', 'नाम']), pr.personal.name], [L(['Email', 'ईमेल']), pr.personal.email],
                [L(['Phone', 'फ़ोन']), pr.personal.phone], [L(['LinkedIn', 'लिंक्डइन']), pr.personal.linkedin],
                [L(['GitHub', 'गिटहब']), pr.personal.github], [L(['Headline', 'हेडलाइन']), pr.personal.headline],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="min-w-0 rounded-lg border border-line bg-surface/60 px-2.5 py-1.5">
                  <div className="muted text-[9.5px] font-bold uppercase tracking-[0.12em]">{k}</div>
                  <div className="truncate text-[11.5px] font-semibold">{v}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                [`Skills × ${pr.skills.length}`, pr.skills.length > 0],
                [`Education × ${pr.education.length}`, pr.education.length > 0],
                [`Projects × ${pr.projects.length}`, pr.projects.length > 0],
                [`Experience × ${pr.experience.length}`, pr.experience.length > 0],
                [`Achievements × ${pr.achievements.length}`, pr.achievements.length > 0],
                [`Summary ${pr.summary ? '✓' : '—'}`, !!pr.summary],
              ].map(([label, okFlag]) => (
                <Chip key={label} className={okFlag ? 'chip-on' : 'border-warn/30 bg-warn/10 text-warn'}>{label}</Chip>
              ))}
            </div>
            {rep.missed.length ? (
              <p className="muted text-[11px]">{L(['Not detected:', 'नहीं मिला:'])} {rep.missed.join(', ')} — {L(['you can add these in the editor after merging.', 'इन्हें मर्ज के बाद एडिटर में जोड़ सकते हैं।'])}</p>
            ) : null}
            <p className="muted text-[10.5px]">{L(['Merging fills empty fields and appends new entries — it never overwrites what you already wrote.', 'मर्ज खाली फ़ील्ड भरता है और नई एंट्रियाँ जोड़ता है — आपके लिखे हुए को कभी नहीं मिटाता।'])}</p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
function val(v) {
  if (Array.isArray(v)) return v[0] || '';
  return v || '';
}

function BulletsField({ label, hint, value, onChange, onImprove, busy }) {
  const { t, L } = useI18n();
  return (
    <Field label={label} hint={hint}>
      <Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={L(['One outcome per line.\nBuilt a role-based event portal serving 4 fests and 1,200+ registrations', 'प्रति पंक्ति एक परिणाम।\n4 फ़ेस्ट और 1,200+ पंजीकरण वाला पोर्टल बनाया'])} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" icon={busy ? Loader2 : Sparkles} loading={busy} onClick={onImprove}>{t('res.improveBullets')}</Button>
        <span className="muted text-[10.5px]">{L([`${value.split('\n').filter((x) => x.trim()).length} bullets`, `${value.split('\n').filter((x) => x.trim()).length} बुलेट`])}</span>
      </div>
    </Field>
  );
}

function Repeater({ items, render, onAdd, onRemove, addLabel }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.id || i} className="rounded-xl border border-line bg-surface2/40 p-3">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="muted text-[10.5px] font-bold uppercase tracking-wider">#{i + 1}</span>
            <button type="button" onClick={() => onRemove(i)} className="icon-btn h-7 w-7" aria-label={t('common.clear')}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          {render(item, i)}
        </div>
      ))}
      <Button size="sm" variant="ghost" icon={Plus} onClick={onAdd}>{addLabel}</Button>
    </div>
  );
}

/** The printable resume sheet — fixed light colours so print/PDF output is stable. */
const escRe = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function bulletAudit(text = '') {
  const t0 = text.trim();
  const verb = /^(Built|Developed|Designed|Implemented|Reduced|Improved|Created|Led|Automated|Optimised|Optimized|Shipped|Analysed|Analyzed|Launched|Increased|Owned|Delivered|Contributed|Managed|Wrote|Experimented|Supported|Practised)/i.test(t0);
  const quant = /\d/.test(t0);
  const len = t0.split(/\s+/).filter(Boolean).length <= 26 && t0.length > 8;
  return { verb, quant, len, score: [verb, quant, len].filter(Boolean).length * 33 + 1 };
}
function diffWords(a = '', b = '') {
  const norm = (w) => w.toLowerCase().replace(/[^\w%]/g, '');
  const A = a.split(/\s+/).filter(Boolean), B = b.split(/\s+/).filter(Boolean);
  const setA = new Set(A.map(norm));
  return { ins: B.filter((w) => !setA.has(norm(w))) };
}
function markKeywords(text, terms) {
  if (!terms?.length) return text;
  const re = new RegExp(`(${terms.map(escRe).join('|')})`, 'ig');
  const parts = String(text).split(re);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (i % 2 === 1 ? <mark key={i} className="kw-hit">{part}</mark> : part));
}

function ResumePaper({ resume, tpl, lang, L, kwTerms = [] }) {
  const i = lang === 'hi' ? 1 : 0;
  const p = resume.personal || {};
  const Section = ({ title, children }) => (
    children ? (
      <section className="mt-3.5">
        <h3 className={cn('text-[10px] font-bold uppercase tracking-[0.16em]', tpl.rule)} style={{ color: tpl.accent }}>{title}</h3>
        <div className="mt-1.5">{children}</div>
      </section>
    ) : null
  );
  const bullets = (text) => String(text || '').split('\n').map((b) => b.trim()).filter(Boolean);

  return (
    <div id="resume-print" className={cn('mx-auto w-full max-w-[210mm] bg-white px-7 py-8 text-[#0f172a] shadow-lift', tpl.font)} style={{ fontSize: 11.5, lineHeight: 1.5 }}>
      <header className={cn(draft_name_align(resume.template))}>
        <h1 className={cn('text-[22px] font-bold leading-tight', tpl.name)}>{p.name || L(['Your Name', 'आपका नाम'])}</h1>
        {val(p.headline) ? <p className="mt-0.5 text-[12px] text-[#334155]">{Array.isArray(p.headline) ? p.headline[i] : p.headline}</p> : null}
        <div className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[10.5px] text-[#475569] sm:justify-start">
          {[p.email, p.phone, val(p.city), p.github, p.linkedin].filter(Boolean).map((x, idx) => <span key={idx}>{x}</span>)}
        </div>
      </header>

      <Section title={L(['Summary', 'सारांश'])}>
        {kwTerms.length ? <p className="mb-1 text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#059669]">{L(['Green = target-role keyword matched', 'हरा = लक्षित रोल कीवर्ड मिला'])}</p> : null}
        {resume.summary ? <p className="text-[11.5px] leading-relaxed text-[#1e293b]">{markKeywords(resume.summary, kwTerms)}</p> : <p className="text-[11px] italic text-[#94a3b8]">{L(['No summary yet', 'अभी सारांश नहीं'])}</p>}
      </Section>

      <Section title={L(['Education', 'शिक्षा'])}>
        {(resume.education || []).map((e) => (
          <div key={e.id} className="mb-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[11.5px] font-semibold">{e.degree}</span>
              <span className="text-[10.5px] text-[#475569]">{e.period}</span>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[11px] text-[#334155]">{e.institute}</span>
              {e.score ? <span className="text-[10.5px] font-semibold text-[#334155]">{e.score}</span> : null}
            </div>
          </div>
        ))}
      </Section>

      <Section title={L(['Experience', 'अनुभव'])}>
        {(resume.experience || []).map((x) => (
          <div key={x.id} className="mb-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[11.5px] font-semibold">{x.role}{x.company ? <span className="font-normal text-[#334155]"> · {x.company}</span> : null}</span>
              <span className="text-[10.5px] text-[#475569]">{x.period}</span>
            </div>
            <ul className="mt-1 space-y-0.5">
              {bullets(x.bullets).map((b, bi) => (
                <li key={bi} className="flex gap-1.5 text-[11px] leading-snug text-[#1e293b]">
                  <span aria-hidden className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-[#94a3b8]" />{markKeywords(b, kwTerms)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section title={L(['Projects', 'प्रोजेक्ट'])}>
        {(resume.projects || []).map((pr) => (
          <div key={pr.id} className="mb-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[11.5px] font-semibold">{pr.title}</span>
              {pr.link ? <span className="text-[10px] text-[#4338ca]">{pr.link}</span> : null}
            </div>
            {pr.tech ? <div className="text-[10.5px] italic text-[#475569]">{pr.tech}</div> : null}
            <ul className="mt-1 space-y-0.5">
              {bullets(pr.bullets).map((b, bi) => (
                <li key={bi} className="flex gap-1.5 text-[11px] leading-snug text-[#1e293b]">
                  <span aria-hidden className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-[#94a3b8]" />{markKeywords(b, kwTerms)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section title={L(['Skills', 'कौशल'])}>
        {(resume.skills || []).length ? (
          <p className="text-[11px] leading-relaxed text-[#1e293b]">{resume.skills.join(' · ')}</p>
        ) : null}
      </Section>

      <Section title={L(['Achievements', 'उपलब्धियाँ'])}>
        {(resume.achievements || []).length ? (
          <ul className="space-y-0.5">
            {resume.achievements.map((a) => (
              <li key={a.id} className="flex gap-1.5 text-[11px] leading-snug text-[#1e293b]">
                <span aria-hidden className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-[#94a3b8]" />{a.text}
              </li>
            ))}
          </ul>
        ) : null}
      </Section>
    </div>
  );
}

function draft_name_align(template) {
  return template === 'professional' ? 'text-center' : 'text-left';
}

/** ATS analysis results — every check is explained, nothing is a black box. */
/** v7.5: Mission HUD — the resume's live state the instant the page opens. */
function Led({ on, label }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
      <span className={cn('h-2 w-2 rounded-full', on ? 'animate-pulse bg-ok shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-line')} aria-hidden />
      <span className={on ? 'text-ink' : 'muted'}>{label}</span>
    </span>
  );
}

function MissionHud({ analysis, trained, dirty, imported, t, L, onTrain, onReport }) {
  const score = analysis?.score ?? 0;
  const angle = -90 + (Math.min(100, Math.max(0, score)) / 100) * 180;
  const meters = [
    [L(['Structure', 'संरचना']), analysis?.parts.structure ?? 0, 'bg-accent'],
    [L(['Content', 'सामग्री']), analysis?.parts.content ?? 0, 'bg-brand'],
    [L(['Keywords', 'कीवर्ड']), Math.round(analysis?.parts.ats ?? 0), 'bg-ok'],
  ];
  return (
    <Card grad className="relative overflow-hidden">
      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
        <div className="relative h-[74px] w-[130px] shrink-0" role="img" aria-label={`${t('res.readiness')}: ${score}/100`}>
          <svg viewBox="0 0 130 74" className="h-full w-full">
            <defs>
              <linearGradient id="hudg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
            </defs>
            <path d="M8 66 A57 57 0 0 1 122 66" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" className="text-surface2" />
            <path d="M8 66 A57 57 0 0 1 122 66" fill="none" stroke="url(#hudg)" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${(Math.min(100, Math.max(0, score)) / 100) * 179} 200`} className="transition-all duration-700" />
            <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '65px 66px', transition: 'transform 0.9s cubic-bezier(0.3, 0.8, 0.3, 1)' }}>
              <line x1="65" y1="66" x2="65" y2="22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-ink" />
            </g>
            <circle cx="65" cy="66" r="4" fill="currentColor" className="text-brand" />
          </svg>
          <div className="absolute inset-x-0 bottom-0 text-center font-display text-lg font-bold tabular-nums text-ink">
            {score}<span className="muted text-[10px]">/100</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5" aria-label={L(['Live part scores', 'लाइव भाग स्कोर'])}>
          {meters.map(([label, val, cls]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="muted w-16 shrink-0 text-[9.5px] font-bold uppercase tracking-wider">{label}</span>
              <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface2">
                <span className={cn('block h-full rounded-full transition-all duration-700', cls)} style={{ width: `${Math.min(100, Math.max(0, val))}%` }} />
              </span>
              <span className="w-8 shrink-0 text-right text-[10px] font-bold tabular-nums text-ink">{val}</span>
            </div>
          ))}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <Led on={imported} label={t('res.hudImported')} />
          <Led on={trained} label={t('res.hudTrained')} />
          <Led on={!dirty} label={t('res.hudSaved')} />
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button size="sm" icon={Rocket} onClick={onTrain}>{L(['Train resume', 'रिज़्यूमे प्रशिक्षित करें'])}</Button>
          <Button size="sm" variant="quiet" icon={Award} onClick={onReport}>{L(['Report card', 'रिपोर्ट कार्ड'])}</Button>
        </div>
      </div>
      <span className="scanline" aria-hidden />
    </Card>
  );
}

/** v7: paste any job description → local keyword-overlap analysis → one-click tailor. */
function TailorStudio({ draft, t, L, lang, onApply }) {
  const [jd, setJd] = useState('');
  const [res, setRes] = useState(null);
  const run = () => setRes(analyzeJdMatch(jd, draft));
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-[14px] font-bold">
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-brand/30 bg-brand/10 text-brand"><Target className="h-3.5 w-3.5" aria-hidden /></span>
          {t('res.tailorTitle')}
        </h2>
        {res ? <Badge tone={res.overlap >= 70 ? 'ok' : res.overlap >= 40 ? 'brand' : 'warn'}>{res.overlap}% {t('res.tailorMatch')}</Badge> : null}
      </div>
      <Textarea
        className="mt-3" rows={4} value={jd} onChange={(e) => setJd(e.target.value)}
        aria-label={t('res.tailorTitle')} placeholder={t('res.tailorPaste')}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" icon={Target} disabled={!jd.trim()} onClick={run}>{t('res.tailorBtn')}</Button>
        {res?.missing?.length ? (
          <Button size="sm" variant="ghost" icon={Wand2}
            onClick={() => {
              const out = tailorDraft(draft, res.missing, lang);
              onApply(out.draft, out);
              setRes(analyzeJdMatch(jd, out.draft));
            }}>
            {t('res.tailorApply')}
          </Button>
        ) : null}
      </div>
      {res ? (
        res.jdSkills.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <ProgressRing value={res.overlap} size={72} stroke={8} tone={res.overlap >= 70 ? 'ok' : res.overlap >= 40 ? 'brand' : 'warn'} label={`${res.overlap}%`} sublabel={t('res.tailorMatch')} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap gap-1">
                {res.matched.map((k) => <Chip key={k} className="chip-on border-ok/40 text-ok"><Check className="h-3 w-3" aria-hidden />{L(SKILL_BY_ID[k]?.n || [k, k])}</Chip>)}
              </div>
              <div className="flex flex-wrap gap-1">
                {res.missing.map((k) => <Chip key={k} className="border-bad/30 bg-bad/10 text-bad">{L(SKILL_BY_ID[k]?.n || [k, k])}</Chip>)}
              </div>
            </div>
          </div>
        ) : <p className="muted mt-2 text-[12px]">{t('res.tailorEmpty')}</p>
      ) : null}
      <p className="muted mt-2 text-[10.5px]">{t('res.tailorNote')}</p>
    </Card>
  );
}

/** Flatten a draft into rendered-paper lines so training runs can be diffed line-by-line. */
function paperLines(d = {}) {
  const out = [];
  const push = (v) => { const x = String(v == null ? '' : v).trim(); if (x) out.push(x); };
  push(d.summary);
  (d.experience || []).forEach((e) => {
    push(`${e.role || ''} @ ${e.company || ''} ${e.period || ''}`.trim());
    String(e.bullets || '').split(/\n+/).forEach(push);
  });
  (d.projects || []).forEach((e) => {
    push(`${e.title || ''} ${e.tech || ''}`.trim());
    String(e.bullets || '').split(/\n+/).forEach(push);
  });
  (Array.isArray(d.skills) ? d.skills : String(d.skills || '').split(/[,|\n]+/)).forEach(push);
  (d.education || []).forEach((e) => push(`${e.degree || ''} ${e.institute || ''}`.trim()));
  return out;
}

function AnalysisPanel({ analysis, t, L, coachSteps = [], onApplyStep, busy, train, trainTarget, setTrainTarget, onTrain, onSave, onOpenEditor, draft, before, onBulletFix, onInjectKeyword, onTailor, lang, history = [] }) {
  const [speaking, setSpeaking] = useState(false);
  const [trainStage, setTrainStage] = useState(0);
  const [cmpView, setCmpView] = useState('changes');
  useEffect(() => {
    if (busy !== 'train') { setTrainStage(0); return undefined; }
    const id = setInterval(() => setTrainStage((v) => (v + 1) % 4), 700);
    return () => clearInterval(id);
  }, [busy]);
  if (!analysis) return null;
  const tone = analysis.score >= 75 ? 'ok' : analysis.score >= 50 ? 'brand' : 'warn';
  const partsData = [
    { label: L(['Content', 'सामग्री']), value: analysis.parts.content, color: 'brand' },
    { label: L(['Structure', 'संरचना']), value: analysis.parts.structure, color: 'accent' },
    { label: L(['Keywords', 'कीवर्ड']), value: Math.round(analysis.parts.ats), color: 'ok' },
    { label: L(['Overall', 'कुल']), value: analysis.score, color: 'brand', compare: trainTarget },
  ];
  const checkGot = analysis.checks.reduce((a, c) => a + (c.pass ? c.weight : 0), 0);
  const checkAll = analysis.checks.reduce((a, c) => a + (c.weight || 0), 0) || 1;
  const radarYou = [
    analysis.parts.structure, analysis.parts.content, Math.round(analysis.parts.ats),
    Math.round((checkGot / checkAll) * 100), analysis.score,
  ];
  const weakBullets = [];
  ['experience', 'projects'].forEach((kind) => {
    (draft?.[kind] || []).forEach((e, index) => {
      String(e.bullets || '').split('\n').forEach((ln) => {
        const t0 = ln.trim();
        if (!t0 || weakBullets.length >= 4) return;
        const sug = improveBullets(t0, {}).text?.split('\n')[0]?.trim();
        if (sug && sug !== t0) weakBullets.push({ kind, index, from: t0, to: sug });
      });
    });
  });
  const sectionHealth = (() => {
    const hi = { Summary: 'सारांश', Skills: 'कौशल', Projects: 'प्रोजेक्ट', Experience: 'अनुभव', Education: 'शिक्षा', Achievements: 'उपलब्धियाँ' };
    const groups = {
      Summary: ['summary'], Skills: ['skills'], Projects: ['projects'],
      Experience: ['bullets', 'quantified', 'pronouns', 'length'],
      Education: ['education'], Achievements: ['achievements'],
    };
    return Object.entries(groups).map(([label, ids]) => {
      const cs = analysis.checks.filter((c) => ids.includes(c.id));
      const got = cs.reduce((a, c) => a + (c.pass ? c.weight : 0), 0);
      const all = cs.reduce((a, c) => a + (c.weight || 0), 0) || 1;
      const v = Math.round((got / all) * 100);
      return { label: L([label, hi[label]]), value: v, compare: 100, color: v >= 80 ? 'ok' : v >= 50 ? 'brand' : 'warn' };
    });
  })();
  const autoCount = coachSteps.filter((x) => x.auto).length;

  return (
    <div className="stagger space-y-4 rounded-xl2 border border-line bg-surface p-3 dark:bg-surface2">
      {busy === 'train' ? <TrainConsole L={L} target={trainTarget} /> : null}
      {/* ── Score hero with 3D breakdown ── */}
      <Card>
        <div className="flex items-start gap-4">
          <ProgressRing value={analysis.score} size={92} stroke={9} tone={tone} label={`${analysis.score}`} />
          <div className="min-w-0 flex-1">
            <h2 className="flex flex-wrap items-center gap-2 font-display text-[15px] font-bold">{t('res.analysis')}
              {ttsSupported ? (
                <Button size="sm" variant="quiet" data-tts icon={speaking ? Square : Volume2} onClick={() => {
                  if (speaking) { stopSpeaking(); setSpeaking(false); return; }
                  speak(analysis.summary, { lang: lang === 'hi' ? 'hi-IN' : 'en-IN', onEnd: () => setSpeaking(false) });
                  setSpeaking(true);
                }}>{L(['Read aloud', 'सुनें'])}</Button>
              ) : null}
            </h2>
            <p className="muted mt-1 text-[12px] leading-relaxed">{analysis.summary}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {partsData.map((d) => (
                <Chip key={d.label} className={cn('tabular-nums', d.color === 'ok' ? 'chip-on' : '')}>
                  {d.label} · {d.value}{d.label.includes('कीवर्ड') || d.label === 'Keywords' ? '%' : ''}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 border-t border-line pt-2">
          <div className="muted mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">
            <Gauge className="h-3 w-3" aria-hidden />
            {L(['3D score breakdown', '3D स्कोर ब्रेकडाउन'])}
          </div>
          <div data-compare>
            <IsoBarChart data={partsData} height={190} max={100} depth={14} compareLabel={L([`Target · ${trainTarget}`, `लक्ष्य · ${trainTarget}`])} />
          </div>
          <div className="mt-3 border-t border-line pt-2" data-health>
            <div className="muted mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">
              <Layers className="h-3 w-3" aria-hidden />
              {L(['Section health — where recruiters look', 'सेक्शन हेल्थ — रिक्रूटर कहाँ देखते हैं'])}
            </div>
            <IsoBarChart data={sectionHealth} height={180} max={100} depth={12} compareLabel={L(['Full marks', 'पूर्ण अंक'])} />
          </div>
        </div>
        <div className="mt-3 border-t border-line pt-2" data-traj>
          <div className="muted mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">
            <TrendingUp className="h-3 w-3" aria-hidden />
            {L(['Score trajectory — scans on this device', 'स्कोर प्रवृत्ति — इस डिवाइस के स्कैन'])}
          </div>
          {history.length > 1 ? (
            <IsoLineRibbon data={history.map((h2, i) => ({ label: `#${i + 1}`, value: h2.score }))} height={140} color="brand" />
          ) : (
            <p className="muted text-[11px]">{L(['Edit, save and re-train to start plotting your score over time.', 'समय के साथ स्कोर प्लॉट करने के लिए संपादित करें, सेव करें और दोबारा ट्रेन करें।'])}</p>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <AILabel />
          <span className="muted text-[10.5px]">{t('int.demoEval')}</span>
        </div>
      </Card>

      {/* ── v5: 3D balance radar — this resume vs the training target ── */}
      <Card>
        <div className="muted mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">
          <Gauge className="h-3 w-3" aria-hidden />
          {t('res.radar')}
        </div>
        <IsoRadar
          height={235}
          axes={[t('res.axStructure'), t('res.axContent'), t('res.axKeywords'), t('res.axChecks'), t('res.axScore')].map((label) => ({ label }))}
          series={[
            { name: t('res.radarYou'), color: 'brand', values: radarYou },
            { name: t('res.radarTarget'), color: 'ok', dash: true, values: [trainTarget, trainTarget, trainTarget, trainTarget, trainTarget] },
          ]}
        />
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Chip className="chip-on">{t('res.radarYou')}</Chip>
          <Chip className="border-dashed border-ok/40 text-ok">{t('res.radarTarget')} · {trainTarget}</Chip>
          <span className="muted text-[10.5px]">{t('int.demoEval')}</span>
        </div>
      </Card>

      {/* ── ATS Coach: one-click fixes ── */}
      {coachSteps.length ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-[14px] font-bold">
              <span className="grid h-7 w-7 place-items-center rounded-lg border border-brand/30 bg-brand/10 text-brand"><Zap className="h-3.5 w-3.5" aria-hidden /></span>
              {L(['ATS Coach — apply fixes', 'ATS कोच — सुधार लागू करें'])}
            </h2>
            <Badge tone="brand">{L([`${autoCount} one-click`, `${autoCount} एक-क्लिक`])}</Badge>
          </div>
          <ul className="mt-3 space-y-2">
            {coachSteps.map((step) => (
              <li key={step.id} className="flex items-start gap-3 rounded-xl border border-line bg-surface2/40 p-3 transition hover:border-brand/40">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand/15 font-display text-[10px] font-bold text-brand tabular-nums" title={L(['Impact weight', 'प्रभाव भार'])}>
                  {step.impact}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold leading-snug">{step.titleText}</div>
                  <p className="muted mt-0.5 text-[11px] leading-snug">{step.detailText}</p>
                </div>
                {step.auto ? (
                  <Button size="sm" variant="ghost" icon={Wand2} disabled={!!busy} loading={busy === 'coach'} onClick={() => onApplyStep(step)}>
                    {L(['Apply', 'लागू करें'])}
                  </Button>
                ) : (
                  <Chip className="shrink-0 border-warn/30 bg-warn/10 text-warn">{L(['Manual', 'मैन्युअल'])}</Chip>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* ── v6: AI Bullet Doctor — per-line rewrites with accept ── */}
      {weakBullets.length ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-[14px] font-bold">
              <span className="grid h-7 w-7 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent"><Wand2 className="h-3.5 w-3.5" aria-hidden /></span>
              {t('res.bulletDoctor')}
            </h2>
            <Badge tone="accent">{weakBullets.length}</Badge>
          </div>
          <ul className="mt-3 space-y-2">
            {weakBullets.map((w, i) => {
              const au = bulletAudit(w.from);
              const au2 = bulletAudit(w.to);
              const dw = diffWords(w.from, w.to);
              return (
              <li key={i} data-audit className="rounded-xl border border-line bg-surface2/40 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip className={cn('tabular-nums', au.score >= 66 ? 'chip-on' : '')}>{L(['ATS', 'एटीएस'])} {au.score}</Chip>
                  <ArrowRight className="h-3 w-3 text-muted" aria-hidden />
                  <Chip className="chip-on tabular-nums">{L(['ATS', 'एटीएस'])} {au2.score}</Chip>
                  {!au.verb ? <Badge tone="warn">{L(['weak verb', 'कमज़ोर क्रिया'])}</Badge> : null}
                  {!au.quant ? <Badge tone="warn">{L(['no numbers', 'संख्या नहीं'])}</Badge> : null}
                  {!au.len ? <Badge tone="bad">{L(['too long', 'बहुत लंबा'])}</Badge> : null}
                </div>
                <p className="muted mt-2 text-[11.5px] leading-snug line-clamp-2">{w.from}</p>
                <p className="mt-1.5 text-[12px] font-semibold leading-snug text-ink">→ {w.to}{dw.ins.length ? <span className="ml-1.5 align-middle text-[10px] font-bold text-ok">+ {dw.ins.slice(0, 4).join(' + ')}</span> : null}</p>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="ghost" icon={Check} onClick={() => onBulletFix(w)}>{t('res.accept')}</Button>
                </div>
              </li>
              );
            })}
          </ul>
          <p className="muted mt-2 text-[10.5px]">{t('res.doctorNote')}</p>
        </Card>
      ) : null}

      {/* ── v7: JD Tailor Studio ── */}
      <TailorStudio draft={draft} t={t} L={L} lang={lang} onApply={onTailor} />

      {/* ── Train-to-target loop ── */}
      <Card className="relative overflow-hidden">
        <span className="scanline" aria-hidden />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-[14px] font-bold">
              <span className="grid h-7 w-7 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent"><Rocket className="h-3.5 w-3.5" aria-hidden /></span>
              {L(['Train toward a target ATS score', 'लक्षित ATS स्कोर तक प्रशिक्षण'])}
            </h2>
            <Badge tone="muted">{L(['Automated analysis', 'स्वचालित विश्लेषण'])}</Badge>
          </div>
          <p className="muted mt-1.5 text-[11.5px] leading-relaxed">
            {L([
              'Applies every safe automatic fix one pass at a time, re-scoring after each pass, and shows you exactly what changed. Nothing is uploaded anywhere.',
              'हर सुरक्षित स्वचालित सुधार एक-एक पास में लागू करता है, हर पास के बाद स्कोर फिर गिनता है, और हर बदलाव दिखाता है। कुछ भी अपलोड नहीं होता।',
            ])}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="flex min-w-[220px] flex-1 items-center gap-3">
              <span className="muted flex items-center gap-1.5 text-[11px] font-bold"><Target className="h-3.5 w-3.5" aria-hidden />{L(['Target', 'लक्ष्य'])}</span>
              <input
                type="range" min={70} max={95} step={5} value={trainTarget}
                onChange={(e) => setTrainTarget(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-line accent-brand"
                aria-label={L(['Target ATS score', 'लक्षित ATS स्कोर'])}
              />
              <span className="font-display text-[15px] font-bold tabular-nums text-brand">{trainTarget}</span>
            </label>
            <Button size="sm" icon={Rocket} loading={busy === 'train'} disabled={!!busy} onClick={onTrain}>
              {L(['Train resume', 'रिज़्यूमे प्रशिक्षित करें'])}
            </Button>
          </div>

          {busy === 'train' ? (
            <div className="relative mt-3 overflow-hidden rounded-xl border border-accent/30 bg-accent/[0.06] p-3">
              <span className="scan-beam" aria-hidden />
              <div className="relative flex items-center gap-2.5">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden />
                <span key={trainStage} className="chip-pop text-[12px] font-semibold text-ink">
                  {[L(['Reading structure & verbs…', 'संरचना और क्रियाएँ पढ़ी जा रही हैं…']), L(['Closing keyword gaps…', 'कीवर्ड गैप भरे जा रहे हैं…']), L(['Re-scoring after each pass…', 'हर पास के बाद स्कोर दोबारा गिना जा रहा…']), L(['Plotting your trajectory…', 'आपका प्रक्षेपवक्र बनाया जा रहा…'])][trainStage]}
                </span>
              </div>
            </div>
          ) : null}

          {train ? (
            <div className="mt-4 space-y-3 border-t border-line pt-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <HoloTile label={L(['Score gained', 'स्कोर वृद्धि'])} value={`+${train.gained}`} icon={TrendingUp} tone="ok"
                  sub={`${train.passes[0].score} → ${train.passes[train.passes.length - 1].score}`} />
                <HoloTile label={L(['Training passes', 'प्रशिक्षण पास'])} value={train.passes.length - 1} icon={Zap} tone="accent"
                  sub={L(['Auto-fix rounds', 'स्वचालित सुधार राउंड'])} />
                <HoloTile label={L(['Target status', 'लक्ष्य स्थिति'])} value={train.reachedTarget ? L(['Reached', 'प्राप्त']) : L(['Not yet', 'अभी नहीं'])} icon={Target}
                  tone={train.reachedTarget ? 'ok' : 'warn'} sub={L([`Target ${trainTarget}/100`, `लक्ष्य ${trainTarget}/100`])} />
              </div>

              {train.passes.length > 1 ? (
                <div>
                  <div className="muted mb-1 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Score trajectory', 'स्कोर प्रक्षेपवक्र'])}</div>
                  <IsoLineRibbon data={train.passes.map((x) => ({ label: x.label, value: x.score }))} height={170} color="ok" />
                </div>
              ) : null}

              <ol className="space-y-2">
                {train.passes.slice(1).map((pass) => (
                  <li key={pass.n} className="rounded-xl border border-line bg-surface2/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-[12px] font-bold">{pass.label}</span>
                      <Badge tone="ok">{pass.score}/100</Badge>
                    </div>
                    <ul className="muted mt-1.5 space-y-1">
                      {pass.applied.map((a) => (
                        <li key={a.id} className="flex items-start gap-1.5 text-[11px] leading-snug">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-ok" aria-hidden />
                          <span><span className="font-semibold text-ink">{a.title}</span> — {a.note}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>

              {before ? (() => {
                const bL = paperLines(before);
                const aL = paperLines(draft);
                const bSet = new Set(bL);
                const aSet = new Set(aL);
                const added = aL.filter((l) => !bSet.has(l));
                const removed = bL.filter((l) => !aSet.has(l));
                return (
                  <div className="mt-3 rounded-xl border border-line bg-surface2/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="muted text-[10px] font-bold uppercase tracking-[0.14em]">{t('res.compare')}</span>
                      <Segmented
                        value={cmpView} onChange={setCmpView} label={t('res.compare')}
                        options={[
                          { value: 'changes', label: t('res.changes') },
                          { value: 'before', label: t('res.before') },
                          { value: 'after', label: t('res.after') },
                        ]}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone="ok">+{added.length} {t('res.added')}</Badge>
                      <Badge tone="bad">−{removed.length} {t('res.removed')}</Badge>
                    </div>
                    <ul className="mt-2 max-h-60 space-y-1 overflow-auto pr-1 text-[11px] leading-snug text-ink" aria-live="polite">
                      {cmpView === 'changes' ? (
                        added.length || removed.length ? (
                          <>
                            {removed.map((l, i) => <li key={`r${i}`} className="diff-del">− {l}</li>)}
                            {added.map((l, i) => <li key={`a${i}`} className="diff-add">+ {l}</li>)}
                          </>
                        ) : <li className="muted">{t('res.noLineChanges')}</li>
                      ) : (cmpView === 'before' ? bL : aL).map((l, i) => <li key={i} className="rounded px-1">{l}</li>)}
                    </ul>
                  </div>
                );
              })() : null}

              {train.remainingManual.length ? (
                <div>
                  <div className="muted mb-1 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Still needs you', 'आपकी ज़रूरत'])}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {train.remainingManual.map((m) => <Chip key={m} className="border-warn/30 bg-warn/10 text-warn">{m}</Chip>)}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <Button size="sm" icon={Save} disabled={!!busy} loading={busy === 'save'} onClick={onSave}>
                  {L(['Save trained resume', 'प्रशिक्षित रिज़्यूमे सेव करें'])}
                </Button>
                <Button size="sm" variant="quiet" icon={FileText} onClick={onOpenEditor}>
                  {L(['Review in editor', 'एडिटर में देखें'])}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      {/* ── Structural checks ── */}
      <Card>
        <h2 className="font-display text-[14px] font-bold">{L([`Structural checks (${analysis.checks.filter((c) => c.pass).length}/${analysis.checks.length} passed)`, `संरचनात्मक जाँच (${analysis.checks.filter((c) => c.pass).length}/${analysis.checks.length} पास)`])}</h2>
        <ul className="mt-3 space-y-1.5">
          {analysis.checks.map((c) => (
            <li key={c.id} className={cn('flex items-start gap-2.5 rounded-xl border p-2.5', c.pass ? 'border-ok/25 bg-ok/[0.05]' : 'border-bad/25 bg-bad/[0.05]')}>
              <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full', c.pass ? 'bg-ok/20 text-ok' : 'bg-bad/20 text-bad')}>
                {c.pass ? <Check className="h-2.5 w-2.5" aria-hidden /> : <X className="h-2.5 w-2.5" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold leading-snug">{L(c.n)}</div>
                {!c.pass ? <p className="muted mt-0.5 text-[11px] leading-snug">{L(c.fix)}</p> : null}
              </div>
              <span className="muted shrink-0 text-[10px] font-bold tabular-nums">{c.weight}</span>
            </li>
          ))}
        </ul>
      </Card>

      {analysis.weakSections.length ? (
        <Card>
          <h2 className="font-display text-[14px] font-bold">{t('res.weakSections')}</h2>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {analysis.weakSections.map((w) => <Chip key={w[0]} className="border-warn/30 bg-warn/10 text-warn">{L(w)}</Chip>)}
          </div>
        </Card>
      ) : null}

      <Card>
        <h2 className="font-display text-[14px] font-bold">{t('res.missingKeywords')}</h2>
        <p className="muted mt-1 text-[11.5px]">{L(['Keywords your target role expects, checked against your resume text.', 'आपके लक्षित रोल के अपेक्षित कीवर्ड, आपके रिज़्यूमे टेक्स्ट से जाँचे गए।'])}</p>
        <div className="mt-2.5 space-y-2">
          <div>
            <div className="muted mb-1 text-[10px] font-bold uppercase tracking-[0.14em]">{L([`Present (${analysis.keywords.hits.length})`, `मौजूद (${analysis.keywords.hits.length})`])}</div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.keywords.hits.map((k) => <Chip key={k} className="chip-on">{L(SKILL_BY_ID[k]?.n || [k, k])}</Chip>)}
              {!analysis.keywords.hits.length ? <span className="muted text-[11.5px]">{t('res.empty')}</span> : null}
            </div>
          </div>
          <div>
            <div className="muted mb-1 text-[10px] font-bold uppercase tracking-[0.14em]">{L([`Missing (${analysis.keywords.missing.length})`, `छूटे (${analysis.keywords.missing.length})`])}</div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.keywords.missing.map((k) => (
                <Chip key={k} className="cursor-pointer border-bad/30 bg-bad/10 text-bad transition hover:border-brand/50 hover:text-ink"
                  onClick={() => onInjectKeyword(k)} title={t('res.injectHint')}>
                  <Plus className="h-3 w-3" aria-hidden />{L(SKILL_BY_ID[k]?.n || [k, k])}
                </Chip>
              ))}
              {!analysis.keywords.missing.length ? <span className="text-[11.5px] font-semibold text-ok">{L(['All target keywords covered', 'सभी लक्षित कीवर्ड शामिल'])}</span> : null}
            </div>
          </div>
        </div>
      </Card>

      {analysis.suggestions.length ? (
        <Card>
          <h2 className="font-display text-[14px] font-bold">{L(['Highest-impact fixes', 'सबसे प्रभावशाली सुधार'])}</h2>
          <ol className="mt-3 space-y-2">
            {analysis.suggestions.map((s, idx) => (
              <li key={s.id} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand/15 font-display text-[10px] font-bold text-brand">{idx + 1}</span>
                <span className="text-[12px] leading-snug text-ink">{s.text}</span>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
            <Button size="sm" variant="ghost" to="/app/project-lab" iconRight={ArrowRight}>{t('nav.lab')}</Button>
            <Button size="sm" variant="quiet" to="/app/interview">{t('nav.interview')}</Button>
          </div>
        </Card>
      ) : null}

      <DemoNotice tone="warn" icon={AlertTriangle}>
        {L(['This analyser checks structure, verbs, numbers and keyword coverage in your browser. It is not an actual ATS and no resume is uploaded.',
          'यह विश्लेषक आपके ब्राउज़र में संरचना, क्रियाएँ, संख्याएँ और कीवर्ड कवरेज जाँचता है। यह वास्तविक ATS नहीं है और रिज़्यूमे अपलोड नहीं होता।'])}
      </DemoNotice>
      <div className="flex justify-end"><DemoTag /></div>
    </div>
  );
}

/** Multi-open collapsible section stack (the FAQ Accordion is single-open by design). */
function SectionStack({ items, defaultOpen = [] }) {
  const [open, setOpen] = useState(() => new Set(defaultOpen));
  const toggle = (id) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const isOpen = open.has(it.id);
        const Icon = it.icon;
        return (
          <Card key={it.id} data-sec-id={it.id} className={cn('overflow-hidden p-0 transition', isOpen && 'border-brand/30')}>
            <button
              type="button" onClick={() => toggle(it.id)} aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface2/60"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-brand/25 bg-brand/10 text-brand">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 font-display text-[13.5px] font-bold">{it.title}</span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition-transform duration-300', isOpen && 'rotate-180')} aria-hidden />
            </button>
            <div className={cn('grid transition-all duration-300 ease-spring', isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
              <div className="overflow-hidden">
                <div className="border-t border-line px-4 py-4">{it.content}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
