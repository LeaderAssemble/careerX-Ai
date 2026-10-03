import { JOBS, INTERNSHIPS } from '../data/opportunities';
import { GOV_OPPORTUNITIES, GOV_CATEGORIES } from '../data/govOpportunities';
import { matchOpportunity, matchGovernment } from './careerService';
import { SKILL_BY_ID } from '../data/catalog';
import { CITIES } from '../data/catalog';
import { getEligiblePublishedRecords, listPublishedRecords, refreshPublishedContent, toOpportunity } from './publishedContentService';

/**
 * jobService — opportunity matching for jobs, internships and government listings.
 *
 * ALL DATA IN THIS BUILD IS SAMPLE/DEMO. Nothing here is a live vacancy.
 *
 * INTEGRATION POINT: replace the static arrays with a real feed:
 *   const res = await fetch('/api/opportunities?type=internship&skills=sql,react');
 * Keep `matchOpportunity()` as the ranking layer so the UI stays unchanged, and add a
 * `source: 'live' | 'sample'` field per item so the UI can label provenance honestly.
 */

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ *
 * Demo feed controls (admin). An institution admin can hide or pin sample
 * listings for students using THIS browser. Stored under `careerx.adminFeed`.
 * INTEGRATION POINT: in production this becomes a server-side moderation flag
 * per listing (`status: 'published' | 'hidden'`) with role-checked writes.
 * ------------------------------------------------------------------ */
const FEED_KEY = 'careerx.adminFeed';

function sessionToken() {
  try { return JSON.parse(localStorage.getItem('careerx:v1:session') || '{}').token || ''; } catch { return ''; }
}

function readFeed() {
  try {
    const raw = window.localStorage.getItem(FEED_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [], pinned: Array.isArray(parsed.pinned) ? parsed.pinned : [] };
  } catch { return { hidden: [], pinned: [] }; }
}

export function getFeedConfig() { return readFeed(); }

export function resetFeedConfig() {
  const config = { hidden: [], pinned: [] };
  try { window.localStorage.setItem(FEED_KEY, JSON.stringify(config)); } catch { /* storage full/blocked */ }
  saveFeedConfig(config);
  return config;
}

export async function refreshFeedConfig() {
  const token = sessionToken();
  if (!token) return false;
  try {
    const response = await fetch('/api/admin-feed', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return false;
    const { config } = await response.json();
    window.localStorage.setItem(FEED_KEY, JSON.stringify(config));
    return true;
  } catch { return false; }
}

function saveFeedConfig(config) {
  const token = sessionToken();
  if (!token) return;
  fetch('/api/admin-feed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(config),
  }).catch(() => {});
}

export function setFeedHidden(id, hidden = true) {
  const cfg = readFeed();
  const next = hidden ? [...new Set([...cfg.hidden, id])] : cfg.hidden.filter((x) => x !== id);
  const updated = { ...cfg, hidden: next };
  try { window.localStorage.setItem(FEED_KEY, JSON.stringify(updated)); } catch { /* storage full/blocked */ }
  saveFeedConfig(updated);
  return updated;
}

export function setFeedPinned(id, pinned = true) {
  const cfg = readFeed();
  const next = pinned ? [...new Set([...cfg.pinned, id])] : cfg.pinned.filter((x) => x !== id);
  const updated = { ...cfg, pinned: next };
  try { window.localStorage.setItem(FEED_KEY, JSON.stringify(updated)); } catch { /* storage full/blocked */ }
  saveFeedConfig(updated);
  return updated;
}

const applyFeed = (rows) => {
  const cfg = readFeed();
  const visible = rows.filter((r) => !cfg.hidden.includes(r.id));
  const pinRank = (r) => (cfg.pinned.includes(r.id) ? 0 : 1);
  return [...visible].sort((a, b) => pinRank(a) - pinRank(b));
};


export async function getOpportunities({ type = 'all', simulate = true, profile = null } = {}) {
  if (simulate) await delay(320);
  await Promise.all([refreshPublishedContent(), refreshFeedConfig()]);
  const published = profile
    ? getEligiblePublishedRecords(type === 'all' ? null : type, profile).filter((record) => ['job', 'internship'].includes(record.kind)).map(toOpportunity)
    : listPublishedRecords().filter((record) => record.status === 'published' && ['job', 'internship'].includes(record.kind) && (type === 'all' || record.kind === type)).map(toOpportunity);
  if (type === 'job') return applyFeed([...JOBS, ...published.filter((item) => item.type === 'job')]);
  if (type === 'internship') return applyFeed([...INTERNSHIPS, ...published.filter((item) => item.type === 'internship')]);
  return applyFeed([...JOBS, ...INTERNSHIPS, ...published]);
}

export function opportunityApplyUrl(opportunity) {
  if (opportunity?.applyUrl || opportunity?.url) return opportunity.applyUrl || opportunity.url;
  const role = encodeURIComponent(opportunity?.t?.[0] || 'entry level');
  const location = encodeURIComponent(opportunity?.loc?.[0] || 'India');
  return `https://www.linkedin.com/jobs/search/?keywords=${role}&location=${location}`;
}

export async function getGovOpportunities({ simulate = true, profile = null } = {}) {
  if (simulate) await delay(260);
  await Promise.all([refreshPublishedContent(), refreshFeedConfig()]);
  const published = profile
    ? getEligiblePublishedRecords('government', profile).map(toOpportunity)
    : listPublishedRecords().filter((record) => record.status === 'published' && record.kind === 'government').map(toOpportunity);
  return applyFeed([...GOV_OPPORTUNITIES, ...published]);
}

export function rankOpportunities(list = [], ctx = {}) {
  return list.map((o) => matchOpportunity(o, ctx)).sort((a, b) => b.match - a.match);
}

export function rankGov(list = [], ctx = {}) {
  return list.map((o) => matchGovernment(o, ctx)).sort((a, b) => b.match - a.match);
}

export function filterOpportunities(list = [], f = {}) {
  const { location = 'all', role = 'all', skill = 'all', mode = 'all', minMatch = 0, q = '' } = f;
  const term = String(q || '').trim().toLowerCase();
  return list.filter((o) => {
    if (location !== 'all' && o.loc?.[0] !== location) return false;
    if (mode !== 'all' && o.mode !== mode) return false;
    if (skill !== 'all' && !(o.skills || []).includes(skill)) return false;
    if (minMatch && (o.match || 0) < minMatch) return false;
    if (role !== 'all') {
      const hay = `${o.t?.[0] || ''} ${o.sector?.[0] || ''}`.toLowerCase();
      if (!hay.includes(role.toLowerCase())) return false;
    }
    if (term) {
      const hay = `${o.t?.[0]} ${o.t?.[1]} ${o.co?.[0]} ${o.co?.[1]} ${o.loc?.[0]} ${(o.skills || []).map((s) => SKILL_BY_ID[s]?.n?.[0]).join(' ')}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
}

export function filterGov(list = [], f = {}) {
  const { category = 'all', qualification = 'all', q = '' } = f;
  const term = String(q || '').trim().toLowerCase();
  return list.filter((o) => {
    if (category !== 'all' && o.cat !== category) return false;
    if (qualification !== 'all' && !(o.fit || []).some((x) => x.toLowerCase().includes(qualification.toLowerCase()))) return false;
    if (term) {
      const hay = `${o.t?.[0]} ${o.t?.[1]} ${o.org} ${(o.qual || []).join(' ')}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
}

/** Distinct role words for the role filter (kept honest: derived from the sample feed). */
export function roleFacets(list = []) {
  const counts = {};
  list.forEach((o) => {
    const key = o.sector?.[0] || 'Other';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).map(([label, n]) => ({ label, n }));
}

export function locationFacets(list = []) {
  const set = new Set(list.map((o) => o.loc?.[0]).filter(Boolean));
  return [...set].map((city) => {
    const found = CITIES.find((c) => c[0] === city);
    return { value: city, label: found || [city, city] };
  });
}

export function skillFacets(list = []) {
  const counts = {};
  list.forEach((o) => (o.skills || []).forEach((s) => { counts[s] = (counts[s] || 0) + 1; }));
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, n]) => ({ id, n, label: SKILL_BY_ID[id]?.n || [id, id] }));
}

export function byId(id) {
  return [...JOBS, ...INTERNSHIPS].find((o) => o.id === id) || null;
}

export function govById(id) {
  return GOV_OPPORTUNITIES.find((o) => o.id === id) || null;
}

export { GOV_CATEGORIES };
export default { getOpportunities, getGovOpportunities, rankOpportunities, rankGov, filterOpportunities, filterGov, getFeedConfig, setFeedHidden, setFeedPinned };
