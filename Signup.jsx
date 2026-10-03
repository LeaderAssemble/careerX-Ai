import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, ArrowRight, Wand2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import { BackButton, Button, Card, Field, Input, Select, ErrorState } from '../../components/ui/primitives';
import { AuthBrandPanel, AuthFooterLink } from './AuthParts';
import { isValidEmail, passwordIssue } from '../../services/authService';
import { DEGREES, BRANCHES, COLLEGES } from '../../data/catalog';

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => THIS_YEAR + i - 2);

/** Student signup — after this the onboarding wizard takes over. */
export default function Signup() {
  const { t, L } = useI18n();
  const { signup } = useApp();
  const navigate = useNavigate();
  const role = 'student';

  const [form, setForm] = useState({
    name: '', email: '', password: '', college: '', degree: '', branch: '', gradYear: '',
    institution: '', city: '', placementHead: '', contactEmail: '', website: '', academicYear: '', cohortNote: '',
  });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = t('common.requiredField');
    else if (form.name.trim().length < 3) next.name = t('common.minLen', { n: 3 });
    if (!isValidEmail(form.email)) next.email = t('common.invalidEmail');
    const pw = passwordIssue(form.password);
    if (pw === 'minLen') next.password = t('common.minLen', { n: 6 });
    if (role === 'student') {
      if (!form.college) next.college = t('common.requiredField');
      if (!form.degree) next.degree = t('common.requiredField');
      if (!form.branch) next.branch = t('common.requiredField');
      if (!form.gradYear) next.gradYear = t('common.requiredField');
    } else {
      if (!form.institution.trim()) next.institution = t('common.requiredField');
      if (!form.city.trim()) next.city = t('common.requiredField');
      if (!form.placementHead.trim()) next.placementHead = t('common.requiredField');
      if (!isValidEmail(form.contactEmail)) next.contactEmail = t('common.invalidEmail');
      if (!form.academicYear.trim()) next.academicYear = t('common.requiredField');
    }
    return next;
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setBusy(true);
    const res = await signup({ ...form, role });
    setBusy(false);
    if (!res.ok) {
      if (res.errors?.email === 'emailTaken') setFormError('emailTaken');
      else if (res.errors?.server) setFormError('serverUnavailable');
      else setErrors(Object.fromEntries(Object.entries(res.errors || {}).map(([k, v]) => [k, t(v === 'minLen' ? 'common.minLen' : `common.${v}`, { n: 6 })])));
      return;
    }
    navigate('/onboarding');
  };

  const fillSample = () => {
    setForm({
      name: 'Priya Verma',
      email: 'priya.verma@student.demo',
      password: 'careerx123',
      college: COLLEGES[0],
      degree: 'B.Tech / B.E.',
      branch: 'Information Technology',
      gradYear: String(THIS_YEAR + 1),
    });
    setErrors({});
    setFormError(null);
  };

  return (
    <div className="mx-auto grid w-full max-w-[1080px] items-center gap-8 lg:grid-cols-2">
      <AuthBrandPanel />

      <Card className="p-5 sm:p-7">
        <div className="mb-4"><BackButton fallbackTo="/login" /></div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="h-display text-2xl">{t('auth.signupTitle')}</h1>
            <p className="muted mt-1.5 text-sm">{t('auth.signupSub')}</p>
          </div>
          {role === 'student' ? <Button size="sm" variant="ghost" icon={Wand2} onClick={fillSample}>{L(['Fill sample', 'नमूना भरें'])}</Button> : null}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          {formError === 'emailTaken' ? <ErrorState kind="error" title={t('auth.emailTaken')} /> : null}
          {formError === 'serverUnavailable' ? <ErrorState kind="error" title={L(['Account server unavailable. Try again.', 'खाता सर्वर उपलब्ध नहीं है। फिर कोशिश करें।'])} /> : null}

          <Field label={t('auth.fullName')} htmlFor="su-name" error={errors.name} required>
            <Input id="su-name" value={form.name} onChange={set('name')} autoComplete="name" placeholder={L(['e.g. Aarav Sharma', 'जैसे आरव शर्मा'])} invalid={!!errors.name} autoFocus />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('auth.email')} htmlFor="su-email" error={errors.email} required>
              <Input id="su-email" type="email" inputMode="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="you@college.edu" invalid={!!errors.email} />
            </Field>
            <Field label={t('auth.password')} htmlFor="su-pass" error={errors.password} required hint={L(['Minimum 6 characters (demo only — never reuse a real password).', 'कम से कम 6 अक्षर (केवल डेमो — असली पासवर्ड कभी दोबारा उपयोग न करें)।'])}>
              <div className="relative">
                <Input id="su-pass" type={show ? 'text' : 'password'} className="pr-11" value={form.password} onChange={set('password')} autoComplete="new-password" placeholder="••••••••" invalid={!!errors.password} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t('auth.hidePass') : t('auth.showPass')} aria-pressed={show}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:bg-surface2 hover:text-ink">
                  {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
            </Field>
          </div>

          {role === 'student' ? (
            <>
              <Field label={t('auth.college')} htmlFor="su-college" error={errors.college} required>
                <Select id="su-college" value={form.college} onChange={set('college')} invalid={!!errors.college}>
                  <option value="">{L(['Select your college…', 'अपना कॉलेज चुनें…'])}</option>
                  {COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t('auth.degree')} htmlFor="su-degree" error={errors.degree} required>
                  <Select id="su-degree" value={form.degree} onChange={set('degree')} invalid={!!errors.degree}>
                    <option value="">{L(['Select…', 'चुनें…'])}</option>
                    {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </Field>
                <Field label={t('auth.branch')} htmlFor="su-branch" error={errors.branch} required>
                  <Select id="su-branch" value={form.branch} onChange={set('branch')} invalid={!!errors.branch}>
                    <option value="">{L(['Select…', 'चुनें…'])}</option>
                    {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </Select>
                </Field>
                <Field label={t('auth.gradYear')} htmlFor="su-year" error={errors.gradYear} required>
                  <Select id="su-year" value={form.gradYear} onChange={set('gradYear')} invalid={!!errors.gradYear}>
                    <option value="">{L(['Select…', 'चुनें…'])}</option>
                    {YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
                  </Select>
                </Field>
              </div>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={L(['Institution name', 'संस्थान का नाम'])} htmlFor="su-institution" error={errors.institution} required>
                <Input id="su-institution" value={form.institution} onChange={set('institution')} invalid={!!errors.institution} />
              </Field>
              <Field label={L(['City', 'शहर'])} htmlFor="su-city" error={errors.city} required>
                <Input id="su-city" value={form.city} onChange={set('city')} invalid={!!errors.city} />
              </Field>
              <Field label={L(['Placement cell head', 'प्लेसमेंट सेल प्रमुख'])} htmlFor="su-placement-head" error={errors.placementHead} required>
                <Input id="su-placement-head" value={form.placementHead} onChange={set('placementHead')} invalid={!!errors.placementHead} />
              </Field>
              <Field label={L(['Institution contact email', 'संस्थान संपर्क ईमेल'])} htmlFor="su-contact-email" error={errors.contactEmail} required>
                <Input id="su-contact-email" type="email" value={form.contactEmail} onChange={set('contactEmail')} invalid={!!errors.contactEmail} />
              </Field>
              <Field label={L(['Institution website', 'संस्थान वेबसाइट'])} htmlFor="su-website">
                <Input id="su-website" type="url" value={form.website} onChange={set('website')} placeholder="https://example.edu.in" />
              </Field>
              <Field label={L(['Academic year', 'शैक्षणिक वर्ष'])} htmlFor="su-academic-year" error={errors.academicYear} required>
                <Input id="su-academic-year" value={form.academicYear} onChange={set('academicYear')} placeholder="2026–27" invalid={!!errors.academicYear} />
              </Field>
              <Field className="sm:col-span-2" label={L(['Cohort description', 'कोहोर्ट विवरण'])} htmlFor="su-cohort-note">
                <Input id="su-cohort-note" value={form.cohortNote} onChange={set('cohortNote')} placeholder="Final-year engineering cohort" />
              </Field>
              <p className="muted sm:col-span-2 text-[11px] leading-relaxed">{L(['Admin accounts and credentials are stored only in this browser in this demo build. They are not verified by a server.', 'इस डेमो बिल्ड में एडमिन खाता और क्रेडेंशियल केवल इस ब्राउज़र में सेव होते हैं। सर्वर इन्हें सत्यापित नहीं करता।'])}</p>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" loading={busy} icon={UserPlus} iconRight={ArrowRight}>
            {t('auth.signup')}
          </Button>
          {role === 'student' ? <p className="muted text-center text-[11px] leading-relaxed">
            {L(['Next: an 8-step onboarding wizard that builds your career profile.', 'आगे: 8-चरणीय ऑनबोर्डिंग विज़ार्ड जो आपकी करियर प्रोफ़ाइल बनाता है।'])}
          </p> : null}
        </form>

        <AuthFooterLink text={t('auth.haveAccount')} to="/login" label={t('land.nav.login')} />
      </Card>
    </div>
  );
}
