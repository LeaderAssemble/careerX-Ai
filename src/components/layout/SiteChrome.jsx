import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import Logo, { LogoMark } from '../Logo';
import { TopControls } from './Controls';
import { Button, Drawer } from '../ui/primitives';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import { cn } from '../../lib/utils';

const ANCHORS = [
  { href: '#features', key: 'land.nav.features' },
  { href: '#how', key: 'land.nav.how' },
  { href: '#ai', key: 'land.nav.ai' },
  { href: '#trust', key: 'land.nav.trust' },
  { href: '#faq', key: 'land.nav.faq' },
];

/** Public marketing header — turns into frosted glass once the page scrolls. */
export function SiteHeader() {
  const { t } = useI18n();
  const { user, isStudent, isAdmin } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenu(false); }, [location.hash]);

  const dashboardTo = isAdmin ? '/admin/dashboard' : '/app/dashboard';

  return (
    <>
      <header className={cn('fixed inset-x-0 top-0 z-50 transition-all duration-300', scrolled ? 'border-b border-line bg-bg/85 backdrop-blur-xl' : 'border-b border-transparent')}>
        <div className="mx-auto flex w-full max-w-[1240px] items-center gap-3 px-4 py-3 sm:px-6">
          <a href="#top" aria-label="CareerX"><Logo size={36} /></a>

          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Primary">
            {ANCHORS.map((a) => (
              <a key={a.href} href={a.href} className="rounded-lg px-3 py-2 text-[13px] font-medium text-muted transition hover:bg-surface2/70 hover:text-ink">
                {t(a.key)}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <TopControls compact />
            {user ? (
              <Button to={dashboardTo} size="sm" icon={ArrowUpRight} className="hidden sm:inline-flex">
                {isAdmin ? t('nav.admin.dashboard') : t('nav.dashboard')}
              </Button>
            ) : (
              <>
                <Button to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">{t('land.nav.login')}</Button>
                <Button to="/signup" size="sm">{t('land.nav.signup')}</Button>
              </>
            )}
            <button type="button" className="icon-btn lg:hidden" onClick={() => setMenu(true)} aria-label={t('nav.menu')} aria-expanded={menu}>
              <Menu className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <Drawer open={menu} onClose={() => setMenu(false)} side="left" title={<Logo size={30} />} sub={t('brand.tagline2')}>
        <nav className="space-y-1" aria-label="Mobile">
          {ANCHORS.map((a) => (
            <a key={a.href} href={a.href} onClick={() => setMenu(false)} className="nav-link">
              <span>{t(a.key)}</span>
            </a>
          ))}
          <div className="divider my-2" />
          {user ? (
            <Link to={dashboardTo} className="nav-link nav-link-active">{isAdmin ? t('nav.admin.dashboard') : t('nav.dashboard')}</Link>
          ) : (
            <>
              <Link to="/login" className="nav-link">{t('land.nav.login')}</Link>
              <Link to="/signup" className="nav-link">{t('land.nav.signup')}</Link>
            </>
          )}
        </nav>
      </Drawer>
    </>
  );
}

/** Public footer with the required links and honest demo labelling. */
export function SiteFooter() {
  const { t, L } = useI18n();
  const year = new Date().getFullYear();
  const columns = [
    { title: t('land.foot.product'), links: [
      { label: t('land.nav.features'), to: '/#features' },
      { label: t('land.nav.how'), to: '/#how' },
      { label: t('land.nav.ai'), to: '/#ai' },
      { label: t('nav.simulator'), to: '/#simulator' },
    ] },
    { title: t('land.foot.resources'), links: [
      { label: t('nav.courses'), to: '/#courses' },
      { label: t('nav.gov'), to: '/#government' },
      { label: t('land.nav.faq'), to: '/#faq' },
      { label: t('land.foot.help'), to: '/#faq' },
    ] },
    { title: t('land.foot.company'), links: [
      { label: t('land.foot.about'), to: '/#why' },
      { label: t('land.foot.contact'), to: '/#contact' },
      { label: t('land.foot.privacy'), to: '/#trust' },
      { label: t('land.foot.ai'), to: '/#trust' },
    ] },
  ];
  return (
    <footer id="contact" className="relative mt-20 border-t border-line bg-surface/50">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
          <div>
            <Logo size={40} />
            <p className="muted mt-3.5 max-w-xs text-sm leading-relaxed">{t('brand.footer')}</p>
            <p className="muted mt-2 max-w-xs text-[13px] italic leading-relaxed">{t('brand.tagline')}</p>
            <SocialLinks />
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-ink">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.to} className="muted text-[13px] transition hover:text-brand">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="divider my-8" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="muted text-[11.5px] leading-relaxed">{t('land.foot.rights', { year })}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge border border-warn/35 bg-warn/10 text-warn">{t('land.foot.built')}</span>
            <span className="badge border border-line bg-surface2 text-muted">{L(['Sample data only', 'केवल नमूना डेटा'])}</span>
            <LogoMark size={20} />
          </div>
        </div>
        <p className="muted mt-4 max-w-3xl text-[11px] leading-relaxed">
          {t('common.disclaimer')} {t('common.methodNote')}
        </p>
      </div>
    </footer>
  );
}

/* Inline brand marks — lucide v1 no longer ships brand icons. */
function SocialLinks() {
  const { L } = useI18n();
  const links = [
    { name: 'GitHub', path: 'M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.16.59.67.5A10.02 10.02 0 0 0 22 12A10 10 0 0 0 12 2z' },
    { name: 'LinkedIn', path: 'M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.2h.05c.53-1 1.83-2.2 3.77-2.2 4.03 0 4.78 2.65 4.78 6.1V24h-4v-8.5c0-2.03-.04-4.64-2.83-4.64-2.83 0-3.27 2.2-3.27 4.49V24H8V8z' },
    { name: 'X', path: 'M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.22-6.82-5.97 6.82H1.66l7.73-8.84L1.25 2.25h6.82l4.72 6.23 5.45-6.23zm-1.16 17.52h1.83L7.01 4.13H5.04l12.04 15.64z' },
    { name: 'Email', path: 'M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6zm2.5.6L12 12l7.5-5.4M4.5 6h15' },
  ];
  return (
    <ul className="mt-4 flex gap-2">
      {links.map((l) => (
        <li key={l.name}>
          <a
            href="#contact" aria-label={l.name} title={L(['Demo build — social links are placeholders', 'डेमो बिल्ड — सोशल लिंक केवल प्लेसहोल्डर हैं'])}
            className="icon-btn opacity-70 transition hover:opacity-100"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill={l.name === 'Email' ? 'none' : 'currentColor'} stroke={l.name === 'Email' ? 'currentColor' : 'none'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={l.path} />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default SiteFooter;
