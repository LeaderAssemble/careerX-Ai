import { BADGES } from '../data/badges';
import { getSkillGaps, roadmapProgress } from './careerService';
import storage from '../lib/storage';
import { uid } from '../lib/utils';

/**
 * achievementService — gamification that is earned by real in-app actions.
 * Badge rules live in src/data/badges.js and are evaluated against one snapshot,
 * so a badge can never be unlocked by a number the UI invented.
 */

export function buildSnapshot({ profile = {}, progress = {}, derived = {}, gaps = [] }) {
  const rp = roadmapProgress(progress.roadmap);
  const statuses = Object.values(progress.projects || {});
  const completedProjects = statuses.filter((s) => s === 'completed').length
    + (profile.projects || []).filter((p) => p.status === 'completed').length;
  const activeProjects = statuses.filter((s) => s === 'in-progress').length
    + (profile.projects || []).filter((p) => p.status === 'in-progress').length;
  const gapsClosed = gaps.filter((g) => g.status === 'met').length;
  const resumeScore = derived.resume?.score ?? 0;
  const bestInterviewScore = derived.interview?.best ?? 0;

  return {
    profileCompletion: derived.completion ?? 0,
    completedProjects,
    activeProjects,
    gapsClosed,
    resumeScore,
    bestInterviewScore,
    interviewAttempts: derived.interview?.attempts ?? 0,
    applications: (progress.applications || []).length,
    roadmapProgress: rp.pct,
    savedCourses: (progress.savedCourses || []).length,
    streak: progress.streak?.count ?? 0,
    chatMessages: progress.chatCount ?? 0,
    trackedGov: (progress.trackedGov || []).length,
    readiness: derived.readiness?.score ?? 0,
    employability: derived.employability?.score ?? 0,
  };
}

/**
 * Evaluate badges. Returns { unlocked: {id: iso}, newly: [badge], snapshot }.
 * `previous` is the stored badge map so we only announce genuinely new ones.
 */
export function evaluateBadges(snapshot, previous = {}) {
  const unlocked = { ...previous };
  const newly = [];
  BADGES.forEach((b) => {
    if (unlocked[b.id]) return;
    let ok = false;
    try { ok = !!b.check(snapshot); } catch { ok = false; }
    if (ok) {
      unlocked[b.id] = new Date().toISOString();
      newly.push(b);
    }
  });
  return { unlocked, newly, snapshot };
}

export function badgesFor(userKey, snapshot, previous) {
  const res = evaluateBadges(snapshot, previous);
  if (res.newly.length && userKey) storage.set(`badges:${userKey}`, res.unlocked);
  return res;
}

export function notificationsForNewBadges(newBadges = []) {
  return newBadges.map((b) => ({
    id: uid('n'),
    type: 'achievement',
    at: new Date().toISOString(),
    title: ['Achievement unlocked', 'उपलब्धि अनलॉक'],
    body: [`${b.emoji} ${b.n[0]} — ${b.d[0]}`, `${b.emoji} ${b.n[1]} — ${b.d[1]}`],
    link: '/app/achievements',
    read: false,
  }));
}

/** Suggest the single closest locked badge (used on the dashboard as motivation). */
export function nextBadgeProgress(snapshot) {
  const locked = BADGES.filter((b) => {
    try { return !b.check(snapshot); } catch { return true; }
  });
  const scored = locked.map((b) => {
    let ratio = 0;
    switch (b.id) {
      case 'profile-complete': ratio = snapshot.profileCompletion / 90; break;
      case 'first-project': ratio = Math.min(snapshot.completedProjects, 1); break;
      case 'skill-master': ratio = snapshot.gapsClosed / 3; break;
      case 'interview-ready': ratio = snapshot.bestInterviewScore / 70; break;
      case 'resume-ready': ratio = snapshot.resumeScore / 75; break;
      case 'career-launch': ratio = snapshot.applications / 3; break;
      case 'roadmap-runner': ratio = snapshot.roadmapProgress / 50; break;
      case 'course-collector': ratio = snapshot.savedCourses / 3; break;
      case 'consistent-mind': ratio = snapshot.streak / 7; break;
      case 'first-ask': ratio = Math.min(snapshot.chatMessages, 1); break;
      case 'lab-experimenter': ratio = snapshot.activeProjects / 2; break;
      case 'gov-explorer': ratio = Math.min(snapshot.trackedGov, 1); break;
      default: ratio = 0;
    }
    return { badge: b, ratio: Math.max(0, Math.min(1, ratio)) };
  });
  return scored.sort((a, b) => b.ratio - a.ratio)[0] || null;
}

export { getSkillGaps };
export default evaluateBadges;
