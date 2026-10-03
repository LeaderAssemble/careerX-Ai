/**
 * The "Hackathon Demo" student — a complete, realistic sample profile so judges can
 * see every feature populated in one click. Clearly fictional.
 */
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

export const DEMO_USER = {
  id: 'u_demo_student',
  role: 'student',
  name: 'Aarav Sharma',
  email: 'demo@student.com',
  passwordDemo: 'careerx123',
  college: 'Central Institute of Technology, Bhopal',
  degree: 'B.Tech / B.E.',
  branch: 'Computer Science',
  gradYear: 2026,
  onboarded: true,
  createdAt: daysAgo(120),
};

export const DEMO_PROFILE = {
  personal: {
    name: 'Aarav Sharma',
    email: 'demo@student.com',
    phone: '',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    address: '',
    college: 'Central Institute of Technology, Bhopal',
    avatar: null,
    avatarSeed: 'aarav',
  },
  education: {
    degree: 'B.Tech / B.E.',
    branch: 'Computer Science',
    cgpa: 8.2,
    gradYear: 2026,
    subjects: ['Data Structures', 'DBMS', 'Operating Systems', 'Computer Networks', 'Object Oriented Programming', 'Software Engineering'],
  },
  techSkills: [
    { id: 'python', level: 4 }, { id: 'javascript', level: 3 }, { id: 'java', level: 2 },
    { id: 'sql', level: 3 }, { id: 'dsa', level: 3 }, { id: 'dbms', level: 3 },
    { id: 'os', level: 2 }, { id: 'networks', level: 2 }, { id: 'html-css', level: 4 },
    { id: 'react', level: 3 }, { id: 'node', level: 2 }, { id: 'excel', level: 2 },
    { id: 'statistics', level: 1 }, { id: 'linux', level: 3 }, { id: 'testing', level: 2 },
    { id: 'ml', level: 1 },
  ],
  softSkills: [
    { id: 'communication', level: 3 }, { id: 'problem-solving', level: 4 }, { id: 'teamwork', level: 3 },
    { id: 'leadership', level: 2 }, { id: 'adaptability', level: 3 }, { id: 'creativity', level: 2 },
    { id: 'presentation', level: 3 }, { id: 'time-management', level: 3 },
  ],
  toolSkills: [{ id: 'git', level: 4 }, { id: 'docker', level: 1 }, { id: 'postman', level: 3 }, { id: 'figma', level: 1 }, { id: 'cloud', level: 1 }],
  industrySkills: [{ id: 'agile', level: 2 }, { id: 'sdlc', level: 3 }, { id: 'documentation', level: 3 }],
  interests: ['building-products', 'data-patterns', 'infra'],
  careerAreas: ['software-developer', 'data-analyst'],
  projects: [
    { id: 'dp1', title: ['Campus Event Management Portal', 'कैंपस इवेंट मैनेजमेंट पोर्टल'], desc: ['Built a role-based portal for 4 college fests: event creation, registrations and a live dashboard. Handled the database schema and the React front end.', '4 कॉलेज फ़ेस्ट के लिए भूमिका-आधारित पोर्टल बनाया: इवेंट निर्माण, पंजीकरण और लाइव डैशबोर्ड। डेटाबेस स्कीमा और रिऐक्ट फ्रंटएंड संभाला।'], tech: 'React, Node.js, MySQL', status: 'completed', link: 'github.com/sample/campus-portal' },
    { id: 'dp2', title: ['Hostel Mess Feedback Analyser', 'हॉस्टल मेस फ़ीडबैक विश्लेषक'], desc: ['Collected 600+ responses, cleaned them in Python and published a weekly summary report for the mess committee.', '600+ प्रतिक्रियाएँ एकत्र कीं, पाइथन में साफ़ कीं और मेस कमेटी के लिए साप्ताहिक सारांश रिपोर्ट प्रकाशित की।'], tech: 'Python, pandas, Matplotlib', status: 'in-progress', link: '' },
  ],
  experience: [
    { id: 'de1', role: ['Web Development Intern', 'वेब डेवलपमेंट इंटर्न'], company: ['Local EdTech startup (sample)', 'स्थानीय एडटेक स्टार्टअप (नमूना)'], period: ['Jun 2025 – Aug 2025', 'जून 2025 – अगस्त 2025'], bullets: ['Built 6 reusable UI components used across the student dashboard', 'Reduced page load time by 22% by lazy-loading heavy routes', 'Wrote API integration tests covering 12 endpoints'] },
  ],
  certifications: [
    { id: 'dc1', name: ['Python for Everybody', 'पाइथन फ़ॉर एवरीबडी'], issuer: 'Online course provider (sample)', year: 2025 },
  ],
  workType: 'hybrid',
  locationPref: 'Bengaluru, Pune, Remote (India)',
  goal: 'Get placed in a software product company',
  targetCareer: 'software-developer',
};

export const DEMO_PROGRESS = {
  skillUpdates: { git: 3, documentation: 2 },
  savedCourses: [{ id: 'c-sql-core', at: daysAgo(6) }, { id: 'c-dsa-crack', at: daysAgo(11) }, { id: 'c-comm', at: daysAgo(2) }],
  projects: { p1: 'completed', p2: 'in-progress' },
  applications: [{ id: 'j1', at: daysAgo(4), type: 'job' }, { id: 'i1', at: daysAgo(9), type: 'internship' }],
  trackedGov: ['g2', 'g13'],
  challenge: { startedAt: daysAgo(19), done: ['c30-1', 'c30-2', 'c30-4', 'c30-6'] },
  interviews: [
    {
      id: 'iv_demo2', track: 'software', level: 'intermediate', at: daysAgo(3), score: 80,
      dims: { communication: 82, technical: 84, confidence: 76, relevance: 81, structure: 74 },
      answers: 5, voice: true,
    },
    {
      id: 'iv_demo1', track: 'software', level: 'intermediate', at: daysAgo(8), score: 68,
      dims: { communication: 62, technical: 74, confidence: 66, relevance: 72, structure: 58 },
      answers: 5, voice: false,
    },
  ],
  resume: {
    template: 'modern',
    personal: { name: 'Aarav Sharma', headline: ['Final-year Computer Science student', 'अंतिम वर्ष के कंप्यूटर साइंस छात्र'], email: 'demo@student.com', phone: '+91 98xxx xxxxx', city: ['Bhopal', 'भोपाल'], github: 'github.com/aarav-sample', linkedin: 'linkedin.com/in/aarav-sample' },
    summary: 'Final-year Computer Science student (CGPA 8.2) with hands-on full-stack project experience and a summer web development internship. Comfortable with Python, JavaScript and React; currently strengthening SQL and Git workflows to contribute to production codebases from day one.',
    education: [{ id: 're1', degree: 'B.Tech, Computer Science', institute: 'MANIT Bhopal', period: '2022 – 2026', score: 'CGPA 8.2' }],
    skills: ['Python', 'JavaScript', 'React', 'Node.js', 'SQL', 'Git', 'HTML/CSS', 'MySQL', 'REST APIs', 'Problem Solving'],
    projects: [
      { id: 'rp1', title: 'Campus Event Management Portal', tech: 'React, Node.js, MySQL', link: 'github.com/sample/campus-portal', bullets: 'Built a role-based event portal serving 4 college fests and 1,200+ registrations\nDesigned a normalized MySQL schema with 8 tables and indexed lookups\nReduced registration errors by adding validation on both client and server' },
      { id: 'rp2', title: 'Hostel Mess Feedback Analyser', tech: 'Python, pandas', link: '', bullets: 'Collected and cleaned 600+ survey responses with pandas\nPublished a weekly summary report used by the mess committee' },
    ],
    experience: [
      { id: 'rx1', role: 'Web Development Intern', company: 'Local EdTech startup (sample)', period: 'Jun 2025 – Aug 2025', bullets: 'Developed 6 reusable UI components adopted across the student dashboard\nReduced page load time by 22% through route-level lazy loading\nAdded API integration tests covering 12 endpoints' },
    ],
    achievements: [
      { id: 'ra1', text: 'Winner, intra-college 24-hour hackathon (team of 4)' },
      { id: 'ra2', text: 'Core member, college technical fest organising committee' },
    ],
    updatedAt: daysAgo(3),
  },
  chatCount: 4,
  streak: { count: 5, lastActive: daysAgo(0) },
  readinessHistory: [
    { at: daysAgo(45), score: 41 }, { at: daysAgo(36), score: 48 }, { at: daysAgo(27), score: 55 },
    { at: daysAgo(18), score: 61 }, { at: daysAgo(9), score: 68 }, { at: daysAgo(0), score: null },
  ],
  roadmapDoneIds: [], // filled by authService.loadDemoStudent() after roadmap generation
  badges: {},
};

/** Deterministic set of roadmap task ids that the demo student has already completed. */
export const DEMO_ROADMAP_DONE = [
  'software-developer-m1-t0', 'software-developer-m1-t1', 'software-developer-m1-t2',
  'software-developer-m2-t0', 'software-developer-m2-t1', 'software-developer-m2-t2',
  'software-developer-m3-t0', 'software-developer-m3-t1', 'software-developer-m3-t2',
];

export default DEMO_PROFILE;
