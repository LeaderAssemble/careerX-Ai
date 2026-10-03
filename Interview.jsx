import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mic, MicOff, Square, Play, RotateCw, Send, SkipForward, Volume2, VolumeX, Check, X,
  Sparkles, Clock, Trophy, AlertTriangle, ChevronDown, ArrowRight, History, Loader2, MessageSquare,
  Bot, Activity, Gauge, TrendingUp,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import {
  PageHeader, Card, Badge, Button, Meter, ProgressRing, EmptyState, Chip, DemoTag, Segmented,
} from '../../components/ui/primitives';
import { DimensionBars } from '../../components/ui/Charts';
import { IsoBarChart, IsoLineRibbon, HoloTile, IsoRadar, FlipTile } from '../../components/ui/Charts3D';

import { NeedsProfile, DemoNotice, AILabel, CAREER_ICONS } from '../../components/app/parts';
import { TRACKS, LEVELS, DIMS, createSession, evaluateAnswer, summarizeSession, hintsFor } from '../../services/interviewService';
import { startListening, speak, stopSpeaking, sttSupported, ttsSupported, requestMicrophone, errorText } from '../../services/speechService';
import { cn, uid, sleep, relativeTime } from '../../lib/utils';
import storage from '../../lib/storage';

const QUESTION_SECONDS = 120;
const FILLER_RE = /\b(um+|uh+|er+|like|basically|actually|literally|you know|i mean|kind of|sort of|whatever|मतलब|यानी|जैसे कि)\b/gi;
const countFillers = (str) => (String(str || '').match(FILLER_RE) || []).length;

/** Likely follow-up probes per weakest dimension — realistic interviewer behaviour. */
const FOLLOWUPS = {
  communication: ['Can you summarise that answer in two sentences for a non-technical manager?', 'अपने उत्तर को गैर-तकनीकी मैनेजर के लिए दो वाक्यों में संक्षेप करें?'],
  technical: ['Why that technology and not a simpler alternative?', 'वही तकनीक क्यों, कोई सरल विकल्प क्यों नहीं?'],
  confidence: ['Which part of your answer are you least sure about, and why?', 'आपके उत्तर का कौन-सा हिस्सा सबसे कम पक्का है, और क्यों?'],
  relevance: ['How does what you just described match this role’s day-to-day work?', 'जो आपने बताया वह इस रोल के रोज़मर्रा के काम से कैसे मेल खाता है?'],
  structure: ['Walk me through it once more as Situation → Task → Action → Result.', 'इसे एक बार फिर Situation → Task → Action → Result क्रम में बताइए।'],
};

/** Demo cohort benchmark for the compare view — labelled as demo data in the UI. */
const BENCH = { communication: 70, technical: 66, confidence: 62, relevance: 68, structure: 64 };

/** Scramble-in typewriter for the question card (skipped under Reduce motion). */
function useTypewriter(text, step = 2, speed = 14) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!text) { setN(0); return undefined; }
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion')) { setN(text.length); return undefined; }
    setN(0);
    const id = setInterval(() => setN((v) => {
      if (v >= text.length) { clearInterval(id); return v; }
      return v + step;
    }), speed);
    return () => clearInterval(id);
  }, [text, step, speed]);
  return { shown: text.slice(0, n), done: n >= text.length };
}
const TRACK_ICON = { Code2: 'Code2', BarChart3: 'BarChart3', BrainCircuit: 'BrainCircuit', Users: 'Users', Sparkles: 'Sparkles' };

export default function Interview() {
  const { t, L, speech, lang } = useI18n();
  const { derived, profile, activeCareer, progress, addInterview, toast } = useApp();

  const [phase, setPhase] = useState('setup'); // setup | live | feedback | report
  const [track, setTrack] = useState(activeCareer?.id === 'data-analyst' ? 'data-analyst' : activeCareer?.id === 'ai-ml-engineer' ? 'ai-ml' : 'software');
  const [level, setLevel] = useState('intermediate');
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [interim, setInterim] = useState('');
  const [results, setResults] = useState([]);
  const [current, setCurrent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState({ state: sttSupported ? 'idle' : 'unsupported', msg: sttSupported ? '' : t('int.micUnsupported') });
  const [speaking, setSpeaking] = useState(false);
  const [voiceLed, setVoiceLed] = useState(() => ['1', 1, true].includes(storage.get('int:voiceled', false)));
  const [whisper, setWhisper] = useState(() => ['1', 1, true].includes(storage.get('int:whisper', false)));
  useEffect(() => { storage.set('int:whisper', whisper); }, [whisper]);
  useEffect(() => { storage.set('int:voiceled', voiceLed); }, [voiceLed]);
  const [seconds, setSeconds] = useState(QUESTION_SECONDS);
  const [usedVoice, setUsedVoice] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [micBars, setMicBars] = useState(() => new Array(18).fill(3));
  const [micLive, setMicLive] = useState(false);
  const audioRef = useRef(null);
  const startedAtRef = useRef(Date.now());

  const controller = useRef(null);
  const answerRef = useRef('');
  answerRef.current = answer;

  const questionText = phase === 'live' && session?.questions?.[index] ? L(session.questions[index].q) : '';
  const typed = useTypewriter(questionText);
  const modelText = phase === 'feedback' && current?.modelPoints ? L(current.modelPoints) : '';
  const modelTyped = useTypewriter(modelText, 3, 12);

  const liveWords = answer.trim().split(/\s+/).filter(Boolean).length;
  const liveFillers = countFillers(answer);
  const liveElapsed = (Date.now() - startedAtRef.current) / 60000;
  const liveWpm = liveElapsed > 0.34 ? Math.min(320, Math.round(liveWords / liveElapsed)) : 0; // <20s typed bursts are not a speaking pace
  const liveSignals = useMemo(() => {
    const lower = answer.toLowerCase();
    return {
      markers: (lower.match(/\b(first|then|next|finally|because|so that|impact|result|outcome|therefore|led to|approach|verified)\b/g) || []).length,
      numbers: (answer.match(/\d+/g) || []).length,
      terms: (TRACKS.find((x) => x.id === track)?.vocab || []).filter((v) => lower.includes(v)).length,
    };
  }, [answer, track]);

  const history = progress.interviews || [];
  const question = session?.questions?.[index] || null;

  /* suggested track follows the target career */
  useEffect(() => {
    if (!activeCareer) return;
    const map = { 'software-developer': 'software', 'frontend-developer': 'software', 'cloud-devops': 'software', cybersecurity: 'software', 'data-analyst': 'data-analyst', 'business-analyst': 'data-analyst', 'ai-ml-engineer': 'ai-ml', 'product-manager': 'hr', 'ui-ux-designer': 'hr' };
    if (map[activeCareer.id] && phase === 'setup') setTrack(map[activeCareer.id]);
  }, [activeCareer, phase]);

  /* keep the top of the screen meaningful on phase changes (mobile especially) */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [phase, index]);

  /* countdown while answering */
  useEffect(() => {
    if (phase !== 'live') return undefined;
    setSeconds(QUESTION_SECONDS);
    startedAtRef.current = Date.now();
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          submit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index]);

  /* always release the microphone + audio graph on unmount */
  useEffect(() => () => {
    controller.current?.stop?.();
    stopSpeaking();
    if (audioRef.current) {
      clearInterval(audioRef.current.timer);
      audioRef.current.stream?.getTracks().forEach((tr) => tr.stop());
      audioRef.current.ctx?.close?.();
      audioRef.current = null;
    }
  }, []);

  const stopVisualizer = () => {
    if (audioRef.current) {
      clearInterval(audioRef.current.timer);
      audioRef.current.stream?.getTracks().forEach((tr) => tr.stop());
      audioRef.current.ctx?.close?.();
      audioRef.current = null;
    }
    setMicLive(false);
    setMicBars(new Array(18).fill(3));
  };

  /** Real mic levels via Web Audio when permission is granted; falls back to a
   *  clearly-labelled simulated visual so the console is never misleading. */
  const startVisualizer = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !(window.AudioContext || window.webkitAudioContext)) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const timer = setInterval(() => {
        analyser.getByteFrequencyData(data);
        const bars = [];
        for (let i = 0; i < 18; i += 1) {
          const v = data[Math.floor((i * data.length) / 18)] || 0;
          bars.push(3 + Math.round((v / 255) * 33));
        }
        setMicBars(bars);
      }, 90);
      audioRef.current = { stream, ctx, timer };
      setMicLive(true);
    } catch { /* permission lost mid-session — keep the simulated bars */ }
  };

  if (!derived || !profile) return <NeedsProfile />;

  const start = () => {
    const s = createSession({ track, level });
    setSession(s);
    setIndex(0);
    setResults([]);
    setAnswer('');
    setInterim('');
    setCurrent(null);
    setUsedVoice(false);
    setPhase('live');
  };

  const stopVoice = () => {
    controller.current?.stop?.();
    controller.current = null;
    stopVisualizer();
    setVoice((v) => ({ ...v, state: 'idle' }));
    setInterim('');
  };

  const startVoice = async () => {
    if (!sttSupported) { setVoice({ state: 'unsupported', msg: t('int.micUnsupported') }); return; }
    const perm = await requestMicrophone();
    if (perm.state === 'denied') { setVoice({ state: 'denied', msg: t('int.micDenied') }); return; }
    if (perm.state === 'unsupported' || perm.state === 'no-device') { setVoice({ state: 'denied', msg: errorText(perm.state === 'no-device' ? 'no-speech' : 'unsupported') }); return; }
    setVoice({ state: 'listening', msg: '' });
    startVisualizer();
    controller.current = startListening({
      lang: speech,
      continuous: true,
      interim: true,
      onResult: ({ final, interim: part }) => {
        if (part) setInterim(part);
        if (final) {
          setAnswer((a) => (a ? `${a.replace(/\s+$/, '')} ${final}` : final));
          setInterim('');
          setUsedVoice(true);
        }
      },
      onEnd: () => { setVoice((v) => (v.state === 'listening' ? { ...v, state: 'idle' } : v)); setInterim(''); },
      onError: (e) => setVoice({ state: e.code === 'not-allowed' ? 'denied' : 'error', msg: e.message || errorText(e.code) }),
      onStateChange: (s) => { if (s === 'listening') setVoice((v) => ({ ...v, state: 'listening' })); },
    });
    if (!controller.current) setVoice({ state: 'unsupported', msg: t('int.micUnsupported') });
  };

  const speakQuestion = () => {
    if (!question) return;
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    const text = Array.isArray(question.q) ? question.q[lang === 'hi' ? 1 : 0] : question.q;
    const ok = speak(text, { lang: speech, rate: 0.98, onEnd: () => setSpeaking(false) });
    setSpeaking(ok);
    if (!ok) toast({ kind: 'warn', title: ['Audio unavailable', 'ऑडियो उपलब्ध नहीं'], body: [errorText('unsupported'), errorText('unsupported')] });
  };

  /* v6: voice-led round — the interviewer reads each question aloud automatically. */
  useEffect(() => {
    if (phase !== 'live' || !voiceLed || !ttsSupported || !question) return undefined;
    const text = Array.isArray(question.q) ? question.q[lang === 'hi' ? 1 : 0] : question.q;
    const started = speak(text, { lang: speech, rate: 0.98, onEnd: () => setSpeaking(false) });
    setSpeaking(started);
    return () => { stopSpeaking(); setSpeaking(false); };
  }, [phase, index, voiceLed]);

  const submit = async (timedOut = false) => {
    if (busy) return;
    controller.current?.stop?.();
    controller.current = null;
    stopSpeaking();
    setSpeaking(false);
    setBusy(true);
    stopVisualizer();
    const text = answerRef.current;
    await sleep(520); // visible "evaluating" state; a real model call would go here
    const ev = evaluateAnswer({ answer: text, question, track, level });
    const elapsedMin = Math.max(0.08, (Date.now() - startedAtRef.current) / 60000);
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const metrics = { words, wpm: elapsedMin > 0.34 ? Math.min(320, Math.round(words / elapsedMin)) : null, fillers: countFillers(text), seconds: Math.round(elapsedMin * 60) };
    const entry = { ...ev, skipped: !text.trim(), timedOut: !!timedOut && !text.trim(), answer: text, metrics, at: new Date().toISOString() };
    setResults((r) => [...r, entry]);
    setCurrent(entry);
    setBusy(false);
    setPhase('feedback');
    if (timedOut && !text.trim()) {
      toast({ kind: 'warn', title: ['Time up', 'समय समाप्त'], body: ['No answer recorded for this question.', 'इस प्रश्न के लिए कोई उत्तर दर्ज नहीं हुआ।'] });
    }
  };

  const skip = () => {
    setResults((r) => [...r, { skipped: true, overall: 0, dims: {}, answer: '', at: new Date().toISOString() }]);
    setCurrent(null);
    advance();
  };

  const advance = () => {
    setAnswer('');
    setInterim('');
    setCurrent(null);
    if (index + 1 >= (session?.questions?.length || 0)) { finish(); return; }
    setIndex((i) => i + 1);
    setPhase('live');
  };

  const finish = () => {
    const summary = summarizeSession(session, results);
    setPhase('report');
    addInterview({
      id: uid('iv'),
      track: session.track,
      level: session.level,
      at: new Date().toISOString(),
      score: summary.overall,
      dims: summary.dims,
      answers: summary.answered,
      voice: usedVoice,
      band: summary.band,
    });
  };

  const report = useMemo(() => (phase === 'report' ? summarizeSession(session, results) : null), [phase, session, results]);

  /* ---------------------------------- setup ---------------------------------- */
  if (phase === 'setup') {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow={<><MessageSquare className="h-3 w-3" aria-hidden />{t('nav.interview')}</>}
          title={t('int.title')}
          sub={t('int.sub')}
          tags={[<AILabel key="ai" />, <Badge key="n" tone="muted">{history.length} {t('int.history')}</Badge>]}
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card>
            <h2 className="font-display text-[15px] font-bold">{t('int.chooseRole')}</h2>
            <p className="muted mt-1 text-[12px]">{L(['Questions are drawn from the track you pick, plus one behavioural and one general question.', 'प्रश्न आपके चुने ट्रैक से आते हैं, साथ में एक व्यवहारिक और एक सामान्य प्रश्न।'])}</p>
            <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
              {TRACKS.map((tr) => {
                const Icon = CAREER_ICONS[TRACK_ICON[tr.icon]] || Sparkles;
                const active = track === tr.id;
                return (
                  <button key={tr.id} type="button" onClick={() => setTrack(tr.id)} aria-pressed={active}
                    className={cn('flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5',
                      active ? 'border-brand/60 bg-brand/10 shadow-glow' : 'border-line bg-surface2/50 hover:border-brand/40')}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-brand/25 bg-brand/10 text-brand"><Icon className="h-3.5 w-3.5" aria-hidden /></span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-bold">{L(tr.n)}</span>
                      <span className="muted block text-[11px] leading-snug">{L([`${tr.vocab.length} domain terms scored`, `${tr.vocab.length} डोमेन शब्द जाँचे जाते हैं`])}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <h2 className="mt-6 font-display text-[15px] font-bold">{t('int.chooseLevel')}</h2>
            <div className="mt-3">
              <Segmented value={level} onChange={setLevel} options={LEVELS.map((l) => ({ value: l.id, label: L(l.n) }))} />
            </div>
            <p className="muted mt-2 text-[12px]">{L(LEVELS.find((l) => l.id === level)?.desc || ['—', '—'])}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Button size="lg" icon={Play} onClick={start}>{t('int.start')}</Button>
              <span className="muted text-[11.5px]">{L(['5 questions · about 10 minutes', '5 प्रश्न · लगभग 10 मिनट'])}</span>
            </div>

            <DemoNotice className="mt-4">{t('int.demoEval')}</DemoNotice>
          </Card>

          <div className="space-y-4">
            <Card>
              <h2 className="font-display text-[14px] font-bold">{L(['What gets scored', 'क्या जाँचा जाता है'])}</h2>
              <ul className="mt-3 space-y-2.5">
                {DIMS.map((d) => (
                  <li key={d.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12px] font-semibold">{L(d.n)}</span>
                      <span className="muted text-[10.5px] font-bold tabular-nums">{Math.round(d.w * 100)}%</span>
                    </div>
                    <Meter className="mt-1" value={d.w * 100 * 2.6} size="xs" />
                  </li>
                ))}
              </ul>
              <p className="muted mt-3 border-t border-line pt-3 text-[10.5px] leading-relaxed">{t('common.methodNote')}</p>
            </Card>

            <Card>
              <h2 className="font-display text-[14px] font-bold">{L(['Voice answers', 'वॉइस उत्तर'])}</h2>
              <div className="mt-2 flex items-center gap-2">
                <Badge tone={sttSupported ? 'ok' : 'warn'} icon={sttSupported ? Mic : MicOff}>
                  {sttSupported ? t('voice.supported') : t('voice.unsupported')}
                </Badge>
                {ttsSupported ? <Badge tone="muted" icon={Volume2}>{t('int.speaking')}</Badge> : null}
              </div>
              <Chip active={voiceLed} onClick={() => setVoiceLed((v) => !v)} className="mt-2 px-3 py-2" aria-pressed={voiceLed}>
                <Volume2 className="h-3 w-3" aria-hidden />{t('int.voiceLed')}
              </Chip>
              {voiceLed && ttsSupported ? <p className="muted mt-1.5 text-[10.5px] leading-relaxed">{t('int.voiceLedNote')}</p> : null}
              <Chip active={whisper} onClick={() => setWhisper((v) => !v)} className="mt-2 px-3 py-2" aria-pressed={whisper}>
                <Sparkles className="h-3 w-3" aria-hidden />{t('int.whisper')}
              </Chip>
              {whisper ? <p className="muted mt-1.5 text-[10.5px] leading-relaxed">{t('int.whisperNote')}</p> : null}
              <p className="muted mt-2 text-[11.5px] leading-relaxed">
                {sttSupported
                  ? L(['Speech is transcribed in your browser with the Web Speech API. Nothing is uploaded. You can always type instead.', 'वेब स्पीच API से आपके ब्राउज़र में ही ट्रांसक्रिप्शन होता है। कुछ अपलोड नहीं होता। आप हमेशा टाइप भी कर सकते हैं।'])
                  : L(['This browser has no Web Speech API, so voice input is disabled — typing works everywhere.', 'इस ब्राउज़र में वेब स्पीच API नहीं है, इसलिए वॉइस इनपुट बंद है — टाइपिंग हर जगह काम करती है।'])}
              </p>
            </Card>

            {history.length >= 2 ? (
              <Card className="relative overflow-hidden">
                <span className="scanline" aria-hidden />
                <h2 className="relative font-display text-[14px] font-bold">{L(['Interview results — 3D trend', 'इंटरव्यू परिणाम — 3D ट्रेंड'])}</h2>
                <div className="relative mt-2 grid grid-cols-3 gap-2">
                  <HoloTile label={L(['Sessions', 'सत्र'])} value={history.length} icon={History} />
                  <HoloTile label={L(['Best', 'सर्वश्रेष्ठ'])} value={Math.max(...history.map((h) => h.score || 0))} icon={Trophy} tone="ok" />
                  <HoloTile label={L(['Average', 'औसत'])} value={Math.round(history.reduce((a, h) => a + (h.score || 0), 0) / history.length)} icon={Gauge} tone="accent" />
                </div>
                <IsoLineRibbon className="relative mt-2" height={150} color="brand"
                  data={history.slice(-6).map((h, i) => ({ label: `S${i + 1}`, value: h.score || 0 }))} />
                <p className="muted relative mt-1 text-[10px] leading-snug">{L(['Scores from your saved practice sessions in this browser.', 'इस ब्राउज़र में सहेजे गए अभ्यास सत्रों के स्कोर।'])}</p>
              </Card>
            ) : null}
            <HistoryCard history={history} t={t} L={L} lang={lang} />
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------ live question ------------------------------ */
  if (phase === 'live' && question) {
    const pctDone = Math.round((index / session.questions.length) * 100);
    const timeTone = seconds <= 20 ? 'bad' : seconds <= 50 ? 'warn' : 'brand';
    return (
      <div className="mx-auto max-w-6xl">
        <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <InterviewerConsole
            seconds={seconds} speaking={speaking} listening={voice.state === 'listening'}
            words={liveWords} fillers={liveFillers} wpm={liveWpm}
            micBars={micBars} micLive={micLive}
            questionNo={index + 1} total={session.questions.length} L={L}
          />
          <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{t('int.question', { i: index + 1, n: session.questions.length })}</Badge>
          <Badge tone="muted">{L(TRACKS.find((x) => x.id === track)?.n || ['—', '—'])}</Badge>
          <Badge tone="muted">{L(LEVELS.find((x) => x.id === level)?.n || ['—', '—'])}</Badge>
          <span className={cn('ml-auto inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] font-bold tabular-nums',
            timeTone === 'bad' ? 'border-bad/40 bg-bad/10 text-bad' : timeTone === 'warn' ? 'border-warn/40 bg-warn/10 text-warn' : 'border-line bg-surface2 text-muted')}>
            <Clock className="h-3 w-3" aria-hidden />{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center gap-1.5" aria-label={L(['Question progress', 'प्रश्न प्रगति'])}>
          {session.questions.map((_, i) => (
            <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-all duration-500',
              i < index ? 'bg-ok' : i === index ? 'bg-brand shadow-glow' : 'bg-line')} />
          ))}
        </div>
        <Meter value={pctDone} size="xs" />

        <Card grad>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/30 bg-brand/10 text-brand"><MessageSquare className="h-4 w-4" aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <div className="muted text-[10px] font-bold uppercase tracking-[0.14em]">{L([question.type, question.type])}</div>
              <h2 className="mt-1 font-display text-[17px] font-bold leading-snug text-balance sm:text-lg">
                {typed.shown}
                {!typed.done ? <span className="type-caret text-brand" aria-hidden /> : null}
              </h2>
            </div>
            {ttsSupported ? (
              <Button size="sm" variant="quiet" icon={speaking ? VolumeX : Volume2} onClick={speakQuestion} aria-pressed={speaking}>
                {speaking ? t('int.stopSpeaking') : t('int.speaking')}
              </Button>
            ) : null}
          </div>
        </Card>

        {whisper && question ? (
          <Card className="border-brand/25 bg-brand/5">
            <div className="muted mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">
              <Sparkles className="h-3 w-3 text-brand" aria-hidden />{t('int.whisperLabel')}
            </div>
            <ul className="space-y-1.5">
              {hintsFor(Array.isArray(question.q) ? question.q.join(' ') : question.q, lang).map((h, i) => (
                <li key={`${index}-${i}`} className="chip-pop flex items-start gap-2 text-[11.5px] leading-snug text-ink" style={{ animationDelay: `${i * 120}ms` }}>
                  <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded bg-brand/15 font-display text-[9px] font-bold text-brand">{i + 1}</span>
                  {h}
                </li>
              ))}
            </ul>
            <p className="muted mt-2 text-[10px]">{t('int.demoEval')}</p>
          </Card>
        ) : null}

        <Card>
          <label className="muted mb-2 block text-[10px] font-bold uppercase tracking-[0.14em]" htmlFor="answer">{t('int.yourAnswer')}</label>
          <textarea
            id="answer"
            rows={8}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t('int.placeholder')}
            className="w-full resize-y rounded-xl border border-line bg-surface2/50 p-3 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-muted/70 focus:border-brand/60 focus:bg-surface focus:ring-2 focus:ring-brand/25"
          />
          {interim ? <p className="muted mt-1.5 text-[11.5px] italic">{interim}…</p> : null}
          {liveFillers > 0 ? (
            <Badge key={liveFillers} tone="warn" icon={AlertTriangle} className="chip-pop mt-1.5">
              {t('int.liveFillers')}: {liveFillers}
            </Badge>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {sttSupported ? (
              voice.state === 'listening' ? (
                <Button variant="danger" icon={Square} onClick={stopVoice}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bad opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-bad" /></span>
                    {t('int.listening')}
                  </span>
                </Button>
              ) : (
                <Button variant="ghost" icon={Mic} onClick={startVoice}>{t('int.voiceOn')}</Button>
              )
            ) : (
              <Badge tone="warn" icon={MicOff}>{t('voice.unsupported')}</Badge>
            )}

            <span className="muted text-[11px]">{L([`${liveWords} words`, `${liveWords} शब्द`])}</span>
            <span className="flex flex-wrap gap-1.5">
              {[[L(['Structure', 'संरचना']), liveSignals.markers], [L(['Numbers', 'संख्याएँ']), liveSignals.numbers], [L(['Domain terms', 'डोमेन शब्द']), liveSignals.terms]].map(([lb, v]) => (
                <span key={`${lb}-${v}`} className={cn('chip-pop rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] transition-colors', v > 0 ? 'border-ok/40 bg-ok/10 text-ok' : 'border-line bg-surface2/40 text-muted')}>
                  {lb} {v}
                </span>
              ))}
            </span>

            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="quiet" icon={SkipForward} onClick={skip}>{t('int.skip')}</Button>
              <Button icon={busy ? Loader2 : Send} loading={busy} onClick={() => submit(false)}>{busy ? L(['Evaluating…', 'मूल्यांकन…']) : t('int.submit')}</Button>
            </div>
          </div>

          {voice.state === 'denied' || voice.state === 'error' ? (
            <DemoNotice className="mt-3" tone="warn" icon={AlertTriangle}>{voice.msg || t('int.micDenied')}</DemoNotice>
          ) : null}
        </Card>

        <Button variant="quiet" icon={RotateCw} onClick={() => { controller.current?.stop?.(); stopVisualizer(); setPhase('setup'); }}>{t('int.restart')}</Button>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------- feedback -------------------------------- */
  if (phase === 'feedback' && current) {
    const dimItems = DIMS.map((d) => ({ label: L(d.n), value: current.dims?.[d.id] || 0 }));
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Card grad>
          <div className="flex flex-wrap items-center gap-4">
            <ProgressRing value={current.overall} size={92} stroke={9} tone={current.overall >= 75 ? 'ok' : current.overall >= 55 ? 'brand' : 'warn'} label={`${current.overall}`} />
            <div className="min-w-0 flex-1">
              <span className="eyebrow"><Sparkles className="h-3 w-3" aria-hidden />{t('int.feedback')}</span>
              <h2 className="mt-1.5 font-display text-lg font-bold">{L(current.band)}</h2>
              <p className="muted mt-1 text-[12px] leading-snug">{L(question?.q)}</p>
              {current.skipped ? <Badge tone="warn" className="mt-2">{t('int.skip')}</Badge> : null}
            </div>
          </div>
          <div className="mt-4"><DimensionBars items={dimItems} /></div>
          {current.metrics ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <HoloTile label={L(['Words', 'शब्द'])} value={current.metrics.words} />
              <HoloTile label="WPM" value={current.metrics.wpm == null ? '—' : current.metrics.wpm} icon={Gauge} tone="accent"
                sub={current.metrics.wpm == null ? L(['Too brief to estimate pace', 'गति अनुमान हेतु बहुत छोटा']) : undefined} />
              <HoloTile label={L(['Filler words', 'फिलर शब्द'])} value={current.metrics.fillers} icon={AlertTriangle} tone={current.metrics.fillers > 3 ? 'warn' : 'ok'} />
              <HoloTile label={L(['Time used', 'लिया गया समय'])} value={`${current.metrics.seconds}s`} icon={Clock} />
            </div>
          ) : null}
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="font-display text-[13.5px] font-bold text-ok">{L(['What worked', 'क्या अच्छा रहा'])}</h3>
            {current.strengths?.length ? (
              <ul className="mt-2.5 space-y-1.5">
                {current.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] leading-snug text-ink"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" aria-hidden />{L(s)}</li>
                ))}
              </ul>
            ) : <p className="muted mt-2 text-[12px]">{L(['None detected on this answer.', 'इस उत्तर में कोई नहीं मिला।'])}</p>}
          </Card>
          <Card>
            <h3 className="font-display text-[13.5px] font-bold text-warn">{t('int.suggestions')}</h3>
            {current.improvements?.length ? (
              <ul className="mt-2.5 space-y-1.5">
                {current.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] leading-snug text-ink"><ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />{L(s)}</li>
                ))}
              </ul>
            ) : <p className="muted mt-2 text-[12px]">{L(['Nothing to fix here.', 'यहाँ सुधार की आवश्यकता नहीं।'])}</p>}
          </Card>
        </div>

        {current.modelPoints ? (
          <Card>
            <h3 className="font-display text-[13.5px] font-bold">{t('int.modelAnswer')}</h3>
            <p className="muted mt-1.5 text-[12.5px] leading-relaxed">{modelTyped.shown}{!modelTyped.done ? <span className="type-caret text-accent" aria-hidden /> : null}</p>
          </Card>
        ) : null}

        {current?.dims ? (() => {
          const weak = [...DIMS].sort((a, b) => (current.dims[a.id] || 0) - (current.dims[b.id] || 0))[0];
          const fu = FOLLOWUPS[weak.id];
          return fu ? (
            <Card className="relative overflow-hidden border-accent/30">
              <span className="scanline" aria-hidden />
              <h3 className="relative flex items-center gap-2 font-display text-[13.5px] font-bold">
                <span className="grid h-7 w-7 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent"><MessageSquare className="h-3.5 w-3.5" aria-hidden /></span>
                {L(['Likely follow-up probe', 'संभावित फ़ॉलो-अप प्रश्न'])}
              </h3>
              <p className="muted relative mt-1.5 text-[11px]">{L(['Real interviewers drill into your weakest spot — this answer’s was:', 'असली इंटरव्यूअर आपके कमज़ोर बिंदु पर गहराई से पूछते हैं — इस उत्तर का कमज़ोरतम आयाम:'])} <span className="font-bold text-warn">{L(weak.n)}</span></p>
              <p className="relative mt-2 font-display text-[14.5px] font-semibold leading-snug text-ink">“{L(fu)}”</p>
              <p className="muted relative mt-1.5 text-[11px] leading-snug">{L(['Not scored — answer it out loud or jot notes before the next question.', 'स्कोर नहीं होता — अगले प्रश्न से पहले बोलकर उत्तर दें या नोट्स बनाएँ।'])}</p>
            </Card>
          ) : null;
        })() : null}

        <Card className="p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="muted text-[10.5px] font-bold uppercase tracking-[0.14em]">{L(['Signals detected', 'पहचाने गए संकेत'])}</span>
            <Chip>{L([`${current.signals?.wc || 0} words`, `${current.signals?.wc || 0} शब्द`])}</Chip>
            <Chip>{L([`${current.signals?.sentences || 0} sentences`, `${current.signals?.sentences || 0} वाक्य`])}</Chip>
            <Chip>{L([`${current.signals?.markers || 0} structure markers`, `${current.signals?.markers || 0} संरचना संकेत`])}</Chip>
            <Chip>{L([`${current.signals?.vocabHits || 0} domain terms`, `${current.signals?.vocabHits || 0} डोमेन शब्द`])}</Chip>
            {current.signals?.quantified ? <Chip className="chip-on">{L(['Quantified', 'संख्या सहित'])}</Chip> : null}
            {current.signals?.weakHits ? <Chip className="border-warn/30 bg-warn/10 text-warn">{L([`${current.signals.weakHits} hedging words`, `${current.signals.weakHits} संदेहवाचक शब्द`])}</Chip> : null}
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          <Button icon={ArrowRight} onClick={advance}>
            {index + 1 >= session.questions.length ? t('int.finish') : L(['Next question', 'अगला प्रश्न'])}
          </Button>
          <Button variant="quiet" icon={RotateCw} onClick={() => { stopVisualizer(); setPhase('setup'); setSession(null); }}>{t('int.restart')}</Button>
          <span className="muted ml-auto text-[10.5px]">{t('int.demoEval')}</span>
        </div>
      </div>
    );
  }


function hlFillers(text) {
  const src = String(text || '');
  const out = [];
  let last = 0;
  for (const m of src.matchAll(FILLER_RE)) {
    if (m.index > last) out.push(src.slice(last, m.index));
    out.push(<mark key={out.length} className="hl-fill">{m[0]}</mark>);
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

  /* --------------------------------- report --------------------------------- */
  if (phase === 'report' && report) {
    const dimItems = DIMS.map((d) => ({ label: L(d.n), value: report.dims?.[d.id] || 0 }));
    const dimData = DIMS.map((d, i) => ({ label: L(d.n), value: report.dims?.[d.id] || 0, compare: BENCH[d.id], color: ['brand', 'accent', 'ok', 'warn', 'brand2'][i % 5] }));
    const qData = results.map((r, i) => ({ label: `Q${i + 1}`, value: r?.skipped ? 0 : Math.round(r?.overall || 0) }));
    const withMetrics = results.filter((r) => r && !r.skipped && r.metrics);
    const wpmVals = withMetrics.map((r) => r.metrics.wpm).filter((w) => typeof w === 'number');
    const avgWpm = wpmVals.length ? Math.round(wpmVals.reduce((a, w) => a + w, 0) / wpmVals.length) : 0;
    const totalFillers = withMetrics.reduce((a, r) => a + r.metrics.fillers, 0);
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <PageHeader
          eyebrow={<><Trophy className="h-3 w-3" aria-hidden />{t('int.report')}</>}
          title={t('int.timeUp')}
          sub={L([`${report.answered} of ${report.attempts} questions answered · ${L(TRACKS.find((x) => x.id === report.track)?.n || ['—', '—'])} · ${L(LEVELS.find((x) => x.id === report.level)?.n || ['—', '—'])}`,
            `${report.attempts} में से ${report.answered} प्रश्नों के उत्तर दिए · ${L(TRACKS.find((x) => x.id === report.track)?.n || ['—', '—'])} · ${L(LEVELS.find((x) => x.id === report.level)?.n || ['—', '—'])}`])}
          actions={<><Button size="sm" variant="ghost" icon={RotateCw} onClick={() => { stopVisualizer(); setPhase('setup'); setSession(null); }}>{t('int.restart')}</Button><Button size="sm" to="/app/dashboard">{t('nav.dashboard')}</Button></>}
        />

        <Card grad className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/10 blur-3xl" aria-hidden />
          <div className="relative flex flex-wrap items-center gap-5">
            <ProgressRing value={report.overall} size={120} stroke={11} tone={report.overall >= 75 ? 'ok' : report.overall >= 55 ? 'brand' : 'warn'} label={t('int.overall')} sublabel={`${report.overall}/100`} />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-bold">{L(report.band)}</h2>
              <p className="muted mt-1.5 text-[12.5px] leading-relaxed">
                {L([`Strongest: ${report.strongest ? L(report.strongest.n) : '—'}. Needs work: ${report.weakest ? L(report.weakest.n) : '—'}.`,
                  `सबसे मज़बूत: ${report.strongest ? L(report.strongest.n) : '—'}। सुधार चाहिए: ${report.weakest ? L(report.weakest.n) : '—'}।`])}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="ok" icon={Check}>{t('int.saveResult')}</Badge>
                {usedVoice ? <Badge tone="accent" icon={Mic}>{t('int.voiceOn')}</Badge> : null}
                <AILabel />
              </div>
            </div>
          </div>
          <div className="relative mt-5 space-y-4 border-t border-line pt-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <HoloTile label={t('int.overall')} value={`${report.overall}/100`} icon={Trophy} tone={report.overall >= 75 ? 'ok' : report.overall >= 55 ? 'brand' : 'warn'} />
              <HoloTile label={L(['Answered', 'उत्तर दिए'])} value={`${report.answered}/${report.attempts}`} icon={Check} tone="accent" />
              <HoloTile label={L(['Avg pace', 'औसत गति'])} value={avgWpm ? `${avgWpm} wpm` : '—'} icon={Gauge} />
              <HoloTile label={L(['Filler words', 'फिलर शब्द'])} value={totalFillers} icon={AlertTriangle} tone={totalFillers > 8 ? 'warn' : 'ok'} />
            </div>
            <div>
              <div className="muted mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">
                <TrendingUp className="h-3 w-3" aria-hidden />{L(['3D dimension scores', '3D डाइमेंशन स्कोर'])}
              </div>
              <IsoBarChart data={dimData} height={210} max={100} depth={14} compareLabel={L(['Practice benchmark', 'अभ्यास बेंचमार्क'])} />
              <p className="muted mt-1 text-[10.5px]">{L(['Solid = you this session · dashed = practice benchmark. Automated feedback is not a validated assessment.', 'ठोस = इस सत्र में आप · डैश्ड = अभ्यास बेंचमार्क। स्वचालित फ़ीडबैक प्रमाणित मूल्यांकन नहीं है।'])}</p>
            </div>
          </div>
        </Card>

        {/* 3D dimension radar */}
        <Card>
          <h3 className="font-display text-[14px] font-bold">{t('int.radar')}</h3>
          <IsoRadar
            className="mt-2"
            height={250}
            axes={DIMS.map((d) => ({ label: L(d.n) }))}
            series={[
              { name: t('int.radarYou'), color: 'brand', values: DIMS.map((d) => report.dims?.[d.id] || 0) },
              { name: t('int.radarBench'), color: 'warn', dash: true, values: DIMS.map((d) => BENCH[d.id]) },
            ]}
          />
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Chip className="chip-on">{t('int.radarYou')}</Chip>
            <Chip className="border-dashed border-warn/40 text-warn">{t('int.radarBench')}</Chip>
            <span className="muted text-[10.5px]">{t('int.demoEval')}</span>
          </div>
        </Card>

        {qData.length > 1 ? (
          <Card>
            <h3 className="font-display text-[14px] font-bold">{L(['Score per question', 'प्रति प्रश्न स्कोर'])}</h3>
            <p className="muted mt-0.5 text-[11px]">{L(['Your trajectory across this session — skipped questions score 0.', 'इस सत्र में आपका प्रक्षेपवक्र — छोड़े गए प्रश्न 0 माने जाते हैं।'])}</p>
            <IsoLineRibbon className="mt-2" data={qData} height={185} color="brand" />
          </Card>
        ) : null}

        {results.length ? (
          <Card>
            <h3 className="font-display text-[14px] font-bold">{t('int.tiles')}</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {results.map((r, i) => (
                <FlipTile
                  key={i}
                  label={`Q${i + 1}`}
                  value={r && !r.skipped ? Math.round(r.overall) : '—'}
                  tone={!r || r.skipped ? 'muted' : r.overall >= 70 ? 'ok' : r.overall >= 50 ? 'brand' : 'warn'}
                  back={!r || r.skipped ? t('int.tileSkipped') : (r.improvements?.[0] ? L(r.improvements[0]) : t('int.tileSolid'))}
                />
              ))}
            </div>
          </Card>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="font-display text-[14px] font-bold">{t('int.suggestions')}</h3>
            {report.suggestions?.length ? (
              <ol className="mt-3 space-y-2">
                {report.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand/15 font-display text-[10px] font-bold text-brand">{i + 1}</span>
                    <span className="text-[12px] leading-snug text-ink">{L(s.pair || [s.en, s.en])}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="muted mt-2 text-[12px]">{L(['No repeated issues found.', 'कोई दोहराई गई कमी नहीं मिली।'])}</p>}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
              <Button size="sm" variant="ghost" to="/app/courses" iconRight={ArrowRight}>{t('nav.courses')}</Button>
              <Button size="sm" variant="quiet" to="/app/resume">{t('nav.resume')}</Button>
            </div>
          </Card>

          <Card>
            <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setShowReview((v) => !v)} aria-expanded={showReview}>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <h3 className="font-display text-[14px] font-bold">{L(['Question-by-question review', 'प्रश्न-दर-प्रश्न समीक्षा'])}</h3>
                {showReview ? <Badge tone="warn">{t('int.fillerHl')}</Badge> : null}
              </span>
              <ChevronDown className={cn('h-4 w-4 text-muted transition-transform', showReview && 'rotate-180')} aria-hidden />
            </button>
            {showReview ? (
              <ul className="mt-3 space-y-2">
                {session.questions.map((q, i) => {
                  const r = results[i];
                  return (
                    <li key={i} className="rounded-xl border border-line bg-surface2/40 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 text-[12px] font-semibold leading-snug">{i + 1}. {L(q.q)}</span>
                        {r && !r.skipped ? <Badge tone={r.overall >= 70 ? 'ok' : r.overall >= 50 ? 'brand' : 'warn'}>{r.overall}</Badge> : <Badge tone="muted">{t('int.skip')}</Badge>}
                      </div>
                      {r?.answer ? <p className="muted mt-1.5 line-clamp-3 text-[11px] leading-snug">{hlFillers(r.answer)}</p> : null}
                      {r?.improvements?.[0] ? <p className="mt-1.5 text-[11px] leading-snug text-warn">{L(r.improvements[0])}</p> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted mt-2 text-[12px]">{L([`${results.length} answers recorded in this session.`, `इस सत्र में ${results.length} उत्तर दर्ज हुए।`])}</p>
            )}
          </Card>
        </div>

        <DemoNotice tone="warn" icon={AlertTriangle}>{t('int.demoEval')}</DemoNotice>
        <HistoryCard history={history} t={t} L={L} lang={lang} />
      </div>
    );
  }

  /* fallback (should not be reachable) */
  return (
    <EmptyState icon={Mic} title={t('int.title')} body={t('int.sub')} action={<Button onClick={() => setPhase('setup')}>{t('int.start')}</Button>} />
  );
}

/* ---------------- Interviewer console (live session companion) ---------------- */
function InterviewerConsole({ seconds, speaking, listening, words, fillers, wpm, micBars, micLive, questionNo, total, L }) {
  const timePct = Math.round(((QUESTION_SECONDS - seconds) / QUESTION_SECONDS) * 100);
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, '0');
  const tone = seconds <= 20 ? 'bad' : seconds <= 50 ? 'warn' : 'brand';
  return (
    <Card className="relative overflow-hidden lg:sticky lg:top-6">
      <span className="scanline" aria-hidden />
      <div className="relative flex flex-col items-center text-center">
        <div className={cn('relative h-20 w-20', !speaking && 'orb-float')}>
          {speaking ? <span className="pulse-ring absolute inset-0 rounded-full border-2 border-brand/50" aria-hidden /> : null}
          {listening || micLive ? (
            <span className="pointer-events-none absolute inset-0 text-accent/80" aria-hidden>
              {micBars.map((h, i) => (
                <span key={i} className="ring-bar" style={{ transform: `rotate(${i * 20}deg) translateY(-${46 + h}px)`, height: `${h}px` }} />
              ))}
            </span>
          ) : null}
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-brand to-accent opacity-90 blur-[1px]" aria-hidden />
          <span className="absolute inset-[7px] grid place-items-center rounded-full bg-surface">
            <Bot className={cn('h-7 w-7', speaking ? 'text-accent' : 'text-brand')} aria-hidden />
          </span>
        </div>
        <div className="mt-2.5 font-display text-[13px] font-bold">{L(['CareerX Interviewer', 'CareerX इंटरव्यूअर'])}</div>
        <div className="muted text-[10.5px] leading-snug">
          {speaking ? L(['Speaking the question…', 'प्रश्न बोला जा रहा है…'])
            : listening ? L(['Listening to your answer…', 'आपका उत्तर सुन रहा है…'])
              : L(['Waiting for your answer', 'आपके उत्तर की प्रतीक्षा'])}
        </div>
        <Badge className="mt-1.5" tone="muted">{L(['Practice interviewer', 'अभ्यास इंटरव्यूअर'])}</Badge>
      </div>

      <div className="relative mt-4 flex justify-center">
        <ProgressRing value={timePct} size={84} stroke={8} tone={tone} label={`${mm}:${ss}`} />
      </div>

      <div className="relative mt-3 grid grid-cols-3 gap-1.5">
        {[
          ['WPM', wpm || '—'],
          [L(['Words', 'शब्द']), words],
          [L(['Fillers', 'फिलर']), fillers],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-surface2/50 px-2 py-1.5 text-center">
            <div className="muted text-[9px] font-bold uppercase tracking-[0.1em]">{k}</div>
            <div className="font-display text-[14px] font-bold tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      <div className="relative mt-3 rounded-xl border border-line bg-surface2/40 p-2.5">
        <div className="flex h-10 items-end justify-center gap-[3px]" aria-hidden>
          {micBars.map((h, i) => (
            <span
              key={i}
              className={cn('w-1.5 rounded-sm', micLive ? 'bg-brand transition-[height] duration-100' : 'bg-accent/50 eq-bar')}
              style={{ height: `${h}px`, animationDelay: `${i * 85}ms` }}
            />
          ))}
        </div>
        <div className="muted mt-1.5 flex items-center justify-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.1em]">
          <Activity className="h-3 w-3" aria-hidden />
          {micLive ? L(['Live mic level', 'लाइव माइक स्तर']) : L(['Simulated visual — mic off', 'सिमुलेटेड विज़ुअल — माइक बंद'])}
        </div>
      </div>

      <p className="muted relative mt-2 text-[10px] leading-snug">
        {L([`Question ${questionNo} of ${total} · audio is processed only in your browser.`, `प्रश्न ${questionNo}/${total} · ऑडियो केवल आपके ब्राउज़र में संसाधित होता है।`])}
      </p>
    </Card>
  );
}

function HistoryCard({ history, t, L, lang }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-[14px] font-bold">{t('int.history')}</h2>
        <Badge tone="muted" icon={History}>{history.length}</Badge>
      </div>
      {history.length ? (
        <ul className="mt-3 space-y-2">
          {history.slice(0, 6).map((h) => (
            <li key={h.id} className="rounded-xl border border-line bg-surface2/40 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[12px] font-semibold">{L(TRACKS.find((x) => x.id === h.track)?.n || [h.track, h.track])} · {L(LEVELS.find((x) => x.id === h.level)?.n || [h.level, h.level])}</span>
                <Badge tone={h.score >= 75 ? 'ok' : h.score >= 55 ? 'brand' : 'warn'}>{h.score}/100</Badge>
              </div>
              <div className="muted mt-1 flex flex-wrap items-center gap-2 text-[10.5px]">
                <span>{relativeTime(h.at, lang === 'hi' ? 'hi-IN' : 'en-IN')}</span>
                <span>· {h.answers} {L(['answers', 'उत्तर'])}</span>
                {h.voice ? <span className="inline-flex items-center gap-1"><Mic className="h-2.5 w-2.5" aria-hidden />{t('int.voiceOn')}</span> : null}
              </div>
              {h.dims ? <Meter className="mt-1.5" value={h.dims.technical || 0} size="xs" label={t('int.technical')} right={`${h.dims.technical || 0}`} /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState className="mt-2" icon={Mic} title={t('int.noHistory')} />
      )}
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <DemoTag />
        <Link to="/app/privacy" className="muted text-[10.5px] hover:text-brand">{L(['Answers stay in this browser', 'उत्तर इसी ब्राउज़र में रहते हैं'])}</Link>
      </div>
    </Card>
  );
}
