import { Component, Suspense, lazy, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { LanguageProvider, useI18n } from './i18n';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider, useApp } from './store/AppStore';
import Background from './components/Background';
import Toaster from './components/ui/Toaster';
import Chatbot from './components/chatbot/Chatbot';
import AppShell, { RequireRole } from './components/layout/AppShell';
import { SiteHeader, SiteFooter } from './components/layout/SiteChrome';
import Logo from './components/Logo';
import { TopControls } from './components/layout/Controls';
import { CardSkeleton } from './components/ui/primitives';
import { cn } from './lib/utils';

/* Code-split routes: the landing page stays fast, dashboards load on demand. */
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const PasswordReset = lazy(() => import('./pages/auth/PasswordReset'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/student/Dashboard'));
const AICareer = lazy(() => import('./pages/student/AICareer'));
const Roadmap = lazy(() => import('./pages/student/Roadmap'));
const SkillGap = lazy(() => import('./pages/student/SkillGap'));
const Courses = lazy(() => import('./pages/student/Courses'));
const Opportunities = lazy(() => import('./pages/student/Opportunities'));
const Resume = lazy(() => import('./pages/student/Resume'));
const Interview = lazy(() => import('./pages/student/Interview'));
const ProjectLab = lazy(() => import('./pages/student/ProjectLab'));
const Simulator = lazy(() => import('./pages/student/Simulator'));
const Challenge = lazy(() => import('./pages/student/Challenge'));
const GovJobs = lazy(() => import('./pages/student/GovJobs'));
const Achievements = lazy(() => import('./pages/student/Achievements'));
const Profile = lazy(() => import('./pages/student/Profile'));
const Notifications = lazy(() => import('./pages/student/Notifications'));
const Privacy = lazy(() => import('./pages/Privacy'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminStudentData'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminInsights = lazy(() => import('./pages/admin/AdminInsights'));
const AdminActivities = lazy(() => import('./pages/admin/AdminActivities'));
const AdminOpportunities = lazy(() => import('./pages/admin/AdminOpportunities'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminPublish = lazy(() => import('./pages/admin/AdminPublish'));
const NotFound = lazy(() => import('./pages/NotFound'));

/**
 * ErrorBoundary — a broken screen should never be a blank one.
 * Catches render/lifecycle errors anywhere in the route tree and offers recovery.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // A real deployment forwards this to an error tracker (Sentry, etc.).
    console.error('[CareerX] render error:', error, info?.componentStack?.split('\n').slice(0, 4).join(' | '));
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-5 py-12 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-bad/30 bg-bad/10 text-bad">
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="h-display mt-5 text-2xl">Something went wrong on this screen</h1>
        <p className="muted mt-2 text-sm leading-relaxed">
          Your saved profile and progress are untouched — this is a rendering error only.
          Reloading usually fixes it; if it repeats, tell us which page you were on.
        </p>
        <pre className="mt-4 max-h-28 w-full overflow-auto rounded-xl border border-line bg-surface2/60 p-3 text-left font-mono text-[11px] text-muted">
          {String(error?.message || error)}
        </pre>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { this.reset(); window.location.assign('/'); }}>
            Go to home
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </div>
    );
  }
}

export function RouteFallback() {
  const { t } = useI18n();
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-hidden />
        {t('common.loading')}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} lines={4} />)}
      </div>
      <CardSkeleton lines={6} />
    </div>
  );
}

function PublicLayout() {
  return (
    <>
      <SiteHeader />
      <main id="main"><Outlet /></main>
      <SiteFooter />
    </>
  );
}

function AuthLayout() {
  const { user, isStudent, isAdmin } = useApp();
  const location = useLocation();
  const from = location.state?.from;
  if (user) {
    const to = from || (isAdmin ? '/admin/dashboard' : '/app/dashboard');
    return <Navigate to={to} replace />;
  }
  return (
    <div className="relative flex min-h-screen flex-col">
      <AuthTopBar />
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <Outlet />
      </div>
    </div>
  );
}

function AuthTopBar() {
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link to="/" aria-label="CareerX home"><Logo size={34} /></Link>
      <TopControls compact />
    </header>
  );
}

function StudentShell() {
  return (
    <RequireRole role="student">
      <AppShell>
        <Suspense fallback={<RouteFallback />}><Outlet /></Suspense>
      </AppShell>
      <Chatbot />
    </RequireRole>
  );
}

function AdminShell() {
  return (
    <RequireRole role="admin">
      <AppShell isAdmin>
        <Suspense fallback={<RouteFallback />}><Outlet /></Suspense>
      </AppShell>
      <Chatbot />
    </RequireRole>
  );
}

/** Students must finish onboarding before the dashboard makes sense. */
function RequireOnboarded() {
  const { onboarded, ready } = useApp();
  const location = useLocation();
  if (!ready) return null;
  if (!onboarded) return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

function OnboardingGate() {
  const { onboarded } = useApp();
  const location = useLocation();
  if (onboarded) return <Navigate to={location.state?.from || '/app/dashboard'} replace />;
  return (
    <RequireRole role="student">
      <Suspense fallback={<RouteFallback />}><Onboarding /></Suspense>
    </RequireRole>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

/**
 * Applies the in-app "reduce motion" preference (Profile / Admin Settings).
 * The OS-level prefers-reduced-motion query is handled in index.css as well.
 */
function MotionPreference() {
  const { settings } = useApp();
  useEffect(() => {
    const root = document.documentElement;
    if (settings?.reducedMotion) root.classList.add('reduce-motion');
    else root.classList.remove('reduce-motion');
  }, [settings?.reducedMotion]);
  return null;
}

function Shell() {
  return (
    <>
      <Background />
      <ScrollToTop />
      <MotionPreference />
      <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
          </Route>

          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<PasswordReset />} />
            <Route path="/reset-password" element={<PasswordReset />} />
          </Route>

          <Route path="/onboarding" element={<OnboardingGate />} />

          <Route path="/app" element={<StudentShell />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route element={<RequireOnboarded />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="ai-career" element={<AICareer />} />
              <Route path="roadmap" element={<Roadmap />} />
              <Route path="skill-gap" element={<SkillGap />} />
              <Route path="courses" element={<Courses />} />
              <Route path="jobs" element={<Opportunities type="job" />} />
              <Route path="internships" element={<Opportunities type="internship" />} />
              <Route path="resume" element={<Resume />} />
              <Route path="interview" element={<Interview />} />
              <Route path="project-lab" element={<ProjectLab />} />
              <Route path="simulator" element={<Simulator />} />
              <Route path="challenge" element={<Challenge />} />
              <Route path="government" element={<GovJobs />} />
              <Route path="achievements" element={<Achievements />} />
              <Route path="profile" element={<Profile />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="privacy" element={<Privacy />} />
            </Route>
          </Route>

          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="skill-insights" element={<AdminInsights />} />
            <Route path="activities" element={<AdminActivities />} />
            <Route path="opportunities" element={<AdminOpportunities />} />
            <Route path="publish/jobs" element={<AdminPublish section="jobs" />} />
            <Route path="publish/internships" element={<AdminPublish section="internships" />} />
            <Route path="publish/government" element={<AdminPublish section="government" />} />
            <Route path="publish/courses" element={<AdminPublish section="courses" />} />
            <Route path="publish/history" element={<AdminPublish section="history" />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          <Route path="/privacy" element={<PublicLayout />}>
            <Route index element={<Suspense fallback={<RouteFallback />}><Privacy /></Suspense>} />
          </Route>

          <Route path="*" element={<Suspense fallback={<RouteFallback />}><NotFound /></Suspense>} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
      <Toaster />
    </>
  );
}

export default function App() {
  useEffect(() => {
    // Remove the pre-hydration splash once React owns the document.
    const boot = document.getElementById('boot');
    if (boot) {
      boot.style.opacity = '0';
      setTimeout(() => boot.remove(), 380);
    }
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppProvider>
          <BrowserRouter>
            <Shell />
          </BrowserRouter>
        </AppProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
