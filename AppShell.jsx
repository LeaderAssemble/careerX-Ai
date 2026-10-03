import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Flame, ChevronRight } from 'lucide-react';
import { STUDENT_NAV, ADMIN_NAV, MOBILE_NAV, FLAT_STUDENT_NAV, FLAT_ADMIN_NAV } from '../../config/nav';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import Logo from '../Logo';
import { TopControls, NotificationBell, UserMenu } from './Controls';
import { CommandPalette } from './CommandPalette';
import { BackButton, Badge, Drawer } from '../ui/primitives';
import { cn } from '../../lib/utils';
/**
 * AppShell — the authenticated application frame.
 * Desktop: persistent sidebar. Mobile: hamburger drawer + bottom navigation,
 * so every destination stays one tap away on a phone.
 */
export default function AppShell({ children, isAdmin = false }) {
  const { t } = useI18n();
  const { user, unread, settings } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const nav = isAdmin ? ADMIN_NAV : STUDENT_NAV;
  const flat = isAdmin ? FLAT_ADMIN_NAV : FLAT_STUDENT_NAV;

  useEffect(() => { setDrawer(false); }, [location.pathname]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' }); }, [location.pathname]);
  useEffect(() => {
    const rootSizes = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.fontSize = rootSizes[settings.textSize] || rootSizes.medium;
    return () => { document.documentElement.style.fontSize = ''; };
  }, [settings.textSize]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const current = useMemo(
    () => flat.find((i) => location.pathname.startsWith(i.to)),
    [flat, location.pathname]
  );
  return (
    <div className="relative min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-brand focus:shadow-lift">
        {t('misc.skipToContent')}
      </a>

      {/* ------------------------------ Sidebar ------------------------------ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-line bg-surface/70 backdrop-blur-xl lg:flex">
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <Link to={isAdmin ? '/admin/dashboard' : '/app/dashboard'} aria-label="CareerX home">
            <Logo size={34} tagline={isAdmin ? t('common.admin') : t('brand.tagline2')} />
          </Link>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4" aria-label={isAdmin ? 'Admin navigation' : 'Student navigation'}>
          {nav.map((group) => (
            <div key={group.id} className="border-b border-line pb-3 last:border-b-0">
              <div className="muted mb-1.5 flex items-center gap-1.5 border-b border-line px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em]">
                <group.icon className="h-3 w-3" aria-hidden />
                {t(group.labelKey)}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">{t(item.labelKey)}</span>
                      {item.to === '/app/notifications' && unread > 0 ? (
                        <span className="ml-auto rounded-md bg-bad/15 px-1.5 py-0.5 text-[10px] font-bold text-bad">{unread}</span>
                      ) : null}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {!isAdmin ? <StreakCard /> : null}

        <div className="border-t border-line px-4 py-3">
          <p className="muted text-[10px] leading-snug">CareerX · v11.1</p>
        </div>
      </aside>

      {/* ------------------------------ Top bar ------------------------------ */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl lg:pl-[264px]">
        <div className="mx-auto flex w-full max-w-[1400px] items-center gap-2 px-3 py-2.5 sm:px-5 lg:px-7">
          <button
            type="button" onClick={() => setDrawer(true)}
            className="icon-btn lg:hidden" aria-label={t('nav.menu')} aria-expanded={drawer}
          >
            <Menu className="h-4 w-4" aria-hidden />
          </button>

          <Link to="/" className="lg:hidden" aria-label="CareerX home"><Logo size={30} showWordmark={false} /></Link>

          <div className="min-w-0 flex-1 lg:ml-1">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted">
              <span className="hidden sm:inline">CareerX</span>
              <ChevronRight className="hidden h-3 w-3 sm:inline" aria-hidden />
              <span className="truncate">{current ? t(current.labelKey) : isAdmin ? t('nav.admin.dashboard') : t('nav.dashboard')}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {!isAdmin ? <NotificationBell /> : null}
            {!isAdmin ? <CommandPalette /> : null}
            <TopControls compact />
            <UserMenu />
          </div>
        </div>

      </header>

      {/* ------------------------------- Main ------------------------------- */}
      <main id="main" className="mx-auto w-full max-w-[1400px] px-3 pb-28 pt-4 sm:px-5 sm:pt-5 lg:px-7 lg:pb-12 lg:pl-[284px]">
        <div key={location.pathname} className="animate-fade-in">{children}</div>
      </main>

      {/* ---------------------------- Mobile drawer ---------------------------- */}
      <Drawer
        open={drawer} onClose={() => setDrawer(false)} side="left"
        title={<Logo size={30} />}
        sub={isAdmin ? t('common.admin') : user?.name || t('common.student')}
      >
        <nav className="space-y-4" aria-label="Mobile navigation">
          {nav.map((group) => (
            <div key={group.id} className="border-b border-line pb-3 last:border-b-0">
              <div className="muted mb-1.5 border-b border-line px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.16em]">{t(group.labelKey)}</div>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}>
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">{t(item.labelKey)}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </Drawer>

      {/* ---------------------------- Bottom nav ---------------------------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/[0.92] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Primary"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-between px-1">
          {MOBILE_NAV.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <li key={item.to} className="flex-1">
                <NavLink
                  to={item.to}
                  className={cn('flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition', active ? 'text-brand' : 'text-muted')}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon className={cn('h-[18px] w-[18px]', active && 'drop-shadow-[0_0_8px_rgb(var(--c-brand)/0.5)]')} aria-hidden />
                  <span className="max-w-[64px] truncate">{t(item.labelKey)}</span>
                </NavLink>
              </li>
            );
          })}
          <li className="flex-1">
            <button type="button" onClick={() => setDrawer(true)} className="flex w-full flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-muted transition hover:text-ink">
              <Menu className="h-[18px] w-[18px]" aria-hidden />
              <span>{t('common.filters')}</span>
            </button>
          </li>
        </ul>
      </nav>
      {scrolled ? (
        <div className="fixed bottom-24 right-3 z-30 lg:bottom-5 lg:right-5">
          <BackButton fallbackTo={isAdmin ? '/admin/dashboard' : '/app/dashboard'} className="bg-surface/95 shadow-lift" />
        </div>
      ) : null}
    </div>
  );
}

function StreakCard() {
  const { progress, derived } = useApp();
  const { t, L } = useI18n();
  const streak = progress.streak?.count || 0;
  return (
    <div className="mx-3 mb-3 rounded-xl border border-line bg-surface2/70 p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-warn/15 text-warn"><Flame className="h-4 w-4" aria-hidden /></span>
        <div className="min-w-0">
          <div className="font-display text-sm font-bold tabular-nums">{streak} <span className="muted text-[11px] font-semibold">{t('dash.streak')}</span></div>
          <div className="muted truncate text-[10.5px]">{L(['Readiness', 'तैयारी'])} {derived?.readiness?.score ?? 0}/100</div>
        </div>
      </div>
      <div className="mt-2.5 skillbar"><span style={{ width: `${Math.min(100, (streak / 7) * 100)}%`, backgroundImage: 'linear-gradient(90deg,rgb(var(--c-warn)),rgb(var(--c-brand-2)))' }} /></div>
    </div>
  );
}

/** Route guards ------------------------------------------------------------- */
export function RequireRole({ role, children }) {
  const { ready, user } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (!ready) return;
    if (!user) navigate('/login', { state: { from: location.pathname } });
    else if (role && user.role !== role) navigate(user.role === 'admin' ? '/admin/dashboard' : '/app/dashboard');
  }, [ready, user, role, navigate, location.pathname]);

  if (!ready) return <div className="grid min-h-[50vh] place-items-center text-sm text-muted">{t('common.loading')}</div>;
  if (!user || (role && user.role !== role)) return null;
  return children;
}
