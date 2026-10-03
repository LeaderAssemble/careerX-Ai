import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Mic, MicOff, Volume2, VolumeX, Bell, ChevronDown, LogOut, User as UserIcon, ShieldCheck, LayoutDashboard, Languages, Type } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../store/AppStore';
import { Avatar, Badge, IconButton } from '../ui/primitives';
import { sttSupported, ttsSupported, requestMicrophone } from '../../services/speechService';
import { cn, relativeTime } from '../../lib/utils';

/** Click-outside + Escape helper for the small popovers below. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return { open, setOpen, ref };
}

function Popover({ button, children, align = 'right', width = 'w-64', label }) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)} aria-expanded={open} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o); } }}
        aria-label={label} aria-haspopup="true">
        {button(open)}
      </div>
      {open ? (
        <div className="fixed inset-0 z-[75] max-lg:bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
      ) : null}
      {open ? (
        <div className={cn('absolute top-[calc(100%+8px)] z-[80] origin-top rounded-xl border border-line bg-surface p-2 shadow-lift dark:bg-surface2 animate-scale-in',
          'max-lg:fixed max-lg:inset-x-3 max-lg:top-[4.25rem] max-lg:w-auto max-lg:max-h-[70vh] max-lg:overflow-y-auto',
          align === 'right' ? 'lg:right-0' : 'lg:left-0', width)}>
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ Language ------------------------------ */
export function LanguageSwitch({ compact = false }) {
  const { lang, setLang, langs, t } = useI18n();
  return (
    <Popover
      label={t('common.lang')}
      width="w-56"
      button={(open) => (
        <span className={cn('icon-btn gap-1.5', compact ? '' : 'w-auto px-2.5', open && 'border-brand/60 text-brand')}>
          <span className="text-xs font-bold">{langs.find((l) => l.code === lang)?.short}</span>
          <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
        </span>
      )}
    >
      {(close) => (
        <div>
          <div className="muted px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.16em]">{t('common.lang')}</div>
          {langs.map((l) => (
            <button
              key={l.code} type="button" onClick={() => { setLang(l.code); close(); }}
              aria-pressed={lang === l.code}
              className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition hover:bg-surface2',
                lang === l.code ? 'text-brand bg-brand/10' : 'text-muted')}
            >
              <span aria-hidden className="text-base leading-none">{l.flag}</span>
              <span className="flex-1 text-left">{l.label}</span>
              {lang === l.code ? <span className="text-[10px] font-bold uppercase">on</span> : null}
            </button>
          ))}
          <p className="muted mt-1.5 flex items-start gap-1.5 px-2.5 pb-1 text-[10.5px] leading-snug">
            <Languages className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            {lang === 'hi' ? 'पूरा इंटरफ़ेस तुरंत हिंदी में बदल जाता है।' : 'The entire interface switches instantly.'}
          </p>
        </div>
      )}
    </Popover>
  );
}

/* -------------------------------- Theme -------------------------------- */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const dark = theme === 'dark';
  return (
    <IconButton
      icon={dark ? Sun : Moon}
      label={dark ? t('common.light') : t('common.dark')}
      onClick={toggle}
      aria-pressed={dark}
    />
  );
}

export function TextSizeControl() {
  const { settings, updateSettings } = useApp();
  const { L } = useI18n();
  const selected = settings.textSize || 'medium';
  const options = [
    { id: 'small', label: ['Small', 'छोटा'], sample: 'text-[11px]' },
    { id: 'medium', label: ['Medium', 'मध्यम'], sample: 'text-[13px]' },
    { id: 'large', label: ['Bigger', 'बड़ा'], sample: 'text-[15px]' },
  ];

  return (
    <Popover
      label={L(['Text size', 'टेक्स्ट आकार'])}
      width="w-52"
      button={(open) => (
        <span className={cn('icon-btn gap-1.5 px-2', open && 'border-brand/60 text-brand')} title={L(['Text size', 'टेक्स्ट आकार'])}>
          <Type className="h-4 w-4" aria-hidden />
          <span className="text-[11px] font-bold">A</span>
          <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
        </span>
      )}
    >
      {(close) => (
        <div>
          <div className="muted px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.16em]">{L(['Text size', 'टेक्स्ट आकार'])}</div>
          <div className="grid grid-cols-3 gap-1">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected === option.id}
                onClick={() => { updateSettings({ textSize: option.id }); close(); }}
                className={cn('flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-muted transition hover:bg-surface2', selected === option.id && 'border-brand/50 bg-brand/10 text-brand')}
              >
                <span className={cn('font-bold leading-none', option.sample)}>A</span>
                <span className="text-[10px] font-semibold">{L(option.label)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Popover>
  );
}

/* -------------------------------- Voice -------------------------------- */
export function VoiceControl() {
  const { t, L } = useI18n();
  const { settings, updateSettings, toast } = useApp();
  const [micState, setMicState] = useState(sttSupported ? 'unknown' : 'unsupported');

  const onToggleMic = async () => {
    if (!sttSupported) {
      toast({ kind: 'warn', title: L(['Voice not supported', 'वॉइस समर्थित नहीं']), body: L(['Voice input is not supported in this browser — text input works everywhere.', 'इस ब्राउज़र में वॉइस इनपुट समर्थित नहीं — टेक्स्ट इनपुट हर जगह काम करता है।']) });
      return;
    }
    const res = await requestMicrophone();
    setMicState(res.state);
    if (res.state === 'granted') {
      updateSettings({ voiceInput: true });
      toast({ kind: 'success', title: L(['Microphone ready', 'माइक्रोफ़ोन तैयार']), body: L(['Voice input is enabled in chat and mock interviews.', 'चैट और मॉक इंटरव्यू में वॉइस इनपुट चालू है।']) });
    } else if (res.state === 'denied') {
      updateSettings({ voiceInput: false });
      toast({ kind: 'error', title: L(['Microphone permission denied', 'माइक्रोफ़ोन अनुमति अस्वीकृत']), body: L(['Allow microphone access in your browser’s site settings to use voice.', 'वॉइस के लिए ब्राउज़र की साइट सेटिंग्स में माइक्रोफ़ोन अनुमति दें।']) });
    }
  };

  return (
    <Popover
      label={t('voice.supported')}
      width="w-72"
      button={(open) => (
        <span className={cn('icon-btn', open && 'border-brand/60 text-brand', micState === 'denied' && 'text-bad border-bad/40')}>
          {micState === 'denied' || settings.voiceInput === false ? <MicOff className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
        </span>
      )}
    >
      {() => (
        <div className="space-y-2.5 p-1">
          <div className="flex items-center gap-2">
            <Badge tone={sttSupported ? (micState === 'denied' ? 'bad' : 'ok') : 'warn'}>
              {sttSupported ? (micState === 'denied' ? L(['Denied', 'अस्वीकृत']) : L(['Ready', 'तैयार'])) : L(['Unsupported', 'असमर्थित'])}
            </Badge>
            <span className="muted text-[11px]">{L(['Browser Web Speech API', 'ब्राउज़र वेब स्पीच API'])}</span>
          </div>
          <div className="rounded-lg border border-line bg-surface2/60 p-2.5">
            <button type="button" onClick={onToggleMic} className="btn btn-ghost w-full">
              <Mic className="h-4 w-4" aria-hidden />
              {L(['Check microphone permission', 'माइक्रोफ़ोन अनुमति जाँचें'])}
            </button>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5">
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                {settings.tts ? <Volume2 className="h-3.5 w-3.5 text-brand" aria-hidden /> : <VolumeX className="h-3.5 w-3.5 text-muted" aria-hidden />}
                {L(['Speak AI replies aloud', 'AI उत्तर बोलकर सुनाएँ'])}
              </span>
              <span className="muted mt-0.5 block text-[10.5px] leading-snug">
                {ttsSupported ? L(['Text-to-speech for chat and interview questions.', 'चैट और इंटरव्यू प्रश्नों के लिए टेक्स्ट-टू-स्पीच।']) : L(['Not supported in this browser.', 'इस ब्राउज़र में समर्थित नहीं।'])}
              </span>
            </span>
            <input
              type="checkbox" className="h-4 w-4 accent-[rgb(var(--c-brand))] disabled:opacity-40"
              checked={!!settings.tts} disabled={!ttsSupported}
              onChange={(e) => updateSettings({ tts: e.target.checked })}
            />
          </label>
        </div>
      )}
    </Popover>
  );
}

/* ---------------------------- Notifications ---------------------------- */
export function NotificationBell({ to = '/app/notifications' }) {
  const { notifications, unread, markAllRead } = useApp();
  const { t, L, locale } = useI18n();
  const navigate = useNavigate();
  return (
    <Popover
      label={t('nav.notifications')}
      width="w-[min(22rem,calc(100vw-2rem))]"
      button={(open) => (
        <span className={cn('icon-btn relative', open && 'border-brand/60 text-brand')}>
          <Bell className="h-4 w-4" aria-hidden />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 text-[9px] font-bold text-white ring-2 ring-surface">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </span>
      )}
    >
      {(close) => (
        <div>
          <div className="mb-1 flex items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-brand/[0.14] via-brand/[0.05] to-transparent px-2.5 pb-2 pt-2">
            <span className="font-display text-xs font-bold">{t('notif.title')}</span>
            {unread ? (
              <button type="button" onClick={markAllRead} className="text-[11px] font-semibold text-brand hover:underline">{t('notif.markAll')}</button>
            ) : null}
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {!notifications.length ? (
              <p className="muted px-2 py-6 text-center text-xs">{t('notif.empty')}</p>
            ) : notifications.slice(0, 6).map((n) => (
              <button
                key={n.id} type="button"
                onClick={() => { close(); navigate(n.link || to); }}
                className={cn('flex w-full gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-surface2', !n.read && 'border border-brand/30 bg-brand/[0.12] dark:bg-brand/[0.18]')}
              >
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', n.read ? 'bg-line' : 'bg-brand')} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-ink">{L(n.title)}</span>
                  <span className="muted mt-0.5 block text-[11px] leading-snug line-clamp-2">{L(n.body)}</span>
                  <span className="muted mt-1 block text-[10px]">{relativeTime(n.at, locale)}</span>
                </span>
              </button>
            ))}
          </div>
          <Link to={to} onClick={close} className="mt-1.5 block rounded-lg px-2.5 py-2 text-center text-[11px] font-bold text-brand hover:bg-surface2">
            {t('common.viewAll')}
          </Link>
        </div>
      )}
    </Popover>
  );
}

/* ------------------------------- User menu ------------------------------- */
export function UserMenu() {
  const { user, logout, isStudent } = useApp();
  const { t, L } = useI18n();
  const navigate = useNavigate();
  const name = user?.name || user?.email || t('common.student');
  return (
    <Popover
      label={name}
      width="w-60"
      button={() => (
        <span className="flex items-center gap-2 rounded-xl border border-line bg-surface/60 py-1 pl-1 pr-2 transition hover:border-brand/50">
          <Avatar name={name} src={user?.avatar} size={28} ring={false} />
          <span className="hidden max-w-[8rem] truncate text-xs font-semibold sm:block">{name}</span>
          <ChevronDown className="h-3 w-3 text-muted" aria-hidden />
        </span>
      )}
    >
      {(close) => (
        <div className="space-y-0.5">
          <div className="px-2.5 py-2">
            <div className="truncate text-sm font-bold text-ink">{name}</div>
            <div className="muted truncate text-[11px]">{user?.email}</div>
            <div className="mt-1.5"><Badge tone={isStudent ? 'brand' : 'accent'}>{isStudent ? t('common.student') : t('common.admin')}</Badge></div>
          </div>
          <div className="divider my-1" />
          {isStudent ? (
            <MenuItem icon={UserIcon} label={t('nav.profile')} to="/app/profile" close={close} />
          ) : (
            <MenuItem icon={LayoutDashboard} label={t('nav.admin.dashboard')} to="/admin/dashboard" close={close} />
          )}
          <MenuItem icon={ShieldCheck} label={t('nav.privacy')} to={isStudent ? '/app/privacy' : '/admin/settings'} close={close} />
          <div className="divider my-1" />
          <button
            type="button"
            onClick={() => { close(); navigate('/'); logout(); }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-bad transition hover:bg-bad/10"
          >
            <LogOut className="h-4 w-4" aria-hidden />{t('nav.logout')}
          </button>
          <p className="muted px-2.5 pb-1 pt-1 text-[10px] leading-snug">{L(['Session stored in this browser.', 'सत्र इस ब्राउज़र में सेव है।'])}</p>
        </div>
      )}
    </Popover>
  );
}

function MenuItem({ icon: Icon, label, to, close }) {
  return (
    <Link to={to} onClick={close} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted transition hover:bg-surface2 hover:text-ink">
      <Icon className="h-4 w-4" aria-hidden />{label}
    </Link>
  );
}

/** The control cluster reused by the app shell, landing header and auth pages. */
export function TopControls({ compact = false, showVoice = true }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {showVoice ? <VoiceControl /> : null}
      <ThemeToggle />
      <LanguageSwitch compact={compact} />
      <TextSizeControl />
    </div>
  );
}
