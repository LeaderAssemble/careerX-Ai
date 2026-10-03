import { COURSES, COURSE_BY_ID } from '../data/courses';
import { rankCourses } from './careerService';
import { SKILL_BY_ID } from '../data/catalog';
import { clamp } from '../lib/utils';
import { getEligiblePublishedRecords, listPublishedRecords, refreshPublishedContent, toCourse } from './publishedContentService';

/**
 * courseService — catalog access, filtering and gap-driven ranking.
 *
 * INTEGRATION POINT: swap `getCatalog()` for a real provider/catalog API
 * (keep the same course shape and every screen keeps working). Do not put provider
 * API keys in the client — call them from your own backend route.
 */

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export async function getCatalog({ simulate = true, profile = null } = {}) {
  if (simulate) await delay(260);
  await refreshPublishedContent();
  const published = profile
    ? getEligiblePublishedRecords('course', profile).map(toCourse)
    : listPublishedRecords().filter((record) => record.status === 'published' && record.kind === 'course').map(toCourse);
  return [...published, ...COURSES];
}

export function getRecommended(career, gaps = [], skillMap = {}, progress = {}, limit = 8) {
  return rankCourses(career, gaps, skillMap, progress).slice(0, limit);
}

export function filterCourses(list = [], f = {}) {
  const { skill = 'all', difficulty = 'all', duration = 'all', freeOnly = false, certOnly = false, q = '' } = f;
  const term = String(q || '').trim().toLowerCase();
  return list.filter((entry) => {
    const c = entry.course || entry;
    if (skill !== 'all' && !c.skills.includes(skill)) return false;
    if (difficulty !== 'all' && c.diff !== difficulty) return false;
    if (duration === 'short' && c.weeks > 4) return false;
    if (duration === 'medium' && (c.weeks <= 4 || c.weeks > 8)) return false;
    if (duration === 'long' && c.weeks <= 8) return false;
    if (freeOnly && !c.free) return false;
    if (certOnly && !c.cert) return false;
    if (term) {
      const hay = `${c.t[0]} ${c.t[1]} ${c.provider} ${c.skills.map((s) => SKILL_BY_ID[s]?.n?.[0] || s).join(' ')}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
}

/** Estimate how much a course moves a skill level (used by “Close this skill gap”). */
export function estimateSkillGain(course, currentLevel = 0) {
  const weight = (course.free ? 0.85 : 1) * (course.cert ? 1.1 : 1);
  const depth = clamp(course.hrs / 45, 0.4, 2.2) * weight;
  return clamp(Math.round((currentLevel + depth) * 2) / 2, currentLevel, 4);
}

export function courseById(id) {
  if (COURSE_BY_ID[id]) return COURSE_BY_ID[id];
  const published = listPublishedRecords().find((record) => record.id === id && record.kind === 'course');
  return published ? toCourse(published) : null;
}

export function planSummary(saved = [], skillMap = {}) {
  const totalWeeks = saved.reduce((a, s) => a + (courseById(s.id)?.weeks || 0), 0);
  const totalHours = saved.reduce((a, s) => a + (courseById(s.id)?.hrs || 0), 0);
  const skills = [...new Set(saved.flatMap((s) => courseById(s.id)?.skills || []))];
  const done = saved.filter((s) => s.done).length;
  return { count: saved.length, done, totalWeeks, totalHours, skills, skillMap };
}

export { COURSES };
export default { getCatalog, getRecommended, filterCourses, estimateSkillGain, courseById, planSummary };
