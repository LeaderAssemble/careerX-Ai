import { useEffect, useMemo, useState } from 'react';
import {
  Landmark, Search, X, ShieldCheck, ExternalLink, ArrowRight, Check, GraduationCap,
  AlertTriangle, Building2, Factory, FileText, Wrench, BookOpen, CalendarDays,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import {
  PageHeader, Card, Badge, Button, Chip, Input, Select, Meter, EmptyState, CardSkeleton, DemoTag, ProgressRing,
} from '../../components/ui/primitives';
import { GovCard, NeedsProfile, DemoNotice, EmptyResults, MatchBadge } from '../../components/app/parts';
import { getGovOpportunities, rankGov, filterGov } from '../../services/jobService';
import { GOV_CATEGORIES } from '../../data/govOpportunities';
import { SKILL_BY_ID } from '../../data/catalog';
import { cn, useRevealGroup } from '../../lib/utils';

const CAT_ICON = { central: Landmark, state: Building2, psu: Factory, exams: FileText, apprentice: Wrench };

export default function GovJobs() {
  const { t, L } = useI18n();
  const { derived, profile, progress } = useApp();

  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [qualification, setQualification] = useState('all');
  const [onlyTracked, setOnlyTracked] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getGovOpportunities({ simulate: true, profile })
      .then((rows) => { if (alive) setList(rows); })
      .catch((e) => { if (alive) setError(String(e?.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [profile]);

  const ranked = useMemo(() => {
    if (!list || !derived) return [];
    return rankGov(list, { skillMap: derived.skillMap, profile });
  }, [list, derived, profile]);

  const filtered = useMemo(() => {
    const base = filterGov(ranked, { category, qualification, q });
    return onlyTracked ? base.filter((g) => (progress.trackedGov || []).includes(g.id)) : base;
  }, [ranked, category, qualification, q, onlyTracked, progress.trackedGov]);

  const gridRef = useRevealGroup([filtered.length, loading]);

  const quals = useMemo(() => [...new Set(ranked.flatMap((g) => g.fit || []))].sort(), [ranked]);
  const tracked = useMemo(() => ranked.filter((g) => (progress.trackedGov || []).includes(g.id)), [ranked, progress.trackedGov]);

  if (!derived || !profile) return <NeedsProfile />;

  const branch = profile.education?.branch || '';
  const degree = profile.education?.degree || '';
  const eligibleNow = ranked.filter((g) => (g.fit || []).some((f) => f === 'All branches' || branch.toLowerCase().includes(f.toLowerCase()) || degree.toLowerCase().includes(f.toLowerCase())));
  const activeFilters = [category !== 'all', qualification !== 'all', !!q, onlyTracked].filter(Boolean).length;
  const clearAll = () => { setQ(''); setCategory('all'); setQualification('all'); setOnlyTracked(false); };

  return (
    <div className="space-y-5">
      <PageHeader
        showBackButton={true}
        eyebrow={<><Landmark className="h-3 w-3" aria-hidden />{t('nav.gov')}</>}
        title={t('gov.title')}
        sub={t('gov.sub')}
        tags={[
          <Badge key="n" tone="muted">{loading ? t('common.loading') : t('common.results', { n: filtered.length })}</Badge>,
          <Badge key="t" tone="brand" icon={Check}>{tracked.length} {L(['tracked', 'ट्रैक किए'])}</Badge>,
          <DemoTag key="d" />,
        ]}
        actions={<Button size="sm" variant="ghost" to="/app/courses" iconRight={ArrowRight}>{L(['Exam preparation', 'परीक्षा तैयारी'])}</Button>}
      />

      <DemoNotice tone="warn" icon={AlertTriangle}>{t('gov.disclaimer')}</DemoNotice>

      {/* eligibility snapshot */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card grad className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-accent/10 blur-3xl" aria-hidden />
          <div className="relative flex items-center gap-4">
            <ProgressRing value={ranked.length ? Math.round((eligibleNow.length / ranked.length) * 100) : 0} size={92} stroke={9} tone="accent"
              label={`${eligibleNow.length}`} sublabel={L(['of listings', 'सूचियों में से'])} />
            <div className="min-w-0">
              <h2 className="font-display text-[14px] font-bold">{L(['Your eligibility snapshot', 'आपका पात्रता स्नैपशॉट'])}</h2>
              <p className="muted mt-1 text-[12px] leading-snug">
                {L([`Based on ${degree || 'your degree'} · ${branch || 'your branch'}. Final eligibility always depends on the official notification.`,
                  `${degree || 'आपकी डिग्री'} · ${branch || 'आपकी ब्रांच'} के आधार पर। अंतिम पात्रता हमेशा आधिकारिक अधिसूचना पर निर्भर करती है।`])}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Badge tone="accent" icon={GraduationCap}>{degree || L(['Degree not set', 'डिग्री सेट नहीं'])}</Badge>
                <Badge tone="muted">{branch || L(['Branch not set', 'ब्रांच सेट नहीं'])}</Badge>
                <Badge tone="muted" icon={CalendarDays}>{L([`Graduating ${profile.education?.gradYear || '—'}`, `${profile.education?.gradYear || '—'} में स्नातक`])}</Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-[14px] font-bold">{L(['Exam skills you already have', 'परीक्षा कौशल जो आपके पास पहले से हैं'])}</h2>
          <p className="muted mt-1 text-[12px]">{L(['Government technical posts test the same fundamentals as campus placement — plus aptitude and written communication.', 'सरकारी तकनीकी पद वही बुनियादी कौशल जाँचते हैं जो कैंपस प्लेसमेंट — साथ में एप्टिट्यूड और लिखित संचार।'])}</p>
          <ul className="mt-3 space-y-2">
            {['problem-solving', 'documentation', 'communication', 'time-management', 'sql', 'networks'].map((id) => {
              const lvl = derived.skillMap?.[id] ?? 0;
              const skill = SKILL_BY_ID[id];
              if (!skill) return null;
              return (
                <li key={id}>
                  <Meter value={(lvl / 4) * 100} size="xs" label={L(skill.n)} right={`${Math.round((lvl / 4) * 100)}%`}
                    tone={lvl >= 3 ? 'ok' : lvl >= 2 ? 'brand' : 'warn'} />
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
            <Button size="sm" variant="ghost" to="/app/skill-gap">{t('nav.skillgap')}</Button>
            <Button size="sm" variant="quiet" to="/app/interview" iconRight={ArrowRight}>{t('nav.interview')}</Button>
          </div>
        </Card>
      </div>

      {/* category tabs + filters */}
      <Card className="p-3.5">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={category === 'all'} onClick={() => setCategory('all')}>{t('common.all')} <span className="opacity-60">{ranked.length}</span></Chip>
          {GOV_CATEGORIES.map((c) => {
            const Icon = CAT_ICON[c.id] || Landmark;
            const count = ranked.filter((g) => g.cat === c.id).length;
            return (
              <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)} icon={Icon}>
                {L(c.n)} <span className="opacity-60">{count}</span>
              </Chip>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L(['Search exam, organisation or qualification…', 'परीक्षा, संस्था या योग्यता खोजें…'])} aria-label={t('common.search')} />
            {q ? <button type="button" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink" aria-label={t('common.clear')}><X className="h-3.5 w-3.5" aria-hidden /></button> : null}
          </div>
          <Select value={qualification} onChange={(e) => setQualification(e.target.value)} aria-label={t('gov.qualification')} className="w-auto min-w-[160px]">
            <option value="all">{t('gov.qualification')}: {t('common.all')}</option>
            {quals.map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
          <Chip active={onlyTracked} onClick={() => setOnlyTracked((v) => !v)} className="px-3 py-2">
            <ShieldCheck className="h-3 w-3" aria-hidden />{L(['Tracked only', 'केवल ट्रैक किए'])}
          </Chip>
          {activeFilters ? <Button size="sm" variant="quiet" icon={X} onClick={clearAll}>{t('common.clear')} ({activeFilters})</Button> : null}
        </div>
      </Card>

      {error ? (
        <EmptyState icon={X} title={t('err.generic')} body={error} action={<Button size="sm" onClick={() => window.location.reload()}>{t('common.tryAgain')}</Button>} />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} lines={5} />)}
        </div>
      ) : filtered.length ? (
        <div ref={gridRef} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((gov, i) => (
            <GovCard
              key={gov.id} gov={gov} index={i}
            />
          ))}
        </div>
      ) : (
        <EmptyResults
          title={t('job.empty')}
          body={onlyTracked ? L(['You are not tracking anything yet. Track a listing and it will appear here.', 'आपने अभी कुछ ट्रैक नहीं किया। किसी सूची को ट्रैक करें और वह यहाँ दिखेगी।']) : t('job.emptyHint')}
          onClear={clearAll} clearLabel={t('job.clearFilters')} icon={Landmark}
        />
      )}

      {/* tracked + prep planner */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-[14px] font-bold">{L(['Tracked opportunities', 'ट्रैक किए गए अवसर'])}</h2>
          {tracked.length ? (
            <ul className="mt-3 space-y-2">
              {tracked.map((g) => (
                <li key={g.id} className="rounded-xl border border-line bg-surface2/40 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-semibold">{L(g.t)}</div>
                      <div className="muted truncate text-[10.5px]">{g.org} · {t(`gov.${g.cat === 'apprentice' ? 'apprentice' : g.cat}`)}</div>
                    </div>
                    <MatchBadge value={g.match} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone="warn">{t('gov.notPublished')}</Badge>
                    <a href={g.site} target="_blank" rel="noreferrer noopener" className="muted inline-flex items-center gap-1 text-[11px] font-semibold hover:text-brand">
                      {t('gov.verify')}<ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState className="mt-2" icon={ShieldCheck} title={L(['Nothing tracked yet', 'अभी कुछ ट्रैक नहीं'])}
              body={L(['Track a listing to keep it here with an eligibility snapshot.', 'किसी सूची को ट्रैक करें और वह पात्रता स्नैपशॉट के साथ यहाँ रहेगी।'])} />
          )}
        </Card>

        <Card>
          <h2 className="font-display text-[14px] font-bold">{L(['Preparation planner', 'तैयारी प्लानर'])}</h2>
          <p className="muted mt-1 text-[12px]">{L(['Syllabus guidance summarised from the sample listings above — not an official syllabus.', 'ऊपर की नमूना सूचियों से सारांशित सिलेबस मार्गदर्शन — आधिकारिक सिलेबस नहीं।'])}</p>
          <ol className="mt-3 space-y-2">
            {[
              { icon: BookOpen, en: 'Pick one exam family and read its official syllabus on the portal', hi: 'एक परीक्षा परिवार चुनें और पोर्टल पर उसका आधिकारिक सिलेबस पढ़ें' },
              { icon: GraduationCap, en: 'Match your degree and branch against the notification’s eligibility table', hi: 'अपनी डिग्री और ब्रांच को अधिसूचना की पात्रता तालिका से मिलाएँ' },
              { icon: FileText, en: 'Practise quantitative aptitude, reasoning and written communication weekly', hi: 'साप्ताहिक रूप से मात्रात्मक एप्टिट्यूड, रीज़निंग और लिखित संचार का अभ्यास करें' },
              { icon: Landmark, en: 'Keep documents ready: marksheets, ID, category certificate, photographs', hi: 'दस्तावेज़ तैयार रखें: मार्कशीट, पहचान पत्र, श्रेणी प्रमाणपत्र, फ़ोटो' },
            ].map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface2/40 p-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-accent/25 bg-accent/10 text-accent"><s.icon className="h-3.5 w-3.5" aria-hidden /></span>
                <span className="text-[12px] leading-snug text-ink">{L([s.en, s.hi])}</span>
              </li>
            ))}
          </ol>
          <div className={cn('mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3')}>
            <DemoTag />
            <span className="muted text-[10.5px]">{L(['Always confirm dates, fees and vacancies on the official portal.', 'तिथियाँ, शुल्क और रिक्तियाँ हमेशा आधिकारिक पोर्टल पर सत्यापित करें।'])}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
