import storage from '../lib/storage';

export async function fetchAdminJobFeeds(kind) {
  const token = storage.get('session', null)?.token;
  if (!token) throw new Error('adminSessionRequired');
  const response = await fetch(`/api/job-feeds?kind=${encodeURIComponent(kind)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'feedRequestFailed');
  return {
    items: Array.isArray(result.items) ? result.items : [],
    unconfigured: Array.isArray(result.unconfigured) ? result.unconfigured : [],
    errors: Array.isArray(result.errors) ? result.errors : [],
  };
}
