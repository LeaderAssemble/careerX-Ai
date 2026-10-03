import { useMemo, useState } from 'react';
import {
  Users, Search, X, Download, ArrowRight, GraduationCap, Target, FileText, Mic,
  Rocket, Briefcase, Clock, ChevronDown, ChevronUp, Mail, MapPin, AlertTriangle, Sparkles,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import {
  PageHeader, Card, Badge, Button, Chip, Input, Select, Meter, Modal, EmptyState, DemoTag, Avatar, ProgressRing, KeyValue,
} from '../../components/ui/primitives';
import { DemoNotice } from '../../components/app/parts';
import { getCohort, getStats, searchStudents, studentDetail, toCSV, downloadCSV } from '../../services/adminService';
import { BRANCHES } from '../../data/catalog';
import { CAREERS } from '../../data/careers';
import { cn, relativeTime } from '../../lib/utils';

const PAGE = 12;
const SORTS = [
  { id: 'readiness', label: ['Readiness', 'रेडीनेस'] },
  { id: 'resumeScore', label: ['Resume score', 'रिज़्यूमे स्कोर'] },
  { id: 'completion', label: ['Profile completion', 'प्रोफ़ाइल पूर्णता'] },
  { id: 'lastActiveDays', label: ['Last active', 'अंतिम सक्रियता'] },
  { id: 'name', label: ['Name', 'नाम'] },
];

export default function AdminUsers() {
  const { t, L, lang } = useI18n();
  const cohort = useMemo(() => getCohort(), []);
  const stats = useMemo(() => getStats(cohort), [cohort]);

  const [q, setQ] = useState('');
  const [branch, setBranch] = useState('all');
  const [career, setCareer] = useState('all');
  const [readiness, setReadiness] = useState('all');
  const [activity, setActivity] = useState('all');
  const [sort, setSort] = useState('readiness');
  const [dir, setDir] = useState('desc');
  const [limit, setLimit] = useState(PAGE);
  const [openId, setOpenId] = useState(null);

  const rows = useMemo(() => {
    const found = searchStudents(cohort, { q, branch, career, readiness, activity });
    const sorted = [...found].sort((a, b) => {
      if (sort === 'name') return dir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      const d = (a[sort] ?? 0) - (b[sort] ?? 0);
      return dir === 'asc' ? d : -d;
    });
    return sorted;
  }, [cohort, q, branch, career, readiness, activity, sort, dir]);

  const detail = useMemo(() => (openId ? studentDetail(cohort, openId) : null), [cohort, openId]);
  const activeFilters = [q, branch !== 'all', career !== 'all', readiness !== 'all', activity !== 'all'].filter(Boolean).length;
  const clearAll = () => { setQ(''); setBranch('all'); setCareer('all'); setReadiness('all'); setActivity('all'); };
  const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';

  const exportCSV = () => {
    downloadCSV('careerx-students.csv', toCSV(rows, [
      { label: 'Name', value: 'name' },
      { label: 'Email', value: 'email' },
      { label: 'Branch', value: 'branch' },
      { label: 'Graduation year', value: 'gradYear' },
      { label: 'CGPA', value: 'cgpa' },
      { label: 'Target career', value: (r) => L(r.targetCareerName) },
      { label: 'Readiness', value: 'readiness' },
      { label: 'Employability', value: 'employability' },
      { label: 'Resume score', value: 'resumeScore' },
      { label: 'Profile completion', value: 'completion' },
      { label: 'Interviews', value: 'interviews' },
      { label: 'Projects', value: 'projects' },
      { label: 'Applications', value: 'applications' },
      { label: 'Open skill gaps', value: (r) => r.skillGaps.join('; ') },
      { label: 'Last active (days ago)', value: 'lastActiveDays' },
    ]));
  };

  const sortButton = (id) => (
    <button type="button" onClick={() => { if (sort === id) setDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSort(id); setDir('desc'); } }}
      className="inline-flex items-center gap-1 font-bold uppercase tracking-wider hover:text-ink" aria-sort={sort === id ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      {L(SORTS.find((s) => s.id === id).label)}
      {sort === id ? (dir === 'asc' ? <ChevronUp className="h-3 w-3" aria-hidden /> : <ChevronDown className="h-3 w-3" aria-hidden />) : null}
    </button>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<><Users className="h-3 w-3" aria-hidden />{t('nav.admin.users')}</>}
        title={t('nav.admin.users')}
        sub={L(['Search, sort and inspect students in this institution cohort. Row-level access control belongs on the server.', 'इस संस्थान कोहोर्ट के छात्रों को खोजें, क्रमबद्ध करें और देखें। रो-स्तरीय एक्सेस नियंत्रण सर्वर पर लागू होना चाहिए।'])}
        tags={[
          <Badge key="n" tone="accent">{t('common.results', { n: rows.length })}</Badge>,
          <Badge key="a" tone="ok">{stats.weekly} {L(['active this week', 'इस सप्ताह सक्रिय'])}</Badge>,
          <Badge key="i" tone="warn">{rows.filter((r) => r.lastActiveDays > 14).length} {L(['inactive 14+ days', '14+ दिन निष्क्रिय'])}</Badge>,
          <DemoTag key="d" />,
        ]}
        actions={
          <>
            <Button size="sm" variant="ghost" icon={Download} onClick={exportCSV} disabled={!rows.length}>{t('adm.export')}</Button>
            <Button size="sm" to="/admin/analytics" iconRight={ArrowRight}>{t('nav.admin.analytics')}</Button>
          </>
        }
      />

      <DemoNotice tone="warn" icon={AlertTriangle}>
        {L(['All students below are fictional sample records generated for this hackathon demo. Names, emails and scores are not real people.',
          'नीचे के सभी छात्र इस हैकाथॉन डेमो के लिए बनाए गए काल्पनिक नमूना रिकॉर्ड हैं। नाम, ईमेल और स्कोर वास्तविक लोग नहीं हैं।'])}
      </DemoNotice>

      {/* filters */}
      <Card className="p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <Input className="pl-9" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder={t('adm.searchUsers')} aria-label={t('adm.searchUsers')} />
            {q ? <button type="button" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink" aria-label={t('common.clear')}><X className="h-3.5 w-3.5" aria-hidden /></button> : null}
          </div>
          <Select className="w-auto min-w-[150px]" value={branch} onChange={(e) => { setBranch(e.target.value); setLimit(PAGE); }} aria-label={L(['Branch', 'ब्रांच'])}>
            <option value="all">{L(['Branch', 'ब्रांच'])}: {t('common.all')}</option>
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
          <Select className="w-auto min-w-[170px]" value={career} onChange={(e) => { setCareer(e.target.value); setLimit(PAGE); }} aria-label={t('adm.careerPaths')}>
            <option value="all">{L(['Career path', 'करियर पथ'])}: {t('common.all')}</option>
            {CAREERS.map((c) => <option key={c.id} value={c.id}>{L(c.n)}</option>)}
          </Select>
          <Select className="w-auto min-w-[150px]" value={readiness} onChange={(e) => { setReadiness(e.target.value); setLimit(PAGE); }} aria-label={t('adm.avgReadiness')}>
            <option value="all">{L(['Readiness', 'रेडीनेस'])}: {t('common.all')}</option>
            <option value="low">{L(['Below 50', '50 से कम'])}</option>
            <option value="mid">{L(['50 – 74', '50 – 74'])}</option>
            <option value="high">{L(['75 and above', '75 और ऊपर'])}</option>
          </Select>
          <Select className="w-auto min-w-[150px]" value={activity} onChange={(e) => { setActivity(e.target.value); setLimit(PAGE); }} aria-label={L(['Activity', 'सक्रियता'])}>
            <option value="all">{L(['Activity', 'सक्रियता'])}: {t('common.all')}</option>
            <option value="active">{L(['Active (7 days)', 'सक्रिय (7 दिन)'])}</option>
            <option value="inactive">{L(['Inactive (14+ days)', 'निष्क्रिय (14+ दिन)'])}</option>
          </Select>
          {activeFilters ? <Button size="sm" variant="quiet" icon={X} onClick={clearAll}>{t('common.clear')} ({activeFilters})</Button> : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          <span className="muted text-[10.5px] font-bold uppercase tracking-wider">{L(['Quick filters', 'त्वरित फ़िल्टर'])}</span>
          <Chip onClick={() => { setReadiness('low'); setLimit(PAGE); }} active={readiness === 'low'}>{L(['Needs support', 'सहायता चाहिए'])}</Chip>
          <Chip onClick={() => { setActivity('inactive'); setLimit(PAGE); }} active={activity === 'inactive'}>{L(['Inactive', 'निष्क्रिय'])}</Chip>
          <Chip onClick={() => { setSort('resumeScore'); setDir('asc'); setLimit(PAGE); }}>{L(['Weakest resumes', 'कमज़ोर रिज़्यूमे'])}</Chip>
          <Chip onClick={() => { setSort('readiness'); setDir('desc'); setLimit(PAGE); }}>{L(['Top performers', 'शीर्ष प्रदर्शन'])}</Chip>
        </div>
      </Card>

      {/* table */}
      {rows.length ? (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-[12.5px]">
              <thead>
                <tr className="muted border-b border-line bg-surface2/60 text-[10.5px]">
                  <th className="px-3.5 py-2.5 font-bold">{t('adm.user')}</th>
                  <th className="px-3 py-2.5 font-bold">{L(['Branch / year', 'ब्रांच / वर्ष'])}</th>
                  <th className="px-3 py-2.5 font-bold">{L(['Target career', 'लक्षित करियर'])}</th>
                  <th className="px-3 py-2.5 font-bold">{sortButton('readiness')}</th>
                  <th className="px-3 py-2.5 font-bold">{sortButton('resumeScore')}</th>
                  <th className="px-3 py-2.5 font-bold">{sortButton('completion')}</th>
                  <th className="px-3 py-2.5 font-bold">{L(['Practice', 'अभ्यास'])}</th>
                  <th className="px-3 py-2.5 font-bold">{sortButton('lastActiveDays')}</th>
                  <th className="px-3.5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map((s) => (
                  <tr key={s.id} className="border-b border-line/60 transition last:border-0 hover:bg-surface2/60">
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} size={32} />
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{s.name}</div>
                          <div className="muted truncate text-[10.5px]">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="truncate">{s.branch}</div>
                      <div className="muted text-[10.5px]">{s.gradYear} · CGPA {s.cgpa}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="line-clamp-2 max-w-[160px] text-[11.5px]">{L(s.targetCareerName)}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Meter value={s.readiness} size="xs" tone={s.readiness >= 75 ? 'ok' : s.readiness >= 50 ? 'brand' : 'bad'} right={`${s.readiness}`} />
                    </td>
                    <td className="px-3 py-2.5">
                      <Meter value={s.resumeScore} size="xs" tone={s.resumeScore >= 75 ? 'ok' : 'warn'} right={`${s.resumeScore}`} />
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{s.completion}%</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={s.interviews ? 'accent' : 'muted'} icon={Mic}>{s.interviews}</Badge>
                        <Badge tone={s.projects ? 'brand' : 'muted'} icon={Rocket}>{s.projects}</Badge>
                        <Badge tone={s.applications ? 'ok' : 'muted'} icon={Briefcase}>{s.applications}</Badge>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold', s.lastActiveDays > 14 ? 'text-bad' : s.lastActiveDays > 7 ? 'text-warn' : 'text-ok')}>
                        <Clock className="h-3 w-3" aria-hidden />{s.lastActiveDays}{L(['d', 'दि'])}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <Button size="sm" variant="quiet" onClick={() => setOpenId(s.id)}>{t('adm.viewProfile')}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-3.5 py-3">
            <span className="muted text-[11px]">{L([`Showing ${Math.min(limit, rows.length)} of ${rows.length}`, `${rows.length} में से ${Math.min(limit, rows.length)} दिखा रहे`])}</span>
            {limit < rows.length ? (
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setLimit((l) => l + PAGE)}>{L(['Load more', 'और लोड करें'])}</Button>
            ) : <DemoTag className="ml-auto" />}
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={Users}
          title={t('adm.noUsers')}
          body={L(['Try a different branch, career path or activity filter.', 'कोई दूसरी ब्रांच, करियर पथ या सक्रियता फ़िल्टर आज़माएँ।'])}
          action={<Button size="sm" variant="ghost" onClick={clearAll}>{t('common.clear')}</Button>}
        />
      )}

      {/* student detail */}
      <Modal
        open={!!detail}
        onClose={() => setOpenId(null)}
        size="lg"
        title={detail ? detail.name : ''}
        sub={detail ? `${detail.email} · ${detail.branch} · ${detail.gradYear}` : ''}
        icon={GraduationCap}
        footer={
          detail ? (
            <>
              <Button variant="ghost" onClick={() => setOpenId(null)}>{t('common.close')}</Button>
              <Button icon={Download} onClick={() => downloadCSV(`careerx-student-${detail.id}.csv`, toCSV([detail], [
                { label: 'Name', value: 'name' }, { label: 'Email', value: 'email' }, { label: 'Branch', value: 'branch' },
                { label: 'Readiness', value: 'readiness' }, { label: 'Resume score', value: 'resumeScore' },
                { label: 'Interviews', value: 'interviews' }, { label: 'Applications', value: 'applications' },
                { label: 'Open gaps', value: (r) => r.skillGaps.join('; ') },
              ]))}>{t('adm.export')}</Button>
            </>
          ) : null
        }
      >
        {detail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <ProgressRing value={detail.readiness} size={92} stroke={9} tone={detail.readiness >= 75 ? 'ok' : detail.readiness >= 50 ? 'brand' : 'bad'} label={`${detail.readiness}`} sublabel={t('dash.readiness')} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="brand" icon={Target}>{L(detail.career?.n || detail.targetCareerName)}</Badge>
                  <Badge tone={detail.lastActiveDays > 14 ? 'bad' : 'ok'} icon={Clock}>
                    {L([`Last active ${detail.lastActiveDays} day(s) ago`, `अंतिम सक्रियता ${detail.lastActiveDays} दिन पहले`])}
                  </Badge>
                  <Badge tone="muted" icon={MapPin}>{Array.isArray(detail.city) ? L(detail.city) : detail.city}</Badge>
                </div>
                <KeyValue className="mt-3" items={[
                  { k: t('adm.avgReadiness'), v: `${detail.readiness}/100` },
                  { k: t('dash.employability'), v: `${detail.employability}/100` },
                  { k: t('adm.resumeReady'), v: `${detail.resumeScore}/100` },
                  { k: t('prof.completion'), v: `${detail.completion}%` },
                  { k: t('nav.interview'), v: `${detail.interviews} ${L(['sessions', 'सत्र'])}${detail.bestInterview ? ` · best ${detail.bestInterview}` : ''}` },
                  { k: t('nav.lab'), v: `${detail.projects} ${L(['projects', 'प्रोजेक्ट'])}` },
                ]} />
              </div>
            </div>

            <div>
              <h3 className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Open skill gaps', 'खुले स्किल गैप'])}</h3>
              <div className="flex flex-wrap gap-1.5">
                {detail.gapSkills.length ? detail.gapSkills.map((g) => <Badge key={g.id} tone="warn">{L(g.n)}</Badge>)
                  : <span className="muted text-[12px]">{L(['No gaps recorded', 'कोई गैप दर्ज नहीं'])}</span>}
              </div>
            </div>

            <div>
              <h3 className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Saved sample courses', 'सेव किए नमूना कोर्स'])}</h3>
              {detail.savedCourses.length ? (
                <ul className="space-y-1.5">
                  {detail.savedCourses.map((c) => (
                    <li key={c.id} className="flex items-start gap-2 rounded-xl border border-line bg-surface2/40 p-2.5">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                      <span className="min-w-0 text-[12px] leading-snug">{L(c.n)} <span className="muted">· {c.provider || L(['Sample listing', 'नमूना सूची'])}</span></span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted text-[12px]">{L(['No courses saved yet.', 'अभी कोई कोर्स सेव नहीं।'])}</p>}
            </div>

            <div>
              <h3 className="muted mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Recent activity', 'हाल की गतिविधि'])}</h3>
              {detail.activities.length ? (
                <ul className="space-y-1.5">
                  {detail.activities.slice(0, 6).map((a) => (
                    <li key={a.id} className="rounded-xl border border-line bg-surface2/40 p-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 flex-1 text-[12px] leading-snug">{L(a.activity)}</span>
                        <Badge tone={a.status === 'completed' ? 'ok' : a.status === 'in-progress' ? 'brand' : 'muted'}>{a.status}</Badge>
                      </div>
                      <div className="muted mt-1 text-[10.5px]">{a.category} · {relativeTime(a.at, locale)}</div>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted text-[12px]">{L(['No activity recorded for this student.', 'इस छात्र के लिए कोई गतिविधि दर्ज नहीं।'])}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface2/40 p-2.5">
              <Mail className="h-3.5 w-3.5 text-muted" aria-hidden />
              <span className="muted text-[11px]">
                {L(['Outreach (email, WhatsApp nudges, counselling slots) can be connected to the institution’s CRM here.',
                  'संपर्क (ईमेल, व्हाट्सएप रिमाइंडर, काउंसलिंग स्लॉट) इस डेमो बिल्ड में नहीं जुड़ा — प्रोडक्शन में संस्था का अपना CRM यहाँ जुड़ेगा।'])}
              </span>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
