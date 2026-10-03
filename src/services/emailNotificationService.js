import { getSession } from './authService';

export async function sendPublishedOpportunityEmails(record) {
  const token = getSession()?.token;
  if (!token) return { ok: false };

  try {
    const response = await fetch('/api/notifications/opportunity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ record }),
    });
    const result = await response.json();
    return response.ok ? { ok: true, ...result } : { ok: false };
  } catch {
    return { ok: false };
  }
}