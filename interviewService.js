import { QUESTIONS, TRACKS, LEVELS, STRUCTURE_MARKERS, QUANTIFIER_RE, WEAK_OPENERS, CONFIDENT_MARKERS, INTERVIEW_SESSION_LENGTH } from '../data/interviews';
import { clamp, hashString, seeded } from '../lib/utils';

/**
 * interviewService — session building and answer evaluation.
 *
 * THE EVALUATION IS A DEMO ENGINE. It reads your answer text and applies transparent
 * heuristics (length, structure markers, domain vocabulary, specificity, filler words).
 * It cannot judge truthfulness, tone of voice quality, or real-world correctness — and
 * the UI says so on every feedback screen.
 *
 * INTEGRATION POINT: replace evaluateAnswer() with a call to your backend
 * (POST /api/ai/interview/evaluate) that can use an LLM + speech transcription. Keep the
 * return shape { dims, overall, strengths, improvements, signals } and nothing else changes.
 */

export const DIMS = [
  { id: 'communication', n: ['Communication', 'संचार'], w: 0.24 },
  { id: 'technical', n: ['Technical Knowledge', 'तकनीकी ज्ञान'], w: 0.26 },
  { id: 'confidence', n: ['Confidence', 'आत्मविश्वास'], w: 0.16 },
  { id: 'relevance', n: ['Relevance', 'प्रासंगिकता'], w: 0.2 },
  { id: 'structure', n: ['Structure', 'संरचना'], w: 0.14 },
];

const DEVANAGARI_RE = /[\u0900-\u097F]/;

function tokenize(text) {
  return String(text || '').toLowerCase().split(/[^a-z\u0900-\u097F0-9+#.]+/).filter(Boolean);
}

function splitSentences(text) {
  return String(text || '').split(/[.!?।\n]+/).map((s) => s.trim()).filter((s) => s.length > 2);
}

/** Create a 5-question session: 3 role questions + 1 behavioural + 1 general. */
export function createSession({ track = 'general', level = 'intermediate', count = INTERVIEW_SESSION_LENGTH, seed = null } = {}) {
  const t = QUESTIONS[track] ? track : 'general';
  const l = QUESTIONS[t]?.[level] ? level : 'intermediate';
  const pool = [...(QUESTIONS[t][l] || [])];
  const behavioural = (QUESTIONS.hr[level] || QUESTIONS.hr.intermediate || []).slice(0, 2);
  const general = (QUESTIONS.general[level] || QUESTIONS.general.intermediate || []).slice(0, 2);
  const rnd = seeded(seed ?? hashString(`${t}:${l}:${new Date().toISOString().slice(0, 13)}`));

  const picked = [];
  while (pool.length && picked.length < Math.max(1, count - 2)) picked.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  if (behavioural.length) picked.push(behavioural[Math.floor(rnd() * behavioural.length)]);
  if (general.length) picked.push(general[Math.floor(rnd() * general.length)]);

  return {
    id: `iv_${Date.now().toString(36)}`,
    track: t,
    level: l,
    startedAt: new Date().toISOString(),
    questions: picked.slice(0, count).map((q, i) => ({ ...q, index: i })),
  };
}

/** Evaluate one answer. Every number is derived from a listed signal. */
export function evaluateAnswer({ answer = '', question, track = 'general', level = 'intermediate' }) {
  const text = String(answer || '').trim();
  const lower = text.toLowerCase();
  const words = tokenize(text);
  const wc = words.length;
  const sentences = splitSentences(text);
  const paragraphs = text.split(/\n{1,}/).filter((p) => p.trim()).length;
  const avgSentence = sentences.length ? wc / sentences.length : wc;
  const isHindi = DEVANAGARI_RE.test(text);
  const vocab = TRACKS.find((t) => t.id === track)?.vocab || TRACKS[4].vocab;

  /* ---- signals ---- */
  const markers = STRUCTURE_MARKERS.filter((m) => lower.includes(m));
  const vocabHits = [...new Set(vocab.filter((v) => lower.includes(v)))];
  const kw = (question?.kw || []).filter((k) => lower.includes(k.toLowerCase()));
  const weakHits = WEAK_OPENERS.filter((w) => lower.includes(w));
  const confidentHits = CONFIDENT_MARKERS.filter((c) => lower.includes(c));
  const quantified = QUANTIFIER_RE.test(text);
  const firstWordStrong = /^(built|developed|designed|led|owned|created|implemented|improved|reduced|i led|i built|मैंने|बनाया|विकसित)/i.test(text);
  const repeated = (() => {
    const counts = {};
    words.forEach((w) => { if (w.length > 3) counts[w] = (counts[w] || 0) + 1; });
    return Object.values(counts).filter((c) => c >= 5).length;
  })();
  const capitalised = sentences.filter((s) => /^[A-Z\u0900-\u097F"']/.test(s.trim())).length;
  const jitter = (hashString(text) % 7) - 3; // ±3 deterministic variance so identical scores feel alive

  /* ---- dimension scores ---- */
  const empty = wc === 0;
  const structure = empty ? 0 : clamp(
    34 + markers.length * 8 + Math.min(paragraphs, 3) * 4 + (wc > 90 ? 8 : 0) + (quantified ? 6 : 0)
    - (wc < 30 ? 22 : 0) - (wc > 340 ? 10 : 0) + jitter * 0.5, 5, 98
  );
  const relevance = empty ? 0 : clamp(
    40 + (kw.length / Math.max((question?.kw || []).length, 1)) * 52
    - (wc < 25 ? 20 : 0) + (firstWordStrong ? 4 : 0) + jitter * 0.5, 5, 98
  );
  const levelExpectation = level === 'advanced' ? 1.15 : level === 'intermediate' ? 1 : 0.9;
  const technical = empty ? 0 : clamp(
    (30 + Math.min(vocabHits.length, 9) * 6.4 + (quantified ? 5 : 0)) * levelExpectation - (level === 'advanced' && vocabHits.length < 3 ? 14 : 0) + jitter * 0.4, 5, 98
  );
  const confidence = empty ? 0 : clamp(
    48 + confidentHits.length * 9 + (wc > 55 ? 6 : 0) - weakHits.length * 8 - (avgSentence > 38 ? 8 : 0) - (repeated * 5) + jitter * 0.4, 5, 98
  );
  const communication = empty ? 0 : clamp(
    44 + Math.min(sentences.length, 6) * 4 + (capitalised >= Math.max(1, sentences.length - 1) ? 6 : 0)
    + (avgSentence >= 8 && avgSentence <= 26 ? 8 : 0) - (wc < 25 ? 18 : 0) - (wc > 300 ? 6 : 0) - repeated * 3 + jitter * 0.4, 5, 98
  );

  const dims = {
    communication: Math.round(communication),
    technical: Math.round(technical),
    confidence: Math.round(confidence),
    relevance: Math.round(relevance),
    structure: Math.round(structure),
  };
  const overall = Math.round(DIMS.reduce((a, d) => a + dims[d.id] * d.w, 0));

  /* ---- explainable feedback (bilingual) ---- */
  const strengths = [];
  const improvements = [];

  if (wc >= 60 && wc <= 220) strengths.push(['Answer length is in the recruiter sweet spot (60–220 words).', 'उत्तर की लंबाई भर्तीकर्ता के लिए उपयुक्त सीमा (60–220 शब्द) में है।']);
  if (markers.length >= 3) strengths.push(['Clear structure markers — the interviewer can follow your reasoning.', 'स्पष्ट संरचना संकेत — इंटरव्यूअर आपका तर्क आसानी से समझ सकता है।']);
  if (vocabHits.length >= 4) strengths.push([`Used role-specific vocabulary (${vocabHits.slice(0, 4).join(', ')}).`, `भूमिका-विशिष्ट शब्दावली उपयोग की (${vocabHits.slice(0, 4).join(', ')})।`]);
  if (quantified) strengths.push(['Included a number, which makes the claim verifiable.', 'संख्या शामिल की, जिससे दावा सत्यापनीय बनता है।']);
  if (confidentHits.length) strengths.push(['Ownership language (“I built / I led”) signals accountability.', 'स्वामित्व भाषा (“मैंने बनाया/नेतृत्व किया”) जिम्मेदारी दिखाती है।']);

  if (wc < 40) improvements.push(['Too short — add the situation, your action and the result (STAR).', 'बहुत छोटा — स्थिति, आपकी क्रिया और परिणाम जोड़ें (STAR)।']);
  if (wc > 280) improvements.push(['Too long — cut to two crisp points; interviewers interrupt at ~2 minutes.', 'बहुत लंबा — दो संक्षिप्त बिंदुओं तक लाएँ; इंटरव्यूअर लगभग 2 मिनट पर रोकते हैं।']);
  if (markers.length < 2) improvements.push(['Signal structure aloud: “First… then… as a result…”.', 'संरचना बोलकर बताएँ: “पहले… फिर… परिणामस्वरूप…”।']);
  if (!quantified) improvements.push(['Add one number: users, %, time saved, records or team size.', 'एक संख्या जोड़ें: उपयोगकर्ता, %, बचा समय, रिकॉर्ड या टीम आकार।']);
  if (weakHits.length) improvements.push([`Remove hedging words (${weakHits.slice(0, 2).join(', ')}) — they undercut otherwise strong answers.`, `संदेहवाचक शब्द हटाएँ (${weakHits.slice(0, 2).join(', ')}) — वे अच्छे उत्तरों को कमज़ोर करते हैं।`]);
  if (vocabHits.length < 3 && !isHindi) improvements.push(['Use the domain vocabulary of this role; it is what interviewers listen for.', 'इस भूमिका की तकनीकी शब्दावली उपयोग करें; इंटरव्यूअर वही सुनते हैं।']);
  if (avgSentence > 34) improvements.push(['Break long sentences — one idea per sentence improves clarity.', 'लंबे वाक्य तोड़ें — प्रति वाक्य एक विचार स्पष्टता बढ़ाता है।']);
  if (kw.length === 0 && (question?.kw || []).length) improvements.push([`The question asked about ${question.kw.slice(0, 2).join(', ')} — address it directly.`, `प्रश्न ${question.kw.slice(0, 2).join(', ')} के बारे में था — सीधे उस पर बात करें।`]);
  if (!strengths.length && !improvements.length) improvements.push(['Practise the same question aloud once more; fluency improves on the second attempt.', 'इसी प्रश्न का अभ्यास एक बार बोलकर करें; दूसरे प्रयास में प्रवाह बेहतर होता है।']);

  const band = overall >= 80 ? ['Strong', 'मज़बूत'] : overall >= 65 ? ['Good, needs polish', 'अच्छा, निखार चाहिए'] : overall >= 45 ? ['Developing', 'विकास हो रहा है'] : ['Early stage', 'शुरुआती चरण'];

  return {
    overall,
    dims,
    band,
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 5),
    signals: { wc, sentences: sentences.length, paragraphs, markers: markers.length, vocabHits: vocabHits.length, kwHits: kw.length, weakHits: weakHits.length, confidentHits: confidentHits.length, quantified, isHindi, repeated },
    modelPoints: question?.tip || null,
    question: question?.q || null,
    engine: 'careerx-demo-heuristics',
  };
}

/** Aggregate a finished session into the report shown on screen. */
export function summarizeSession(session, results = []) {
  const answered = results.filter((r) => r && !r.skipped);
  if (!answered.length) return { overall: 0, dims: {}, attempts: results.length, answered: 0, suggestions: [], band: ['Not attempted', 'प्रयास नहीं'] };

  const dims = {};
  DIMS.forEach((d) => {
    dims[d.id] = Math.round(answered.reduce((a, r) => a + (r.dims?.[d.id] || 0), 0) / answered.length);
  });
  const overall = Math.round(answered.reduce((a, r) => a + r.overall, 0) / answered.length);

  const suggestionPool = answered.flatMap((r) => r.improvements || []);
  const counts = {};
  suggestionPool.forEach((s) => { counts[s[0]] = (counts[s[0]] || 0) + 1; });
  const suggestions = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([en, n]) => ({ en, n, pair: suggestionPool.find((s) => s[0] === en) }));

  const band = overall >= 80 ? ['Interview ready', 'इंटरव्यू के लिए तैयार']
    : overall >= 65 ? ['Close — polish structure and numbers', 'करीब — संरचना और संख्याएँ सुधारें']
    : overall >= 45 ? ['Developing — practise twice more this week', 'विकास हो रहा है — इस सप्ताह दो और अभ्यास करें']
    : ['Start with short structured answers', 'छोटे संरचित उत्तरों से शुरू करें'];

  return {
    overall, dims, attempts: results.length, answered: answered.length,
    skipped: results.filter((r) => r?.skipped).length,
    suggestions, band,
    track: session.track, level: session.level,
    weakest: [...DIMS].sort((a, b) => (dims[a.id] || 0) - (dims[b.id] || 0))[0],
    strongest: [...DIMS].sort((a, b) => (dims[b.id] || 0) - (dims[a.id] || 0))[0],
  };
}

export { TRACKS, LEVELS, QUESTIONS };
/**
 * v7 Coach Whisper — deterministic live hints derived from the question text.
 * Rule-based demo coaching, not a human or LLM coach.
 */
const WHISPER_RULES = [
  [/sql|query|report|data/, [
    ['Name the exact table, report or metric you moved.', 'वह सटीक टेबल, रिपोर्ट या मेट्रिक बताएँ जो आपने बदली।'],
    ['Quantify: how fast, how much, over what period.', 'माप दें: कितनी तेज़ी, कितनी मात्रा, किस अवधि में।'],
    ['Mention the tool: SQL query, dashboard, or script.', 'टूल ज़रूर कहें: SQL क्वेरी, डैशबोर्ड या स्क्रिप्ट।'],
  ]],
  [/python|code|script|automat|bug/, [
    ['State the library or function you chose and why.', 'चुनी गई लाइब्रेरी या फ़ंक्शन और कारण बताएँ।'],
    ['Give the before/after runtime or effort saved.', 'पहले और बाद का समय या बची मेहनत बताएँ।'],
    ['Admit one limitation you would fix next.', 'एक कमी स्वीकारें जिसे आप आगे सुधारेंगे।'],
  ]],
  [/team|conflict|communicat|stakeholder|client/, [
    ['Use STAR: one situation, task, action, result.', 'STAR अपनाएँ: एक स्थिति, कार्य, कार्रवाई, परिणाम।'],
    ['Quote one thing you actually said or asked.', 'वह एक वाक्य दोहराएँ जो आपने सच में कहा या पूछा।'],
    ['End with the measurable outcome for the team.', 'टीम के मापने योग्य परिणाम के साथ समाप्त करें।'],
  ]],
  [/deadline|pressure|priorit|urgent|fail/, [
    ['Pick one real deadline; skip the heroics.', 'एक वास्तविक डेडलाइन चुनें; बहादुरी की कहानी छोड़ें।'],
    ['Show the trade-off: what you dropped and why.', 'ट्रेड-ऑफ दिखाएँ: क्या छोड़ा और क्यों।'],
    ['Close with the on-time or on-scope result.', 'समय-सीमा या स्कोप वाले परिणाम के साथ समाप्त करें।'],
  ]],
  [/design|architect|scal|plan/, [
    ['State the constraint first: users, latency, budget.', 'पहले बाधा कहें: यूज़र्स, विलंब, बजट।'],
    ['Compare two options, then justify your pick.', 'दो विकल्प तुलें, फिर अपना चुनाव सही ठहराएँ।'],
    ['Name the risk and your mitigation.', 'जोखिम और उसका उपाय स्पष्ट कहें।'],
  ]],
];

export function hintsFor(qText = '', lang = 'en') {
  const low = String(qText || '').toLowerCase();
  const i = lang === 'hi' ? 1 : 0;
  for (const [re, hints] of WHISPER_RULES) {
    if (re.test(low)) return hints.map((h) => h[i]);
  }
  return [
    ['Structure: Situation → Task → Action → Result.', 'संरचना: स्थिति → कार्य → कार्रवाई → परिणाम।'][i],
    ['One concrete example beats three general claims.', 'एक ठोस उदाहरण तीन सामान्य दावों से बेहतर है।'][i],
    ['End with a number: time saved, users served, marks improved.', 'संख्या के साथ समाप्त करें: बचा समय, सेवा प्राप्त यूज़र, बेहतर अंक।'][i],
  ];
}

export default { createSession, evaluateAnswer, summarizeSession, TRACKS, LEVELS };
