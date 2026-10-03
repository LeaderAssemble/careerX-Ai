import { useMemo, useState } from 'react';
import {
  Activity, Search, X, Download, CalendarDays, Users, Check, Clock, ArrowRight,
  Filter, GraduationCap, Target, AlertTriangle, Sparkles,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import {
  PageHeader, Card, Badge, Button, Chip, Input, Select, Segmented, Modal, EmptyState,
  DemoTag, Avatar, KeyValue, ProgressRing, Meter, Stat,
} from '../../components/ui/primitives';
import { DemoNotice } from '../../components/app/parts';
import { getCohort, filterActivities, activityFacets, studentDetail, toCSV, downloadCSV } from '../../services/adminService';
import { cn, relativeTime, groupBy } from '../../lib/utils';

const STATUS_TONE = { completed: 'ok', 'in-progress': 'brand', pending: 'warn', saved: 'accent', started: 'brand' };
const CATEGORY_ICON = { course: GraduationCap, resume: Sparkles, interview: Target, application: Activity, roadmap: Check, profile: Users };

export default function AdminActivities() {
  const { t, L, lang, d } = useI18n();
  const cohort = useMemo(() => getCohort(), []);
  const facets = useMemo(() => activityFacets(cohort), [cohort]);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [group, setGroup] = useState('flat'); // 'flat' | 'day'
  const [openId, setOpenId] = useState(null);

  const rows = useMemo(
    () => filterActivities(cohort, { q, category, status }),
    [cohort, q, category, status]
  );

  const grouped = useMemo(() => {
    if (group !== 'day') return null;
    const byDay = groupBy(rows, (a) => new Date(a.at).toISOString().slice(0, 10));
    return Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows, group]);

  const detail = useMemo(() => (openId ? studentDetail(cohort, openId) : null), [cohort, openId]);
  const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';

  const catCounts = useMemo(() => {
    const c = {};
    cohort.activities.forEach((a) => { c[a.category] = (c[a.category] || 0) + 1; });
    return c;
  }, [cohort.activities]);

  const last7 = useMemo(() => rows.filter((a) => Date.now() - new Date(a.at).getTime() <= 7 * 86400000).length, [rows]);
  const uniqueStudents = useMemo(() => new Set(rows.map((a) => a.userId)).size, [rows]);
  const activeFilters = [q, category !== 'all', status !== 'all'].filter(Boolean).length;
  const clearAll = () => { setQ(''); setCategory('all'); setStatus('all'); };

  const exportCSV = () => {
    downloadCSV('careerx-activities.csv', toCSV(rows, [
      { label: 'When', value: (a) => new Date(a.at).toISOString() },
      { label: 'Student', value: 'userName' },
      { label: 'Branch', value: 'branch' },
      { label: 'Activity', value: (a) => L(a.activity) },
      { label: 'Category', value: 'category' },
      { label: 'Status', value: 'status' },
    ]));
  };

  const rowFor = (a) => {
    const Icon = CATEGORY_ICON[a.category] || Activity;
    return (
      <tr key={a.id} className="border-b border-line/60 transition last:border-0 hover:bg-surface2/60">
        <td className="px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line bg-surface2 text-brand"><Icon className="h-3.5 w-3.5" aria-hidden /></span>
            <div className="min-w-0">
              <div className="truncate text-[12px] font-semibold">{L(a.activity)}</div>
              <div className="muted truncate text-[10.5px]">{a.category}</div>
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5">
          <button type="button" onClick={() => setOpenId(a.userId)} className="flex items-center gap-2 text-left transition hover:opacity-80">
            <Avatar name={a.userName} size={26} />
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-semibold">{a.userName}</span>
              <span className="muted block truncate text-[10.5px]">{a.branch}</span>
            </span>
          </button>
        </td>
        <td className="px-3 py-2.5">
          <Badge tone={STATUS_TONE[a.status] || 'muted'}>{a.status}</Badge>
        </td>
        <td className="muted px-3.5 py-2.5 text-right text-[11.5px]">
          <span title={new Date(a.at).toLocaleString(locale)}>{relativeTime(a.at, locale)}</span>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><Activity className="h-3 w-3" aria-hidden />{t('nav.admin.activities')}</>}
        title={t('adm.activityTable')}
        sub={L(['Recorded student activity — saved courses, resume work, interviews and applications.', 'छात्र गतिविधि — सेव कोर्स, रिज़्यूमे कार्य, इंटरव्यू और आवेदन।'])}
        tags={[
          <Badge key="n" tone="accent">{t('common.results', { n: rows.length })}</Badge>,
          <Badge key="w" tone="ok" icon={Clock}>{last7} {L(['in last 7 days', 'पिछले 7 दिनों में'])}</Badge>,
          <Badge key="s" tone="brand" icon={Users}>{uniqueStudents} {L(['students', 'छात्र'])}</Badge>,
          <DemoTag key="d" />,
        ]}
        actions={
          <>
            <Button size="sm" variant="ghost" icon={Download} onClick={exportCSV} disabled={!rows.length}>{t('adm.export')}</Button>
            <Button size="sm" to="/admin/users" iconRight={ArrowRight}>{t('nav.admin.users')}</Button>
          </>
        }
      />

      <DemoNotice tone="warn" icon={AlertTriangle}>
        {L(['This log is generated from the bundled demo cohort. A production deployment would write these events server-side with per-institution access control and a retention policy.',
          'यह लॉग बंडल किए गए डेमो कोहोर्ट से बनता है। प्रोडक्शन में ये इवेंट सर्वर-साइड लिखे जाते, संस्था-अनुसार एक्सेस नियंत्रण और रिटेंशन नीति के साथ।'])}
      </DemoNotice>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={L(['Total events', 'कुल इवेंट'])} value={cohort.activities.length} icon={Activity} tone="brand"
          sub={L([`${uniqueStudents} of ${cohort.students.length} students appear here`, `${cohort.students.length} में से ${uniqueStudents} छात्र यहाँ हैं`])} />
        <Stat label={L(['Last 7 days', 'पिछले 7 दिन'])} value={last7} icon={Clock} tone="ok"
          sub={L(['Filtered by your current search', 'आपकी वर्तमान खोज अनुसार'])} />
        <Stat label={L(['Categories', 'श्रेणियाँ'])} value={facets.categories.length} icon={Filter} tone="accent"
          sub={facets.categories.slice(0, 3).join(' · ')} />
        <Stat label={L(['Completed actions', 'पूर्ण क्रियाएँ'])} value={cohort.activities.filter((a) => a.status === 'completed').length} icon={Check} tone="warn"
          sub={L([`${Math.round((cohort.activities.filter((a) => a.status === 'completed').length / cohort.activities.length) * 100)}% of all events`, `सभी इवेंट का ${Math.round((cohort.activities.filter((a) => a.status === 'completed').length / cohort.activities.length) * 100)}%`])} />
      </div>

      {/* filters */}
      <Card className="p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={L(['Search student or activity…', 'छात्र या क्रिया खोजें…'])} aria-label={L(['Search activity log', 'गतिविधि लॉग खोजें'])} />
            {q ? <button type="button" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink" aria-label={t('common.clear')}><X className="h-3.5 w-3.5" aria-hidden /></button> : null}
          </div>
          <Select className="w-auto min-w-[150px]" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={L(['Status', 'स्थिति'])}>
            <option value="all">{L(['Status', 'स्थिति'])}: {t('common.all')}</option>
            {facets.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Segmented value={group} onChange={setGroup} options={[
            { value: 'flat', label: L(['Newest first', 'नया पहले']) },
            { value: 'day', label: L(['Group by day', 'दिन अनुसार']) },
          ]} />
          {activeFilters ? <Button size="sm" variant="quiet" icon={X} onClick={clearAll}>{t('common.clear')} ({activeFilters})</Button> : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          <span className="muted text-[10.5px] font-bold uppercase tracking-wider">{t('adm.filterCat')}</span>
          <Chip active={category === 'all'} onClick={() => setCategory('all')}>{t('common.all')} <span className="opacity-60">{cohort.activities.length}</span></Chip>
          {facets.categories.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c} <span className="opacity-60">{catCounts[c] || 0}</span>
            </Chip>
          ))}
        </div>
      </Card>

      {/* table */}
      {rows.length ? (
        group === 'flat' ? (
          <Card className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[12.5px]">
                <thead>
                  <tr className="muted border-b border-line bg-surface2/60 text-[10.5px] uppercase tracking-wider">
                    <th className="px-3.5 py-2.5 font-bold">{t('adm.activity')}</th>
                    <th className="px-3 py-2.5 font-bold">{t('adm.user')}</th>
                    <th className="px-3 py-2.5 font-bold">{L(['Status', 'स्थिति'])}</th>
                    <th className="px-3.5 py-2.5 text-right font-bold">{L(['When', 'कब'])}</th>
                  </tr>
                </thead>
                <tbody>{rows.map(rowFor)}</tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-3.5 py-3">
              <DemoTag />
              <span className="muted text-[10.5px]">{L([`Showing all ${rows.length} matching events`, `${rows.length} मिलते इवेंट दिखाए जा रहे हैं`])}</span>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {grouped.map(([day, list]) => (
              <Card key={day} className="p-0">
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-3.5 py-2.5">
                  <CalendarDays className="h-3.5 w-3.5 text-brand" aria-hidden />
                  <h2 className="font-display text-[13px] font-bold">{d(day, { weekday: 'short', day: 'numeric', month: 'short' })}</h2>
                  <Badge tone="muted">{list.length} {L(['events', 'इवेंट'])}</Badge>
                  <span className="muted ml-auto text-[11px]">{L([`${new Set(list.map((a) => a.userId)).size} students`, `${new Set(list.map((a) => a.userId)).size} छात्र`])}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-[12.5px]">
                    <tbody>{list.map(rowFor)}</tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        <EmptyState
          icon={Activity}
          title={t('common.noResults')}
          body={L(['No activity matches this search or filter combination.', 'इस खोज या फ़िल्टर संयोजन से कोई गतिविधि मेल नहीं खाती।'])}
          action={<Button size="sm" variant="ghost" onClick={clearAll}>{t('common.clear')}</Button>}
        />
      )}

      {/* student modal */}
      <Modal
        open={!!detail}
        onClose={() => setOpenId(null)}
        size="md"
        title={detail ? detail.name : ''}
        sub={detail ? `${detail.branch} · ${detail.gradYear}` : ''}
        icon={Users}
        footer={detail ? <Button variant="ghost" onClick={() => setOpenId(null)}>{t('common.close')}</Button> : null}
      >
        {detail ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <ProgressRing value={detail.readiness} size={78} stroke={8} tone={detail.readiness >= 75 ? 'ok' : 'brand'} label={`${detail.readiness}`} sublabel={L(['readiness', 'रेडीनेस'])} />
              <div className="min-w-0 flex-1">
                <KeyValue items={[
                  { k: L(['Target career', 'लक्षित करियर']), v: L(detail.career?.n || detail.targetCareerName) },
                  { k: t('adm.resumeReady'), v: `${detail.resumeScore}/100` },
                  { k: L(['Last active', 'अंतिम सक्रियता']), v: L([`${detail.lastActiveDays} day(s) ago`, `${detail.lastActiveDays} दिन पहले`]) },
                ]} />
              </div>
            </div>
            <div>
              <h3 className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Activity by this student', 'इस छात्र की गतिविधि'])}</h3>
              {detail.activities.length ? (
                <ul className="space-y-1.5">
                  {detail.activities.map((a) => (
                    <li key={a.id} className={cn('rounded-xl border border-line bg-surface2/40 p-2.5')}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 flex-1 text-[12px] leading-snug">{L(a.activity)}</span>
                        <Badge tone={STATUS_TONE[a.status] || 'muted'}>{a.status}</Badge>
                      </div>
                      <div className="muted mt-1 text-[10.5px]">{a.category} · {relativeTime(a.at, locale)}</div>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted text-[12px]">{L(['No events recorded.', 'कोई इवेंट दर्ज नहीं।'])}</p>}
            </div>
            <div>
              <h3 className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Open skill gaps', 'खुले स्किल गैप'])}</h3>
              <div className="flex flex-wrap gap-1.5">
                {detail.gapSkills.length ? detail.gapSkills.map((g) => <Badge key={g.id} tone="warn">{L(g.n)}</Badge>) : <span className="muted text-[12px]">{L(['None recorded', 'कुछ दर्ज नहीं'])}</span>}
              </div>
              <Meter className="mt-3" value={detail.completion} size="sm" tone="brand" label={t('prof.completion')} right={`${detail.completion}%`} />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
