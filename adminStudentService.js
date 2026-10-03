import storage from '../lib/storage';

function authHeaders() {
  const token = storage.get('session', null)?.token;
  if (!token) throw new Error('adminSessionRequired');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function readResponse(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'requestFailed');
  return result;
}

export async function listAdminStudents() {
  const result = await readResponse(await fetch('/api/admin/students', { headers: authHeaders() }));
  return result.students || [];
}

export async function saveAdminStudentData(id, key, value) {
  return readResponse(await fetch(`/api/admin/students/${encodeURIComponent(id)}/data`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ key, value }),
  }));
}

export async function deleteAdminStudent(id) {
  return readResponse(await fetch(`/api/admin/students/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }));
}
