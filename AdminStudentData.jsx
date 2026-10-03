import { useEffect, useMemo, useState } from 'react';
import { Database, Download, RefreshCw, Save, Search, Trash2, UserRound } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select } from '../../components/ui/primitives';
import { deleteAdminStudent, listAdminStudents, saveAdminStudentData } from '../../services/adminStudentService';

function displayValue(value) {
  if (Array.isArray(value)) return displayValue(value[0]);
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function titleCase(value) {
  return displayValue(value).replace(/[-_]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function reportLabel(value) {
  return String(value).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatReportValue(value, depth = 0) {
  const indent = '  '.repeat(depth);
  if (Array.isArray(value)) {
    if (!value.length) return `${indent}None`;
    return value.map((item, index) => {
      if (item && typeof item === 'object') return `${indent}Entry ${index + 1}:\n${formatReportValue(item, depth + 1)}`;
      return `${indent}- ${displayValue(item) || String(item ?? 'Not provided')}`;
    }).join('\n');
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return `${indent}No data`;
    return entries.map(([key, item]) => {
      const label = reportLabel(key);
      if (typeof item === 'string' && /^data:image\/[^;]+;base64,/i.test(item)) return `${indent}${label}: [Image omitted from text report]`;
      if (item && typeof item === 'object') return `${indent}${label}:\n${formatReportValue(item, depth + 1)}`;
      const printable = typeof item === 'boolean' ? (item ? 'Yes' : 'No') : (item ?? 'Not provided');
      return `${indent}${label}: ${printable}`;
    }).join('\n');
  }
  return `${indent}${value ?? 'Not provided'}`;
}

export default function AdminStudentData() {
  const { L } = useI18n();
  const { toast } = useApp();
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [dataKey, setDataKey] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await listAdminStudents();
      setStudents(result);
      setSelectedId((current) => result.some((row) => row.account.id === current) ? current : (result[0]?.account.id || ''));
    } catch {
      setError(L(['Could not load student data. Check the admin session and MySQL service.', 'छात्र डेटा लोड नहीं हुआ। Admin session और MySQL सेवा जाँचें।']));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return students.filter(({ account }) => !term || `${account.name} ${account.email} ${account.college} ${account.branch}`.toLowerCase().includes(term));
  }, [students, query]);
  const selected = students.find(({ account }) => account.id === selectedId) || null;
  const keys = Object.keys(selected?.data || {}).sort();
  const profile = selected?.data?.[`profile:${selectedId}`] || {};
  const personal = profile.personal || {};
  const education = profile.education || {};
  const informationSections = selected ? [
    {
      title: L(['Personal information', 'व्यक्तिगत जानकारी']),
      fields: [
        [L(['Full name', 'पूरा नाम']), personal.name || selected.account.name],
        [L(['Email', 'ईमेल']), personal.email || selected.account.email],
        [L(['Phone', 'फ़ोन']), personal.phone],
        [L(['City', 'शहर']), personal.city],
        [L(['College / Institute', 'कॉलेज / संस्थान']), personal.college || selected.account.college],
      ],
    },
    {
      title: L(['Education', 'शिक्षा']),
      fields: [
        [L(['Degree', 'डिग्री']), education.degree || selected.account.degree],
        [L(['Branch', 'शाखा']), education.branch || selected.account.branch],
        [L(['CGPA / Percentage', 'CGPA / प्रतिशत']), education.cgpa],
        [L(['Graduation year', 'स्नातक वर्ष']), education.gradYear || selected.account.gradYear],
      ],
    },
    {
      title: L(['Career preferences', 'करियर प्राथमिकताएँ']),
      fields: [
        [L(['Career goal', 'करियर लक्ष्य']), profile.goal],
        [L(['Target career', 'लक्षित करियर']), titleCase(profile.targetCareer)],
        [L(['Work preference', 'काम की प्राथमिकता']), titleCase(profile.workType)],
        [L(['Preferred location', 'पसंदीदा स्थान']), profile.locationPref],
      ],
    },
  ] : [];
  const skillGroups = [
    [L(['Technical skills', 'तकनीकी कौशल']), profile.techSkills],
    [L(['Soft skills', 'सॉफ्ट स्किल्स']), profile.softSkills],
    [L(['Tools', 'टूल्स']), profile.toolSkills],
    [L(['Industry skills', 'उद्योग कौशल']), profile.industrySkills],
  ].filter(([, skills]) => Array.isArray(skills) && skills.length);

  useEffect(() => {
    if (!selected) {
      setDataKey('');
      setJsonText('');
      return;
    }
    const nextKey = keys.includes(dataKey) ? dataKey : (keys.find((key) => key === `profile:${selectedId}`) || keys[0] || '');
    setDataKey(nextKey);
    setJsonText(nextKey ? JSON.stringify(selected.data[nextKey], null, 2) : '{}');
  }, [selectedId, students]);

  const save = async () => {
    if (!selected || !dataKey) return;
    let value;
    try { value = JSON.parse(jsonText); } catch {
      setError(L(['Data must be valid JSON.', 'डेटा valid JSON होना चाहिए।']));
      return;
    }
    setBusy(true);
    try {
      await saveAdminStudentData(selectedId, dataKey, value);
      await refresh();
      toast({ kind: 'success', title: L(['Student data saved', 'छात्र डेटा सेव हुआ']), body: dataKey });
    } catch {
      setError(L(['Could not save this student data.', 'छात्र डेटा सेव नहीं हो सका।']));
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!selected || !window.confirm(L([`Delete the student account for ${selected.account.email}? This cannot be undone.`, `${selected.account.email} का छात्र खाता हटाएँ? यह वापस नहीं होगा।`]))) return;
    setBusy(true);
    try {
      await deleteAdminStudent(selectedId);
      setSelectedId('');
      await refresh();
      toast({ kind: 'warn', title: L(['Student account deleted', 'छात्र खाता हटाया गया']) });
    } catch {
      setError(L(['Could not delete this student account.', 'छात्र खाता हटाया नहीं जा सका।']));
    } finally { setBusy(false); }
  };

  const exportSelected = () => {
    if (!selected) return;
    const sections = [
      ['Account information', selected.account],
      ...Object.entries(selected.data || {}).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => {
        if (key === `profile:${selectedId}`) return ['Student profile', value];
        if (key === `progress:${selectedId}`) return ['Student progress', value];
        return [reportLabel(key), value];
      }),
    ];
    const report = [
      'CAREERX STUDENT REPORT',
      `Generated: ${new Date().toLocaleString()}`,
      ...sections.flatMap(([title, value]) => ['', title, '='.repeat(title.length), formatReportValue(value)]),
      '',
    ].join('\n');
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `careerx-student-${selectedId}-report.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast({ kind: 'success', title: L(['Student report downloaded', 'छात्र रिपोर्ट डाउनलोड हुई']) });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={L(['MySQL student records', 'MySQL छात्र रिकॉर्ड'])}
        title={L(['Student data control', 'छात्र डेटा नियंत्रण'])}
        sub={L(['Inspect, update, export, or delete registered student data.', 'पंजीकृत छात्र डेटा देखें, बदलें, export या delete करें।'])}
        tags={[<Badge key="count" tone="accent">{students.length} {L(['students', 'छात्र'])}</Badge>, <Badge key="db" tone="ok" icon={Database}>MySQL</Badge>]}
        actions={<Button size="sm" variant="ghost" icon={RefreshCw} loading={busy} onClick={refresh}>{L(['Refresh', 'रीफ़्रेश'])}</Button>}
      />

      {error ? <p role="alert" className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.4fr)]">
        <Card className="p-0">
          <div className="relative border-b border-line p-3">
            <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={L(['Search students', 'छात्र खोजें'])} aria-label={L(['Search students', 'छात्र खोजें'])} />
          </div>
          <div className="max-h-[65vh] overflow-y-auto">
            {filtered.map(({ account, data }) => {
              const profile = data[`profile:${account.id}`] || {};
              const selectedRow = selectedId === account.id;
              return (
                <button key={account.id} type="button" onClick={() => setSelectedId(account.id)} className={`block w-full border-b border-line/70 px-4 py-3 text-left transition hover:bg-surface2/60 ${selectedRow ? 'bg-surface2/80' : ''}`}>
                  <span className="flex items-center gap-2 font-semibold text-ink"><UserRound className="h-4 w-4 text-brand" aria-hidden />{account.name}</span>
                  <span className="mt-1 block truncate pl-6 text-[11px] text-muted">{account.email}</span>
                  <span className="mt-1 block truncate pl-6 text-[11px] text-muted">{profile.education?.branch || account.branch || L(['Branch not set', 'ब्रांच सेट नहीं'])} · {profile.education?.gradYear || account.gradYear || '—'}</span>
                </button>
              );
            })}
            {!filtered.length ? <EmptyState className="p-6" title={L(['No students found', 'कोई छात्र नहीं मिला'])} body={L(['Students appear here after their first login.', 'छात्र के पहले login के बाद वे यहाँ दिखेंगे।'])} /> : null}
          </div>
        </Card>

        {selected ? (
          <Card className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-bold">{selected.account.name}</h2>
                <p className="muted mt-1 break-all text-xs">{selected.account.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" icon={Download} onClick={exportSelected}>{L(['Export report', 'रिपोर्ट निर्यात करें'])}</Button>
                <Button size="sm" variant="danger" icon={Trash2} disabled={busy} onClick={remove}>{L(['Delete account', 'खाता हटाएँ'])}</Button>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {informationSections.map((section) => {
                const fields = section.fields.filter(([, value]) => displayValue(value));
                if (!fields.length) return null;
                return (
                  <section key={section.title} className="rounded-lg border border-line/70 bg-surface2/30 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-ink">{section.title}</h3>
                    <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                      {fields.map(([label, value]) => (
                        <div key={label} className="min-w-0">
                          <dt className="text-[11px] text-muted">{label}</dt>
                          <dd className="mt-0.5 break-words text-sm text-ink">{displayValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                );
              })}
            </div>
            {skillGroups.length ? (
              <section className="rounded-lg border border-line/70 bg-surface2/30 p-4">
                <h3 className="mb-3 text-sm font-semibold text-ink">{L(['Skills', 'कौशल'])}</h3>
                <div className="space-y-3">
                  {skillGroups.map(([label, skills]) => (
                    <div key={label}>
                      <p className="mb-1.5 text-[11px] text-muted">{label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((skill, index) => {
                          const name = titleCase(typeof skill === 'string' ? skill : (skill?.name || skill?.label || skill?.id));
                          if (!name) return null;
                          return <Badge key={`${name}-${index}`} tone="muted">{name}{skill?.level ? ` · ${skill.level}/5` : ''}</Badge>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            <details className="rounded-lg border border-line/70">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">{L(['Advanced data editor', 'उन्नत डेटा संपादक'])}</summary>
              <div className="space-y-3 border-t border-line/70 p-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(180px,0.45fr)_minmax(0,1fr)]">
                  <Select value={dataKey} onChange={(event) => { setDataKey(event.target.value); setJsonText(JSON.stringify(selected.data[event.target.value], null, 2)); }} aria-label={L(['Student data record', 'छात्र डेटा रिकॉर्ड'])}>
                    {keys.map((key) => <option key={key} value={key}>{key}</option>)}
                  </Select>
                  <div className="muted self-center text-[11px]">{L(['Raw account data stays restricted to the admin API.', 'Raw account data केवल admin API से उपलब्ध है।'])}</div>
                </div>
                <textarea className="field min-h-[260px] resize-y font-mono text-xs" value={jsonText} onChange={(event) => setJsonText(event.target.value)} aria-label={L(['Edit student JSON data', 'छात्र JSON डेटा संपादित करें'])} spellCheck={false} />
                <div className="flex justify-end">
                  <Button icon={Save} loading={busy} disabled={!dataKey} onClick={save}>{L(['Save changes', 'बदलाव सेव करें'])}</Button>
                </div>
              </div>
            </details>
          </Card>
        ) : (
          <Card className="grid min-h-64 place-items-center"><EmptyState icon={UserRound} title={L(['Select a student', 'छात्र चुनें'])} body={L(['Student profile and progress data will appear here.', 'छात्र प्रोफ़ाइल और प्रगति का डेटा यहाँ दिखेगा।'])} /></Card>
        )}
      </div>
    </div>
  );
}
