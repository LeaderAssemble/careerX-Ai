import { CAREERS, CAREER_BY_ID } from '../data/careers';
import { SKILLS, SKILL_BY_ID } from '../data/catalog';
import { clamp, avg, sum, levelToScore } from '../lib/utils';

/**
 * scoreService — the transparent rule-based "AI" behind every number in CareerX.
 *
 * WHY IT IS RULE-BASED: this hackathon build has no external model connected, so every
 * score is computed from the student's own data with weights that are visible in the UI.
 * Nothing here is a statistically validated prediction of employment, and the app says so.
 *
 * INTEGRATION POINT: to plug a real model, keep these function signatures and call your
 * API inside them (see src/services/aiService.js for the remote-call pattern).
 */

/* ------------------------------------------------------------------ *
 * Normalisation helpers
 * ------------------------------------------------------------------ */

/** Merge onboarding skills + later updates (closed gaps, finished courses) into one map. */
export function buildSkillMap(profile = {}, progress = {}) {
  const map = {};
  const add = (list) => (Array.isArray(list) ? list : []).forEach((s) => {
    if (!s || !s.id) return;
    map[s.id] = clamp(Number(s.level) || 0, 0, 4);
  });
  add(profile.techSkills);
  add(profile.softSkills);
  add(profile.toolSkills);
  add(profile.industrySkills);
  // Later updates win (skill gap closure, course completion, interview practice).
  Object.entries(progress.skillUpdates || {}).forEach(([id, lvl]) => {
    map[id] = clamp(Math.max(map[id] || 0, Number(lvl) || 0), 0, 4);
  });
  return map;
}

export const level = (skillMap, id) => skillMap?.[id] ?? 0;
export const scoreOf = (skillMap, id) => levelToScore(level(skillMap, id));

/** How well does the student cover a career's required skills? (0–1) */
export function careerCoverage(career, skillMap) {
  if (!career) return 0;
  const totalW = sum(career.skills.map((s) => s.w));
  if (!totalW) return 0;
  const got = sum(career.skills.map((s) => s.w * (level(skillMap, s.id) / 4)));
  return clamp(got / totalW, 0, 1);
}

/** Required level for a skill inside a career (importance → expectation). */
export function requiredLevel(w) {
  if (w >= 3) return 3.5;
  if (w === 2) return 3;
  return 2;
}

/* ------------------------------------------------------------------ *
 * Profile completion
 * ------------------------------------------------------------------ */

const PROFILE_CHECKS = [
  ['name', (p) => !!p.personal?.name?.trim()],
  ['email', (p) => !!p.personal?.email?.trim()],
  ['city', (p) => !!p.personal?.city],
  ['college', (p) => !!p.personal?.college],
  ['degree', (p) => !!p.education?.degree],
  ['branch', (p) => !!p.education?.branch],
  ['cgpa', (p) => Number(p.education?.cgpa) > 0],
  ['gradYear', (p) => !!p.education?.gradYear],
  ['subjects', (p) => (p.education?.subjects || []).length >= 2],
  ['techSkills', (p) => (p.techSkills || []).filter((s) => s.level > 0).length >= 4],
  ['softSkills', (p) => (p.softSkills || []).filter((s) => s.level > 0).length >= 3],
  ['interests', (p) => (p.interests || []).length >= 2],
  ['careerAreas', (p) => (p.careerAreas || []).length >= 1],
  ['projects', (p) => (p.projects || []).length >= 1],
  ['goal', (p) => !!p.goal?.trim()],
  ['workType', (p) => !!p.workType],
  ['targetCareer', (p) => !!p.targetCareer],
  ['resume', (_p, pr) => !!(pr?.resume?.personal?.name || pr?.resume?.sections?.length || pr?.resume?.updatedAt)],
  ['interview', (_p, pr) => (pr?.interviews || []).length >= 1],
  ['roadmap', (_p, pr) => !!pr?.roadmap?.generatedAt],
];

export function profileCompletion(profile = {}, progress = {}) {
  const done = PROFILE_CHECKS.filter(([, fn]) => {
    try { return !!fn(profile, progress); } catch { return false; }
  }).length;
  return Math.round((done / PROFILE_CHECKS.length) * 100);
}

export function missingProfileParts(profile = {}, progress = {}) {
  return PROFILE_CHECKS.filter(([, fn]) => {
    try { return !fn(profile, progress); } catch { return true; }
  }).map(([key]) => key);
}

/* ------------------------------------------------------------------ *
 * Resume readiness (0–100)
 * ------------------------------------------------------------------ */

export function resumeReadiness(resume = {}, skillMap = {}, targetCareerId) {
  const career = CAREER_BY_ID[targetCareerId];
  const r = resume || {};
  const p = r.personal || {};
  const items = { projects: r.projects || [], experience: r.experience || [], education: r.education || [], achievements: r.achievements || [] };
  const bullets = [...items.projects, ...items.experience].flatMap((x) => String(x.bullets || x.desc || '').split('\n')).filter((b) => b.trim().length > 12);

  const completeness = clamp(
    (p.name ? 8 : 0) + (p.email ? 4 : 0) + (p.phone ? 4 : 0) + (p.city ? 2 : 0) +
    ((p.github || p.linkedin) ? 6 : 0) + (r.summary?.trim().length > 60 ? 12 : r.summary?.trim() ? 6 : 0) +
    (items.education.length ? 8 : 0) + ((r.skills || []).length >= 5 ? 10 : (r.skills || []).length * 2) +
    (items.projects.length ? 14 : 0) + (items.experience.length ? 10 : 0) + (items.achievements.length ? 6 : 0),
    0, 84
  );

  const actionVerbs = /^(built|developed|designed|implemented|reduced|improved|created|led|automated|optimised|optimized|shipped|analysed|analyzed|launched|increased|मैंने|बनाया|विकसित|सुधारा|किया)/i;
  const strongBullets = bullets.filter((b) => actionVerbs.test(b.trim())).length;
  const quantified = bullets.filter((b) => /\d/.test(b)).length;
  const quality = clamp((bullets.length ? (strongBullets / bullets.length) * 10 : 0) + (bullets.length ? (quantified / bullets.length) * 6 : 0), 0, 16);

  // ATS keyword coverage against the target career
  const text = `${r.summary || ''} ${(r.skills || []).join(' ')} ${bullets.join(' ')} ${items.projects.map((x) => `${x.title || ''} ${x.tech || ''}`).join(' ')}`.toLowerCase();
  const required = career ? career.skills.filter((s) => s.w >= 2).map((s) => s.id) : [];
  const hits = required.filter((id) => {
    const nm = (SKILL_BY_ID[id]?.n?.[0] || id).toLowerCase();
    return text.includes(nm) || text.includes(id.replace(/-/g, ' ')) || text.includes(id);
  });
  const ats = required.length ? clamp((hits.length / required.length) * 100, 0, 100) : 60;

  const score = Math.round(clamp(completeness + quality));
  return {
    score,
    ats,
    keywordHits: hits,
    keywordMissing: required.filter((id) => !hits.includes(id)),
    bullets: bullets.length,
    strongBullets,
    quantified,
    parts: { completeness: Math.round(completeness), quality: Math.round(quality) },
  };
}

/* ------------------------------------------------------------------ *
 * Interview readiness
 * ------------------------------------------------------------------ */

export function interviewReadiness(interviews = []) {
  if (!interviews.length) return { score: 0, attempts: 0, best: 0, latest: null, dims: null };
  const scores = interviews.map((i) => Number(i.score) || 0);
  const best = Math.max(...scores);
  const latest = interviews[0];
  const attemptFactor = clamp(interviews.length / 4, 0, 1); // 4+ attempts = full credit
  const dims = latest?.dims || null;
  const score = Math.round(clamp(best * 0.7 + attemptFactor * 100 * 0.3));
  return { score, attempts: interviews.length, best: Math.round(best), latest, dims };
}

/* ------------------------------------------------------------------ *
 * Employability score — every component is shown in the UI
 * ------------------------------------------------------------------ */

export function employabilityScore(input) {
  const { profile = {}, progress = {}, skillMap = {}, targetCareerId, resumeScore = 0, interview = { score: 0 }, roadmapProgress = 0, completion = 0 } = input;
  const career = CAREER_BY_ID[targetCareerId];

  // 1. Technical skills (25 pts) — coverage of the target career's technical/tool skills
  const techSkills = career ? career.skills.filter((s) => ['technical', 'tools'].includes(SKILL_BY_ID[s.id]?.cat)) : [];
  const techTotal = sum(techSkills.map((s) => s.w));
  const techGot = techTotal ? sum(techSkills.map((s) => s.w * (level(skillMap, s.id) / 4))) / techTotal : 0;
  const technical = Math.round(techGot * 25);

  // 2. Projects (20 pts) — evidence of shipped work
  const projectCount = (profile.projects || []).length + Object.keys(progress.projects || {}).length;
  const completedCount = (progress.projects ? Object.values(progress.projects).filter((v) => v === 'completed').length : 0)
    + (profile.projects || []).filter((p) => p.status === 'completed').length;
  const projects = Math.round(clamp(projectCount * 3.5 + completedCount * 5, 0, 20));

  // 3. Resume readiness (15 pts)
  const resume = Math.round(clamp(resumeScore, 0, 100) * 0.15);

  // 4. Interview preparation (15 pts)
  const interviewPts = Math.round(clamp(interview.score, 0, 100) * 0.15);

  // 5. Communication (15 pts) — soft skill level + interview communication dimension
  const commLevel = level(skillMap, 'communication') / 4;
  const commDim = (interview.dims?.communication ?? 0) / 100;
  const presentation = level(skillMap, 'presentation') / 4;
  const communication = Math.round(clamp(commLevel * 0.5 + commDim * 0.3 + presentation * 0.2, 0, 1) * 15);

  // 6. Profile completion (10 pts)
  const prof = Math.round(clamp(completion, 0, 100) * 0.1);

  const components = [
    { id: 'technical', n: ['Technical Skills', 'तकनीकी कौशल'], earned: technical, max: 25, how: ['Weighted coverage of your target career’s technical and tool skills.', 'आपके लक्षित करियर के तकनीकी और टूल कौशल का भारित कवरेज।'] },
    { id: 'projects', n: ['Projects', 'प्रोजेक्ट'], earned: projects, max: 20, how: ['Projects started (+3.5 each) and completed (+5 each).', 'शुरू किए प्रोजेक्ट (+3.5 प्रति) और पूर्ण किए (+5 प्रति)।'] },
    { id: 'resume', n: ['Resume Readiness', 'रिज़्यूमे तैयारी'], earned: resume, max: 15, how: ['15% of your resume readiness score.', 'आपके रिज़्यूमे रेडीनेस स्कोर का 15%।'] },
    { id: 'interview', n: ['Interview Preparation', 'इंटरव्यू तैयारी'], earned: interviewPts, max: 15, how: ['15% of your latest interview readiness score.', 'आपके नवीनतम इंटरव्यू तैयारी स्कोर का 15%।'] },
    { id: 'communication', n: ['Communication', 'संचार'], earned: communication, max: 15, how: ['Self-rated communication, presentation skill and interview communication feedback.', 'स्व-मूल्यांकित संचार, प्रस्तुति कौशल और इंटरव्यू संचार फ़ीडबैक।'] },
    { id: 'profile', n: ['Profile Completion', 'प्रोफ़ाइल पूर्णता'], earned: prof, max: 10, how: ['10% of your profile completion.', 'आपकी प्रोफ़ाइल पूर्णता का 10%।'] },
  ];
  const total = components.reduce((a, c) => a + c.earned, 0);
  return { score: clamp(total, 0, 100), components, roadmapProgress };
}

/* ------------------------------------------------------------------ *
 * Skill DNA (radar) — evolves as the student completes work
 * ------------------------------------------------------------------ */

export function skillDNA({ skillMap = {}, profile = {}, progress = {}, targetCareerId, interview = { score: 0, dims: null } }) {
  const catAvg = (cat) => {
    const ids = SKILLS.filter((s) => s.cat === cat).map((s) => s.id);
    const vals = ids.map((id) => level(skillMap, id)).filter((v) => v > 0);
    return vals.length ? (avg(vals) / 4) * 100 : 0;
  };
  const projectsDone = (progress.projects ? Object.values(progress.projects).filter((v) => v === 'completed').length : 0)
    + (profile.projects || []).filter((p) => p.status === 'completed').length;
  const roadmapTasks = progress.roadmap?.tasks || [];
  const roadmapDone = roadmapTasks.filter((t) => t.done).length;

  const technical = clamp(catAvg('technical') * 0.7 + catAvg('tools') * 0.3 + Math.min(projectsDone * 6, 18), 0, 100);
  const problemSolving = clamp((level(skillMap, 'problem-solving') / 4) * 55 + (level(skillMap, 'dsa') / 4) * 25 + (interview.dims?.technical ?? 0) * 0.2, 0, 100);
  const communication = clamp((level(skillMap, 'communication') / 4) * 40 + (level(skillMap, 'presentation') / 4) * 20 + (interview.dims?.communication ?? 0) * 0.4, 0, 100);
  const leadership = clamp((level(skillMap, 'leadership') / 4) * 55 + (level(skillMap, 'teamwork') / 4) * 25 + Math.min((profile.experience || []).length * 8, 20), 0, 100);
  const creativity = clamp((level(skillMap, 'creativity') / 4) * 50 + (level(skillMap, 'design-thinking') / 4) * 20 + Math.min(projectsDone * 7, 30), 0, 100);
  const adaptability = clamp((level(skillMap, 'adaptability') / 4) * 45 + (level(skillMap, 'time-management') / 4) * 20 + Math.min(roadmapDone * 2.2, 20) + Math.min((progress.savedCourses || []).length * 4, 15), 0, 100);
  const industryReadiness = clamp(
    catAvg('industry') * 0.45
    + (resumeScoreFromProgress(progress, skillMap, targetCareerId) * 0.2)
    + (interview.score * 0.2)
    + Math.min((progress.applications || []).length * 3, 15),
    0, 100
  );

  return [
    { axis: ['Technical Skills', 'तकनीकी कौशल'], value: Math.round(technical) },
    { axis: ['Problem Solving', 'समस्या समाधान'], value: Math.round(problemSolving) },
    { axis: ['Communication', 'संचार'], value: Math.round(communication) },
    { axis: ['Leadership', 'नेतृत्व'], value: Math.round(leadership) },
    { axis: ['Creativity', 'रचनात्मकता'], value: Math.round(creativity) },
    { axis: ['Adaptability', 'अनुकूलनशीलता'], value: Math.round(adaptability) },
    { axis: ['Industry Readiness', 'इंडस्ट्री तैयारी'], value: Math.round(industryReadiness) },
  ];
}

function resumeScoreFromProgress(progress, skillMap, targetCareerId) {
  return resumeReadiness(progress.resume || {}, skillMap, targetCareerId).score / 100;
}

/* ------------------------------------------------------------------ *
 * AI Career Readiness Score — the headline number
 * ------------------------------------------------------------------ */

export const READINESS_WEIGHTS = {
  skills: 0.35,
  roadmap: 0.16,
  projects: 0.15,
  resume: 0.12,
  interview: 0.12,
  profile: 0.10,
};

export function careerReadiness({ profile = {}, progress = {}, skillMap = {}, targetCareerId, completion = 0 }) {
  const career = CAREER_BY_ID[targetCareerId] || CAREERS[0];
  const skills = Math.round(careerCoverage(career, skillMap) * 100);

  const tasks = progress.roadmap?.tasks || [];
  const roadmap = tasks.length ? Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100) : 0;

  const projectCount = (profile.projects || []).length + Object.keys(progress.projects || {}).length;
  const completedCount = (progress.projects ? Object.values(progress.projects).filter((v) => v === 'completed').length : 0)
    + (profile.projects || []).filter((p) => p.status === 'completed').length;
  const projects = Math.round(clamp(projectCount * 12 + completedCount * 22, 0, 100));

  const resume = resumeReadiness(progress.resume || {}, skillMap, targetCareerId).score;
  const interview = interviewReadiness(progress.interviews || []).score;

  const parts = {
    skills: { value: skills, weight: READINESS_WEIGHTS.skills, n: ['Skill coverage', 'कौशल कवरेज'] },
    roadmap: { value: roadmap, weight: READINESS_WEIGHTS.roadmap, n: ['Roadmap progress', 'रोडमैप प्रगति'] },
    projects: { value: projects, weight: READINESS_WEIGHTS.projects, n: ['Project evidence', 'प्रोजेक्ट प्रमाण'] },
    resume: { value: resume, weight: READINESS_WEIGHTS.resume, n: ['Resume readiness', 'रिज़्यूमे तैयारी'] },
    interview: { value: interview, weight: READINESS_WEIGHTS.interview, n: ['Interview preparation', 'इंटरव्यू तैयारी'] },
    profile: { value: completion, weight: READINESS_WEIGHTS.profile, n: ['Profile completion', 'प्रोफ़ाइल पूर्णता'] },
  };
  const score = Math.round(clamp(sum(Object.values(parts).map((p) => p.value * p.weight)), 0, 100));
  return { score, parts, career };
}

/**
 * Plain-language explanation of the readiness score.
 * Built from the weakest components so it always tells the student what to do next.
 */
export function readinessExplanation({ parts, skillMap, targetCareerId, lang = 'en' }) {
  const career = CAREER_BY_ID[targetCareerId];
  const ranked = Object.entries(parts).sort((a, b) => a[1].value - b[1].value);
  const weak = ranked.slice(0, 2).map(([k]) => k);
  const gaps = career
    ? career.skills
      .map((s) => ({ s, gap: requiredLevel(s.w) - level(skillMap, s.id) }))
      .filter((g) => g.gap > 0.75)
      .sort((a, b) => b.gap * b.s.w - a.gap * a.s.w)
      .slice(0, 3)
      .map((g) => SKILL_BY_ID[g.s.id]?.n || [g.s.id, g.s.id])
    : [];

  const i = lang === 'hi' ? 1 : 0;
  const strengths = ranked.slice(-1)[0];
  const strongLabel = strengths ? (parts[strengths[0]].n[i] || '') : '';
  const gapLabel = gaps.map((g) => g[i]).filter(Boolean).join(', ');
  const weakLabels = weak.map((k) => parts[k].n[i]).filter(Boolean).join(', ');

  if (lang === 'hi') {
    return `आपकी ${strongLabel || 'बुनियाद'} मज़बूत है। ${weakLabels ? `${weakLabels} अभी सबसे कम है।` : ''} ${gapLabel ? `${gapLabel} सुधारने से ${career ? career.n[1] : 'लक्षित'} भूमिकाओं के लिए आपकी तैयारी स्पष्ट रूप से बढ़ेगी।` : 'अगला कदम: एक प्रोजेक्ट पूरा करें और मॉक इंटरव्यू दें।'}`;
  }
  return `Your ${strongLabel.toLowerCase() || 'foundation'} is solid. ${weakLabels ? `${weakLabels} is currently the weakest component.` : ''} ${gapLabel ? `Improving ${gapLabel} would meaningfully raise your readiness for ${career ? career.n[0] : 'your target'} roles.` : 'Next step: ship one project and attempt a mock interview.'}`;
}

/** Single derived snapshot used across pages so numbers never disagree. */
export function computeDerived(profile = {}, progress = {}) {
  const skillMap = buildSkillMap(profile, progress);
  const completion = profileCompletion(profile, progress);
  const targetCareerId = profile.targetCareer || null;
  const resume = resumeReadiness(progress.resume || {}, skillMap, targetCareerId);
  const interview = interviewReadiness(progress.interviews || []);
  const readiness = careerReadiness({ profile, progress, skillMap, targetCareerId, completion });
  const employability = employabilityScore({
    profile, progress, skillMap, targetCareerId,
    resumeScore: resume.score, interview, completion,
    roadmapProgress: readiness.parts.roadmap.value,
  });
  const dna = skillDNA({ skillMap, profile, progress, targetCareerId, interview });
  return { skillMap, completion, targetCareerId, career: CAREER_BY_ID[targetCareerId] || null, resume, interview, readiness, employability, dna };
}

export default computeDerived;
