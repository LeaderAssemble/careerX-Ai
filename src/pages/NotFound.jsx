import { Link } from 'react-router-dom';
import { Home, Compass, ArrowRight, Search } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../store/AppStore';
import Logo from '../components/Logo';
import { Button, Card, Badge } from '../components/ui/primitives';
import { GlowOrb } from '../components/Background';

export default function NotFound() {
  const { t, L } = useI18n();
  const { isStudent, isAdmin } = useApp();
  const home = isAdmin ? '/admin/dashboard' : isStudent ? '/app/dashboard' : '/';

  const links = isAdmin
    ? [
      { to: '/admin/dashboard', label: t('nav.admin.dashboard') },
      { to: '/admin/users', label: t('nav.admin.users') },
      { to: '/admin/analytics', label: t('nav.admin.analytics') },
    ]
    : isStudent
      ? [
        { to: '/app/dashboard', label: t('nav.dashboard') },
        { to: '/app/ai-career', label: t('nav.aiCareer') },
        { to: '/app/roadmap', label: t('nav.roadmap') },
        { to: '/app/jobs', label: t('nav.jobs') },
      ]
      : [
        { to: '/', label: t('brand.name') },
        { to: '/login', label: t('land.nav.login') },
        { to: '/signup', label: t('land.nav.signup') },
      ];

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 py-14">
      <GlowOrb className="-left-20 top-10 h-72 w-72" tone="brand" />
      <GlowOrb className="-right-16 bottom-0 h-64 w-64" tone="accent" />
      <Card grad className="relative w-full max-w-xl p-6 text-center sm:p-9">
        <Logo size={40} className="mx-auto" />
        <div className="mt-6 font-display text-[4.5rem] font-bold leading-none tracking-tight text-transparent sm:text-[6rem]"
          style={{ backgroundImage: 'linear-gradient(120deg,rgb(var(--c-brand-soft)),rgb(var(--c-accent)))', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>
          404
        </div>
        <h1 className="h-display mt-2 text-2xl">{t('err.notFound')}</h1>
        <p className="muted mt-2.5 text-sm leading-relaxed">
          {L(['The link may be old, or the page may have moved. Your saved profile and progress are untouched.',
            'लिंक पुराना हो सकता है, या पेज स्थानांतरित हुआ हो। आपकी सेव की गई प्रोफ़ाइल और प्रगति सुरक्षित हैं।'])}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button to={home} icon={Home}>{t('err.goHome')}</Button>
          <Button variant="ghost" to={isStudent || isAdmin ? home : '/login'} iconRight={ArrowRight}>
            {isAdmin ? t('nav.admin.dashboard') : isStudent ? t('nav.dashboard') : t('land.nav.login')}
          </Button>
        </div>

        <div className="mt-7 border-t border-line pt-5">
          <div className="muted mb-2.5 flex items-center justify-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em]">
            <Search className="h-3 w-3" aria-hidden />{L(['Popular pages', 'लोकप्रिय पेज'])}
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="chip transition hover:border-brand/50 hover:text-brand">
                <Compass className="h-3 w-3" aria-hidden />{l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Badge tone="muted">{t('misc.betaNote')}</Badge>
          <Link to="/#trust" className="muted text-[11px] hover:text-brand">{t('trust.title')}</Link>
        </div>
      </Card>
    </div>
  );
}
