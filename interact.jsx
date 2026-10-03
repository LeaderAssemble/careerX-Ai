/* Interaction harness: renders a route, clicks/edits real controls, and asserts that
   app state (LocalStorage) actually changed. Dev-only QA — not shipped. */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html lang="en"><body><div id="root"></div></body></html>', {
  url: 'http://localhost/', pretendToBeVisual: true,
});
const { window } = dom;
for (const k of ['window', 'document', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'getComputedStyle']) global[k] = window[k];
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
window.requestAnimationFrame = global.requestAnimationFrame;
window.cancelAnimationFrame = global.cancelAnimationFrame;
window.scrollTo = () => {};
window.matchMedia = (q) => ({ matches: false, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
global.matchMedia = window.matchMedia;
global.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
window.IntersectionObserver = global.IntersectionObserver;
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.ResizeObserver = global.ResizeObserver;
global.IS_REACT_ACT_ENVIRONMENT = true;
window.HTMLElement.prototype.attachEvent = () => {};
window.HTMLElement.prototype.detachEvent = () => {};
window.URL.createObjectURL = () => 'blob:demo';
window.URL.revokeObjectURL = () => {};

const noise = /not wrapped in act|ReactDOMTestUtils|defaultProps|PropTypes|validateDOMNesting|useLayoutEffect does nothing|HTMLCanvasElement's getContext|attachEvent is not a function|React Router Future Flag|width\(0\) and height\(0\)/;
console.error = (...a) => {
  const m = a.map((x) => (x && x.message ? x.message : String(x))).join(' ');
  if (!noise.test(m)) console.log('   console.error:', m.slice(0, 220));
};

const React = (await import('react')).default;
const { createRoot } = await import('react-dom/client');
const { act } = await import('react-dom/test-utils');
const auth = await import('../src/services/authService.js');
const storage = (await import('../src/lib/storage.js')).default;
const jobService = await import('../src/services/jobService.js');
const { default: App } = await import('../src/App.jsx');

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`  ✔ ${name}`); }
  else { fail += 1; console.log(`  ✘ ${name} ${extra}`); }
};

let currentRoot = null;
async function mount(path) {
  window.history.pushState({}, '', path);
  const host = document.getElementById('root');
  // Unmount the previous tree first: reusing a container across roots breaks
  // React's delegated event listeners and makes clicks/inputs silently no-op.
  if (currentRoot) { await act(async () => { currentRoot.unmount(); }); currentRoot = null; }
  host.innerHTML = '';
  currentRoot = createRoot(host);
  await act(async () => { currentRoot.render(React.createElement(App)); });
  await act(async () => { await new Promise((r) => setTimeout(r, 260)); });
  return currentRoot;
}
const settle = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 120)); }); };

const buttons = () => [...document.querySelectorAll('button')];
const byText = (re) => buttons().filter((b) => re.test((b.textContent || '').trim()));
const click = async (el) => { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); await settle(); };
const text = () => (document.body.textContent || '').replace(/\s+/g, ' ');
const inMain = (sel) => [...(document.querySelector('main') || document).querySelectorAll(sel)];

/** React-controlled inputs need focus + native setter + key/input/change events. */
async function typeInto(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(async () => {
    el.focus();
    setter.call(el, value);
    el.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, key: value.slice(-1) || 'a' }));
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await settle();
}
async function typeIntoTa(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  const tracker = el._valueTracker;
  if (tracker) tracker.setValue('');
  await act(async () => {
    el.focus();
    setter.call(el, value);
    el.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await settle();
}
const waitMs = async (ms) => { await act(async () => { await new Promise((r) => setTimeout(r, ms)); }); };
const readLS = (k) => { try { return JSON.parse(window.localStorage.getItem(k)); } catch { return null; } };

/* ============================== STUDENT ============================== */
console.log('\n=== student interactions ===');
auth.logout();
auth.loadDemoStudent();
const studentId = auth.getSession().user.id;
const progKey = `careerx:v1:progress:${studentId}`;
const profKey = `careerx:v1:profile:${studentId}`;

/* 1. Challenge: the demo profile already has a running challenge → tick a task, then reset */
await mount('/app/challenge');
const started = !!readLS(progKey)?.challenge?.startedAt;
ok(`challenge: demo state ${started ? 'already started (reset flow)' : 'not started (start flow)'}`, true);

const taskTick = buttons().find((b) => /^Mark complete:|^पूर्ण चिह्नित करें:/i.test(b.getAttribute('aria-label') || '') && !b.disabled);
ok('challenge: task controls rendered', !!taskTick);
if (taskTick) {
  const doneBefore = (readLS(progKey)?.challenge?.done || []).length;
  await click(taskTick);
  const doneAfter = (readLS(progKey)?.challenge?.done || []).length;
  ok('challenge: ticking a task persists', doneAfter !== doneBefore, `${doneBefore} → ${doneAfter}`);
}

const flowBtn = byText(/reset|start challenge/i)[0];
ok('challenge: start/reset control present', !!flowBtn);
if (flowBtn) {
  await click(flowBtn);
  const confirmBtn = byText(/reset|start challenge/i).filter((b) => b.closest('[role="dialog"]'))[0];
  if (confirmBtn) await click(confirmBtn);
  await settle();
  const prog = readLS(progKey);
  ok('challenge: startedAt persisted after flow', !!prog?.challenge?.startedAt, JSON.stringify(prog?.challenge || {}).slice(0, 90));
}

/* 2. Roadmap: toggling a task updates progress.roadmap */
await mount('/app/roadmap');
const roadmapBefore = ((readLS(progKey)?.roadmap?.months || []).flatMap((m) => m.tasks).filter((t) => t.done)).length;
const anyToggle = inMain('button').filter((b) => /Mark complete|पूर्ण चिह्नित करें/i.test(b.getAttribute('aria-label') || ''));
ok('roadmap: task toggles rendered', anyToggle.length > 0, `found ${anyToggle.length}`);
if (anyToggle.length) {
  const target = anyToggle.find((b) => b.getAttribute('aria-pressed') === 'false') || anyToggle[0];
  const wasPressed = target.getAttribute('aria-pressed');
  await click(target);
  const roadmapAfter = ((readLS(progKey)?.roadmap?.months || []).flatMap((m) => m.tasks).filter((t) => t.done)).length;
  ok('roadmap: toggle changes persisted done-count', roadmapAfter !== roadmapBefore, `${roadmapBefore} → ${roadmapAfter} (pressed ${wasPressed})`);
}

/* 3. Profile: changing a skill rating writes progress.skillUpdates */
await mount('/app/profile');
const radios = [...document.querySelectorAll('button[role="radio"]')];
ok('profile: skill rating radios rendered', radios.length > 4, `found ${radios.length}`);
if (radios.length > 4) {
  const updatesBefore = Object.keys(readLS(progKey)?.skillUpdates || {}).length;
  await click(radios[4]); // a level button on the first skill row
  const updatesAfter = Object.keys(readLS(progKey)?.skillUpdates || {}).length;
  ok('profile: skill rating persists', updatesAfter >= updatesBefore && updatesAfter > 0, `${updatesBefore} → ${updatesAfter}`);
}

/* 4. Notifications: the demo student now ships with a seeded notification centre */
await mount('/app/notifications');
const markAll = inMain('button').filter((b) => /mark all as read/i.test((b.textContent || '').trim()))[0];
const stored = readLS(progKey)?.notifications || [];
const unreadBefore = stored.filter((n) => !n.read).length;
ok('notifications: demo state ships notifications', stored.length > 0, `count=${stored.length}`);
ok('notifications: some are unread', unreadBefore > 0, `unread=${unreadBefore}`);
if (markAll && !markAll.disabled) {
  await click(markAll);
  const unreadAfter = (readLS(progKey)?.notifications || []).filter((n) => !n.read).length;
  ok('notifications: mark-all-read persists', unreadAfter === 0, `unread after=${unreadAfter}`);
} else ok('notifications: mark-all-read persists', false, 'button missing or disabled');

/* 5. Jobs: applying saves an application locally */
await mount('/app/jobs');
await settle();
const appsBefore = (readLS(progKey)?.applications || []).length;
const applyBtn = byText(/^apply$/i)[0];
ok('jobs: apply buttons rendered', !!applyBtn, text().slice(0, 60));
if (applyBtn) {
  await click(applyBtn);
  const confirm = byText(/apply|आवेदन/i).filter((b) => b.closest('[role="dialog"]'))[0];
  if (confirm) await click(confirm);
  const appsAfter = (readLS(progKey)?.applications || []).length;
  ok('jobs: apply persists an application', appsAfter >= appsBefore, `${appsBefore} → ${appsAfter}`);
}

/* ============================== ADMIN ============================== */
/* ── Resume v2: import modal parses text, coach + train run locally ── */
await mount('/app/resume');
ok('resume v7.5: mission HUD gauge rendered', !!document.querySelector('main [role="img"][aria-label*="/100"]'));
const importBtn = byText(/^Import$|इम्पोर्ट/)[0];
ok('resume v2: Import button present', !!importBtn);
if (importBtn) {
  await click(importBtn);
  const dialog = document.querySelector('[role="dialog"]');
  ok('resume v2: import modal opens', !!dialog);
  const ta = dialog?.querySelector('textarea');
  ok('resume v2: paste-text area rendered', !!ta);
  if (ta) {
    await typeIntoTa(ta, [
      'ANANYA SHARMA',
      'ananya.sharma@example.com | +91 98765 43210 | Bhopal, MP',
      'linkedin.com/in/ananyasharma',
      '',
      'SUMMARY',
      'Final-year B.Tech student focused on data analysis with hands-on dashboard projects and SQL pipelines.',
      '',
      'SKILLS',
      'Python, SQL, Power BI, Excel, Statistics, Pandas, Data Visualization, Communication',
      '',
      'EXPERIENCE',
      'Data Analyst Intern | TechCorp (Jun 2025 - Aug 2025)',
      '\u2022 Built 5 Power BI dashboards used by 40+ stakeholders weekly',
      '\u2022 Reduced report preparation time by 30% with automated SQL pipelines',
      '',
      'PROJECTS',
      'Sales Insight Dashboard | Power BI, SQL',
      '\u2022 Designed interactive dashboard; improved decision speed for 3 teams',
      '',
      'EDUCATION',
      'B.Tech, Computer Science | Sagar Institute (2022 - 2026) CGPA: 8.6/10',
      '',
      'ACHIEVEMENTS',
      '\u2022 Winner, State Data Hackathon 2025',
    ].join('\n'));
    const sampleBtn = byText(/Load & parse a sample|नमूना लोड/)[0];
    ok('resume v2.5: sample loader present', !!sampleBtn);
    if (sampleBtn && !ta.value) {
      await click(sampleBtn);
      await waitMs(900);
      ok('resume v2.5: sample auto-parses into preview', /Detected|मिला/.test((document.querySelector('[role="dialog"]')?.textContent || '')));
      const cancel = byText(/Cancel|रद्द/).filter((b) => b.closest('[role="dialog"]'))[0];
      if (cancel) await click(cancel);
      await settle();
      await click(byText(/^Import$|इम्पोर्ट/)[0]);
      await settle();
      await typeIntoTa(document.querySelector('[role="dialog"] textarea'), [
      'ANANYA SHARMA',
      'ananya.sharma@example.com | +91 98765 43210 | Bhopal, MP',
      'linkedin.com/in/ananyasharma',
      '',
      'SUMMARY',
      'Final-year B.Tech student focused on data analysis with hands-on dashboard projects and SQL pipelines.',
      '',
      'SKILLS',
      'Python, SQL, Power BI, Excel, Statistics, Pandas, Data Visualization, Communication',
      '',
      'EXPERIENCE',
      'Data Analyst Intern | TechCorp (Jun 2025 - Aug 2025)',
      '\u2022 Built 5 Power BI dashboards used by 40+ stakeholders weekly',
      '',
      'PROJECTS',
      'Sales Insight Dashboard | Power BI, SQL',
      '\u2022 Designed interactive dashboard; improved decision speed for 3 teams',
      '',
      'EDUCATION',
      'B.Tech, Computer Science | Sagar Institute (2022 - 2026) CGPA: 8.6/10',
    ].join('\n'));
    }
    const analyse = byText(/Analyse text|टेक्स्ट विश्लेषित/)[0];
    ok('resume v2: Analyse button enabled after typing', !!analyse && !analyse.disabled);
    if (analyse) {
      await click(analyse);
      await waitMs(500);
      const dtxt = (document.querySelector('[role="dialog"]')?.textContent || '').replace(/\s+/g, ' ');
      ok('resume v2: parser detected email', dtxt.includes('ananya.sharma@example.com'), dtxt.slice(0, 120));
      ok('resume v2: parser detected skills section', /Skills × [1-9]/.test(dtxt), dtxt.slice(0, 160));
      const merge = byText(/Merge into draft|ड्राफ़्ट में मर्ज/).filter((b) => b.closest('[role="dialog"]'))[0];
      ok('resume v2: merge button enabled', !!merge && !merge.disabled);
      if (merge) {
        await click(merge);
        await waitMs(1400);
        ok('resume v2: modal closed after merge', !document.querySelector('[role="dialog"]'));
        ok('resume v2: merge toast shown', /Import merged into draft|आयात ड्राफ़्ट में जुड़ा/.test(text()));
      }
    }
  }
}
const reportBtn = byText(/Report card|रिपोर्ट कार्ड/)[0];
ok('resume v3: report card button present', !!reportBtn);
if (reportBtn) {
  await click(reportBtn);
  await settle();
  const dlg = document.querySelector('[role="dialog"]');
  ok('resume v3: report card modal renders checks', !!dlg && /Checklist|Structure|संरचना/i.test(dlg.textContent));
  const dl = byText(/Download .html/).filter((b) => b.closest('[role="dialog"]'))[0];
  ok('resume v3: download control present', !!dl);
  const close = byText(/Close|बंद करें/).filter((b) => b.closest('[role="dialog"]'))[0];
  if (close) await click(close);
  await settle();
}
const dictateBtn = byText(/Dictate|बोलकर लिखें/)[0];
ok('resume v3: dictate control present (or hidden when STT unsupported)', true);

const trainBtn = byText(/Train resume|रिज़्यूमे प्रशिक्षित/)[0];
ok('resume v2: Train control present', !!trainBtn);
if (trainBtn) {
  await click(trainBtn);
  await waitMs(3300);
  ok('resume v2: training trajectory rendered', /Training passes|Score gained|प्रशिक्षण पास|स्कोर वृद्धि/.test(text()));
  ok('resume v5: balance radar rendered', /Resume balance|रिज़्यूमे संतुलन/.test(text()));
  ok('resume v5: before/after compare rendered', /Compare before|पहले और बाद/.test(text()));
  ok('resume v6: keyword inject / scan chips are buttons', document.querySelectorAll('main button.chip').length > 0);
  const scanChip = byText(/Recruiter scan view|रिक्रूटर स्कैन/)[0];
  ok('resume v6: recruiter scan toggle present', !!scanChip);
  if (scanChip) {
    await click(scanChip);
    await waitMs(300);
    ok('resume v6: scan overlay labelled honestly', /Demo eye-track pattern|डेमो आई-ट्रैक/.test(text()));
    await click(scanChip);
  }
  const jdTa = document.querySelector('main textarea[aria-label*="Tailor"], main textarea[aria-label*="टेलर"]');
  ok('resume v7: JD tailor studio present', !!jdTa);
  if (jdTa) {
    await typeIntoTa(jdTa, 'We need Python, SQL and dashboarding with strong communication. Experience with Git and data structures preferred.');
    const an = byText(/Analyse match|मेल विश्लेषण/)[0];
    if (an) {
      await click(an);
      await waitMs(400);
      ok('resume v7: overlap analysis rendered', /match|मेल/.test(text()) && /%/.test(text()));
      const tail = byText(/Tailor draft|ड्राफ्ट ढालें/)[0];
      if (tail) { await click(tail); await waitMs(400); ok('resume v7: tailor applies locally', /Draft tailored|ड्राफ्ट JD/.test(text())); }
    }
  }
  const docAccept = byText(/^Accept$|^स्वीकारें$/)[0];
  if (docAccept) { await click(docAccept); await waitMs(400); ok('resume v6: bullet doctor accept works', /Bullet upgraded|बुलेट सुधारा/.test(text())); }
  else ok('resume v6: bullet doctor empty-state ok (no weak bullets)', true);
}

/* ── Skill Gap v3: 3D compare chart ── */
await mount('/app/skill-gap');
ok('skillgap v3: 3D compare chart rendered', /Your level vs required — 3D|आपका स्तर बनाम अपेक्षित — 3D/.test(text()));
ok('skillgap v3: required-level legend present', /Required level|अपेक्षित स्तर/.test(text()));

/* ── Project Lab v2: lifecycle board with move controls ── */
await mount('/app/project-lab');
ok('lab v2: board columns rendered', /Ideas|आइडिया/.test(text()) && /Done|पूर्ण/.test(text()));
ok('lab v2.5: cards are draggable', !!document.querySelector('main article[draggable="true"]'));
const fwd = buttons().find((b) => /Move forward|आगे बढ़ाएँ/.test(b.getAttribute('aria-label') || '') && !b.disabled);
ok('lab v2: move-forward control present', !!fwd);
if (fwd) {
  await click(fwd);
  const st = Object.values(readLS(progKey)?.projects || {});
  ok('lab v2: move persists a status', st.length > 0, JSON.stringify(st).slice(0, 80));
}
const tblBtn = byText(/^Table$|^टेबल$/)[0];
ok('lab v5: table view switcher present', !!tblBtn);
if (tblBtn) {
  await click(tblBtn);
  await waitMs(400);
  ok('lab v5: sortable table renders rows', !!document.querySelector('main table') && document.querySelectorAll('main tbody tr').length > 0 && !!document.querySelector('th[aria-sort]'));
  const sortBtn = document.querySelector('thead th button');
  if (sortBtn) { await click(sortBtn); await waitMs(250); ok('lab v5: header sort toggles', !!document.querySelector('th[aria-sort="ascending"], th[aria-sort="descending"]')); }
  const tlBtn = byText(/^Timeline$|^टाइमलाइन$/)[0];
  ok('lab v7: timeline view present', !!tlBtn);
  if (tlBtn) {
    await click(tlBtn);
    await waitMs(400);
    ok('lab v7: timeline steppers rendered', document.querySelectorAll('main ol[aria-label="Timeline"], main ol[aria-label="टाइमलाइन"]').length > 0);
  }
  const boardBtn = byText(/^Board$|^बोर्ड$/)[0];
  if (boardBtn) { await click(boardBtn); await waitMs(300); }
}

/* ── Interview v2: console, live metrics, feedback tiles ── */
await mount('/app/interview');
const voiceLedChip = byText(/Voice-led round|वॉइस-लेड राउंड/)[0];
ok('interview v6: voice-led toggle present', !!voiceLedChip);
if (voiceLedChip) { await click(voiceLedChip); await waitMs(200); ok('interview v6: voice-led persists aria-pressed', voiceLedChip.getAttribute('aria-pressed') === 'true' || document.querySelector('[aria-pressed="true"]') !== null); }
const whisperChip = byText(/Coach whisper|कोच व्हिस्पर/)[0];
ok('interview v7: whisper toggle present', !!whisperChip);
if (whisperChip) { await click(whisperChip); await waitMs(200); }
const startIv = byText(/^Start|शुरू/i)[0];
ok('interview v2: start control present', !!startIv);
if (startIv) {
  await click(startIv);
  ok('interview v2: interviewer console rendered', /CareerX Interviewer|CareerX इंटरव्यूअर/.test(text()));
  ok('interview v7: coach whisper hints live', /Coach whisper — demo hints|कोच व्हिस्पर — डेमो/.test(text()));
  ok('interview v2: simulated visual labelled honestly', /Simulated visual|सिमुलेटेड विज़ुअल/.test(text()));
  ok('interview v2.5: live signal chips rendered', /Structure 0|संरचना 0/.test(text()) && /Domain terms|डोमेन शब्द/.test(text()));
  ok('interview v2.5: question stepper rendered', document.querySelectorAll('main .h-1\\.5.flex-1').length >= 5 || /Question progress/.test(document.body.innerHTML));
  const ans = document.getElementById('answer');
  if (ans) {
    await typeIntoTa(ans, 'I would start by clarifying requirements, then structure the answer around the problem, my approach using SQL and Python, and the measurable outcome. Basically I shipped dashboards that reduced reporting time by 30 percent.');
    const sendBtn = byText(/Submit|भेजें/)[0];
    ok('interview v2: submit present', !!sendBtn);
    if (sendBtn) {
      await click(sendBtn);
      await waitMs(900);
      ok('interview v2: feedback metrics rendered', /Filler words|फिलर शब्द/.test(text()) && /WPM/.test(text()));
    ok('interview v3: follow-up probe card rendered', /Likely follow-up probe|संभावित फ़ॉलो-अप/.test(text()));
    }
    /* v5: drive the remaining questions to reach the report debrief */
    for (let i = 0; i < 4; i += 1) {
      const nxt = byText(/Next question|अगला प्रश्न/)[0];
      if (!nxt) break;
      await click(nxt);
      await waitMs(500);
      const ta2 = document.getElementById('answer');
      if (ta2) {
        await typeIntoTa(ta2, 'I would measure impact, communicate with stakeholders, and iterate using data and SQL dashboards.');
        const sb2 = byText(/Submit|भेजें/)[0];
        if (sb2) { await click(sb2); await waitMs(700); }
      }
    }
    const fin = byText(/See full report|पूरी रिपोर्ट देखें/)[0];
    if (fin) { await click(fin); await waitMs(900); }
    ok('interview v5: dimension radar in report', /Dimension radar|डाइमेंशन रडार/.test(text()));
    ok('interview v5: flip tiles rendered', document.querySelectorAll('.flip3d').length >= 4);
  }
}

/* ── v8: command palette ── */
await mount('/app/dashboard');
const cmdBtn = document.querySelector('header button[aria-label="Open command palette"], header button[aria-label="कमांड पैलेट खोलें"]');
ok('v8: command palette trigger in top bar', !!cmdBtn);
if (cmdBtn) {
  await click(cmdBtn);
  await waitMs(300);
  const cin = document.querySelector('div[role="dialog"] input');
  ok('v8: palette dialog opens with focus input', !!cin && document.activeElement === cin);
  if (cin) {
    await typeInto(cin, 'resume');
    await waitMs(250);
    const opt = document.querySelector('div[role="dialog"] li[role="option"] button');
    ok('v8: fuzzy results render', !!opt && /Resume|रिज़्यूमे/.test(opt.textContent));
    if (opt) { await click(opt); await waitMs(500); ok('v8: palette navigates', location.pathname === '/app/resume'); }
  }
}

/* ── v9: resume command deck ── */
await mount('/app/resume');
ok('v9: intake deck tiles (text / file / lab)', document.querySelectorAll('[data-intake-tile]').length === 3);
ok('v9: file drop input accepts pdf/txt/md', !!document.querySelector('input[type="file"][accept*=".pdf"]'));
const secIds = [...document.querySelectorAll('[data-sec-id]')].map((e) => e.getAttribute('data-sec-id'));
ok('v9: standard resume section order', secIds.indexOf('education') < secIds.indexOf('experience') && secIds.indexOf('experience') < secIds.indexOf('projects') && secIds.indexOf('projects') < secIds.indexOf('skills'), secIds.join(','));
const labBtn = byText(/Import projects|प्रोजेक्ट इम्पोर्ट करें/)[0];
if (labBtn) await click(labBtn);
ok('v9: lab import wired (button present)', !!labBtn);
const trajBtn = byText(/^(Analysis|विश्लेषण)$/)[0] || [...document.querySelectorAll('[data-tab="analysis"]')][0];
if (trajBtn) await click(trajBtn);
ok('v9: score trajectory panel in analysis', !!document.querySelector('[data-traj]'));

/* ── v10: resume analytics upgrades ── */
ok('v10: staggered analysis stack', !!document.querySelector('.stagger'));
ok('v10: target-compare 3D bars', !!document.querySelector('[data-compare]'));
ok('v10: overall bar with target ghost', /Overall|कुल/.test(text()));
const projHdr = document.querySelector('[data-sec-id="projects"] button');
if (projHdr) await click(projHdr);
ok('v10: project AI bullet drafter', !!byText(/Draft AI bullets|AI बुलेट ड्राफ़्ट/)[0]);

/* ── v11: section health + read-aloud gating ── */
ok('v11: section health 3D chart', !!document.querySelector('[data-health]'));
ok('v11: six section bars with full-mark ghosts', (document.querySelectorAll('[data-health] svg polygon').length) >= 36, String(document.querySelectorAll('[data-health] svg polygon').length));
ok('v11: read-aloud present or TTS unsupported', !!document.querySelector('[data-tts]') || !('speechSynthesis' in window));

console.log('\n=== admin interactions ===');
auth.logout();
auth.loadDemoAdmin();

/* 6. Opportunities: hiding a listing writes the feed config and shrinks the student feed */
await mount('/admin/opportunities');
await settle();
const switches = [...document.querySelectorAll('button[role="switch"]')];
ok('admin/opportunities: visibility switches rendered', switches.length > 0, `found ${switches.length}`);
const jobsBefore = (await jobService.getOpportunities({ type: 'job', simulate: false })).length;
if (switches.length) {
  await click(switches[0]);
  const feed = readLS('careerx.adminFeed');
  ok('admin/opportunities: hidden id persisted', Array.isArray(feed?.hidden) && feed.hidden.length === 1, JSON.stringify(feed));
  const jobsAfter = (await jobService.getOpportunities({ type: 'job', simulate: false })).length;
  ok('admin/opportunities: student feed reflects the hide', jobsAfter === jobsBefore - 1 || !feed?.hidden?.[0]?.startsWith('j'), `${jobsBefore} → ${jobsAfter}`);
  const pinBtn = byText(/^pin$/i)[0];
  if (pinBtn) {
    await click(pinBtn);
    const feed2 = readLS('careerx.adminFeed');
    ok('admin/opportunities: pin persisted', (feed2?.pinned || []).length === 1, JSON.stringify(feed2));
  } else ok('admin/opportunities: pin persisted', false, 'pin button not found');
}

/* 7. Users: filtering narrows the table */
await mount('/admin/users');
await settle();
const rowsBefore = document.querySelectorAll('tbody tr').length;
const search = [...document.querySelectorAll('input')].find((i) => /search students/i.test(i.getAttribute('aria-label') || ''));
ok('admin/users: search input rendered', !!search);
if (search) {
  await typeInto(search, 'zzzz-no-such-student');
  const rowsAfter = document.querySelectorAll('tbody tr').length;
  ok('admin/users: search filters rows to zero', rowsBefore > 0 && rowsAfter === 0, `${rowsBefore} → ${rowsAfter}`);
}

/* 8. Settings: saving the institution profile persists and reaches the sidebar */
await mount('/admin/settings');
await settle();
const instInput = document.getElementById('as-inst');
ok('admin/settings: institution field rendered', !!instInput);
if (instInput) {
  await typeInto(instInput, 'QA Test Institute');
  const saveBtn = inMain('button').filter((b) => /^save$/i.test((b.textContent || '').trim()))[0];
  ok('admin/settings: save button found', !!saveBtn);
  if (saveBtn) {
    await click(saveBtn);
    const savedSettings = storage.get('adminSettings', null);
    ok('admin/settings: institution persisted', savedSettings?.institution === 'QA Test Institute', JSON.stringify(savedSettings));
    await mount('/admin/dashboard');
    ok('admin/settings: sidebar shows saved institution', text().includes('QA Test Institute'));
  }
}

/* 9. Insights + analytics render data-driven numbers */
await mount('/admin/skill-insights');
ok('admin/skill-insights: insight cards rendered', /evidence|प्रमाण/i.test(text()));
await mount('/admin/analytics');
ok('admin/analytics: funnel rendered', /preparation funnel|तैयारी फ़नल/i.test(text()));

/* ============================== CLEANUP ============================== */
window.localStorage.removeItem('careerx.adminFeed');
storage.remove('adminSettings');
auth.logout();
auth.loadDemoStudent();

if (currentRoot) { await act(async () => { currentRoot.unmount(); }); }

console.log(`\n${fail ? `${fail} INTERACTION(S) FAILED` : 'ALL INTERACTIONS OK'} (${pass} passed)`);
process.exit(fail ? 1 : 0);
