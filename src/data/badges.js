/**
 * Achievement system.
 * `check(snapshot)` receives a derived snapshot built in src/services/achievementService.js
 * so badge logic stays declarative, testable and free of UI concerns.
 */
export const BADGES = [
  {
    id: 'profile-complete', emoji: '🏆', icon: 'BadgeCheck', tone: 'brand',
    n: ['Profile Complete', 'प्रोफ़ाइल पूर्ण'],
    d: ['Your career profile is rich enough for accurate AI guidance.', 'आपकी करियर प्रोफ़ाइल AI मार्गदर्शन के लिए पर्याप्त विस्तृत है।'],
    how: ['Reach 90% profile completion.', '90% प्रोफ़ाइल पूर्णता तक पहुँचें।'],
    check: (s) => s.profileCompletion >= 90,
  },
  {
    id: 'first-project', emoji: '💻', icon: 'Code2', tone: 'accent',
    n: ['First Project', 'पहला प्रोजेक्ट'],
    d: ['You marked a Project Lab project as completed.', 'आपने प्रोजेक्ट लैब का एक प्रोजेक्ट पूर्ण चिह्नित किया।'],
    how: ['Complete any project in the Project Lab.', 'प्रोजेक्ट लैब में कोई भी प्रोजेक्ट पूरा करें।'],
    check: (s) => s.completedProjects >= 1,
  },
  {
    id: 'skill-master', emoji: '📚', icon: 'BookOpen', tone: 'ok',
    n: ['Skill Master', 'स्किल मास्टर'],
    d: ['You closed three skill gaps for your target career.', 'आपने लक्षित करियर के तीन स्किल गैप भरे।'],
    how: ['Raise three target-career skills to “Comfortable” or higher.', 'लक्षित करियर के तीन कौशल “अच्छा” या उससे ऊपर ले जाएँ।'],
    check: (s) => s.gapsClosed >= 3,
  },
  {
    id: 'interview-ready', emoji: '🎤', icon: 'Mic', tone: 'warn',
    n: ['Interview Ready', 'इंटरव्यू तैयार'],
    d: ['You scored 70+ in an AI mock interview.', 'आपने AI मॉक इंटरव्यू में 70+ स्कोर किया।'],
    how: ['Complete a mock interview with an overall score of 70 or more.', 'कम से कम 70 कुल स्कोर वाला मॉक इंटरव्यू पूरा करें।'],
    check: (s) => s.bestInterviewScore >= 70,
  },
  {
    id: 'resume-ready', emoji: '📄', icon: 'FileText', tone: 'brand',
    n: ['Resume Ready', 'रिज़्यूमे तैयार'],
    d: ['Your resume readiness score crossed 75.', 'आपका रिज़्यूमे रेडीनेस स्कोर 75 पार कर गया।'],
    how: ['Improve your resume in the AI Resume Builder to 75+.', 'AI रिज़्यूमे बिल्डर में अपना रिज़्यूमे 75+ तक सुधारें।'],
    check: (s) => s.resumeScore >= 75,
  },
  {
    id: 'career-launch', emoji: '🚀', icon: 'Rocket', tone: 'accent',
    n: ['Career Launch', 'करियर लॉन्च'],
    d: ['You applied to three matched opportunities.', 'आपने तीन मैच्ड अवसरों पर आवेदन किया।'],
    how: ['Submit three applications from Jobs, Internships or Government Hub.', 'Jobs, Internships या Government Hub से तीन आवेदन जमा करें।'],
    check: (s) => s.applications >= 3,
  },
  {
    id: 'roadmap-runner', emoji: '🗺️', icon: 'Map', tone: 'ok',
    n: ['Roadmap Runner', 'रोडमैप रनर'],
    d: ['Half of your personalized roadmap is complete.', 'आपका आधा व्यक्तिगत रोडमैप पूरा हो गया।'],
    how: ['Complete at least 50% of roadmap tasks.', 'कम से कम 50% रोडमैप कार्य पूरे करें।'],
    check: (s) => s.roadmapProgress >= 50,
  },
  {
    id: 'course-collector', emoji: '🎓', icon: 'GraduationCap', tone: 'brand',
    n: ['Course Collector', 'कोर्स कलेक्टर'],
    d: ['Three courses added to your learning plan.', 'तीन कोर्स आपकी लर्निंग प्लान में जोड़े गए।'],
    how: ['Save three recommended courses to your plan.', 'तीन सुझाए गए कोर्स अपनी योजना में सेव करें।'],
    check: (s) => s.savedCourses >= 3,
  },
  {
    id: 'consistent-mind', emoji: '🔥', icon: 'Flame', tone: 'warn',
    n: ['Consistent Mind', 'निरंतर मन'],
    d: ['You kept a 7-day activity streak.', 'आपने 7 दिन की लगातार सक्रियता बनाए रखी।'],
    how: ['Open CareerX and complete any action on seven consecutive days.', 'सात लगातार दिनों तक CareerX खोलें और कोई भी क्रिया पूरी करें।'],
    check: (s) => s.streak >= 7,
  },
  {
    id: 'first-ask', emoji: '💬', icon: 'MessageSquare', tone: 'accent',
    n: ['First Ask', 'पहला प्रश्न'],
    d: ['You asked CareerX AI your first question.', 'आपने CareerX AI से पहला प्रश्न पूछा।'],
    how: ['Send one message to the AI assistant.', 'AI सहायक को एक संदेश भेजें।'],
    check: (s) => s.chatMessages >= 1,
  },
  {
    id: 'lab-experimenter', emoji: '🧪', icon: 'FlaskConical', tone: 'ok',
    n: ['Lab Experimenter', 'लैब प्रयोगकर्ता'],
    d: ['Two projects are in progress at the same time.', 'एक साथ दो प्रोजेक्ट प्रगति पर हैं।'],
    how: ['Move two Project Lab projects to In Progress.', 'प्रोजेक्ट लैब के दो प्रोजेक्ट “प्रगति पर” करें।'],
    check: (s) => s.activeProjects >= 2,
  },
  {
    id: 'gov-explorer', emoji: '🏛️', icon: 'Landmark', tone: 'brand',
    n: ['Gov Explorer', 'सरकारी अवसर खोजी'],
    d: ['You tracked a government opportunity.', 'आपने एक सरकारी अवसर ट्रैक किया।'],
    how: ['Track any listing in the Government Career Hub.', 'Government Career Hub में कोई भी सूची ट्रैक करें।'],
    check: (s) => s.trackedGov >= 1,
  },
];

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]));
export default BADGES;
