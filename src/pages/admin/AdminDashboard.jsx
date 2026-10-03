import { useMemo } from 'react';
import {
  Building2, Users, Activity, Gauge, FileText, Mic, Briefcase, TrendingUp, TrendingDown,
  AlertTriangle, Compass, ArrowRight, Download, CalendarDays, Sparkles, Rocket,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { PageHeader, Card, Badge, Button, Meter, Stat, DemoTag, ProgressRing } from '../../components/ui/primitives';
import { DemoNotice, AILabel } from '../../components/app/parts';
import { TrendChart, DonutChart, BarListChart } from '../../components/ui/Charts';
import { getCohort, getStats, getInsights, toCSV, downloadCSV } from '../../services/adminService';

const SEV = {
  high: { tone: 'bad', Icon: AlertTriangle },
  medium: { tone: 'warn', Icon: TrendingDown },
  info: { tone: 'brand', Icon: Sparkles },
};
const INSIGHT_ICON = { AlertTriangle, Compass, TrendingDown, TrendingUp, FileText, Users, Activity };

export default function AdminDashboard() {
  const { t, L } = useI18n();
  const cohort = useMemo(() => getCohort(), []);
  const stats = useMemo(() => getStats(cohort), [cohort]);
  const insights = useMemo(() => getInsights(cohort), [cohort]);

  const trendData = useMemo(
    () => (stats.trend || []).map((p) => ({ label: L(p.label), readiness: p.readiness, active: p.active, resumes: p.resumes, interviews: p.interviews })),
    [stats.trend, L]
  );
  const donutData = useMemo(
    () => stats.buckets.map((b, i) => ({ name: L(b.n), value: b.n_students, color: ['bad', 'warn', 'accent', 'brand', 'ok'][i] })),
    [stats.buckets, L]
  );
  const gapData = useMemo(
    () => stats.topGaps.map((g) => ({ name: L(g.skill?.n || [g.id, g.id]), value: g.pct })),
    [stats.topGaps, L]
  );

  const exportSummary = () => {
    const rows = [
      { metric: L(['Total students', 'कुल छात्र']), value: stats.total },
      { metric: L(['Active (30 days)', 'सक्रिय (30 दिन)']), value: stats.active },
      { metric: L(['Active (7 days)', 'सक्रिय (7 दिन)']), value: stats.weekly },
      { metric: t('adm.avgReadiness'), value: stats.avgReadiness },
      { metric: L(['Average employability', 'औसत रोज़गार-योग्यता']), value: stats.avgEmployability },
      { metric: L(['Average resume score', 'औसत रिज़्यूमे स्कोर']), value: stats.avgResume },
      { metric: L(['Average profile completion', 'औसत प्रोफ़ाइल पूर्णता']), value: stats.avgCompletion },
      { metric: t('adm.interviewPart'), value: `${stats.interviewParticipation}%` },
      { metric: L(['Interview sessions', 'इंटरव्यू सत्र']), value: stats.interviewSessions },
      { metric: L(['Applications saved', 'सेव किए आवेदन']), value: stats.applications },
      { metric: L(['Projects recorded', 'दर्ज प्रोजेक्ट']), value: stats.projects },
    ];
    const ok = downloadCSV('careerx-cohort-summary.csv', toCSV(rows, [
      { label: 'Metric', value: 'metric' }, { label: 'Value', value: 'value' },
    ]));
    return ok;
  };

  const top3 = insights.slice(0, 3);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><Building2 className="h-3 w-3" aria-hidden />{t('common.admin')}</>}
        title={t('adm.title')}
        sub={t('adm.sub')}
        tags={[
          <Badge key="n" tone="accent" icon={Users}>{stats.total} {L(['students in cohort', 'कोहोर्ट के छात्र'])}</Badge>,
          <Badge key="a" tone="ok" icon={Activity}>{stats.weekly} {L(['active this week', 'इस सप्ताह सक्रिय'])}</Badge>,
          <DemoTag key="d" />,
        ]}
        actions={
          <>
            <Button size="sm" variant="ghost" icon={Download} onClick={exportSummary}>{t('adm.export')}</Button>
            <Button size="sm" to="/admin/skill-insights" iconRight={ArrowRight}>{t('adm.aiInsights')}</Button>
          </>
        }
      />

      <DemoNotice tone="warn" icon={AlertTriangle}>
        {L([`Every number on this screen is computed from the ${stats.total}-student demo cohort bundled with this build. No real institution or student data is used, and nothing is sent to a server.`,
          `इस स्क्रीन का हर आँकड़ा इस बिल्ड के साथ आए ${stats.total}-छात्र डेमो कोहोर्ट से गिना जाता है। कोई वास्तविक संस्था या छात्र डेटा उपयोग नहीं होता, और कुछ भी सर्वर पर नहीं जाता।`])}
      </DemoNotice>

      {/* headline stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('adm.totalStudents')} value={stats.total} icon={Users} tone="brand" to="/admin/users"
          sub={L([`${stats.active} active in 30 days · ${stats.weekly} this week`, `${stats.active} 30 दिन में सक्रिय · ${stats.weekly} इस सप्ताह`])} />
        <Stat label={t('adm.avgReadiness')} value={`${stats.avgReadiness}/100`} icon={Gauge} tone="ok" to="/admin/analytics"
          sub={L([`Employability average ${stats.avgEmployability}/100`, `औसत रोज़गार-योग्यता ${stats.avgEmployability}/100`])} />
        <Stat label={t('adm.resumeReady')} value={`${Math.round((stats.resumeReady / stats.total) * 100)}%`} icon={FileText} tone="accent" to="/admin/analytics"
          sub={L([`${stats.resumeReady} resumes score 75+ (avg ${stats.avgResume})`, `${stats.resumeReady} रिज़्यूमे 75+ (औसत ${stats.avgResume})`])} />
        <Stat label={t('adm.interviewPart')} value={`${stats.interviewParticipation}%`} icon={Mic} tone="warn" to="/admin/activities"
          sub={L([`${stats.interviewSessions} sessions across the cohort`, `कोहोर्ट में ${stats.interviewSessions} सत्र`])} />
      </div>

      {/* trend + distribution */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[15px] font-bold">{t('adm.trend')}</h2>
            <Badge tone="muted" icon={CalendarDays}>{L(['6 checkpoints', '6 चेकपॉइंट'])}</Badge>
            <Button size="sm" variant="quiet" className="ml-auto" to="/admin/analytics" iconRight={ArrowRight}>{t('nav.admin.analytics')}</Button>
          </div>
          <TrendChart
            className="mt-3.5"
            data={trendData}
            height={260}
            yDomain={[0, 100]}
            series={[
              { key: 'readiness', name: L(['Readiness', 'रेडीनेस']), color: 'brand' },
              { key: 'resumes', name: L(['Resumes built', 'बने रिज़्यूमे']), color: 'accent' },
              { key: 'interviews', name: L(['Interviews', 'इंटरव्यू']), color: 'ok' },
            ]}
          />
          <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-3">
            {[
              { k: L(['Applications saved', 'सेव किए आवेदन']), v: stats.applications, icon: Briefcase },
              { k: L(['Projects recorded', 'दर्ज प्रोजेक्ट']), v: stats.projects, icon: Rocket },
              { k: L(['Profile completion', 'प्रोफ़ाइल पूर्णता']), v: `${stats.avgCompletion}%`, icon: Sparkles },
            ].map((x) => (
              <div key={x.k[0]} className="flex items-center gap-2 rounded-xl border border-line bg-surface2/40 p-2.5">
                <x.icon className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                <span className="muted truncate text-[11px]">{x.k}</span>
                <span className="ml-auto font-display text-[13px] font-bold tabular-nums">{x.v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-[15px] font-bold">{t('adm.readinessDist')}</h2>
          <p className="muted mt-1 text-[12px]">{L([`${stats.total} students grouped by readiness band`, `${stats.total} छात्र रेडीनेस बैंड अनुसार`])}</p>
          <DonutChart className="mt-2" data={donutData} height={210} innerLabel={`${stats.avgReadiness}`} />
          <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
            {stats.buckets.map((b, i) => (
              <li key={b.id} className="flex items-center gap-2 text-[12px]">
                <span className={cnDot(i)} aria-hidden />
                <span className="text-ink">{L(b.n)}</span>
                <span className="muted ml-auto tabular-nums">{b.n_students} · {Math.round((b.n_students / stats.total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* gaps + career paths + courses */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[15px] font-bold">{t('adm.skillGaps')}</h2>
            <Button size="sm" variant="quiet" className="ml-auto" to="/admin/skill-insights" iconRight={ArrowRight}>{t('nav.admin.insights')}</Button>
          </div>
          <BarListChart className="mt-3" data={gapData} height={Math.max(180, gapData.length * 34)} unit="%" color="warn" />
          <p className="muted mt-2 text-[11px]">{L(['Share of students with this gap open, computed from their self-rated skills.', 'उनके स्व-मूल्यांकित कौशल से गिना गया, यह गैप खुला रखने वाले छात्रों का हिस्सा।'])}</p>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[15px] font-bold">{t('adm.careerPaths')}</h2>
            <Badge tone="muted" className="ml-auto">{stats.careerPaths.length}</Badge>
          </div>
          <ul className="mt-3 space-y-2.5">
            {stats.careerPaths.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Meter value={c.pct} size="sm" tone={c.pct >= 30 ? 'brand' : 'accent'} label={L(c.career?.n || [c.id, c.id])} right={`${c.n} · ${c.pct}%`} />
              </li>
            ))}
          </ul>
          <p className="muted mt-3 border-t border-line pt-2.5 text-[11px]">
            {L([`Top path covers ${stats.careerPaths[0]?.pct || 0}% of the cohort — concentration risk worth monitoring.`,
              `शीर्ष पथ कोहोर्ट का ${stats.careerPaths[0]?.pct || 0}% है — एकाग्रता जोखिम पर नज़र रखें।`])}
          </p>
        </Card>

        <Card>
          <h2 className="font-display text-[15px] font-bold">{t('adm.popularCourses')}</h2>
          <p className="muted mt-1 text-[12px]">{L(['Most saved sample courses in this cohort.', 'इस कोहोर्ट में सबसे अधिक सेव किए गए नमूना कोर्स।'])}</p>
          {stats.popularCourses.length ? (
            <ul className="mt-3 space-y-2">
              {stats.popularCourses.map((c) => (
                <li key={c.id} className="rounded-xl border border-line bg-surface2/40 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 text-[12px] font-semibold leading-snug">{L(c.course?.n || [c.id, c.id])}</span>
                    <Badge tone="brand">{c.n}</Badge>
                  </div>
                  <div className="muted mt-1 text-[10.5px]">{c.course?.provider || L(['Sample listing', 'नमूना सूची'])}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted mt-3 text-[12px]">{L(['No course saves recorded in this cohort.', 'इस कोहोर्ट में कोई कोर्स सेव दर्ज नहीं।'])}</p>
          )}
          <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
            <DemoTag />
            <span className="muted text-[10.5px]">{L(['Sample catalogue — no provider partnership.', 'नमूना कैटलॉग — कोई प्रदाता साझेदारी नहीं।'])}</span>
          </div>
        </Card>
      </div>

      {/* AI institutional insights preview */}
      <Card grad className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-2">
          <h2 className="font-display text-[15px] font-bold">{t('adm.aiInsights')}</h2>
          <AILabel />
          <Button size="sm" variant="ghost" className="ml-auto" to="/admin/skill-insights" iconRight={ArrowRight}>{L(['All insights', 'सभी इनसाइट्स'])}</Button>
        </div>
        <div className="relative mt-3.5 grid gap-3 lg:grid-cols-3">
          {top3.map((ins) => {
            const sev = SEV[ins.severity] || SEV.info;
            const Icon = INSIGHT_ICON[ins.icon] || sev.Icon;
            return (
              <div key={ins.id} className={cnCard(sev.tone)}>
                <div className="flex items-center gap-2">
                  <Icon className={cnIcon(sev.tone)} aria-hidden />
                  <h3 className="min-w-0 font-display text-[13px] font-bold leading-snug">{L(ins.title)}</h3>
                </div>
                <p className="muted mt-1.5 text-[11.5px] leading-relaxed">{L(ins.text)}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {ins.evidence?.map((e) => <Badge key={e} tone="muted" className="font-mono text-[9.5px]">{e}</Badge>)}
                  {ins.action ? (
                    <Button size="sm" variant="quiet" className="ml-auto" to={ins.action.to} iconRight={ArrowRight}>{L(ins.action.label)}</Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="relative mt-3.5 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <ProgressRing value={stats.avgReadiness} size={54} stroke={6} tone="ok" />
          <p className="muted min-w-0 flex-1 text-[11px] leading-relaxed">
            {t('adm.insightsNote')} {L(['Insights are rule-based summaries of the cohort statistics — not a trained model, and not a prediction about any individual student.',
              'इनसाइट्स कोहोर्ट आँकड़ों के नियम-आधारित सारांश हैं — न प्रशिक्षित मॉडल, न किसी व्यक्तिगत छात्र के बारे में भविष्यवाणी।'])}
          </p>
        </div>
      </Card>

      {/* branch readiness */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-[15px] font-bold">{t('adm.branchMix')}</h2>
          <Button size="sm" variant="quiet" className="ml-auto" to="/admin/users" iconRight={ArrowRight}>{t('nav.admin.users')}</Button>
        </div>
        <div className="mt-3.5 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[12.5px]">
            <thead>
              <tr className="muted border-b border-line text-[10.5px] uppercase tracking-wider">
                <th className="py-2 pr-3 font-bold">{L(['Branch', 'ब्रांच'])}</th>
                <th className="py-2 pr-3 font-bold">{L(['Students', 'छात्र'])}</th>
                <th className="py-2 pr-3 font-bold">{t('adm.avgReadiness')}</th>
                <th className="py-2 font-bold">{L(['Share', 'हिस्सा'])}</th>
              </tr>
            </thead>
            <tbody>
              {stats.branchMix.map((b) => (
                <tr key={b.branch} className="border-b border-line/70 last:border-0">
                  <td className="py-2.5 pr-3 font-semibold">{b.branch}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{b.n}</td>
                  <td className="py-2.5 pr-3">
                    <Meter value={b.readiness} size="xs" tone={b.readiness >= 70 ? 'ok' : b.readiness >= 50 ? 'brand' : 'warn'} right={`${b.readiness}`} />
                  </td>
                  <td className="muted py-2.5 tabular-nums">{Math.round((b.n / stats.total) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <TrendingUp className="h-4 w-4 text-ok" aria-hidden />
          <h2 className="font-display text-[14px] font-bold">{L(['Next steps for the placement cell', 'प्लेसमेंट सेल के अगले कदम'])}</h2>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {[
            { to: '/admin/skill-insights', icon: AlertTriangle, en: 'Run one workshop on the two most common gaps', hi: 'दो सबसे आम गैप पर एक कार्यशाला चलाएँ' },
            { to: '/admin/activities', icon: Activity, en: 'Nudge students inactive for more than 14 days', hi: '14 दिन से निष्क्रिय छात्रों को याद दिलाएँ' },
            { to: '/admin/opportunities', icon: Briefcase, en: 'Review which sample listings students see', hi: 'देखें छात्रों को कौन सी नमूना सूचियाँ दिखती हैं' },
          ].map((x) => (
            <Button key={x.to} variant="ghost" to={x.to} className="justify-start" icon={x.icon}>{L([x.en, x.hi])}</Button>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* small local style helpers keep the JSX readable */
const cnDot = (i) => ['h-2.5 w-2.5 shrink-0 rounded-full bg-bad', 'h-2.5 w-2.5 shrink-0 rounded-full bg-warn', 'h-2.5 w-2.5 shrink-0 rounded-full bg-accent', 'h-2.5 w-2.5 shrink-0 rounded-full bg-brand', 'h-2.5 w-2.5 shrink-0 rounded-full bg-ok'][i] || 'h-2.5 w-2.5 shrink-0 rounded-full bg-muted';
const cnCard = (tone) => `rounded-xl border p-3 ${tone === 'bad' ? 'border-bad/30 bg-bad/[0.06]' : tone === 'warn' ? 'border-warn/30 bg-warn/[0.06]' : 'border-line bg-surface2/50'}`;
const cnIcon = (tone) => `h-3.5 w-3.5 shrink-0 ${tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-brand'}`;
