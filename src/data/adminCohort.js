import { CAREERS } from './careers';
import { SKILLS } from './catalog';
import { COURSES } from './courses';
import { seeded } from '../lib/utils';

/**
 * Demo cohort used by the Admin interface.
 *
 * HONESTY NOTE: these students are FICTIONAL. The dataset is generated
 * deterministically (seeded PRNG) so analytics never jitter between reloads, and the
 * admin UI labels it "Demo Data". AI Institutional Insights are computed FROM this
 * dataset at runtime (see src/services/adminService.js) rather than hard-coded, so the
 * insights are genuinely derived, not decoration.
 */

const FIRST = ['Aarav', 'Diya', 'Rohan', 'Ananya', 'Kabir', 'Ishita', 'Vihaan', 'Saanvi', 'Arjun', 'Meera', 'Aditya', 'Nisha', 'Yash', 'Riya', 'Karan', 'Tanvi', 'Neel', 'Pooja', 'Harsh', 'Sneha', 'Vivaan', 'Aisha', 'Dev', 'Nikita', 'Om', 'Kavya', 'Reyansh', 'Anjali', 'Shaurya', 'Ira', 'Manav', 'Trisha', 'Ayaan', 'Ritika', 'Dhruv', 'Sara', 'Krish', 'Nandini', 'Aryan', 'Priya', 'Lakshay', 'Fatima', 'Siddharth', 'Divya', 'Atharv', 'Zoya'];
const LAST = ['Sharma', 'Verma', 'Patel', 'Joshi', 'Nair', 'Reddy', 'Kulkarni', 'Singh', 'Mehta', 'Iyer', 'Das', 'Khan', 'Gupta', 'Rao', 'Bose', 'Malhotra', 'Chouhan', 'Saxena', 'Deshmukh', 'Agarwal', 'Pillai', 'Mishra', 'Sethi', 'Yadav'];
const BRANCHES = ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Artificial Intelligence & Data Science', 'Mechanical', 'Civil', 'Electrical'];
const CITIES = ['Bhopal', 'Indore', 'Jabalpur', 'Pune', 'Bengaluru', 'Delhi NCR', 'Hyderabad', 'Remote (India)'];
const ACTIVITY_TEMPLATES = [
  ['Generated career intelligence report', 'करियर इंटेलिजेंस रिपोर्ट बनाई', 'AI Career'],
  ['Closed a skill gap in SQL', 'SQL में स्किल गैप भरा', 'Skill Gap'],
  ['Marked roadmap task complete', 'रोडमैप कार्य पूर्ण चिह्नित किया', 'Roadmap'],
  ['Saved a recommended course', 'सुझाया गया कोर्स सेव किया', 'Courses'],
  ['Applied to an internship', 'इंटर्नशिप के लिए आवेदन किया', 'Internship'],
  ['Completed a mock interview', 'मॉक इंटरव्यू पूरा किया', 'Interview'],
  ['Updated resume in AI Builder', 'AI बिल्डर में रिज़्यूमे अपडेट किया', 'Resume'],
  ['Started a Project Lab project', 'प्रोजेक्ट लैब प्रोजेक्ट शुरू किया', 'Project Lab'],
  ['Tracked a government opportunity', 'सरकारी अवसर ट्रैक किया', 'Government'],
  ['Asked CareerX AI a question', 'CareerX AI से प्रश्न पूछा', 'Assistant'],
  ['Completed 30-day challenge phase', '30-दिन चुनौती चरण पूरा किया', 'Challenge'],
  ['Uploaded profile photo', 'प्रोफ़ाइल फ़ोटो अपलोड की', 'Profile'],
];
const STATUSES = ['completed', 'in-progress', 'pending'];

export function buildCohort(size = 46, seed = 20260926) {
  const rnd = seeded(seed);
  const gapPool = SKILLS.filter((s) => ['technical', 'tools', 'soft', 'industry'].includes(s.cat)).map((s) => s.id);
  const students = [];

  for (let i = 0; i < size; i += 1) {
    const name = `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`;
    const branch = BRANCHES[Math.floor(rnd() * BRANCHES.length)];
    const career = CAREERS[Math.floor(rnd() * CAREERS.length)];
    const engagement = rnd(); // 0..1 — drives every metric so the cohort looks correlated, not random noise
    const completion = Math.round(35 + engagement * 60 + rnd() * 5);
    const readiness = Math.round(Math.min(97, 28 + engagement * 58 + rnd() * 12));
    const employability = Math.round(Math.min(96, readiness * 0.82 + rnd() * 14));
    const resumeScore = Math.round(Math.min(98, 25 + engagement * 62 + rnd() * 12));
    const interviews = engagement > 0.72 ? Math.floor(rnd() * 4) + 2 : engagement > 0.4 ? Math.floor(rnd() * 2) + 1 : rnd() > 0.55 ? 1 : 0;
    const bestInterview = interviews ? Math.round(48 + rnd() * 44) : 0;
    const projects = Math.round(engagement * 3 + rnd() * 1.6);
    const applications = engagement > 0.55 ? Math.floor(rnd() * 6) : Math.floor(rnd() * 2);
    const gaps = [];
    const gapCount = 2 + Math.floor(rnd() * 2);
    while (gaps.length < gapCount) {
      const g = gapPool[Math.floor(rnd() * gapPool.length)];
      if (!gaps.includes(g)) gaps.push(g);
    }
    // Bias the cohort toward a realistic pattern: SQL and communication dominate.
    if (rnd() < 0.42 && !gaps.includes('sql')) gaps[0] = 'sql';
    if (rnd() < 0.38 && !gaps.includes('communication')) gaps[gaps.length - 1] = 'communication';

    students.push({
      id: `st_${(i + 1).toString().padStart(3, '0')}`,
      name,
      email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}${i}@student.demo`,
      branch,
      degree: branch === 'Mechanical' || branch === 'Civil' || branch === 'Electrical' ? 'B.Tech / B.E.' : 'B.Tech / B.E.',
      gradYear: rnd() > 0.5 ? 2026 : 2027,
      cgpa: Number((6.2 + rnd() * 3.4).toFixed(2)),
      city: CITIES[Math.floor(rnd() * CITIES.length)],
      targetCareer: career.id,
      targetCareerName: career.n,
      completion,
      readiness,
      employability,
      resumeScore,
      interviews,
      bestInterview,
      projects,
      applications,
      skillGaps: gaps,
      courses: COURSES.filter(() => rnd() < 0.18).slice(0, 3).map((c) => c.id),
      lastActiveDays: Math.round((1 - engagement) * 24 + rnd() * 3),
      joinedDaysAgo: Math.round(20 + rnd() * 130),
    });
  }

  const activities = [];
  for (let i = 0; i < 34; i += 1) {
    const st = students[Math.floor(rnd() * students.length)];
    const tpl = ACTIVITY_TEMPLATES[Math.floor(rnd() * ACTIVITY_TEMPLATES.length)];
    activities.push({
      id: `act_${i + 1}`,
      userId: st.id,
      userName: st.name,
      branch: st.branch,
      activity: [tpl[0], tpl[1]],
      category: tpl[2],
      status: STATUSES[Math.floor(rnd() * STATUSES.length)],
      at: new Date(Date.now() - Math.round(rnd() * 21) * 86400000 - Math.round(rnd() * 20) * 3600000).toISOString(),
    });
  }
  activities.sort((a, b) => new Date(b.at) - new Date(a.at));

  // 6-month cohort trend (demo series, seeded so it is stable)
  const trend = [];
  const base = 34 + rnd() * 6;
  for (let m = 5; m >= 0; m -= 1) {
    const at = new Date();
    at.setMonth(at.getMonth() - m);
    trend.push({
      at: at.toISOString(),
      label: [at.toLocaleString('en-IN', { month: 'short' }), at.toLocaleString('hi-IN', { month: 'short' })],
      readiness: Math.round(Math.min(92, base + (5 - m) * 6.4 + rnd() * 3)),
      active: Math.round(18 + (5 - m) * 4 + rnd() * 5),
      resumes: Math.round(9 + (5 - m) * 3.2 + rnd() * 4),
      interviews: Math.round(4 + (5 - m) * 2.6 + rnd() * 3),
    });
  }

  return { students, activities, trend, generatedAt: new Date().toISOString() };
}

export default buildCohort;
