import storage from '../lib/storage';
import { uid } from '../lib/utils';
import { DEMO_USER, DEMO_PROFILE, DEMO_PROGRESS, DEMO_ROADMAP_DONE } from '../data/demoProfile';
import { CAREER_BY_ID } from '../data/careers';
import { computeDerived } from './scoreService';
import { generateRoadmap, getSkillGaps, getCareerMatches, buildInitialNotifications } from './careerService';

/**
 * authService — MySQL-backed credentials with a local session/profile cache.
 *
 * ⚠️ SECURITY: this local development setup stores hashed credentials in MySQL,
 * but keeps a bearer session token and user/profile cache in localStorage. Use
 * secure, httpOnly production sessions before deploying to an untrusted network.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Password verification, account persistence and role checks live in server/index.js.
 * ────────────────────────────────────────────────────────────────────────────
 */

const USERS_KEY = 'users';
const SESSION_KEY = 'session';

export const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
export const passwordIssue = (v) => (String(v || '').length < 6 ? 'minLen' : null);

export function emptyProfile(user = {}) {
  return {
    personal: {
      name: user.name || '',
      email: user.email || '',
      phone: '',
      city: '',
      state: '',
      address: '',
      college: user.college || '',
      avatar: null,
      avatarSeed: (user.name || 'student').toLowerCase().slice(0, 6),
    },
    education: {
      degree: user.degree || '',
      branch: user.branch || '',
      department: '',
      college: '',
      semester: '',
      cgpa: '',
      gradYear: user.gradYear || '',
      subjects: [],
      twelfth: { rollNo: '', board: '', state: '', stream: '', percentage: '', passoutYear: '' },
      tenth: { rollNo: '', board: '', state: '', stream: '', percentage: '', passoutYear: '' },
    },
    extraCurricularActivities: [],
    techSkills: [],
    softSkills: [],
    toolSkills: [],
    industrySkills: [],
    interests: [],
    careerAreas: [],
    projects: [],
    experience: [],
    certifications: [],
    workType: '',
    locationPref: '',
    goal: '',
    targetCareer: null,
  };
}

export function emptyProgress() {
  return {
    skillUpdates: {},
    savedCourses: [],
    projects: {},
    applications: [],
    trackedGov: [],
    challenge: null,
    interviews: [],
    resume: null,
    chatCount: 0,
    streak: { count: 0, lastActive: null },
    readinessHistory: [],
    roadmap: null,
    badges: {},
    onboardedAt: null,
  };
}

function readUsers() {
  const users = storage.get(USERS_KEY, null);
  if (Array.isArray(users) && users.length) return users;
  // Seed the demo student on first run.
  const seed = [
    { ...DEMO_USER, name: 'Aarav Sharma', onboarded: true },
  ];
  storage.set(USERS_KEY, seed);
  return seed;
}

export function listUsers() {
  return readUsers();
}

function writeUsers(users) {
  storage.set(USERS_KEY, users);
}

export function findUser(email) {
  const e = String(email || '').trim().toLowerCase();
  return readUsers().find((u) => String(u.email).toLowerCase() === e) || null;
}

export function signup({
  id, name, email, password, role = 'student', college, degree, branch, gradYear,
  institution, city, placementHead, contactEmail, website, academicYear, cohortNote,
}) {
  const errors = {};
  if (!String(name || '').trim()) errors.name = 'requiredField';
  if (!isValidEmail(email)) errors.email = 'invalidEmail';
  const pw = passwordIssue(password);
  if (pw) errors.password = pw;
  if (role === 'student') {
    if (!String(college || '').trim()) errors.college = 'requiredField';
    if (!String(degree || '').trim()) errors.degree = 'requiredField';
    if (!String(branch || '').trim()) errors.branch = 'requiredField';
    if (!String(gradYear || '').trim()) errors.gradYear = 'requiredField';
  } else if (role === 'admin') {
    if (!String(institution || '').trim()) errors.institution = 'requiredField';
    if (!String(city || '').trim()) errors.city = 'requiredField';
    if (!String(placementHead || '').trim()) errors.placementHead = 'requiredField';
    if (!isValidEmail(contactEmail)) errors.contactEmail = 'invalidEmail';
    if (!String(academicYear || '').trim()) errors.academicYear = 'requiredField';
  } else {
    errors.role = 'invalidRole';
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  if (findUser(email)) return { ok: false, errors: { email: 'emailTaken' } };

  const user = {
    id: id || uid('u'),
    role,
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    college, degree, branch, gradYear,
    institution, city, placementHead, contactEmail, website, academicYear, cohortNote,
    onboarded: role === 'admin',
    createdAt: new Date().toISOString(),
  };
  const users = readUsers();
  users.push(user);
  writeUsers(users);
  storage.set(`profile:${user.id}`, emptyProfile(user));
  storage.set(`progress:${user.id}`, emptyProgress());
  if (role === 'admin') {
    storage.set(`adminSettings:${user.id}`, { institution, city, placementHead, contactEmail, website, academicYear, cohortNote });
  }
  storage.set(SESSION_KEY, { userId: user.id, role: user.role, at: Date.now() });
  return { ok: true, user };
}

export function login({ email, password, role }) {
  const user = findUser(email);
  // Demo credential check. Replace with a real auth call before any production use.
  if (!user || String(user.passwordDemo || '') !== String(password || '')) {
    return { ok: false, error: 'wrongCreds' };
  }
  if (role && user.role !== role) return { ok: false, error: 'wrongCreds' };
  storage.set(SESSION_KEY, { userId: user.id, role: user.role, at: Date.now() });
  return { ok: true, user };
}

export function adoptServerUser(serverUser, token) {
  if (!serverUser?.id || !serverUser.email) return null;
  const users = readUsers();
  const existing = users.find((user) => user.id === serverUser.id || String(user.email).toLowerCase() === String(serverUser.email).toLowerCase());
  const { passwordDemo, ...safeExisting } = existing || {};
  const user = { ...safeExisting, ...serverUser };
  writeUsers(existing ? users.map((entry) => entry.id === existing.id ? user : entry) : [...users, user]);
  if (!loadProfile(user.id)) storage.set(`profile:${user.id}`, emptyProfile(user));
  if (!loadProgress(user.id)) storage.set(`progress:${user.id}`, emptyProgress());
  storage.set(SESSION_KEY, { userId: user.id, role: user.role, token, at: Date.now() });
  return user;
}

export function clearLegacyPasswordCache() {
  const users = readUsers();
  let changed = false;
  const safeUsers = users.map((user) => {
    if (!Object.hasOwn(user, 'passwordDemo')) return user;
    const { passwordDemo, ...safeUser } = user;
    changed = true;
    return safeUser;
  });
  if (changed) writeUsers(safeUsers);
}

export function logout() {
  const token = storage.get(SESSION_KEY, null)?.token;
  if (token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: '{}',
    }).catch(() => {});
  }
  storage.remove(SESSION_KEY);
}

export function getSession() {
  const s = storage.get(SESSION_KEY, null);
  if (!s?.userId) return null;
  const user = readUsers().find((u) => u.id === s.userId);
  return user ? { ...s, user } : null;
}

export function updateUser(id, patch) {
  const users = readUsers();
  const i = users.findIndex((u) => u.id === id);
  if (i < 0) return null;
  users[i] = { ...users[i], ...patch };
  writeUsers(users);
  return users[i];
}

export function updateStudentPassword(email, password) {
  const user = findUser(email);
  if (!user || user.role !== 'student') return false;
  const users = readUsers().map((entry) => {
    if (entry.id !== user.id) return entry;
    const { passwordDemo, ...safeUser } = entry;
    return safeUser;
  });
  writeUsers(users);
  return true;
}

/* ------------------------- profile / progress persistence ------------------------- */

export const loadProfile = (userId) => storage.get(`profile:${userId}`, null);
export const saveProfile = (userId, profile) => storage.set(`profile:${userId}`, profile);
export const loadProgress = (userId) => storage.get(`progress:${userId}`, null);
export const saveProgress = (userId, progress) => storage.set(`progress:${userId}`, progress);

/**
 * One-click "Hackathon Demo": loads the complete sample student (profile, resume,
 * roadmap progress, interview history, applications) so the whole product can be
 * demonstrated in minutes.
 */
export function loadDemoStudent() {
  const users = readUsers();
  let user = users.find((u) => u.email === DEMO_USER.email);
  if (!user) {
    user = { ...DEMO_USER, name: DEMO_PROFILE.personal.name, onboarded: true };
    users.push(user);
    writeUsers(users);
  } else {
    user = { ...user, ...DEMO_USER, onboarded: true };
    writeUsers(users.map((u) => (u.id === user.id ? user : u)));
  }

  const profile = structuredClone(DEMO_PROFILE);
  profile.onboarded = true; // the demo student has already completed onboarding
  const progress = structuredClone(DEMO_PROGRESS);
  progress.onboardedAt = new Date(Date.now() - 20 * 86400000).toISOString();
  progress.roadmapDoneIds = DEMO_ROADMAP_DONE;
  progress.streak = { count: 5, lastActive: new Date().toISOString() };
  // Interview/resume timestamps in DEMO_PROGRESS are already relative to `now`.
  progress.resume = { ...progress.resume, updatedAt: new Date(Date.now() - 3 * 86400000).toISOString() };

  // Seed the notification centre with the same engine the app runs after onboarding,
  // so the demo student lands with a realistic (clearly sample) activity feed.
  try {
    const career = CAREER_BY_ID[profile.targetCareer];
    const roadmap = progress.roadmap || (career ? generateRoadmap(career, {}) : null);
    if (roadmap) progress.roadmap = roadmap;
    if (career && roadmap) {
      const derived = computeDerived(profile, progress);
      const gaps = getSkillGaps(career, derived.skillMap);
      const matches = getCareerMatches(profile, derived.skillMap).slice(0, 3);
      progress.notifications = buildInitialNotifications({ derived, gaps, matches, roadmap });
    }
  } catch {
    progress.notifications = progress.notifications || [];
  }

  saveProfile(user.id, profile);
  saveProgress(user.id, progress);
  storage.set(SESSION_KEY, { userId: user.id, role: 'student', at: Date.now(), demo: true });
  return { ok: true, user, profile, progress };
}

export const DEMO_CREDENTIALS = {
  student: { email: DEMO_USER.email, password: DEMO_USER.passwordDemo },
};

export default { signup, login, logout, getSession, loadDemoStudent, listUsers, updateUser };
