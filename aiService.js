import { CAREERS, CAREER_BY_ID, CAREER_KEYWORDS } from '../data/careers';
import { SKILL_BY_ID } from '../data/catalog';
import { getCareerMatches, getSkillGaps, getNextBestAction, rankCourses, recommendProjects } from './careerService';
import { clamp } from '../lib/utils';

/**
 * aiService — the single place where "AI" is called from the UI.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * HOW TO CONNECT A REAL MODEL LATER (no UI changes required):
 *   1. Create a backend route (e.g. POST /api/ai/chat) that holds the provider
 *      key in a SERVER environment variable. Never put keys in VITE_* variables —
 *      those are bundled into the browser.
 *   2. Set VITE_AI_API_URL in .env.local and flip AI_MODE to 'live' automatically.
 *   3. Replace the body of `chat()` with a fetch() to that route, keeping the same
 *      return shape: { reply: [en, hi], suggestions?, source: 'live' }.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Until then, responses come from a transparent keyword + profile engine. The UI
 * labels them "demo engine" so nobody mistakes them for a real LLM's output.
 */

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AI_API_URL) || null;
export const AI_MODE = API_URL ? 'live' : 'demo';
export const AI_PROVIDER = API_URL ? 'remote-api' : 'careerx-demo-engine';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ *
 * Full profile analysis (used by AI Career Intelligence page)
 * ------------------------------------------------------------------ */

export async function analyzeProfile({ profile, progress, derived }, options = {}) {
  const { simulate = true } = options;
  // Simulated model latency so loading states are real and honest in the demo.
  await delay(simulate ? 700 + Math.random() * 500 : 0);

  const skillMap = derived.skillMap;
  const matches = getCareerMatches(profile, skillMap);
  const targetCareer = derived.career || matches[0]?.career || CAREERS[0];
  const gaps = getSkillGaps(targetCareer, skillMap);
  const courses = rankCourses(targetCareer, gaps, skillMap, progress).slice(0, 6);
  const projects = recommendProjects(targetCareer, gaps, skillMap, progress).slice(0, 4);
  const roadmap = progress.roadmap?.careerId === targetCareer.id ? progress.roadmap : null;
  const next = getNextBestAction({ profile, progress, derived, gaps, matches, roadmap });

  return { matches, targetCareer, gaps, courses, projects, next, generatedAt: new Date().toISOString(), mode: AI_MODE };
}

/* ------------------------------------------------------------------ *
 * Chat / demo NLU
 * ------------------------------------------------------------------ */

const INTENTS = [
  { id: 'career', re: /(which career|career (path|suitable|option)|suitable for me|best career|what should i (become|do)|कौन सा करियर|करियर पथ|मेरे लिए|क्या बनूँ)/i },
  { id: 'skills', re: /(which skills|what skills|skills (should|to learn|for)|learn for|कौन से कौशल|कौशल सीख)/i },
  { id: 'gap', re: /(skill gap|gap analysis|missing skills|weak (area|skill)|कमी|गैप)/i },
  { id: 'resume', re: /(resume|cv|ats|bullet|summary|रिज़्यूमे)/i },
  { id: 'plan', re: /(learning plan|study plan|3[- ]month|three month|roadmap|schedule|plan for me|लर्निंग प्लान|रोडमैप|योजना)/i },
  { id: 'interview', re: /(interview|mock|hr round|confidence|इंटरव्यू)/i },
  { id: 'score', re: /(employability|readiness|score|how ready|स्कोर|तैयारी)/i },
  { id: 'courses', re: /(course|certification|certificat|learn from|कोर्स|प्रमाणपत्र)/i },
  { id: 'projects', re: /(project|portfolio|build something|प्रोजेक्ट)/i },
  { id: 'jobs', re: /(job|internship|placement|apply|hiring|नौकरी|इंटर्नशिप|प्लेसमेंट)/i },
  { id: 'gov', re: /(government|govt|sarkari|upsc|ssc|psu|bank|railway|सरकार|यूपीएससी|एसएससी)/i },
  { id: 'next', re: /(next step|what should i do now|today|क्या करूँ|अगला कदम)/i },
  { id: 'simulate', re: /(compare|difference between|vs|versus|simulat|तुलना|अंतर)/i },
  { id: 'greet', re: /^(hi|hello|hey|namaste|namaskar|नमस्ते|हैलो)\b/i },
  { id: 'thanks', re: /(thank|thanks|shukriya|धन्यवाद)/i },
  { id: 'help', re: /(help|what can you do|क्या कर सकते)/i },
];

function detectIntent(text) {
  const t = String(text || '').trim();
  const found = INTENTS.find((i) => i.re.test(t));
  return found ? found.id : null;
}

/** Extract a career mention ("data analyst", "AI", "devops"…). */
function detectCareer(text) {
  const t = String(text || '').toLowerCase();
  for (const c of CAREERS) {
    if (t.includes(c.n[0].toLowerCase()) || t.includes(c.n[1]) || CAREER_KEYWORDS[c.id]?.some((k) => t.includes(k.toLowerCase()))) return c;
  }
  return null;
}

const nl = (pair, lang) => (Array.isArray(pair) ? pair[lang === 'hi' ? 1 : 0] : pair);

/**
 * Demo response engine: intents × profile data ⇒ personalised, bilingual answers.
 * Returns { reply: [en, hi], suggestions?: [ids], links?: [{label, to}] }.
 */
export async function chat({ message, lang = 'en', profile = {}, progress = {}, derived }) {
  if (AI_MODE === 'live' && API_URL) {
    /* REAL API PATH (kept for later integration):
    const res = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, lang, profile: redact(profile), derived }),
    });
    if (!res.ok) throw new Error('AI service unavailable');
    return res.json(); // must return { reply: [en, hi], ... }
    */
  }
  await delay(420 + Math.random() * 420);

  const intent = detectIntent(message);
  const mentioned = detectCareer(message);
  const career = derived?.career || mentioned || null;
  const gaps = career ? getSkillGaps(career, derived?.skillMap || {}) : [];
  const openGaps = gaps.filter((g) => g.status !== 'met');
  const matches = derived ? getCareerMatches(profile, derived.skillMap).slice(0, 3) : [];
  const firstName = String(profile.personal?.name || '').split(' ')[0] || (lang === 'hi' ? 'दोस्त' : 'there');

  const reply = { en: '', hi: '', links: [], suggestions: [] };

  switch (intent) {
    case 'greet':
      reply.en = `Hi ${firstName}! Your current readiness is ${derived?.readiness?.score ?? 0}/100 with ${derived?.completion ?? 0}% of your profile complete. Ask me about careers, skills, your resume, interview practice or opportunities.`;
      reply.hi = `नमस्ते ${firstName}! आपकी वर्तमान तैयारी ${derived?.readiness?.score ?? 0}/100 है और प्रोफ़ाइल ${derived?.completion ?? 0}% पूरी है। करियर, कौशल, रिज़्यूमे, इंटरव्यू अभ्यास या अवसरों के बारे में पूछें।`;
      break;

    case 'thanks':
      reply.en = 'Anytime. Your Next Best Action is waiting on the dashboard — that is the fastest way to keep momentum.';
      reply.hi = 'कभी भी। आपका Next Best Action डैशबोर्ड पर इंतज़ार कर रहा है — गति बनाए रखने का सबसे तेज़ तरीका।';
      reply.links.push({ label: ['Open dashboard', 'डैशबोर्ड खोलें'], to: '/app/dashboard' });
      break;

    case 'help':
      reply.en = 'I can: (1) rank careers for your profile, (2) list your skill gaps with a fix, (3) build a 30/60/90 learning plan, (4) review your resume and keywords, (5) prep you for interviews, (6) find matched internships, jobs and government listings.';
      reply.hi = 'मैं यह कर सकता हूँ: (1) आपकी प्रोफ़ाइल के लिए करियर रैंक करना, (2) आपके स्किल गैप और उनका समाधान बताना, (3) 30/60/90 लर्निंग प्लान बनाना, (4) आपका रिज़्यूमे और कीवर्ड जाँचना, (5) इंटरव्यू तैयारी, (6) मैच्ड इंटर्नशिप, नौकरियाँ और सरकारी सूचियाँ खोजना।';
      break;

    case 'career':
      if (matches.length) {
        const top = matches[0];
        reply.en = `Based on your skills, interests and academics, your strongest matches are: ${matches.map((m) => `${m.career.n[0]} (${m.match}%)`).join(', ')}. ${top.career.n[0]} leads because ${top.reasons[0][0].toLowerCase()} The main thing holding it back: ${top.missing.slice(0, 3).map((m) => m.skill?.n?.[0]).filter(Boolean).join(', ') || 'nothing major'}. These are demo recommendations, not a validated prediction.`;
        reply.hi = `आपके कौशल, रुचियों और अकादमिक रिकॉर्ड के अनुसार सबसे मज़बूत मैच हैं: ${matches.map((m) => `${m.career.n[1]} (${m.match}%)`).join(', ')}। ${top.career.n[1]} आगे है क्योंकि ${top.reasons[0][1]} मुख्य बाधा: ${top.missing.slice(0, 3).map((m) => m.skill?.n?.[1]).filter(Boolean).join(', ') || 'कोई बड़ी नहीं'}। ये डेमो सुझाव हैं, सत्यापित भविष्यवाणी नहीं।`;
        reply.links.push({ label: ['See full analysis', 'पूरा विश्लेषण देखें'], to: '/app/ai-career' });
      } else {
        reply.en = 'I need a little more profile data before ranking careers. Add your skills and interests and I will generate matches.';
        reply.hi = 'करियर रैंक करने से पहले मुझे थोड़ा और प्रोफ़ाइल डेटा चाहिए। अपने कौशल और रुचियाँ जोड़ें, मैं मैच बना दूँगा।';
        reply.links.push({ label: ['Open profile', 'प्रोफ़ाइल खोलें'], to: '/app/profile' });
      }
      break;

    case 'skills': {
      const target = mentioned || career;
      if (!target) {
        reply.en = 'Which role do you mean? Ask me, for example, “what skills for data analyst?”';
        reply.hi = 'आप किस भूमिका की बात कर रहे हैं? उदाहरण: “डेटा एनालिस्ट के लिए कौन से कौशल?”';
        break;
      }
      const list = target.skills.slice(0, 8).map((s) => SKILL_BY_ID[s.id]?.n || [s.id, s.id]);
      const yours = target.skills.filter((s) => (derived?.skillMap?.[s.id] || 0) >= 3).map((s) => SKILL_BY_ID[s.id]?.n || [s.id, s.id]);
      reply.en = `For ${target.n[0]}, the core skills are ${list.map((l) => l[0]).join(', ')}. You are already comfortable with ${yours.length ? yours.map((l) => l[0]).join(', ') : 'none of them yet'} — start with ${openGaps[0]?.skill?.n?.[0] || list[0][0]}.`;
      reply.hi = `${target.n[1]} के लिए मुख्य कौशल हैं ${list.map((l) => l[1]).join(', ')}। आप ${yours.length ? yours.map((l) => l[1]).join(', ') : 'अभी इनमें से किसी में नहीं'} में सहज हैं — शुरुआत ${openGaps[0]?.skill?.n?.[1] || list[0][1]} से करें।`;
      reply.links.push({ label: ['Open Skill Gap', 'स्किल गैप खोलें'], to: '/app/skill-gap' });
      break;
    }

    case 'gap': {
      if (!openGaps.length) {
        reply.en = `No significant gaps for ${career?.n?.[0] || 'your target career'} right now. Keep the momentum with projects and interview practice.`;
        reply.hi = `${career?.n?.[1] || 'आपके लक्षित करियर'} के लिए अभी कोई बड़ा गैप नहीं। प्रोजेक्ट और इंटरव्यू अभ्यास से गति बनाए रखें।`;
      } else {
        const top = openGaps.slice(0, 4);
        reply.en = `Your top gaps for ${career?.n?.[0] || 'your target career'}: ${top.map((g) => `${g.skill.n[0]} (level ${Math.round((g.current / 4) * 100)}%, needs ${Math.round((g.required / 4) * 100)}%, ~${g.hours}h)`).join('; ')}. Close the first one and your readiness moves immediately.`;
        reply.hi = `${career?.n?.[1] || 'आपके लक्षित करियर'} के लिए आपके शीर्ष गैप: ${top.map((g) => `${g.skill.n[1]} (स्तर ${Math.round((g.current / 4) * 100)}%, आवश्यक ${Math.round((g.required / 4) * 100)}%, लगभग ${g.hours} घंटे)`).join('; ')}। पहला गैप भरते ही आपकी तैयारी बढ़ेगी।`;
      }
      reply.links.push({ label: ['Open Skill Gap', 'स्किल गैप खोलें'], to: '/app/skill-gap' });
      break;
    }

    case 'resume': {
      const r = derived?.resume;
      const missingKw = (r?.keywordMissing || []).slice(0, 4).map((k) => SKILL_BY_ID[k]?.n || [k, k]);
      reply.en = `Your resume readiness is ${r?.score ?? 0}/100 with ${r?.ats ?? 0}% keyword coverage for ${career?.n?.[0] || 'your target role'}. ${r?.bullets ? `${r.strongBullets}/${r.bullets} bullets start with a strong action verb and ${r.quantified} include a number.` : 'You have not added bullet points yet.'} ${missingKw.length ? `Add these keywords: ${missingKw.map((k) => k[0]).join(', ')}.` : 'Keyword coverage looks good.'} Fix the weakest section first — it moves the score fastest.`;
      reply.hi = `आपकी रिज़्यूमे तैयारी ${r?.score ?? 0}/100 है और ${career?.n?.[1] || 'आपके लक्षित रोल'} के लिए ${r?.ats ?? 0}% कीवर्ड कवरेज है। ${r?.bullets ? `${r.bullets} में से ${r.strongBullets} बुलेट मज़बूत क्रिया से शुरू होते हैं और ${r.quantified} में संख्या है।` : 'आपने अभी बुलेट पॉइंट नहीं जोड़े।'} ${missingKw.length ? `ये कीवर्ड जोड़ें: ${missingKw.map((k) => k[1]).join(', ')}।` : 'कीवर्ड कवरेज अच्छा है।'}`;
      reply.links.push({ label: ['Open Resume Builder', 'रिज़्यूमे बिल्डर खोलें'], to: '/app/resume' });
      break;
    }

    case 'plan': {
      const rm = progress.roadmap?.months || [];
      const first3 = rm.slice(0, 3);
      reply.en = `Here is your next 90 days for ${career?.n?.[0] || 'your target career'}:\n• Days 1–30: ${first3[0]?.title?.[0] || 'fundamentals'} — 45 minutes daily, plus ${openGaps[0]?.skill?.n?.[0] || 'your top gap skill'}.\n• Days 31–60: ${first3[1]?.title?.[0] || 'first project'} — ship one project with a public repo and one certification.\n• Days 61–90: ${first3[2]?.title?.[0] || 'interviews'} — resume to 75+, three mock interviews, ten applications.\nOpen the 30-60-90 Challenge and I will track it daily.`;
      reply.hi = `${career?.n?.[1] || 'आपके लक्षित करियर'} के लिए आपके अगले 90 दिन:\n• दिन 1–30: ${first3[0]?.title?.[1] || 'बुनियाद'} — रोज़ 45 मिनट, साथ में ${openGaps[0]?.skill?.n?.[1] || 'आपका शीर्ष गैप कौशल'}।\n• दिन 31–60: ${first3[1]?.title?.[1] || 'पहला प्रोजेक्ट'} — एक प्रोजेक्ट पब्लिक repo के साथ और एक प्रमाणपत्र।\n• दिन 61–90: ${first3[2]?.title?.[1] || 'इंटरव्यू'} — रिज़्यूमे 75+, तीन मॉक इंटरव्यू, दस आवेदन।\n30-60-90 चुनौती खोलें, मैं रोज़ ट्रैक करूँगा।`;
      reply.links.push({ label: ['Open 30-60-90 Challenge', '30-60-90 चुनौती खोलें'], to: '/app/challenge' }, { label: ['Open roadmap', 'रोडमैप खोलें'], to: '/app/roadmap' });
      break;
    }

    case 'interview': {
      const iv = derived?.interview;
      const dims = iv?.dims || {};
      const weakest = Object.entries(dims).sort((a, b) => a[1] - b[1])[0];
      const LABEL = { communication: ['Communication', 'संचार'], technical: ['Technical depth', 'तकनीकी गहराई'], confidence: ['Confidence', 'आत्मविश्वास'], relevance: ['Relevance', 'प्रासंगिकता'], structure: ['Structure', 'संरचना'] };
      reply.en = `${iv?.attempts ? `You have attempted ${iv.attempts} mock interview(s); best score ${iv.best}/100.` : 'You have not attempted a mock interview yet.'} Prepare with: (1) a 90-second introduction naming one project and its result, (2) STAR structure for behavioural questions, (3) two questions to ask the interviewer. ${weakest ? `Your weakest dimension so far is ${LABEL[weakest[0]]?.[0] || weakest[0]} at ${Math.round(weakest[1])}/100 — practise that first.` : 'Attempt one session and I will give you dimension-wise feedback.'}`;
      reply.hi = `${iv?.attempts ? `आपने ${iv.attempts} मॉक इंटरव्यू दिए हैं; सर्वोत्तम स्कोर ${iv.best}/100।` : 'आपने अभी तक मॉक इंटरव्यू नहीं दिया।'} तैयारी: (1) 90 सेकंड का परिचय जिसमें एक प्रोजेक्ट और उसका परिणाम हो, (2) व्यवहारिक प्रश्नों के लिए STAR संरचना, (3) इंटरव्यूअर से पूछने के दो प्रश्न। ${weakest ? `अभी तक आपका सबसे कमज़ोर पक्ष ${LABEL[weakest[0]]?.[1] || weakest[0]} (${Math.round(weakest[1])}/100) है — पहले उसका अभ्यास करें।` : 'एक सत्र दें और मैं पक्षवार फ़ीडबैक दूँगा।'}`;
      reply.links.push({ label: ['Start mock interview', 'मॉक इंटरव्यू शुरू करें'], to: '/app/interview' });
      break;
    }

    case 'score': {
      const e = derived?.employability;
      const comps = (e?.components || []).map((c) => `${nl(c.n, lang)} ${c.earned}/${c.max}`);
      reply.en = `Employability score: ${e?.score ?? 0}/100. Breakdown — ${(e?.components || []).map((c) => `${c.n[0]} ${c.earned}/${c.max}`).join(', ')}. Career readiness is ${derived?.readiness?.score ?? 0}/100. These are demo calculations from your own data, not an employment probability.`;
      reply.hi = `रोज़गार-योग्यता स्कोर: ${e?.score ?? 0}/100। विवरण — ${comps.join(', ')}। करियर रेडीनेस ${derived?.readiness?.score ?? 0}/100 है। ये आपके अपने डेटा से बनी डेमो गणनाएँ हैं, रोज़गार की संभावना नहीं।`;
      reply.links.push({ label: ['Open dashboard', 'डैशबोर्ड खोलें'], to: '/app/dashboard' });
      break;
    }

    case 'courses': {
      const cs = rankCourses(career, gaps, derived?.skillMap || {}, progress).slice(0, 3);
      reply.en = cs.length ? `Top picks for you: ${cs.map((c) => `${c.course.t[0]} (${c.course.provider}, ${c.course.weeks} weeks, ${c.course.free ? 'free' : 'paid'})`).join('; ')}. Each one closes a gap I found in your profile.` : 'Add a target career and I will rank courses for it.';
      reply.hi = cs.length ? `आपके लिए शीर्ष विकल्प: ${cs.map((c) => `${c.course.t[1]} (${c.course.provider}, ${c.course.weeks} सप्ताह, ${c.course.free ? 'मुफ़्त' : 'सशुल्क'})`).join('; ')}। हर कोर्स आपकी प्रोफ़ाइल का कोई गैप भरता है।` : 'लक्षित करियर जोड़ें, मैं उसके लिए कोर्स रैंक करूँगा।';
      reply.links.push({ label: ['Open Courses', 'कोर्सेस खोलें'], to: '/app/courses' });
      break;
    }

    case 'projects': {
      const ps = recommendProjects(career, gaps, derived?.skillMap || {}, progress).slice(0, 3);
      reply.en = ps.length ? `Try these: ${ps.map((p) => `${p.project.t[0]} (${p.project.diff}, ~${p.project.weeks} weeks)`).join('; ')}. Each ships evidence for ${career?.n?.[0] || 'your target role'} and closes real gaps.` : 'Set a target career and I will recommend projects.';
      reply.hi = ps.length ? `ये आज़माएँ: ${ps.map((p) => `${p.project.t[1]} (${p.project.diff}, लगभग ${p.project.weeks} सप्ताह)`).join('; ')}। हर एक ${career?.n?.[1] || 'आपके लक्षित रोल'} के लिए प्रमाण देता है और वास्तविक गैप भरता है।` : 'लक्षित करियर तय करें, मैं प्रोजेक्ट सुझाऊँगा।';
      reply.links.push({ label: ['Open Project Lab', 'प्रोजेक्ट लैब खोलें'], to: '/app/project-lab' });
      break;
    }

    case 'jobs':
      reply.en = `I match opportunities on your skills, location preference (${profile.locationPref || 'not set'}) and work type (${profile.workType || 'any'}). Your readiness is ${derived?.readiness?.score ?? 0}/100 — the higher it goes, the stronger the matches I surface. Listings in this build are sample data.`;
      reply.hi = `मैं आपके कौशल, स्थान प्राथमिकता (${profile.locationPref || 'सेट नहीं'}) और कार्य प्रकार (${profile.workType || 'कोई भी'}) पर अवसर मैच करता हूँ। आपकी तैयारी ${derived?.readiness?.score ?? 0}/100 है — जितनी बढ़ेगी, मैच उतने मज़बूत होंगे। इस बिल्ड की सूचियाँ नमूना डेटा हैं।`;
      reply.links.push({ label: ['Open Jobs', 'नौकरियाँ खोलें'], to: '/app/jobs' }, { label: ['Open Internships', 'इंटर्नशिप खोलें'], to: '/app/internships' });
      break;

    case 'gov':
      reply.en = 'The Government Career Hub lists central, state, PSU, competitive exam and apprenticeship categories with eligibility at a glance. All entries in this demo are sample data — always verify dates on the official portal before applying.';
      reply.hi = 'सरकारी करियर हब में केंद्र, राज्य, PSU, प्रतियोगी परीक्षा और अप्रेंटिसशिप श्रेणियाँ हैं, पात्रता एक नज़र में। इस डेमो की सभी प्रविष्टियाँ नमूना डेटा हैं — आवेदन से पहले आधिकारिक पोर्टल पर तिथियाँ ज़रूर सत्यापित करें।';
      reply.links.push({ label: ['Open Government Hub', 'सरकारी हब खोलें'], to: '/app/government' });
      break;

    case 'next': {
      const nb = getNextBestAction({ profile, progress, derived, gaps, matches, roadmap: progress.roadmap });
      reply.en = `${nb.title[0]}. ${nb.why[0]}`;
      reply.hi = `${nb.title[1]}। ${nb.why[1]}`;
      reply.links.push({ label: nb.cta, to: nb.to });
      break;
    }

    case 'simulate': {
      const a = matches[0]?.career;
      const b = matches[1]?.career;
      reply.en = a && b ? `${a.n[0]} vs ${b.n[0]}: match ${a.match}% vs ${b.match}%, learning difficulty ${a.difficulty}/3 vs ${b.difficulty}/3, top gap ${a.missing[0]?.skill?.n?.[0] || '—'} vs ${b.missing[0]?.skill?.n?.[0] || '—'}. Open the Career Simulator for the full side-by-side view — including projects and interview focus.` : 'Set at least two career interests and I can compare them.';
      reply.hi = a && b ? `${a.n[1]} बनाम ${b.n[1]}: मैच ${a.match}% बनाम ${b.match}%, सीखने की कठिनाई ${a.difficulty}/3 बनाम ${b.difficulty}/3, मुख्य गैप ${a.missing[0]?.skill?.n?.[1] || '—'} बनाम ${b.missing[0]?.skill?.n?.[1] || '—'}। पूरी तुलना के लिए करियर सिम्युलेटर खोलें।` : 'कम से कम दो करियर रुचियाँ तय करें, तब मैं तुलना कर सकता हूँ।';
      reply.links.push({ label: ['Open Career Simulator', 'करियर सिम्युलेटर खोलें'], to: '/app/simulator' });
      break;
    }

    default: {
      const nb = getNextBestAction({ profile, progress, derived, gaps, matches, roadmap: progress.roadmap });
      reply.en = `I could not map that to a career topic yet, so here is something useful instead: ${nb.title[0]} — ${nb.why[0]} You can also ask me about careers, skill gaps, courses, projects, resumes, interviews or government opportunities.`;
      reply.hi = `मैं इसे अभी किसी करियर विषय से नहीं जोड़ पाया, इसलिए कुछ उपयोगी सुझाव: ${nb.title[1]} — ${nb.why[1]} आप करियर, स्किल गैप, कोर्स, प्रोजेक्ट, रिज़्यूमे, इंटरव्यू या सरकारी अवसरों के बारे में भी पूछ सकते हैं।`;
      reply.links.push({ label: nb.cta, to: nb.to });
    }
  }

  return {
    reply: [reply.en, reply.hi],
    links: reply.links,
    source: AI_PROVIDER,
    intent: intent || 'fallback',
  };
}

/** Quick, non-blocking readiness hint used by tooltips and banners. */
export function hint(derived, lang = 'en') {
  const score = derived?.readiness?.score ?? 0;
  const band = score >= 80 ? [0, 1] : score >= 60 ? [2, 3] : score >= 40 ? [4, 5] : [6, 7];
  const BANDS = [
    ['Interview-ready — start applying aggressively.', 'इंटरव्यू-तैयार — तेज़ी से आवेदन शुरू करें।'],
    ['Strong profile; polish interviews and resume.', 'मज़बूत प्रोफ़ाइल; इंटरव्यू और रिज़्यूमे निखारें।'],
    ['Good foundation; close your top two skill gaps.', 'अच्छी नींव; शीर्ष दो स्किल गैप भरें।'],
    ['On track; consistency will move you up a band.', 'पटरी पर; निरंतरता आपको अगले स्तर पर ले जाएगी।'],
    ['Early stage; focus on fundamentals and one project.', 'शुरुआती चरण; बुनियाद और एक प्रोजेक्ट पर ध्यान दें।'],
    ['Build basics first — your roadmap is ordered for that.', 'पहले बुनियाद बनाएँ — आपका रोडमैप उसी क्रम में है।'],
    ['Start with your profile and one beginner course.', 'अपनी प्रोफ़ाइल और एक शुरुआती कोर्स से शुरू करें।'],
    ['Let’s set up your profile together first.', 'आइए पहले आपकी प्रोफ़ाइल साथ में बनाते हैं।'],
  ];
  return BANDS[band[0]] ? BANDS[band[0]][lang === 'hi' ? 1 : 0] : '';
}

export const clampScore = clamp;
export default { analyzeProfile, chat, AI_MODE, AI_PROVIDER };
