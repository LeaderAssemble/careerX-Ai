import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDirectory = join(dirname(fileURLToPath(import.meta.url)), 'data');
const dataFile = join(dataDirectory, 'auth-users.json');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readAccounts() {
  if (!existsSync(dataFile)) return [];
  const parsed = JSON.parse(readFileSync(dataFile, 'utf8'));
  return Array.isArray(parsed) ? parsed : [];
}

function writeAccounts(accounts) {
  mkdirSync(dataDirectory, { recursive: true });
  const temporaryFile = `${dataFile}.tmp`;
  writeFileSync(temporaryFile, JSON.stringify(accounts, null, 2), { mode: 0o600 });
  renameSync(temporaryFile, dataFile);
}

export function publicAccount(account) {
  if (!account) return null;
  const { passwordHash, passwordSalt, ...safeAccount } = account;
  return safeAccount;
}

export function findAccount(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  return readAccounts().find((account) => account.email === normalizedEmail) || null;
}

export function createAccount(input, { preserveId = false } = {}) {
  const email = String(input.email || '').trim().toLowerCase();
  const password = String(input.password || '');
  const role = input.role === 'admin' ? 'admin' : 'student';
  if (!emailPattern.test(email) || password.length < 6 || !String(input.name || '').trim()) {
    return { ok: false, error: 'invalidAccount' };
  }
  const accounts = readAccounts();
  if (accounts.some((account) => account.email === email)) return { ok: false, error: 'emailTaken' };

  const passwordSalt = randomBytes(16).toString('hex');
  const account = {
    id: preserveId && /^[\w-]{1,128}$/.test(String(input.id || '')) ? String(input.id) : randomUUID(),
    role,
    name: String(input.name).trim().slice(0, 120),
    email,
    passwordSalt,
    passwordHash: scryptSync(password, passwordSalt, 64).toString('hex'),
    college: String(input.college || '').slice(0, 200),
    degree: String(input.degree || '').slice(0, 100),
    branch: String(input.branch || '').slice(0, 120),
    gradYear: String(input.gradYear || '').slice(0, 8),
    institution: String(input.institution || '').slice(0, 200),
    city: String(input.city || '').slice(0, 120),
    placementHead: String(input.placementHead || '').slice(0, 120),
    contactEmail: String(input.contactEmail || '').slice(0, 254),
    website: String(input.website || '').slice(0, 500),
    academicYear: String(input.academicYear || '').slice(0, 32),
    cohortNote: String(input.cohortNote || '').slice(0, 500),
    onboarded: Boolean(input.onboarded),
    createdAt: new Date().toISOString(),
  };
  accounts.push(account);
  writeAccounts(accounts);
  return { ok: true, user: publicAccount(account) };
}

export function verifyAccountPassword(email, password) {
  const account = findAccount(email);
  if (!account || !account.passwordSalt || !account.passwordHash) return null;
  const candidate = scryptSync(String(password || ''), account.passwordSalt, 64);
  const expected = Buffer.from(account.passwordHash, 'hex');
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return null;
  return publicAccount(account);
}

export function setStudentPassword(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const accounts = readAccounts();
  const account = accounts.find((entry) => entry.email === normalizedEmail && entry.role === 'student');
  if (!account) return false;
  account.passwordSalt = randomBytes(16).toString('hex');
  account.passwordHash = scryptSync(String(password), account.passwordSalt, 64).toString('hex');
  writeAccounts(accounts);
  return true;
}

export function migrateLocalAccounts(localAccounts) {
  if (!Array.isArray(localAccounts)) return { imported: 0 };
  let imported = 0;
  for (const account of localAccounts.slice(0, 500)) {
    if (!['student', 'admin'].includes(account?.role) || !String(account.passwordDemo || '').length) continue;
    const result = createAccount({ ...account, email: account.email, password: account.passwordDemo }, { preserveId: true });
    if (result.ok) imported += 1;
  }
  return { imported };
}