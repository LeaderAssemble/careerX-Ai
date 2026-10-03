import { useEffect, useMemo, useState } from 'react';
import {
  Briefcase, Search, X, Download, Eye, EyeOff, Pin, RotateCw, AlertTriangle,
  Landmark, GraduationCap, MapPin, Clock, ArrowRight, Check,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import {
  PageHeader, Card, Badge, Button, Chip, Input, Segmented, Switch, Stat,
  EmptyState, DemoTag, Tooltip,
} from '../../components/ui/primitives';
import { DemoNotice } from '../../components/app/parts';
import { JOBS, INTERNSHIPS } from '../../data/opportunities';
import { GOV_OPPORTUNITIES, GOV_CATEGORIES } from '../../data/govOpportunities';
import { getFeedConfig, refreshFeedConfig, resetFeedConfig, setFeedHidden, setFeedPinned } from '../../services/jobService';
import { toCSV, downloadCSV } from '../../services/adminService';
import { SKILL_BY_ID } from '../../data/catalog';
import { cn } from '../../lib/utils';

const TYPE_META = {
  job: { icon: Briefcase, tone: 'brand' },
  internship: { icon: GraduationCap, tone: 'accent' },
  gov: { icon: Landmark, tone: 'ok' },
};

export default function AdminOpportunities() {
  const { t, L } = useI18n();
  const { toast } = useApp();

  const [feed, setFeed] = useState(() => getFeedConfig());
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [view, setView] = useState('all'); // all | hidden | pinned

  useEffect(() => {
    refreshFeedConfig().then(() => setFeed(getFeedConfig()));
  }, []);

  /* The admin view always sees the FULL sample inventory, including hidden rows. */
  const inventory = useMemo(() => [
    ...JOBS.map((o) => ({ ...o, kind: 'job' })),
    ...INTERNSHIPS.map((o) => ({ ...o, kind: 'internship' })),
    ...GOV_OPPORTUNITIES.map((o) => ({ ...o, kind: 'gov' })),
  ], []);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return inventory.filter((o) => {
      if (type !== 'all' && o.kind !== type) return false;
      if (view === 'hidden' && !feed.hidden.includes(o.id)) return false;
      if (view === 'pinned' && !feed.pinned.includes(o.id)) return false;
      if (o.kind === 'gov' && cat !== 'all' && o.cat !== cat) return false;
      if (term) {
        const hay = `${o.t?.[0] || ''} ${o.t?.[1] || ''} ${o.co?.[0] || ''} ${o.org || ''} ${(o.skills || []).join(' ')}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [inventory, type, q, cat, view, feed]);

  const counts = useMemo(() => ({
    total: inventory.length,
    jobs: inventory.filter((o) => o.kind === 'job').length,
    internships: inventory.filter((o) => o.kind === 'internship').length,
    gov: inventory.filter((o) => o.kind === 'gov').length,
    hidden: feed.hidden.length,
    pinned: feed.pinned.length,
    visible: inventory.length - feed.hidden.filter((id) => inventory.some((o) => o.id === id)).length,
  }), [inventory, feed]);

  const toggleHidden = (o) => {
    const willHide = !feed.hidden.includes(o.id);
    setFeed(setFeedHidden(o.id, willHide));
    toast({
      kind: willHide ? 'warn' : 'success',
      title: willHide ? ['Listing hidden from students', 'सूची छात्रों से छिपाई गई'] : ['Listing visible again', 'सूची फिर दृश्यमान'],
      body: [`${o.t?.[0] || o.id} — applies to the shared student opportunity feed.`, `${o.t?.[1] || o.id} — साझा छात्र अवसर फ़ीड पर लागू।`],
    });
  };

  const togglePinned = (o) => {
    const willPin = !feed.pinned.includes(o.id);
    setFeed(setFeedPinned(o.id, willPin));
    toast({
      title: willPin ? ['Listing pinned to the top', 'सूची शीर्ष पर पिन की गई'] : ['Pin removed', 'पिन हटाया गया'],
      body: [`${o.t?.[0] || o.id}`, `${o.t?.[1] || o.id}`],
    });
  };

  const restoreAll = () => {
    setFeed(resetFeedConfig());
    toast({ kind: 'success', title: ['Feed restored', 'फ़ीड बहाल'], body: ['All hidden listings are visible again.', 'छिपी हुई सभी लिस्टिंग फिर दिखाई दे रही हैं।'] });
  };

  const exportCSV = () => {
    downloadCSV('careerx-opportunity-feed.csv', toCSV(rows, [
      { label: 'ID', value: 'id' },
      { label: 'Type', value: 'kind' },
      { label: 'Title', value: (o) => o.t?.[0] || '' },
      { label: 'Organisation', value: (o) => o.co?.[0] || o.org || '' },
      { label: 'Location', value: (o) => (Array.isArray(o.loc) ? o.loc[0] : o.loc || '') },
      { label: 'Skills', value: (o) => (o.skills || []).join('; ') },
      { label: 'Visible to students', value: (o) => (feed.hidden.includes(o.id) ? 'no' : 'yes') },
      { label: 'Pinned', value: (o) => (feed.pinned.includes(o.id) ? 'yes' : 'no') },
      { label: 'Source', value: () => 'CareerX catalog' },
    ]));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><Briefcase className="h-3 w-3" aria-hidden />{t('nav.admin.opportunities')}</>}
        title={t('nav.admin.opportunities')}
        sub={L(['Review the sample opportunity inventory students see, hide listings that are no longer useful and pin the ones worth highlighting.', 'छात्रों को दिखने वाली नमूना अवसर सूची देखें, बेकार सूचियाँ छिपाएँ और महत्वपूर्ण वाली पिन करें।'])}
        tags={[
          <Badge key="v" tone="ok" icon={Eye}>{counts.visible} {L(['visible', 'दृश्यमान'])}</Badge>,
          <Badge key="h" tone="warn" icon={EyeOff}>{counts.hidden} {L(['hidden', 'छिपी'])}</Badge>,
          <Badge key="p" tone="brand" icon={Pin}>{counts.pinned} {L(['pinned', 'पिन'])}</Badge>,
          <DemoTag key="d" />,
        ]}
        actions={
          <>
            <Button size="sm" variant="ghost" icon={Download} onClick={exportCSV} disabled={!rows.length}>{t('adm.export')}</Button>
            <Button size="sm" variant="quiet" icon={RotateCw} onClick={restoreAll} disabled={!feed.hidden.length && !feed.pinned.length}>
              {L(['Restore feed', 'फ़ीड बहाल करें'])}
            </Button>
          </>
        }
      />

      <DemoNotice tone="warn" icon={AlertTriangle}>
        {L([`All ${counts.total} listings below are fictional sample data created for this hackathon demo — no live job board, employer feed or government notification is connected. Hiding or pinning changes the demo feed stored in this browser only; students see the change the next time they open the Jobs, Internships or Government pages.`,
          `नीचे की सभी ${counts.total} सूचियाँ इस हैकाथॉन डेमो के लिए बनाई गई काल्पनिक नमूना जानकारी हैं — कोई लाइव जॉब बोर्ड, नियोक्ता फ़ीड या सरकारी अधिसूचना नहीं जुड़ी। छिपाना या पिन करना केवल इस ब्राउज़र में सेव डेमो फ़ीड बदलता है; छात्रों को बदलाव अगली बार Jobs, Internships या Government पेज खोलने पर दिखेगा।`])}
      </DemoNotice>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('nav.jobs')} value={counts.jobs} icon={Briefcase} tone="brand"
          sub={L([`${counts.jobs - feed.hidden.filter((id) => JOBS.some((j) => j.id === id)).length} visible`, `${counts.jobs - feed.hidden.filter((id) => JOBS.some((j) => j.id === id)).length} दृश्यमान`])} />
        <Stat label={t('nav.internships')} value={counts.internships} icon={GraduationCap} tone="accent"
          sub={L([`${counts.internships - feed.hidden.filter((id) => INTERNSHIPS.some((j) => j.id === id)).length} visible`, `${counts.internships - feed.hidden.filter((id) => INTERNSHIPS.some((j) => j.id === id)).length} दृश्यमान`])} />
        <Stat label={t('nav.gov')} value={counts.gov} icon={Landmark} tone="ok"
          sub={L([`${counts.gov - feed.hidden.filter((id) => GOV_OPPORTUNITIES.some((j) => j.id === id)).length} visible`, `${counts.gov - feed.hidden.filter((id) => GOV_OPPORTUNITIES.some((j) => j.id === id)).length} दृश्यमान`])} />
        <Stat label={L(['Matched to students', 'छात्रों से मैच'])} value={`${counts.total}`} icon={Check} tone="warn"
          sub={L(['Ranked per student by the same local engine', 'हर छात्र के लिए उसी लोकल इंजन से क्रमबद्ध'])}
          hint={t('adm.opp.note')} />
      </div>

      {/* filters */}
      <Card className="p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={L(['Search title, organisation or skill…', 'शीर्षक, संस्था या कौशल खोजें…'])} aria-label={L(['Search opportunities', 'अवसर खोजें'])} />
            {q ? <button type="button" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink" aria-label={t('common.clear')}><X className="h-3.5 w-3.5" aria-hidden /></button> : null}
          </div>
          <Segmented value={type} onChange={setType} options={[
            { value: 'all', label: t('common.all') },
            { value: 'job', label: t('nav.jobs') },
            { value: 'internship', label: t('nav.internships') },
            { value: 'gov', label: t('nav.gov') },
          ]} />
          <Segmented value={view} onChange={setView} options={[
            { value: 'all', label: L(['Everything', 'सब कुछ']) },
            { value: 'hidden', label: L(['Hidden', 'छिपी']) },
            { value: 'pinned', label: L(['Pinned', 'पिन']) },
          ]} />
        </div>
        {type === 'gov' || type === 'all' ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
            <span className="muted text-[10.5px] font-bold uppercase tracking-wider">{t('adm.filterCat')}</span>
            <Chip active={cat === 'all'} onClick={() => setCat('all')}>{t('common.all')}</Chip>
            {GOV_CATEGORIES.map((c) => (
              <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{L(c.n)}</Chip>
            ))}
          </div>
        ) : null}
      </Card>

      {/* table */}
      {rows.length ? (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-[12.5px]">
              <thead>
                <tr className="muted border-b border-line bg-surface2/60 text-[10.5px] uppercase tracking-wider">
                  <th className="px-3.5 py-2.5 font-bold">{L(['Listing', 'सूची'])}</th>
                  <th className="px-3 py-2.5 font-bold">{L(['Type', 'प्रकार'])}</th>
                  <th className="px-3 py-2.5 font-bold">{L(['Location / mode', 'स्थान / मोड'])}</th>
                  <th className="px-3 py-2.5 font-bold">{L(['Skills tested', 'जाँचे जाने वाले कौशल'])}</th>
                  <th className="px-3 py-2.5 font-bold">{L(['Student visibility', 'छात्र दृश्यता'])}</th>
                  <th className="px-3.5 py-2.5 text-right font-bold">{L(['Feature', 'फ़ीचर'])}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const meta = TYPE_META[o.kind] || TYPE_META.job;
                  const hidden = feed.hidden.includes(o.id);
                  const pinned = feed.pinned.includes(o.id);
                  return (
                    <tr key={o.id} className={cn('border-b border-line/60 transition last:border-0 hover:bg-surface2/60', hidden && 'opacity-60')}>
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-start gap-2">
                          <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border',
                            meta.tone === 'ok' ? 'border-ok/30 bg-ok/10 text-ok' : meta.tone === 'accent' ? 'border-accent/30 bg-accent/10 text-accent' : 'border-brand/30 bg-brand/10 text-brand')}>
                            <meta.icon className="h-3.5 w-3.5" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold leading-snug">{L(o.t)}</span>
                              {pinned ? <Badge tone="brand" icon={Pin}>{L(['Pinned', 'पिन'])}</Badge> : null}
                            </div>
                            <div className="muted truncate text-[10.5px]">{o.co ? L(o.co) : o.org}{o.kind === 'gov' && o.qual?.[0] ? ` · ${L(o.qual)}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={meta.tone}>{o.kind === 'gov' ? t(`gov.${o.cat === 'apprentice' ? 'apprentice' : o.cat}`) : o.kind === 'job' ? t('nav.jobs') : t('nav.internships')}</Badge>
                        {o.kind !== 'gov' && o.exp != null ? <div className="muted mt-1 text-[10.5px]">{t('job.yrs', { n: o.exp })}</div> : null}
                      </td>
                      <td className="px-3 py-2.5">
                        {o.kind === 'gov' ? (
                          <span className="muted inline-flex items-center gap-1 text-[11.5px]"><Landmark className="h-3 w-3" aria-hidden />{L(['Official portal only', 'केवल आधिकारिक पोर्टल'])}</span>
                        ) : (
                          <>
                            <div className="inline-flex items-center gap-1 text-[11.5px]"><MapPin className="h-3 w-3 text-muted" aria-hidden />{L(o.loc)}</div>
                            <div className="muted text-[10.5px]">{o.mode === 'remote' ? t('common.remote') : o.mode === 'hybrid' ? t('common.hybrid') : t('common.onsite')}</div>
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex max-w-[220px] flex-wrap gap-1">
                          {(o.skills || []).slice(0, 3).map((s) => (
                            <Chip key={s} className="px-1.5 py-0 text-[9.5px]">{L(SKILL_BY_ID[s]?.n || [s, s])}</Chip>
                          ))}
                          {(o.skills || []).length > 3 ? <span className="muted text-[10px]">+{o.skills.length - 3}</span> : null}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Switch checked={!hidden} onChange={() => toggleHidden(o)} label={L([`Visibility of ${o.t?.[0] || o.id}`, `${o.t?.[1] || o.id} की दृश्यता`])} />
                        <div className="muted mt-1 inline-flex items-center gap-1 text-[10.5px]">
                          {hidden ? <><EyeOff className="h-3 w-3" aria-hidden />{L(['Hidden', 'छिपी'])}</> : <><Eye className="h-3 w-3" aria-hidden />{L(['Visible', 'दृश्यमान'])}</>}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <Tooltip label={pinned ? L(['Unpin', 'अनपिन करें']) : L(['Pin to top of the student feed', 'छात्र फ़ीड के शीर्ष पर पिन करें'])}>
                          <Button size="sm" variant={pinned ? 'primary' : 'quiet'} icon={Pin} onClick={() => togglePinned(o)}>
                            {pinned ? L(['Pinned', 'पिन']) : L(['Pin', 'पिन'])}
                          </Button>
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-3.5 py-3">
            <DemoTag />
            <span className="muted text-[10.5px]">{L([`Showing ${rows.length} of ${counts.total} sample listings`, `${counts.total} में से ${rows.length} नमूना सूचियाँ दिखाई जा रही हैं`])}</span>
            <Button size="sm" variant="quiet" className="ml-auto" to="/app/jobs" iconRight={ArrowRight}>{L(['View as student', 'छात्र के रूप में देखें'])}</Button>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={Briefcase}
          title={t('common.noResults')}
          body={view === 'hidden'
            ? L(['Nothing is hidden right now — every sample listing is visible to students.', 'अभी कुछ छिपा नहीं है — हर नमूना सूची छात्रों को दिखती है।'])
            : view === 'pinned'
              ? L(['No listing is pinned yet. Pin one to push it to the top of the student feed.', 'अभी कोई सूची पिन नहीं। किसी को पिन करें और वह छात्र फ़ीड के शीर्ष पर आएगी।'])
              : L(['No listing matches this search.', 'इस खोज से कोई सूची मेल नहीं खाती।'])}
          action={<Button size="sm" variant="ghost" onClick={() => { setQ(''); setType('all'); setCat('all'); setView('all'); }}>{t('common.clear')}</Button>}
        />
      )}

      {/* integration note */}
      <Card>
        <div className="flex items-start gap-2.5">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
          <div className="min-w-0">
            <h2 className="font-display text-[14px] font-bold">{L(['Connecting a real opportunity feed', 'वास्तविक अवसर फ़ीड जोड़ना'])}</h2>
            <p className="muted mt-1.5 text-[12px] leading-relaxed">
              {L(['`src/services/jobService.js` is the single integration point. Replace the sample arrays with a server call, keep the same field shape, and every student page continues to work unchanged. Add a `source: "live" | "sample"` field per listing so the UI can keep labelling provenance honestly, and never place API credentials in client code — read them from server-side environment variables.',
                '`src/services/jobService.js` एकमात्र एकीकरण बिंदु है। नमूना ऐरे को सर्वर कॉल से बदलें, वही फ़ील्ड संरचना रखें, और हर छात्र पेज बिना बदलाव के काम करता रहेगा। प्रत्येक सूची में `source: "live" | "sample"` फ़ील्ड जोड़ें ताकि UI स्रोत ईमानदारी से दर्शाता रहे, और API क्रेडेंशियल कभी क्लाइंट कोड में न रखें — उन्हें सर्वर-साइड एनवायरनमेंट वेरिएबल से पढ़ें।'])}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" to="/admin/settings" iconRight={ArrowRight}>{t('nav.admin.settings')}</Button>
              <Button size="sm" variant="quiet" to="/privacy">{t('trust.title')}</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
