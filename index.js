import 'dotenv/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import nodemailer from 'nodemailer';
import { getListingsFromFeeds } from './jobFeedService.js';
import {
  createAccount, createSession, deleteAccount, deletePublishedContent, deleteUserData, getUserData, initializeMySql,
  deleteStudent, getSharedData, getStudentRecord, isMySqlReady, issuePasswordReset, listEligibleStudentRecipients, listPublishHistory, listPublishedContent, listStudentRecords,
  migrateLocalAccounts, migrateUserData, pingMySql, putSharedData, putStudentData, putUserData, resolveSession,
  revokeSession, savePublishedContent, consumePasswordReset, verifyAccountPassword,
} from './mysqlStore.js';

const port = Number(process.env.PORT || 4174);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const resetTokenLifetimeMs = 20 * 60 * 1000;
let databaseReady = false;
let defaultAdminReady = false;

function respond(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('payloadTooLarge'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('invalidJson')); }
    });
    request.on('error', reject);
  });
}

function createMailer() {
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_APP_PASSWORD?.replace(/\s/g, '');
  if (!user || !password) return null;
  return nodemailer.createTransport({ service: 'gmail', auth: { user, pass: password } });
}

function emailHtml(record, name) {
  const title = escapeHtml(record.title);
  const organization = escapeHtml(record.organization || record.provider || record.source);
  const kind = escapeHtml(record.kind);
  const url = escapeHtml(record.url);
  const greeting = escapeHtml(name || 'there');
  return `<div style="font-family:Arial,sans-serif;color:#172033;line-height:1.6;max-width:600px;margin:auto"><h2 style="color:#0369a1">A new ${kind} opportunity is available</h2><p>Hello ${greeting},</p><p><strong>${title}</strong>${organization ? ` from ${organization}` : ''} has been published for eligible students on CareerX.</p><p><a href="${url}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:11px 18px;border-radius:6px">View opportunity</a></p><p style="font-size:12px;color:#64748b">You received this because your CareerX profile matches this listing.</p></div>`;
}

async function sendNotifications(record, recipients, mailer) {
  let sent = 0;
  for (let offset = 0; offset < recipients.length; offset += 5) {
    const batch = recipients.slice(offset, offset + 5);
    const results = await Promise.all(batch.map(async (recipient) => {
      try {
        await mailer.sendMail({
          from: `CareerX Updates <${process.env.SMTP_USER}>`,
          to: recipient.email,
          subject: `New ${record.kind} opportunity: ${record.title}`,
          text: `Hello ${recipient.name || 'there'},\n\n${record.title} has been published on CareerX. View details: ${record.url}`,
          html: emailHtml(record, recipient.name),
        });
        return true;
      } catch (error) {
        console.error('Opportunity email delivery failed:', error?.code || 'smtpError');
        return false;
      }
    }));
    sent += results.filter(Boolean).length;
  }
  return sent;
}

async function handleRequest(request, response) {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const adminStudentMatch = /^\/api\/admin\/students(?:\/([^/]+))?(?:\/data)?$/.exec(pathname);
  if (request.method === 'GET' && pathname === '/api/health') {
    return respond(response, 200, {
      ok: true,
      mailConfigured: !!createMailer(),
      databaseConfigured: isMySqlReady(),
      databaseReady: await pingMySql().catch(() => false),
      defaultAdminReady,
    });
  }
  const allowed = (request.method === 'GET' && ['/api/data', '/api/admin-feed', '/api/job-feeds', '/api/published-content', '/api/publish-history'].includes(pathname))
    || (request.method === 'GET' && !!adminStudentMatch)
    || (request.method === 'POST' && [
      '/api/notifications/opportunity', '/api/auth/forgot-password', '/api/auth/reset-password',
      '/api/auth/login', '/api/auth/signup', '/api/auth/migrate', '/api/auth/logout', '/api/data',
      '/api/data/migrate', '/api/published-content', '/api/published-content/toggle',
      '/api/admin-feed', '/api/auth/account',
    ].includes(pathname))
    || (request.method === 'POST' && !!adminStudentMatch && pathname.endsWith('/data'))
    || (request.method === 'DELETE' && (['/api/data', '/api/published-content'].includes(pathname) || (!!adminStudentMatch && !!adminStudentMatch[1])));
  if (!allowed) {
    return respond(response, 404, { error: 'notFound' });
  }

  const origin = request.headers.origin;
  if (origin) {
    try {
      if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) {
        return respond(response, 403, { error: 'localDevelopmentOnly' });
      }
    } catch {
      return respond(response, 403, { error: 'invalidOrigin' });
    }
  }

  if (['/api/data', '/api/admin-feed', '/api/job-feeds', '/api/published-content', '/api/publish-history'].includes(pathname)
    || pathname.startsWith('/api/admin/students')
    || pathname.startsWith('/api/auth/')) {
    if (!databaseReady) return respond(response, 503, { error: 'mysqlUnavailable' });
  }

  if (request.method === 'GET' && pathname === '/api/published-content') {
    return respond(response, 200, { records: await listPublishedContent() });
  }

  const bearer = /^Bearer\s+(.+)$/i.exec(String(request.headers.authorization || ''));
  const sessionToken = bearer?.[1] || '';
  const sessionUser = sessionToken ? await resolveSession(sessionToken) : null;

  if (request.method === 'GET' && pathname === '/api/admin-feed') {
    if (!sessionUser) return respond(response, 401, { error: 'unauthorized' });
    return respond(response, 200, { config: await getSharedData('admin-feed', { hidden: [], pinned: [] }) });
  }

  if (request.method === 'GET' && pathname === '/api/job-feeds') {
    if (!sessionUser || sessionUser.role !== 'admin') return respond(response, 403, { error: 'forbidden' });
    const kind = new URL(request.url, 'http://localhost').searchParams.get('kind') || '';
    if (!['job', 'internship', 'government'].includes(kind)) return respond(response, 400, { error: 'invalidFeedKind' });
    return respond(response, 200, await getListingsFromFeeds(kind));
  }

  if (request.method === 'GET' && pathname === '/api/data') {
    if (!sessionUser) return respond(response, 401, { error: 'unauthorized' });
    return respond(response, 200, { data: await getUserData(sessionUser.id) });
  }

  if (request.method === 'GET' && pathname === '/api/publish-history') {
    if (!sessionUser || sessionUser.role !== 'admin') return respond(response, 403, { error: 'forbidden' });
    return respond(response, 200, { history: await listPublishHistory() });
  }

  if (request.method === 'GET' && adminStudentMatch) {
    if (!sessionUser || sessionUser.role !== 'admin') return respond(response, 403, { error: 'forbidden' });
    if (!adminStudentMatch[1]) return respond(response, 200, { students: await listStudentRecords() });
    const student = await getStudentRecord(decodeURIComponent(adminStudentMatch[1]));
    return student ? respond(response, 200, { student }) : respond(response, 404, { error: 'studentNotFound' });
  }

  let payload;
  try { payload = request.method === 'GET' ? {} : await readJson(request); } catch (error) {
    return respond(response, error.message === 'payloadTooLarge' ? 413 : 400, { error: error.message });
  }

  if (pathname === '/api/admin-feed' && request.method === 'POST') {
    if (!sessionUser || sessionUser.role !== 'admin') return respond(response, 403, { error: 'forbidden' });
    const config = {
      hidden: [...new Set(Array.isArray(payload.hidden) ? payload.hidden.filter((id) => typeof id === 'string').slice(0, 1000) : [])],
      pinned: [...new Set(Array.isArray(payload.pinned) ? payload.pinned.filter((id) => typeof id === 'string').slice(0, 1000) : [])],
    };
    await putSharedData('admin-feed', config);
    return respond(response, 200, { config });
  }

  if (adminStudentMatch && request.method === 'POST' && pathname.endsWith('/data')) {
    if (!sessionUser || sessionUser.role !== 'admin') return respond(response, 403, { error: 'forbidden' });
    const studentId = decodeURIComponent(adminStudentMatch[1] || '');
    const saved = await putStudentData(studentId, String(payload.key || ''), payload.value);
    return saved ? respond(response, 200, { ok: true }) : respond(response, 400, { error: 'invalidStudentData' });
  }

  if (adminStudentMatch && request.method === 'DELETE' && adminStudentMatch[1]) {
    if (!sessionUser || sessionUser.role !== 'admin') return respond(response, 403, { error: 'forbidden' });
    const removed = await deleteStudent(decodeURIComponent(adminStudentMatch[1]));
    return removed ? respond(response, 200, { ok: true }) : respond(response, 404, { error: 'studentNotFound' });
  }

  if (pathname === '/api/auth/migrate') {
    const result = await migrateLocalAccounts(payload.accounts);
    return respond(response, 200, { ok: true, imported: result.imported });
  }

  if (pathname === '/api/auth/signup') {
    if (payload.role !== 'student') return respond(response, 403, { error: 'adminProvisioningDisabled' });
    const result = await createAccount(payload);
    if (!result.ok) return respond(response, result.error === 'emailTaken' ? 409 : 400, { error: result.error });
    return respond(response, 201, { user: result.user, token: await createSession(result.user.id) });
  }

  if (pathname === '/api/auth/login') {
    const user = await verifyAccountPassword(payload.email, payload.password);
    if (!user || (payload.role && user.role !== payload.role)) return respond(response, 401, { error: 'wrongCreds' });
    return respond(response, 200, { user, token: await createSession(user.id) });
  }

  if (pathname === '/api/auth/logout') {
    await revokeSession(sessionToken);
    return respond(response, 200, { ok: true });
  }

  if (pathname === '/api/auth/account' && request.method === 'POST') {
    if (!sessionUser) return respond(response, 401, { error: 'unauthorized' });
    await deleteAccount(sessionUser.id);
    return respond(response, 200, { ok: true });
  }

  if (pathname === '/api/auth/forgot-password') {
    const email = String(payload.email || '').trim().toLowerCase();
    if (!emailPattern.test(email)) return respond(response, 200, { ok: true });
    const mailer = createMailer();
    if (!mailer) return respond(response, 503, { error: 'smtpNotConfigured' });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const reset = await issuePasswordReset(email, tokenHash, new Date(Date.now() + resetTokenLifetimeMs));
    if (!reset.found || reset.throttled) return respond(response, 200, { ok: true });
    const resetUrl = new URL('/reset-password', process.env.APP_BASE_URL || 'http://localhost:5173');
    resetUrl.searchParams.set('token', rawToken);
    resetUrl.searchParams.set('email', email);

    try {
      await mailer.sendMail({
        from: `CareerX Updates <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Reset your CareerX student password',
        text: `Use this one-time link to reset your password within 20 minutes: ${resetUrl.toString()}`,
        html: `<div style="font-family:Arial,sans-serif;color:#172033;line-height:1.6;max-width:600px;margin:auto"><h2 style="color:#0369a1">Reset your CareerX password</h2><p>We received a request to reset the password for this student account.</p><p><a href="${escapeHtml(resetUrl.toString())}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:11px 18px;border-radius:6px">Reset password</a></p><p>This link expires in 20 minutes and can only be used once. If you did not request this, you can ignore this email.</p></div>`,
      });
      return respond(response, 200, { ok: true });
    } catch (error) {
      console.error('Password reset email failed:', error?.code || 'smtpError');
      return respond(response, 502, { error: 'emailDeliveryFailed' });
    }
  }

  if (pathname === '/api/auth/reset-password') {
    const email = String(payload.email || '').trim().toLowerCase();
    const token = String(payload.token || '');
    const password = String(payload.password || '');
    if (!emailPattern.test(email) || token.length !== 64 || password.length < 6) {
      return respond(response, 400, { error: 'invalidReset' });
    }
    const tokenHash = createHash('sha256').update(token).digest('hex');
    if (!await consumePasswordReset(email, tokenHash, password)) return respond(response, 400, { error: 'invalidReset' });
    return respond(response, 200, { ok: true });
  }

  if (['/api/data', '/api/data/migrate'].includes(pathname)) {
    if (!sessionUser) return respond(response, 401, { error: 'unauthorized' });
    if (pathname === '/api/data' && request.method === 'POST') {
      const key = String(payload.key || '');
      if (!key || key.length > 191 || ['users', 'session'].includes(key)) return respond(response, 400, { error: 'invalidKey' });
      await putUserData(sessionUser.id, key, payload.value);
      return respond(response, 200, { ok: true });
    }
    if (pathname === '/api/data' && request.method === 'DELETE') {
      await deleteUserData(sessionUser.id, payload.key ? String(payload.key) : null);
      return respond(response, 200, { ok: true });
    }
    if (pathname === '/api/data/migrate' && request.method === 'POST') {
      const entries = Array.isArray(payload.entries) ? payload.entries.filter(([key]) => {
        if (typeof key !== 'string' || ['users', 'session'].includes(key)) return false;
        const match = /^(?:profile|progress|adminSettings):(.+)$/.exec(key);
        return !match || match[1] === sessionUser.id;
      }) : [];
      await migrateUserData(sessionUser.id, entries);
      return respond(response, 200, { ok: true });
    }
  }

  if (pathname === '/api/published-content' || pathname === '/api/published-content/toggle') {
    if (!sessionUser || sessionUser.role !== 'admin') return respond(response, 403, { error: 'forbidden' });
    if (request.method === 'DELETE') {
      await deletePublishedContent(payload.id || null);
      return respond(response, 200, { ok: true });
    }
    const record = payload.record || {};
    if (!String(record.id || '').trim() || !String(record.title || '').trim()
      || !['job', 'internship', 'government', 'course'].includes(record.kind)
      || !['published', 'draft'].includes(record.status)) {
      return respond(response, 400, { error: 'invalidContent' });
    }
    const event = {
      id: randomUUID(), recordId: record.id, title: record.title, kind: record.kind,
      source: record.source || '', action: pathname.endsWith('/toggle') ? (record.status === 'published' ? 'published' : 'unpublished') : 'published',
      adminName: sessionUser.name || sessionUser.email, adminEmail: sessionUser.email, at: new Date().toISOString(),
    };
    await savePublishedContent({ ...record, publishedBy: sessionUser.email }, event);
    return respond(response, 200, { ok: true, record: { ...record, publishedBy: sessionUser.email }, event });
  }

  const record = payload.record || {};
  if (!sessionUser || sessionUser.role !== 'admin') return respond(response, 403, { error: 'forbidden' });
  if (!String(record.title || '').trim() || !['job', 'internship', 'government', 'course'].includes(record.kind)
    || !/^https?:\/\//i.test(String(record.url || ''))) {
    return respond(response, 400, { error: 'invalidNotification' });
  }

  const recipients = await listEligibleStudentRecipients(record);

  const cleanRecipients = [...new Map(recipients
    .filter((recipient) => emailPattern.test(String(recipient?.email || '').trim()))
    .map((recipient) => [String(recipient.email).trim().toLowerCase(), {
      email: String(recipient.email).trim().toLowerCase(),
      name: String(recipient.name || '').slice(0, 100),
    }])).values()];
  if (!cleanRecipients.length) return respond(response, 200, { sent: 0, recipientCount: 0, failed: 0 });

  const mailer = createMailer();
  if (!mailer) return respond(response, 503, { error: 'smtpNotConfigured' });

  try {
    const sent = await sendNotifications(record, cleanRecipients, mailer);
    return respond(response, 200, { sent, recipientCount: cleanRecipients.length, failed: cleanRecipients.length - sent });
  } catch {
    return respond(response, 502, { error: 'emailDeliveryFailed' });
  }
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error('CareerX API request failed:', error?.code || error?.message || 'unknownError');
    if (!response.headersSent) respond(response, 503, { error: 'serviceUnavailable' });
    else response.end();
  });
});

try {
  const initialization = await initializeMySql();
  databaseReady = true;
  defaultAdminReady = initialization.defaultAdminReady;
  console.log('MySQL database ready.');
  if (!defaultAdminReady) console.warn('Default admin not provisioned. Configure DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD in .env.');
} catch (error) {
  console.error('MySQL unavailable. Configure MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, and MYSQL_PASSWORD in .env.');
  console.error(error?.code || error?.message || 'connectionFailed');
}

server.listen(port, '127.0.0.1', () => {
  console.log(`CareerX API listening on http://127.0.0.1:${port}`);
});