import { buildCohort } from '../data/adminCohort';
import { SKILL_BY_ID } from '../data/catalog';
import { CAREER_BY_ID } from '../data/careers';
import { COURSE_BY_ID } from '../data/courses';
import { avg, clamp, groupBy } from '../lib/utils';

/**
 * adminService — institutional analytics.
 *
 * All numbers are computed FROM the demo cohort (src/data/adminCohort.js). Nothing is
 * hard-coded decoration: change the cohort and every chart, table and insight changes.
 *
 * INTEGRATION POINT: replace `getCohort()` with an API call returning the same shape
 * ({ students, activities, trend }). Add row-level access control server-side — an
 * institution admin must only ever see students belonging to their institution.
 */

let cache = null;

export function getCohort(force = false) {
  if (!cache || force) cache = buildCohort();
  return cache;
}

export function getStats(cohort = getCohort()) {
  const students = cohort.students;
  const total = students.length;
  const active = students.filter((s) => s.lastActiveDays <= 30).length;
  const weekly = students.filter((s) => s.lastActiveDays <= 7).length;
  const avgReadiness = Math.round(avg(students.map((s) => s.readiness)));
  const avgEmployability = Math.round(avg(students.map((s) => s.employability)));
  const avgResume = Math.round(avg(students.map((s) => s.resumeScore)));
  const avgCompletion = Math.round(avg(students.map((s) => s.completion)));
  const interviewed = students.filter((s) => s.interviews > 0).length;
  const interviewSessions = students.reduce((a, s) => a + s.interviews, 0);
  const applications = students.reduce((a, s) => a + s.applications, 0);
  const projects = students.reduce((a, s) => a + s.projects, 0);

  // Skill gap frequency
  const gapCounts = {};
  students.forEach((s) => s.skillGaps.forEach((g) => { gapCounts[g] = (gapCounts[g] || 0) + 1; }));
  const topGaps = Object.entries(gapCounts)
    .map(([id, n]) => ({ id, n, pct: Math.round((n / total) * 100), skill: SKILL_BY_ID[id] }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 8);

  // Career path distribution
  const careerCounts = {};
  students.forEach((s) => { careerCounts[s.targetCareer] = (careerCounts[s.targetCareer] || 0) + 1; });
  const careerPaths = Object.entries(careerCounts)
    .map(([id, n]) => ({ id, n, pct: Math.round((n / total) * 100), career: CAREER_BY_ID[id] }))
    .sort((a, b) => b.n - a.n);

  // Popular courses (from cohort saves)
  const courseCounts = {};
  students.forEach((s) => (s.courses || []).forEach((c) => { courseCounts[c] = (courseCounts[c] || 0) + 1; }));
  const popularCourses = Object.entries(courseCounts)
    .map(([id, n]) => ({ id, n, course: COURSE_BY_ID[id] }))
    .filter((x) => x.course)
    .sort((a, b) => b.n - a.n)
    .slice(0, 6);

  // Branch mix
  const branchGroups = groupBy(students, (s) => s.branch);
  const branchMix = Object.entries(branchGroups)
    .map(([branch, list]) => ({ branch, n: list.length, readiness: Math.round(avg(list.map((s) => s.readiness))) }))
    .sort((a, b) => b.n - a.n);

  // Readiness distribution buckets
  const buckets = [
    { id: '0-39', n: ['0–39', '0–39'], range: [0, 39] },
    { id: '40-59', n: ['40–59', '40–59'], range: [40, 59] },
    { id: '60-74', n: ['60–74', '60–74'], range: [60, 74] },
    { id: '75-89', n: ['75–89', '75–89'], range: [75, 89] },
    { id: '90-100', n: ['90+', '90+'], range: [90, 100] },
  ].map((b) => ({ ...b, n_students: students.filter((s) => s.readiness >= b.range[0] && s.readiness <= b.range[1]).length }));

  const internshipInterest = Math.round((students.filter((s) => s.applications > 0).length / total) * 100);
  const resumeReady = students.filter((s) => s.resumeScore >= 75).length;
  const interviewParticipation = Math.round((interviewed / total) * 100);

  return {
    total, active, weekly, avgReadiness, avgEmployability, avgResume, avgCompletion,
    interviewed, interviewSessions, applications, projects,
    topGaps, careerPaths, popularCourses, branchMix, buckets,
    internshipInterest, resumeReady, interviewParticipation,
    trend: cohort.trend,
  };
}

/**
 * AI Institutional Insights — generated from the cohort statistics.
 * Each insight carries the evidence it was computed from, so an administrator can
 * challenge it. Clearly labelled demo output, never a fabricated claim.
 */
export function getInsights(cohort = getCohort()) {
  const s = getStats(cohort);
  const insights = [];
  const top2 = s.topGaps.slice(0, 2);
  if (top2.length === 2) {
    insights.push({
      id: 'gaps',
      severity: 'high',
      icon: 'AlertTriangle',
      title: ['Common skill gaps cluster in two skills', 'आम स्किल गैप दो कौशलों में केंद्रित हैं'],
      text: [
        `${top2[0].skill?.n?.[0] || top2[0].id} (${top2[0].pct}% of students) and ${top2[1].skill?.n?.[0] || top2[1].id} (${top2[1].pct}%) are the most frequent gaps in this cohort. A single focused workshop series would lift readiness across most branches.`,
        `${top2[0].skill?.n?.[1] || top2[0].id} (${top2[0].pct}% छात्र) और ${top2[1].skill?.n?.[1] || top2[1].id} (${top2[1].pct}%) इस कोहोर्ट के सबसे आम गैप हैं। एक केंद्रित कार्यशाला श्रृंखला ज्यादातर ब्रांच की तैयारी बढ़ा सकती है।`,
      ],
      evidence: ['topGaps[0..1]', `${top2[0].n}/${s.total}, ${top2[1].n}/${s.total}`],
      action: { to: '/admin/skill-insights', label: ['Open skill insights', 'स्किल इनसाइट्स खोलें'] },
    });
  }
  const topCareer = s.careerPaths[0];
  if (topCareer) {
    insights.push({
      id: 'interest',
      severity: 'info',
      icon: 'Compass',
      title: ['Cohort interest is concentrated', 'कोहोर्ट की रुचि केंद्रित है'],
      text: [
        `${topCareer.pct}% of students selected ${topCareer.career?.n?.[0] || topCareer.id} as their target path${s.careerPaths[1] ? `, followed by ${s.careerPaths[1].career?.n?.[0] || s.careerPaths[1].id} (${s.careerPaths[1].pct}%)` : ''}. Concentration makes cohort training efficient but raises placement-competition risk.`,
        `${topCareer.pct}% छात्रों ने ${topCareer.career?.n?.[1] || topCareer.id} को लक्षित पथ चुना${s.careerPaths[1] ? `, उसके बाद ${s.careerPaths[1].career?.n?.[1] || s.careerPaths[1].id} (${s.careerPaths[1].pct}%)` : ''}। एकाग्रता प्रशिक्षण को आसान बनाती है पर प्लेसमेंट प्रतिस्पर्धा बढ़ाती है।`,
      ],
      evidence: ['careerPaths[0].pct', `${topCareer.n}/${s.total}`],
      action: { to: '/admin/analytics', label: ['Open analytics', 'एनालिटिक्स खोलें'] },
    });
  }
  const funnelGap = s.avgCompletion - s.interviewParticipation;
  insights.push({
    id: 'funnel',
    severity: funnelGap > 20 ? 'high' : 'medium',
    icon: 'TrendingDown',
    title: ['Interview practice lags profile completion', 'इंटरव्यू अभ्यास प्रोफ़ाइल पूर्णता से पीछे'],
    text: [
      `Average profile completion is ${s.avgCompletion}% while mock-interview participation is ${s.interviewParticipation}% — a ${Math.max(0, funnelGap)}-point gap. Students are preparing on paper but not practising out loud, which is where most rejections happen.`,
      `औसत प्रोफ़ाइल पूर्णता ${s.avgCompletion}% है जबकि मॉक-इंटरव्यू भागीदारी ${s.interviewParticipation}% — ${Math.max(0, funnelGap)} अंक का अंतर। छात्र कागज़ पर तैयारी कर रहे हैं पर बोलकर अभ्यास नहीं, जबकि अस्वीकृति वहीं होती है।`,
    ],
    evidence: ['avgCompletion', 'interviewParticipation'],
    action: { to: '/admin/activities', label: ['Review activity log', 'गतिविधि लॉग देखें'] },
  });
  const resumePct = Math.round((s.resumeReady / s.total) * 100);
  insights.push({
    id: 'resume',
    severity: resumePct < 50 ? 'medium' : 'info',
    icon: 'FileText',
    title: [`${resumePct}% of resumes are screening-ready`, `${resumePct}% रिज़्यूमे स्क्रीनिंग के लिए तैयार`],
    text: [
      `${s.resumeReady} of ${s.total} students have a resume scoring 75+ in the AI Resume Builder; average score is ${s.avgResume}. ${resumePct < 50 ? 'A resume clinic would move the largest number of students into application-ready state.' : 'Coverage is healthy — target the remaining students individually.'}`,
      `${s.total} में से ${s.resumeReady} छात्रों का रिज़्यूमे AI रिज़्यूमे बिल्डर में 75+ स्कोर करता है; औसत स्कोर ${s.avgResume} है। ${resumePct < 50 ? 'रिज़्यूमे क्लिनिक सबसे अधिक छात्रों को आवेदन-तैयार करेगा।' : 'कवरेज अच्छा है — शेष छात्रों पर व्यक्तिगत ध्यान दें।'}`,
    ],
    evidence: ['resumeReady', 'avgResume'],
    action: { to: '/admin/analytics', label: ['Open analytics', 'एनालिटिक्स खोलें'] },
  });
  const lowestBranch = [...s.branchMix].sort((a, b) => a.readiness - b.readiness)[0];
  if (lowestBranch && lowestBranch.n >= 3) {
    insights.push({
      id: 'branch',
      severity: 'medium',
      icon: 'Users',
      title: ['One branch trails the cohort', 'एक ब्रांच कोहोर्ट से पीछे'],
      text: [
        `${lowestBranch.branch} averages ${lowestBranch.readiness} readiness against a cohort average of ${s.avgReadiness} (${lowestBranch.n} students). This is a support signal, not a judgement — check whether guidance sessions reached this branch.`,
        `${lowestBranch.branch} की औसत तैयारी ${lowestBranch.readiness} है जबकि कोहोर्ट औसत ${s.avgReadiness} है (${lowestBranch.n} छात्र)। यह समर्थन संकेत है, निर्णय नहीं — जाँचें कि मार्गदर्शन सत्र इस ब्रांच तक पहुँचे या नहीं।`,
      ],
      evidence: ['branchMix[min]', `${lowestBranch.branch}:${lowestBranch.readiness}`],
      action: { to: '/admin/users', label: ['Filter students', 'छात्र फ़िल्टर करें'] },
    });
  }
  const trend = s.trend || [];
  if (trend.length >= 2) {
    const delta = trend[trend.length - 1].readiness - trend[0].readiness;
    insights.push({
      id: 'trend',
      severity: delta >= 0 ? 'info' : 'high',
      icon: delta >= 0 ? 'TrendingUp' : 'TrendingDown',
      title: [delta >= 0 ? 'Readiness is improving' : 'Readiness is slipping', delta >= 0 ? 'तैयारी सुधर रही है' : 'तैयारी घट रही है'],
      text: [
        `Cohort readiness moved ${delta >= 0 ? '+' : ''}${delta} points over the last ${trend.length} recorded checkpoints (${trend[0].readiness} → ${trend[trend.length - 1].readiness}).`,
        `पिछले ${trend.length} दर्ज चेकपॉइंट में कोहोर्ट तैयारी ${delta >= 0 ? '+' : ''}${delta} अंक बदली (${trend[0].readiness} → ${trend[trend.length - 1].readiness})।`,
      ],
      evidence: ['trend[0].readiness', 'trend[last].readiness'],
      action: { to: '/admin/analytics', label: ['Open analytics', 'एनालिटिक्स खोलें'] },
    });
  }
  insights.push({
    id: 'engagement',
    severity: s.weekly / s.total < 0.35 ? 'high' : 'info',
    icon: 'Activity',
    title: [`${Math.round((s.weekly / s.total) * 100)}% active this week`, `इस सप्ताह ${Math.round((s.weekly / s.total) * 100)}% सक्रिय`],
    text: [
      `${s.weekly} of ${s.total} students used CareerX in the last 7 days. ${s.weekly / s.total < 0.35 ? 'Low weekly engagement usually precedes low placement outcomes — nudge inactive students through the notification centre.' : 'Engagement is healthy; keep the weekly nudge cadence.'}`,
      `${s.total} में से ${s.weekly} छात्रों ने पिछले 7 दिनों में CareerX उपयोग किया। ${s.weekly / s.total < 0.35 ? 'कम साप्ताहिक सक्रियता प्रायः कम प्लेसमेंट से पहले आती है — निष्क्रिय छात्रों को सूचना केंद्र से याद दिलाएँ।' : 'सक्रियता अच्छी है; साप्ताहिक रिमाइंडर जारी रखें।'}`,
    ],
    evidence: ['weekly', 'total'],
    action: { to: '/admin/users', label: ['View students', 'छात्र देखें'] },
  });
  return insights;
}

export function searchStudents(cohort = getCohort(), { q = '', branch = 'all', career = 'all', readiness = 'all', activity = 'all' } = {}) {
  const term = String(q || '').trim().toLowerCase();
  return cohort.students.filter((s) => {
    if (term && !`${s.name} ${s.email} ${s.branch} ${s.city} ${CAREER_BY_ID[s.targetCareer]?.n?.[0] || ''}`.toLowerCase().includes(term)) return false;
    if (branch !== 'all' && s.branch !== branch) return false;
    if (career !== 'all' && s.targetCareer !== career) return false;
    if (readiness === 'low' && s.readiness >= 50) return false;
    if (readiness === 'mid' && (s.readiness < 50 || s.readiness >= 75)) return false;
    if (readiness === 'high' && s.readiness < 75) return false;
    if (activity === 'active' && s.lastActiveDays > 7) return false;
    if (activity === 'inactive' && s.lastActiveDays <= 14) return false;
    return true;
  });
}

export function filterActivities(cohort = getCohort(), { q = '', category = 'all', status = 'all' } = {}) {
  const term = String(q || '').trim().toLowerCase();
  return cohort.activities.filter((a) => {
    if (term && !`${a.userName} ${a.activity[0]} ${a.activity[1]} ${a.category}`.toLowerCase().includes(term)) return false;
    if (category !== 'all' && a.category !== category) return false;
    if (status !== 'all' && a.status !== status) return false;
    return true;
  });
}

export function activityFacets(cohort = getCohort()) {
  const categories = [...new Set(cohort.activities.map((a) => a.category))];
  const statuses = [...new Set(cohort.activities.map((a) => a.status))];
  return { categories, statuses };
}

export function studentDetail(cohort = getCohort(), id) {
  const s = cohort.students.find((x) => x.id === id) || null;
  if (!s) return null;
  const acts = cohort.activities.filter((a) => a.userId === id);
  return {
    ...s,
    activities: acts,
    gapSkills: s.skillGaps.map((g) => SKILL_BY_ID[g]).filter(Boolean),
    career: CAREER_BY_ID[s.targetCareer],
    savedCourses: (s.courses || []).map((c) => COURSE_BY_ID[c]).filter(Boolean),
  };
}

/** Client-side CSV export for the activity table / student list. */
export function toCSV(rows = [], columns = []) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(typeof c.value === 'function' ? c.value(r) : r[c.value])).join(',')).join('\n');
  return `${head}\n${body}`;
}

export function downloadCSV(filename, csv) {
  try {
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch {
    return false;
  }
}

export const clampStat = clamp;
export default { getCohort, getStats, getInsights, searchStudents, filterActivities, studentDetail, toCSV, downloadCSV };
