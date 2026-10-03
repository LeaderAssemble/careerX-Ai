import { uid } from '../lib/utils';

const STORAGE_KEY = 'careerx.publishedContent';

function readStore() {
  try {
    const data = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      records: Array.isArray(data.records) ? data.records : [],
      history: Array.isArray(data.history) ? data.history : [],
    };
  } catch {
    return { records: [], history: [] };
  }
}

function writeStore(store) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

function sessionToken() {
  try { return JSON.parse(localStorage.getItem('careerx:v1:session') || '{}').token || ''; } catch { return ''; }
}

function sessionRole() {
  try { return JSON.parse(localStorage.getItem('careerx:v1:session') || '{}').role || ''; } catch { return ''; }
}

function apiRequest(path, token, options = {}) {
  return fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
}

export async function refreshPublishedContent() {
  try {
    let response = await fetch('/api/published-content');
    if (!response.ok) return false;
    let { records = [] } = await response.json();
    const legacyRecords = readStore().records;
    const token = sessionToken();
    if (!records.length && legacyRecords.length && token && sessionRole() === 'admin') {
      for (const record of legacyRecords) {
        await apiRequest('/api/published-content', token, {
          method: 'POST', body: JSON.stringify({ record }),
        });
      }
      response = await fetch('/api/published-content');
      if (!response.ok) return false;
      ({ records = [] } = await response.json());
    }
    return writeStore({ ...readStore(), records });
  } catch { return false; }
}

export async function refreshPublishHistory() {
  const token = sessionToken();
  if (!token) return false;
  try {
    const response = await apiRequest('/api/publish-history', token);
    if (!response.ok) return false;
    const { history = [] } = await response.json();
    return writeStore({ ...readStore(), history });
  } catch { return false; }
}

function addHistory(store, record, action, admin) {
  return [{
    id: uid('pub-event'),
    recordId: record.id,
    title: record.title,
    kind: record.kind,
    source: record.source,
    action,
    adminName: admin?.name || admin?.email || 'Admin',
    adminEmail: admin?.email || '',
    at: new Date().toISOString(),
  }, ...store.history].slice(0, 500);
}

export function listPublishedRecords() {
  const store = readStore();
  return [...store.records].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function listPublishHistory() {
  return readStore().history;
}

export async function saveAndPublishRecord(input, admin) {
  const store = readStore();
  const now = new Date().toISOString();
  const record = {
    ...input,
    id: input.id || uid('published'),
    title: String(input.title || '').trim(),
    kind: input.kind,
    status: 'published',
    eligibility: input.eligibility || {},
    skills: Array.isArray(input.skills) ? input.skills : [],
    publishedBy: admin?.email || '',
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
  const token = sessionToken();
  if (!token) return { ok: false, error: 'unauthorized' };
  try {
    const response = await apiRequest('/api/published-content', token, {
      method: 'POST', body: JSON.stringify({ record }),
    });
    if (!response.ok) return { ok: false, error: 'serverUnavailable' };
    const result = await response.json();
    writeStore({
      records: [result.record, ...store.records.filter((item) => item.id !== result.record.id)],
      history: [result.event, ...store.history].slice(0, 500),
    });
    return { ok: true, record: result.record };
  } catch { return { ok: false, error: 'serverUnavailable' }; }
}

export async function setRecordPublished(id, published, admin) {
  await refreshPublishedContent();
  const store = readStore();
  const record = store.records.find((item) => item.id === id);
  if (!record) return { ok: false, error: 'notFound' };
  const updated = { ...record, status: published ? 'published' : 'draft', updatedAt: new Date().toISOString() };
  const token = sessionToken();
  if (!token) return { ok: false, error: 'unauthorized' };
  try {
    const response = await apiRequest('/api/published-content/toggle', token, {
      method: 'POST', body: JSON.stringify({ record: updated }),
    });
    if (!response.ok) return { ok: false, error: 'serverUnavailable' };
    const result = await response.json();
    writeStore({
      records: store.records.map((item) => item.id === id ? result.record : item),
      history: [result.event, ...store.history].slice(0, 500),
    });
    return { ok: true, record: result.record };
  } catch { return { ok: false, error: 'serverUnavailable' }; }
}

export async function deletePublishedRecord(id, admin) {
  await refreshPublishedContent();
  const store = readStore();
  const record = store.records.find((item) => item.id === id);
  if (!record) return { ok: false, error: 'notFound' };
  const token = sessionToken();
  if (!token) return { ok: false, error: 'unauthorized' };
  try {
    const response = await apiRequest('/api/published-content', token, {
      method: 'DELETE', body: JSON.stringify({ id }),
    });
    if (!response.ok) return { ok: false, error: 'serverUnavailable' };
    writeStore({
      records: store.records.filter((item) => item.id !== id),
      history: store.history.filter((event) => event.recordId !== id),
    });
    return { ok: true, record, admin };
  } catch { return { ok: false, error: 'serverUnavailable' }; }
}

export function isEligibleForProfile(record, profile = {}) {
  const rules = record?.eligibility || {};
  const education = profile.education || {};
  const experience = profile.experience || [];
  if (rules.degree && rules.degree !== 'all' && education.degree !== rules.degree) return false;
  if (rules.branch && rules.branch !== 'all' && education.branch !== rules.branch && education.department !== rules.branch) return false;
  if (rules.minCgpa != null && rules.minCgpa !== '' && Number(education.cgpa || 0) < Number(rules.minCgpa)) return false;
  const gradYear = Number(education.gradYear || 0);
  if (rules.gradYearFrom && (!gradYear || gradYear < Number(rules.gradYearFrom))) return false;
  if (rules.gradYearTo && (!gradYear || gradYear > Number(rules.gradYearTo))) return false;
  if (rules.experienceLevel === 'experienced' && experience.length === 0) return false;
  return true;
}

export function getEligiblePublishedRecords(kind, profile) {
  return listPublishedRecords().filter((record) => record.status === 'published'
    && (!kind || record.kind === kind)
    && isEligibleForProfile(record, profile));
}

export function toOpportunity(record) {
  const title = [record.title, record.title];
  const organization = [record.organization || record.provider || record.source, record.organization || record.provider || record.source];
  const city = [record.location || 'India', record.location || 'भारत'];
  const skills = record.skills || [];
  const eligibility = record.eligibility || {};
  const fit = [eligibility.degree, eligibility.branch].filter((value) => value && value !== 'all');

  if (record.kind === 'government') {
    return {
      ...record,
      id: record.id,
      cat: record.category || 'central',
      t: title,
      org: record.organization || record.source,
      site: record.url,
      status: 'published',
      start: null,
      end: null,
      exam: null,
      qual: [record.qualification || (record.experienceLevel === 'experienced' ? 'Relevant experience required' : 'See official notification')],
      age: [record.age || 'See official notification'],
      elig: [record.description || 'See official notification'],
      skills,
      fit: fit.length ? fit : ['All branches'],
      prep: [record.description || 'Check details on the official portal.', record.description || 'आधिकारिक पोर्टल पर जानकारी देखें।'],
    };
  }

  return {
    ...record,
    id: record.id,
    type: record.kind,
    t: title,
    co: organization,
    sector: [record.role || record.source, record.role || record.source],
    loc: city,
    mode: record.mode || 'onsite',
    skills,
    exp: record.experienceLevel === 'experienced' ? 1 : 0,
    comp: [record.compensation || 'See listing', record.compensation || 'लिस्टिंग देखें'],
    posted: 0,
    desc: [record.description || '', record.description || ''],
    sample: false,
    applyUrl: record.url,
  };
}

export function toCourse(record) {
  const description = record.description || '';
  return {
    ...record,
    id: record.id,
    t: [record.title, record.title],
    provider: record.provider || record.source,
    url: record.url,
    skills: record.skills || [],
    diff: record.difficulty || 'beginner',
    weeks: Number(record.weeks || 1),
    hrs: Number(record.hours || 1),
    cert: !!record.certificate,
    free: !!record.free,
    langs: ['English'],
    why: [description || 'Course details are available on the official provider portal.', description || 'कोर्स की जानकारी आधिकारिक प्रदाता पोर्टल पर उपलब्ध है।'],
    careers: [],
  };
}