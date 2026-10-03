/* Renders every route in jsdom and reports crashes. Dev-only QA harness. */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html lang="en"><body><div id="root"></div></body></html>', {
  url: 'http://localhost/', pretendToBeVisual: true,
});
const { window } = dom;
global.window = window;
global.document = window.document;
global.navigator = window.navigator;
global.location = window.location;
global.history = window.history;
global.localStorage = window.localStorage;
global.sessionStorage = window.sessionStorage;
global.HTMLElement = window.HTMLElement;
global.Element = window.Element;
global.Node = window.Node;
global.SVGElement = window.SVGElement;
global.getComputedStyle = window.getComputedStyle;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
window.requestAnimationFrame = global.requestAnimationFrame;
window.cancelAnimationFrame = global.cancelAnimationFrame;
window.scrollTo = () => {};
window.matchMedia = (q) => ({ matches: false, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
global.matchMedia = window.matchMedia;
global.IntersectionObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
window.IntersectionObserver = global.IntersectionObserver;
global.ResizeObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };
window.ResizeObserver = global.ResizeObserver;
global.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom lacks the legacy IE event API React's dev-mode input polyfill probes for.
window.HTMLElement.prototype.attachEvent = () => {};
window.HTMLElement.prototype.detachEvent = () => {};

const errors = [];
const origError = console.error;
console.error = (...args) => {
  const msg = args.map((a) => (a && a.message ? a.message : String(a))).join(' ');
  if (/not wrapped in act|ReactDOMTestUtils|defaultProps|PropTypes|validateDOMNesting|useLayoutEffect does nothing|HTMLCanvasElement's getContext|attachEvent is not a function/.test(msg)) return;
  errors.push(msg.slice(0, 400));
  origError('   console.error:', msg.slice(0, 300));
};
window.addEventListener('error', (e) => errors.push(`window.error: ${e.message}`));

const React = (await import('react')).default;
const { createRoot } = await import('react-dom/client');
const { act } = await import('react-dom/test-utils');
const auth = await import('../src/services/authService.js');
const { default: App } = await import('../src/App.jsx');

const STUDENT_ROUTES = [
  '/', '/login', '/signup', '/onboarding',
  '/app/dashboard', '/app/ai-career', '/app/roadmap', '/app/skill-gap', '/app/courses',
  '/app/jobs', '/app/internships', '/app/resume', '/app/interview', '/app/project-lab',
  '/app/simulator', '/app/challenge', '/app/government', '/app/achievements',
  '/app/profile', '/app/notifications', '/app/privacy',
  '/this-route-does-not-exist',
];
const ADMIN_ROUTES = [
  '/admin/dashboard', '/admin/users', '/admin/analytics', '/admin/skill-insights',
  '/admin/activities', '/admin/opportunities', '/admin/settings',
];

async function renderRoute(path, label) {
  errors.length = 0;
  window.history.pushState({}, '', path);
  const host = document.getElementById('root');
  host.innerHTML = '';
  const root = createRoot(host);
  await act(async () => { root.render(React.createElement(App)); });
  await act(async () => { await new Promise((r) => setTimeout(r, 220)); });
  const text = document.body.textContent || '';
  const crashed = /Something went wrong on this screen/.test(text) || errors.some((e) => /is not a function|Cannot read|undefined is not|is not defined|Each child in a list|Minified React error/.test(e));
  const empty = text.replace(/\s+/g, '').length < 100;
  const status = crashed ? 'CRASH' : empty ? 'EMPTY' : 'ok';
  console.log(`${status === 'ok' ? '✔' : '✘'} ${label.padEnd(30)} ${path.padEnd(34)} chars=${text.length}`);
  if (status !== 'ok') {
    console.log('   errors:', errors.slice(0, 3).join(' || ') || '(none captured)');
    console.log('   text head:', text.replace(/\s+/g, ' ').slice(0, 300));
  }
  await act(async () => { root.unmount(); });
  return status;
}

/* Optional: render everything in Hindi to catch i18n misuse (SMOKE_LANG=hi). */
const SMOKE_LANG = process.env.SMOKE_LANG === 'hi' ? 'hi' : 'en';
try { window.localStorage.setItem('careerx:v1:lang', SMOKE_LANG); } catch { /* noop */ } // i18n stores the raw code, not JSON

let bad = 0;
console.log(`\n[language: ${SMOKE_LANG}]`);
console.log('\n--- logged out ---');
auth.logout();
for (const r of ['/', '/login', '/signup', '/this-route-does-not-exist', '/app/dashboard', '/admin/dashboard']) {
  if ((await renderRoute(r, 'guest')) !== 'ok') bad += 1;
}

console.log('\n--- demo student ---');
auth.loadDemoStudent();
for (const r of STUDENT_ROUTES) { if ((await renderRoute(r, 'student')) !== 'ok') bad += 1; }

console.log('\n--- demo admin ---');
auth.loadDemoAdmin();
for (const r of ADMIN_ROUTES) { if ((await renderRoute(r, 'admin')) !== 'ok') bad += 1; }

console.log(bad ? `\n${bad} ROUTE(S) FAILED` : '\nALL ROUTES RENDER OK');
process.exit(bad ? 1 : 0);
