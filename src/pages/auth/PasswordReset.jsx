import { useState } from 'react';
import { KeyRound, Mail } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { BackButton, Button, Card, Field, Input } from '../../components/ui/primitives';
import { AuthBrandPanel } from './AuthParts';
import { isValidEmail, listUsers, passwordIssue, updateStudentPassword } from '../../services/authService';

export default function PasswordReset() {
  const { L } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const resetEmail = (params.get('email') || '').trim().toLowerCase();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const requestReset = async (event) => {
    event.preventDefault();
    setNotice('');
    setError('');
    if (!isValidEmail(email)) {
      setError(L(['Enter a valid email address.', 'सही ईमेल पता दर्ज करें।']));
      return;
    }

    setBusy(true);
    try {
      await fetch('/api/auth/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: listUsers() }),
      });
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error('requestFailed');
      setNotice(L([
        'If a student account is registered with this email, a reset link has been sent. Check your inbox and spam folder.',
        'अगर इस ईमेल से छात्र खाता पंजीकृत है, तो रीसेट लिंक भेज दिया गया है। इनबॉक्स और स्पैम फ़ोल्डर देखें।',
      ]));
    } catch {
      setError(L(['Could not send the reset email. Check the mail server and try again.', 'रीसेट ईमेल नहीं भेजा जा सका। मेल सर्वर जाँचकर फिर कोशिश करें।']));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setNotice('');
    setError('');
    const issue = passwordIssue(password);
    if (issue || password !== confirmPassword) {
      setError(password !== confirmPassword
        ? L(['Passwords do not match.', 'पासवर्ड मेल नहीं खाते।'])
        : L(['Password must be at least 6 characters.', 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।']));
      return;
    }
    if (!token) {
      setError(L([
        'This reset link is incomplete. Request a new one.',
        'रीसेट लिंक अधूरा है। नया लिंक माँगें।',
      ]));
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: resetEmail, password }),
      });
      if (!response.ok) throw new Error('linkInvalid');
      updateStudentPassword(resetEmail, password);
      setNotice(L(['Password updated. You can now sign in.', 'पासवर्ड अपडेट हो गया। अब लॉग इन करें।']));
    } catch {
      setError(L(['This reset link may have expired or already been used. Request a new one.', 'रीसेट लिंक की अवधि समाप्त हो सकती है या वह पहले ही इस्तेमाल हो चुका है। नया लिंक माँगें।']));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-[1080px] items-center gap-8 lg:grid-cols-2">
      <AuthBrandPanel />
      <Card className="p-5 sm:p-7">
        <div className="mb-4"><BackButton fallbackTo="/login" /></div>
        <h1 className="h-display text-2xl">
          {token ? L(['Set a new password', 'नया पासवर्ड सेट करें']) : L(['Forgot password', 'पासवर्ड भूल गए'])}
        </h1>
        <p className="muted mt-1.5 text-sm">
          {token
            ? L(['Choose a new password for your student account.', 'अपने छात्र खाते के लिए नया पासवर्ड चुनें।'])
            : L(['We will email a one-time reset link to your registered student email.', 'आपके पंजीकृत छात्र ईमेल पर एक बार इस्तेमाल होने वाला रीसेट लिंक भेजेंगे।'])}
        </p>

        <form onSubmit={token ? resetPassword : requestReset} className="mt-5 space-y-4" noValidate>
          {token ? (
            <>
              <Field label={L(['New password', 'नया पासवर्ड'])} htmlFor="reset-password" required>
                <Input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </Field>
              <Field label={L(['Confirm password', 'पासवर्ड दोबारा दर्ज करें'])} htmlFor="reset-confirm-password" required>
                <Input id="reset-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </Field>
            </>
          ) : (
            <Field label={L(['Student email', 'छात्र ईमेल'])} htmlFor="reset-email" required>
              <Input id="reset-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@college.edu" />
            </Field>
          )}

          {error ? <p role="alert" className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p> : null}
          {notice ? <p role="status" className="rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ink">{notice}</p> : null}
          {notice.includes('Password updated') || notice.includes('पासवर्ड अपडेट हो गया') ? (
            <Button type="button" className="w-full" onClick={() => navigate('/login')} icon={KeyRound}>
              {L(['Back to student login', 'छात्र लॉग इन पर जाएँ'])}
            </Button>
          ) : (
            <Button type="submit" size="lg" className="w-full" loading={busy} icon={token ? KeyRound : Mail}>
              {token ? L(['Reset password', 'पासवर्ड रीसेट करें']) : L(['Send reset link', 'रीसेट लिंक भेजें'])}
            </Button>
          )}
        </form>
      </Card>
    </div>
  );
}