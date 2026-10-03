import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, Search, X, MapPin, Filter, ArrowRight, Check, Loader2, Send, Sparkles, Clock,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import {
  PageHeader, Card, Badge, Button, Chip, Input, Select, Segmented, Meter,
  EmptyState, CardSkeleton, DemoTag,
} from '../../components/ui/primitives';
import { OpportunityCard, NeedsProfile, DemoNotice, EmptyResults } from '../../components/app/parts';
import { getOpportunities, rankOpportunities, filterOpportunities, locationFacets, roleFacets, skillFacets } from '../../services/jobService';
import { cn, useRevealGroup, relativeTime } from '../../lib/utils';

const MIN_MATCH = [
  { value: 0, label: ['Any match', 'कोई भी मैच'] },
  { value: 40, label: ['40%+', '40%+'] },
  { value: 60, label: ['60%+', '60%+'] },
  { value: 75, label: ['75%+', '75%+'] },
];

export default function Opportunities({ type = 'job' }) {
  const { t, L, lang } = useI18n();
  const { derived, profile, progress } = useApp();

  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [location, setLocation] = useState('all');
  const [role, setRole] = useState('all');
  const [skill, setSkill] = useState('all');
  const [mode, setMode] = useState('all');
  const [minMatch, setMinMatch] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getOpportunities({ type, simulate: true, profile })
      .then((rows) => { if (alive) setList(rows); })
      .catch((e) => { if (alive) setError(String(e?.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [type, profile]);

  const ranked = useMemo(() => {
    if (!list || !derived) return [];
    return rankOpportunities(list, { skillMap: derived.skillMap, profile, derived });
  }, [list, derived, profile]);

  const filtered = useMemo(
    () => filterOpportunities(ranked, { q, location, role, skill, mode, minMatch }),
    [ranked, q, location, role, skill, mode, minMatch]
  );

  const gridRef = useRevealGroup([filtered.length, loading]);
  const applied = useMemo(() => new Map((progress.applications || []).map((a) => [a.id, a])), [progress.applications]);
  const locations = useMemo(() => locationFacets(ranked), [ranked]);
  const roles = useMemo(() => roleFacets(ranked), [ranked]);
  const skills = useMemo(() => skillFacets(ranked), [skills0(ranked)]);
  const portalSearches = type === 'internship'
    ? [
      { name: 'Unstop', url: 'https://unstop.com/internships' },
      { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs/search/?keywords=internship&location=India' },
      { name: 'Naukri.com', url: 'https://www.naukri.com/internship-jobs-in-india' },
    ]
    : [
      { name: 'Unstop', url: 'https://unstop.com/jobs' },
      { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs/search/?keywords=fresher%20jobs&location=India' },
      { name: 'Naukri.com', url: 'https://www.naukri.com/fresher-jobs-in-india' },
    ];

  if (!derived || !profile) return <NeedsProfile />;

  const activeFilters = [location !== 'all', role !== 'all', skill !== 'all', mode !== 'all', minMatch > 0, !!q].filter(Boolean).length;
  const clearAll = () => { setQ(''); setLocation('all'); setRole('all'); setSkill('all'); setMode('all'); setMinMatch(0); };
  const avgMatch = filtered.length ? Math.round(filtered.reduce((a, o) => a + o.match, 0) / filtered.length) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><Briefcase className="h-3 w-3" aria-hidden />{type === 'internship' ? t('nav.internships') : t('nav.jobs')}</>}
        title={t('job.title')}
        sub={t('job.sub')}
        tags={[
          <Badge key="n" tone="muted">{loading ? t('common.loading') : `${filtered.length} ${t('common.results')}`}</Badge>,
          avgMatch ? <Badge key="m" tone="brand" icon={Sparkles}>{L([`Average match ${avgMatch}%`, `औसत मैच ${avgMatch}%`])}</Badge> : null,
          <DemoTag key="d" />,
        ]}
        actions={
          <div className="flex overflow-hidden rounded-lg border border-line">
            {[{ to: '/app/jobs', k: 'job', label: t('job.tabJobs') }, { to: '/app/internships', k: 'internship', label: t('job.tabIntern') }].map((x) => (
              <Link key={x.k} to={x.to}
                className={cn('px-3 py-1.5 text-[12px] font-bold transition', type === x.k ? 'bg-brand/15 text-brand' : 'text-muted hover:bg-surface2 hover:text-ink')}
                aria-current={type === x.k ? 'page' : undefined}>
                {x.label}
              </Link>
            ))}
          </div>
        }
      />

      <DemoNotice>{t('job.demoBanner')}</DemoNotice>

      <Card className="p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-[14px] font-bold">{L(['Browse live listings', 'नौकरी की लाइव लिस्टिंग देखें'])}</h2>
            <p className="muted mt-0.5 text-[11px]">{L(['Search current openings on these job platforms.', 'इन जॉब प्लेटफ़ॉर्म पर मौजूदा अवसर खोजें।'])}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {portalSearches.map((portal) => (
              <a key={portal.name} href={portal.url} target="_blank" rel="noreferrer noopener" className="btn btn-ghost btn-sm">
                {portal.name}<ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4">
          <Card className="p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
                <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L(['Search role, company or skill…', 'रोल, कंपनी या कौशल खोजें…'])} aria-label={t('common.search')} />
                {q ? (
                  <button type="button" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink" aria-label={t('common.clear')}>
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>
              <Select value={location} onChange={(e) => setLocation(e.target.value)} aria-label={t('job.filterLoc')} className="w-auto min-w-[150px]">
                <option value="all">{t('job.filterLoc')}: {t('common.all')}</option>
                {locations.map((l) => <option key={l.value} value={l.value}>{L(l.label)}</option>)}
              </Select>
              <Select value={role} onChange={(e) => setRole(e.target.value)} aria-label={t('job.filterRole')} className="w-auto min-w-[140px]">
                <option value="all">{t('job.filterRole')}: {t('common.all')}</option>
                {roles.map((r) => <option key={r.label} value={r.label}>{r.label} ({r.n})</option>)}
              </Select>
              <Select value={mode} onChange={(e) => setMode(e.target.value)} aria-label={t('job.filterMode')} className="w-auto min-w-[130px]">
                <option value="all">{t('job.filterMode')}: {t('common.all')}</option>
                <option value="remote">{t('common.remote')}</option>
                <option value="hybrid">{t('common.hybrid')}</option>
                <option value="onsite">{t('common.onsite')}</option>
              </Select>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <span className="muted text-[11px] font-bold uppercase tracking-wider">{t('job.filterSkills')}</span>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <Chip key={s.id} active={skill === s.id} onClick={() => setSkill(skill === s.id ? 'all' : s.id)}>
                    {L(s.label)} <span className="opacity-60">{s.n}</span>
                  </Chip>
                ))}
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Segmented value={minMatch} onChange={setMinMatch} options={MIN_MATCH.map((m) => ({ value: m.value, label: L(m.label) }))} />
                {activeFilters ? <Button size="sm" variant="quiet" icon={X} onClick={clearAll}>{t('common.clear')} ({activeFilters})</Button> : null}
              </div>
            </div>
          </Card>

          {error ? (
            <EmptyState icon={X} title={t('err.generic')} body={error} action={<Button size="sm" onClick={() => window.location.reload()}>{t('common.tryAgain')}</Button>} />
          ) : loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} lines={5} />)}
            </div>
          ) : filtered.length ? (
            <div ref={gridRef} className="grid gap-4 sm:grid-cols-2">
              {filtered.map((opp, i) => (
                <OpportunityCard key={opp.id} opp={opp} index={i} />
              ))}
            </div>
          ) : (
            <EmptyResults title={t('job.empty')} body={t('job.emptyHint')} onClear={clearAll} clearLabel={t('job.clearFilters')} />
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-[15px] font-bold">{t('job.applications')}</h2>
              <Badge tone={applied.size ? 'ok' : 'muted'}>{applied.size}</Badge>
            </div>
            {applied.size ? (
              <>
                <Meter className="mt-3" value={Math.min(100, applied.size * 20)} size="sm" tone="ok"
                  label={L(['Towards a 5-application week', 'सप्ताह में 5 आवेदन के लक्ष्य की ओर'])} right={`${applied.size}/5`} />
                <ul className="mt-3 space-y-2">
                  {[...(progress.applications || [])].reverse().slice(0, 6).map((a) => {
                    const opp = list?.find((o) => o.id === a.id);
                    return (
                      <li key={a.id} className="rounded-xl border border-line bg-surface2/40 p-2.5">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded bg-ok/15 text-ok"><Check className="h-3 w-3" aria-hidden /></span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] font-semibold">{opp ? L(opp.t) : a.id}</div>
                            <div className="muted truncate text-[10.5px]">{opp ? L(opp.co) : ''} · {relativeTime(a.at, lang === 'hi' ? 'hi-IN' : 'en-IN')}</div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <EmptyState className="mt-2" icon={Send} title={L(['No applications yet', 'अभी कोई आवेदन नहीं'])}
                body={L(['Apply to a matched listing and it is tracked here (stored locally in this demo).', 'किसी मैच्ड लिस्टिंग पर आवेदन करें और वह यहाँ ट्रैक होगा (इस डेमो में लोकल सेव)।'])} />
            )}
          </Card>

          <Card>
            <h2 className="font-display text-[14px] font-bold">{L(['Why these rank first', 'ये पहले क्यों रैंक होते हैं'])}</h2>
            <ul className="mt-3 space-y-2.5">
              {[
                { w: 45, en: 'Required skills you already have', hi: 'आवश्यक कौशल जो आपके पास पहले से हैं' },
                { w: 20, en: 'Skills where you are strong (level 3+)', hi: 'जिन कौशलों में आप मज़बूत हैं (स्तर 3+)' },
                { w: 12, en: 'Location preference match', hi: 'स्थान प्राथमिकता का मेल' },
                { w: 10, en: 'Fit with your target career keywords', hi: 'आपके लक्षित करियर कीवर्ड से मेल' },
                { w: 8, en: 'Work mode preference (remote/hybrid/onsite)', hi: 'कार्य मोड प्राथमिकता (रिमोट/हाइब्रिड/ऑनसाइट)' },
                { w: 5, en: 'Experience requirement you can meet', hi: 'अनुभव आवश्यकता जो आप पूरी कर सकते हैं' },
              ].map((r) => (
                <li key={r.en}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-medium">{L([r.en, r.hi])}</span>
                    <span className="muted shrink-0 text-[10.5px] font-bold tabular-nums">{r.w}%</span>
                  </div>
                  <Meter className="mt-1" value={r.w * 2} size="xs" />
                </li>
              ))}
            </ul>
            <p className="muted mt-3 border-t border-line pt-3 text-[10.5px] leading-relaxed">{t('common.methodNote')}</p>
          </Card>

          <Card>
            <h2 className="font-display text-[14px] font-bold">{L(['Improve your match', 'अपना मैच सुधारें'])}</h2>
            <p className="muted mt-1.5 text-[12px] leading-relaxed">{L(['Match scores rise as your readiness rises — the ranking multiplies skill fit by your readiness factor.', 'जैसे-जैसे तैयारी बढ़ती है मैच स्कोर बढ़ते हैं — रैंकिंग कौशल फ़िट को आपके रेडीनेस कारक से गुणा करती है।'])}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" to="/app/skill-gap" icon={Filter}>{t('nav.skillgap')}</Button>
              <Button size="sm" variant="ghost" to="/app/resume" iconRight={ArrowRight}>{t('nav.resume')}</Button>
            </div>
            <div className="muted mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-[10.5px]">
              <Clock className="h-3 w-3" aria-hidden />{L(['Readiness', 'तैयारी'])}: {derived.readiness.score}/100
            </div>
          </Card>
        </aside>
      </div>

    </div>
  );
}

/** Stable dependency for the skill facet memo. */
function skills0(list) {
  return list.map((o) => o.id).join('|');
}
