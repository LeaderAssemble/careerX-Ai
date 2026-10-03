import assert from 'node:assert/strict';
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  closeMySql, createAccount, createSession, deleteAccount, initializeMySql,
  putUserData, verifyAccountPassword,
} from '../server/mysqlStore.js';

const suffix = randomUUID();
const adminEmail = `careerx-admin-smoke-${suffix}@example.test`;
const adminPassword = 'Temporary-Admin-Smoke-Password-7';
const apiUrl = process.env.SMOKE_API_URL || 'http://localhost:5173';
let adminId;
let studentId;

try {
  process.env.DEFAULT_ADMIN_EMAIL = adminEmail;
  process.env.DEFAULT_ADMIN_PASSWORD = adminPassword;
  const initialization = await initializeMySql();
  assert.equal(initialization.defaultAdminReady, true, 'env-based admin bootstrap should provision an admin');

  const admin = await verifyAccountPassword(adminEmail, adminPassword);
  assert.equal(admin?.role, 'admin', 'bootstrapped credentials should authenticate as admin');
  adminId = admin.id;
  const token = await createSession(admin.id);

  const studentResult = await createAccount({
    name: 'Temporary Student',
    email: `careerx-student-smoke-${suffix}@example.test`,
    password: 'Temporary-Student-Smoke-Password-8',
    role: 'student',
    college: 'Smoke College',
    degree: 'B.Tech',
    branch: 'CSE',
    gradYear: '2027',
  });
  assert.equal(studentResult.ok, true, 'smoke student should be created');
  studentId = studentResult.user.id;
  await putUserData(studentId, `profile:${studentId}`, { education: { branch: 'CSE', gradYear: 2027 } });

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const listResponse = await fetch(`${apiUrl}/api/admin/students`, { headers });
  const listResult = await listResponse.json();
  assert.equal(listResponse.status, 200, 'admin should list students');
  assert.ok(listResult.students.some((entry) => entry.account.id === studentId), 'student list should include registered students');

  const editResponse = await fetch(`${apiUrl}/api/admin/students/${studentId}/data`, {
    method: 'POST', headers,
    body: JSON.stringify({ key: `progress:${studentId}`, value: { applications: [{ id: 'smoke-test' }] } }),
  });
  assert.equal(editResponse.status, 200, 'admin should edit student data');
  const detailResponse = await fetch(`${apiUrl}/api/admin/students/${studentId}`, { headers });
  const detail = await detailResponse.json();
  assert.equal(detail.student.data[`progress:${studentId}`].applications.length, 1, 'admin edits should persist');

  const deleteResponse = await fetch(`${apiUrl}/api/admin/students/${studentId}`, { method: 'DELETE', headers });
  assert.equal(deleteResponse.status, 200, 'admin should delete student accounts');
  studentId = null;

  const unauthorized = await fetch(`${apiUrl}/api/admin/students`);
  assert.equal(unauthorized.status, 403, 'unauthenticated users must not list student records');
  const adminSignup = await fetch(`${apiUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Blocked Admin', email: `blocked-${suffix}@example.test`, password: adminPassword, role: 'admin' }),
  });
  assert.equal(adminSignup.status, 403, 'public signup must not create admins');

  console.log('bootstrap=pass; adminStudentList=pass; edit=pass; delete=pass; unauthorizedDenied=pass; publicAdminSignupDenied=pass');
} finally {
  if (studentId) await deleteAccount(studentId);
  if (adminId) await deleteAccount(adminId);
  await closeMySql();
}