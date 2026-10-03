import { useId, useMemo } from 'react';
import { useChartPalette } from './Charts';
import { cn, clamp, useCountUp } from '../../lib/utils';

/**
 * Charts3D — isometric ("PowerBI-style") visualisations built from plain SVG polygons.
 * No WebGL dependency: each bar is a projected cuboid (front / top / side faces), so the
 * result is crisp at any DPI, theme-aware, and animates with pure CSS. The whole chart
 * sits on a tilted "stage" with a floor grid and a soft glare for depth.
 */

const ISO = { dx: 0.62, dy: -0.42 }; // cabinet projection vector for the depth axis

function shade(hex, amt) {
  // amt > 0 lighten, amt < 0 darken; hex like #rrggbb
  try {
    const n = hex.replace('#', '');
    const num = parseInt(n.length === 3 ? n.split('').map((c) => c + c).join('') : n, 16);
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;
    const f = (v) => clamp(Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt)), 0, 255);
    r = f(r); g = f(g); b = f(b);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch { return hex; }
}

/**
 * IsoBarChart — 3D column chart.
 * data: [{ label, value, color? }] where color is a palette key or hex.
 */
export function IsoBarChart({ data = [], height = 240, max, unit = '', className, depth = 16, showGrid = true, compareLabel }) {
  const p = useChartPalette();
  const uid = useId().replace(/:/g, '');
  const W = 560;
  const H = height;
  const padL = 34;
  const padB = 40;
  const padT = 26;
  const floorH = 46;

  const peak = Math.max(max || 0, ...data.map((d) => d.value), 1);
  const innerH = H - padT - padB - floorH * 0.4;
  const slot = (W - padL - 30) / Math.max(1, data.length);
  const bw = Math.min(58, slot * 0.52);

  const bars = useMemo(() => data.map((d, i) => {
    const h = Math.max(4, (d.value / peak) * innerH);
    const x = padL + i * slot + (slot - bw) / 2;
    const y0 = H - padB;
    const c = d.color ? (p[d.color] || d.color) : p.brand;
    const dx = depth * ISO.dx;
    const dy = depth * ISO.dy;
    return {
      ...d, i, h, x, y0, c,
      front: `${x},${y0 - h} ${x + bw},${y0 - h} ${x + bw},${y0} ${x},${y0}`,
      top: `${x},${y0 - h} ${x + dx},${y0 - h + dy} ${x + bw + dx},${y0 - h + dy} ${x + bw},${y0 - h}`,
      side: `${x + bw},${y0 - h} ${x + bw + dx},${y0 - h + dy} ${x + bw + dx},${y0 + dy} ${x + bw},${y0}`,
      labelX: x + bw / 2,
      valY: y0 - h + dy - 8,
    };
  }), [data, peak, innerH, slot, bw, H, padB, depth, p]);

  const gridLines = [0.25, 0.5, 0.75, 1];

  return (
    <div className={cn('stage3d', className)} style={{ height: H + 26 }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img"
        aria-label={data.map((d) => `${d.label}: ${d.value}${unit}`).join(', ')}>
        <defs>
          <linearGradient id={`iso-floor-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.fill} stopOpacity="0.55" />
            <stop offset="100%" stopColor={p.fill} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* floor */}
        {showGrid ? (
          <g>
            <polygon
              points={`${padL - 10},${H - padB} ${W - 14},${H - padB} ${W - 14 + depth * ISO.dx},${H - padB + depth * ISO.dy + floorH * 0.35} ${padL - 10 + depth * ISO.dx},${H - padB + depth * ISO.dy + floorH * 0.35}`}
              fill={`url(#iso-floor-${uid})`} stroke={p.grid} strokeWidth="0.6"
            />
            {gridLines.map((g) => {
              const y = H - padB - g * innerH;
              return <line key={g} x1={padL - 6} y1={y} x2={W - 18} y2={y} stroke={p.grid} strokeDasharray="3 6" strokeWidth="0.7" />;
            })}
          </g>
        ) : null}

        {/* benchmark ghost cuboids (compare series) */}
        {bars.filter((b) => typeof b.compare === 'number').map((b) => {
          const gh = Math.max(4, (b.compare / peak) * innerH);
          const gx = b.x + 7;
          const gy = b.y0;
          const dx = depth * ISO.dx;
          const dy = depth * ISO.dy;
          return (
            <g key={`c${b.i}`} className="iso-bar" style={{ animationDelay: `${b.i * 70 + 120}ms` }} opacity="0.5">
              <polygon points={`${gx + bw},${gy - gh} ${gx + bw + dx},${gy - gh + dy} ${gx + bw + dx},${gy + dy} ${gx + bw},${gy}`} fill={p.text} opacity="0.16" />
              <polygon points={`${gx},${gy - gh} ${gx + dx},${gy - gh + dy} ${gx + bw + dx},${gy - gh + dy} ${gx + bw},${gy - gh}`} fill={p.text} opacity="0.22" />
              <polygon points={`${gx},${gy - gh} ${gx + bw},${gy - gh} ${gx + bw},${gy} ${gx},${gy}`} fill={p.text} opacity="0.13" stroke={p.text} strokeOpacity="0.5" strokeDasharray="3 3" strokeWidth="0.8" />
            </g>
          );
        })}

        {/* bars */}
        {bars.map((b) => (
          <g key={b.i} className="iso-bar" style={{ animationDelay: `${b.i * 70}ms` }}>
            <polygon points={b.side} fill={shade(b.c, -0.34)} />
            <polygon points={b.top} fill={shade(b.c, 0.3)} />
            <polygon points={b.front} fill={b.c} />
            <polygon points={b.front} fill="url(#iso-floor-none)" opacity="0" />
            <text x={b.labelX} y={b.valY} textAnchor="middle" className="iso-val" fill={p.ink} fontSize="12" fontWeight="700">
              {b.value}{unit}
            </text>
            <text x={b.labelX + depth * ISO.dx * 0.5} y={H - padB + 16} textAnchor="middle" fill={p.text} fontSize="9.5" fontWeight="600">
              {String(b.label).slice(0, 14)}
            </text>
          </g>
        ))}
      </svg>
      {compareLabel ? (
        <span className="muted absolute right-2 top-1 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.1em]">
          <span className="inline-block h-2 w-2 rounded-[2px] border border-dashed border-current opacity-60" aria-hidden />{compareLabel}
        </span>
      ) : null}
      <span className="stage-glare" aria-hidden />
    </div>
  );
}

/** rAF count-up number that honours Reduce motion. */
export function AnimatedNumber({ value = 0, duration = 650, suffix = '', className }) {
  const shown = useCountUp(value, duration);
  return <span className={cn('tabular-nums', className)}>{Math.round(shown)}{suffix}</span>;
}

/**
 * IsoLineRibbon — a tilted area ribbon (trend) with a 3D extruded baseline.
 * data: [{ label, value }]
 */
export function IsoLineRibbon({ data = [], height = 190, color = 'brand', unit = '', className }) {
  const p = useChartPalette();
  const uid = useId().replace(/:/g, '');
  const W = 560;
  const H = height;
  const padL = 26;
  const padR = 18;
  const padT = 20;
  const padB = 30;
  const depth = 12;
  const c = p[color] || color;
  const peak = Math.max(...data.map((d) => d.value), 1);
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const pts = data.map((d, i) => ({
    x: padL + (i / Math.max(1, data.length - 1)) * innerW,
    y: padT + innerH - (d.value / peak) * innerH,
    ...d,
  }));
  const line = pts.map((q) => `${q.x},${q.y}`).join(' ');
  const area = `${padL},${padT + innerH} ${line} ${padL + innerW},${padT + innerH}`;
  const extrude = `${padL},${padT + innerH} ${padL + depth * ISO.dx},${padT + innerH + depth * ISO.dy} ${padL + innerW + depth * ISO.dx},${padT + innerH + depth * ISO.dy} ${padL + innerW},${padT + innerH}`;

  return (
    <div className={cn('stage3d', className)} style={{ height: H + 18 }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img"
        aria-label={data.map((d) => `${d.label}: ${d.value}${unit}`).join(', ')}>
        <defs>
          <linearGradient id={`rib-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="0.5" />
            <stop offset="100%" stopColor={c} stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <polygon points={extrude} fill={shade(c, -0.4)} className="iso-bar" />
        <polygon points={area} fill={`url(#rib-${uid})`} className="iso-bar" />
        <polyline points={line} fill="none" stroke={c} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" className="ribbon-line" />
        {pts.map((q, i) => (
          <g key={i}>
            <circle cx={q.x} cy={q.y} r="3.4" fill={p.surface} stroke={c} strokeWidth="2" />
            {i === pts.length - 1 ? (
              <text x={q.x - 4} y={q.y - 10} textAnchor="end" fill={p.ink} fontSize="12" fontWeight="700">{q.value}{unit}</text>
            ) : null}
            <text x={q.x} y={H - 8} textAnchor="middle" fill={p.text} fontSize="9.5" fontWeight="600">{String(q.label).slice(0, 10)}</text>
          </g>
        ))}
      </svg>
      <span className="stage-glare" aria-hidden />
    </div>
  );
}

/** Tilted holographic stat tile with an animated counter-friendly value slot. */
export function HoloTile({ label, value, sub, icon: Icon, tone = 'brand', className }) {
  return (
    <div className={cn('tilt-card relative overflow-hidden rounded-2xl border border-line bg-surface2/60 p-3.5', className)}>
      <div className={cn('pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl',
        tone === 'ok' ? 'bg-ok/15' : tone === 'warn' ? 'bg-warn/15' : tone === 'accent' ? 'bg-accent/15' : 'bg-brand/15')} aria-hidden />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="muted text-[10px] font-bold uppercase tracking-[0.14em]">{label}</div>
          <div className="mt-1 font-display text-xl font-bold tabular-nums">{value}</div>
          {sub ? <div className="muted mt-0.5 truncate text-[10.5px]">{sub}</div> : null}
        </div>
        {Icon ? <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-xl border',
          tone === 'ok' ? 'border-ok/30 bg-ok/10 text-ok' : tone === 'warn' ? 'border-warn/30 bg-warn/10 text-warn' : tone === 'accent' ? 'border-accent/30 bg-accent/10 text-accent' : 'border-brand/30 bg-brand/10 text-brand')}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span> : null}
      </div>
      <span className="scanline" aria-hidden />
    </div>
  );
}

/**
 * IsoRadar — a 3D-tilted radar ("spider") chart in the same isometric family:
 * the floor grid stays on the stage plane (squashed vertically) while each series
 * polygon floats above it at its own height, with dashed drop-lines to the floor.
 * series: [{ name, color (palette key|hex), values[], dash? }]
 */
export function IsoRadar({ axes = [], series = [], height = 250, max = 100, unit = '', className }) {
  const p = useChartPalette();
  const uid = useId().replace(/:/g, '');
  const W = 560;
  const H = height;
  const cx = W / 2;
  const cy = H / 2 + 8;
  const R = Math.min(W / 2 - 70, H / 2 - 34);
  const SQUASH = 0.52;
  const n = Math.max(3, axes.length);
  const pt = (i, r, z = 0) => {
    const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * SQUASH - z };
  };
  const ring = (frac) => axes.map((_, i) => { const q = pt(i, R * frac); return `${q.x},${q.y}`; }).join(' ');
  return (
    <div className={cn('stage3d', className)} style={{ height: H + 16 }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="radar-in h-full w-full" role="img"
        aria-label={`radar: ${axes.map((a) => a.label).join(', ')} — ${series.map((s) => `${s.name}: ${s.values.map((v) => Math.round(v)).join('/')}${unit}`).join(' | ')}`}>
        <defs>
          <radialGradient id={`rf-${uid}`} cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor={p.brand} stopOpacity="0.10" />
            <stop offset="100%" stopColor={p.brand} stopOpacity="0" />
          </radialGradient>
        </defs>
        <polygon points={ring(1)} fill={`url(#rf-${uid})`} stroke="none" />
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ring(f)} fill="none" stroke={p.grid} strokeWidth="1" strokeOpacity={f === 1 ? 0.95 : 0.55} />
        ))}
        {axes.map((a, i) => {
          const o = pt(i, R);
          const l = pt(i, R + 22);
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={o.x} y2={o.y} stroke={p.grid} strokeWidth="1" strokeOpacity="0.55" />
              <text x={l.x} y={l.y + 3} fontSize="10" fontWeight="700" fill={p.text}
                textAnchor={Math.abs(l.x - cx) < 14 ? 'middle' : l.x > cx ? 'start' : 'end'}>{a.label}</text>
            </g>
          );
        })}
        {series.map((s, si) => {
          const c = p[s.color] || s.color || p.brand;
          const z = 12 + si * 14;
          const vals = s.values.map((v) => clamp(Number(v) || 0, 0, max));
          const pts = vals.map((v, i) => pt(i, (R * v) / max, z));
          const poly = pts.map((q) => `${q.x},${q.y}`).join(' ');
          return (
            <g key={si} className="radar-series" style={{ animationDelay: `${si * 140}ms` }}>
              {pts.map((q, i) => {
                const b = pt(i, (R * vals[i]) / max, 0);
                return <line key={i} x1={q.x} y1={q.y} x2={b.x} y2={b.y} stroke={c} strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 3" />;
              })}
              <polygon points={poly} fill={c} fillOpacity="0.20" stroke={c} strokeWidth="2.2"
                strokeDasharray={s.dash ? '7 4' : undefined} strokeLinejoin="round" />
              {pts.map((q, i) => <circle key={`d${i}`} cx={q.x} cy={q.y} r="3" fill={p.surface} stroke={c} strokeWidth="2" />)}
            </g>
          );
        })}
      </svg>
      <span className="stage-glare" aria-hidden />
    </div>
  );
}

/**
 * FlipTile — a stat card that flips in 3D on hover / keyboard focus to reveal
 * the note behind it. Pure CSS 3D (see .flip3d in index.css).
 */
export function FlipTile({ label, value, tone = 'brand', back, className }) {
  const ring = tone === 'ok' ? 'border-ok/30 text-ok' : tone === 'warn' ? 'border-warn/30 text-warn' : tone === 'muted' ? 'border-line text-muted' : 'border-brand/30 text-brand';
  return (
    <div className={cn('flip3d', className)} tabIndex={0} role="group" aria-label={`${label}: ${value}${back ? ` — ${back}` : ''}`}>
      <div className="flip3d-inner">
        <div className={cn('flip-face flex h-full min-h-[96px] flex-col justify-between rounded-xl border bg-surface2/60 p-2.5', ring)}>
          <span className="muted text-[9.5px] font-bold uppercase tracking-[0.14em]">{label}</span>
          <span className="font-display text-2xl font-bold tabular-nums text-ink">{value}</span>
          <span className="muted text-[9px] font-semibold uppercase tracking-wider">↻ flip</span>
        </div>
        <div className="flip-face flip-back flex min-h-[96px] items-center rounded-xl border border-line bg-surface p-2.5">
          <span className="text-[10.5px] leading-snug text-ink">{back}</span>
        </div>
      </div>
    </div>
  );
}

export default { IsoBarChart, IsoLineRibbon, HoloTile, IsoRadar, FlipTile };

