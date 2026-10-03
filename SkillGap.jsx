import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Target, Check, Clock, BookOpen, ExternalLink, ArrowRight, Filter, ChevronDown,
  TrendingUp, Sparkles, AlertTriangle,
} from 'lucide-react';
import { IsoBarChart, HoloTile } from '../../components/ui/Charts3D';
import { SKILL_BY_ID } from '../../data/catalog';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import { PageHeader, Card, Badge, Button, Chip, Meter, ProgressRing, EmptyState, DemoTag, Segmented } from '../../components/ui/primitives';
import { NeedsProfile, DemoNotice, SkillLevelPicker, AILabel } from '../../components/app/parts';
import { gapsByCategory } from '../../services/careerService';
import { SKILL_CATEGORIES } from '../../data/catalog';
import { cn, sum } from '../../lib/utils';

const STATUS_META = {
  met: { tone: 'ok', key: 'gap.strong' },
  partial: { tone: 'warn', key: 'gap.partial' },
  missing: { tone: 'bad', key: 'gap.missing' },
};

export default function SkillGap() {
  const { t, L } = useI18n();
  const { gaps, activeCareer, derived, profile, closeGap, updateProgress, progress } = useApp();
  const [view, setView] = useState('open'); // open | all
  const [cat, setCat] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const groups = useMemo(() => gapsByCategory(gaps), [gaps]);
  const open = gaps.filter((g) => g.status !== 'met');
  const hours = sum(open.map((g) => g.hours));
  const coverage = derived ? Math.round((gaps.filter((g) => g.status === 'met').length / Math.max(gaps.length, 1)) * 100) : 0;

  if (!derived || !profile) return <NeedsProfile />;

  const roleName = activeCareer ? L(activeCareer.n) : L(['your target role', 'आपकी लक्षित भूमिका']);
  const list = (view === 'open' ? open : gaps).filter((g) => cat === 'all' || g.category === cat);

  /** Self-reported level change — the honest source of truth for skill scores. */
  const selfRate = (gap, level) => {
    updateProgress((p) => {
      const next = { ...(p.skillUpdates || {}) };
      if (level > 0) next[gap.id] = level;
      else delete next[gap.id];
      return { ...p, skillUpdates: next };
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><Target className="h-3 w-3" aria-hidden />{t('nav.skillgap')}</>}
        title={t('gap.title')}
        sub={t('gap.sub', { role: roleName })}
        tags={[<AILabel key="ai" />, <Badge key="s" tone="muted">{t('gap.summary', { n: open.length, m: gaps.length - open.length })}</Badge>]}
        actions={<Button size="sm" variant="ghost" to="/app/courses" iconRight={ArrowRight}>{t('nav.courses')}</Button>}
      />

      {/* 3D you-vs-required view */}
      <Card className="relative overflow-hidden">
        <span className="scanline" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-[14px] font-bold">{L(['Your level vs required — 3D', 'आपका स्तर बनाम अपेक्षित — 3D'])}</h2>
          <Badge tone="muted">{L(['Top open gaps', 'शीर्ष खुले गैप'])}</Badge>
        </div>
        <IsoBarChart
          className="relative mt-2" height={225} max={100} depth={13}
          compareLabel={L(['Required level', 'अपेक्षित स्तर'])}
          data={open.slice(0, 6).map((g, i) => ({
            label: L(SKILL_BY_ID[g.id]?.n || [g.id, g.id]),
            value: Math.round(((g.current || 0) / 4) * 100),
            compare: Math.round(((g.required || 0) / 4) * 100),
            color: ['brand', 'accent', 'ok', 'warn', 'brand2'][i % 5],
          }))}
        />
        <div className="relative mt-2 grid grid-cols-3 gap-2">
          <HoloTile label={L(['Open gaps', 'खुले गैप'])} value={open.length} icon={AlertTriangle} tone="warn" />
          <HoloTile label={L(['Met', 'पूरे'])} value={gaps.length - open.length} icon={Check} tone="ok" />
          <HoloTile label={L(['Est. hours to close', 'बंद करने हेतु अनु. घंटे'])} value={`${hours}h`} icon={Clock} tone="accent" />
        </div>
          <p className="muted relative mt-2 text-[10.5px] leading-snug">{L(['Solid = your current level · dashed = level expected by the target role. Scores use self-ratings and course completions.', 'ठोस = आपका वर्तमान स्तर · डैश्ड = लक्षित रोल का अपेक्षित स्तर। स्कोर स्व-मूल्यांकन और कोर्स पूर्णता पर आधारित हैं।'])}</p>
      </Card>

      {/* summary strip */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card grad className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand/10 blur-3xl" aria-hidden />
          <div className="relative flex items-center gap-4">
            <ProgressRing value={coverage} size={96} stroke={9} tone={coverage >= 60 ? 'ok' : coverage >= 35 ? 'brand' : 'warn'} label={`${coverage}%`} />
            <div className="min-w-0">
              <h2 className="font-display text-[14px] font-bold">{t('gap.current')}</h2>
              <p className="muted mt-1 text-[12px] leading-snug">{L([`${gaps.length} required skills for ${roleName}`, `${roleName} के लिए ${gaps.length} आवश्यक कौशल`])}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="ok">{gaps.filter((g) => g.status === 'met').length} {t('gap.strong')}</Badge>
                <Badge tone="warn">{gaps.filter((g) => g.status === 'partial').length} {t('gap.partial')}</Badge>
                <Badge tone="bad">{gaps.filter((g) => g.status === 'missing').length} {t('gap.missing')}</Badge>
              </div>
            </div>
          </div>
          <div className="relative mt-4 rounded-xl border border-line bg-surface2/60 p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-warn" aria-hidden />
              <span className="text-[12px] font-semibold">{t('gap.estTime')}</span>
              <span className="ml-auto font-display text-sm font-bold tabular-nums">{hours}h</span>
            </div>
            <p className="muted mt-1.5 text-[11px] leading-snug">
              {L([`Roughly ${Math.max(1, Math.round(hours / 8))} focused study days, or ${Math.max(1, Math.round(hours / 5))} weeks at 5 hours a week.`,
                `लगभग ${Math.max(1, Math.round(hours / 8))} पूरे अध्ययन दिन, या सप्ताह में 5 घंटे से ${Math.max(1, Math.round(hours / 5))} सप्ताह।`])}
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-[14px] font-bold">{L(['Gap pressure by category', 'श्रेणी अनुसार गैप दबाव'])}</h2>
          <p className="muted mt-1 text-[12px]">{L(['Weighted priority — how much each category is holding your match score back.', 'भारित प्राथमिकता — प्रत्येक श्रेणी आपके मैच स्कोर को कितना रोक रही है।'])}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(groups).map(([key, arr]) => {
              const pressure = sum(arr.map((g) => g.priority));
              const openCount = arr.filter((g) => g.status !== 'met').length;
              const max = 24;
              return (
                <button
                  key={key} type="button" onClick={() => setCat(cat === key ? 'all' : key)} aria-pressed={cat === key}
                  className={cn('rounded-xl border p-3 text-left transition hover:border-brand/40', cat === key ? 'border-brand/50 bg-brand/[0.07]' : 'border-line bg-surface2/40')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-semibold">{t(`gap.${key}`) || L(SKILL_CATEGORIES[key])}</span>
                    <span className="muted text-[10.5px] font-bold tabular-nums">{openCount}/{arr.length}</span>
                  </div>
                  <Meter className="mt-2" value={Math.min(100, (pressure / max) * 100)} size="xs" tone={pressure > 12 ? 'bad' : pressure > 6 ? 'warn' : 'ok'} />
                  <div className="muted mt-1.5 text-[10.5px]">{L([`${arr.length} skills · priority ${pressure.toFixed(1)}`, `${arr.length} कौशल · प्राथमिकता ${pressure.toFixed(1)}`])}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <Filter className="h-3.5 w-3.5 text-muted" aria-hidden />
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'open', label: L([`Open gaps (${open.length})`, `खुले गैप (${open.length})`]) },
                { value: 'all', label: L([`All skills (${gaps.length})`, `सभी कौशल (${gaps.length})`]) },
              ]}
            />
            {cat !== 'all' ? (
              <Button size="sm" variant="quiet" onClick={() => setCat('all')}>{t('common.clear')}</Button>
            ) : null}
          </div>
        </Card>
      </div>

      {!open.length ? (
        <EmptyState
          icon={Check}
          title={t('gap.allGood', { role: roleName })}
          body={L(['Your levels meet or exceed every weighted requirement. Add projects and interview practice to convert that into offers.',
            'आपका स्तर हर भारित आवश्यकता को पूरा करता है। अब प्रोजेक्ट और इंटरव्यू अभ्यास से इसे ऑफ़र में बदलें।'])}
          action={<Button to="/app/project-lab" iconRight={ArrowRight}>{t('nav.lab')}</Button>}
        />
      ) : null}

      {/* gap list */}
      <ul className="space-y-3">
        {list.map((g) => {
          const meta = STATUS_META[g.status];
          const isOpen = expanded === g.id;
          const course = g.courses?.[0] || null;
          const saved = (progress.savedCourses || []).some((c) => c.id === course?.id);
          return (
            <li key={g.id}>
              <Card className={cn('transition', g.status === 'met' && 'opacity-90', isOpen && 'border-brand/35')}>
                <div className="flex flex-wrap items-start gap-3">
                  <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl border',
                    g.status === 'met' ? 'border-ok/30 bg-ok/10 text-ok' : g.status === 'partial' ? 'border-warn/30 bg-warn/10 text-warn' : 'border-bad/30 bg-bad/10 text-bad')}>
                    {g.status === 'met' ? <Check className="h-4 w-4" aria-hidden /> : <AlertTriangle className="h-4 w-4" aria-hidden />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-[14px] font-bold">{L(g.skill.n)}</h3>
                      <Badge tone={meta.tone}>{t(meta.key)}</Badge>
                      <Badge tone="muted">{L([`weight ${g.weight}`, `भार ${g.weight}`])}</Badge>
                      {g.status !== 'met' ? <Badge tone="warn" icon={Clock}>{g.hours}h</Badge> : null}
                    </div>
                    <p className="muted mt-1 text-[12px] leading-snug">{L(g.why)}</p>

                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                      <Meter label={L(['Your level', 'आपका स्तर'])} value={(g.current / 4) * 100} size="xs"
                        tone={g.status === 'met' ? 'ok' : g.status === 'partial' ? 'warn' : 'bad'}
                        right={`${Math.round((g.current / 4) * 100)}%`} />
                      <Meter label={L(['Expected level', 'अपेक्षित स्तर'])} value={(g.required / 4) * 100} size="xs" tone="brand"
                        right={`${Math.round((g.required / 4) * 100)}%`} />
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {g.status !== 'met' && course ? (
                      <Button size="sm" icon={saved ? Check : BookOpen} variant={saved ? 'ok' : 'primary'} onClick={() => closeGap(g, course)}>
                        {saved ? t('gap.closed') : t('gap.closeGap')}
                      </Button>
                    ) : null}
                    <Button size="sm" variant="quiet" onClick={() => setExpanded(isOpen ? null : g.id)} iconRight={ChevronDown}
                      className={cn(isOpen && '[&>svg]:rotate-180')}>
                      {isOpen ? t('common.close') : t('common.learnMore')}
                    </Button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="mt-4 space-y-4 border-t border-line pt-4">
                    <div>
                      <div className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Update your self-rating', 'अपनी स्व-रेटिंग अपडेट करें'])}</div>
                      <div className="flex flex-wrap items-center gap-3">
                        <SkillLevelPicker value={g.current} onChange={(lvl) => selfRate(g, lvl)} />
                        <span className="muted text-[11px]">{L(['Scores recalculate instantly.', 'स्कोर तुरंत दोबारा गिने जाते हैं।'])}</span>
                      </div>
                    </div>

                    {g.courses?.length ? (
                      <div>
                        <div className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Courses that close this gap', 'यह गैप भरने वाले कोर्स'])}</div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {g.courses.map((c) => (
                            <div key={c.id} className="rounded-xl border border-line bg-surface2/40 p-2.5">
                              <div className="text-[12px] font-semibold leading-snug">{L(c.t)}</div>
                              <div className="muted mt-1 text-[10.5px]">{c.provider} · {c.weeks} {t('common.weeks')} · {c.hrs}h</div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                <Badge tone={c.free ? 'ok' : 'warn'}>{c.free ? t('common.free') : t('common.paid')}</Badge>
                                {c.cert ? <Badge tone="brand">{t('common.certificate')}</Badge> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {g.resources?.length ? (
                      <div>
                        <div className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{t('gap.resources')}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {g.resources.map((r) => (
                            <a key={r[1]} href={`https://${r[1]}`} target="_blank" rel="noreferrer noopener"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface2/60 px-2.5 py-1.5 text-[11.5px] font-medium transition hover:border-brand/50 hover:text-brand">
                              {r[0]}<ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          ))}
                        </div>
                        <p className="muted mt-2 text-[10.5px]">{L(['External links open in a new tab. CareerX is not affiliated with these providers.', 'बाहरी लिंक नए टैब में खुलते हैं। CareerX इन प्रदाताओं से संबद्ध नहीं है।'])}</p>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2">
                      <Chip className="border-brand/30 bg-brand/10 text-brand"><TrendingUp className="h-3 w-3" aria-hidden />{L([`Priority ${g.priority.toFixed(1)}`, `प्राथमिकता ${g.priority.toFixed(1)}`])}</Chip>
                      <Chip>{L([`Difficulty ${g.difficulty}/3`, `कठिनाई ${g.difficulty}/3`])}</Chip>
                      <Link to="/app/project-lab" className="muted ml-auto text-[11px] font-semibold hover:text-brand">{L(['Practise in Project Lab', 'प्रोजेक्ट लैब में अभ्यास करें'])}</Link>
                    </div>
                  </div>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>

      {!list.length ? (
        <EmptyState
          icon={Filter}
          title={t('common.noResults')}
          body={L(['No skills match this filter combination.', 'इस फ़िल्टर संयोजन से कोई कौशल मेल नहीं खाता।'])}
          action={<Button size="sm" variant="ghost" onClick={() => { setCat('all'); setView('all'); }}>{t('common.clear')}</Button>}
        />
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <div>
              <h2 className="font-display text-[13.5px] font-bold">{L(['How expected levels are decided', 'अपेक्षित स्तर कैसे तय होते हैं'])}</h2>
              <p className="muted mt-1 max-w-2xl text-[12px] leading-relaxed">
                {L(['Each career lists its skills with a weight of 1–3. Weight 3 expects level 3.5 of 4, weight 2 expects level 3, weight 1 expects level 2. Your self-rating plus course completions feed the same number everywhere in the app.',
                  'प्रत्येक करियर अपने कौशल को 1–3 भार देता है। भार 3 के लिए 4 में से 3.5 स्तर, भार 2 के लिए 3, भार 1 के लिए 2 स्तर अपेक्षित है। आपकी स्व-रेटिंग और कोर्स पूर्णता ऐप में हर जगह एक ही संख्या बनाते हैं।'])}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" to="/app/profile">{L(['Edit skill ratings', 'कौशल रेटिंग बदलें'])}</Button>
            <Button size="sm" variant="quiet" to="/app/roadmap">{t('nav.roadmap')}</Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <DemoTag />
          <span className="muted text-[10.5px]">{t('common.methodNote')}</span>
        </div>
      </Card>
    </div>
  );
}
