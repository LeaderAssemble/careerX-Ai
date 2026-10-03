import {
  LayoutDashboard, BrainCircuit, Map, Crosshair, BookOpen, Briefcase, GraduationCap,
  FileText, Mic, FlaskConical, Rocket, Landmark, Trophy, User, Bell, ShieldCheck,
  Flag, Users, BarChart3, Activity, ListChecks, Settings, Sparkles, Upload, Clock,
} from 'lucide-react';

/**
 * Navigation model — labels are dictionary keys so the whole shell switches language.
 * Student and Admin shells are completely separate, as required.
 */
export const STUDENT_NAV = [
  {
    id: 'plan', labelKey: 'nav.group.plan', icon: Sparkles,
    items: [
      { to: '/app/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
      { to: '/app/ai-career', labelKey: 'nav.aiCareer', icon: BrainCircuit },
      { to: '/app/roadmap', labelKey: 'nav.roadmap', icon: Map },
      { to: '/app/skill-gap', labelKey: 'nav.skillgap', icon: Crosshair },
      { to: '/app/challenge', labelKey: 'nav.challenge', icon: Flag },
    ],
  },
  {
    id: 'build', labelKey: 'nav.group.build', icon: GraduationCap,
    items: [
      { to: '/app/courses', labelKey: 'nav.courses', icon: BookOpen },
      { to: '/app/project-lab', labelKey: 'nav.lab', icon: FlaskConical },
      { to: '/app/resume', labelKey: 'nav.resume', icon: FileText },
      { to: '/app/interview', labelKey: 'nav.interview', icon: Mic },
      { to: '/app/simulator', labelKey: 'nav.simulator', icon: Rocket },
    ],
  },
  {
    id: 'opportunity', labelKey: 'nav.group.opportunity', icon: Briefcase,
    items: [
      { to: '/app/jobs', labelKey: 'nav.jobs', icon: Briefcase },
      { to: '/app/internships', labelKey: 'nav.internships', icon: GraduationCap },
      { to: '/app/government', labelKey: 'nav.gov', icon: Landmark },
      { to: '/app/achievements', labelKey: 'nav.achievements', icon: Trophy },
    ],
  },
  {
    id: 'account', labelKey: 'nav.group.account', icon: User,
    items: [
      { to: '/app/profile', labelKey: 'nav.profile', icon: User },
      { to: '/app/notifications', labelKey: 'nav.notifications', icon: Bell },
      { to: '/app/privacy', labelKey: 'nav.privacy', icon: ShieldCheck },
    ],
  },
];

export const ADMIN_NAV = [
  {
    id: 'admin', labelKey: 'nav.group.plan', icon: LayoutDashboard,
    items: [
      { to: '/admin/dashboard', labelKey: 'nav.admin.dashboard', icon: LayoutDashboard },
      { to: '/admin/users', labelKey: 'nav.admin.users', icon: Users },
      { to: '/admin/analytics', labelKey: 'nav.admin.analytics', icon: BarChart3 },
      { to: '/admin/skill-insights', labelKey: 'nav.admin.insights', icon: Crosshair },
      { to: '/admin/activities', labelKey: 'nav.admin.activities', icon: Activity },
      { to: '/admin/opportunities', labelKey: 'nav.admin.opportunities', icon: ListChecks },
      { to: '/admin/settings', labelKey: 'nav.admin.settings', icon: Settings },
    ],
  },
  {
    id: 'publish', labelKey: 'nav.admin.publish', icon: Upload,
    items: [
      { to: '/admin/publish/jobs', labelKey: 'nav.admin.publishJobs', icon: Briefcase },
      { to: '/admin/publish/internships', labelKey: 'nav.admin.publishInternships', icon: GraduationCap },
      { to: '/admin/publish/government', labelKey: 'nav.admin.publishGovernment', icon: Landmark },
      { to: '/admin/publish/courses', labelKey: 'nav.admin.publishCourses', icon: BookOpen },
      { to: '/admin/publish/history', labelKey: 'nav.admin.publishHistory', icon: Clock },
    ],
  },
];

/** Five most-used destinations for the mobile bottom navigation. */
export const MOBILE_NAV = [
  { to: '/app/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/app/ai-career', labelKey: 'nav.aiCareer', icon: BrainCircuit },
  { to: '/app/roadmap', labelKey: 'nav.roadmap', icon: Map },
  { to: '/app/jobs', labelKey: 'nav.jobs', icon: Briefcase },
  { to: '/app/profile', labelKey: 'nav.profile', icon: User },
];

export const FLAT_STUDENT_NAV = STUDENT_NAV.flatMap((g) => g.items);
export const FLAT_ADMIN_NAV = ADMIN_NAV.flatMap((g) => g.items);

export default STUDENT_NAV;
