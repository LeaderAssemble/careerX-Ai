import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, X, Minus, Square, Send, Mic, MicOff, Trash2, Volume2, VolumeX, Sparkles, Loader2, ArrowRight, RotateCw } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import { chat as aiChat, AI_PROVIDER } from '../../services/aiService';
import { startListening, speak, stopSpeaking, sttSupported, ttsSupported, errorText } from '../../services/speechService';
import storage from '../../lib/storage';
import { cn, uid } from '../../lib/utils';
import Logo from '../Logo';

/**
 * CareerX AI — floating assistant available on every screen.
 *
 * Responses come from the demo engine (keyword intent + the student's own profile data)
 * and are labelled as such. Voice input uses the browser Web Speech API and degrades
 * gracefully when unavailable or denied. See src/services/aiService.js to connect a
 * real LLM later — the message contract stays identical.
 */

const QUICK = ['chat.q1', 'chat.q2', 'chat.q3', 'chat.q4', 'chat.q5', 'chat.q6'];

export default function Chatbot() {
  const { t, L, lang, speech } = useI18n();
  const { user, profile, progress, derived, settings, updateSettings, incrementChat, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [mini, setMini] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nudge, setNudge] = useState(false);

  const scroller = useRef(null);
  const inputRef = useRef(null);
  const recognizer = useRef(null);
  const storageKey = `chat:${user?.id || 'guest'}`;

  /* restore history */
  useEffect(() => {
    const saved = storage.get(storageKey, null);
    if (Array.isArray(saved) && saved.length) setMessages(saved);
  }, [storageKey]);

  /* persist history */
  useEffect(() => {
    if (messages.length) storage.set(storageKey, messages.slice(-60));
  }, [messages, storageKey]);

  /* first greeting */
  useEffect(() => {
    if (!open || messages.length || !user) return;
    const name = String(profile?.personal?.name || user.name || '').split(' ')[0] || '';
    setMessages([{ id: uid('m'), role: 'ai', text: L(['Hi ' + (name || 'there') + '! I’m CareerX AI, your personal career mentor. Ask me about careers, skills, courses, resumes or interviews — in English or हिंदी.',
      'नमस्ते ' + (name || 'दोस्त') + '! मैं CareerX AI हूँ, आपका निजी करियर मेंटर। करियर, कौशल, कोर्सेस, रिज़्यूमे या इंटरव्यू के बारे में पूछें — English या हिंदी में।']), at: Date.now() }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  /* gentle attention nudge once per session */
  useEffect(() => {
    if (!user) return undefined;
    const shown = storage.get('chatNudge', false);
    if (shown) return undefined;
    const timer = setTimeout(() => { setNudge(true); storage.set('chatNudge', true); setTimeout(() => setNudge(false), 9000); }, 12000);
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (open && scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, open, busy]);

  useEffect(() => {
    if (open && !mini) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, mini]);

  useEffect(() => () => { recognizer.current?.abort?.(); stopSpeaking(); }, []);

  const send = useCallback(async (text) => {
    const msg = String(text ?? input).trim();
    if (!msg || busy) return;
    setError(null);
    setMini(false);
    setInput('');
    setMessages((m) => [...m, { id: uid('m'), role: 'user', text: msg, at: Date.now() }]);
    setBusy(true);
    try {
      const res = await aiChat({ message: msg, lang, profile: profile || {}, progress: progress || {}, derived });
      const reply = L(res.reply);
      setMessages((m) => [...m, { id: uid('m'), role: 'ai', text: reply, links: res.links || [], intent: res.intent, at: Date.now() }]);
      incrementChat();
      if (settings.tts && ttsSupported) speak(reply, { lang: speech });
    } catch (e) {
      setError(t('chat.unavailable'));
      setMessages((m) => [...m, { id: uid('m'), role: 'ai', text: L(['I could not answer that. Try rephrasing, or use the quick prompts below.', 'मैं इसका उत्तर नहीं दे सका। प्रश्न बदलकर देखें या नीचे दिए त्वरित प्रॉम्प्ट उपयोग करें।']), error: true, at: Date.now() }]);
    } finally {
      setBusy(false);
    }
  }, [input, busy, lang, profile, progress, derived, L, settings.tts, speech, incrementChat, t]);

  /* ------------------------------- voice ------------------------------- */
  const toggleVoice = useCallback(() => {
    if (!sttSupported || settings.voiceInput === false) {
      setMicError(errorText('unsupported'));
      toast({ kind: 'warn', title: L(['Voice not supported', 'वॉइस समर्थित नहीं']), body: L(errorText('unsupported')) });
      return;
    }
    if (listening) {
      recognizer.current?.stop();
      setListening(false);
      return;
    }
    setMicError(null);
    recognizer.current = startListening({
      lang: speech,
      interim: true,
      onResult: ({ final, interim }) => {
        if (final) setInput((v) => (v ? `${v} ${final}` : final));
        else if (interim) setInput((v) => v.replace(/[\s]*$/, '') + (v && !v.endsWith(' ') ? ' ' : '') + interim);
      },
      onStateChange: (s) => setListening(s === 'listening'),
      onError: ({ code }) => {
        setListening(false);
        setMicError(L(errorText(code)));
        if (code === 'not-allowed') updateSettings({ voiceInput: false });
      },
      onEnd: () => setListening(false),
    });
    if (!recognizer.current) setListening(false);
  }, [listening, speech, settings.voiceInput, L, toast, updateSettings]);

  const clearChat = () => {
    setMessages([]);
    storage.remove(storageKey);
    toast({ kind: 'info', title: L(['Conversation cleared', 'बातचीत मिटाई गई']) });
  };

  const readLast = () => {
    const last = [...messages].reverse().find((m) => m.role === 'ai');
    if (!last) return;
    if (settings.tts && ttsSupported) speak(last.text, { lang: speech });
    else updateSettings({ tts: true });
  };

  /* ------------------------------ collapsed ------------------------------ */
  if (!open) {
    return (
      <div className="fixed bottom-[4.75rem] right-3 z-[70] flex flex-col items-end gap-2 sm:right-5 lg:bottom-6">
        {nudge ? (
          <div className="max-w-[15rem] rounded-xl border border-brand/35 bg-surface/95 p-3 text-xs shadow-lift backdrop-blur-xl animate-scale-in">
            <p className="font-semibold text-ink">{L(['Need a hand?', 'मदद चाहिए?'])}</p>
            <p className="muted mt-1 leading-snug">{L(['Ask me which career fits you, or what to do next today.', 'पूछें कि कौन सा करियर आपके लिए ठीक है, या आज आगे क्या करें।'])}</p>
            <button type="button" onClick={() => setNudge(false)} className="muted mt-1.5 text-[10px] font-semibold hover:text-ink">{t('common.close')}</button>
          </div>
        ) : null}
        <button
          type="button" onClick={() => setOpen(true)} aria-label={t('chat.open')}
          className="group relative grid h-14 w-14 place-items-center rounded-2xl text-white shadow-glow transition-transform duration-300 hover:scale-105 active:scale-95"
          style={{ backgroundImage: 'linear-gradient(135deg, rgb(var(--c-brand-soft)), rgb(var(--c-brand-2)) 55%, rgb(var(--c-accent)))' }}
        >
          <span className="absolute inset-0 rounded-2xl bg-brand/40 animate-pulse-ring" aria-hidden />
          <MessageSquare className="relative h-6 w-6" aria-hidden />
        </button>
      </div>
    );
  }

  /* -------------------------------- open -------------------------------- */
  return (
    <section
      aria-label={t('chat.title')}
      className={cn(
        'fixed z-[70] flex flex-col overflow-hidden rounded-2xl border border-line bg-surface/[0.97] shadow-lift backdrop-blur-2xl',
        'bottom-[4.5rem] right-2 left-2 sm:left-auto sm:right-5 lg:bottom-6',
        mini ? 'h-[52px] sm:w-[22rem]' : 'h-[min(34rem,calc(100vh-7rem))] w-auto sm:w-[24.5rem]'
      )}
    >
      {/* header */}
      <header className="flex shrink-0 items-center gap-2.5 border-b border-line bg-gradient-to-r from-brand/[0.12] via-transparent to-accent/10 px-3 py-2.5">
        <Logo size={30} showWordmark={false} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="font-display text-sm font-bold">{t('chat.title')}</h2>
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
            </span>
          </div>
          <p className="muted truncate text-[10px]">{t('chat.subtitle')} · {AI_PROVIDER}</p>
        </div>
        {ttsSupported ? (
          <button type="button" onClick={settings.tts ? () => { updateSettings({ tts: false }); stopSpeaking(); } : readLast}
            className="icon-btn h-8 w-8" aria-label={settings.tts ? t('voice.ttsOff') : t('chat.readAloud')}>
            {settings.tts ? <Volume2 className="h-3.5 w-3.5" aria-hidden /> : <VolumeX className="h-3.5 w-3.5" aria-hidden />}
          </button>
        ) : null}
        <button type="button" onClick={() => setMini((m) => !m)} className="icon-btn h-8 w-8" aria-label={mini ? t('chat.maximize') : t('chat.minimize')}>
          {mini ? <Square className="h-3.5 w-3.5" aria-hidden /> : <Minus className="h-3.5 w-3.5" aria-hidden />}
        </button>
        <button type="button" onClick={() => { setOpen(false); stopSpeaking(); recognizer.current?.abort?.(); }} className="icon-btn h-8 w-8" aria-label={t('chat.close')}>
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </header>

      {!mini ? (
        <>
          {/* messages */}
          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-3 py-3" aria-live="polite">
            {messages.map((m) => (
              <Message key={m.id} m={m} />
            ))}
            {busy ? (
              <div className="flex items-center gap-2 text-xs text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />{t('chat.thinking')}
              </div>
            ) : null}
            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-bad/35 bg-bad/10 p-2.5 text-[11px] text-ink">
                <RotateCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bad" aria-hidden />
                <span>{error}</span>
              </div>
            ) : null}
            {!messages.length && !busy ? (
              <p className="muted px-1 text-[11px] leading-relaxed">{t('chat.demoNote')}</p>
            ) : null}
          </div>

          {/* quick prompts */}
          <div className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto border-t border-line px-3 py-2">
            {QUICK.map((k) => (
              <button
                key={k} type="button" disabled={busy}
                onClick={() => send(t(k))}
                className="shrink-0 rounded-full border border-line bg-surface2/70 px-2.5 py-1 text-[10.5px] font-semibold text-muted transition hover:border-brand/50 hover:text-brand disabled:opacity-50"
              >
                {t(k)}
              </button>
            ))}
            {messages.length > 1 ? (
              <button type="button" onClick={clearChat} className="ml-auto flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-semibold text-muted transition hover:text-bad" aria-label={t('chat.clear')}>
                <Trash2 className="h-3 w-3" aria-hidden />
              </button>
            ) : null}
          </div>

          {/* input */}
          <form
            className="flex shrink-0 items-end gap-2 border-t border-line px-3 py-2.5"
            onSubmit={(e) => { e.preventDefault(); send(); }}
          >
            <label className="sr-only" htmlFor="chat-input">{t('chat.placeholder')}</label>
            <textarea
              id="chat-input" ref={inputRef} rows={1} value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={listening ? t('int.listening') : t('chat.placeholder')}
              className="field max-h-28 min-h-[38px] flex-1 resize-none py-2 text-[13px] leading-snug"
            />
            <button
              type="button" onClick={toggleVoice}
              className={cn('icon-btn h-[38px] w-[38px] shrink-0', listening && 'border-bad/60 bg-bad/10 text-bad', micError && 'border-warn/60 text-warn')}
              aria-label={listening ? t('chat.micStop') : t('chat.mic')}
              aria-pressed={listening}
            >
              {listening ? <MicOff className="h-4 w-4 animate-blink" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
            </button>
            <button type="submit" disabled={!input.trim() || busy} className="btn-primary h-[38px] w-[38px] shrink-0 !px-0" aria-label={t('chat.send')}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            </button>
          </form>
          {micError ? <p className="shrink-0 border-t border-warn/25 bg-warn/[0.08] px-3 py-1.5 text-[10.5px] leading-snug text-warn">{micError}</p> : null}
        </>
      ) : null}
    </section>
  );
}

function Message({ m }) {
  const { L } = useI18n();
  const isUser = m.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[86%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed animate-fade-up',
        isUser
          ? 'rounded-br-md bg-gradient-to-br from-brand/85 to-brand-2/85 text-white shadow-glow'
          : cn('rounded-bl-md border border-line bg-surface2/70 text-ink', m.error && 'border-bad/35 bg-bad/[0.07]')
      )}>
        {!isUser ? (
          <div className="mb-1 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-brand">
            <Sparkles className="h-2.5 w-2.5" aria-hidden />CareerX AI
          </div>
        ) : null}
        <p className="whitespace-pre-line">{m.text}</p>
        {m.links?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {m.links.map((l, i) => (
              <Link key={i} to={l.to} className="inline-flex items-center gap-1 rounded-lg border border-brand/35 bg-brand/10 px-2 py-1 text-[10.5px] font-bold text-brand transition hover:bg-brand/20">
                {L(l.label)}<ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
