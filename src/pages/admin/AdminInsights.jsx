import { useEffect, useMemo, useState } from 'react';
import {
  BrainCircuit, AlertTriangle, TrendingDown, TrendingUp, Compass, FileText, Users, Activity,
  ArrowRight, Clock, BookOpen, Download, Sparkles, Layers, Check, X,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import {
  PageHeader, Card, Badge, Button, Chip, Meter, Segmented, DemoTag, EmptyState, CardSkeleton,
} from '../../components/ui/primitives';
import { AILabel, DemoNotice } from '../../components/app/parts';
import { BarListChart } from '../../components/ui/Charts';
import { getCohort, getStats, getInsights, toCSV, downloadCSV } from '../../services/adminService';
import { getCatalog, filterCourses } from '../../services/courseService';
import { SKILL_BY_ID, SKILL_CATEGORIES, BRANCHES } from '../../data/catalog';
import { groupBy, avg } from '../../lib/utils';

const SEV_META = {
  high: { tone: 'bad', Icon: AlertTriangle, label: ['High priority', 'उच्च प्राथमिकता'] },
  medium: { tone: 'warn', Icon: TrendingDown, label: ['Worth attention', 'ध्यान देने योग्य'] },
  info: { tone: 'brand', Icon: Sparkles, label: ['Informational', 'सूचनात्मक'] },
};
const ICONS = { AlertTriangle, Compass, TrendingDown, TrendingUp, FileText, Users, Activity };

export default function AdminInsights() {
  const { t, L } = useI18n();
  const cohort = useMemo(() => getCohort(), []);
  const stats = useMemo(() => getStats(cohort), [cohort]);
  const insights = useMemo(() => getInsights(cohort), [cohort]);

  const [sev, setSev] = useState('all');
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getCatalog({ simulate: true })
      .then((rows) => { if (alive) setCatalog(rows); })
      .catch(() => { if (alive) setCatalog([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  /* Gap analysis with a real intervention suggestion per skill. */
  const gapRows = useMemo(() => stats.topGaps.map((g) => {
    const skill = g.skill || SKILL_BY_ID[g.id];
    const covering = catalog ? filterCourses(catalog, { skill: g.id }) : [];
    const hours = covering.length ? Math.round(avg(covering.map((c) => c.hrs || 0))) : (skill?.hrs || 0);
    /* Which branch shows this gap most often — computed from the cohort. */
    const byBranch = groupBy(cohort.students.filter((s) => s.skillGaps.includes(g.id)), (s) => s.branch);
    const worst = Object.entries(byBranch).map(([branch, list]) => ({ branch, n: list.length, pct: Math.round((list.length / cohort.students.filter((s) => s.branch === branch).length) * 100) })).sort((a, b) => b.pct - a.pct)[0];
    return { ...g, skill, covering: covering.slice(0, 2), hours, worst };
  }), [stats.topGaps, catalog, cohort.students]);

  const catData = useMemo(() => {
    const counts = {};
    cohort.students.forEach((s) => s.skillGaps.forEach((id) => {
      const cat = SKILL_BY_ID[id]?.cat || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    }));
    return Object.entries(counts)
      .map(([cat, n]) => ({ name: SKILL_CATEGORIES[cat] ? L(SKILL_CATEGORIES[cat]) : cat, value: n }))
      .sort((a, b) => b.value - a.value);
  }, [cohort.students, L]);

  const branchMatrix = useMemo(() => BRANCHES.map((branch) => {
    const list = cohort.students.filter((s) => s.branch === branch);
    if (!list.length) return null;
    const counts = {};
    list.forEach((s) => s.skillGaps.forEach((id) => { counts[id] = (counts[id] || 0) + 1; }));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return {
      branch, n: list.length,
      readiness: Math.round(avg(list.map((s) => s.readiness))),
      topGap: top ? { skill: SKILL_BY_ID[top[0]], pct: Math.round((top[1] / list.length) * 100), n: top[1] } : null,
      gapsPerStudent: Number(avg(list.map((s) => s.skillGaps.length)).toFixed(1)),
    };
  }).filter(Boolean), [cohort.students]);

  const shown = sev === 'all' ? insights : insights.filter((i) => i.severity === sev);
  const workshop = gapRows.slice(0, 3);

  const exportGaps = () => {
    downloadCSV('careerx-skill-gaps.csv', toCSV(gapRows, [
      { label: 'Skill', value: (r) => L(r.skill?.n || [r.id, r.id]) },
      { label: 'Category', value: (r) => (r.skill?.cat ? L(SKILL_CATEGORIES[r.skill.cat] || [r.skill.cat, r.skill.cat]) : r.skill?.cat || '') },
      { label: 'Students affected', value: 'n' },
      { label: 'Share of cohort %', value: 'pct' },
      { label: 'Typical learning hours', value: 'hours' },
      { label: 'Most affected branch', value: (r) => (r.worst ? `${r.worst.branch} (${r.worst.pct}%)` : '') },
      { label: 'Sample course 1', value: (r) => (r.covering[0] ? L(r.covering[0].t) : '') },
      { label: 'Sample course 2', value: (r) => (r.covering[1] ? L(r.covering[1].t) : '') },
    ]));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><BrainCircuit className="h-3 w-3" aria-hidden />{t('nav.admin.insights')}</>}
        title={t('nav.admin.insights')}
        sub={L(['Cohort-wide skill gaps with a suggested intervention for each, plus every rule-based insight and the numbers behind it.', 'कोहोर्ट-व्यापी स्किल गैप, हर एक के लिए सुझाया गया हस्तक्षेप, साथ ही हर नियम-आधारित इनसाइट और उसके पीछे के आँकड़े।'])}
        tags={[
          <Badge key="g" tone="warn" icon={AlertTriangle}>{stats.topGaps.length} {L(['gap skills tracked', 'गैप कौशल ट्रैक'])}</Badge>,
          <Badge key="i" tone="brand" icon={Sparkles}>{insights.length} {L(['insights', 'इनसाइट्स'])}</Badge>,
          <AILabel key="ai" />,
          <DemoTag key="d" />,
        ]}
        actions={
          <>
            <Button size="sm" variant="ghost" icon={Download} onClick={exportGaps} disabled={!gapRows.length}>{t('adm.export')}</Button>
            <Button size="sm" to="/admin/users" iconRight={ArrowRight}>{t('nav.admin.users')}</Button>
          </>
        }
      />

      <DemoNotice tone="brand" icon={BrainCircuit}>
        {L(['“AI” here means transparent rules over the demo cohort — counts, averages and thresholds you can audit below. No trained model and no external AI provider is called in this build.',
          'यहाँ “AI” का अर्थ डेमो कोहोर्ट पर पारदर्शी नियम है — गिनती, औसत और सीमाएँ जिन्हें आप नीचे जाँच सकते हैं। इस बिल्ड में कोई प्रशिक्षित मॉडल या बाहरी AI प्रदाता कॉल नहीं होता।'])}
      </DemoNotice>

      {/* insights */}
      <Card grad className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-2">
          <h2 className="font-display text-[15px] font-bold">{t('adm.aiInsights')}</h2>
          <AILabel />
          <div className="ml-auto">
            <Segmented value={sev} onChange={setSev} options={[
              { value: 'all', label: t('common.all') },
              { value: 'high', label: L(SEV_META.high.label) },
              { value: 'medium', label: L(SEV_META.medium.label) },
              { value: 'info', label: L(SEV_META.info.label) },
            ]} />
          </div>
        </div>

        <div className="relative mt-4 space-y-3">
          {shown.length ? shown.map((ins) => {
            const meta = SEV_META[ins.severity] || SEV_META.info;
            const Icon = ICONS[ins.icon] || meta.Icon;
            return (
              <article key={ins.id} className={`rounded-xl border p-3.5 ${meta.tone === 'bad' ? 'border-bad/30 bg-bad/[0.06]' : meta.tone === 'warn' ? 'border-warn/30 bg-warn/[0.06]' : 'border-line bg-surface2/50'}`}>
                <div className="flex flex-wrap items-start gap-2.5">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${meta.tone === 'bad' ? 'border-bad/30 bg-bad/10 text-bad' : meta.tone === 'warn' ? 'border-warn/30 bg-warn/10 text-warn' : 'border-brand/30 bg-brand/10 text-brand'}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-[13.5px] font-bold">{L(ins.title)}</h3>
                      <Badge tone={meta.tone}>{L(meta.label)}</Badge>
                    </div>
                    <p className="muted mt-1.5 text-[12.5px] leading-relaxed">{L(ins.text)}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="muted text-[10px] font-bold uppercase tracking-wider">{L(['Evidence', 'प्रमाण'])}</span>
                      {ins.evidence?.map((e) => <Badge key={e} tone="muted" className="font-mono text-[9.5px]">{e}</Badge>)}
                      {ins.action ? <Button size="sm" variant="quiet" className="ml-auto" to={ins.action.to} iconRight={ArrowRight}>{L(ins.action.label)}</Button> : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          }) : (
            <EmptyState icon={Sparkles} title={L(['No insights at this severity', 'इस गंभीरता पर कोई इनसाइट नहीं'])}
              body={L(['Switch the filter to see the rest.', 'बाकी देखने के लिए फ़िल्टर बदलें।'])}
              action={<Button size="sm" variant="ghost" onClick={() => setSev('all')}>{t('common.all')}</Button>} />
          )}
        </div>
      </Card>

      {/* gap table with interventions */}
      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <Layers className="h-4 w-4 text-warn" aria-hidden />
          <h2 className="font-display text-[15px] font-bold">{t('adm.skillGaps')}</h2>
          <Badge tone="muted">{stats.total} {L(['students analysed', 'छात्र विश्लेषित'])}</Badge>
          <span className="muted ml-auto text-[11px]">{L(['Sorted by how many students are affected', 'प्रभावित छात्रों की संख्या अनुसार क्रमबद्ध'])}</span>
        </div>

        {loading && !catalog ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2"><CardSkeleton lines={4} /><CardSkeleton lines={4} /></div>
        ) : (
          <ul className="divide-y divide-line">
            {gapRows.map((g) => (
              <li key={g.id} className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-[13.5px] font-bold">{L(g.skill?.n || [g.id, g.id])}</h3>
                      {g.skill?.cat ? <Badge tone="muted">{L(SKILL_CATEGORIES[g.skill.cat] || [g.skill.cat, g.skill.cat])}</Badge> : null}
                      <Badge tone="warn">{g.n} {L(['students', 'छात्र'])} · {g.pct}%</Badge>
                    </div>
                    <Meter className="mt-2 max-w-md" value={g.pct} size="sm" tone={g.pct >= 40 ? 'bad' : g.pct >= 25 ? 'warn' : 'brand'} right={`${g.pct}% ${L(['of cohort', 'कोहोर्ट का'])}`} />
                    <div className="muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden />{L([`~${g.hours} learning hours`, `~${g.hours} सीखने के घंटे`])}</span>
                      {g.worst ? <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" aria-hidden />{L([`Most affected: ${g.worst.branch} (${g.worst.pct}%)`, `सबसे प्रभावित: ${g.worst.branch} (${g.worst.pct}%)`])}</span> : null}
                    </div>
                  </div>

                  <div className="w-full shrink-0 sm:w-72">
                    <div className="muted mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Suggested intervention', 'सुझाया गया हस्तक्षेप'])}</div>
                    {g.covering.length ? (
                      <ul className="space-y-1.5">
                        {g.covering.map((c) => (
                          <li key={c.id} className="rounded-xl border border-line bg-surface2/50 p-2.5">
                            <div className="flex items-start gap-2">
                              <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                              <div className="min-w-0">
                                <div className="text-[11.5px] font-semibold leading-snug">{L(c.t)}</div>
                                <div className="muted mt-0.5 text-[10px]">{c.weeks} {L(['weeks', 'सप्ताह'])} · {c.hrs}h · {c.cert ? L(['Certificate', 'प्रमाणपत्र']) : L(['No certificate', 'प्रमाणपत्र नहीं'])} · {c.free ? L(['Free', 'निःशुल्क']) : L(['Paid', 'सशुल्क'])}</div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted rounded-xl border border-line bg-surface2/50 p-2.5 text-[11.5px]">
                        {L(['No sample course covers this skill — a workshop or lab session would be needed.', 'कोई नमूना कोर्स इस कौशल को कवर नहीं करता — कार्यशाला या लैब सत्र की आवश्यकता होगी।'])}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
          <DemoTag />
          <span className="muted text-[10.5px]">{L(['Course suggestions come from the sample catalogue and are not endorsements or partnerships.', 'कोर्स सुझाव नमूना कैटलॉग से हैं और न तो अनुशंसा हैं न साझेदारी।'])}</span>
        </div>
      </Card>

      {/* workshop plan + category split */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-ok" aria-hidden />
            <h2 className="font-display text-[15px] font-bold">{L(['Suggested 6-week intervention plan', 'सुझाई गई 6-सप्ताह हस्तक्षेप योजना'])}</h2>
          </div>
          <p className="muted mt-1 text-[12px]">{L(['Built from the three gaps affecting the most students in this cohort.', 'इस कोहोर्ट में सबसे अधिक छात्रों को प्रभावित करने वाले तीन गैप से बनी।'])}</p>
          <ol className="mt-3.5 space-y-2.5">
            {workshop.map((g, i) => (
              <li key={g.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-line bg-surface2/40 p-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-ok/30 bg-ok/10 text-[11px] font-bold text-ok">{L([`W${i * 2 + 1}`, `स${i * 2 + 1}`])}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold">{L([`Workshop: ${L(g.skill?.n || [g.id, g.id])}`, `कार्यशाला: ${L(g.skill?.n || [g.id, g.id])}`])}</div>
                  <p className="muted mt-1 text-[11.5px] leading-snug">
                    {L([`${g.n} students (${g.pct}% of cohort) · ~${g.hours} hours · two sessions across two weeks`,
                      `${g.n} छात्र (${g.pct}% कोहोर्ट) · ~${g.hours} घंटे · दो सप्ताह में दो सत्र`])}
                  </p>
                  {g.covering[0] ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Chip className="px-1.5 py-0 text-[10px]"><BookOpen className="h-2.5 w-2.5" aria-hidden />{L(g.covering[0].t)}</Chip>
                      {g.worst ? <Chip className="px-1.5 py-0 text-[10px]"><Users className="h-2.5 w-2.5" aria-hidden />{g.worst.branch}</Chip> : null}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <Badge tone="ok" icon={Check}>{L([`Reaches up to ${Math.min(stats.total, workshop.reduce((a, g) => a + g.n, 0))} student-gap pairs`, `${Math.min(stats.total, workshop.reduce((a, g) => a + g.n, 0))} तक छात्र-गैप जोड़ों तक पहुँच`])}</Badge>
            <Button size="sm" variant="quiet" className="ml-auto" to="/admin/activities" iconRight={ArrowRight}>{t('nav.admin.activities')}</Button>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-[15px] font-bold">{L(['Gaps by skill category', 'श्रेणी अनुसार गैप'])}</h2>
          <BarListChart className="mt-3" data={catData} height={Math.max(180, catData.length * 40)} unit="" color="accent" />
          <p className="muted mt-2 text-[11.5px] leading-relaxed">
            {L([`Counts every open gap recorded across ${stats.total} students (${stats.topGaps.reduce((a, g) => a + g.n, 0)} in the top eight alone). Soft and tool gaps are often cheaper to close than technical ones.`,
              `${stats.total} छात्रों में दर्ज हर खुले गैप की गिनती (केवल शीर्ष आठ में ${stats.topGaps.reduce((a, g) => a + g.n, 0)})। सॉफ्ट और टूल गैप प्रायः तकनीकी से सस्ते में भरते हैं।`])}
          </p>
        </Card>
      </div>

      {/* branch matrix */}
      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <Users className="h-4 w-4 text-brand" aria-hidden />
          <h2 className="font-display text-[15px] font-bold">{L(['Branch × most common gap', 'ब्रांच × सबसे आम गैप'])}</h2>
          <Button size="sm" variant="quiet" className="ml-auto" to="/admin/users" iconRight={ArrowRight}>{L(['Open student list', 'छात्र सूची खोलें'])}</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[12.5px]">
            <thead>
              <tr className="muted border-b border-line bg-surface2/60 text-[10.5px] uppercase tracking-wider">
                <th className="px-4 py-2.5 font-bold">{L(['Branch', 'ब्रांच'])}</th>
                <th className="px-3 py-2.5 font-bold">{L(['Students', 'छात्र'])}</th>
                <th className="px-3 py-2.5 font-bold">{t('adm.avgReadiness')}</th>
                <th className="px-3 py-2.5 font-bold">{L(['Gaps per student', 'प्रति छात्र गैप'])}</th>
                <th className="px-4 py-2.5 font-bold">{L(['Most common gap', 'सबसे आम गैप'])}</th>
              </tr>
            </thead>
            <tbody>
              {branchMatrix.map((b) => (
                <tr key={b.branch} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2.5 font-semibold">{b.branch}</td>
                  <td className="px-3 py-2.5 tabular-nums">{b.n}</td>
                  <td className="px-3 py-2.5"><Meter value={b.readiness} size="xs" tone={b.readiness >= 70 ? 'ok' : b.readiness >= 50 ? 'brand' : 'bad'} right={`${b.readiness}`} /></td>
                  <td className="px-3 py-2.5 tabular-nums">{b.gapsPerStudent}</td>
                  <td className="px-4 py-2.5">
                    {b.topGap ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Badge tone="warn">{L(b.topGap.skill?.n || ['—', '—'])}</Badge>
                        <span className="muted text-[11px] tabular-nums">{b.topGap.pct}%</span>
                      </span>
                    ) : <span className="muted text-[11.5px]">{L(['No gaps recorded', 'कोई गैप दर्ज नहीं'])}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
          <DemoTag />
          <span className="muted text-[10.5px]">{L(['A support signal for guidance planning — never a judgement about a branch or a student.', 'मार्गदर्शन योजना के लिए समर्थन संकेत — किसी ब्रांच या छात्र के बारे में निर्णय कभी नहीं।'])}</span>
        </div>
      </Card>

      {!insights.length ? (
        <EmptyState icon={X} title={L(['No insights could be generated', 'कोई इनसाइट नहीं बन सका'])}
          body={L(['The cohort dataset appears empty in this browser.', 'इस ब्राउज़र में कोहोर्ट डेटासेट खाली लग रहा है।'])} />
      ) : null}
    </div>
  );
}
