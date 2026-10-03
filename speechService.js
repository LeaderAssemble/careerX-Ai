/**
 * speechService — browser Web Speech API wrapper (voice input + spoken replies).
 *
 * Everything degrades gracefully:
 *   • If SpeechRecognition is unavailable → sttSupported = false and the UI shows a
 *     friendly fallback (text input keeps working everywhere).
 *   • If speechSynthesis is unavailable → ttsSupported = false, mic/read-aloud buttons hide.
 *   • If permission is denied → state 'denied' with instructions, never a crash.
 *
 * No audio is ever uploaded: recognition runs through the browser’s own API.
 * A production build may prefer a server-side STT provider for accuracy — swap it here.
 */

const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

export const sttSupported = !!SR;
export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export const ERROR_MESSAGES = {
  'not-allowed': ['Microphone permission denied. Allow it in your browser’s site settings to use voice.', 'माइक्रोफ़ोन अनुमति अस्वीकृत। वॉइस उपयोग के लिए ब्राउज़र की साइट सेटिंग्स में अनुमति दें।'],
  'service-not-allowed': ['Voice service is blocked by browser policy.', 'ब्राउज़र नीति ने वॉइस सेवा रोकी है।'],
  'no-speech': ['No speech detected. Try again closer to the microphone.', 'कोई आवाज़ नहीं मिली। माइक्रोफ़ोन के पास से फिर कोशिश करें।'],
  'audio-capture': ['No microphone found on this device.', 'इस डिवाइस पर माइक्रोफ़ोन नहीं मिला।'],
  'network': ['Voice service could not be reached. Check your connection.', 'वॉइस सेवा तक नहीं पहुँचे। कनेक्शन जाँचें।'],
  'aborted': ['Voice input stopped.', 'वॉइस इनपुट रुक गया।'],
  unsupported: ['Voice input is not supported in this browser — text input works everywhere.', 'इस ब्राउज़र में वॉइस इनपुट समर्थित नहीं — टेक्स्ट इनपुट हर जगह काम करता है।'],
};

export function errorText(code) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.unsupported;
}

/** Ask the browser for microphone permission explicitly so we can show real state. */
export async function requestMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) return { state: 'unsupported' };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop()); // we only needed the permission
    return { state: 'granted' };
  } catch (e) {
    const name = e?.name || '';
    if (name === 'NotAllowedError' || name === 'SecurityError') return { state: 'denied' };
    if (name === 'NotFoundError') return { state: 'no-device' };
    return { state: 'error', raw: name };
  }
}

/** Best-effort permission query (Chromium only; falls back to 'unknown'). */
export async function queryMicPermission() {
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const res = await navigator.permissions.query({ name: 'microphone' });
    return res.state; // 'granted' | 'denied' | 'prompt'
  } catch {
    return 'unknown';
  }
}

/**
 * Start speech-to-text.
 * Returns a controller { stop() } or null when unsupported.
 */
export function startListening({ lang = 'en-IN', continuous = false, interim = true, onResult, onEnd, onError, onStateChange } = {}) {
  if (!sttSupported) {
    onError?.({ code: 'unsupported', message: errorText('unsupported') });
    return null;
  }
  let recognition;
  try {
    recognition = new SR();
  } catch (e) {
    onError?.({ code: 'unsupported', message: errorText('unsupported') });
    return null;
  }
  recognition.lang = lang;
  recognition.continuous = continuous;
  recognition.interimResults = interim;
  recognition.maxAlternatives = 1;

  let stopped = false;

  recognition.onstart = () => onStateChange?.('listening');
  recognition.onaudiostart = () => onStateChange?.('listening');
  recognition.onspeechend = () => onStateChange?.('speech-end');
  recognition.onresult = (event) => {
    let finalText = '';
    let partial = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const res = event.results[i];
      const txt = res[0]?.transcript || '';
      if (res.isFinal) finalText += txt;
      else partial += txt;
    }
    onResult?.({ final: finalText.trim(), interim: partial.trim() });
  };
  recognition.onerror = (event) => {
    const code = event?.error || 'aborted';
    onError?.({ code, message: errorText(code) });
    if (code === 'not-allowed' || code === 'service-not-allowed') stopped = true;
  };
  recognition.onend = () => {
    onStateChange?.('idle');
    if (!stopped) onEnd?.();
  };

  try {
    recognition.start();
  } catch (e) {
    onError?.({ code: 'aborted', message: errorText('aborted') });
    return null;
  }

  return {
    stop() {
      stopped = true;
      try { recognition.stop(); } catch { /* noop */ }
    },
    abort() {
      stopped = true;
      try { recognition.abort(); } catch { /* noop */ }
    },
    supported: true,
  };
}

/* ---------------------------------- TTS ---------------------------------- */

function pickVoice(lang) {
  if (!ttsSupported) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;
  const exact = voices.find((v) => v.lang === lang);
  if (exact) return exact;
  const base = lang.split('-')[0];
  return voices.find((v) => (v.lang || '').toLowerCase().startsWith(base)) || voices[0] || null;
}

/** Speak text aloud. Returns true when playback started. */
export function speak(text, { lang = 'en-IN', rate = 1, pitch = 1, onEnd } = {}) {
  if (!ttsSupported || !String(text || '').trim()) return false;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(String(text).slice(0, 1200));
    utter.lang = lang;
    utter.rate = rate;
    utter.pitch = pitch;
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    utter.onend = () => onEnd?.();
    utter.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking() {
  if (!ttsSupported) return;
  try { window.speechSynthesis.cancel(); } catch { /* noop */ }
}

export function isSpeaking() {
  return !!ttsSupported && window.speechSynthesis.speaking;
}

export function listVoices() {
  if (!ttsSupported) return [];
  return window.speechSynthesis.getVoices() || [];
}

export default { sttSupported, ttsSupported, startListening, speak, stopSpeaking, requestMicrophone, queryMicPermission, errorText };
