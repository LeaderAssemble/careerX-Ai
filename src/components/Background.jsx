import { useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

/**
 * Ambient background: soft gradient orbs + blueprint grid + a light "AI particle"
 * network. The particle canvas is deliberately cheap (≤34 nodes, no shadow blur,
 * paused when the tab is hidden, disabled for reduced-motion and small screens)
 * because performance outranks decoration in this product.
 */
export function AIParticles({ count = 34, className }) {
  const ref = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const small = window.innerWidth < 720;
    if (reduce || small) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const nodes = Array.from({ length: count }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00035, vy: (Math.random() - 0.5) * 0.00035,
      r: 0.7 + Math.random() * 1.5,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const stroke = isDark ? '129,140,248' : '79,70,229';
      nodes.forEach((n) => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      });
      // links
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i]; const b = nodes[j];
          const dx = (a.x - b.x) * w; const dy = (a.y - b.y) * h;
          const dist = Math.hypot(dx, dy);
          if (dist < 132) {
            ctx.strokeStyle = `rgba(${stroke},${(1 - dist / 132) * (isDark ? 0.2 : 0.14)})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }
      nodes.forEach((n) => {
        ctx.fillStyle = `rgba(${stroke},${isDark ? 0.55 : 0.4})`;
        ctx.beginPath();
        ctx.arc(n.x * w, n.y * h, n.r, 0, Math.PI * 2);
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };

    const onVis = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (!raf) raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [count, isDark]);

  return <canvas ref={ref} className={cn('pointer-events-none absolute inset-0 h-full w-full', className)} aria-hidden="true" />;
}

export default function Background({ particles = true, className }) {
  const { isDark } = useTheme();
  return (
    <div aria-hidden="true" className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}>
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div
        className="absolute -left-32 -top-40 h-[30rem] w-[30rem] rounded-full blur-[110px] animate-float"
        style={{ background: isDark ? 'rgba(99,102,241,0.20)' : 'rgba(99,102,241,0.16)' }}
      />
      <div
        className="absolute -right-24 top-10 h-[26rem] w-[26rem] rounded-full blur-[120px] animate-float"
        style={{ background: isDark ? 'rgba(34,211,238,0.13)' : 'rgba(8,145,178,0.12)', animationDelay: '1.6s' }}
      />
      <div
        className="absolute bottom-[-14rem] left-1/3 h-[28rem] w-[28rem] rounded-full blur-[130px] animate-float"
        style={{ background: isDark ? 'rgba(167,139,250,0.13)' : 'rgba(139,92,246,0.10)', animationDelay: '3.1s' }}
      />
      {particles ? <AIParticles /> : null}
    </div>
  );
}

/** Localised glow used behind hero cards (cheap, no canvas). */
export function GlowOrb({ className, tone = 'brand' }) {
  const tones = {
    brand: 'rgba(99,102,241,0.28)',
    accent: 'rgba(34,211,238,0.22)',
    violet: 'rgba(167,139,250,0.24)',
  };
  return (
    <span aria-hidden="true" className={cn('pointer-events-none absolute rounded-full blur-[70px]', className)} style={{ background: tones[tone] }} />
  );
}
