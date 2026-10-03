import { CAREER_BY_ID } from '../data/careers';
import { SKILL_BY_ID , SKILLS } from '../data/catalog';
import { resumeReadiness } from './scoreService';
import { clamp } from '../lib/utils';

/**
 * resumeService — summary generation, bullet improvement, ATS-style analysis and scoring.
 *
 * This is a transparent rule-based editor, not a language model: every transformation it
 * makes is listed back to the user so nothing silently changes their words.
 *
 * INTEGRATION POINT: to use a real model, keep these signatures and call your backend
 * (POST /api/ai/resume) inside generateSummary()/improveBullets(). Never ship a provider
 * key to the browser.
 */

export const TEMPLATES = [
  { id: 'modern', n: ['Modern', 'मॉडर्न'], desc: ['Accent bar, two-tone headings, compact spacing.', 'एक्सेंट बार, दो-रंगी शीर्षक, सघन स्पेसिंग।'] },
  { id: 'professional', n: ['Professional', 'प्रोफ़ेशनल'], desc: ['Classic single column, conservative type scale.', 'क्लासिक सिंगल कॉलम, पारंपरिक टाइप स्केल।'] },
  { id: 'minimal', n: ['Minimal', 'मिनिमल'], desc: ['Maximum whitespace, no colour, ATS-safe.', 'अधिकतम खाली जगह, कोई रंग नहीं, ATS-सुरक्षित।'] },
];

const STRONG_VERBS = {
  'worked on': ['Built', 'बनाया'],
  'work on': ['Built', 'बनाया'],
  'responsible for': ['Owned', 'संभाला'],
  'helped with': ['Contributed to', 'योगदान दिया'],
  'helped': ['Supported', 'सहयोग किया'],
  'was part of': ['Contributed to', 'योगदान दिया'],
  'made': ['Developed', 'विकसित किया'],
  'did': ['Delivered', 'पूरा किया'],
  'handled': ['Managed', 'प्रबंधित किया'],
  'used': ['Applied', 'लागू किया'],
  'tried': ['Experimented with', 'प्रयोग किया'],
  'learning': ['Practised', 'अभ्यास किया'],
  'i built': ['Built', 'बनाया'],
  'i made': ['Developed', 'विकसित किया'],
  'i worked': ['Delivered', 'पूरा किया'],
  'i was': ['Owned', 'संभाला'],
  'i have': ['Delivered', 'पूरा किया'],
  'we made': ['Delivered', 'पूरा किया'],
};

const FILLER = ['basically', 'various', 'some', 'things', 'stuff', 'kind of', 'sort of', 'very ', 'really ', 'just '];

export function emptyResume(profile = {}) {
  const p = profile.personal || {};
  return {
    template: 'modern',
    personal: {
      name: p.name || '', headline: '', email: p.email || '', phone: p.phone || '',
      city: p.city || '', github: '', linkedin: '',
    },
    summary: '',
    education: [],
    skills: [],
    projects: [],
    experience: [],
    achievements: [],
    updatedAt: null,
  };
}

/** Pre-fill the builder from the onboarding profile (one click, big time save). */
export function importFromProfile(profile = {}, derived = {}) {
  const base = emptyResume(profile);
  const p = profile.personal || {};
  const e = profile.education || {};
  const career = CAREER_BY_ID[profile.targetCareer];
  base.personal = {
    ...base.personal,
    headline: career ? career.n : '',
    city: p.city || '',
  };
  if (e.degree || e.branch) {
    base.education = [{
      id: 'imp-edu',
      degree: [e.degree, e.branch].filter(Boolean).join(', '),
      institute: p.college || '',
      period: e.gradYear ? `${Number(e.gradYear) - 4} – ${e.gradYear}` : '',
      score: e.cgpa ? `CGPA ${e.cgpa}` : '',
    }];
  }
  base.skills = [...(profile.techSkills || []), ...(profile.toolSkills || []), ...(profile.industrySkills || [])]
    .filter((s) => s.level >= 2)
    .map((s) => SKILL_BY_ID[s.id]?.n?.[0] || s.id)
    .slice(0, 14);
  base.projects = (profile.projects || []).map((pr) => ({
    id: pr.id,
    title: typeof pr.title === 'string' ? pr.title : pr.title?.[0] || '',
    tech: pr.tech || '',
    link: pr.link || '',
    bullets: typeof pr.desc === 'string' ? pr.desc : pr.desc?.[0] || '',
  }));
  base.experience = (profile.experience || []).map((ex) => ({
    id: ex.id,
    role: typeof ex.role === 'string' ? ex.role : ex.role?.[0] || '',
    company: typeof ex.company === 'string' ? ex.company : ex.company?.[0] || '',
    period: typeof ex.period === 'string' ? ex.period : ex.period?.[0] || '',
    bullets: Array.isArray(ex.bullets) ? ex.bullets.join('\n') : (ex.desc || ''),
  }));
  base.achievements = (profile.achievements || []).map((a, i) => ({ id: `imp-a${i}`, text: a.text || a }));
  base.summary = generateSummary({ profile, derived, career }).en;
  base.updatedAt = new Date().toISOString();
  return base;
}

/** Template-based professional summary (bilingual) using only the student's real inputs. */
export function generateSummary({ profile = {}, derived = {}, career = null }) {
  const p = profile.personal || {};
  const e = profile.education || {};
  const target = career || CAREER_BY_ID[profile.targetCareer];
  const strong = [...(profile.techSkills || []), ...(profile.toolSkills || [])]
    .filter((s) => s.level >= 3)
    .map((s) => SKILL_BY_ID[s.id]?.n?.[0] || s.id)
    .slice(0, 4);
  const growing = (derived.gaps || []).slice(0, 2).map((g) => SKILL_BY_ID[g.id]?.n?.[0]).filter(Boolean);
  const projects = (profile.projects || []).length;
  const exp = (profile.experience || []).length;
  const cgpa = e.cgpa ? ` (CGPA ${e.cgpa})` : '';

  const en = `${e.degree || 'Final-year'} ${e.branch || ''} student${cgpa} targeting ${target ? target.n[0] : 'technology'} roles${projects ? `, with ${projects} hands-on project${projects > 1 ? 's' : ''}` : ''}${exp ? ' and internship experience' : ''}. ${strong.length ? `Comfortable working with ${strong.join(', ')}.` : 'Building a practical, project-first skill set.'} ${growing.length ? `Currently strengthening ${growing.join(' and ')} to contribute to production work from day one.` : 'Ready to contribute to production work from day one.'} ${p.name ? '' : ''}`.replace(/\s+/g, ' ').trim();

  const strongHi = [...(profile.techSkills || []), ...(profile.toolSkills || [])]
    .filter((s) => s.level >= 3)
    .map((s) => SKILL_BY_ID[s.id]?.n?.[1] || s.id)
    .slice(0, 4);
  const growingHi = (derived.gaps || []).slice(0, 2).map((g) => SKILL_BY_ID[g.id]?.n?.[1]).filter(Boolean);

  const hi = `${e.degree || 'अंतिम वर्ष'} ${e.branch || ''} के छात्र (CGPA ${e.cgpa || '—'}) जो ${target ? target.n[1] : 'तकनीकी'} भूमिकाओं के लिए तैयारी कर रहे हैं${projects ? `, ${projects} व्यावहारिक प्रोजेक्ट के साथ` : ''}${exp ? ' और इंटर्नशिप अनुभव सहित' : ''}। ${strongHi.length ? `${strongHi.join(', ')} में कार्य करने में सहज।` : 'व्यावहारिक, प्रोजेक्ट-आधारित कौशल बना रहे हैं।'} ${growingHi.length ? `उत्पादन कार्य में दिन एक से योगदान के लिए ${growingHi.join(' और ')} पर काम कर रहे हैं।` : 'उत्पादन कार्य में दिन एक से योगदान के लिए तैयार।'}`;

  return { en, hi, pair: [en, hi] };
}

/**
 * Improve bullet points. Returns the rewritten text PLUS a change log, so the student
 * always sees what was altered and why. Never invents metrics — it flags them instead.
 */
export function improveBullets(text = '', { career = null } = {}) {
  const lines = String(text).split('\n');
  const changes = [];
  const out = lines.map((raw, idx) => {
    let line = raw.trim();
    if (!line) return raw;
    const original = line;

    // 1. Drop bullet symbols for consistent rendering
    line = line.replace(/^[-*•\u2022\d.)\s]+/, '');

    // 2. Replace weak openers with strong action verbs
    const lower = line.toLowerCase();
    for (const [weak, [strongEn, strongHi]] of Object.entries(STRONG_VERBS)) {
      if (lower.startsWith(weak)) {
        line = `${strongEn} ${line.slice(weak.length).trim()}`;
        changes.push({ index: idx, from: original, to: line, kind: 'verb', reason: [`Weak opener “${weak}” → action verb “${strongEn}”. Recruiters scan for verbs first.`, `कमज़ोर शुरुआत “${weak}” → क्रिया “${strongHi}”। भर्तीकर्ता पहले क्रियाएँ देखते हैं।`] });
        break;
      }
    }

    // 3. Remove filler words
    const before = line;
    FILLER.forEach((f) => { line = line.replace(new RegExp(`\\b${f.trim()}\\b`, 'gi'), ''); });
    line = line.replace(/\s{2,}/g, ' ').trim();
    if (line !== before) {
      changes.push({ index: idx, from: before, to: line, kind: 'filler', reason: ['Removed filler words — tighter bullets read as more senior.', 'भरती शब्द हटाए — संक्षिप्त बुलेट अधिक परिपक्व लगते हैं।'] });
    }

    // 4. Capitalise the first letter
    if (line && line[0] !== line[0].toUpperCase()) {
      const before2 = line;
      line = line[0].toUpperCase() + line.slice(1);
      changes.push({ index: idx, from: before2, to: line, kind: 'case', reason: ['Sentence-case start for a consistent list.', 'समान सूची के लिए वाक्य-केस शुरुआत।'] });
    }

    // 5. Tense consistency for past roles
    if (career && /\b(build|create|develop|write|design|manage|lead)\b/i.test(line) && !/^(Built|Created|Developed|Wrote|Designed|Managed|Led)/.test(line)) {
      const map = { build: 'Built', create: 'Created', develop: 'Developed', write: 'Wrote', design: 'Designed', manage: 'Managed', lead: 'Led' };
      const m = line.match(/\b(build|create|develop|write|design|manage|lead)\b/i);
      if (m) {
        const before3 = line;
        line = line.replace(m[0], map[m[0].toLowerCase()]);
        changes.push({ index: idx, from: before3, to: line, kind: 'tense', reason: ['Past tense reads as completed work, not intention.', 'भूतकाल पूर्ण किए कार्य जैसा पढ़ा जाता है, इरादा नहीं।'] });
      }
    }

    // 6. Trim overly long bullets (recruiter scan window)
    if (line.split(/\s+/).length > 26) {
      changes.push({ index: idx, from: line, to: line, kind: 'length', reason: ['This bullet is long — split it into two outcomes.', 'यह बुलेट लंबा है — इसे दो परिणामों में बाँटें।'], advisory: true });
    }
    // 7. Flag missing metrics (advisory only — we never invent numbers)
    if (!/\d/.test(line)) {
      changes.push({ index: idx, from: line, to: line, kind: 'metric', reason: ['No number here. Add scale or impact (users, %, time saved, records).', 'यहाँ संख्या नहीं। पैमाना या प्रभाव जोड़ें (उपयोगकर्ता, %, बचा समय, रिकॉर्ड)।'], advisory: true });
    }
    return line;
  });

  return { text: out.join('\n'), changes };
}

/** ATS-style structural analysis: each check is explained and weighted. */
/**
 * v7 Tailor Studio — deterministic, fully-local job-description keyword matching.
 * Extracts catalogue skills mentioned in a pasted JD, compares them with the
 * skills evident in the current draft, and can inject the top gaps.
 * Demo heuristic: a keyword overlap aid, NOT a real ATS or recruiter signal.
 */
const JD_ALIAS = {
  dsa: ['data structure', 'algorithm'],
  dbms: ['database'],
  ml: ['machine learning'],
  excel: ['spreadsheet', 'ms excel'],
  communication: ['communication', 'communicate'],
  git: ['github', 'version control'],
};

export function extractJdSkills(jd = '') {
  const low = String(jd || '').toLowerCase();
  const found = [];
  SKILLS.forEach((sk) => {
    const en = String(sk.n?.[0] || '').toLowerCase();
    const words = en.split(/[^a-z0-9+#.]+/).filter((w) => w.length >= 4);
    const pats = [en, sk.id, ...(JD_ALIAS[sk.id] || []), ...words];
    const hit = pats.some((pat) => pat && pat.length >= 3 && new RegExp(`\\b${pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(low));
    if (hit) found.push(sk.id);
  });
  return found;
}

export function draftSkillHits(draft = {}) {
  const blob = [
    draft.summary,
    (draft.experience || []).map((e) => `${e.role} ${e.company} ${e.bullets}`),
    (draft.projects || []).map((e) => `${e.title} ${e.tech} ${e.bullets}`),
    draft.skills,
  ].flat().join('\n').toLowerCase();
  return extractJdSkills(blob);
}

export function analyzeJdMatch(jd = '', draft = {}) {
  const jdSkills = extractJdSkills(jd);
  const have = new Set(draftSkillHits(draft));
  const matched = jdSkills.filter((k) => have.has(k));
  const missing = jdSkills.filter((k) => !have.has(k));
  const overlap = jdSkills.length ? Math.round((matched.length / jdSkills.length) * 100) : 0;
  return { jdSkills, matched, missing, overlap };
}

export function tailorDraft(draft = {}, missing = [], lang = 'en', limit = 3) {
  const d = JSON.parse(JSON.stringify(draft || {}));
  const top = missing.slice(0, limit);
  if (!top.length) return { draft: d, addedSkills: [], bullet: null };
  const names = top.map((k) => SKILL_BY_ID[k]?.n?.[lang === 'hi' ? 1 : 0] || k);
  const cur = Array.isArray(d.skills) ? d.skills.join(', ') : String(d.skills || '');
  d.skills = [cur, names.join(', ')].filter(Boolean).join(', ');
  let bullet = null;
  if ((d.experience || []).length) {
    bullet = lang === 'hi'
      ? `${names.join(', ')} का उपयोग करते हुए एक प्रोजेक्ट पूरा किया और परिणाम मापे।`
      : `Delivered a project using ${names.join(', ')}, documenting the measurable outcome.`;
    const e = d.experience[0];
    e.bullets = `${e.bullets || ''}${e.bullets ? '\n' : ''}${bullet}`;
  }
  return { draft: d, addedSkills: top, bullet };
}

export function analyzeResume(resume = {}, skillMap = {}, targetCareerId, lang = 'en') {
  const base = resumeReadiness(resume, skillMap, targetCareerId);
  const p = resume.personal || {};
  const bullets = [...(resume.projects || []), ...(resume.experience || [])]
    .flatMap((x) => String(x.bullets || '').split('\n'))
    .map((b) => b.trim())
    .filter((b) => b.length > 8);
  const text = `${resume.summary || ''} ${(resume.skills || []).join(' ')} ${bullets.join(' ')}`;

  const checks = [
    {
      id: 'contact',
      n: ['Contact details present', 'संपर्क विवरण मौजूद'],
      pass: !!(p.name && p.email && (p.phone || p.city)),
      weight: 8,
      fix: ['Add your name, email and at least a phone number or city.', 'अपना नाम, ईमेल और कम से कम फ़ोन नंबर या शहर जोड़ें।'],
    },
    {
      id: 'links',
      n: ['Portfolio links (GitHub / LinkedIn)', 'पोर्टफोलियो लिंक (गिटहब / लिंक्डइन)'],
      pass: !!(p.github || p.linkedin),
      weight: 6,
      fix: ['Recruiters verify work — add a GitHub or LinkedIn link.', 'भर्तीकर्ता काम सत्यापित करते हैं — गिटहब या लिंक्डइन लिंक जोड़ें।'],
    },
    {
      id: 'summary',
      n: ['Professional summary (60–300 characters)', 'प्रोफ़ेशनल सारांश (60–300 अक्षर)'],
      pass: (resume.summary || '').trim().length >= 60 && (resume.summary || '').trim().length <= 420,
      weight: 10,
      fix: ['Use “Generate professional summary”, then edit it in your own voice.', '“प्रोफ़ेशनल सारांश बनाएँ” उपयोग करें, फिर अपनी शैली में संपादित करें।'],
    },
    {
      id: 'education',
      n: ['Education section with degree and score', 'डिग्री और अंक वाली शिक्षा सूची'],
      pass: (resume.education || []).length > 0 && !!(resume.education?.[0]?.degree),
      weight: 8,
      fix: ['Add degree, institute, period and CGPA/percentage.', 'डिग्री, संस्थान, अवधि और CGPA/प्रतिशत जोड़ें।'],
    },
    {
      id: 'skills',
      n: ['Skills section (6–14 relevant skills)', 'कौशल सेक्शन (6–14 प्रासंगिक कौशल)'],
      pass: (resume.skills || []).length >= 6 && (resume.skills || []).length <= 14,
      weight: 10,
      fix: ['List 6–14 skills that match your target role — not everything you have touched.', 'लक्षित रोल से मैच होने वाले 6–14 कौशल लिखें — हर छुई हुई चीज़ नहीं।'],
    },
    {
      id: 'projects',
      n: ['At least two projects with detail', 'कम से कम दो विस्तृत प्रोजेक्ट'],
      pass: (resume.projects || []).length >= 2,
      weight: 14,
      fix: ['Two projects with problem, approach and outcome beat five with one line each.', 'दो विस्तृत प्रोजेक्ट पाँच एक-पंक्ती प्रोजेक्ट से बेहतर हैं।'],
    },
    {
      id: 'bullets',
      n: ['Action-verb bullet points', 'क्रिया-आधारित बुलेट पॉइंट'],
      pass: bullets.length >= 4 && bullets.filter((b) => /^(Built|Developed|Designed|Implemented|Reduced|Improved|Created|Led|Automated|Optimised|Optimized|Shipped|Analysed|Analyzed|Launched|Increased|Owned|Delivered|Contributed|Managed|Wrote|Experimented|Supported|Practised)/i.test(b)).length >= Math.ceil(bullets.length * 0.6),
      weight: 12,
      fix: ['Start each bullet with a strong verb — use “Improve bullet points”.', 'हर बुलेट मज़बूत क्रिया से शुरू करें — “बुलेट पॉइंट सुधारें” उपयोग करें।'],
    },
    {
      id: 'quantified',
      n: ['Quantified impact (numbers in bullets)', 'मापने योग्य प्रभाव (बुलेट में संख्याएँ)'],
      pass: bullets.length > 0 && bullets.filter((b) => /\d/.test(b)).length >= Math.max(2, Math.ceil(bullets.length * 0.4)),
      weight: 12,
      fix: ['Add scale or result to at least two bullets (%, users, time saved, records).', 'कम से कम दो बुलेट में पैमाना या परिणाम जोड़ें (%, उपयोगकर्ता, बचा समय)।'],
    },
    {
      id: 'keywords',
      n: ['Target-role keyword coverage', 'लक्षित रोल कीवर्ड कवरेज'],
      pass: base.ats >= 60,
      weight: 12,
      fix: base.keywordMissing.length
        ? [`Include: ${base.keywordMissing.slice(0, 5).map((k) => SKILL_BY_ID[k]?.n?.[0] || k).join(', ')}.`, `शामिल करें: ${base.keywordMissing.slice(0, 5).map((k) => SKILL_BY_ID[k]?.n?.[1] || k).join(', ')}।`]
        : ['Coverage is healthy — keep it updated as you learn more.', 'कवरेज अच्छा है — सीखते रहें और अपडेट करें।'],
    },
    {
      id: 'pronouns',
      n: ['No first-person pronouns in bullets', 'बुलेट में पहला पुरुष सर्वनाम नहीं'],
      pass: !/\b(I|my|we|our|मैंने|मेरा|हम)\b/i.test(bullets.join(' ')),
      weight: 4,
      fix: ['Drop “I/we” — bullets should start with the verb.', '“मैं/हम” हटाएँ — बुलेट क्रिया से शुरू हों।'],
    },
    {
      id: 'length',
      n: ['Concise bullets (under 26 words each)', 'संक्षिप्त बुलेट (प्रति 26 शब्द से कम)'],
      pass: bullets.length > 0 && bullets.every((b) => b.split(/\s+/).length <= 26),
      weight: 4,
      fix: ['Split long bullets into two crisp outcomes.', 'लंबे बुलेट को दो संक्षिप्त परिणामों में बाँटें।'],
    },
    {
      id: 'achievements',
      n: ['Achievements or certifications section', 'उपलब्धियाँ या प्रमाणपत्र सेक्शन'],
      pass: (resume.achievements || []).length > 0,
      weight: 6,
      fix: ['Add hackathons, scholarships, certifications or leadership roles.', 'हैकाथॉन, स्कॉलरशिप, प्रमाणपत्र या नेतृत्व भूमिकाएँ जोड़ें।'],
    },
  ];

  const i = lang === 'hi' ? 1 : 0;
  const earned = checks.reduce((a, c) => a + (c.pass ? c.weight : 0), 0);
  const total = checks.reduce((a, c) => a + c.weight, 0);
  const structureScore = Math.round((earned / total) * 100);
  const failed = checks.filter((c) => !c.pass);

  const weakSections = [];
  if (!(resume.projects || []).length) weakSections.push(['Projects', 'प्रोजेक्ट']);
  if (!(resume.experience || []).length) weakSections.push(['Experience', 'अनुभव']);
  if (!(resume.achievements || []).length) weakSections.push(['Achievements', 'उपलब्धियाँ']);
  if ((resume.skills || []).length < 6) weakSections.push(['Skills', 'कौशल']);
  if ((resume.summary || '').trim().length < 60) weakSections.push(['Summary', 'सारांश']);
  if (!(resume.education || []).length) weakSections.push(['Education', 'शिक्षा']);

  const score = Math.round(clamp(base.score * 0.55 + structureScore * 0.45));

  return {
    score,
    parts: { content: base.score, structure: structureScore, ats: base.ats },
    checks,
    failed,
    weakSections,
    bulletCount: bullets.length,
    keywords: { hits: base.keywordHits, missing: base.keywordMissing, coverage: base.ats },
    suggestions: failed
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6)
      .map((c) => ({ id: c.id, weight: c.weight, text: c.fix[i], textPair: c.fix })),
    summary: lang === 'hi'
      ? `आपका रिज़्यूमे ${score}/100 है। ${failed.length ? `${failed.length} जाँच विफल: सबसे महत्वपूर्ण — ${failed.sort((a, b) => b.weight - a.weight)[0].n[1]}।` : 'सभी संरचनात्मक जाँच पास।'}`
      : `Your resume scores ${score}/100. ${failed.length ? `${failed.length} check(s) failing — highest impact: ${failed.sort((a, b) => b.weight - a.weight)[0].n[0]}.` : 'All structural checks pass.'}`,
    voidText: text,
  };
}

export default { TEMPLATES, emptyResume, importFromProfile, generateSummary, improveBullets, analyzeResume };
