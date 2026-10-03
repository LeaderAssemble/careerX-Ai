import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as auth from '../services/authService';
import { computeDerived, buildSkillMap } from '../services/scoreService';
import {
  getCareerMatches, getSkillGaps, generateRoadmap, getNextBestAction, rankCourses,
  recommendProjects, generateChallenge, buildInitialNotifications, roadmapProgress,
} from '../services/careerService';
import { buildSnapshot, evaluateBadges, notificationsForNewBadges } from '../services/achievementService';
import { estimateSkillGain, courseById } from '../services/courseService';
import { CAREER_BY_ID } from '../data/careers';
import { SKILL_BY_ID } from '../data/catalog';
import storage from '../lib/storage';
import { uid, clamp } from '../lib/utils';

/**
 * AppStore — single source of truth for session, profile, progress, notifications,
 * toasts and derived intelligence.
 *
 * Everything derived (scores, matches, gaps, next best action) is memoised from the same
 * profile+progress pair, so no two screens can ever disagree about a number.
 *
 * PERSISTENCE: synchronous browser cache backed by authenticated MySQL API sync
 * (see src/lib/storage.js). The UI never accesses persistence directly.
 */
const AppCtx = createContext(null);
const T = (en, hi) => [en, hi];

const todayKey = () => new Date().toISOString().slice(0, 10);

/** Keep the student's checked-off challenge tasks when the plan is regenerated. */
function mergeChallenge(previous, fresh) {
  if (!previous) return fresh;
  return { ...fresh, startedAt: previous.startedAt || fresh.generatedAt, done: previous.done || [] };
}

function touchStreak(streak) {
  const last = streak?.lastActive ? String(streak.lastActive).slice(0, 10) : null;
  const today = todayKey();
  if (last === today) return streak;
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const count = last === y ? (streak.count || 0) + 1 : 1;
  return { count, lastActive: new Date().toISOString() };
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(() => auth.getSession());
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(auth.emptyProgress());
  const [settings, setSettings] = useState(() => storage.get('settings', { tts: false, voiceInput: true, reducedMotion: false }));
  const [toasts, setToasts] = useState([]);
  const [ready, setReady] = useState(false);
  const hydratedFor = useRef(null);

  /* ------------------------------- toasts ------------------------------- */
  const dismissToast = useCallback((id) => setToasts((list) => list.filter((x) => x.id !== id)), []);
  const toast = useCallback((t) => {
    const item = { id: uid('t'), kind: 'success', duration: 4200, ...t };
    setToasts((list) => [...list.slice(-3), item]);
    if (item.duration) setTimeout(() => dismissToast(item.id), item.duration);
    return item.id;
  }, [dismissToast]);

  /* ------------------------------ hydrate ------------------------------ */
  useEffect(() => {
    setSettings(storage.get('settings', { tts: false, voiceInput: true, reducedMotion: false }));
    if (!session?.user) {
      setProfile(null);
      setProgress(auth.emptyProgress());
      setReady(true);
      hydratedFor.current = null;
      return;
    }
    const user = session.user;
    if (hydratedFor.current === user.id && user.role === 'admin') { setReady(true); return; }
    hydratedFor.current = user.id;

    if (user.role === 'admin') {
      setProfile(null);
      setProgress(auth.emptyProgress());
      setReady(true);
      return;
    }

    const storedProfile = auth.loadProfile(user.id) || auth.emptyProfile(user);
    let storedProgress = auth.loadProgress(user.id) || auth.emptyProgress();

    // Demo student ships with a list of already-completed roadmap task ids.
    if (Array.isArray(storedProgress.roadmapDoneIds)) {
      const doneIds = new Set(storedProgress.roadmapDoneIds);
      if (storedProfile.targetCareer) {
        const rm = generateRoadmap(CAREER_BY_ID[storedProfile.targetCareer], {}, { tasks: [...doneIds].map((id) => ({ id, done: true })) });
        storedProgress = { ...storedProgress, roadmap: rm };
      }
      delete storedProgress.roadmapDoneIds;
    }
    if (!storedProgress.roadmap && storedProfile.targetCareer) {
      storedProgress = { ...storedProgress, roadmap: generateRoadmap(CAREER_BY_ID[storedProfile.targetCareer], {}) };
    }
    // Older/demo records may store only { startedAt, done } — rebuild the phase plan
    // around them so the tracker always has tasks to show (done ids are stable).
    if (storedProgress.challenge && !Array.isArray(storedProgress.challenge.phases) && storedProfile.targetCareer) {
      const chCareer = CAREER_BY_ID[storedProfile.targetCareer];
      if (chCareer) {
        const chMap = buildSkillMap(storedProfile, storedProgress);
        const fresh = generateChallenge({ career: chCareer, gaps: getSkillGaps(chCareer, chMap), profile: storedProfile, roadmap: storedProgress.roadmap });
        storedProgress = {
          ...storedProgress,
          challenge: { ...fresh, startedAt: storedProgress.challenge.startedAt || fresh.generatedAt, done: storedProgress.challenge.done || [] },
        };
      }
    }

    storedProgress = {
      ...storedProgress,
      notifications: storedProgress.notifications || [],
      badges: storedProgress.badges || {},
      savedCourses: storedProgress.savedCourses || [],
      applications: storedProgress.applications || [],
      trackedGov: storedProgress.trackedGov || [],
      projects: storedProgress.projects || {},
      interviews: storedProgress.interviews || [],
      skillUpdates: storedProgress.skillUpdates || {},
      streak: storedProgress.streak || { count: 0, lastActive: null },
      readinessHistory: storedProgress.readinessHistory || [],
    };

    setProfile(storedProfile);
    setProgress(storedProgress);
    setReady(true);
    auth.saveProgress(user.id, storedProgress);
  }, [session?.user]);

  /* ------------------------------ persist ------------------------------ */
  useEffect(() => {
    if (!session?.user || session.user.role !== 'student' || !profile) return;
    auth.saveProfile(session.user.id, profile);
  }, [profile, session?.user]);

  useEffect(() => {
    if (!session?.user || session.user.role !== 'student') return;
    auth.saveProgress(session.user.id, progress);
  }, [progress, session?.user]);

  useEffect(() => { storage.set('settings', settings); }, [settings]);

  /* ------------------------------ derived ------------------------------ */
  const derived = useMemo(() => (profile ? computeDerived(profile, progress) : null), [profile, progress]);

  const matches = useMemo(() => {
    if (!profile || !derived) return [];
    return getCareerMatches(profile, derived.skillMap);
  }, [profile, derived]);

  const activeCareer = derived?.career || matches[0]?.career || null;

  const gaps = useMemo(() => (activeCareer && derived ? getSkillGaps(activeCareer, derived.skillMap) : []), [activeCareer, derived]);

  const courses = useMemo(
    () => (derived ? rankCourses(activeCareer, gaps, derived.skillMap, progress) : []),
    [activeCareer, gaps, derived, progress.savedCourses]
  );

  const projects = useMemo(
    () => (derived ? recommendProjects(activeCareer, gaps, derived.skillMap, progress) : []),
    [activeCareer, gaps, derived, progress.projects]
  );

  const roadmap = progress.roadmap || null;
  const roadmapStats = useMemo(() => roadmapProgress(roadmap), [roadmap]);

  const nextAction = useMemo(
    () => (derived ? getNextBestAction({ profile, progress, derived, gaps, matches, roadmap }) : null),
    [derived, profile, progress, gaps, matches, roadmap]
  );

  const challenge = useMemo(() => {
    if (!progress.challenge && derived && activeCareer) {
      return null; // generated on demand by startChallenge()
    }
    return progress.challenge;
  }, [progress.challenge, derived, activeCareer]);

  const badgeSnapshot = useMemo(
    () => (derived ? buildSnapshot({ profile, progress, derived, gaps }) : null),
    [profile, progress, derived, gaps]
  );
  const badgeKey = badgeSnapshot ? JSON.stringify(badgeSnapshot) : '';

  /* --------------------------- achievement engine --------------------------- */
  const badgesRef = useRef(progress.badges);
  badgesRef.current = progress.badges;
  // Badges already earned when a profile is loaded are persisted silently — only
  // achievements earned *during* this session are announced (no toast spam on login).
  const firstBadgeRun = useRef(true);
  useEffect(() => { firstBadgeRun.current = true; }, [session?.user?.id]);

  useEffect(() => {
    if (!badgeSnapshot || !session?.user || session.user.role !== 'student') return;
    const { unlocked, newly } = evaluateBadges(badgeSnapshot, badgesRef.current || {});
    if (!newly.length) return;
    const announce = !firstBadgeRun.current;
    firstBadgeRun.current = false;
    setProgress((p) => ({
      ...p,
      badges: unlocked,
      notifications: announce
        ? [...notificationsForNewBadges(newly), ...(p.notifications || [])].slice(0, 60)
        : p.notifications,
    }));
    if (!announce) return;
    newly.forEach((b) => toast({ kind: 'success', title: T('Achievement unlocked', 'उपलब्धि अनलॉक'), body: [`${b.emoji} ${b.n[0]} — ${b.d[0]}`, `${b.emoji} ${b.n[1]} — ${b.d[1]}`], duration: 5200 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badgeKey]);

  /* ------------------------- readiness history tracking ------------------------- */
  const lastHistoryScore = useRef(null);
  useEffect(() => {
    if (!derived || !session?.user || session.user.role !== 'student') return;
    const score = derived.readiness.score;
    if (lastHistoryScore.current === score) return;
    lastHistoryScore.current = score;
    setProgress((p) => {
      const hist = [...(p.readinessHistory || [])].filter((h) => String(h.at).slice(0, 10) !== todayKey());
      hist.push({ at: new Date().toISOString(), score });
      return { ...p, readinessHistory: hist.slice(-24) };
    });
  }, [derived?.readiness.score, session?.user]);

  /* ------------------------------- actions ------------------------------- */
  const updateProgress = useCallback((updater) => {
    setProgress((p) => (typeof updater === 'function' ? updater(p) : { ...p, ...updater }));
  }, []);

  const patchProfile = useCallback((patch) => {
    setProfile((p) => ({ ...p, ...(typeof patch === 'function' ? patch(p) : patch) }));
  }, []);

  const pushNotification = useCallback((n) => {
    updateProgress((p) => ({ ...p, notifications: [{ id: uid('n'), at: new Date().toISOString(), read: false, ...n }, ...(p.notifications || [])].slice(0, 60) }));
  }, [updateProgress]);

  const doLogin = useCallback(async (creds) => {
    let res;
    let migrationSucceeded = false;
    try {
      const migrationResponse = await fetch('/api/auth/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: auth.listUsers() }),
      });
      migrationSucceeded = migrationResponse.ok;
    } catch { /* Existing local login can still work while offline. */ }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      });
      if (response.ok) {
        const result = await response.json();
        await storage.migrateLocalData(result.token, result.user.id);
        await storage.syncFromMySql(result.token);
        if (migrationSucceeded) auth.clearLegacyPasswordCache();
        const user = auth.adoptServerUser(result.user, result.token);
        res = user ? { ok: true, user } : { ok: false, error: 'wrongCreds' };
      } else {
        res = { ok: false, error: response.status >= 500 ? 'serverUnavailable' : 'wrongCreds' };
      }
    } catch {
      res = auth.login(creds);
    }
    if (!res.ok) {
      toast({ kind: 'error', title: T('Login failed', 'लॉगिन विफल'), body: T(res.error === 'serverUnavailable' ? 'MySQL auth service is unavailable. Check DATABASE.md and restart.' : 'Those credentials don’t match the selected account type.', res.error === 'serverUnavailable' ? 'MySQL auth सेवा उपलब्ध नहीं है। DATABASE.md देखकर रीस्टार्ट करें।' : 'क्रेडेंशियल चुने हुए खाते के प्रकार से मेल नहीं खाते।') });
      return res;
    }
    hydratedFor.current = null;
    setSession(auth.getSession());
    toast({ kind: 'success', title: T(`Welcome, ${res.user.name || res.user.role}`, `स्वागत है, ${res.user.name || res.user.role}`), body: T('Your session is stored locally for this demo.', 'इस डेमो के लिए आपका सत्र लोकल रूप से सेव है।') });
    return res;
  }, [toast]);

  const doSignup = useCallback(async (data) => {
    let remote;
    try {
      await fetch('/api/auth/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: auth.listUsers() }),
      });
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        if (result.error === 'emailTaken') return { ok: false, errors: { email: 'emailTaken' } };
        return { ok: false, errors: { server: 'requestFailed' } };
      }
      remote = await response.json();
    } catch {
      toast({ kind: 'error', title: T('Could not create account', 'खाता नहीं बन सका'), body: T('Account server is unavailable. Please try again.', 'खाता सर्वर उपलब्ध नहीं है। फिर कोशिश करें।') });
      return { ok: false, errors: { server: 'requestFailed' } };
    }

    const res = auth.signup({ ...data, id: remote.user.id });
    if (!res.ok) {
      const firstKey = Object.keys(res.errors || {})[0];
      toast({ kind: 'error', title: T('Could not create account', 'खाता नहीं बन सका'), body: T(`Check the highlighted field${firstKey ? `: ${firstKey}` : ''}.`, `चिह्नित फ़ील्ड जाँचें${firstKey ? `: ${firstKey}` : ''}।`) });
      return res;
    }
    await storage.migrateLocalData(remote.token, remote.user.id);
    auth.adoptServerUser(remote.user, remote.token);
    await storage.syncFromMySql(remote.token);
    hydratedFor.current = null;
    setSession(auth.getSession());
    toast({
      kind: 'success',
      title: T('Account created', 'खाता बन गया'),
      body: res.user.role === 'admin'
        ? T('Institution admin account created in this browser.', 'इस ब्राउज़र में संस्थान एडमिन खाता बन गया।')
        : T('Let’s build your career profile.', 'आइए आपकी करियर प्रोफ़ाइल बनाते हैं।'),
    });
    return res;
  }, [toast]);

  const doLogout = useCallback(() => {
    auth.logout();
    setSession(null);
    setProfile(null);
    setProgress(auth.emptyProgress());
    hydratedFor.current = null;
    toast({ kind: 'info', title: T('Logged out', 'लॉग आउट'), body: T('Your demo data stays in this browser.', 'आपका डेमो डेटा इस ब्राउज़र में रहेगा।') });
  }, [toast]);

  const loadDemoStudent = useCallback(() => {
    const res = auth.loadDemoStudent();
    hydratedFor.current = null;
    setSession(auth.getSession());
    toast({ kind: 'success', title: T('Demo student loaded', 'डेमो छात्र लोड हुआ'), body: T('Full sample profile, roadmap, resume and interview history are ready.', 'पूरी नमूना प्रोफ़ाइल, रोडमैप, रिज़्यूमे और इंटरव्यू इतिहास तैयार है।') });
    return res;
  }, [toast]);

  const completeOnboarding = useCallback((profilePatch, { generate = true } = {}) => {
    patchProfile((p) => ({ ...p, ...profilePatch, onboarded: true }));
    updateProgress((pr) => ({ ...pr, onboardedAt: new Date().toISOString(), streak: touchStreak(pr.streak) }));
    if (generate) {
      const merged = { ...(profile || {}), ...profilePatch };
      const skillMap = computeDerived(merged, progress).skillMap;
      const careerId = merged.targetCareer || getCareerMatches(merged, skillMap)[0]?.career?.id;
      const career = CAREER_BY_ID[careerId];
      if (career) {
        const rm = generateRoadmap(career, skillMap, progress.roadmap?.careerId === career.id ? progress.roadmap : null);
        const gaps = getSkillGaps(career, skillMap);
        updateProgress((pr) => ({
          ...pr,
          roadmap: rm,
          challenge: pr.challenge || generateChallenge({ career, gaps, profile: merged, roadmap: rm }),
          notifications: buildInitialNotifications({ derived: computeDerived(merged, pr), gaps, matches: getCareerMatches(merged, skillMap).slice(0, 3), roadmap: rm }),
        }));
        if (careerId && !merged.targetCareer) patchProfile({ targetCareer: careerId });
      }
    }
  }, [patchProfile, updateProgress, profile, progress]);

  const setTargetCareer = useCallback((careerId) => {
    const career = CAREER_BY_ID[careerId];
    if (!career) return;
    patchProfile({ targetCareer: careerId });
    const skillMap = derived?.skillMap || {};
    const rm = generateRoadmap(career, skillMap, progress.roadmap?.careerId === careerId ? progress.roadmap : null);
    const newGaps = getSkillGaps(career, skillMap);
    updateProgress((p) => ({
      ...p,
      roadmap: rm,
      challenge: mergeChallenge(p.challenge, generateChallenge({ career, gaps: newGaps, profile, roadmap: rm })),
      streak: touchStreak(p.streak),
    }));
    pushNotification({
      type: 'roadmap',
      title: T('Target career updated', 'लक्षित करियर अपडेट हुआ'),
      body: [`${career.n[0]} roadmap regenerated with ${roadmapProgress(rm).total} tasks.`, `${career.n[1]} रोडमैप ${roadmapProgress(rm).total} कार्यों के साथ फिर बना।`],
      link: '/app/roadmap',
    });
    toast({ kind: 'success', title: T('Target career set', 'लक्षित करियर सेट हुआ'), body: [`${career.n[0]} — roadmap and gaps recalculated.`, `${career.n[1]} — रोडमैप और गैप फिर गिने गए।`] });
  }, [patchProfile, updateProgress, derived, progress.roadmap, profile, pushNotification, toast]);

  const toggleTask = useCallback((taskId) => {
    updateProgress((p) => {
      const rm = p.roadmap;
      if (!rm) return p;
      const months = rm.months.map((m) => ({
        ...m,
        tasks: m.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
      }));
      const tasks = months.flatMap((m) => m.tasks.map((t) => ({ ...t, order: m.order })));
      const nowDone = tasks.find((t) => t.id === taskId)?.done;
      const next = { ...p, roadmap: { ...rm, months, tasks }, streak: nowDone ? touchStreak(p.streak) : p.streak };
      if (nowDone) {
        const done = tasks.filter((t) => t.done).length;
        if (done % 5 === 0) {
          next.notifications = [{
            id: uid('n'), type: 'roadmap', at: new Date().toISOString(), read: false,
            title: T('Roadmap milestone', 'रोडमैप माइलस्टोन'),
            body: [`${done} of ${tasks.length} tasks complete — readiness is climbing.`, `${tasks.length} में से ${done} कार्य पूर्ण — तैयारी बढ़ रही है।`],
            link: '/app/roadmap',
          }, ...(p.notifications || [])].slice(0, 60);
        }
      }
      return next;
    });
  }, [updateProgress]);

  const setProjectStatus = useCallback((projectId, status) => {
    updateProgress((p) => ({ ...p, projects: { ...(p.projects || {}), [projectId]: status }, streak: touchStreak(p.streak) }));
    if (status === 'completed') {
      toast({ kind: 'success', title: T('Project completed', 'प्रोजेक्ट पूर्ण'), body: T('Employability and Skill DNA updated.', 'रोज़गार-योग्यता और स्किल DNA अपडेट हुए।') });
      pushNotification({
        type: 'resume',
        title: T('Project ready for your resume', 'प्रोजेक्ट रिज़्यूमे के लिए तैयार'),
        body: T('A completed lab project can now be imported into the Projects section of your resume.', 'पूर्ण हुआ लैब प्रोजेक्ट अब रिज़्यूमे के Projects सेक्शन में इम्पोर्ट हो सकता है।'),
        link: '/app/resume',
      });
    }
  }, [updateProgress, toast, pushNotification]);

  const toggleCourse = useCallback((courseId) => {
    const course = courseById(courseId);
    updateProgress((p) => {
      const exists = (p.savedCourses || []).find((c) => c.id === courseId);
      const savedCourses = exists ? (p.savedCourses || []).filter((c) => c.id !== courseId) : [...(p.savedCourses || []), { id: courseId, at: new Date().toISOString(), done: false }];
      return { ...p, savedCourses, streak: touchStreak(p.streak) };
    });
    if (course) {
      const was = (progress.savedCourses || []).some((c) => c.id === courseId);
      toast({
        kind: was ? 'info' : 'success',
        title: was ? T('Removed from plan', 'योजना से हटाया') : T('Course added to plan', 'कोर्स योजना में जोड़ा'),
        body: [course.t[0], course.t[1]],
      });
    }
  }, [updateProgress, toast, progress.savedCourses]);

  const completeCourse = useCallback((courseId) => {
    const course = courseById(courseId);
    updateProgress((p) => ({
      ...p,
      savedCourses: (p.savedCourses || []).map((c) => (c.id === courseId ? { ...c, done: true } : c)),
      skillUpdates: {
        ...(p.skillUpdates || {}),
        ...Object.fromEntries((course?.skills || []).map((s) => [s, Math.max(p.skillUpdates?.[s] || 0, estimateSkillGain(course, Math.max(p.skillUpdates?.[s] || 0, 2)))])),
      },
      streak: touchStreak(p.streak),
    }));
    if (course) toast({ kind: 'success', title: T('Course completed', 'कोर्स पूर्ण'), body: [`${course.t[0]} — skill levels updated.`, `${course.t[1]} — कौशल स्तर अपडेट हुए।`] });
  }, [updateProgress, toast]);

  const closeGap = useCallback((gap, course) => {
    const useCourse = course || gap.courses?.[0];
    const nextLevel = clamp(Math.max(gap.current + 1, useCourse ? estimateSkillGain(useCourse, gap.current) : gap.current + 1), 0, 4);
    updateProgress((p) => ({
      ...p,
      skillUpdates: { ...(p.skillUpdates || {}), [gap.id]: nextLevel },
      savedCourses: useCourse && !(p.savedCourses || []).some((c) => c.id === useCourse.id)
        ? [...(p.savedCourses || []), { id: useCourse.id, at: new Date().toISOString(), done: false }]
        : p.savedCourses,
      streak: touchStreak(p.streak),
    }));
    pushNotification({
      type: 'gap',
      title: T('Skill gap being closed', 'स्किल गैप भरा जा रहा है'),
      body: [
        `${gap.skill.n[0]} moved to level ${Math.round((nextLevel / 4) * 100)}%${useCourse ? ` via “${useCourse.t[0]}”.` : '.'}`,
        `${gap.skill.n[1]} स्तर ${Math.round((nextLevel / 4) * 100)}% पर पहुँचा${useCourse ? ` — “${useCourse.t[1]}” के माध्यम से।` : '।'}`,
      ],
      link: '/app/skill-gap',
    });
    toast({ kind: 'success', title: T('Skill gap plan added', 'स्किल गैप योजना जुड़ी'), body: [`${gap.skill.n[0]} → level ${nextLevel}`, `${gap.skill.n[1]} → स्तर ${nextLevel}`] });
  }, [updateProgress, pushNotification, toast]);

  const applyTo = useCallback((opp) => {
    updateProgress((p) => {
      if ((p.applications || []).some((a) => a.id === opp.id)) return p;
      return { ...p, applications: [...(p.applications || []), { id: opp.id, at: new Date().toISOString(), type: opp.type || 'job' }], streak: touchStreak(p.streak) };
    });
    pushNotification({
      type: 'internship',
      title: T('Application saved (demo)', 'आवेदन सेव हुआ (डेमो)'),
      body: [`${opp.t?.[0]} at ${opp.co?.[0] || opp.org || '—'} — stored locally, nothing was submitted.`, `${opp.co?.[1] || opp.org || '—'} में ${opp.t?.[1]} — लोकल सेव, कुछ सबमिट नहीं हुआ।`],
      link: opp.type === 'internship' ? '/app/internships' : '/app/jobs',
    });
    toast({ kind: 'success', title: T('Application saved', 'आवेदन सेव हुआ'), body: T('Demo only — nothing was submitted to an employer.', 'केवल डेमो — किसी नियोक्ता को कुछ नहीं भेजा गया।') });
  }, [updateProgress, pushNotification, toast]);

  const trackGov = useCallback((gov) => {
    updateProgress((p) => ({
      ...p,
      trackedGov: (p.trackedGov || []).includes(gov.id) ? p.trackedGov : [...(p.trackedGov || []), gov.id],
      streak: touchStreak(p.streak),
    }));
    toast({ kind: 'success', title: T('Opportunity tracked', 'अवसर ट्रैक हुआ'), body: [gov.t?.[0], gov.t?.[1]] });
  }, [updateProgress, toast]);

  const saveResume = useCallback((resume) => {
    updateProgress((p) => ({ ...p, resume: { ...resume, updatedAt: new Date().toISOString() }, streak: touchStreak(p.streak) }));
  }, [updateProgress]);

  const addInterview = useCallback((entry) => {
    updateProgress((p) => ({ ...p, interviews: [entry, ...(p.interviews || [])].slice(0, 30), streak: touchStreak(p.streak) }));
    pushNotification({
      type: 'interview',
      title: T('Mock interview completed', 'मॉक इंटरव्यू पूर्ण'),
      body: [`Score ${entry.score}/100 — review dimension-wise feedback to improve next time.`, `स्कोर ${entry.score}/100 — अगली बार सुधार के लिए पक्षवार फ़ीडबैक देखें।`],
      link: '/app/interview',
    });
    toast({ kind: entry.score >= 70 ? 'success' : 'info', title: T('Interview saved', 'इंटरव्यू सेव हुआ'), body: T(`Overall ${entry.score}/100`, `कुल ${entry.score}/100`) });
  }, [updateProgress, pushNotification, toast]);

  const startChallenge = useCallback(() => {
    if (!activeCareer) {
      toast({ kind: 'warn', title: T('Set a target career first', 'पहले लक्षित करियर तय करें'), body: T('The challenge is generated from your target path.', 'चुनौती आपके लक्षित पथ से बनती है।') });
      return null;
    }
    const c = generateChallenge({ career: activeCareer, gaps, profile, roadmap });
    updateProgress((p) => ({ ...p, challenge: { ...c, startedAt: new Date().toISOString() }, streak: touchStreak(p.streak) }));
    toast({ kind: 'success', title: T('Challenge started', 'चुनौती शुरू'), body: T('90 days, three phases, tracked daily.', '90 दिन, तीन चरण, रोज़ ट्रैक।') });
    return c;
  }, [activeCareer, gaps, profile, roadmap, updateProgress, toast]);

  const toggleChallengeTask = useCallback((taskId) => {
    updateProgress((p) => {
      if (!p.challenge) return p;
      const done = new Set(p.challenge.done || []);
      if (done.has(taskId)) done.delete(taskId); else done.add(taskId);
      return { ...p, challenge: { ...p.challenge, done: [...done] }, streak: touchStreak(p.streak) };
    });
  }, [updateProgress]);

  const resetChallenge = useCallback(() => {
    const c = generateChallenge({ career: activeCareer, gaps, profile, roadmap });
    // A reset restarts the 90-day clock, so startedAt is stamped again.
    updateProgress((p) => ({ ...p, challenge: { ...c, startedAt: new Date().toISOString() }, streak: touchStreak(p.streak) }));
    toast({ kind: 'info', title: T('Challenge reset', 'चुनौती रीसेट'), body: T('A fresh 90-day plan was generated.', 'नई 90-दिन की योजना बनी।') });
  }, [activeCareer, gaps, profile, roadmap, updateProgress, toast]);

  const markNotificationRead = useCallback((id) => {
    updateProgress((p) => ({ ...p, notifications: (p.notifications || []).map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  }, [updateProgress]);
  const markAllRead = useCallback(() => {
    updateProgress((p) => ({ ...p, notifications: (p.notifications || []).map((n) => ({ ...n, read: true })) }));
  }, [updateProgress]);
  const clearNotifications = useCallback(() => updateProgress((p) => ({ ...p, notifications: [] })), [updateProgress]);

  const incrementChat = useCallback(() => {
    updateProgress((p) => ({ ...p, chatCount: (p.chatCount || 0) + 1 }));
  }, [updateProgress]);

  const rebuildIntelligence = useCallback(() => {
    if (!profile || !derived) return;
    const careerId = profile.targetCareer || matches[0]?.career?.id;
    const career = CAREER_BY_ID[careerId];
    if (!career) return;
    const rm = generateRoadmap(career, derived.skillMap, progress.roadmap);
    const newGaps = getSkillGaps(career, derived.skillMap);
    updateProgress((p) => ({
      ...p,
      roadmap: rm,
      challenge: mergeChallenge(p.challenge, generateChallenge({ career, gaps: newGaps, profile, roadmap: rm })),
      notifications: [...buildInitialNotifications({ derived, gaps: newGaps, matches, roadmap: rm }), ...(p.notifications || [])].slice(0, 60),
      streak: touchStreak(p.streak),
    }));
    toast({ kind: 'success', title: T('Career intelligence rebuilt', 'करियर इंटेलिजेंस फिर बनी'), body: T('Roadmap, gaps and challenge regenerated from your latest profile.', 'रोडमैप, गैप और चुनौती आपकी नवीनतम प्रोफ़ाइल से बने।') });
  }, [profile, derived, matches, progress.roadmap, updateProgress, toast]);

  const updateSettings = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []);

  const wipeData = useCallback(async () => {
    try {
      const n = await storage.clearAll();
      setSession(null);
      setProfile(null);
      setProgress(auth.emptyProgress());
      hydratedFor.current = null;
      toast({ kind: 'warn', title: T('Account data deleted', 'खाते का डेटा हटाया गया'), body: T(`${n} cached keys and the MySQL account were removed.`, `कैश की ${n} कुंजियाँ और MySQL खाता हटाए गए।`) });
    } catch {
      toast({ kind: 'error', title: T('Could not delete account data', 'खाते का डेटा नहीं हटाया जा सका'), body: T('The MySQL service is unavailable. Try again when it is online.', 'MySQL सेवा उपलब्ध नहीं है। सेवा चलने पर फिर कोशिश करें।') });
    }
  }, [toast]);

  const user = session?.user || null;
  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin';
  const onboarded = isStudent ? !!(profile?.onboarded || progress?.onboardedAt) : true;

  const value = useMemo(() => ({
    // session
    ready, session, user, isStudent, isAdmin, onboarded,
    login: doLogin, signup: doSignup, logout: doLogout, loadDemoStudent,
    // data
    profile, progress, settings, updateSettings, patchProfile, updateProgress, completeOnboarding,
    // derived intelligence
    derived, matches, activeCareer, gaps, courses, projects, roadmap, roadmapStats, nextAction, challenge, badgeSnapshot,
    // actions
    setTargetCareer, toggleTask, setProjectStatus, toggleCourse, completeCourse, closeGap,
    applyTo, trackGov, saveResume, addInterview,
    startChallenge, toggleChallengeTask, resetChallenge, rebuildIntelligence,
    // notifications & toasts
    notifications: progress.notifications || [], unread: (progress.notifications || []).filter((n) => !n.read).length,
    pushNotification, markNotificationRead, markAllRead, clearNotifications,
    toasts, toast, dismissToast,
    incrementChat, wipeData,
    skillName: (id) => SKILL_BY_ID[id]?.n || [id, id],
  }), [ready, session, user, isStudent, isAdmin, onboarded, doLogin, doSignup, doLogout, loadDemoStudent,
    profile, progress, settings, updateSettings, patchProfile, updateProgress, completeOnboarding, derived, matches,
    activeCareer, gaps, courses, projects, roadmap, roadmapStats, nextAction, challenge, badgeSnapshot, setTargetCareer,
    toggleTask, setProjectStatus, toggleCourse, completeCourse, closeGap, applyTo, trackGov, saveResume, addInterview,
    startChallenge, toggleChallengeTask, resetChallenge, rebuildIntelligence, pushNotification, markNotificationRead,
    markAllRead, clearNotifications, toasts, toast, dismissToast, incrementChat, wipeData]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export default useApp;
