import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import mysql from 'mysql2/promise';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LEGACY_ACCOUNTS_FILE = join(process.cwd(), 'server', 'data', 'auth-users.json');
let pool;

function databaseName() {
  const name = process.env.MYSQL_DATABASE || 'careerx';
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error('MYSQL_DATABASE must contain only letters, numbers, and underscores.');
  return name;
}

function connectionConfig(withDatabase = true) {
  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    ...(withDatabase ? { database: databaseName() } : {}),
    charset: 'utf8mb4',
    timezone: 'Z',
  };
}

function parseJson(value, fallback = {}) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value || 'null') || fallback; } catch { return fallback; }
}

function publicAccount(row) {
  if (!row) return null;
  return { ...parseJson(row.account_json), id: row.id, role: row.role, name: row.name, email: row.email, onboarded: !!row.onboarded };
}

export async function initializeMySql() {
  const config = connectionConfig(false);
  const connection = await mysql.createConnection(config);
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName()}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await connection.end();
  }

  pool = mysql.createPool({
    ...connectionConfig(),
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 5,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
  });

  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    role ENUM('student', 'admin') NOT NULL,
    name VARCHAR(120) NOT NULL,
    password_salt CHAR(32) NOT NULL,
    password_hash CHAR(128) NOT NULL,
    account_json JSON NOT NULL,
    onboarded TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash CHAR(64) NOT NULL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_expiry (expires_at),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS user_data (
    user_id VARCHAR(64) NOT NULL,
    data_key VARCHAR(191) NOT NULL,
    data_value JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, data_key),
    CONSTRAINT fk_user_data_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS published_content (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    kind ENUM('job', 'internship', 'government', 'course') NOT NULL,
    status ENUM('published', 'draft') NOT NULL,
    record_json JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_content_feed (status, kind, updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS shared_data (
    data_key VARCHAR(191) NOT NULL PRIMARY KEY,
    data_value JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS publish_history (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    record_id VARCHAR(191) NOT NULL,
    event_json JSON NOT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_history_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash CHAR(64) NOT NULL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reset_user (user_id),
    CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS password_reset_requests (
    user_id VARCHAR(64) NOT NULL PRIMARY KEY,
    requested_at DATETIME NOT NULL,
    CONSTRAINT fk_reset_request_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.execute("DELETE FROM users WHERE email = 'admin@careerx.com'");
  await migrateLegacyFile();
  const defaultAdminReady = await ensureDefaultAdmin();
  return { defaultAdminReady };
}

export function isMySqlReady() { return !!pool; }

export async function closeMySql() {
  if (!pool) return;
  await pool.end();
  pool = null;
}

export async function pingMySql() {
  if (!pool) return false;
  await pool.query('SELECT 1');
  return true;
}

function getPool() {
  if (!pool) throw new Error('mysqlUnavailable');
  return pool;
}

async function migrateLegacyFile() {
  if (!existsSync(LEGACY_ACCOUNTS_FILE)) return;
  let accounts;
  try { accounts = JSON.parse(readFileSync(LEGACY_ACCOUNTS_FILE, 'utf8')); } catch { return; }
  if (!Array.isArray(accounts)) return;
  for (const account of accounts.slice(0, 500)) {
    if (account?.role !== 'student' || !account?.passwordHash || !account?.passwordSalt || !account?.email || !account?.id) continue;
    const { passwordHash, passwordSalt, passwordDemo, ...data } = account;
    await getPool().execute(
      `INSERT IGNORE INTO users (id, email, role, name, password_salt, password_hash, account_json, onboarded)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [String(account.id), String(account.email).trim().toLowerCase(), 'student', String(account.name || '').slice(0, 120), passwordSalt, passwordHash, JSON.stringify(data), account.onboarded ? 1 : 0]
    );
  }
}

export async function findAccount(email) {
  const [rows] = await getPool().execute('SELECT * FROM users WHERE email = ?', [String(email || '').trim().toLowerCase()]);
  return rows[0] || null;
}

export async function createAccount(input, { preserveId = false } = {}) {
  const email = String(input.email || '').trim().toLowerCase();
  const password = String(input.password || '');
  const role = input.role === 'admin' ? 'admin' : 'student';
  if (!EMAIL_PATTERN.test(email) || password.length < 6 || !String(input.name || '').trim()) return { ok: false, error: 'invalidAccount' };
  const passwordSalt = randomBytes(16).toString('hex');
  const id = preserveId && /^[\w-]{1,128}$/.test(String(input.id || '')) ? String(input.id) : randomUUID();
  const user = {
    id, role, email, name: String(input.name).trim().slice(0, 120),
    college: String(input.college || '').slice(0, 200), degree: String(input.degree || '').slice(0, 100),
    branch: String(input.branch || '').slice(0, 120), gradYear: String(input.gradYear || '').slice(0, 8),
    institution: String(input.institution || '').slice(0, 200), city: String(input.city || '').slice(0, 120),
    placementHead: String(input.placementHead || '').slice(0, 120), contactEmail: String(input.contactEmail || '').slice(0, 254),
    website: String(input.website || '').slice(0, 500), academicYear: String(input.academicYear || '').slice(0, 32),
    cohortNote: String(input.cohortNote || '').slice(0, 500), onboarded: Boolean(input.onboarded),
  };
  try {
    await getPool().execute(
      `INSERT INTO users (id, email, role, name, password_salt, password_hash, account_json, onboarded)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, email, role, user.name, passwordSalt, scryptSync(password, passwordSalt, 64).toString('hex'), JSON.stringify(user), user.onboarded ? 1 : 0]
    );
    return { ok: true, user };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return { ok: false, error: 'emailTaken' };
    throw error;
  }
}

export async function ensureDefaultAdmin() {
  const email = String(process.env.DEFAULT_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.DEFAULT_ADMIN_PASSWORD || '');
  if (!email && !password) return false;
  if (email && !password) return false;
  if (!EMAIL_PATTERN.test(email) || password.length < 10) throw new Error('Default admin configuration is invalid.');

  const existing = await findAccount(email);
  if (existing?.role === 'admin' && await verifyAccountPassword(email, password)) return true;
  const id = existing?.id || randomUUID();
  const name = existing?.name || 'System Administrator';
  const admin = { id, role: 'admin', name, email, onboarded: true };
  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = scryptSync(password, passwordSalt, 64).toString('hex');
  await getPool().execute(
    `INSERT INTO users (id, email, role, name, password_salt, password_hash, account_json, onboarded)
     VALUES (?, ?, 'admin', ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE role = 'admin', name = VALUES(name), password_salt = VALUES(password_salt),
       password_hash = VALUES(password_hash), account_json = VALUES(account_json), onboarded = 1`,
    [id, email, name, passwordSalt, passwordHash, JSON.stringify(admin)]
  );
  if (existing) await getPool().execute('DELETE FROM auth_sessions WHERE user_id = ?', [id]);
  return true;
}

export async function verifyAccountPassword(email, password) {
  const account = await findAccount(email);
  if (!account) return null;
  const candidate = scryptSync(String(password || ''), account.password_salt, 64);
  const expected = Buffer.from(account.password_hash, 'hex');
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return null;
  return publicAccount(account);
}

export async function createSession(userId) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await getPool().execute(
    'INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY))',
    [tokenHash, userId]
  );
  return token;
}

export async function resolveSession(token) {
  if (!token) return null;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const [rows] = await getPool().execute(
    `SELECT u.* FROM auth_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()`, [tokenHash]
  );
  return rows[0] ? publicAccount(rows[0]) : null;
}

export async function revokeSession(token) {
  if (!token) return;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await getPool().execute('DELETE FROM auth_sessions WHERE token_hash = ?', [tokenHash]);
}

export async function migrateLocalAccounts(localAccounts) {
  if (!Array.isArray(localAccounts)) return { imported: 0 };
  let imported = 0;
  for (const account of localAccounts.slice(0, 500)) {
    if (account?.role !== 'student' || !String(account.passwordDemo || '').length) continue;
    const result = await createAccount({ ...account, password: account.passwordDemo, role: 'student' }, { preserveId: true });
    if (result.ok) imported += 1;
  }
  return { imported };
}

export async function getUserData(userId) {
  const [rows] = await getPool().execute('SELECT data_key, data_value FROM user_data WHERE user_id = ?', [userId]);
  return Object.fromEntries(rows.map((row) => [row.data_key, parseJson(row.data_value, null)]));
}

export async function listStudentRecords() {
  const [rows] = await getPool().query("SELECT * FROM users WHERE role = 'student' ORDER BY name, email");
  const students = [];
  for (const row of rows) {
    students.push({ account: publicAccount(row), data: await getUserData(row.id) });
  }
  return students;
}

export async function getStudentRecord(userId) {
  const [rows] = await getPool().execute("SELECT * FROM users WHERE id = ? AND role = 'student'", [userId]);
  if (!rows[0]) return null;
  return { account: publicAccount(rows[0]), data: await getUserData(userId) };
}

export async function putStudentData(userId, key, value) {
  const record = await getStudentRecord(userId);
  if (!record || !key || key.length > 191 || ['users', 'session'].includes(key)) return false;
  const scopedKey = /^(?:profile|progress|adminSettings):(.+)$/.exec(key);
  if (scopedKey && scopedKey[1] !== userId) return false;
  await putUserData(userId, key, value);
  return true;
}

export async function deleteStudent(userId) {
  const [result] = await getPool().execute("DELETE FROM users WHERE id = ? AND role = 'student'", [userId]);
  return result.affectedRows > 0;
}

export async function putUserData(userId, key, value) {
  await getPool().execute(
    `INSERT INTO user_data (user_id, data_key, data_value) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)`,
    [userId, key, JSON.stringify(value)]
  );
}

export async function migrateUserData(userId, entries) {
  if (!Array.isArray(entries)) return;
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    for (const [key, value] of entries.slice(0, 300)) {
      if (typeof key !== 'string' || !key || key.length > 191 || key === 'users' || key === 'session') continue;
      await connection.execute('INSERT IGNORE INTO user_data (user_id, data_key, data_value) VALUES (?, ?, ?)', [userId, key, JSON.stringify(value)]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteUserData(userId, key) {
  if (key) await getPool().execute('DELETE FROM user_data WHERE user_id = ? AND data_key = ?', [userId, key]);
  else await getPool().execute('DELETE FROM user_data WHERE user_id = ?', [userId]);
}

export async function listPublishedContent() {
  const [rows] = await getPool().query('SELECT record_json FROM published_content ORDER BY updated_at DESC');
  return rows.map((row) => parseJson(row.record_json));
}

export async function deletePublishedContent(id = null) {
  if (id) await getPool().execute('DELETE FROM published_content WHERE id = ?', [id]);
  else await getPool().query('DELETE FROM published_content');
}

export async function listEligibleStudentRecipients(record) {
  const [rows] = await getPool().query(
     `SELECT u.name,
       COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(d.data_value, '$.personal.email')), ''), u.email) AS email,
       d.data_value AS profile
     FROM users u LEFT JOIN user_data d ON d.user_id = u.id AND d.data_key = CONCAT('profile:', u.id)
     WHERE u.role = 'student'`
  );
  const rules = record?.eligibility || {};
  return rows.filter((row) => {
    const profile = parseJson(row.profile, {});
    const education = profile.education || {};
    const experience = profile.experience || [];
    if (rules.degree && rules.degree !== 'all' && education.degree !== rules.degree) return false;
    if (rules.branch && rules.branch !== 'all' && education.branch !== rules.branch && education.department !== rules.branch) return false;
    if (rules.minCgpa != null && rules.minCgpa !== '' && Number(education.cgpa || 0) < Number(rules.minCgpa)) return false;
    const gradYear = Number(education.gradYear || 0);
    if (rules.gradYearFrom && (!gradYear || gradYear < Number(rules.gradYearFrom))) return false;
    if (rules.gradYearTo && (!gradYear || gradYear > Number(rules.gradYearTo))) return false;
    if (rules.experienceLevel === 'experienced' && experience.length === 0) return false;
    return EMAIL_PATTERN.test(String(row.email || ''));
  }).map((row) => ({ name: row.name, email: row.email }));
}

export async function savePublishedContent(record, event) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO published_content (id, kind, status, record_json) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE kind = VALUES(kind), status = VALUES(status), record_json = VALUES(record_json)`,
      [record.id, record.kind, record.status, JSON.stringify(record)]
    );
    await connection.execute(
      'INSERT INTO publish_history (id, record_id, event_json, created_at) VALUES (?, ?, ?, ?)',
      [event.id, event.recordId, JSON.stringify(event), new Date(event.at)]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listPublishHistory() {
  const [rows] = await getPool().query('SELECT event_json FROM publish_history ORDER BY created_at DESC LIMIT 500');
  return rows.map((row) => parseJson(row.event_json));
}

export async function setStudentPassword(email, password) {
  const account = await findAccount(email);
  if (!account || account.role !== 'student') return false;
  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = scryptSync(String(password), passwordSalt, 64).toString('hex');
  await getPool().execute('UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?', [passwordSalt, passwordHash, account.id]);
  await getPool().execute('DELETE FROM auth_sessions WHERE user_id = ?', [account.id]);
  return true;
}

export async function issuePasswordReset(email, tokenHash, expiresAt) {
  const account = await findAccount(email);
  if (!account || account.role !== 'student') return { found: false, throttled: false };
  const [previous] = await getPool().execute('SELECT requested_at FROM password_reset_requests WHERE user_id = ?', [account.id]);
  if (previous[0] && Date.now() - new Date(previous[0].requested_at).getTime() < 60000) return { found: true, throttled: true };
  await getPool().execute(
    'INSERT INTO password_reset_requests (user_id, requested_at) VALUES (?, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE requested_at = VALUES(requested_at)',
    [account.id]
  );
  await getPool().execute('DELETE FROM password_reset_tokens WHERE user_id = ?', [account.id]);
  await getPool().execute('INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)', [tokenHash, account.id, expiresAt]);
  return { found: true, throttled: false, account };
}

export async function consumePasswordReset(email, tokenHash, password) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT t.user_id FROM password_reset_tokens t JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = ? AND u.email = ? AND u.role = 'student' AND t.expires_at > UTC_TIMESTAMP() FOR UPDATE`,
      [tokenHash, String(email).trim().toLowerCase()]
    );
    if (!rows[0]) {
      await connection.rollback();
      return false;
    }
    const userId = rows[0].user_id;
    const passwordSalt = randomBytes(16).toString('hex');
    const passwordHash = scryptSync(String(password), passwordSalt, 64).toString('hex');
    await connection.execute('UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?', [passwordSalt, passwordHash, userId]);
    await connection.execute('DELETE FROM password_reset_tokens WHERE token_hash = ?', [tokenHash]);
    await connection.execute('DELETE FROM auth_sessions WHERE user_id = ?', [userId]);
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getSharedData(key, fallback = null) {
  const [rows] = await getPool().execute('SELECT data_value FROM shared_data WHERE data_key = ?', [key]);
  return rows[0] ? parseJson(rows[0].data_value, fallback) : fallback;
}

export async function putSharedData(key, value) {
  await getPool().execute(
    `INSERT INTO shared_data (data_key, data_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)`,
    [key, JSON.stringify(value)]
  );
}

export async function deleteAccount(userId) {
  await getPool().execute('DELETE FROM users WHERE id = ?', [userId]);
}
