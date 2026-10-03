import { cn } from '../lib/utils';

/**
 * CareerX brand mark: an abstract "ascent X" — two rising strokes that cross,
 * with an orbiting node representing the AI mentor guiding the trajectory.
 * Pure inline SVG so it renders identically offline, in print and in the app shell.
 */
export function LogoMark({ size = 38, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={cn('shrink-0', className)} aria-hidden="true">
      <defs>
        <linearGradient id="cx-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#151b3a" />
          <stop offset="100%" stopColor="#0b0f24" />
        </linearGradient>
        <linearGradient id="cx-stroke" x1="10" y1="38" x2="38" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="52%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#cx-tile)" stroke="url(#cx-stroke)" strokeOpacity="0.5" strokeWidth="1.4" />
      {/* rising strokes (the X) */}
      <path d="M13.5 34.5 L24 14.5 L34.5 34.5" stroke="url(#cx-stroke)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.2 27.6 H29.8" stroke="url(#cx-stroke)" strokeWidth="3.4" strokeLinecap="round" />
      {/* destination node + orbit */}
      <circle cx="36.4" cy="12.6" r="3.1" fill="#22d3ee" />
      <circle cx="36.4" cy="12.6" r="6.2" stroke="#22d3ee" strokeOpacity="0.35" strokeWidth="1.1" />
    </svg>
  );
}

export default function Logo({ size = 38, showWordmark = true, tagline, className, wordmarkClass }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {showWordmark ? (
        <span className="flex flex-col leading-none">
          <span className={cn('font-display text-[1.15rem] font-extrabold tracking-tight text-ink', wordmarkClass)}>
            Career<span className="gradient-text">X</span>
          </span>
          {tagline ? <span className="muted mt-1 text-[9.5px] font-semibold uppercase tracking-[0.2em]">{tagline}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
