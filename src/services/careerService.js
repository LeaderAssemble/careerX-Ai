import { CAREERS, CAREER_BY_ID, CAREER_KEYWORDS } from '../data/careers';
import { SKILLS, SKILL_BY_ID, INTERESTS } from '../data/catalog';
import { COURSES } from '../data/courses';
import { PROJECTS } from '../data/projects';
import { careerCoverage, level, requiredLevel } from './scoreService';
import { clamp, sum, seeded, hashString } from '../lib/utils';

/**
 * careerService — career matching, gap analysis, roadmap generation,
 * career simulation, project recommendation and the 30/60/90 challenge.
 *
 * Every recommendation is explainable: each returned object carries `reasons`
 * (bilingual) so the UI can show WHY, not just WHAT.
 */

/* ------------------------------------------------------------------ *
 * Career matching
 * ------------------------------------------------------------------ */

export function getCareerMatches(profile = {}, skillMap = {}, options = {}) {
  const { limit = 8 } = options;
  const cgpa = Number(profile.education?.cgpa) || 0;
  // CGPA may be on a 10-point scale or a percentage; normalise both to 0..1
  const cgpaNorm = cgpa > 0 ? clamp(cgpa > 10 ? cgpa / 100 : cgpa / 10, 0, 1) : 0.6;
  const interests = profile.interests || [];
  const areas = profile.careerAreas || [];
  const projectText = JSON.stringify(profile.projects || []).toLowerCase();
  // Projects already tracked in progress count as evidence too.
  const progressProjectCount = Object.keys(options.progress?.projects || {}).length;
  const goalText = `${profile.goal || ''}`.toLowerCase();
  const expCount = (profile.experience || []).length;

  const scored = CAREERS.map((career) => {
    const coverage = careerCoverage(career, skillMap);

    const interestHits = career.interests.filter((i) => interests.includes(i)).length;
    const interestScore = career.interests.length ? interestHits / career.interests.length : 0;

    const areaHit = areas.includes(career.id) ? 1 : 0;
    const projectHit = ((profile.projects || []).length + progressProjectCount > 0) && (projectText.includes(career.id) || CAREER_KEYWORDS[career.id]?.some((k) => projectText.includes(k.toLowerCase()))) ? 1 : 0;
    const goalHit = CAREER_KEYWORDS[career.id]?.some((k) => goalText.includes(k.toLowerCase())) ? 1 : 0;

    const raw =
      coverage * 0.58 +
      interestScore * 0.12 +
      areaHit * 0.12 +
      projectHit * 0.08 +
      goalHit * 0.05 +
      cgpaNorm * 0.05 +
      clamp(expCount * 0.05, 0, 0.05);

    const match = Math.round(clamp(raw * 100, 4, 99));

    const skillRows = career.skills.map((s) => {
      const cur = level(skillMap, s.id);
      const req = requiredLevel(s.w);
      return { id: s.id, w: s.w, current: cur, required: req, gap: Math.max(0, req - cur), skill: SKILL_BY_ID[s.id] };
    });
    const missing = skillRows.filter((r) => r.gap >= 0.75).sort((a, b) => b.gap * b.w - a.gap * a.w);
    const have = skillRows.filter((r) => r.current >= r.required - 0.25).sort((a, b) => b.current - a.current);

    /* --- explainable reasons (bilingual) --- */
    const reasons = [];
    if (have.length) {
      reasons.push([
        `You already meet the expected level in ${have.slice(0, 3).map((r) => r.skill?.n?.[0] || r.id).join(', ')}.`,
        `आप ${have.slice(0, 3).map((r) => r.skill?.n?.[1] || r.id).join(', ')} में अपेक्षित स्तर पर पहले से हैं।`,
      ]);
    }
    if (interestHits) {
      reasons.push([
        `Matches your interests: ${career.interests.filter((i) => interests.includes(i)).map((i) => INTERESTS.find((x) => x.id === i)?.n?.[0]).filter(Boolean).join(', ')}.`,
        `आपकी रुचियों से मेल: ${career.interests.filter((i) => interests.includes(i)).map((i) => INTERESTS.find((x) => x.id === i)?.n?.[1]).filter(Boolean).join(', ')}।`,
      ]);
    }
    if (areaHit) reasons.push(['You selected this career area during onboarding.', 'आपने ऑनबोर्डिंग में यह करियर क्षेत्र चुना था।']);
    if (goalHit) reasons.push(['Your stated career goal points toward this path.', 'आपका बताया गया करियर लक्ष्य इस पथ की ओर इशारा करता है।']);
    if (projectHit) reasons.push(['Your projects already use skills this role needs.', 'आपके प्रोजेक्ट पहले से इस भूमिका के कौशल उपयोग करते हैं।']);
    if (coverage < 0.4) reasons.push(['Coverage is early-stage: this path needs new learning, not just revision.', 'कवरेज शुरुआती है: इस पथ के लिए नई पढ़ाई चाहिए, केवल दोहराव नहीं।']);
    if (missing.length >= 4) reasons.push([`${missing.length} required skills are still below expectation — a longer runway than your top match.`, `${missing.length} आवश्यक कौशल अभी अपेक्षा से नीचे हैं — शीर्ष मैच से लंबा समय लगेगा।`]);
    if (cgpaNorm >= 0.8) reasons.push(['Your academics comfortably clear typical screening cut-offs.', 'आपकी अकादमिक योग्यता आमतौर पर स्क्रीनिंग कट-ऑफ़ पार कर लेती है।']);
    if (!reasons.length) reasons.push(['General overlap between your profile and this role’s requirements.', 'आपकी प्रोफ़ाइल और इस भूमिका की आवश्यकताओं में सामान्य समानता।']);

    return { career, match, coverage, reasons, missing, have, skillRows };
  });

  scored.sort((a, b) => b.match - a.match);
  return scored.slice(0, limit);
}

/* ------------------------------------------------------------------ *
 * Skill gap analysis
 * ------------------------------------------------------------------ */

export function getSkillGaps(career, skillMap = {}) {
  if (!career) return [];
  return career.skills
    .map((s) => {
      const skill = SKILL_BY_ID[s.id];
      if (!skill) return null;
      const current = level(skillMap, s.id);
      const required = requiredLevel(s.w);
      const gap = Math.max(0, required - current);
      const priority = gap * s.w;
      const courses = COURSES.filter((c) => c.skills.includes(s.id))
        .sort((a, b) => (a.free === b.free ? a.weeks - b.weeks : a.free ? -1 : 1))
        .slice(0, 3);
      const status = gap === 0 ? 'met' : gap <= 0.75 ? 'partial' : 'missing';
      return {
        id: s.id,
        skill,
        weight: s.w,
        current,
        required,
        gap,
        priority,
        status,
        category: skill.cat,
        hours: Math.round((skill.hrs || 20) * clamp(gap / 2, 0.35, 1)),
        courses,
        why: skill.why,
        difficulty: skill.diff,
        resources: skill.res,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority);
}

export function gapsByCategory(gaps = []) {
  const groups = { technical: [], soft: [], tools: [], industry: [] };
  gaps.forEach((g) => { (groups[g.category] = groups[g.category] || []).push(g); });
  return groups;
}

/* ------------------------------------------------------------------ *
 * Roadmap generation
 * ------------------------------------------------------------------ */

export const TASK_ID = (careerId, m, i) => `${careerId}-m${m}-t${i}`;

/**
 * Builds a 6-month roadmap from the selected career template, re-ordered so the
 * months that attack the student's biggest gaps come first, and preserving any
 * tasks already marked complete (matched by stable task id).
 */
export function generateRoadmap(career, skillMap = {}, previous = null) {
  if (!career) return { generatedAt: null, months: [], tasks: [] };
  const gaps = getSkillGaps(career, skillMap);
  const gapWeight = Object.fromEntries(gaps.map((g) => [g.id, g.priority]));
  const doneIds = new Set((previous?.tasks || []).filter((t) => t.done).map((t) => t.id));

  const months = career.roadmap.map((m, mi) => {
    const tasks = m.tasks.map((tk, ti) => {
      const id = TASK_ID(career.id, mi + 1, ti);
      const skills = tk[2] || [];
      return {
        id,
        title: [tk[0], tk[1]],
        skills,
        priority: sum(skills.map((s) => gapWeight[s] || 0.2)),
        done: doneIds.has(id),
        month: mi + 1,
      };
    });
    const monthGapPressure = sum(tasks.map((t) => t.priority));
    return {
      index: mi + 1,
      title: m.title,
      focus: m.focus,
      tasks,
      pressure: monthGapPressure,
      skills: [...new Set(m.tasks.flatMap((t) => t[2] || []))],
    };
  });

  // Months that attack bigger gaps first, keeping a sane learning order as tiebreaker.
  months.sort((a, b) => (b.pressure - a.pressure) * 0.6 + (a.index - b.index) * 0.4);
  months.forEach((m, i) => { m.order = i + 1; });

  return {
    generatedAt: previous?.generatedAt || new Date().toISOString(),
    careerId: career.id,
    months,
    tasks: months.flatMap((m) => m.tasks.map((t) => ({ ...t, order: m.order }))),
  };
}

export function roadmapProgress(roadmap) {
  const tasks = roadmap?.tasks || [];
  if (!tasks.length) return { done: 0, total: 0, pct: 0 };
  const done = tasks.filter((t) => t.done).length;
  return { done, total: tasks.length, pct: Math.round((done / tasks.length) * 100) };
}

/* ------------------------------------------------------------------ *
 * Next Best Action — the Career Command Center card
 * ------------------------------------------------------------------ */

export function getNextBestAction({ profile, progress, derived, gaps, matches, roadmap }) {
  const resume = derived.resume;
  const interview = derived.interview;
  const rp = roadmapProgress(roadmap);
  const openTasks = (roadmap?.tasks || []).filter((t) => !t.done).sort((a, b) => b.priority - a.priority);
  const topGap = gaps.find((g) => g.status !== 'met');
  const targetCareer = derived.career || matches?.[0]?.career;

  // 1. Profile is too thin for trustworthy recommendations
  if (derived.completion < 55) {
    return {
      id: 'complete-profile',
      priority: 'high',
      title: ['Complete your career profile', 'अपनी करियर प्रोफ़ाइल पूरी करें'],
      why: [
        `Only ${derived.completion}% of your profile is filled, so every recommendation is less accurate than it could be.`,
        `आपकी प्रोफ़ाइल केवल ${derived.completion}% भरी है, इसलिए हर सुझाव जितना हो सकता है उतना सटीक नहीं है।`,
      ],
      impact: ['Improves every recommendation in the app', 'ऐप के हर सुझाव को बेहतर बनाता है'],
      to: '/app/profile',
      cta: ['Open profile', 'प्रोफ़ाइल खोलें'],
    };
  }

  // 2. No target career chosen yet
  if (!profile.targetCareer) {
    const best = matches?.[0];
    return {
      id: 'choose-target',
      priority: 'high',
      title: ['Set your target career', 'अपना लक्षित करियर तय करें'],
      why: [
        best
          ? `Your strongest match is ${best.career.n[0]} at ${best.match}%. Selecting a target unlocks the roadmap, gap plan and matched opportunities.`
          : `Selecting a target unlocks the roadmap, gap plan and matched opportunities.`,
        best
          ? `आपका सबसे मज़बूत मैच ${best.career.n[1]} (${best.match}%) है। लक्ष्य चुनने से रोडमैप, गैप प्लान और मैच्ड अवसर खुल जाते हैं।`
          : `लक्ष्य चुनने से रोडमैप, गैप प्लान और मैच्ड अवसर खुल जाते हैं।`,
      ],
      impact: ['Unlocks roadmap + gap plan', 'रोडमैप और गैप प्लान खोलता है'],
      to: '/app/ai-career',
      cta: ['Open AI Career', 'AI करियर खोलें'],
    };
  }

  // 3. Highest-priority skill gap that has a course to fix it
  if (topGap && topGap.courses?.length) {
    const course = topGap.courses[0];
    return {
      id: `close-gap-${topGap.id}`,
      priority: topGap.weight >= 3 ? 'high' : 'medium',
      title: [`Close your ${topGap.skill.n[0]} gap`, `अपना ${topGap.skill.n[1]} गैप भरें`],
      why: [
        `Complete “${course.t[0]}”. ${topGap.skill.n[0]} carries weight ${topGap.weight} for ${targetCareer?.n?.[0] || 'your target role'} and you are at level ${Math.round((topGap.current / 4) * 100)}%. Closing it raises your readiness score directly.`,
        `“${course.t[1]}” पूरा करें। ${targetCareer?.n?.[1] || 'आपके लक्षित रोल'} के लिए ${topGap.skill.n[1]} का भार ${topGap.weight} है और आप ${Math.round((topGap.current / 4) * 100)}% स्तर पर हैं। इसे भरने से आपका रेडीनेस स्कोर सीधे बढ़ेगा।`,
      ],
      impact: [`+${Math.round(clamp(topGap.gap * topGap.weight * 2.2, 2, 9))} readiness points (demo estimate)`, `+${Math.round(clamp(topGap.gap * topGap.weight * 2.2, 2, 9))} रेडीनेस अंक (डेमो अनुमान)`],
      to: '/app/courses',
      cta: ['Open recommended course', 'सुझाया गया कोर्स खोलें'],
      course,
      gap: topGap,
    };
  }

  // 4. Roadmap task waiting
  if (openTasks.length) {
    const t = openTasks[0];
    return {
      id: `task-${t.id}`,
      priority: 'medium',
      title: [`Finish “${t.title[0]}” from your roadmap`, `रोडमैप से “${t.title[1]}” पूरा करें`],
      why: [
        `It is your highest-priority open task in Month ${t.month}. You have completed ${rp.done} of ${rp.total} tasks (${rp.pct}%).`,
        `यह महीना ${t.month} का आपका सबसे प्राथमिक खुला कार्य है। आपने ${rp.total} में से ${rp.done} कार्य पूरे किए (${rp.pct}%)।`,
      ],
      impact: ['Keeps your roadmap streak alive', 'आपका रोडमैप क्रम बनाए रखता है'],
      to: '/app/roadmap',
      cta: ['Open roadmap', 'रोडमैप खोलें'],
    };
  }

  // 5. Resume below standard
  if (resume.score < 70) {
    return {
      id: 'improve-resume',
      priority: resume.score < 45 ? 'high' : 'medium',
      title: ['Raise your resume readiness', 'अपनी रिज़्यूमे तैयारी बढ़ाएँ'],
      why: [
        `Your resume scores ${resume.score}/100 with ${resume.ats}% keyword coverage for ${targetCareer?.n?.[0] || 'your target role'}. ${resume.keywordMissing.length ? `Missing: ${resume.keywordMissing.slice(0, 4).map((k) => SKILL_BY_ID[k]?.n?.[0] || k).join(', ')}.` : 'Add measurable bullets to push it higher.'}`,
        `आपका रिज़्यूमे ${resume.score}/100 है और ${targetCareer?.n?.[1] || 'लक्षित रोल'} के लिए ${resume.ats}% कीवर्ड कवरेज है। ${resume.keywordMissing.length ? `छूटे: ${resume.keywordMissing.slice(0, 4).map((k) => SKILL_BY_ID[k]?.n?.[1] || k).join(', ')}।` : 'मापने योग्य बुलेट जोड़ें।'}`,
      ],
      impact: ['Directly affects screening shortlists', 'सीधे स्क्रीनिंग शॉर्टलिस्ट को प्रभावित करता है'],
      to: '/app/resume',
      cta: ['Open resume builder', 'रिज़्यूमे बिल्डर खोलें'],
    };
  }

  // 6. No interview practice yet, or a low score
  if (!interview.attempts || interview.best < 70) {
    return {
      id: 'mock-interview',
      priority: 'medium',
      title: [interview.attempts ? 'Improve your interview score' : 'Attempt your first mock interview', interview.attempts ? 'अपना इंटरव्यू स्कोर सुधारें' : 'पहला मॉक इंटरव्यू दें'],
      why: [
        interview.attempts
          ? `Your best attempt is ${interview.best}/100 across ${interview.attempts} sessions. Weakest dimension: ${weakestDim(interview)}.`
          : 'You have no interview practice recorded yet. Interview readiness is 12% of your overall score and the fastest to move.',
        interview.attempts
          ? `आपका सर्वोत्तम प्रयास ${interview.attempts} सत्रों में ${interview.best}/100 है। सबसे कमज़ोर पक्ष: ${weakestDim(interview, 1)}।`
          : 'आपका कोई इंटरव्यू अभ्यास दर्ज नहीं है। इंटरव्यू तैयारी आपके कुल स्कोर का 12% है और सबसे तेज़ी से बदलती है।',
      ],
      impact: ['Raises interview readiness instantly', 'इंटरव्यू तैयारी तुरंत बढ़ाता है'],
      to: '/app/interview',
      cta: ['Start mock interview', 'मॉक इंटरव्यू शुरू करें'],
    };
  }

  // 7. No projects
  const projectCount = (profile.projects || []).length + Object.keys(progress.projects || {}).length;
  if (projectCount < 2) {
    return {
      id: 'build-project',
      priority: 'medium',
      title: ['Build your next portfolio project', 'अपना अगला पोर्टफोलियो प्रोजेक्ट बनाएँ'],
      why: [
        `Only ${projectCount} project(s) on record. Projects are 15% of readiness and the most-asked interview topic for freshers.`,
        `केवल ${projectCount} प्रोजेक्ट दर्ज हैं। प्रोजेक्ट रेडीनेस का 15% हैं और फ्रेशर इंटरव्यू का सबसे चर्चित विषय।`,
      ],
      impact: ['Strongest evidence you can create this month', 'इस महीने आपका सबसे मज़बूत प्रमाण'],
      to: '/app/project-lab',
      cta: ['Open Project Lab', 'प्रोजेक्ट लैब खोलें'],
    };
  }

  // 8. Everything decent → apply
  return {
    id: 'apply-opportunities',
    priority: 'low',
    title: ['Convert readiness into applications', 'तैयारी को आवेदनों में बदलें'],
    why: [
      `Your core components are in place (${derived.readiness.score}/100 readiness). The remaining gain now comes from volume: apply to matched internships and jobs weekly.`,
      `आपके मुख्य घटक तैयार हैं (${derived.readiness.score}/100 रेडीनेस)। अब बढ़त आवेदन की मात्रा से आएगी: हर सप्ताह मैच्ड इंटर्नशिप और नौकरियों पर आवेदन करें।`,
    ],
    impact: ['Applications are the only step that produces offers', 'आवेदन ही एकमात्र चरण है जिससे ऑफ़र आते हैं'],
    to: '/app/jobs',
    cta: ['See matched opportunities', 'मैच्ड अवसर देखें'],
  };
}

function weakestDim(interview, idx = 0) {
  const dims = interview.dims || {};
  const entries = Object.entries(dims);
  if (!entries.length) return idx ? '—' : '—';
  entries.sort((a, b) => a[1] - b[1]);
  const LABELS = {
    communication: ['Communication', 'संचार'],
    technical: ['Technical Knowledge', 'तकनीकी ज्ञान'],
    confidence: ['Confidence', 'आत्मविश्वास'],
    relevance: ['Relevance', 'प्रासंगिकता'],
    structure: ['Structure', 'संरचना'],
  };
  return LABELS[entries[0][0]]?.[idx] || entries[0][0];
}

/* ------------------------------------------------------------------ *
 * Course recommendation ranking
 * ------------------------------------------------------------------ */

export function rankCourses(career, gaps = [], skillMap = {}, progress = {}) {
  const saved = new Set((progress.savedCourses || []).map((c) => c.id || c));
  const gapMap = Object.fromEntries(gaps.map((g) => [g.id, g]));
  const areaIds = career ? [career.id] : [];

  return COURSES.map((course) => {
    const covered = course.skills.filter((s) => gapMap[s] && gapMap[s].gap > 0.5);
    const gapImpact = sum(covered.map((s) => gapMap[s].priority));
    const careerFit = course.careers?.some((c) => areaIds.includes(c)) ? 1 : 0;
    const alreadyKnown = course.skills.every((s) => level(skillMap, s) >= 3.5) ? 0.4 : 1;
    const score = clamp(Math.round((gapImpact * 6 + careerFit * 22 + (course.free ? 6 : 0) + (course.cert ? 5 : 0)) * alreadyKnown), 1, 99);
    return { course, score, covered, careerFit, saved: saved.has(course.id), alreadyKnown: alreadyKnown < 1 };
  })
    .sort((a, b) => b.score - a.score);
}

/* ------------------------------------------------------------------ *
 * Opportunity matching (jobs / internships / government)
 * ------------------------------------------------------------------ */

export function matchOpportunity(opp, { skillMap = {}, profile = {}, derived }) {
  const required = opp.skills || [];
  const have = required.filter((s) => level(skillMap, s) >= 2);
  const strong = required.filter((s) => level(skillMap, s) >= 3);
  const missing = required.filter((s) => level(skillMap, s) < 2);

  const skillScore = required.length ? have.length / required.length : 0.5;
  const strengthScore = required.length ? strong.length / required.length : 0.4;

  const locPref = String(profile.locationPref || '').toLowerCase();
  const locText = `${opp.loc?.[0] || ''} ${opp.loc?.[1] || ''}`.toLowerCase();
  const locMatch = !locPref || locPref.includes('any') || locPref.includes('कोई') || locText.includes(locPref.split(',')[0].trim())
    || (profile.workType === 'remote' && opp.mode === 'remote') ? 1 : 0.45;

  const modeMatch = !profile.workType || profile.workType === 'any' || profile.workType === opp.mode ? 1 : 0.6;

  const expYears = (profile.experience || []).length;
  const expOk = (opp.exp || 0) === 0 || expYears > 0 ? 1 : 0.7;

  const careerText = `${profile.targetCareer || ''} ${profile.goal || ''}`.toLowerCase();
  const careerFit = CAREER_KEYWORDS[profile.targetCareer]?.some((k) => `${opp.t?.[0] || ''} ${opp.sector?.[0] || ''}`.toLowerCase().includes(k.split(' ')[0])) ? 1 : 0.75;
  void careerText;

  const readinessFactor = clamp((derived?.readiness?.score ?? 50) / 100, 0.35, 1);

  const raw = skillScore * 0.45 + strengthScore * 0.2 + locMatch * 0.12 + modeMatch * 0.08 + expOk * 0.05 + careerFit * 0.1;
  const match = Math.round(clamp(raw * 100 * (0.82 + readinessFactor * 0.18), 5, 99));

  const reasons = [];
  if (strong.length) reasons.push([`You are already strong in ${strong.slice(0, 3).map((s) => SKILL_BY_ID[s]?.n?.[0] || s).join(', ')}.`, `आप ${strong.slice(0, 3).map((s) => SKILL_BY_ID[s]?.n?.[1] || s).join(', ')} में पहले से मज़बूत हैं।`]);
  if (missing.length) reasons.push([`Still to build: ${missing.slice(0, 3).map((s) => SKILL_BY_ID[s]?.n?.[0] || s).join(', ')}.`, `अभी बनाना है: ${missing.slice(0, 3).map((s) => SKILL_BY_ID[s]?.n?.[1] || s).join(', ')}।`]);
  if (locMatch === 1) reasons.push([`Matches your location preference (${opp.loc?.[0]}).`, `आपकी स्थान प्राथमिकता से मेल (${opp.loc?.[1]})।`]);
  if (modeMatch === 1 && profile.workType) reasons.push([`Work mode matches: ${opp.mode}.`, `कार्य मोड मेल खाता है: ${opp.mode}।`]);
  if ((opp.exp || 0) === 0) reasons.push(['Open to freshers.', 'फ्रेशर के लिए खुला।']);
  if (!reasons.length) reasons.push(['Partial overlap with your current skill set.', 'आपके वर्तमान कौशल से आंशिक समानता।']);

  return { ...opp, match, have, missing, strong, reasons, haveCount: have.length, requiredCount: required.length };
}

export function matchGovernment(gov, { skillMap = {}, profile = {} }) {
  const required = gov.skills || [];
  const have = required.filter((s) => level(skillMap, s) >= 2);
  const branch = profile.education?.branch || '';
  const degree = profile.education?.degree || '';
  const fitList = gov.fit || [];
  const eduFit = fitList.some((f) => branch.toLowerCase().includes(f.toLowerCase()) || degree.toLowerCase().includes(f.toLowerCase()) || f === 'All branches') ? 1 : 0.5;
  const skillScore = required.length ? have.length / required.length : 0.6;
  const goalHit = /government|सरकार|exam|परीक्षा|psu/i.test(profile.goal || '') ? 1 : 0.7;
  const match = Math.round(clamp((skillScore * 0.4 + eduFit * 0.4 + goalHit * 0.2) * 100, 8, 99));
  return { ...gov, match, have, missing: required.filter((s) => !have.includes(s)), eduFit };
}

/* ------------------------------------------------------------------ *
 * Project recommendation
 * ------------------------------------------------------------------ */

export function recommendProjects(career, gaps = [], skillMap = {}, progress = {}) {
  const statuses = progress.projects || {};
  const careerId = career?.id;
  return PROJECTS.map((p) => {
    const careerFit = careerId ? (p.careers.includes(careerId) ? 1 : 0.25) : 0.6;
    const gapOverlap = p.skills.filter((s) => gaps.some((g) => g.id === s && g.gap > 0.5)).length;
    const ready = p.skills.filter((s) => level(skillMap, s) >= 2).length / Math.max(p.skills.length, 1);
    const score = Math.round(clamp(careerFit * 55 + gapOverlap * 12 + ready * 30, 5, 99));
    return { project: p, score, gapOverlap, ready: Math.round(ready * 100), status: statuses[p.id] || null };
  }).sort((a, b) => b.score - a.score);
}

/* ------------------------------------------------------------------ *
 * Career Simulator
 * ------------------------------------------------------------------ */

export function simulateCareer(career, skillMap = {}, profile = {}) {
  const gaps = getSkillGaps(career, skillMap);
  const open = gaps.filter((g) => g.status !== 'met');
  const hours = sum(open.map((g) => g.hours));
  const difficultyIndex = clamp(
    (career.difficulty * 18) + (open.length * 4) + (sum(open.map((g) => g.skill?.diff || 2)) / Math.max(open.length, 1)) * 6,
    5, 100
  );
  const projects = PROJECTS.filter((p) => p.careers.includes(career.id)).slice(0, 4);
  return {
    career,
    gaps,
    openGaps: open,
    hoursToReady: Math.round(hours),
    monthsToReady: Math.max(1, Math.round(hours / 55)),
    difficultyIndex: Math.round(difficultyIndex),
    difficultyLabel: career.difficulty === 1 ? ['Easy', 'आसान'] : career.difficulty === 2 ? ['Moderate', 'मध्यम'] : ['Demanding', 'कठिन'],
    projects,
    roadmap: career.roadmap.map((m) => ({ title: m.title, focus: m.focus })),
    interviewFocus: career.interviewFocus,
    oppCategories: career.oppCategories,
    strengthsNow: gaps.filter((g) => g.status === 'met').slice(0, 6),
    fitNow: Math.round(careerCoverage(career, skillMap) * 100),
  };
}

/* ------------------------------------------------------------------ *
 * 30 · 60 · 90 Day Challenge
 * ------------------------------------------------------------------ */

export function generateChallenge({ career, gaps, profile, roadmap }) {
  const topGaps = gaps.filter((g) => g.status !== 'met').slice(0, 6);
  const rnd = seeded(hashString(`${profile.personal?.email || 'student'}:${career?.id || 'x'}`));
  const g = (i) => topGaps[i % Math.max(topGaps.length, 1)];

  const phase30 = [
    { id: 'c30-1', w: 1, title: [`Daily 45-minute ${g(0)?.skill?.n?.[0] || 'core skill'} practice`, `रोज़ 45 मिनट ${g(0)?.skill?.n?.[1] || 'मुख्य कौशल'} अभ्यास`], skills: g(0) ? [g(0).id] : [] },
    { id: 'c30-2', w: 1, title: ['Finish one beginner course from your recommendations', 'अपने सुझावों में से एक शुरुआती कोर्स पूरा करें'], skills: g(0)?.courses?.[0]?.skills || [] },
    { id: 'c30-3', w: 2, title: [`Learn ${g(1)?.skill?.n?.[0] || 'the next required skill'} basics`, `${g(1)?.skill?.n?.[1] || 'अगला आवश्यक कौशल'} की बुनियाद सीखें`], skills: g(1) ? [g(1).id] : [] },
    { id: 'c30-4', w: 2, title: ['Solve 10 practice problems and note your approach', '10 अभ्यास प्रश्न हल करें और अपना तरीका लिखें'], skills: ['problem-solving'] },
    { id: 'c30-5', w: 3, title: ['Write a one-page summary of what you learned this fortnight', 'इस पखवाड़े की सीख का एक पेज सारांश लिखें'], skills: ['documentation'] },
    { id: 'c30-6', w: 4, title: ['Complete your profile and set your target career', 'अपनी प्रोफ़ाइल पूरी करें और लक्षित करियर तय करें'], skills: [] },
    { id: 'c30-7', w: 4, title: [`Start ${g(2)?.skill?.n?.[0] || 'a third skill'} alongside revision`, `${g(2)?.skill?.n?.[1] || 'तीसरा कौशल'} दोहराव के साथ शुरू करें`], skills: g(2) ? [g(2).id] : [] },
  ];

  const phase60 = [
    { id: 'c60-1', w: 5, title: ['Pick one recommended project and write its problem statement', 'एक सुझाया गया प्रोजेक्ट चुनें और उसका समस्या कथन लिखें'], skills: ['problem-solving', 'documentation'] },
    { id: 'c60-2', w: 5, title: ['Build the first working version of that project', 'उस प्रोजेक्ट का पहला कार्यशील संस्करण बनाएँ'], skills: g(0) ? [g(0).id] : [] },
    { id: 'c60-3', w: 6, title: ['Complete one certification and add it to your profile', 'एक प्रमाणपत्र पूरा करें और प्रोफ़ाइल में जोड़ें'], skills: [] },
    { id: 'c60-4', w: 6, title: ['Publish the project on GitHub with a proper README', 'प्रोजेक्ट को उचित README के साथ GitHub पर पब्लिश करें'], skills: ['git', 'documentation'] },
    { id: 'c60-5', w: 7, title: ['Attempt your first mock interview in CareerX', 'CareerX में पहला मॉक इंटरव्यू दें'], skills: ['communication'] },
    { id: 'c60-6', w: 8, title: ['Start a second project or add a major feature', 'दूसरा प्रोजेक्ट शुरू करें या बड़ा फ़ीचर जोड़ें'], skills: ['creativity'] },
  ];

  const phase90 = [
    { id: 'c90-1', w: 9, title: ['Build your resume in the AI Resume Builder to 75+', 'AI रिज़्यूमे बिल्डर में रिज़्यूमे 75+ तक बनाएँ'], skills: ['communication'] },
    { id: 'c90-2', w: 9, title: ['Complete your LinkedIn profile and pin two projects', 'अपनी लिंक्डइन प्रोफ़ाइल पूरी करें और दो प्रोजेक्ट पिन करें'], skills: ['communication'] },
    { id: 'c90-3', w: 10, title: ['Attempt two more mock interviews, one behavioural', 'दो और मॉक इंटरव्यू दें, एक व्यवहारिक'], skills: ['communication', 'presentation'] },
    { id: 'c90-4', w: 11, title: ['Apply to 10 matched opportunities across jobs and internships', 'मैच्ड नौकरियों और इंटर्नशिप में 10 अवसरों पर आवेदन करें'], skills: [] },
    { id: 'c90-5', w: 12, title: ['Track and apply to 2 relevant government opportunities', '2 प्रासंगिक सरकारी अवसर ट्रैक करें और आवेदन करें'], skills: ['time-management'] },
    { id: 'c90-6', w: 12, title: ['Review your Skill DNA and set the next 90-day goal', 'अपना स्किल DNA देखें और अगला 90-दिन का लक्ष्य तय करें'], skills: ['adaptability'] },
  ];

  const phases = [
    { id: 'p30', days: 30, title: ['First 30 Days', 'पहले 30 दिन'], theme: ['Build fundamentals', 'नींव मज़बूत करें'], tasks: phase30 },
    { id: 'p60', days: 60, title: ['By Day 60', '60 दिन तक'], theme: ['Projects & certifications', 'प्रोजेक्ट और प्रमाणपत्र'], tasks: phase60 },
    { id: 'p90', days: 90, title: ['By Day 90', '90 दिन तक'], theme: ['Resume, interviews & applications', 'रिज़्यूमे, इंटरव्यू और आवेदन'], tasks: phase90 },
  ];
  void rnd;
  return { generatedAt: new Date().toISOString(), careerId: career?.id || null, phases, roadmapLink: !!roadmap };
}

export function challengeProgress(challenge) {
  const all = (challenge?.phases || []).flatMap((p) => p.tasks);
  return { total: all.length };
}

/* ------------------------------------------------------------------ *
 * Notifications (generated from the same engine, so they stay honest)
 * ------------------------------------------------------------------ */

export function buildInitialNotifications({ derived, gaps, matches, roadmap }) {
  const now = Date.now();
  const list = [];
  const topGap = gaps.find((g) => g.status !== 'met');
  if (topGap) {
    list.push({
      id: 'n-gap',
      type: 'gap',
      at: new Date(now - 1000 * 60 * 42).toISOString(),
      title: ['Skill gap alert', 'स्किल गैप अलर्ट'],
      body: [
        `${topGap.skill.n[0]} is your highest-priority gap for ${derived.career?.n?.[0] || 'your target career'} — currently ${Math.round((topGap.current / 4) * 100)}%.`,
        `${derived.career?.n?.[1] || 'आपके लक्षित करियर'} के लिए ${topGap.skill.n[1]} आपका सबसे प्राथमिक गैप है — वर्तमान में ${Math.round((topGap.current / 4) * 100)}%।`,
      ],
      link: '/app/skill-gap',
      read: false,
    });
  }
  const best = matches?.[0];
  if (best) {
    list.push({
      id: 'n-career',
      type: 'course',
      at: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
      title: ['New recommended course', 'नया सुझाया गया कोर्स'],
      body: [
        `“${best.course ? '' : ''}${(best.career.roadmap?.[0]?.title?.[0]) || 'Your first roadmap module'}” is the fastest way to move your ${best.career.n[0]} match above ${Math.min(99, best.match + 5)}%.`,
        `“${(best.career.roadmap?.[0]?.title?.[1]) || 'आपका पहला रोडमैप मॉड्यूल'}” आपका ${best.career.n[1]} मैच ${Math.min(99, best.match + 5)}% से ऊपर ले जाने का सबसे तेज़ तरीका है।`,
      ],
      link: '/app/courses',
      read: false,
    });
  }
  list.push({
    id: 'n-roadmap',
    type: 'roadmap',
    at: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
    title: ['Roadmap task', 'रोडमैप कार्य'],
    body: [
      `Your roadmap has ${roadmapProgress(roadmap).total - roadmapProgress(roadmap).done} open tasks this month. Finishing two moves your readiness score visibly.`,
      `इस महीने आपके रोडमैप में ${roadmapProgress(roadmap).total - roadmapProgress(roadmap).done} खुले कार्य हैं। दो पूरा करने से आपका रेडीनेस स्कोर स्पष्ट रूप से बढ़ेगा।`,
    ],
    link: '/app/roadmap',
    read: false,
  });
  if ((derived.interview?.attempts || 0) === 0) {
    list.push({
      id: 'n-interview',
      type: 'interview',
      at: new Date(now - 1000 * 60 * 60 * 50).toISOString(),
      title: ['Mock interview reminder', 'मॉक इंटरव्यू रिमाइंडर'],
      body: [
        'You have not attempted a mock interview yet. A 10-minute attempt is the fastest way to raise interview readiness.',
        'आपने अभी तक मॉक इंटरव्यू नहीं दिया। 10 मिनट का प्रयास इंटरव्यू तैयारी बढ़ाने का सबसे तेज़ तरीका है।',
      ],
      link: '/app/interview',
      read: false,
    });
  }
  if (derived.resume.score < 70) {
    list.push({
      id: 'n-resume',
      type: 'resume',
      at: new Date(now - 1000 * 60 * 60 * 74).toISOString(),
      title: ['Resume improvement', 'रिज़्यूमे सुधार'],
      body: [
        `Your resume readiness is ${derived.resume.score}/100. ${derived.resume.keywordMissing.length ? `Add these keywords: ${derived.resume.keywordMissing.slice(0, 3).map((k) => SKILL_BY_ID[k]?.n?.[0] || k).join(', ')}.` : 'Add measurable bullets to improve it.'}`,
        `आपकी रिज़्यूमे तैयारी ${derived.resume.score}/100 है। ${derived.resume.keywordMissing.length ? `ये कीवर्ड जोड़ें: ${derived.resume.keywordMissing.slice(0, 3).map((k) => SKILL_BY_ID[k]?.n?.[1] || k).join(', ')}।` : 'मापने योग्य बुलेट जोड़कर सुधारें।'}`,
      ],
      link: '/app/resume',
      read: false,
    });
  }
  return list;
}

export const SKILL_COUNT = SKILLS.length;
export default getCareerMatches;
