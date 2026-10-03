import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Users, ShieldCheck, Loader2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import { BackButton, Button, Card, Field, Input, Tabs, ErrorState } from '../../components/ui/primitives';
import { AuthBrandPanel, DemoAccounts, AuthFooterLink } from './AuthParts';
import { isValidEmail } from '../../services/authService';

/** Login — student and admin share this screen but land in different products. */
export default function Login() {
  const { t, L } = useI18n();
  const { login } = useApp();
  const navigate = useNavigate();

  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setErrors({}); setFormError(null); }, [role]);

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!isValidEmail(email)) next.email = t('common.invalidEmail');
    if (String(password).length < 4) next.password = t('common.minLen', { n: 4 });
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    setFormError(null);
    const res = await login({ email, password, role });
    setBusy(false);
    if (!res.ok) { setFormError(res.error); return; }
    const user = res.user;
    if (user.role === 'admin') navigate('/admin/dashboard');
    else navigate(user.onboarded ? '/app/dashboard' : '/onboarding');
  };

  return (
    <div className="mx-auto grid w-full max-w-[1080px] items-center gap-8 lg:grid-cols-2">
      <AuthBrandPanel />

      <Card className="p-5 sm:p-7">
        <div className="mb-4"><BackButton fallbackTo="/" /></div>
        <div className="lg:hidden">
          <h1 className="h-display text-xl">{t('auth.loginTitle')}</h1>
          <p className="muted mt-1 text-[13px]">{t('auth.loginSub')}</p>
        </div>

        <div className="hidden lg:block">
          <h1 className="h-display text-2xl">{t('auth.loginTitle')}</h1>
          <p className="muted mt-1.5 text-sm">{t('auth.loginSub')}</p>
        </div>

        <Tabs
          className="mt-5"
          value={role}
          onChange={setRole}
          tabs={[
            { id: 'student', label: t('auth.studentLogin'), icon: Users },
            { id: 'admin', label: t('auth.adminLogin'), icon: ShieldCheck },
          ]}
        />

        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          {formError ? (
            <ErrorState
              kind="error"
              title={formError === 'serverUnavailable' ? L(['Auth database unavailable', 'Auth डेटाबेस उपलब्ध नहीं']) : t('auth.wrongCreds')}
              body={formError === 'serverUnavailable'
                ? L(['Check local MySQL settings in .env, then restart the app.', '.env में लोकल MySQL सेटिंग जाँचें, फिर ऐप रीस्टार्ट करें।'])
                : t('auth.wrongCreds')}
            />
          ) : null}

          <Field label={t('auth.email')} htmlFor="login-email" error={errors.email} required>
            <Input
              id="login-email" type="email" inputMode="email" autoComplete="username"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={role === 'admin' ? 'administrator@institution.edu' : 'you@college.edu'}
              invalid={!!errors.email} autoFocus
            />
          </Field>

          <Field label={t('auth.password')} htmlFor="login-password" error={errors.password} required>
            <div className="relative">
              <Input
                id="login-password" type={show ? 'text' : 'password'} autoComplete="current-password"
                className="pr-11" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" invalid={!!errors.password}
              />
              <button
                type="button" onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:bg-surface2 hover:text-ink"
                aria-label={show ? t('auth.hidePass') : t('auth.showPass')} aria-pressed={show}
              >
                {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </Field>

          {role === 'student' ? (
            <div className="-mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => navigate('/forgot-password', { state: { email } })}
                className="text-xs font-semibold text-brand underline-offset-2 hover:underline"
              >
                {L(['Forgot password?', 'पासवर्ड भूल गए?'])}
              </button>
            </div>
          ) : null}

          <Button type="submit" size="lg" className="w-full" loading={busy} icon={LogIn}>
            {t('auth.login')}
          </Button>
          {busy ? <p className="muted flex items-center justify-center gap-1.5 text-[11px]"><Loader2 className="h-3 w-3 animate-spin" aria-hidden />{t('common.loading')}</p> : null}
        </form>

        {role === 'student' ? (
          <AuthFooterLink
            text={L(['New student?', 'नए विद्यार्थी हैं?'])}
            to="/signup"
            label={L(['Register new user', 'नया यूज़र पंजीकृत करें'])}
          />
        ) : (
          <p className="muted mt-6 text-center text-[12.5px]">
            {L(['Administrator accounts are provisioned securely by the server.', 'Administrator खाते server द्वारा सुरक्षित रूप से बनाए जाते हैं।'])}
          </p>
        )}

        <div className="divider my-6" />

        <DemoAccounts
          onFill={(e, p) => { setEmail(e); setPassword(p); setErrors({}); setFormError(null); }}
        />

      </Card>
    </div>
  );
}
