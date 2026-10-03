import { useMemo, useState } from 'react';
import {
  BarChart3, TrendingUp, Users, FileText, Mic, Briefcase, Download, ArrowRight,
  GraduationCap, Target, Activity, AlertTriangle, Layers,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import {
  PageHeader, Card, Badge, Button, Meter, Stat, Segmented, DemoTag, EmptyState,
} from '../../components/ui/primitives';
import { DemoNotice } from '../../components/app/parts';
import { TrendChart, DonutChart, BarListChart } from '../../components/ui/Charts';
import { IsoBarChart } from '../../components/ui/Charts3D';
import { getCohort, getStats, toCSV, downloadCSV } from '../../services/adminService';
import { avg } from '../../lib/utils';

const SERIES = [
  { id: 'readiness', label: ['Readiness', 'रेडीनेस'], color: 'brand' },
  { id: 'active', label: ['Active students', 'सक्रिय छात्र'], color: 'ok' },
  { id: 'resumes', label: ['Resumes built', 'बने रिज़्यूमे'], color: 'accent' },
  { id: 'interviews', label: ['Interviews', 'इंटरव्यू'], color: 'warn' },
];

export default function AdminAnalytics() {
  const { t, L } = useI18n();
  const cohort = useMemo(() => getCohort(), []);
  const stats = useMemo(() => getStats(cohort), [cohort]);
  const [series, setSeries] = useState('readiness');
  const [compare, setCompare] = useState(false);

  const students = cohort.students;

  /* Real derived comparisons — computed from the cohort, not decoration. */
  const practiceSplit = useMemo(() => {
    const withPractice = students.filter((s) => s.interviews > 0);
    const without = students.filter((s) => s.interviews === 0);
    return {
      withN: withPractice.length,
      withoutN: without.length,
      withReadiness: withPractice.length ? Math.round(avg(withPractice.map((s) => s.readiness))) : 0,
      withoutReadiness: without.length ? Math.round(avg(without.map((s) => s.readiness))) : 0,
      withApps: withPractice.length ? Math.round(avg(withPractice.map((s) => s.applications))) : 0,
      withoutApps: without.length ? Math.round(avg(without.map((s) => s.applications))) : 0,
    };
  }, [students]);

  const completionSplit = useMemo(() => {
    const high = students.filter((s) => s.completion >= 80);
    const low = students.filter((s) => s.completion < 50);
    return {
      highN: high.length, lowN: low.length,
      highReadiness: high.length ? Math.round(avg(high.map((s) => s.readiness))) : 0,
      lowReadiness: low.length ? Math.round(avg(low.map((s) => s.readiness))) : 0,
    };
  }, [students]);

  const funnel = useMemo(() => {
    const steps = [
      { id: 'enrolled', label: L(['Enrolled in cohort', 'कोहोर्ट में नामांकित']), n: stats.total },
      { id: 'profile', label: L(['Profile 80%+ complete', 'प्रोफ़ाइल 80%+ पूर्ण']), n: students.filter((s) => s.completion >= 80).length },
      { id: 'resume', label: L(['Resume scoring 75+', 'रिज़्यूमे 75+ स्कोर']), n: stats.resumeReady },
      { id: 'interview', label: L(['Practised a mock interview', 'मॉक इंटरव्यू का अभ्यास किया']), n: stats.interviewed },
      { id: 'applied', label: L(['Saved at least one application', 'कम से कम एक आवेदन सेव किया']), n: students.filter((s) => s.applications > 0).length },
    ];
    return steps.map((s, i) => ({ ...s, pct: Math.round((s.n / stats.total) * 100), drop: i ? steps[i - 1].n - s.n : 0 }));
  }, [stats, students, L]);

  const trendData = useMemo(
    () => (stats.trend || []).map((p) => ({ label: L(p.label), readiness: p.readiness, active: p.active, resumes: p.resumes, interviews: p.interviews })),
    [stats.trend, L]
  );
  const activeSeries = compare
    ? SERIES.map((s) => ({ key: s.id, name: L(s.label), color: s.color }))
    : [(() => { const s = SERIES.find((x) => x.id === series); return { key: s.id, name: L(s.label), color: s.color }; })()];

  const careerDonut = useMemo(
    () => stats.careerPaths.slice(0, 6).map((c) => ({ name: L(c.career?.n || [c.id, c.id]), value: c.n })),
    [stats.careerPaths, L]
  );
  const branchBars = useMemo(
    () => stats.branchMix.map((b) => ({ name: b.branch, value: b.readiness })),
    [stats.branchMix]
  );
  const gapBars = useMemo(
    () => stats.topGaps.map((g) => ({ name: L(g.skill?.n || [g.id, g.id]), value: g.n })),
    [stats.topGaps, L]
  );

  const exportAnalytics = () => {
    downloadCSV('careerx-analytics.csv', toCSV(stats.branchMix, [
      { label: 'Branch', value: 'branch' },
      { label: 'Students', value: 'n' },
      { label: 'Average readiness', value: 'readiness' },
    ]));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><BarChart3 className="h-3 w-3" aria-hidden />{t('nav.admin.analytics')}</>}
        title={t('nav.admin.analytics')}
        sub={L(['Cohort trends, funnel drop-off and the relationships between practice, preparation and outcomes.', 'कोहोर्ट प्रवृत्तियाँ, फ़नल ड्रॉप-ऑफ़ और अभ्यास, तैयारी व परिणामों के बीच संबंध।'])}
        tags={[
          <Badge key="n" tone="accent" icon={Users}>{stats.total} {L(['students', 'छात्र'])}</Badge>,
          <Badge key="t" tone="brand" icon={TrendingUp}>{(stats.trend || []).length} {L(['checkpoints', 'चेकपॉइंट'])}</Badge>,
          <DemoTag key="d" />,
        ]}
        actions={
          <>
            <Button size="sm" variant="ghost" icon={Download} onClick={exportAnalytics}>{t('adm.export')}</Button>
            <Button size="sm" to="/admin/skill-insights" iconRight={ArrowRight}>{t('nav.admin.insights')}</Button>
          </>
        }
      />

      <DemoNotice tone="warn" icon={AlertTriangle}>
        {t('adm.insightsNote')} {L(['Correlations below describe this sample cohort only — they are not causal claims about any real student population.',
          'नीचे के सह-संबंध केवल इस नमूना कोहोर्ट का वर्णन हैं — किसी वास्तविक छात्र समूह के बारे में कारण-संबंधी दावे नहीं।'])}
      </DemoNotice>

      {/* funnel */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Layers className="h-4 w-4 text-brand" aria-hidden />
          <h2 className="font-display text-[15px] font-bold">{L(['Preparation funnel', 'तैयारी फ़नल'])}</h2>
          <Badge tone="muted" className="ml-auto">{L(['Where students drop off', 'छात्र कहाँ छूटते हैं'])}</Badge>
        </div>
        <ol className="mt-4 space-y-2.5">
          {funnel.map((f, i) => (
            <li key={f.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-line bg-surface2 text-[11px] font-bold text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 text-[12.5px] font-semibold">{f.label}</span>
                {i ? <Badge tone={f.drop > stats.total * 0.3 ? 'bad' : 'muted'}>{L([`−${f.drop} drop-off`, `−${f.drop} छूटे`])}</Badge> : null}
                <span className="font-display text-[13px] font-bold tabular-nums">{f.n} <span className="muted text-[11px] font-semibold">({f.pct}%)</span></span>
              </div>
              <Meter className="mt-1.5" value={f.pct} size="sm" tone={f.pct >= 60 ? 'ok' : f.pct >= 35 ? 'brand' : 'warn'} />
            </li>
          ))}
        </ol>
        <p className="muted mt-3.5 border-t border-line pt-3 text-[11.5px] leading-relaxed">
          {L([`The largest single drop is between “${funnel[1].label}” and “${funnel[2].label}” — ${funnel[2].drop} students. That is usually the cheapest place to intervene.`,
            `सबसे बड़ा अंतर “${funnel[1].label}” और “${funnel[2].label}” के बीच है — ${funnel[2].drop} छात्र। हस्तक्षेप के लिए यह प्रायः सबसे सस्ता स्थान है।`])}
        </p>
      </Card>

      {/* trend */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-[15px] font-bold">{t('adm.trend')}</h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Segmented value={compare ? 'compare' : series} label={L(['Metric', 'मेट्रिक'])}
              onChange={(v) => { if (v === 'compare') setCompare(true); else { setCompare(false); setSeries(v); } }}
              options={[...SERIES.map((s) => ({ value: s.id, label: L(s.label) })), { value: 'compare', label: L(['Compare all', 'सभी तुलना']) }]} />
          </div>
        </div>
        <TrendChart
          className="mt-3.5"
          data={trendData}
          height={280}
          yDomain={series === 'readiness' || compare ? [0, 100] : [0, 'auto']}
          series={activeSeries}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <DemoTag />
          <span className="muted text-[10.5px]">{L(['Readiness history across the selected cohort.', 'चुने गए कोहोर्ट की रेडीनेस हिस्ट्री।'])}</span>
        </div>
      </Card>

      {/* correlations */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-accent" aria-hidden />
            <h2 className="font-display text-[15px] font-bold">{L(['Students who practise vs those who do not', 'अभ्यास करने वाले बनाम न करने वाले'])}</h2>
          </div>
          <div className="mt-3.5 space-y-3">
            <div className="rounded-xl border border-line bg-surface2/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold">{L(['Practised ≥1 mock interview', '≥1 मॉक इंटरव्यू किया'])}</span>
                <Badge tone="ok">{practiceSplit.withN} {L(['students', 'छात्र'])}</Badge>
              </div>
              <Meter className="mt-2" value={practiceSplit.withReadiness} size="sm" tone="ok" label={t('adm.avgReadiness')} right={`${practiceSplit.withReadiness}`} />
              <div className="muted mt-1.5 text-[11px]">{L([`Average applications saved: ${practiceSplit.withApps}`, `औसत सेव आवेदन: ${practiceSplit.withApps}`])}</div>
            </div>
            <div className="rounded-xl border border-line bg-surface2/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold">{L(['No interview practice', 'कोई इंटरव्यू अभ्यास नहीं'])}</span>
                <Badge tone="warn">{practiceSplit.withoutN} {L(['students', 'छात्र'])}</Badge>
              </div>
              <Meter className="mt-2" value={practiceSplit.withoutReadiness} size="sm" tone="warn" label={t('adm.avgReadiness')} right={`${practiceSplit.withoutReadiness}`} />
              <div className="muted mt-1.5 text-[11px]">{L([`Average applications saved: ${practiceSplit.withoutApps}`, `औसत सेव आवेदन: ${practiceSplit.withoutApps}`])}</div>
            </div>
          </div>
          <p className="muted mt-3 text-[11.5px] leading-relaxed">
            {L([`A ${Math.max(0, practiceSplit.withReadiness - practiceSplit.withoutReadiness)}-point readiness difference in this cohort. Engagement can affect both numbers; treat this as a prompt to encourage practice, not proof of causation.`,
              `इस कोहोर्ट में ${Math.max(0, practiceSplit.withReadiness - practiceSplit.withoutReadiness)} अंक का रेडीनेस अंतर। सक्रियता दोनों संख्याओं को प्रभावित कर सकती है; इसे अभ्यास बढ़ाने के संकेत के रूप में लें, कारण के प्रमाण के रूप में नहीं।`])}
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-brand" aria-hidden />
            <h2 className="font-display text-[15px] font-bold">{L(['Profile completeness vs readiness', 'प्रोफ़ाइल पूर्णता बनाम रेडीनेस'])}</h2>
          </div>
          <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
            {[
              { label: L(['Completion 80%+', 'पूर्णता 80%+']), n: completionSplit.highN, v: completionSplit.highReadiness, tone: 'ok' },
              { label: L(['Completion under 50%', 'पूर्णता 50% से कम']), n: completionSplit.lowN, v: completionSplit.lowReadiness, tone: 'bad' },
            ].map((x) => (
              <div key={x.label[0]} className="rounded-xl border border-line bg-surface2/40 p-3">
                <div className="text-[12.5px] font-semibold">{x.label}</div>
                <div className="font-display mt-1 text-2xl font-bold tabular-nums">{x.v}<span className="muted text-[12px] font-semibold">/100</span></div>
                <div className="muted mt-0.5 text-[11px]">{x.n} {L(['students', 'छात्र'])}</div>
                <Meter className="mt-2" value={x.v} size="xs" tone={x.tone} />
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2 border-t border-line pt-3">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
              <span className="muted text-[11.5px]">{L([`${stats.internshipInterest}% of students have saved at least one opportunity`, `${stats.internshipInterest}% छात्रों ने कम से कम एक अवसर सेव किया है`])}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
              <span className="muted text-[11.5px]">{L([`${stats.careerPaths[0]?.pct || 0}% concentrated on one career path (${L(stats.careerPaths[0]?.career?.n || ['', ''])})`, `${stats.careerPaths[0]?.pct || 0}% एक ही करियर पथ पर केंद्रित (${L(stats.careerPaths[0]?.career?.n || ['', ''])})`])}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* distributions */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <h2 className="font-display text-[15px] font-bold">{L(['Average readiness by branch', 'ब्रांच अनुसार औसत रेडीनेस'])}</h2>
          <IsoBarChart
            className="mt-3" height={230} max={100} depth={13}
            data={branchBars.map((b, i) => ({ label: b.name, value: b.value, color: ['brand', 'accent', 'ok', 'warn', 'brand2'][i % 5] }))}
          />
          <p className="muted mt-1 text-[10.5px]">{L(['Isometric view — average readiness out of 100 per branch.', 'आइसोमेट्रिक दृश्य — प्रति ब्रांच औसत रेडीनेस 100 में से।'])}</p>
          <Button size="sm" variant="quiet" className="mt-2" to="/admin/users" iconRight={ArrowRight}>{L(['Filter students', 'छात्र फ़िल्टर करें'])}</Button>
        </Card>
        <Card>
          <h2 className="font-display text-[15px] font-bold">{t('adm.careerPaths')}</h2>
          <DonutChart className="mt-2" data={careerDonut} height={220} innerLabel={`${stats.careerPaths.length}`} />
          <ul className="mt-2 space-y-1 border-t border-line pt-2.5">
            {stats.careerPaths.slice(0, 6).map((c, i) => (
              <li key={c.id} className="flex items-center gap-2 text-[11.5px]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ['ok', 'brand', 'accent', 'warn', 'bad', 'brand2'][i % 6] }} aria-hidden />
                <span className="truncate text-ink">{L(c.career?.n || [c.id, c.id])}</span>
                <span className="muted ml-auto tabular-nums">{c.pct}%</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-display text-[15px] font-bold">{L(['Students per open gap', 'प्रति खुले गैप छात्र'])}</h2>
          <BarListChart className="mt-3" data={gapBars} height={Math.max(200, gapBars.length * 36)} unit="" color="warn" />
          <Button size="sm" variant="quiet" className="mt-2" to="/admin/skill-insights" iconRight={ArrowRight}>{t('nav.admin.insights')}</Button>
        </Card>
      </div>

      {/* headline numbers */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('adm.active')} value={`${Math.round((stats.active / stats.total) * 100)}%`} icon={Users} tone="ok"
          sub={`${stats.active}/${stats.total}`} hint={L([`${stats.weekly} used CareerX in the last 7 days`, `${stats.weekly} ने पिछले 7 दिनों में उपयोग किया`])} />
        <Stat label={t('adm.internInterest')} value={`${stats.internshipInterest}%`} icon={Briefcase} tone="brand"
          sub={L(['Saved at least one opportunity', 'कम से कम एक अवसर सेव किया'])} />
        <Stat label={t('adm.resumeReady')} value={`${stats.avgResume}/100`} icon={FileText} tone="accent"
          sub={L([`${stats.resumeReady} screening-ready`, `${stats.resumeReady} स्क्रीनिंग-तैयार`])} />
        <Stat label={L(['Projects recorded', 'दर्ज प्रोजेक्ट'])} value={stats.projects} icon={BarChart3} tone="warn"
          sub={L([`${(stats.projects / stats.total).toFixed(1)} per student on average`, `औसतन ${(stats.projects / stats.total).toFixed(1)} प्रति छात्र`])} />
      </div>

      {funnel[funnel.length - 1].n === 0 ? (
        <EmptyState icon={Activity} title={L(['No outcome data yet', 'अभी कोई परिणाम डेटा नहीं'])}
          body={L(['Once students start saving applications the funnel will populate.', 'जैसे ही छात्र आवेदन सेव करना शुरू करेंगे, फ़नल भरेगा।'])} />
      ) : null}
    </div>
  );
}
