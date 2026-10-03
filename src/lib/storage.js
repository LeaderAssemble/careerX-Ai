/**
 * Local cache with authenticated MySQL sync.
 *
 * Reads stay synchronous for existing screens; writes update the local cache and
 * sync to the authenticated account's MySQL data store in the background.
 */
const NS = 'careerx:v1';

function safeParse(raw, fallback) {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function activeToken() {
  try {
    const session = safeParse(localStorage.getItem(`${NS}:session`), null);
    return session?.token || '';
  } catch { return ''; }
}

function authorizedRequest(path, token, options = {}) {
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

function syncWrite(key, value) {
  const token = activeToken();
  if (!token || ['users', 'session'].includes(key)) return;
  authorizedRequest('/api/data', token, { method: 'POST', body: JSON.stringify({ key, value }) })
    .catch((error) => console.warn('[CareerX] MySQL sync unavailable:', error?.message || error));
}

export const storage = {
  key: (k) => `${NS}:${k}`,

  get(k, fallback = null) {
    try {
      return safeParse(localStorage.getItem(storage.key(k)), fallback);
    } catch {
      return fallback;
    }
  },

  set(k, value) {
    try {
      localStorage.setItem(storage.key(k), JSON.stringify(value));
      syncWrite(k, value);
      return true;
    } catch (e) {
      // Quota exceeded / private mode — keep the app usable in memory.
      console.warn('[CareerX] storage.set failed:', e?.message || e);
      return false;
    }
  },

  remove(k) {
    try {
      localStorage.removeItem(storage.key(k));
      const token = activeToken();
      if (token && !['users', 'session'].includes(k)) {
        authorizedRequest('/api/data', token, { method: 'DELETE', body: JSON.stringify({ key: k }) }).catch(() => {});
      }
    } catch { /* noop */ }
  },

  async migrateLocalData(token, userId) {
    const entries = [];
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const fullKey = localStorage.key(index);
        if (!fullKey?.startsWith(`${NS}:`)) continue;
        const key = fullKey.slice(NS.length + 1);
        if (['users', 'session'].includes(key)) continue;
        const scoped = /^(?:profile|progress|adminSettings):(.+)$/.exec(key);
        if (scoped && scoped[1] !== userId) continue;
        entries.push([key, safeParse(localStorage.getItem(fullKey), null)]);
      }
      const response = await authorizedRequest('/api/data/migrate', token, {
        method: 'POST', body: JSON.stringify({ entries }),
      });
      return response.ok;
    } catch { return false; }
  },

  async syncFromMySql(token) {
    try {
      const response = await authorizedRequest('/api/data', token);
      if (!response.ok) return false;
      const { data = {} } = await response.json();
      Object.entries(data).forEach(([key, value]) => {
        if (!['users', 'session'].includes(key)) localStorage.setItem(storage.key(key), JSON.stringify(value));
      });
      return true;
    } catch { return false; }
  },

  /** Remove every CareerX key (used by Profile → Delete all my data). */
  async clearAll() {
    try {
      const token = activeToken();
      if (token) {
        const response = await authorizedRequest('/api/auth/account', { method: 'POST', body: '{}' });
        if (!response.ok) throw new Error('remoteDeleteFailed');
      }
      const doomed = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(NS) || ['careerx.adminFeed', 'careerx.publishedContent'].includes(k))) doomed.push(k);
      }
      doomed.forEach((k) => localStorage.removeItem(k));
      return doomed.length;
    } catch {
      throw new Error('remoteDeleteFailed');
    }
  },
};

export default storage;
