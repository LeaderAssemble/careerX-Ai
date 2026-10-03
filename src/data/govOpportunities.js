/**
 * Government Career Hub — SAMPLE data.
 *
 * HONESTY / SAFETY RULES ENFORCED HERE:
 *  - Every entry is illustrative sample data for the hackathon demo.
 *  - `status` is always 'demo' — the UI never claims a listing is currently open.
 *  - Dates are `null` so the UI renders "Not published (demo)" instead of inventing
 *    a deadline that a student might act on.
 *  - `site` points to the REAL official portal so the student can verify everything
 *    themselves. CareerX is not a government body and is not affiliated with any of them.
 *
 * INTEGRATION POINT: a real deployment would ingest official notification feeds /
 * a curated CMS inside src/services/jobService.js (see getGovOpportunities).
 */

export const GOV_CATEGORIES = [
  { id: 'central', n: ['Central Government', 'केंद्र सरकार'], icon: 'Landmark' },
  { id: 'state', n: ['State Government', 'राज्य सरकार'], icon: 'Building2' },
  { id: 'psu', n: ['Public Sector', 'सार्वजनिक क्षेत्र'], icon: 'Factory' },
  { id: 'exams', n: ['Competitive Exams', 'प्रतियोगी परीक्षाएँ'], icon: 'FileText' },
  { id: 'apprentice', n: ['Apprenticeships', 'अप्रेंटिसशिप'], icon: 'Wrench' },
];

export const GOV_OPPORTUNITIES = [
  { id: 'g1', cat: 'exams', t: ['Civil Services Examination (sample entry)', 'सिविल सेवा परीक्षा (नमूना प्रविष्टि)'], org: 'UPSC', site: 'https://upsc.gov.in', status: 'demo', start: null, end: null, exam: null,
    qual: ['Any recognised graduate degree', 'किसी भी मान्यता प्राप्त स्नातक डिग्री'], age: ['21–32 years (relaxation as per rules)', '21–32 वर्ष (नियमानुसार छूट)'], elig: ['Indian citizen; final-year students may apply as per the notification.', 'भारतीय नागरिक; अंतिम वर्ष के छात्र अधिसूचना अनुसार आवेदन कर सकते हैं।'],
    skills: ['communication', 'problem-solving', 'documentation'], fit: ['All branches'], prep: ['General studies, optional subject, answer writing practice, current affairs.', 'सामान्य अध्ययन, वैकल्पिक विषय, उत्तर लेखन अभ्यास, करंट अफेयर्स।'] },
  { id: 'g2', cat: 'central', t: ['Combined Graduate Level (sample entry)', 'कंबाइंड ग्रेजुएट लेवल (नमूना प्रविष्टि)'], org: 'SSC', site: 'https://ssc.gov.in', status: 'demo', start: null, end: null, exam: null,
    qual: ['Bachelor’s degree in any discipline', 'किसी भी विषय में स्नातक डिग्री'], age: ['18–32 years, varies by post', '18–32 वर्ष, पद अनुसार भिन्न'], elig: ['Multiple posts across ministries with different age and skill tests.', 'विभिन्न मंत्रालयों में अनेक पद, भिन्न आयु और कौशल परीक्षाओं के साथ।'],
    skills: ['excel', 'communication', 'time-management'], fit: ['All branches'], prep: ['Quantitative aptitude, reasoning, English, general awareness, typing where required.', 'क्वांटिटेटिव एप्टिट्यूड, रीज़निंग, अंग्रेज़ी, सामान्य जागरूकता, जहाँ आवश्यक हो टाइपिंग।'] },
  { id: 'g3', cat: 'central', t: ['Probationary Officer (sample entry)', 'प्रोबेशनरी ऑफिसर (नमूना प्रविष्टि)'], org: 'IBPS / participating banks', site: 'https://www.ibps.in', status: 'demo', start: null, end: null, exam: null,
    qual: ['Graduate (any stream)', 'स्नातक (कोई भी स्ट्रीम)'], age: ['20–30 years (relaxation as per rules)', '20–30 वर्ष (नियमानुसार छूट)'], elig: ['Prelims, mains and interview; strong quantitative and reasoning sections.', 'प्रीलिम्स, मेन्स और इंटरव्यू; मज़बूत क्वांटिटेटिव और रीज़निंग सेक्शन।'],
    skills: ['excel', 'communication', 'domain-finance', 'problem-solving'], fit: ['Commerce', 'Management', 'Science', 'Engineering'], prep: ['Banking awareness, data interpretation, English language, interview preparation.', 'बैंकिंग जागरूकता, डेटा इंटरप्रिटेशन, अंग्रेज़ी भाषा, इंटरव्यू तैयारी।'] },
  { id: 'g4', cat: 'exams', t: ['Graduate Aptitude Test in Engineering (sample entry)', 'ग्रेजुएट एप्टिट्यूड टेस्ट इन इंजीनियरिंग (नमूना प्रविष्टि)'], org: 'GATE (IIT / IISc rotation)', site: 'https://gate.iitm.ac.in', status: 'demo', start: null, end: null, exam: null,
    qual: ['Engineering / Science graduate or pre-final year', 'इंजीनियरिंग / विज्ञान स्नातक या प्री-फाइनल वर्ष'], age: ['No age limit', 'कोई आयु सीमा नहीं'], elig: ['Score used for M.Tech admission, PSU recruitment and research fellowships.', 'स्कोर का उपयोग M.Tech प्रवेश, PSU भर्ती और रिसर्च फ़ेलोशिप के लिए।'],
    skills: ['problem-solving', 'statistics', 'os', 'networks'], fit: ['Engineering', 'Science'], prep: ['Core branch syllabus, engineering mathematics, aptitude, previous-year papers.', 'कोर ब्रांच सिलेबस, इंजीनियरिंग गणित, एप्टिट्यूड, पिछले वर्षों के प्रश्नपत्र।'] },
  { id: 'g5', cat: 'psu', t: ['Engineer Trainee — Electronics/CS (sample entry)', 'इंजीनियर ट्रेनी — इलेक्ट्रॉनिक्स/CS (नमूना प्रविष्टि)'], org: 'Public sector energy company', site: 'https://www.ntpc.co.in', status: 'demo', start: null, end: null, exam: null,
    qual: ['B.Tech / B.E. in relevant branch, often via GATE score', 'प्रासंगिक ब्रांच में B.Tech / B.E., प्रायः GATE स्कोर के माध्यम से'], age: ['Usually up to 27 years (relaxation as per rules)', 'आमतौर पर 27 वर्ष तक (नियमानुसार छूट)'], elig: ['Recruitment notifications list branch, minimum marks and medical fitness.', 'भर्ती अधिसूचनाएँ ब्रांच, न्यूनतम अंक और चिकित्सा फिटनेस सूचीबद्ध करती हैं।'],
    skills: ['networks', 'os', 'problem-solving', 'documentation'], fit: ['Engineering'], prep: ['Branch fundamentals plus GATE-level problem practice.', 'ब्रांच बुनियाद और GATE-स्तर की समस्या अभ्यास।'] },
  { id: 'g6', cat: 'psu', t: ['Scientist / Engineer ‘SC’ (sample entry)', 'वैज्ञानिक / इंजीनियर ‘SC’ (नमूना प्रविष्टि)'], org: 'Space research organisation', site: 'https://www.isro.gov.in', status: 'demo', start: null, end: null, exam: null,
    qual: ['B.E./B.Tech or M.Sc in notified discipline with first class', 'अधिसूचित अनुशासन में प्रथम श्रेणी के साथ B.E./B.Tech या M.Sc'], age: ['Usually up to 28 years (relaxation as per rules)', 'आमतौर पर 28 वर्ष तक (नियमानुसार छूट)'], elig: ['Written test followed by a technical interview on core subjects.', 'लिखित परीक्षा के बाद कोर विषयों पर तकनीकी इंटरव्यू।'],
    skills: ['problem-solving', 'os', 'networks', 'presentation'], fit: ['Engineering', 'Science'], prep: ['Deep core-subject revision and project explanation practice.', 'गहरी कोर-विषय रिवीज़न और प्रोजेक्ट व्याख्या अभ्यास।'] },
  { id: 'g7', cat: 'psu', t: ['Defence R&D — Technical Cadre (sample entry)', 'रक्षा अनुसंधान एवं विकास — तकनीकी कैडर (नमूना प्रविष्टि)'], org: 'Defence research laboratories', site: 'https://www.drdo.gov.in', status: 'demo', start: null, end: null, exam: null,
    qual: ['Engineering degree / M.Sc, GATE score frequently required', 'इंजीनियरिंग डिग्री / M.Sc, GATE स्कोर प्रायः आवश्यक'], age: ['As per advertisement (relaxation as per rules)', 'विज्ञापन अनुसार (नियमानुसार छूट)'], elig: ['Roles span embedded systems, cybersecurity, materials and AI.', 'भूमिकाएँ एम्बेडेड सिस्टम, साइबर सुरक्षा, सामग्री और AI तक फैली हैं।'],
    skills: ['security-basics', 'python', 'problem-solving', 'documentation'], fit: ['Engineering', 'Science'], prep: ['Core discipline depth plus a well-documented project portfolio.', 'कोर अनुशासन की गहराई और अच्छी तरह दस्तावेज़ीकृत प्रोजेक्ट पोर्टफोलियो।'] },
  { id: 'g8', cat: 'state', t: ['State Civil Services / Combined Exam (sample entry)', 'राज्य सिविल सेवा / संयुक्त परीक्षा (नमूना प्रविष्टि)'], org: 'State public service commission', site: 'https://mppsc.mp.gov.in', status: 'demo', start: null, end: null, exam: null,
    qual: ['Graduate in any discipline; state-specific rules apply', 'किसी भी विषय में स्नातक; राज्य-विशिष्ट नियम लागू'], age: ['Commonly 21–40 years (state rules vary)', 'आमतौर पर 21–40 वर्ष (राज्य नियम भिन्न)'], elig: ['Preliminary, main and interview stages; knowledge of the state is expected.', 'प्रारंभिक, मुख्य और इंटरव्यू चरण; राज्य का ज्ञान अपेक्षित।'],
    skills: ['communication', 'documentation', 'problem-solving'], fit: ['All branches'], prep: ['State history, polity, economy plus answer writing.', 'राज्य का इतिहास, राजव्यवस्था, अर्थव्यवस्था और उत्तर लेखन।'] },
  { id: 'g9', cat: 'state', t: ['Patwari / Revenue Clerk (sample entry)', 'पटवारी / राजस्व लिपिक (नमूना प्रविष्टि)'], org: 'State revenue department', site: 'https://mppsc.mp.gov.in', status: 'demo', start: null, end: null, exam: null,
    qual: ['Graduate; computer proficiency certificate often required', 'स्नातक; कंप्यूटर दक्षता प्रमाणपत्र प्रायः आवश्यक'], age: ['Commonly 18–40 years (state rules vary)', 'आमतौर पर 18–40 वर्ष (राज्य नियम भिन्न)'], elig: ['Land records, data entry and public dealing responsibilities.', 'भूमि रिकॉर्ड, डेटा एंट्री और जन-संपर्क जिम्मेदारियाँ।'],
    skills: ['excel', 'documentation', 'communication'], fit: ['All branches'], prep: ['State-specific syllabus, computer knowledge and speed practice.', 'राज्य-विशिष्ट सिलेबस, कंप्यूटर ज्ञान और गति अभ्यास।'] },
  { id: 'g10', cat: 'state', t: ['State Police / Constable Technical Wing (sample entry)', 'राज्य पुलिस / कांस्टेबल तकनीकी विंग (नमूना प्रविष्टि)'], org: 'State police recruitment board', site: 'https://mppolice.gov.in', status: 'demo', start: null, end: null, exam: null,
    qual: ['As notified; technical wings may require IT/electronics background', 'अधिसूचना अनुसार; तकनीकी विंग को IT/इलेक्ट्रॉनिक्स पृष्ठभूमि चाहिए हो सकती है'], age: ['As notified (relaxation as per rules)', 'अधिसूचना अनुसार (नियमानुसार छूट)'], elig: ['Physical standards plus written examination and document verification.', 'शारीरिक मानक और लिखित परीक्षा तथा दस्तावेज़ सत्यापन।'],
    skills: ['time-management', 'networks', 'communication'], fit: ['All branches'], prep: ['Physical training alongside reasoning and general knowledge.', 'रीज़निंग और सामान्य ज्ञान के साथ शारीरिक प्रशिक्षण।'] },
  { id: 'g11', cat: 'central', t: ['Railway Recruitment — Technical & NTPC posts (sample entry)', 'रेलवे भर्ती — तकनीकी और NTPC पद (नमूना प्रविष्टि)'], org: 'Railway Recruitment Boards', site: 'https://www.rrbapply.gov.in', status: 'demo', start: null, end: null, exam: null,
    qual: ['Varies: 10+2, ITI, diploma or graduate by post', 'पद अनुसार भिन्न: 10+2, ITI, डिप्लोमा या स्नातक'], age: ['Usually 18–33 years (relaxation as per rules)', 'आमतौर पर 18–33 वर्ष (नियमानुसार छूट)'], elig: ['CBT stages, trade tests for technical posts and medical examination.', 'CBT चरण, तकनीकी पदों के लिए ट्रेड टेस्ट और चिकित्सा परीक्षा।'],
    skills: ['problem-solving', 'time-management', 'documentation'], fit: ['Engineering', 'Polytechnic', 'Science', 'All branches'], prep: ['Mathematics, general intelligence, general science and current affairs.', 'गणित, सामान्य बुद्धिमत्ता, सामान्य विज्ञान और करंट अफेयर्स।'] },
  { id: 'g12', cat: 'central', t: ['Banking — Specialist Officer IT (sample entry)', 'बैंकिंग — स्पेशलिस्ट ऑफिसर IT (नमूना प्रविष्टि)'], org: 'Public sector banks', site: 'https://www.ibps.in', status: 'demo', start: null, end: null, exam: null,
    qual: ['Engineering degree in IT / CS or equivalent, often with experience', 'IT / CS या समकक्ष में इंजीनियरिंग डिग्री, प्रायः अनुभव के साथ'], age: ['Commonly 20–30 years (relaxation as per rules)', 'आमतौर पर 20–30 वर्ष (नियमानुसार छूट)'], elig: ['Professional knowledge test on databases, networking and banking systems.', 'डेटाबेस, नेटवर्किंग और बैंकिंग सिस्टम पर व्यावसायिक ज्ञान परीक्षा।'],
    skills: ['sql', 'dbms', 'networks', 'security-basics'], fit: ['Engineering', 'BCA', 'MCA'], prep: ['DBMS, networking, information security and banking awareness.', 'DBMS, नेटवर्किंग, सूचना सुरक्षा और बैंकिंग जागरूकता।'] },
  { id: 'g13', cat: 'apprentice', t: ['National Apprenticeship — Engineering Graduate (sample entry)', 'राष्ट्रीय अप्रेंटिसशिप — इंजीनियरिंग ग्रेजुएट (नमूना प्रविष्टि)'], org: 'Apprenticeship portal / PSUs', site: 'https://apprenticeshipindia.gov.in', status: 'demo', start: null, end: null, exam: null,
    qual: ['Degree or diploma in engineering/technology', 'इंजीनियरिंग/तकनीक में डिग्री या डिप्लोमा'], age: ['As per employer notification', 'नियोक्ता अधिसूचना अनुसार'], elig: ['Paid on-the-job training with a stipend; no entrance exam for many roles.', 'स्टाइपेंड के साथ सशुल्क ऑन-द-जॉब प्रशिक्षण; कई भूमिकाओं के लिए कोई प्रवेश परीक्षा नहीं।'],
    skills: ['git', 'documentation', 'teamwork', 'communication'], fit: ['Engineering', 'Polytechnic', 'BCA', 'Science'], prep: ['Strong basics, a project portfolio and a clean application profile.', 'मज़बूत बुनियाद, प्रोजेक्ट पोर्टफोलियो और साफ़ आवेदन प्रोफ़ाइल।'] },
  { id: 'g14', cat: 'apprentice', t: ['Skill India / ITI Trade Apprenticeship (sample entry)', 'स्किल इंडिया / ITI ट्रेड अप्रेंटिसशिप (नमूना प्रविष्टि)'], org: 'Skill development mission', site: 'https://www.skillindia.gov.in', status: 'demo', start: null, end: null, exam: null,
    qual: ['ITI pass or 10th/12th depending on trade', 'ITI उत्तीर्ण या ट्रेड अनुसार 10वीं/12वीं'], age: ['As per employer notification', 'नियोक्ता अधिसूचना अनुसार'], elig: ['Trade-based apprenticeship in manufacturing, electronics and IT services.', 'विनिर्माण, इलेक्ट्रॉनिक्स और आईटी सेवाओं में ट्रेड-आधारित अप्रेंटिसशिप।'],
    skills: ['teamwork', 'time-management', 'linux'], fit: ['Polytechnic', 'Science', 'All branches'], prep: ['Trade theory, practical safety norms and workshop practice.', 'ट्रेड सिद्धांत, व्यावहारिक सुरक्षा मानदंड और कार्यशाला अभ्यास।'] },
  { id: 'g15', cat: 'central', t: ['Teaching — Eligibility Test (sample entry)', 'शिक्षण — पात्रता परीक्षा (नमूना प्रविष्टि)'], org: 'National testing agency', site: 'https://www.nta.ac.in', status: 'demo', start: null, end: null, exam: null,
    qual: ['Master’s degree with required percentage (subject-wise)', 'आवश्यक प्रतिशत के साथ मास्टर डिग्री (विषयवार)'], age: ['No upper age limit for eligibility test', 'पात्रता परीक्षा के लिए कोई उच्च आयु सीमा नहीं'], elig: ['Qualifies candidates for assistant professor and research roles.', 'सहायक प्रोफेसर और रिसर्च भूमिकाओं के लिए उम्मीदवारों को योग्य बनाता है।'],
    skills: ['communication', 'presentation', 'documentation'], fit: ['Science', 'Engineering', 'Arts', 'Commerce'], prep: ['Subject depth, teaching aptitude and research aptitude sections.', 'विषय गहराई, शिक्षण एप्टिट्यूड और रिसर्च एप्टिट्यूड सेक्शन।'] },
  { id: 'g16', cat: 'psu', t: ['Oil & Gas — Graduate Engineer Trainee (sample entry)', 'तेल और गैस — ग्रेजुएट इंजीनियर ट्रेनी (नमूना प्रविष्टि)'], org: 'Public sector oil company', site: 'https://www.ongcindia.com', status: 'demo', start: null, end: null, exam: null,
    qual: ['Engineering degree in notified discipline, GATE score often used', 'अधिसूचित अनुशासन में इंजीनियरिंग डिग्री, प्रायः GATE स्कोर उपयोग होता है'], age: ['Usually up to 30 years (relaxation as per rules)', 'आमतौर पर 30 वर्ष तक (नियमानुसार छूट)'], elig: ['Discipline-wise vacancies, medical fitness and training bond conditions.', 'अनुशासनवार रिक्तियाँ, चिकित्सा फिटनेस और प्रशिक्षण बॉंड शर्तें।'],
    skills: ['problem-solving', 'documentation', 'presentation', 'teamwork'], fit: ['Engineering', 'Science'], prep: ['GATE syllabus mastery plus group discussion and interview practice.', 'GATE सिलेबस में महारत और ग्रुप डिस्कशन व इंटरव्यू अभ्यास।'] },
];

export default GOV_OPPORTUNITIES;
