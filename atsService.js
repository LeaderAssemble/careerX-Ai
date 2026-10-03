import { SKILL_BY_ID } from '../data/catalog';
import { analyzeResume, generateSummary, improveBullets } from './resumeService';
import { clamp, uid } from '../lib/utils';

/**
 * atsService — import + ATS coaching engine for the Resume Builder v2.
 *
 * Everything here runs LOCALLY and deterministically (transparent rules, no LLM, no
 * network). Parsing is best-effort heuristics and the UI always shows the user exactly
 * what was detected so they can correct it before merging.
 *
 * INTEGRATION POINT: to use a real model later, keep these signatures and call your
 * backend (POST /api/ai/ats/parse, /api/ai/ats/coach). Never ship provider keys to the
 * browser; label model output as AI-generated in the UI.
 */

/* A realistic sample the import modal can load so the parser is testable in one click. */
export const SAMPLE_RESUME = [
  'ANANYA SHARMA',
  'ananya.sharma@example.com | +91 98765 43210 | Bhopal, MP',
  'linkedin.com/in/ananyasharma · github.com/ananyasharma',
  '',
  'SUMMARY',
  'Final-year B.Tech student focused on data analysis with hands-on dashboard projects and SQL pipelines.',
  '',
  'SKILLS',
  'Python, SQL, Power BI, Excel, Statistics, Pandas, Data Visualization, Communication',
  '',
  'EXPERIENCE',
  'Data Analyst Intern | TechCorp (Jun 2025 - Aug 2025)',
  '• Built 5 Power BI dashboards used by 40+ stakeholders weekly',
  '• Reduced report preparation time by 30% with automated SQL pipelines',
  '',
  'PROJECTS',
  'Sales Insight Dashboard | Power BI, SQL',
  '• Designed interactive dashboard; improved decision speed for 3 teams',
  '',
  'EDUCATION',
  'B.Tech, Computer Science | Sagar Institute (2022 - 2026) CGPA: 8.6/10',
  '',
  'ACHIEVEMENTS',
  '• Winner, State Data Hackathon 2025',
].join('\n');

/* ------------------------------------------------------------------ parsing */

const SECTION_RE = [
  { id: 'summary', re: /^(summary|objective|profile|about me|career objective|सारांश|उद्देश्य)\b/i },
  { id: 'skills', re: /^(technical skills|skills|tech stack|technologies|core competencies|कौशल)\b/i },
  { id: 'experience', re: /^(experience|work experience|employment|internships?|professional experience|अनुभव)\b/i },
  { id: 'projects', re: /^(projects?|personal projects|academic projects|प्रोजेक्ट)\b/i },
  { id: 'education', re: /^(education|academics?|academic background|शिक्षा)\b/i },
  { id: 'certifications', re: /^(certifications?|certificates|licenses|courses|प्रमाणपत्र)\b/i },
  { id: 'achievements', re: /^(achievements?|awards|honors?|honours|activities|उपलब्धियाँ)\b/i },
];

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
const PHONE_RE = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|\+?\d[\d\s-]{8,13}\d/;
const URL_RE = /(?:https?:\/\/)?(?:www\.)?((?:github|linkedin|gitlab)\.com|[\w-]+\.(?:dev|io|me|in|com))(\/[\w./-]*)?/i;
const DEGREE_RE = /\b(B\.?\s?Tech|B\.?\s?E\.?|B\.?\s?Sc|B\.?\s?A\b|BCA|BBA|M\.?\s?Tech|M\.?\s?E\.?|M\.?\s?Sc|MBA|MCA|Diploma|Class 12|12th|XII)\b/i;
const DATE_RE = /\b(19|20)\d{2}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(19|20)?\d{0,4}\b/i;
const BULLET_RE = /^\s*(?:[•·▪◦‣*+-]|\d+[.)])\s*/;

/** Parse a raw resume text blob into draft-shaped data + a detection report. */
export function parseResumeText(raw = '') {
  const text = String(raw).replace(/\r/g, '').replace(/\t/g, '  ');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const report = { found: [], missed: [], lines: lines.length, words: text.split(/\s+/).filter(Boolean).length };

  const out = {
    personal: { name: '', headline: '', email: '', phone: '', city: '', github: '', linkedin: '' },
    summary: '', education: [], skills: [], projects: [], experience: [], achievements: [], certifications: [],
  };

  // contact facts can appear anywhere
  const joined = lines.join(' | ');
  out.personal.email = (joined.match(EMAIL_RE) || [''])[0];
  out.personal.phone = (joined.match(PHONE_RE) || [''])[0].trim();
  const urls = joined.match(new RegExp(URL_RE.source, 'gi')) || [];
  urls.forEach((u) => {
    const clean = u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\s+$/, '');
    if (/linkedin/i.test(clean) && !out.personal.linkedin) out.personal.linkedin = `https://${clean}`;
    else if (/github|gitlab/i.test(clean) && !out.personal.github) out.personal.github = `https://${clean}`;
  });
  if (out.personal.email) report.found.push('email');
  if (out.personal.phone) report.found.push('phone');
  if (out.personal.linkedin) report.found.push('linkedin');
  if (out.personal.github) report.found.push('github');

  // bucket lines by detected section headings
  const buckets = { head: [] };
  SECTION_RE.forEach((s) => { buckets[s.id] = null; });
  let current = 'head';
  lines.forEach((line) => {
    const hit = SECTION_RE.find((s) => s.re.test(line.replace(/[:–—-]+$/, '').trim()));
    if (hit && line.length < 60) { current = hit.id; buckets[current] = buckets[current] || []; return; }
    if (!buckets[current]) buckets[current] = [];
    buckets[current].push(line);
  });

  // name = first head line that looks like a person (letters/spaces, no @ or long digits)
  const headClean = (buckets.head || []).filter((l) => !EMAIL_RE.test(l) && !PHONE_RE.test(l) && !URL_RE.test(l));
  const nameLine = headClean.find((l) => /^[A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F .']{2,40}$/.test(l) && l.split(/\s+/).length >= 2 && l.split(/\s+/).length <= 5);
  out.personal.name = (nameLine || '').trim();
  if (out.personal.name) report.found.push('name'); else report.missed.push('name');
  const afterName = headClean.filter((l) => l !== nameLine);
  out.personal.headline = (afterName.find((l) => l.length < 80 && !DATE_RE.test(l)) || '').replace(/[:,]$/, '');

  // summary
  const sumLines = buckets.summary || [];
  if (sumLines.length) { out.summary = sumLines.join(' ').slice(0, 600); report.found.push('summary'); }
  else { report.missed.push('summary'); }

  // skills: split on separators, keep sane tokens
  const skillTokens = (buckets.skills || []).join(', ')
    .split(/[,;•|/\n]/)
    .map((s) => s.replace(BULLET_RE, '').replace(/^(skills?|technologies)\s*[:–-]?\s*/i, '').trim())
    .filter((s) => s && s.length <= 40 && !DATE_RE.test(s) && !/\s{3,}/.test(s));
  out.skills = [...new Set(skillTokens)].slice(0, 20);
  if (out.skills.length) report.found.push(`skills×${out.skills.length}`); else report.missed.push('skills');

  // experience & projects: heading line = entry, bullet/indented lines = detail
  const readEntries = (arr, kind) => {
    const entries = [];
    let cur = null;
    (arr || []).forEach((line) => {
      const isBullet = BULLET_RE.test(line);
      const cleanLine = line.replace(BULLET_RE, '');
      if (!isBullet && cleanLine.length < 90 && (entries.length === 0 || DATE_RE.test(cleanLine) || cur?.bullets?.length >= 1)) {
        // start a new entry on a short non-bullet line
        cur = { id: uid(), bullets: '', _head: cleanLine };
        entries.push(cur);
        // try "Role — Company (dates)" or "Title | Tech"
        const parts = cleanLine.split(/\s*[|–—]\s*|\s+at\s+/i);
        const dates = (cleanLine.match(DATE_RE) || [''])[0];
        if (kind === 'experience') {
          cur.role = (parts[0] || '').replace(DATE_RE, '').replace(/\(\s*\)/, '').trim();
          cur.company = (parts[1] || '').replace(DATE_RE, '').replace(/\(\s*\)/, '').trim();
          cur.period = dates || (parts[2] || '').trim();
        } else {
          cur.title = (parts[0] || '').replace(DATE_RE, '').replace(/\(\s*\)/, '').trim();
          cur.tech = (parts[1] || '').trim();
          cur.period = dates;
        }
      } else if (cur) {
        cur.bullets = cur.bullets ? `${cur.bullets}\n${cleanLine}` : cleanLine;
      }
    });
    return entries.map(({ _head, ...e }) => e);
  };
  out.experience = readEntries(buckets.experience, 'experience');
  out.projects = readEntries(buckets.projects, 'projects');
  if (out.experience.length) report.found.push(`experience×${out.experience.length}`);
  if (out.projects.length) report.found.push(`projects×${out.projects.length}`);
  if (!out.projects.length) report.missed.push('projects');

  // education
  (buckets.education || []).forEach((line) => {
    const cleanLine = line.replace(BULLET_RE, '');
    const deg = cleanLine.match(DEGREE_RE);
    const dates = cleanLine.match(/\b((?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:19|20)\d{2})\b/i);
    const score = cleanLine.match(/(?:cgpa|gpa|percentage)?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*10|%|percent)/i);
    out.education.push({
      id: uid(),
      degree: deg ? deg[0] : cleanLine.split(/[,|]/)[0].slice(0, 60),
      institute: cleanLine.replace(DEGREE_RE, '').replace(/^[\s,|:-]+/, '').split(/[,|]/)[0].trim().slice(0, 70),
      period: dates ? `${dates[1]} – ${dates[2]}` : '',
      score: score ? score[0].trim() : '',
    });
  });
  if (out.education.length) report.found.push(`education×${out.education.length}`); else report.missed.push('education');

  // achievements + certifications
  out.achievements = (buckets.achievements || []).map((l) => ({ id: uid(), text: l.replace(BULLET_RE, '') })).filter((a) => a.text.length > 3).slice(0, 8);
  out.certifications = (buckets.certifications || []).map((l) => ({ id: uid(), text: l.replace(BULLET_RE, '') })).filter((a) => a.text.length > 3).slice(0, 8);
  if (out.achievements.length) report.found.push(`achievements×${out.achievements.length}`);

  return { parsed: out, report };
}

/** Merge parsed data into an existing draft: parsed values win only where draft is empty. */
export function mergeParsed(draft = {}, parsed = {}) {
  const d = { ...draft };
  const dp = d.personal || {};
  const pp = parsed.personal || {};
  d.personal = {
    ...dp,
    name: dp.name || pp.name || '', headline: dp.headline || pp.headline || '',
    email: dp.email || pp.email || '', phone: dp.phone || pp.phone || '', city: dp.city || pp.city || '',
    github: dp.github || pp.github || '', linkedin: dp.linkedin || pp.linkedin || '',
  };
  if (!d.summary && parsed.summary) d.summary = parsed.summary;
  const mergeList = (key, hasText) => {
    const existing = (d[key] || []).filter((x) => hasText(x));
    const incoming = (parsed[key] || []).filter((x) => hasText(x) && !existing.some((e) => JSON.stringify(e).toLowerCase().includes((x.title || x.degree || x.role || x.text || '').toLowerCase().slice(0, 24))));
    d[key] = [...existing, ...incoming];
  };
  mergeList('education', (x) => x.degree);
  mergeList('projects', (x) => x.title);
  mergeList('experience', (x) => x.role || x.company);
  mergeList('achievements', (x) => x.text);
  const skills = [...new Set([...(d.skills || []), ...(parsed.skills || [])])].slice(0, 16);
  d.skills = skills;
  d.updatedAt = new Date().toISOString();
  return d;
}

/* ------------------------------------------------------------------ coaching */

const T = (en, hi) => [en, hi];

/**
 * Build an ordered coaching plan from the current analysis.
 * Steps with auto:true can be applied by applyCoachStep() without user typing.
 */
export function atsCoachPlan(draft, analysis, ctx = {}) {
  const { profile = {}, derived = {}, career = null, lang = 'en' } = ctx;
  if (!analysis) return [];
  const i = lang === 'hi' ? 1 : 0;
  const steps = [];
  const failed = analysis.failed || [];
  const byId = (id) => failed.find((c) => c.id === id);

  const p = profile.personal || {};
  const e = profile.education || {};

  if (byId('contact')) steps.push({
    id: 'contact', impact: byId('contact').weight, auto: !!(p.name && p.email),
    title: T('Complete contact block', 'संपर्क ब्लॉक पूरा करें'),
    detail: T(`Fill name/email/phone from your profile (${p.email || 'no profile email yet'}).`, 'अपनी प्रोफ़ाइल से नाम/ईमेल/फ़ोन भरें।'),
  });
  if (byId('links')) steps.push({
    id: 'links', impact: byId('links').weight, auto: false,
    title: T('Add GitHub / LinkedIn', 'गिटहब / लिंक्डइन जोड़ें'),
    detail: T('Paste your profile URLs — recruiters verify real work. (Manual: only you know your links.)', 'अपने प्रोफ़ाइल URL पेस्ट करें। (मैन्युअल: लिंक केवल आपको पता हैं।)'),
  });
  if (byId('summary')) steps.push({
    id: 'summary', impact: byId('summary').weight, auto: true,
    title: T('Rebuild a 60–300 char summary', '60–300 अक्षर का सारांश बनाएँ'),
    detail: T('Generate a summary from your profile data, then edit it in your own voice.', 'प्रोफ़ाइल डेटा से सारांश बनाएँ, फिर अपनी शैली में संपादित करें।'),
  });
  if (byId('education') && (e.degree || e.branch)) steps.push({
    id: 'education', impact: byId('education').weight, auto: true,
    title: T('Add education from profile', 'प्रोफ़ाइल से शिक्षा जोड़ें'),
    detail: T(`${e.degree || ''} ${e.branch || ''}${e.cgpa ? ` · CGPA ${e.cgpa}` : ''} → Education section.`, 'डिग्री/ब्रांच/CGPA → शिक्षा अनुभाग।'),
  });
  if (byId('skills')) steps.push({
    id: 'skills', impact: byId('skills').weight, auto: true,
    title: T('Right-size the skills list (6–14)', 'कौशल सूची 6–14 करें'),
    detail: T('Pull your strongest profile skills; trims filler beyond 14.', 'आपके मज़बूततम प्रोफ़ाइल कौशल जोड़ें; 14 से अधिक हटाएँ।'),
  });
  if (byId('projects')) steps.push({
    id: 'projects', impact: byId('projects').weight, auto: (profile.projects || []).length >= 2,
    title: T('Add detailed projects', 'विस्तृत प्रोजेक्ट जोड़ें'),
    detail: (profile.projects || []).length
      ? T(`Import ${profile.projects.length} project(s) from your profile.`, `प्रोफ़ाइल से ${profile.projects.length} प्रोजेक्ट आयात करें।`)
      : T('Add two projects with problem → approach → outcome. Start from Project Lab.', 'दो प्रोजेक्ट जोड़ें: समस्या → तरीका → परिणाम।'),
  });
  if (byId('bullets')) steps.push({
    id: 'bullets', impact: byId('bullets').weight, auto: true,
    title: T('Rewrite bullets with strong verbs', 'बुलेट को मज़बूत क्रियाओं से लिखें'),
    detail: T('Applies the bullet improver to your first project/experience entry.', 'पहले प्रोजेक्ट/अनुभव पर बुलेट सुधारक लागू करें।'),
  });
  if (byId('quantified')) steps.push({
    id: 'quantified', impact: byId('quantified').weight, auto: false,
    title: T('Add numbers to bullets', 'बुलेट में संख्याएँ जोड़ें'),
    detail: T('Only you know the real metrics — add %, users, time saved to 2+ bullets. (Manual)', 'असली मेट्रिक केवल आपको पता हैं — 2+ बुलेट में %, उपयोगकर्ता, बचा समय जोड़ें। (मैन्युअल)'),
  });
  if (byId('keywords')) {
    const missing = (analysis.keywords?.missing || []).map((k) => SKILL_BY_ID[k]?.n?.[0] || k).slice(0, 6);
    const owned = missing.filter((m) => [...(profile.techSkills || []), ...(profile.toolSkills || []), ...(profile.industrySkills || [])].some((s) => (SKILL_BY_ID[s.id]?.n?.[0] || '') === m));
    steps.push({
      id: 'keywords', impact: byId('keywords').weight, auto: owned.length > 0,
      title: T('Close the keyword gap', 'कीवर्ड गैप भरें'),
      detail: owned.length
        ? T(`Add skills you already own that the target role wants: ${owned.join(', ')}.`, `आपके पास मौजूद कौशल जोड़ें: ${owned.join(', ')}।`)
        : T(`Target role wants: ${missing.join(', ') || 'more role keywords'} — add only what you can defend in an interview. (Manual)`, `लक्षित रोल चाहता है: ${missing.join(', ')} — केवल वही जोड़ें जो इंटरव्यू में बचा सकें। (मैन्युअल)`),
    });
  }
  if (byId('achievements')) steps.push({
    id: 'achievements', impact: byId('achievements').weight, auto: (profile.achievements || []).length > 0,
    title: T('Add achievements section', 'उपलब्धियाँ अनुभाग जोड़ें'),
    detail: T('Hackathons, certifications, leadership — imported from profile if present.', 'हैकाथॉन, प्रमाणपत्र, नेतृत्व — प्रोफ़ाइल से आयात।'),
  });
  if (byId('pronouns')) steps.push({
    id: 'pronouns', impact: byId('pronouns').weight, auto: true,
    title: T('Strip first-person pronouns', 'पहला पुरुष सर्वनाम हटाएँ'),
    detail: T('Removes I/we/my from bullet starts.', 'बुलेट से मैं/हम हटाएँ।'),
  });
  if (byId('length')) steps.push({
    id: 'length', impact: byId('length').weight, auto: false,
    title: T('Split over-long bullets', 'लंबे बुलेट बाँटें'),
    detail: T('Keep each bullet under 26 words. (Manual edit)', 'प्रति बुलेट 26 शब्द से कम। (मैन्युअल)'),
  });

  return steps.sort((a, b) => b.impact - a.impact).map((s) => ({ ...s, titleText: s.title[i], detailText: s.detail[i] }));
}

/** Apply one auto-fixable coaching step; returns a NEW draft (never mutates). */
export function applyCoachStep(step, draft, ctx = {}) {
  const { profile = {}, derived = {}, career = null, lang = 'en' } = ctx;
  const d = JSON.parse(JSON.stringify(draft || {}));
  const p = profile.personal || {};
  const e = profile.education || {};
  let note = '';

  switch (step.id) {
    case 'contact':
      d.personal = {
        ...d.personal,
        name: d.personal?.name || p.name || '', email: d.personal?.email || p.email || '',
        phone: d.personal?.phone || p.phone || '', city: d.personal?.city || p.city || '',
      };
      note = T('Contact details copied from your profile.', 'प्रोफ़ाइल से संपर्क विवरण कॉपी किए।')[lang === 'hi' ? 1 : 0];
      break;
    case 'summary':
      d.summary = generateSummary({ profile, derived, career }).en;
      note = T('Summary regenerated from your profile — review the wording.', 'सारांश प्रोफ़ाइल से बनाया गया — शब्दों की समीक्षा करें।')[lang === 'hi' ? 1 : 0];
      break;
    case 'education':
      if (!(d.education || []).length && (e.degree || e.branch)) {
        d.education = [{
          id: uid(), degree: [e.degree, e.branch].filter(Boolean).join(', '),
          institute: p.college || '', period: e.gradYear ? `${Number(e.gradYear) - 4} – ${e.gradYear}` : '',
          score: e.cgpa ? `CGPA ${e.cgpa}` : '',
        }];
        note = T('Education added from profile.', 'प्रोफ़ाइल से शिक्षा जोड़ी।')[lang === 'hi' ? 1 : 0];
      }
      break;
    case 'skills': {
      const owned = [...(profile.techSkills || []), ...(profile.toolSkills || []), ...(profile.industrySkills || [])]
        .sort((a, b) => (b.level || 0) - (a.level || 0))
        .map((s) => SKILL_BY_ID[s.id]?.n?.[0] || s.id);
      d.skills = [...new Set([...(d.skills || []), ...owned])].slice(0, 14);
      note = T(`Skills list now ${d.skills.length} entries (target 6–14).`, `कौशल सूची अब ${d.skills.length} (लक्ष्य 6–14).`)[lang === 'hi' ? 1 : 0];
      break;
    }
    case 'projects': {
      const have = (d.projects || []).length;
      const incoming = (profile.projects || []).slice(0, Math.max(0, 2 - have)).map((pr) => ({
        id: uid(), title: typeof pr.title === 'string' ? pr.title : pr.title?.[0] || 'Project',
        tech: pr.tech || '', link: pr.link || '',
        bullets: typeof pr.desc === 'string' ? pr.desc : pr.desc?.[0] || '',
      }));
      d.projects = [...(d.projects || []), ...incoming];
      note = incoming.length
        ? T(`Imported ${incoming.length} project(s) from your profile.`, `प्रोफ़ाइल से ${incoming.length} प्रोजेक्ट आयात किए।`)[lang === 'hi' ? 1 : 0]
        : T('Add projects manually — profile has none yet.', 'प्रोजेक्ट मैन्युअल जोड़ें — प्रोफ़ाइल में अभी नहीं हैं।')[lang === 'hi' ? 1 : 0];
      break;
    }
    case 'bullets': {
      const target = (d.projects || [])[0] || (d.experience || [])[0];
      if (target?.bullets) {
        const res = improveBullets(target.bullets, { career });
        target.bullets = res.text;
        note = T('Strong verbs applied to your first entry — review each bullet.', 'पहली एंट्री पर मज़बूत क्रियाएँ लागू — हर बुलेट देखें।')[lang === 'hi' ? 1 : 0];
      }
      break;
    }
    case 'keywords': {
      const ownedNames = [...(profile.techSkills || []), ...(profile.toolSkills || []), ...(profile.industrySkills || [])]
        .map((s) => SKILL_BY_ID[s.id]?.n?.[0] || s.id);
      const add = ownedNames.filter((n) => !(d.skills || []).includes(n)).slice(0, 4);
      d.skills = [...(d.skills || []), ...add].slice(0, 14);
      note = add.length
        ? T(`Added role keywords you own: ${add.join(', ')}.`, `आपके कौशल-कीवर्ड जोड़े: ${add.join(', ')}।`)[lang === 'hi' ? 1 : 0]
        : T('No new owned keywords to add — learn the missing ones first.', 'जोड़ने के लिए नए कौशल नहीं — पहले गैप सीखें।')[lang === 'hi' ? 1 : 0];
      break;
    }
    case 'achievements': {
      const incoming = (profile.achievements || []).slice(0, 3).map((a) => ({ id: uid(), text: a.text || String(a) }))
        .filter((a) => !(d.achievements || []).some((x) => x.text === a.text));
      d.achievements = [...(d.achievements || []), ...incoming];
      note = incoming.length
        ? T(`Added ${incoming.length} achievement(s).`, `${incoming.length} उपलब्धियाँ जोड़ीं।`)[lang === 'hi' ? 1 : 0]
        : T('No profile achievements found yet.', 'प्रोफ़ाइल में उपलब्धियाँ नहीं मिलीं।')[lang === 'hi' ? 1 : 0];
      break;
    }
    case 'pronouns': {
      let n = 0;
      ['projects', 'experience'].forEach((key) => (d[key] || []).forEach((item) => {
        const fixed = String(item.bullets || '').split('\n').map((b) => {
          const nb = b.replace(/^\s*(?:I|We|My|Our)\s+(?:also\s+|then\s+)?/i, (m) => { n += 1; return m.replace(/^\s*/i, '').replace(/^(I|We|My|Our)\s+/i, (x) => x.trim() === 'My' ? 'My '.replace('My ', '') : ''); }).replace(/^\s*(am|have|had|was|were)\s+/i, '');
          return nb || b;
        }).join('\n');
        item.bullets = fixed;
      }));
      note = n
        ? T(`Removed ${n} first-person bullet opening(s).`, `${n} सर्वनाम-शुरुआत हटाईं।`)[lang === 'hi' ? 1 : 0]
        : T('No pronoun openings found.', 'सर्वनाम-शुरुआत नहीं मिली।')[lang === 'hi' ? 1 : 0];
      break;
    }
    default:
      note = T('This step needs a manual edit — open the Editor tab.', 'इस चरण में मैन्युअल संपादन चाहिए — एडिटर टैब खोलें।')[lang === 'hi' ? 1 : 0];
  }
  d.updatedAt = new Date().toISOString();
  return { draft: d, note };
}

/**
 * trainResume — the "AI improves toward a better ATS score" loop.
 * Applies auto-fixable coach steps one pass at a time, re-scoring after each, and
 * returns the full score trajectory so the UI can chart the climb (demo engine,
 * deterministic, every change reported).
 */
export function trainResume(draft, ctx = {}, { target = 90, maxPasses = 6 } = {}) {
  const { derived = {}, lang = 'en' } = ctx;
  let current = JSON.parse(JSON.stringify(draft || {}));
  const passes = [];
  const start = analyzeResume(current, derived.skillMap, derived.targetCareerId, lang);
  passes.push({ n: 0, label: lang === 'hi' ? 'शुरुआत' : 'Start', score: start.score, applied: [] });

  for (let pass = 1; pass <= maxPasses; pass++) {
    if (passes[passes.length - 1].score >= target) break;
    const analysis = analyzeResume(current, derived.skillMap, derived.targetCareerId, lang);
    const plan = atsCoachPlan(current, analysis, { ...ctx, lang });
    const done = new Set(passes.flatMap((x) => x.applied.map((a) => a.id)));
    const next = plan.filter((s) => s.auto && !done.has(s.id)).sort((a, b) => b.impact - a.impact);
    if (!next.length) break;
    const batch = next.slice(0, 2);
    const applied = [];
    batch.forEach((step) => {
      const res = applyCoachStep(step, current, { ...ctx, lang });
      current = res.draft;
      applied.push({ id: step.id, title: step.titleText, note: res.note });
    });
    const after = analyzeResume(current, derived.skillMap, derived.targetCareerId, lang);
    passes.push({ n: pass, label: `${lang === 'hi' ? 'पास' : 'Pass'} ${pass}`, score: after.score, applied });
    if (after.score === passes[passes.length - 2].score && pass >= 2) break; // plateau guard
  }

  const finalScore = passes[passes.length - 1].score;
  return {
    draft: current,
    passes,
    gained: clamp(finalScore - start.score, 0, 100),
    reachedTarget: finalScore >= target,
    remainingManual: atsCoachPlan(current, analyzeResume(current, derived.skillMap, derived.targetCareerId, lang), { ...ctx, lang }).filter((s) => !s.auto).map((s) => s.titleText),
  };
}

export default { parseResumeText, mergeParsed, atsCoachPlan, applyCoachStep, trainResume };
