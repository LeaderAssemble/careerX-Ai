/**
 * Master skill / interest / option catalog.
 * Content is bilingual using [english, hindi] pairs resolved by L() from src/i18n.
 * `why`, `hours` and `difficulty` power the Skill Gap page.
 */

export const SKILL_CATEGORIES = {
  technical: ['Technical', 'तकनीकी'],
  soft: ['Soft Skills', 'सॉफ्ट स्किल्स'],
  tools: ['Tools', 'टूल्स'],
  industry: ['Industry Skills', 'इंडस्ट्री कौशल'],
};

export const SKILLS = [
  /* ---------------- technical ---------------- */
  { id: 'python', n: ['Python', 'पाइथन'], cat: 'technical', diff: 2, hrs: 60, why: ['The default language for data, automation and AI work.', 'डेटा, ऑटोमेशन और AI कार्य की डिफ़ॉल्ट भाषा।'], res: [['Programming with Python — NPTEL', 'nptel.ac.in'], ['Python for Everybody (sample listing)', 'py4e.com']] },
  { id: 'javascript', n: ['JavaScript', 'जावास्क्रिप्ट'], cat: 'technical', diff: 2, hrs: 70, why: ['Powers every browser; essential for any web-facing role.', 'हर ब्राउज़र की बुनियाद; वेब रोल्स के लिए आवश्यक।'], res: [['freeCodeCamp JavaScript (sample)', 'freecodecamp.org'], ['MDN Web Docs', 'developer.mozilla.org']] },
  { id: 'java', n: ['Java / Core OOP', 'जावा / कोर OOP'], cat: 'technical', diff: 2, hrs: 70, why: ['Still the backbone of large enterprise and banking systems.', 'बड़े एंटरप्राइज़ और बैंकिंग सिस्टम की रीढ़।'], res: [['Object Oriented Design — NPTEL', 'nptel.ac.in']] },
  { id: 'sql', n: ['SQL', 'एसक्यूएल'], cat: 'technical', diff: 2, hrs: 40, why: ['Every data role reads and writes SQL daily; it is the most requested gap skill.', 'हर डेटा रोल में रोज़ SQL उपयोग होता है; सबसे अधिक माँगा जाने वाला गैप स्किल।'], res: [['Database Management System — NPTEL', 'nptel.ac.in'], ['SQL practice (sample)', 'sql-practice.com']] },
  { id: 'dsa', n: ['Data Structures & Algorithms', 'डेटा स्ट्रक्चर और अल्गोरिदम'], cat: 'technical', diff: 3, hrs: 120, why: ['The filter used in almost every technical interview round.', 'लगभग हर तकनीकी इंटरव्यू राउंड का फ़िल्टर।'], res: [['Design & Analysis of Algorithms — NPTEL', 'nptel.ac.in']] },
  { id: 'dbms', n: ['DBMS concepts', 'DBMS अवधारणाएँ'], cat: 'technical', diff: 2, hrs: 35, why: ['Normalisation and indexing questions are interview staples.', 'नॉर्मलाइज़ेशन और इंडेक्सिंग प्रश्न इंटरव्यू में आम हैं।'], res: [['Database Systems — NPTEL', 'nptel.ac.in']] },
  { id: 'os', n: ['Operating Systems', 'ऑपरेटिंग सिस्टम'], cat: 'technical', diff: 3, hrs: 45, why: ['Processes, memory and scheduling come up in system design and core CS rounds.', 'प्रोसेस, मेमोरी और शेड्यूलिंग सिस्टम डिज़ाइन और कोर CS राउंड में आते हैं।'], res: [['Operating Systems — NPTEL', 'nptel.ac.in']] },
  { id: 'networks', n: ['Computer Networks', 'कंप्यूटर नेटवर्क'], cat: 'technical', diff: 3, hrs: 45, why: ['TCP/IP and DNS basics are expected for cloud, backend and security roles.', 'क्लाउड, बैकएंड और सिक्योरिटी रोल्स के लिए TCP/IP और DNS आवश्यक।'], res: [['Computer Networks — NPTEL', 'nptel.ac.in']] },
  { id: 'html-css', n: ['HTML & CSS', 'HTML और CSS'], cat: 'technical', diff: 1, hrs: 30, why: ['The entry point to every front-end and full-stack job.', 'हर फ्रंटएंड और फुल-स्टैक job का प्रवेश बिंदु।'], res: [['MDN Web Docs', 'developer.mozilla.org']] },
  { id: 'react', n: ['React', 'रिऐक्ट'], cat: 'technical', diff: 3, hrs: 60, why: ['The most requested front-end framework in Indian job postings.', 'भारतीय जॉब पोस्टिंग में सबसे अधिक माँगा गया फ्रंटएंड फ्रेमवर्क।'], res: [['React official docs', 'react.dev']] },
  { id: 'node', n: ['Node.js & APIs', 'नोड.js और API'], cat: 'technical', diff: 3, hrs: 55, why: ['Lets you ship a full product alone — backend, auth and REST APIs.', 'आपको अकेले पूरा प्रोडक्ट बनाने देता है — बैकएंड, auth और REST API।'], res: [['Node.js guides', 'nodejs.org']] },
  { id: 'statistics', n: ['Statistics', 'सांख्यिकी'], cat: 'technical', diff: 3, hrs: 50, why: ['Without it, analysis is description instead of insight.', 'इसके बिना विश्लेषण केवल विवरण रह जाता है, अंतर्दृष्टि नहीं।'], res: [['Statistics — NPTEL / Khan Academy (sample)', 'nptel.ac.in']] },
  { id: 'ml', n: ['Machine Learning', 'मशीन लर्निंग'], cat: 'technical', diff: 3, hrs: 110, why: ['Core requirement for AI/ML roles and increasingly for analyst roles.', 'AI/ML रोल्स की मुख्य आवश्यकता।'], res: [['Intro to Machine Learning — NPTEL', 'nptel.ac.in']] },
  { id: 'excel', n: ['Advanced Excel', 'एडवांस एक्सेल'], cat: 'technical', diff: 1, hrs: 25, why: ['Most first analyst tasks still live inside spreadsheets.', 'ज्यादातर शुरुआती एनालिस्ट कार्य अभी भी स्प्रेडशीट में होते हैं।'], res: [['Excel essentials (sample listing)', 'support.microsoft.com']] },
  { id: 'linux', n: ['Linux & Shell', 'लिनक्स और शेल'], cat: 'technical', diff: 2, hrs: 35, why: ['Servers, CI pipelines and cloud consoles all assume Linux fluency.', 'सर्वर, CI पाइपलाइन और क्लाउड कंसोल लिनक्स मानकर चलते हैं।'], res: [['Linux basics (sample)', 'linuxjourney.com']] },
  { id: 'security-basics', n: ['Security fundamentals', 'सुरक्षा की बुनियाद'], cat: 'technical', diff: 3, hrs: 60, why: ['Threat models, OWASP Top 10 and hardening are the analyst’s daily language.', 'थ्रेट मॉडल, OWASP Top 10 और हार्डनिंग एनालिस्ट की दैनिक भाषा है।'], res: [['OWASP Foundation', 'owasp.org']] },
  { id: 'testing', n: ['Software Testing', 'सॉफ्टवेयर टेस्टिंग'], cat: 'technical', diff: 2, hrs: 30, why: ['Shows engineering maturity; QA and SDET roles build directly on it.', 'इंजीनियरिंग परिपक्वता दिखाता है; QA और SDET रोल्स इसी पर टिके हैं।'], res: [['Software Testing — NPTEL', 'nptel.ac.in']] },
  { id: 'design-thinking', n: ['UI/UX & Design Thinking', 'UI/UX और डिज़ाइन थिंकिंग'], cat: 'technical', diff: 2, hrs: 45, why: ['Even engineering teams hire for users-first thinking.', 'इंजीनियरिंग टीमें भी यूज़र-फर्स्ट सोच की भर्ती करती हैं।'], res: [['Design fundamentals (sample)', 'lawsofux.com']] },

  /* ---------------- tools ---------------- */
  { id: 'git', n: ['Git & GitHub', 'गिट और गिटहब'], cat: 'tools', diff: 2, hrs: 20, why: ['No team ships code without version control; recruiters check your repo.', 'वर्ज़न कंट्रोल के बिना कोई टीम कोड शिप नहीं करती; भर्तीकर्ता आपका repo देखते हैं।'], res: [['Pro Git book', 'git-scm.com/book']] },
  { id: 'docker', n: ['Docker', 'डॉकर'], cat: 'tools', diff: 3, hrs: 25, why: ['Containers are how modern apps are packaged and deployed.', 'कंटेनर आज के ऐप्स पैकेज और डिप्लॉय करने का तरीका हैं।'], res: [['Docker docs (sample)', 'docs.docker.com']] },
  { id: 'cloud', n: ['Cloud (AWS / Azure)', 'क्लाउड (AWS / Azure)'], cat: 'tools', diff: 3, hrs: 50, why: ['Cloud familiarity separates graduates from job-ready engineers.', 'क्लाउड जानकारी ग्रेजुएट को जॉब-रेडी इंजीनियर से अलग करती है।'], res: [['AWS Skill Builder free tier (sample)', 'aws.amazon.com/training'], ['Microsoft Learn (sample)', 'learn.microsoft.com']] },
  { id: 'powerbi', n: ['Power BI / Tableau', 'पावर BI / टैब्लो'], cat: 'tools', diff: 2, hrs: 35, why: ['Dashboards are how analysts communicate findings to decision makers.', 'डैशबोर्ड से एनालिस्ट अपनी बात निर्णयकर्ताओं तक पहुँचाते हैं।'], res: [['Power BI learning path (sample)', 'learn.microsoft.com']] },
  { id: 'postman', n: ['API testing (Postman)', 'API टेस्टिंग (पोस्टमैन)'], cat: 'tools', diff: 1, hrs: 10, why: ['Proves you can validate the integrations you build.', 'साबित करता है कि आप अपनी इंटीग्रेशन जाँच सकते हैं।'], res: [['Postman learning centre (sample)', 'learning.postman.com']] },
  { id: 'figma', n: ['Figma', 'फिग्मा'], cat: 'tools', diff: 2, hrs: 20, why: ['Industry-standard tool for product design collaboration.', 'प्रोडक्ट डिज़ाइन सहयोग का मानक टूल।'], res: [['Figma help centre (sample)', 'help.figma.com']] },

  /* ---------------- soft ---------------- */
  { id: 'communication', n: ['Communication', 'संचार'], cat: 'soft', diff: 2, hrs: 40, why: ['The single most common reason strong technical candidates are rejected.', 'मज़बूत तकनीकी उम्मीदवारों के अस्वीकार होने का सबसे आम कारण।'], res: [['Practice mock interviews in CareerX', '']] },
  { id: 'problem-solving', n: ['Problem Solving', 'समस्या समाधान'], cat: 'soft', diff: 3, hrs: 60, why: ['Interviewers test how you think, not only what you know.', 'इंटरव्यूअर देखते हैं आप कैसे सोचते हैं, केवल क्या जानते हैं नहीं।'], res: [['Solve 3 problems weekly', '']] },
  { id: 'teamwork', n: ['Teamwork', 'टीमवर्क'], cat: 'soft', diff: 1, hrs: 20, why: ['Every real project is a team project.', 'हर वास्तविक प्रोजेक्ट टीम प्रोजेक्ट होता है।'], res: [['Contribute to a group project', '']] },
  { id: 'leadership', n: ['Leadership', 'नेतृत्व'], cat: 'soft', diff: 3, hrs: 40, why: ['Owning an outcome early is the fastest signal of seniority.', 'जल्दी किसी परिणाम की जिम्मेदारी लेना वरिष्ठता का सबसे तेज़ संकेत है।'], res: [['Lead a club, fest or project team', '']] },
  { id: 'adaptability', n: ['Adaptability', 'अनुकूलनशीलता'], cat: 'soft', diff: 2, hrs: 25, why: ['Tools change every year; learning speed does not expire.', 'टूल्स हर साल बदलते हैं; सीखने की गति कभी पुरानी नहीं होती।'], res: [['Learn one new tool per quarter', '']] },
  { id: 'creativity', n: ['Creativity', 'रचनात्मकता'], cat: 'soft', diff: 2, hrs: 30, why: ['Differentiates your projects from a thousand identical ones.', 'आपके प्रोजेक्ट को हज़ारों जैसे प्रोजेक्ट से अलग बनाती है।'], res: [['Build one original project', '']] },
  { id: 'presentation', n: ['Presentation & Storytelling', 'प्रस्तुति और स्टोरीटेलिंग'], cat: 'soft', diff: 2, hrs: 30, why: ['Insight only counts once stakeholders understand it.', 'अंतर्दृष्टि तभी मायने रखती है जब हितधारक उसे समझें।'], res: [['Record a 3-minute project demo', '']] },
  { id: 'time-management', n: ['Time Management', 'समय प्रबंधन'], cat: 'soft', diff: 1, hrs: 15, why: ['Consistent daily practice beats last-minute sprints.', 'रोज़ाना का निरंतर अभ्यास अंतिम समय की दौड़ से बेहतर है।'], res: [['Follow your 30-60-90 plan', '']] },

  /* ---------------- industry ---------------- */
  { id: 'agile', n: ['Agile / Scrum', 'एजाइल / स्क्रम'], cat: 'industry', diff: 2, hrs: 20, why: ['How modern product teams plan, review and ship work.', 'आधुनिक प्रोडक्ट टीमें इसी तरह काम तय और शिप करती हैं।'], res: [['Scrum Guide', 'scrumguides.org']] },
  { id: 'sdlc', n: ['SDLC & Code Review', 'SDLC और कोड रिव्यू'], cat: 'industry', diff: 2, hrs: 25, why: ['Shows you can work inside an engineering process, not around it.', 'दिखाता है कि आप इंजीनियरिंग प्रक्रिया के भीतर काम कर सकते हैं।'], res: [['Read open-source contribution guides', '']] },
  { id: 'documentation', n: ['Technical Documentation', 'तकनीकी दस्तावेज़ीकरण'], cat: 'industry', diff: 1, hrs: 15, why: ['A clean README doubles the impact of your projects.', 'साफ़ README आपके प्रोजेक्ट का प्रभाव दोगुना कर देता है।'], res: [['Write READMEs for every project', '']] },
  { id: 'business-analysis', n: ['Business Analysis', 'बिज़नेस एनालिसिस'], cat: 'industry', diff: 2, hrs: 40, why: ['Translating business needs into requirements is a paid skill.', 'व्यवसाय आवश्यकताओं को रिक्वायरमेंट में बदलना एक भुगतान योग्य कौशल है।'], res: [['Requirement gathering (sample)', '']] },
  { id: 'domain-finance', n: ['Domain: BFSI', 'डोमेन: BFSI'], cat: 'industry', diff: 2, hrs: 30, why: ['Domain knowledge shortens ramp-up time for hiring teams.', 'डोमेन ज्ञान भर्ती टीम का समय बचाता है।'], res: [['Read sector annual reports', '']] },
  { id: 'domain-healthcare', n: ['Domain: Healthcare', 'डोमेन: हेल्थकेयर'], cat: 'industry', diff: 2, hrs: 30, why: ['Regulated sectors value candidates who understand their constraints.', 'नियामक क्षेत्र उन उम्मीदवारों को महत्व देते हैं जो उनकी सीमाएँ समझते हैं।'], res: [['Study public health data portals', '']] },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const skillName = (id) => SKILL_BY_ID[id]?.n || [id, id];

export const INTERESTS = [
  { id: 'building-products', n: ['Building products', 'प्रोडक्ट बनाना'] },
  { id: 'data-patterns', n: ['Data & patterns', 'डेटा और पैटर्न'] },
  { id: 'ai-research', n: ['AI & research', 'AI और रिसर्च'] },
  { id: 'design', n: ['Design & creativity', 'डिज़ाइन और रचनात्मकता'] },
  { id: 'security', n: ['Security & networks', 'सुरक्षा और नेटवर्क'] },
  { id: 'business', n: ['Business & strategy', 'बिज़नेस और रणनीति'] },
  { id: 'teaching', n: ['Teaching & mentoring', 'पढ़ाना और मार्गदर्शन'] },
  { id: 'infra', n: ['Cloud & infrastructure', 'क्लाउड और इंफ्रास्ट्रक्चर'] },
  { id: 'social-impact', n: ['Social impact', 'सामाजिक प्रभाव'] },
  { id: 'finance', n: ['Finance & markets', 'वित्त और बाज़ार'] },
  { id: 'hardware', n: ['Hardware & IoT', 'हार्डवेयर और IoT'] },
  { id: 'writing', n: ['Writing & content', 'लेखन और कंटेंट'] },
];

export const DEGREES = ['B.Tech / B.E.', 'B.Sc', 'BCA', 'B.Com', 'BBA', 'B.A', 'M.Tech', 'MCA', 'MBA', 'M.Sc', 'Polytechnic Diploma', 'Diploma', 'M.Com', 'B.Pharm', 'M.Pharm', 'Other'];

export const DEGREE_DEPARTMENTS = {
  'B.Tech / B.E.': ['Computer Science & Engineering', 'Information Technology', 'Electronics & Communication', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Artificial Intelligence & Data Science', 'Chemical Engineering', 'Biotechnology', 'Other'],
  'B.Sc': ['Physics', 'Chemistry', 'Mathematics', 'Computer Science', 'Biology', 'Electronics', 'Statistics', 'Other'],
  BCA: ['Computer Applications', 'Software Engineering', 'Cyber Security', 'Data Science', 'Other'],
  'B.Com': ['Accounting & Finance', 'Banking & Insurance', 'Taxation', 'General Commerce', 'Other'],
  BBA: ['Marketing', 'Finance', 'Human Resource', 'Operations', 'Business Analytics', 'Other'],
  'B.A': ['English', 'History', 'Political Science', 'Economics', 'Sociology', 'Psychology', 'Other'],
  'M.Tech': ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil', 'Electrical', 'AI & ML', 'Other'],
  MCA: ['Software Engineering', 'Cyber Security', 'Data Science', 'AI & ML', 'Other'],
  MBA: ['Finance', 'Marketing', 'HR', 'Operations', 'Business Analytics', 'Other'],
  'M.Sc': ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biotechnology', 'Statistics', 'Other'],
  'Polytechnic Diploma': ['Computer Science', 'Mechanical', 'Civil', 'Electrical', 'Electronics', 'IT', 'Other'],
  Diploma: ['Mechanical', 'Civil', 'Electrical', 'Electronics', 'Computer Science', 'Other'],
  'M.Com': ['Accounting', 'Finance', 'Taxation', 'Business Management', 'Other'],
  'B.Pharm': ['Pharmacy', 'Pharmaceutics', 'Pharmacology', 'Other'],
  'M.Pharm': ['Pharmaceutics', 'Pharmacology', 'Pharmaceutical Chemistry', 'Other'],
  Other: ['Other'],
};

export const SEMESTERS_BY_DEGREE = {
  'B.Tech / B.E.': ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'],
  'B.Sc': ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester'],
  BCA: ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester'],
  'B.Com': ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester'],
  BBA: ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester'],
  'B.A': ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester'],
  'M.Tech': ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester'],
  MCA: ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester'],
  MBA: ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester'],
  'M.Sc': ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester'],
  'Polytechnic Diploma': ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester'],
  Diploma: ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester'],
  'M.Com': ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester'],
  'B.Pharm': ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'],
  'M.Pharm': ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester'],
  Other: ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'],
};

export const BRANCHES = [
  'Computer Science', 'Information Technology', 'Electronics & Communication', 'Electrical',
  'Mechanical', 'Civil', 'Artificial Intelligence & Data Science', 'Chemical', 'Biotechnology',
  'Commerce', 'Management', 'Science', 'Arts', 'Other',
];

export const CITIES = [
  ['Bengaluru', 'बेंगलुरु'], ['Pune', 'पुणे'], ['Hyderabad', 'हैदराबाद'], ['Delhi NCR', 'दिल्ली NCR'],
  ['Mumbai', 'मुंबई'], ['Chennai', 'चेन्नई'], ['Kolkata', 'कोलकाता'], ['Ahmedabad', 'अहमदाबाद'],
  ['Indore', 'इंदौर'], ['Bhopal', 'भोपाल'], ['Jaipur', 'जयपुर'], ['Remote (India)', 'रिमोट (भारत)'],
];

export const INDIAN_COLLEGES = [
  'Acropolis Institute of Technology and Research, Indore',
  'All India Institute of Medical Sciences, Bhopal',
  'Amity University, Gwalior',
  'Avantika University, Ujjain',
  'Bansal Institute of Science and Technology, Bhopal',
  'Bansal College of Engineering, Mandideep',
  'Barkatullah University, Bhopal',
  'Bhabha University, Bhopal',
  'Bhabha Engineering Research Institute, Bhopal',
  'BIST, Bhopal',
  'BM College of Technology, Indore',
  'Career College, Bhopal',
  'Chameli Devi Group of Institutions, Indore',
  'Corporate Institute of Science and Technology, Bhopal',
  'Devi Ahilya Vishwavidyalaya, Indore',
  'G.H. Raisoni Institute of Engineering and Technology, Indore',
  'Gandhi P.R. College of Engineering, Bhopal',
  'Gyan Ganga Institute of Technology and Sciences, Jabalpur',
  'Government Arts and Commerce College, Indore',
  'Government College, Indore',
  'Government Engineering College, Bhopal',
  'Government Engineering College, Jabalpur',
  'Government Engineering College, Rewa',
  'Government Engineering College, Ujjain',
  'Government Holkar Science College, Indore',
  'Government Maharani Laxmi Bai Girls College, Bhopal',
  'Government Motilal Vigyan Mahavidyalaya, Bhopal',
  'Government Science College, Jabalpur',
  'IES University, Bhopal',
  'IES College of Technology, Bhopal',
  'Indore Institute of Science and Technology, Indore',
  'Indian Institute of Information Technology, Bhopal',
  'Indian Institute of Management, Indore',
  'Indian Institute of Science Education and Research, Bhopal',
  'Institute of Engineering & Science, IPS Academy, Indore',
  'Islamia Karimia College, Indore',
  'Jabalpur Engineering College, Jabalpur',
  'Jagran Lakecity University, Bhopal',
  'Kailash Narayan Patel College of Science and Technology, Bhopal',
  'Lakshmi Narain College of Engineering, Bhopal',
  'Lakshmi Narain College of Technology, Bhopal',
  'Lakshmi Narain College of Technology, Indore',
  'Malwa Institute of Technology, Indore',
  'Madhav Institute of Technology & Science, Gwalior',
  'Maharaja Ranjit Singh College of Professional Sciences, Indore',
  'Mahatma Gandhi Chitrakoot Gramodaya Vishwavidyalaya, Chitrakoot',
  'Maulana Azad National Institute of Technology, Bhopal',
  'Mansarovar Global University, Sehore',
  'Medi-Caps University, Indore',
  'MITS School of Biotechnology, Gwalior',
  'NRI Institute of Information Science and Technology, Bhopal',
  'Oriental Institute of Science & Technology, Bhopal',
  'Patel College of Science and Technology, Bhopal',
  'People’s University, Bhopal',
  'Prestige Institute of Engineering Management and Research, Indore',
  'Prestige Institute of Management and Research, Indore',
  'Raja Mansingh Tomar Music & Arts University, Gwalior',
  'Rajiv Gandhi Proudyogiki Vishwavidyalaya, Bhopal',
  'Rabindranath Tagore University, Bhopal',
  'Radharaman Institute of Technology and Science, Bhopal',
  'RKDF University, Bhopal',
  'SAGE University, Bhopal',
  'SAGE University, Indore',
  'Sagar Institute of Science and Technology (SISTec), Bhopal',
  'Sagar Institute of Research & Technology, Bhopal',
  'Sagar Institute of Research & Technology - Excellence (SIRT-E), Bhopal',
  'Sagar Institute of Research & Technology - Pharmacy, Bhopal',
  'Sagar Institute of Research & Technology - Science and Technology, Bhopal',
  'Samrat Ashok Technological Institute, Vidisha',
  'Sardar Vallabh Bhai Patel Polytechnic College, Bhopal',
  'School of Planning and Architecture, Bhopal',
  'Shri Ram Institute of Technology, Jabalpur',
  'Shri Govindram Seksaria Institute of Technology and Science, Indore',
  'Shri Vaishnav Vidyapeeth Vishwavidyalaya, Indore',
  'Sushila Devi Bansal College, Indore',
  'Technocrats Institute of Technology (Excellence), Bhopal',
  'Technocrats Institute of Technology, Bhopal',
  'Truba Institute of Engineering and Information Technology, Bhopal',
  'VNS Group of Institutions, Bhopal',
  'Vikram University, Ujjain',
  'Other / Not listed',
];

export const INDIAN_BOARDS = [
  'CBSE', 'CISCE (ICSE / ISC)', 'NIOS', 'IB', 'Cambridge International (IGCSE / A Levels)',
  'Madhya Pradesh Board of Secondary Education (MPBSE)',
  'Andhra Pradesh Board of Intermediate Education', 'Andhra Pradesh Board of Secondary Education',
  'Arunachal Pradesh State Board', 'Assam State School Education Board',
  'Bihar School Examination Board', 'Chhattisgarh Board of Secondary Education',
  'Goa Board of Secondary and Higher Secondary Education', 'Gujarat Secondary and Higher Secondary Education Board',
  'Haryana Board of School Education', 'Himachal Pradesh Board of School Education',
  'Jharkhand Academic Council', 'Karnataka School Examination and Assessment Board',
  'Kerala Board of Public Examinations', 'Maharashtra State Board of Secondary and Higher Secondary Education',
  'Manipur Board of Secondary Education', 'Meghalaya Board of School Education',
  'Mizoram Board of School Education', 'Nagaland Board of School Education',
  'Odisha Board of Secondary Education', 'Punjab School Education Board',
  'Board of Secondary Education, Rajasthan (RBSE)', 'Sikkim Board of Secondary Education',
  'Tamil Nadu State Board', 'Telangana Board of Intermediate Education',
  'Tripura Board of Secondary Education', 'Uttar Pradesh Madhyamik Shiksha Parishad',
  'Uttarakhand Board of School Education', 'West Bengal Board of Secondary Education',
  'Jammu and Kashmir Board of School Education', 'Ladakh School Education Department', 'Other',
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir', 'Other',
];

export const CLASS_STREAMS = ['PCM', 'PCB', 'PCMB', 'Commerce', 'Humanities', 'Arts', 'Biology', 'Science', 'Other'];

export const ACADEMIC_YEAR_OPTIONS = Array.from({ length: 2031 - 1920 }, (_, index) => 1920 + index);
export const TWELFTH_PASSOUT_OPTIONS = Array.from({ length: 2027 - 1930 }, (_, index) => 1930 + index);
export const TENTH_PASSOUT_OPTIONS = Array.from({ length: 2027 - 1930 }, (_, index) => 1930 + index);

export const ACTIVITY_TYPES = ['Sports', 'Cultural Event', 'Debate', 'Music', 'Dance', 'Drama', 'Volunteering', 'Hackathon', 'Workshop', 'Club Activity', 'Other'];

export const WORK_TYPES = [
  { id: 'remote', n: ['Remote', 'रिमोट'] },
  { id: 'hybrid', n: ['Hybrid', 'हाइब्रिड'] },
  { id: 'onsite', n: ['On-site', 'ऑन-साइट'] },
  { id: 'any', n: ['Any / open', 'कोई भी / खुला'] },
];

export const COLLEGES = [
  'Maulana Azad National Institute of Technology, Bhopal',
  'Oriental Institute of Science & Technology, Bhopal',
  'Sagar Institute of Research & Technology, Bhopal',
  'IPS Academy, Indore',
  'Government Engineering College, Jabalpur',
  'Other',
];

export const CAREER_GOALS = [
  ['Get placed in a software product company', 'सॉफ्टवेयर प्रोडक्ट कंपनी में प्लेसमेंट'],
  ['Start with a data/analytics role', 'डेटा/एनालिटिक्स रोल से शुरुआत'],
  ['Crack a government exam', 'सरकारी परीक्षा उत्तीर्ण करना'],
  ['Build a career in AI/ML', 'AI/ML में करियर बनाना'],
  ['Get a paid internship this year', 'इस साल सशुल्क इंटर्नशिप'],
  ['Move into product or business roles', 'प्रोडक्ट या बिज़नेस रोल्स में जाना'],
  ['Still exploring — help me decide', 'अभी तय कर रहा हूँ — मदद करें'],
];

export default SKILLS;
