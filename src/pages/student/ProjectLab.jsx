import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FlaskConical, Search, X, Filter, ArrowRight, Check, CircleDot, Circle, Trophy,
  ChevronLeft, ChevronRight, ChevronDown, Lightbulb, CheckCircle2, LayoutGrid, Columns, Plus,
  Table as TableIcon, ArrowUpDown,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import { PageHeader, Card, Badge, Button, Chip, Input, Select, DemoTag, ProgressRing, Meter, Segmented } from '../../components/ui/primitives';
import { ProjectCard, NeedsProfile, DemoNotice, EmptyResults } from '../../components/app/parts';
import { IsoBarChart, HoloTile } from '../../components/ui/Charts3D';
import { SKILL_BY_ID } from '../../data/catalog';
import { cn, clamp, useRevealGroup } from '../../lib/utils';
import storage from '../../lib/storage';

/* Board columns follow the natural project lifecycle: idea → planned → building → done. */
const STAGES = ['planned', 'in-progress', 'completed'];
const COLUMNS = [
  { id: 'idea', icon: Lightbulb, tone: 'muted' },
  { id: 'planned', icon: Circle, tone: 'muted' },
  { id: 'in-progress', icon: CircleDot, tone: 'brand' },
  { id: 'completed', icon: CheckCircle2, tone: 'ok' },
];

export default function ProjectLab() {
  const { t, L } = useI18n();
  const { projects, profile, derived, activeCareer, setProjectStatus, progress } = useApp();
  const [q, setQ] = useState('');
  const [diff, setDiff] = useState('all');
  const [fitOnly, setFitOnly] = useState(false);
  const [view, setView] = useState(() => {
    let legacyView = null;
    try { legacyView = localStorage.getItem('careerx:v1:lab:view'); } catch { /* storage disabled */ }
    const v = storage.get('lab:view', null) || legacyView;
    return v === 'cards' || v === 'table' || v === 'timeline' ? v : 'board';
  }); // board | cards | table
  const [sortKey, setSortKey] = useState('fit');
  const [sortDir, setSortDir] = useState(-1);
  useEffect(() => { storage.set('lab:view', view); }, [view]);
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => -d);
    else { setSortKey(key); setSortDir(key === 'name' ? 1 : -1); }
  };
  const [hoverCol, setHoverCol] = useState(null); // drag-over highlight
  const [confettiTick, setConfettiTick] = useState(0);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (projects || []).filter((e) => {
      const p = e.project;
      if (diff !== 'all' && p.diff !== diff) return false;
      if (fitOnly && !(p.careers || []).includes(activeCareer?.id)) return false;
      if (term) {
        const hay = `${p.t[0]} ${p.t[1]} ${p.problem[0]} ${p.stack[0]} ${p.skills.join(' ')}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [projects, q, diff, fitOnly, activeCareer]);

  const gridRef = useRevealGroup([list.length, view]);

  if (!derived || !profile) return <NeedsProfile />;

  const statuses = progress.projects || {};
  const ownProjects = profile.projects || [];
  const statusOf = (entry) => entry.status || null;
  const inColumn = (colId) => list.filter((e) => (colId === 'idea' ? !statusOf(e) : statusOf(e) === colId));

  const counts = {
    idea: inColumn('idea').length,
    planned: inColumn('planned').length,
    'in-progress': inColumn('in-progress').length,
    completed: inColumn('completed').length,
  };
  const completedAll = Object.values(statuses).filter((s) => s === 'completed').length + ownProjects.filter((p) => p.status === 'completed').length;
  const inProgressAll = Object.values(statuses).filter((s) => s === 'in-progress').length + ownProjects.filter((p) => p.status === 'in-progress').length;
  const activeFilters = [!!q, diff !== 'all', fitOnly].filter(Boolean).length;
  const clearAll = () => { setQ(''); setDiff('all'); setFitOnly(false); };

  const applyStatus = (id, status) => {
    setProjectStatus(id, status);
    if (status === 'completed') setConfettiTick((c) => c + 1);
  };

  const move = (entry, dir) => {
    const cur = statusOf(entry);
    const idx = cur ? STAGES.indexOf(cur) : -1;
    const next = STAGES[clamp(idx + dir, 0, STAGES.length - 1)];
    if (next && next !== cur) applyStatus(entry.project.id, next);
  };

  const sortedList = useMemo(() => {
    const val = (e) => {
      const st = e.status || null;
      if (sortKey === 'name') return L(e.project.t).toLowerCase();
      if (sortKey === 'status') return st ? STAGES.indexOf(st) : -1;
      if (sortKey === 'weeks') return e.project.weeks || 0;
      return typeof e.score === 'number' ? e.score : -1;
    };
    return [...list].sort((a, b) => {
      const av = val(a); const bv = val(b);
      if (typeof av === 'string') return av.localeCompare(bv) * sortDir;
      return (av - bv) * sortDir;
    });
  }, [list, sortKey, sortDir, L]);

  const colLabel = (id) => (id === 'idea' ? L(['Ideas', 'आइडिया'])
    : id === 'planned' ? t('common.planned')
      : id === 'in-progress' ? t('common.inProgress')
        : t('common.completed'));

  const pipelineData = [
    { label: L(['Ideas', 'आइडिया']), value: counts.idea, color: 'text' },
    { label: L(['Planned', 'नियोजित']), value: counts.planned, color: 'brand' },
    { label: L(['Building', 'जारी']), value: counts['in-progress'], color: 'accent' },
    { label: L(['Done', 'पूर्ण']), value: counts.completed, color: 'ok' },
  ];

  return (
    <div className="space-y-5">
      <ConfettiBurst trigger={confettiTick} />
      <PageHeader
        eyebrow={<><FlaskConical className="h-3 w-3" aria-hidden />{t('nav.lab')}</>}
        title={t('lab.title')}
        sub={t('lab.sub')}
        tags={[
          <Badge key="n" tone="muted">{(projects || []).length} {L(['project ideas', 'प्रोजेक्ट आइडिया'])}</Badge>,
          <Badge key="c" tone="ok" icon={Trophy}>{completedAll} {t('common.completed')}</Badge>,
          <DemoTag key="d" />,
        ]}
        actions={<Button size="sm" variant="ghost" to="/app/skill-gap" iconRight={ArrowRight}>{t('nav.skillgap')}</Button>}
      />

      {/* pipeline + my logged projects */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card grad className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-brand/10 blur-3xl" aria-hidden />
          <div className="relative flex flex-wrap items-center gap-4">
            <ProgressRing value={Math.min(100, completedAll * 25)} size={92} stroke={9} tone="ok" label={`${completedAll}`} sublabel={t('common.completed')} />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[14px] font-bold">{L(['Build evidence, not just certificates', 'प्रमाणपत्र नहीं, प्रमाण बनाएँ'])}</h2>
              <p className="muted mt-1 text-[12px] leading-snug">
                {L([`Completing projects is worth 20 of your 100 employability points. You have ${completedAll} completed and ${inProgressAll} in progress.`,
                  `प्रोजेक्ट पूरा करने का मूल्य आपके 100 रोज़गार-योग्यता अंकों में से 20 है। आपके ${completedAll} पूर्ण और ${inProgressAll} जारी हैं।`])}
              </p>
            </div>
          </div>
          <div className="relative mt-3 border-t border-line pt-2">
            <div className="muted mb-1 text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Your project pipeline (filtered view)', 'आपकी प्रोजेक्ट पाइपलाइन (फ़िल्टर्ड दृश्य)'])}</div>
            <IsoBarChart data={pipelineData} height={160} depth={12} showGrid={false} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-[14px] font-bold">{t('lab.myProjects')}</h2>
            <Badge tone="muted" icon={FlaskConical}>{ownProjects.length}</Badge>
          </div>
          {ownProjects.length ? (
            <ul className="mt-3 space-y-2">
              {ownProjects.map((p) => (
                <li key={p.id} className="rounded-xl border border-line bg-surface2/40 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-semibold">{L(p.title)}</div>
                      <div className="muted truncate text-[10.5px]">{p.tech} {p.link ? `· ${p.link}` : ''}</div>
                    </div>
                    <Badge tone={p.status === 'completed' ? 'ok' : p.status === 'in-progress' ? 'brand' : 'muted'}>
                      {p.status === 'completed' ? t('common.completed') : p.status === 'in-progress' ? t('common.inProgress') : t('common.planned')}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted mt-2 text-[12px] leading-relaxed">{L(['Nothing logged yet — move an idea across the board below, then add it to your profile when it’s real.', 'अभी कुछ दर्ज नहीं — नीचे बोर्ड पर आइडिया आगे बढ़ाएँ, और जब सच में बन जाए तो प्रोफ़ाइल में जोड़ें।'])}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
            <Button size="sm" variant="ghost" icon={Plus} to="/app/profile">{L(['Add a project in profile', 'प्रोफ़ाइल में प्रोजेक्ट जोड़ें'])}</Button>
            <Button size="sm" variant="quiet" to="/app/resume">{t('nav.resume')}</Button>
          </div>
        </Card>
      </div>

      {/* toolbar: filters + view toggle */}
      <Card className="p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L(['Search projects, stacks or problems…', 'प्रोजेक्ट, स्टैक या समस्या खोजें…'])} aria-label={t('common.search')} />
            {q ? <button type="button" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink" aria-label={t('common.clear')}><X className="h-3.5 w-3.5" aria-hidden /></button> : null}
          </div>
          <Select value={diff} onChange={(e) => setDiff(e.target.value)} aria-label={t('common.difficulty')} className="w-auto min-w-[150px]">
            <option value="all">{t('common.difficulty')}: {t('common.all')}</option>
            <option value="beginner">{t('common.beginner')}</option>
            <option value="intermediate">{t('common.intermediate')}</option>
            <option value="advanced">{t('common.advanced')}</option>
          </Select>
          <Chip active={fitOnly} onClick={() => setFitOnly((v) => !v)} className="px-3 py-2">
            <Filter className="h-3 w-3" aria-hidden />{L([`Only for ${activeCareer ? L(activeCareer.n) : 'my target'}`, `केवल ${activeCareer ? L(activeCareer.n) : 'मेरे लक्ष्य'} के लिए`])}
          </Chip>
          {activeFilters ? <Button size="sm" variant="quiet" icon={X} onClick={clearAll}>{t('common.clear')} ({activeFilters})</Button> : null}
          <span className="muted hidden text-[10.5px] lg:block">{L(['Drag cards between columns — or use the arrows on each card.', 'कार्ड कॉलम के बीच खींचें — या हर कार्ड के तीर इस्तेमाल करें।'])}</span>
          <div className="ml-auto">
            <Segmented
              value={view} onChange={setView}
              label={L(['View', 'दृश्य'])}
              options={[
                { value: 'board', label: <span className="inline-flex items-center gap-1.5"><Columns className="h-3.5 w-3.5" aria-hidden />{L(['Board', 'बोर्ड'])}</span> },
                { value: 'cards', label: <span className="inline-flex items-center gap-1.5"><LayoutGrid className="h-3.5 w-3.5" aria-hidden />{L(['Cards', 'कार्ड'])}</span> },
                { value: 'table', label: <span className="inline-flex items-center gap-1.5"><TableIcon className="h-3.5 w-3.5" aria-hidden />{t('lab.table')}</span> },
                { value: 'timeline', label: <span className="inline-flex items-center gap-1.5"><ArrowRight className="h-3.5 w-3.5" aria-hidden />{t('lab.timeline')}</span> },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* board view: lifecycle columns — drag cards between them, or use the arrow controls */}
      {view === 'board' ? (
        list.length ? (
          <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 xl:grid xl:grid-cols-4 xl:overflow-visible">
            {COLUMNS.map((col) => {
              const items = inColumn(col.id);
              const ColIcon = col.icon;
              return (
                <section
                  key={col.id}
                  aria-label={colLabel(col.id)}
                  onDragOver={(e) => { if (col.id !== 'idea') { e.preventDefault(); setHoverCol(col.id); } }}
                  onDragLeave={() => setHoverCol((c) => (c === col.id ? null : c))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setHoverCol(null);
                    const id = e.dataTransfer.getData('text/plain');
                    if (id && col.id !== 'idea') applyStatus(id, col.id);
                  }}
                  className={cn('flex w-[82vw] max-w-[340px] shrink-0 snap-start flex-col rounded-2xl border border-line bg-surface2/30 transition xl:w-auto xl:max-w-none', hoverCol === col.id && 'dnd-over')}
                >
                  <header className={cn('flex items-center gap-2 rounded-t-2xl border-b border-line px-3.5 py-2.5',
                    col.tone === 'ok' ? 'bg-ok/[0.06]' : col.tone === 'brand' ? 'bg-brand/[0.06]' : 'bg-surface2/60')}>
                    <ColIcon className={cn('h-4 w-4', col.tone === 'ok' ? 'text-ok' : col.tone === 'brand' ? 'text-brand' : 'text-muted')} aria-hidden />
                    <h2 className="font-display text-[12.5px] font-bold">{colLabel(col.id)}</h2>
                    <span className="muted ml-auto rounded-md border border-line bg-surface px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums">{items.length}</span>
                  </header>
                  <div className="flex flex-col gap-2.5 p-2.5">
                    {items.length ? items.map((entry) => (
                      <LabCard key={entry.project.id} entry={entry} col={col.id} onMove={move} t={t} L={L}
                        onDragStart={(e) => { e.dataTransfer.setData('text/plain', entry.project.id); e.dataTransfer.effectAllowed = 'move'; }} />
                    )) : (
                      <p className="muted px-1 py-4 text-center text-[11px] leading-snug">
                        {col.id === 'idea'
                          ? L(['No untracked ideas with these filters.', 'इन फ़िल्टर में कोई नया आइडिया नहीं।'])
                          : L(['Move a project here with the arrows.', 'तीरों से प्रोजेक्ट यहाँ लाएँ।'])}
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <EmptyResults title={t('lab.empty')} body={t('job.emptyHint')} onClear={clearAll} clearLabel={t('job.clearFilters')} icon={FlaskConical} />
        )
      ) : null}

      {/* table view: classic sortable pipeline table — the "normal" place for projects */}
      {view === 'table' ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-[12px]">
              <caption className="sr-only">{t('lab.tableCap')}</caption>
              <thead>
                <tr className="border-b border-line bg-surface2/60">
                  {[
                    { key: 'name', label: t('lab.thProject') },
                    { key: 'status', label: t('lab.thStatus') },
                    { key: 'fit', label: t('lab.thFit') },
                    { key: 'weeks', label: t('lab.thWeeks') },
                  ].map((c) => (
                    <th key={c.key} scope="col" className="p-0"
                      aria-sort={sortKey === c.key ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" onClick={() => toggleSort(c.key)}
                        className="flex w-full items-center gap-1 px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted transition hover:text-ink">
                        {c.label}<ArrowUpDown className="h-3 w-3" aria-hidden />
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{t('lab.thSkills')}</th>
                  <th scope="col" className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{t('lab.thActions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedList.map((entry) => {
                  const st = statusOf(entry);
                  const idx = st ? STAGES.indexOf(st) : -1;
                  return (
                    <tr key={entry.project.id} className="border-b border-line/60 transition last:border-0 hover:bg-surface2/40">
                      <td className="max-w-[280px] p-2.5">
                        <div className="truncate font-semibold text-ink">{L(entry.project.t)}</div>
                        <div className="muted truncate text-[10.5px]">{L(entry.project.problem)}</div>
                      </td>
                      <td className="p-2.5">
                        <Badge tone={st === 'completed' ? 'ok' : st === 'in-progress' ? 'brand' : st === 'planned' ? 'accent' : 'muted'}>
                          {colLabel(st || 'idea')}
                        </Badge>
                      </td>
                      <td className="p-2.5 tabular-nums">{typeof entry.score === 'number' ? `${entry.score}%` : '—'}</td>
                      <td className="p-2.5 tabular-nums">{entry.project.weeks}</td>
                      <td className="p-2.5">
                        <div className="flex max-w-[220px] flex-wrap gap-1">
                          {entry.project.skills.slice(0, 2).map((sk) => <Chip key={sk}>{L(SKILL_BY_ID[sk]?.n || [sk, sk])}</Chip>)}
                          {entry.project.skills.length > 2 ? <Chip className="border-dashed">+{entry.project.skills.length - 2}</Chip> : null}
                        </div>
                      </td>
                      <td className="p-2.5">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" icon={ChevronLeft} disabled={idx <= 0}
                            aria-label={L(['Move back', 'पीछे ले जाएँ'])} onClick={() => move(entry, -1)} />
                          <Button size="sm" variant="ghost" icon={ChevronRight} disabled={idx === -1 ? false : idx >= STAGES.length - 1}
                            aria-label={L(['Move forward', 'आगे बढ़ाएँ'])} onClick={() => move(entry, 1)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sortedList.length ? null : <p className="muted p-4 text-[12px]">{t('lab.emptyTable')}</p>}
          <p className="muted border-t border-line px-2.5 py-2 text-[10.5px]">{t('lab.sortHint')}</p>
        </Card>
      ) : null}

      {/* timeline view: stage stepper per project — a Gantt-style "normal" read */}
      {view === 'timeline' ? (
        <Card>
          <ul className="space-y-3">
            {sortedList.map((entry) => {
              const st = statusOf(entry);
              const reached = st ? STAGES.indexOf(st) + 1 : 0;
              return (
                <li key={entry.project.id} className="rounded-xl border border-line bg-surface2/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[12.5px] font-semibold text-ink">{L(entry.project.t)}</span>
                    <span className="muted shrink-0 text-[10.5px] tabular-nums">
                      {typeof entry.score === 'number' ? `${t('lab.thFit')} ${entry.score}% · ` : ''}{entry.project.weeks} {t('common.weeks')}
                    </span>
                  </div>
                  <ol className="mt-2 grid grid-cols-4 gap-1" aria-label={t('lab.timeline')}>
                    {['idea', ...STAGES].map((sid, i) => (
                      <li key={sid}
                        className={cn('rounded-md px-1.5 py-1 text-center text-[9.5px] font-bold uppercase tracking-wider transition',
                          i <= reached ? (i === reached ? 'animate-pulse border border-brand/50 bg-brand/15 text-brand' : 'border border-ok/40 bg-ok/10 text-ok') : 'border border-line text-muted')}>
                        {colLabel(sid)}
                      </li>
                    ))}
                  </ol>
                  <div className="mt-2 flex justify-end gap-1">
                    <Button size="sm" variant="ghost" icon={ChevronLeft} disabled={reached <= 0} aria-label={L(['Move back', 'पीछे ले जाएँ'])} onClick={() => move(entry, -1)} />
                    <Button size="sm" variant="ghost" icon={ChevronRight} disabled={reached >= STAGES.length} aria-label={L(['Move forward', 'आगे बढ़ाएँ'])} onClick={() => move(entry, 1)} />
                  </div>
                </li>
              );
            })}
          </ul>
          {sortedList.length ? null : <p className="muted p-2 text-[12px]">{t('lab.emptyTable')}</p>}
        </Card>
      ) : null}

      {/* cards view: full recommendation cards */}
      {view === 'cards' ? (
        list.length ? (
          <div ref={gridRef} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((entry, i) => (
              <ProjectCard key={entry.project.id} entry={entry} index={i} onStatus={applyStatus} />
            ))}
          </div>
        ) : (
          <EmptyResults title={t('lab.empty')} body={t('job.emptyHint')} onClear={clearAll} clearLabel={t('job.clearFilters')} icon={FlaskConical} />
        )
      ) : null}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[14px] font-bold">{L(['How projects are ranked for you', 'आपके लिए प्रोजेक्ट कैसे रैंक होते हैं'])}</h2>
            <ul className="muted mt-2 space-y-1 text-[12px] leading-relaxed">
              <li>· {L(['55% fit with your target career’s project list', 'आपके लक्षित करियर की प्रोजेक्ट सूची से 55% मेल'])}</li>
              <li>· {L(['30% whether you already have the skills it needs', '30% — क्या आवश्यक कौशल आपके पास पहले से हैं'])}</li>
              <li>· {L(['12% per open skill gap it would close', '12% प्रति खुला स्किल गैप जो यह भरेगा'])}</li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" to="/app/challenge" iconRight={ArrowRight}>{t('nav.challenge')}</Button>
            <Link to="/app/privacy" className="muted self-center text-[11px] hover:text-brand">{t('trust.title')}</Link>
          </div>
        </div>
        <div className={cn('mt-3 border-t border-line pt-3')}><DemoNotice>{t('common.methodNote')}</DemoNotice></div>
      </Card>
    </div>
  );
}

/* Celebration burst when a project lands in Completed (skipped under Reduce motion). */
function ConfettiBurst({ trigger }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!trigger) return undefined;
    const colors = ['#818cf8', '#22d3ee', '#34d399', '#fbbf24', '#f472b6'];
    const arr = Array.from({ length: 26 }, (_, i) => ({
      id: `${trigger}-${i}`,
      x: 30 + Math.random() * 40,
      delay: Math.random() * 0.25,
      color: colors[i % colors.length],
      dx: Math.random() * 220 - 110,
      rot: Math.random() * 720 - 360,
    }));
    setPieces(arr);
    const t = setTimeout(() => setPieces([]), 1700);
    return () => clearTimeout(t);
  }, [trigger]);
  if (!pieces.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[30vh] z-[95]" aria-hidden>
      {pieces.map((pz) => (
        <span
          key={pz.id}
          className="confetti"
          style={{ left: `${pz.x}%`, background: pz.color, animationDelay: `${pz.delay}s`, '--dx': `${pz.dx}px`, '--rot': `${pz.rot}deg` }}
        />
      ))}
    </div>
  );
}

/* Compact board card with lifecycle move controls + expandable detail. */
function LabCard({ entry, col, onMove, t, L, onDragStart }) {
  const [open, setOpen] = useState(false);
  const p = entry.project;
  const canBack = col !== 'idea' && col !== 'planned';
  const canFwd = col !== 'completed';
  const diffTone = p.diff === 'advanced' ? 'bad' : p.diff === 'intermediate' ? 'warn' : 'ok';
  return (
    <article
      draggable
      onDragStart={onDragStart}
      className={cn('cursor-grab rounded-xl border bg-surface p-3 transition hover:border-brand/40 hover:shadow-lift active:cursor-grabbing',
        col === 'completed' ? 'border-ok/25' : col === 'in-progress' ? 'border-brand/25' : 'border-line')}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 font-display text-[12.5px] font-bold leading-snug">{L(p.t)}</h3>
        <Badge tone={diffTone} className="shrink-0">{L([p.diff, p.diff === 'beginner' ? 'शुरुआती' : p.diff === 'intermediate' ? 'मध्यम' : 'उन्नत'])}</Badge>
      </div>
      <div className="muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold">
        <span>{p.weeks} {t('common.weeks')}</span>
        {typeof entry.score === 'number' ? <span className="text-brand">{L(['Fit', 'मेल'])} {entry.score}</span> : null}
      </div>
      {typeof entry.score === 'number' ? <Meter className="mt-1.5" value={entry.score} size="xs" /> : null}
      <p className="muted mt-2 line-clamp-2 text-[11px] leading-snug">{L(p.problem)}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {p.skills.slice(0, open ? undefined : 3).map((sk) => <Chip key={sk}>{L(SKILL_BY_ID[sk]?.n || [sk, sk])}</Chip>)}
        {p.skills.length > 3 ? <Chip className="border-dashed">+{p.skills.length - 3}</Chip> : null}
      </div>

      {open ? (
        <div className="mt-2 space-y-2 rounded-lg border border-line bg-surface2/50 p-2.5 animate-fade-in">
          <div>
            <div className="muted text-[9.5px] font-bold uppercase tracking-[0.14em]">{t('lab.stack')}</div>
            <p className="mt-0.5 text-[11.5px] text-ink">{L(p.stack)}</p>
          </div>
          <div>
            <div className="muted text-[9.5px] font-bold uppercase tracking-[0.14em]">{t('lab.outcome')}</div>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink">{L(p.outcome)}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2.5">
        <button
          type="button" disabled={!canBack} onClick={() => onMove(entry, -1)}
          aria-label={L(['Move back', 'पीछे ले जाएँ'])}
          className={cn('grid h-7 w-7 place-items-center rounded-lg border transition', canBack ? 'border-line text-muted hover:border-brand/50 hover:text-brand' : 'border-line/50 text-line cursor-not-allowed')}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </button>
        {col === 'idea' ? (
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => onMove(entry, 1)}>{L(['Plan it', 'प्लान करें'])}</Button>
        ) : (
          <span className="muted truncate text-[10.5px] font-bold">
            {col === 'planned' ? t('common.planned') : col === 'in-progress' ? t('common.inProgress') : <span className="text-ok inline-flex items-center gap-1"><Check className="h-3 w-3" aria-hidden />{t('common.completed')}</span>}
          </span>
        )}
        <button
          type="button" disabled={!canFwd} onClick={() => onMove(entry, 1)}
          aria-label={L(['Move forward', 'आगे बढ़ाएँ'])}
          className={cn('ml-auto grid h-7 w-7 place-items-center rounded-lg border transition', canFwd ? 'border-brand/40 bg-brand/10 text-brand hover:bg-brand/20' : 'border-line/50 text-line cursor-not-allowed')}
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className="grid h-7 w-7 place-items-center rounded-lg border border-line text-muted transition hover:text-ink"
          aria-label={open ? t('common.close') : t('common.learnMore')}>
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      </div>
    </article>
  );
}
