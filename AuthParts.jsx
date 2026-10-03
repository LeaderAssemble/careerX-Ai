import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Lock, Check, Info } from 'lucide-react';
import Logo from '../../components/Logo';
import { Card, Badge } from '../../components/ui/primitives';
import { useI18n } from '../../i18n';
import { GlowOrb } from '../../components/Background';

/** Shared left-hand brand panel for the login and signup screens. */
export function AuthBrandPanel() {
  const { t, L } = useI18n();
  const points = [
    [L(['Ranked career matches with visible reasoning', 'दिखने वाले कारणों सहित रैंक किए गए करियर मैच'])],
    [L(['Skill gaps, courses and a six-month roadmap', 'स्किल गैप, कोर्सेस और छह महीने का रोडमैप'])],
    [L(['AI resume analysis and mock interviews', 'AI रिज़्यूमे विश्लेषण और मॉक इंटरव्यू'])],
    [L(['Matched internships, jobs and government listings', 'मैच्ड इंटर्नशिप, नौकरियाँ और सरकारी सूचियाँ'])],
  ];
  return (
    <div className="relative hidden overflow-hidden rounded-2xl border border-line bg-surface/60 p-8 lg:flex lg:flex-col lg:justify-between">
      <GlowOrb className="-left-16 -top-16 h-72 w-72" tone="brand" />
      <GlowOrb className="-bottom-20 right-0 h-64 w-64" tone="accent" />
      <div className="relative">
        <Logo size={40} />
        <h2 className="h-display mt-7 text-[1.9rem] leading-tight text-balance">{t('brand.tagline')}</h2>
        <p className="muted mt-3 text-sm leading-relaxed">{t('brand.tagline2')}</p>
        <ul className="mt-7 space-y-2.5">
          {points.map((p, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] leading-snug text-ink">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-ok/15 text-ok"><Check className="h-2.5 w-2.5" aria-hidden /></span>
              {p[0]}
            </li>
          ))}
        </ul>
      </div>
      <div className="relative mt-8 space-y-3">
        <Card className="bg-surface2/70 p-3.5">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <p className="text-[11.5px] leading-relaxed text-muted">{t('auth.securityNote')} {L(['Passwords are stored as hashes on the local auth server; demo profiles stay in this browser.', 'पासवर्ड लोकल ऑथ सर्वर पर हैश रूप में सेव होते हैं; डेमो प्रोफ़ाइल इसी ब्राउज़र में रहती हैं।'])}</p>
          </div>
        </Card>
        <div className="flex items-center gap-2">
          <Badge tone="warn" icon={Sparkles}>{t('common.demoMode')}</Badge>
          <span className="muted text-[11px]">{L(['English · हिंदी · Light · Dark', 'English · हिंदी · लाइट · डार्क'])}</span>
        </div>
      </div>
    </div>
  );
}

/** Demo credentials + one-click hackathon profile loader. */
export function DemoAccounts({ onFill }) {
  const { t, L } = useI18n();
  const accounts = [
    { role: t('common.student'), email: 'demo@student.com', password: 'careerx123', tone: 'brand' },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lock className="h-3.5 w-3.5 text-brand" aria-hidden />
        <span className="font-display text-xs font-bold uppercase tracking-[0.14em] text-ink">{t('auth.demoAccounts')}</span>
        <span className="h-px flex-1 bg-line" aria-hidden />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {accounts.map((a) => (
          <Card key={a.email} className="bg-surface2/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <Badge tone={a.tone}>{a.role}</Badge>
              <button
                type="button" onClick={() => onFill(a.email, a.password)}
                className="rounded-md border border-line bg-surface px-2 py-0.5 text-[10.5px] font-bold text-brand transition hover:border-brand/50 hover:bg-brand/10"
              >
                {t('auth.useDemo')}
              </button>
            </div>
            <p className="mt-2 truncate font-mono text-[11px] text-ink">{a.email}</p>
            <p className="muted truncate font-mono text-[10.5px]">{a.password}</p>
          </Card>
        ))}
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-line bg-surface2/50 p-3 text-[11px] leading-relaxed text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        {t('auth.demoNote')}
      </p>
    </div>
  );
}

export function AuthFooterLink({ text, to, label, state }) {
  return (
    <p className="muted mt-6 text-center text-[12.5px]">
      {text} <Link to={to} state={state} className="font-bold text-brand underline-offset-2 hover:underline">{label}</Link>
    </p>
  );
}

export default AuthBrandPanel;
