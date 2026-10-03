import { useMemo } from 'react';
import {
  ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Bar, BarChart, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/utils';

/**
 * Chart components (Recharts) with a theme-aware palette.
 * Colours are concrete hex values rather than CSS variables because SVG presentation
 * attributes do not resolve var(); the palette follows the active theme instead.
 */
export function useChartPalette() {
  const { isDark } = useTheme();
  return useMemo(() => (isDark ? {
    brand: '#818cf8', brand2: '#a78bfa', accent: '#22d3ee', ok: '#34d399', warn: '#fbbf24', bad: '#f87171',
    grid: '#2b3459', text: '#9aa5c4', ink: '#e9eefc', fill: 'rgba(129,140,248,0.28)', surface: '#0f1429',
  } : {
    brand: '#4f46e5', brand2: '#8b5cf6', accent: '#0891b2', ok: '#059669', warn: '#b47808', bad: '#dc2626',
    grid: '#dfe6f3', text: '#5c6a85', ink: '#0f172a', fill: 'rgba(79,70,229,0.18)', surface: '#ffffff',
  }), [isDark]);
}

function ChartTooltip({ active, payload, label, p }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface/95 px-2.5 py-1.5 text-[11px] shadow-lift backdrop-blur">
      {label != null ? <div className="mb-1 font-semibold text-ink">{label}</div> : null}
      {payload.map((x) => (
        <div key={x.dataKey || x.name} className="flex items-center gap-1.5 text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: x.color || x.fill || p.brand }} />
          <span>{x.name}</span>
          <span className="ml-auto font-bold tabular-nums text-ink">{typeof x.value === 'number' ? Math.round(x.value) : x.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Skill DNA radar — the student's 7-axis capability fingerprint. */
export function SkillDNA({ data = [], target = [], height = 300, className }) {
  const p = useChartPalette();
  const { L } = useI18n();
  const chartData = data.map((d, i) => ({ axis: L(d.axis), you: d.value, target: target[i]?.value ?? null }));
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} outerRadius="72%">
          <PolarGrid stroke={p.grid} />
          <PolarAngleAxis dataKey="axis" tick={{ fill: p.text, fontSize: 10.5, fontWeight: 600 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: p.text, fontSize: 9 }} axisLine={false} tickCount={5} />
          {target.length ? (
            <Radar name="Target" dataKey="target" stroke={p.accent} fill={p.accent} fillOpacity={0.12} strokeDasharray="4 4" />
          ) : null}
          <Radar name="You" dataKey="you" stroke={p.brand} fill={p.brand} fillOpacity={0.32} strokeWidth={2} />
          <RTooltip content={<ChartTooltip p={p} />} />
          {target.length ? <Legend wrapperStyle={{ fontSize: 11, color: p.text }} /> : null}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Readiness / progress trend (area). */
export function TrendChart({ data = [], xKey = 'label', series = [{ key: 'value', name: 'Score', color: 'brand' }], height = 240, yDomain = [0, 100], className }) {
  const p = useChartPalette();
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`grad-${i}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={p[s.color] || p.brand} stopOpacity={0.42} />
                <stop offset="100%" stopColor={p[s.color] || p.brand} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={p.grid} vertical={false} strokeDasharray="3 6" />
          <XAxis dataKey={xKey} tick={{ fill: p.text, fontSize: 10.5 }} axisLine={false} tickLine={false} />
          <YAxis domain={yDomain} tick={{ fill: p.text, fontSize: 10.5 }} axisLine={false} tickLine={false} width={44} />
          <RTooltip content={<ChartTooltip p={p} />} />
          {series.map((s, i) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={p[s.color] || p.brand} strokeWidth={2.4}
              fill={`url(#grad-${i}-${s.key})`} dot={{ r: 2.5, fill: p[s.color] || p.brand, strokeWidth: 0 }} activeDot={{ r: 4.5 }} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bar list — used for admin analytics (skill gaps, career paths). */
export function BarListChart({ data = [], xKey = 'name', yKey = 'value', height = 260, color = 'brand', unit = '', className, horizontal = true }) {
  const p = useChartPalette();
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 6, right: 16, left: horizontal ? 8 : -18, bottom: 0 }}>
          <CartesianGrid stroke={p.grid} horizontal={!horizontal} vertical={horizontal} strokeDasharray="3 6" />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fill: p.text, fontSize: 10.5 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey={xKey} width={118} tick={{ fill: p.text, fontSize: 10.5 }} axisLine={false} tickLine={false} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={{ fill: p.text, fontSize: 10.5 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: p.text, fontSize: 10.5 }} axisLine={false} tickLine={false} width={44} />
            </>
          )}
          <RTooltip content={<ChartTooltip p={p} />} cursor={{ fill: 'rgba(129,140,248,0.07)' }} />
          <Bar dataKey={yKey} name={unit || 'Value'} radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} barSize={horizontal ? 14 : 26}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color ? p[entry.color] || entry.color : p[color]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut used for distributions (e.g. readiness bands). */
export function DonutChart({ data = [], height = 220, innerLabel, className, colors = ['ok', 'brand', 'accent', 'warn', 'bad'] }) {
  const p = useChartPalette();
  return (
    <div className={cn('relative w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="none">
            {data.map((entry, i) => <Cell key={i} fill={entry.color ? p[entry.color] || entry.color : p[colors[i % colors.length]]} />)}
          </Pie>
          <RTooltip content={<ChartTooltip p={p} />} />
          <Legend wrapperStyle={{ fontSize: 11, color: p.text }} iconType="circle" iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
      {innerLabel ? (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center">
          <div className="font-display text-xl font-bold tabular-nums text-ink">{innerLabel}</div>
        </div>
      ) : null}
    </div>
  );
}

/** Lightweight dimension bars (no chart lib) — interview feedback, score breakdowns. */
export function DimensionBars({ items = [], className }) {
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((it) => (
        <li key={it.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="text-xs font-semibold text-ink">{it.label}</span>
            <span className="muted text-[11px] font-bold tabular-nums">{Math.round(it.value)}{it.max && it.max !== 100 ? `/${it.max}` : ''}</span>
          </div>
          <div className="skillbar">
            <span style={{
              width: `${Math.min(100, (it.value / (it.max || 100)) * 100)}%`,
              backgroundImage: it.tone === 'bad' ? 'linear-gradient(90deg,#f87171,#fbbf24)'
                : it.tone === 'warn' ? 'linear-gradient(90deg,#fbbf24,#a78bfa)'
                : 'linear-gradient(90deg,rgb(var(--c-brand-soft)),rgb(var(--c-accent)))',
              transition: 'width .9s cubic-bezier(.22,1,.36,1)',
            }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default { SkillDNA, TrendChart, BarListChart, DonutChart, DimensionBars };
