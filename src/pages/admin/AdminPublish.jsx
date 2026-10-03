import { useEffect, useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/AppStore';
import {
  PageHeader, Card, Badge, Button, Field, Input, Select, EmptyState,
} from '../../components/ui/primitives';
import { DEGREES, BRANCHES, SKILLS } from '../../data/catalog';
import { COURSES } from '../../data/courses';
import { sendPublishedOpportunityEmails } from '../../services/emailNotificationService';
import { fetchAdminJobFeeds } from '../../services/adminJobFeedService';
import {
  deletePublishedRecord, listPublishedRecords, listPublishHistory, refreshPublishedContent, refreshPublishHistory,
  saveAndPublishRecord, setRecordPublished,
} from '../../services/publishedContentService';

const SECTION_META = {
  jobs: { kind: 'job', title: ['Jobs', 'नौकरियाँ'], sourceOptions: ['Naukri.com', 'LinkedIn', 'Unstop', 'Company website', 'Other'] },
  internships: { kind: 'internship', title: ['Internships', 'इंटर्नशिप'], sourceOptions: ['Unstop', 'LinkedIn', 'Naukri.com', 'Company website', 'Other'] },
  government: { kind: 'government', title: ['Government jobs', 'सरकारी नौकरियाँ'], sourceOptions: ['UPSC', 'SSC', 'MPPSC', 'Government portal', 'Other'] },
  courses: { kind: 'course', title: ['Government courses', 'सरकारी कोर्स'], sourceOptions: ['SWAYAM', 'NPTEL', 'NIELIT', 'DIKSHA', 'Skill India Digital', 'Other'] },
};

const emptyForm = () => ({
  title: '', organization: '', source: '', url: '', location: '', mode: 'onsite', role: '',
  compensation: '', experienceLevel: 'any', skills: '',
  difficulty: 'beginner', weeks: '4', hours: '20', free: true, certificate: true,
  degree: 'all', branch: 'all', minCgpa: '',
});

const PORTAL_LINKS = {
  jobs: [
    { name: 'Naukri.com', url: 'https://www.naukri.com/fresher-jobs-in-india' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs/search/?keywords=fresher%20jobs&location=India' },
    { name: 'Unstop', url: 'https://unstop.com/jobs' },
  ],
  internships: [
    { name: 'Unstop', url: 'https://unstop.com/internships' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs/search/?keywords=internship&location=India' },
    { name: 'Naukri.com', url: 'https://www.naukri.com/internship-jobs-in-india' },
  ],
  government: [
    { name: 'UPSC', url: 'https://upsc.gov.in' },
    { name: 'SSC', url: 'https://ssc.gov.in' },
    { name: 'MPPSC', url: 'https://mppsc.mp.gov.in' },
    { name: 'National Career Service', url: 'https://www.ncs.gov.in' },
  ],
  courses: [
    { name: 'SWAYAM', url: 'https://swayam.gov.in/explorer' },
    { name: 'NPTEL', url: 'https://nptel.ac.in/courses' },
    { name: 'NIELIT', url: 'https://student.nielit.gov.in/' },
    { name: 'DIKSHA', url: 'https://diksha.gov.in/explore' },
    { name: 'Skill India Digital', url: 'https://www.skillindiadigital.gov.in/' },
  ],
};

function parseSkills(value) {
  return [...new Set(String(value || '').split(',').map((skill) => skill.trim()).filter(Boolean))];
}

function notificationSummary(result, L) {
  if (!result?.ok) return L(['Email notification failed. Check SMTP settings.', 'ईमेल सूचना नहीं भेजी जा सकी। SMTP सेटिंग जाँचें।']);
  if (!result.recipientCount) return L(['No eligible student email addresses found.', 'कोई पात्र छात्र ईमेल पता नहीं मिला।']);
  return L([
    `Email sent to ${result.sent} of ${result.recipientCount} eligible students.`,
    `${result.recipientCount} पात्र छात्रों में से ${result.sent} को ईमेल भेजा गया।`,
  ]);
}

function eligibilitySummary(record, L) {
  const rules = record.eligibility || {};
  const parts = [];
  if (rules.degree && rules.degree !== 'all') parts.push(rules.degree);
  if (rules.branch && rules.branch !== 'all') parts.push(rules.branch);
  if (rules.minCgpa) parts.push(L([`CGPA ${rules.minCgpa}+`, `CGPA ${rules.minCgpa}+` ]));
  if (rules.gradYearFrom || rules.gradYearTo) parts.push(`${rules.gradYearFrom || '—'}–${rules.gradYearTo || '—'}`);
  return parts.length ? parts.join(' · ') : L(['All student profiles', 'सभी छात्र प्रोफ़ाइल']);
}

export default function AdminPublish({ section = 'jobs' }) {
  const meta = SECTION_META[section] || SECTION_META.jobs;
  const { t, L } = useI18n();
  const { user, toast } = useApp();
  const [form, setForm] = useState(emptyForm);
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [errors, setErrors] = useState({});
  const [feedItems, setFeedItems] = useState([]);
  const [feedUnconfigured, setFeedUnconfigured] = useState([]);
  const [feedErrors, setFeedErrors] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [publishingFeedId, setPublishingFeedId] = useState('');

  const refresh = async () => {
    await Promise.all([refreshPublishedContent(), refreshPublishHistory()]);
    setRecords(listPublishedRecords());
    setHistory(listPublishHistory());
  };

  const refreshSourceFeeds = async (kind = meta.kind) => {
    if (!['job', 'internship', 'government'].includes(kind)) return;
    setFeedLoading(true);
    try {
      const result = await fetchAdminJobFeeds(kind);
      setFeedItems(result.items);
      setFeedUnconfigured(result.unconfigured);
      setFeedErrors(result.errors);
    } catch {
      setFeedItems([]);
      setFeedErrors([{ source: '', error: 'feedRequestFailed' }]);
    } finally { setFeedLoading(false); }
  };

  useEffect(() => {
    setForm(emptyForm());
    setErrors({});
    refresh();
    refreshSourceFeeds(meta.kind);
  }, [section]);

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const publish = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = t('common.requiredField');
    if (!form.source) nextErrors.source = t('common.requiredField');
    if (!/^https?:\/\//i.test(form.url.trim())) nextErrors.url = L(['Enter a valid http(s) listing URL.', 'मान्य http(s) लिस्टिंग URL दर्ज करें।']);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const record = {
      kind: meta.kind,
      title: form.title.trim(),
      organization: form.organization.trim(),
      provider: form.organization.trim() || form.source,
      source: form.source,
      url: form.url.trim(),
      location: form.location.trim(),
      mode: form.mode,
      role: form.role.trim(),
      compensation: form.compensation.trim(),
      experienceLevel: form.experienceLevel,
      category: section === 'government' && /MPPSC|state/i.test(form.source) ? 'state' : 'central',
      skills: parseSkills(form.skills),
      difficulty: form.difficulty,
      weeks: Number(form.weeks) || 1,
      hours: Number(form.hours) || 1,
      free: form.free,
      certificate: form.certificate,
      eligibility: {
        degree: form.degree,
        branch: form.branch,
        minCgpa: form.minCgpa,
        experienceLevel: form.experienceLevel,
      },
    };
    const result = await saveAndPublishRecord(record, user);
    if (!result.ok) {
      toast({ kind: 'error', title: L(['Could not publish', 'प्रकाशित नहीं हो सका']), body: L(['Browser storage is unavailable or full.', 'ब्राउज़र स्टोरेज उपलब्ध नहीं है या भर गया है।']) });
      return;
    }
    const emailResult = await sendPublishedOpportunityEmails(result.record);
    setForm(emptyForm());
    setErrors({});
    refresh();
    toast({ kind: 'success', title: L(['Published', 'प्रकाशित हुआ']), body: `${result.record.title} · ${notificationSummary(emailResult, L)}` });
  };

  const togglePublished = async (record) => {
    const result = await setRecordPublished(record.id, record.status !== 'published', user);
    if (result.ok) {
      refresh();
      const emailResult = result.record.status === 'published'
        ? await sendPublishedOpportunityEmails(result.record)
        : null;
      toast({
        kind: result.record.status === 'published' ? 'success' : 'info',
        title: result.record.status === 'published' ? L(['Published', 'प्रकाशित हुआ']) : L(['Unpublished', 'अप्रकाशित हुआ']),
        body: emailResult ? `${result.record.title} · ${notificationSummary(emailResult, L)}` : result.record.title,
      });
    }
  };

  const deleteRecord = async (record) => {
    const result = await deletePublishedRecord(record.id, user);
    if (result.ok) {
      await refresh();
      toast({ kind: 'info', title: L(['Deleted', 'हटाया गया']), body: record.title });
      return;
    }
    toast({ kind: 'error', title: L(['Could not delete listing', 'लिस्टिंग हटाई नहीं जा सकी']), body: record.title });
  };

  const publishCatalogCourse = async (course) => {
    const current = records.find((record) => record.id === `student-course-${course.id}`);
    if (current) {
      togglePublished(current);
      return;
    }
    const providerName = course.provider || 'Other';
    const source = ['SWAYAM', 'NPTEL', 'NIELIT', 'DIKSHA', 'Skill India Digital'].find((name) => providerName.toLowerCase().includes(name.toLowerCase())) || 'Other';
    const result = await saveAndPublishRecord({
      id: `student-course-${course.id}`,
      kind: 'course',
      title: course.t?.[0] || course.title,
      provider: providerName,
      organization: providerName,
      source,
      url: course.url,
      difficulty: course.diff,
      weeks: course.weeks,
      hours: course.hrs,
      free: course.free,
      certificate: course.cert,
      skills: course.skills || [],
      eligibility: { degree: 'all', branch: 'all', minCgpa: '' },
    }, user);
    if (result.ok) {
      refresh();
      const emailResult = await sendPublishedOpportunityEmails(result.record);
      toast({ kind: 'success', title: L(['Course published', 'कोर्स प्रकाशित हुआ']), body: `${result.record.title} · ${notificationSummary(emailResult, L)}` });
    } else {
      toast({ kind: 'error', title: L(['Could not publish course', 'कोर्स प्रकाशित नहीं हो सका']) });
    }
  };

  const publishFeedItem = async (item) => {
    setPublishingFeedId(item.id);
    const now = new Date().toISOString();
    const record = {
      id: `feed-${item.id}`,
      kind: meta.kind,
      title: item.title,
      organization: item.source,
      provider: item.source,
      source: item.source,
      url: item.url,
      description: item.description,
      location: 'India',
      mode: 'onsite',
      role: meta.kind === 'job' ? 'Job opportunity' : meta.kind === 'internship' ? 'Internship' : 'Government job',
      experienceLevel: 'any',
      category: item.sourceId === 'mppsc' ? 'state' : 'central',
      skills: [],
      eligibility: { degree: 'all', branch: 'all', minCgpa: '', experienceLevel: 'any' },
      feedPublishedAt: item.publishedAt,
      createdAt: now,
    };
    try {
      const result = await saveAndPublishRecord(record, user);
      if (!result.ok) throw new Error('publishFailed');
      const emailResult = await sendPublishedOpportunityEmails(result.record);
      await refresh();
      toast({ kind: 'success', title: L(['Published from source feed', 'सोर्स फ़ीड से प्रकाशित']), body: `${item.title} · ${notificationSummary(emailResult, L)}` });
    } catch {
      toast({ kind: 'error', title: L(['Could not publish listing', 'लिस्टिंग प्रकाशित नहीं हो सकी']), body: item.title });
    } finally { setPublishingFeedId(''); }
  };

  const visibleRecords = section === 'history'
    ? []
    : records.filter((record) => record.kind === meta.kind);
  const selectedSkills = parseSkills(form.skills);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={L(['Admin publishing', 'एडमिन प्रकाशन'])}
        title={section === 'history' ? L(['Publish history', 'प्रकाशन इतिहास']) : L(meta.title)}
        sub={L(['Publish verified source listings to eligible student profiles, then unpublish them when they close.', 'सत्यापित सोर्स लिस्टिंग योग्य छात्र प्रोफ़ाइल तक प्रकाशित करें और अवसर बंद होने पर अप्रकाशित करें।'])}
        tags={[
          <Badge key="live" tone="ok">{records.filter((record) => record.status === 'published').length} {L(['published', 'प्रकाशित'])}</Badge>,
          <Badge key="history" tone="muted">{history.length} {L(['history events', 'इतिहास प्रविष्टियाँ'])}</Badge>,
        ]}
      />

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <span className="muted mr-1 text-[11px] font-semibold">{L(['Browse sources', 'सोर्स देखें'])}</span>
        {PORTAL_LINKS[section]?.map((portal) => <a key={portal.name} href={portal.url} target="_blank" rel="noreferrer noopener" className="btn btn-ghost btn-sm">{portal.name}</a>)}
      </Card>

      {['jobs', 'internships', 'government'].includes(section) ? (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-[15px] font-bold">{L(['Listings from configured RSS/Atom feeds', 'Configured RSS/Atom फ़ीड से लिस्टिंग'])}</h2>
              <p className="muted mt-1 text-[11px]">{L(['Feeds load automatically. Only public or provider-authorized feeds are fetched.', 'फ़ीड अपने-आप लोड होती हैं। केवल public या provider-authorized feeds fetch होती हैं।'])}</p>
            </div>
            <Button size="sm" variant="ghost" icon={RefreshCw} loading={feedLoading} onClick={() => refreshSourceFeeds(meta.kind)}>
              {L(['Refresh feeds', 'फ़ीड रीफ़्रेश करें'])}
            </Button>
          </div>
          {feedUnconfigured.length ? <p className="muted text-[11px]">{L(['Feed URLs not configured for:', 'इनकी feed URL configure नहीं है:'])} {feedUnconfigured.join(', ')}. {L(['Add authorized RSS/Atom URLs in .env.', '.env में authorized RSS/Atom URL जोड़ें।'])}</p> : null}
          {feedErrors.map((item) => <p key={`${item.source}-${item.error}`} role="alert" className="text-[11px] text-bad">{item.source ? `${item.source}: ` : ''}{item.error}</p>)}
          {feedItems.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {feedItems.map((item) => {
                const alreadyPublished = records.some((record) => record.id === `feed-${item.id}` && record.status === 'published');
                return (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[12.5px] font-semibold">{item.title}</h3>
                      <p className="muted mt-0.5 text-[10.5px]">{item.source}{item.publishedAt ? ` · ${item.publishedAt}` : ''}</p>
                      {item.description ? <p className="muted mt-1 line-clamp-2 text-[11px]">{item.description}</p> : null}
                    </div>
                    <a href={item.url} target="_blank" rel="noreferrer noopener" className="btn btn-ghost btn-sm">{L(['Open', 'खोलें'])}</a>
                    <Button size="sm" variant={alreadyPublished ? 'ghost' : 'primary'} disabled={alreadyPublished || publishingFeedId === item.id} loading={publishingFeedId === item.id} onClick={() => publishFeedItem(item)}>
                      {alreadyPublished ? L(['Published', 'प्रकाशित']) : L(['Publish', 'प्रकाशित करें'])}
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : <p className="muted text-[11px]">{feedLoading ? L(['Loading feeds…', 'फ़ीड लोड हो रही हैं…']) : L(['No feed listings returned. Use the source links above or configure an official RSS/Atom feed.', 'फ़ीड से लिस्टिंग नहीं मिली। ऊपर दिए links खोलें या official RSS/Atom feed configure करें।'])}</p>}
        </Card>
      ) : null}

      {section === 'history' ? (
        <Card>
          <h2 className="font-display text-[15px] font-bold">{L(['Recent publish activity', 'हाल की प्रकाशन गतिविधि'])}</h2>
          {history.length ? (
            <ol className="mt-4 space-y-2">
              {history.map((event) => (
                <li key={event.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface2/40 px-3 py-2.5">
                  <Badge tone={event.action === 'published' ? 'ok' : 'muted'}>{L(event.action === 'published' ? ['Published', 'प्रकाशित'] : ['Unpublished', 'अप्रकाशित'])}</Badge>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{event.title}</span>
                  <span className="muted text-[11px]">{event.source} · {event.adminName}</span>
                  <time className="muted text-[10.5px]" dateTime={event.at}>{new Date(event.at).toLocaleString()}</time>
                </li>
              ))}
            </ol>
          ) : <EmptyState className="mt-3" title={L(['No publish history yet', 'अभी प्रकाशन इतिहास नहीं'])} body={L(['Publishing or unpublishing a listing will add an entry here.', 'लिस्टिंग प्रकाशित या अप्रकाशित करने पर यहाँ प्रविष्टि आएगी।'])} />}
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
          <Card>
            <h2 className="font-display text-[15px] font-bold">{L(['Create and publish listing', 'लिस्टिंग बनाएँ और प्रकाशित करें'])}</h2>
            <form className="mt-4 space-y-4" onSubmit={publish}>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label={L(['Title', 'शीर्षक'])} htmlFor="pub-title" error={errors.title} required>
                  <Input id="pub-title" value={form.title} onChange={set('title')} invalid={!!errors.title} />
                </Field>
                <Field label={L(section === 'courses' ? ['Provider', 'प्रदाता'] : ['Organisation', 'संस्था'])} htmlFor="pub-org">
                  <Input id="pub-org" value={form.organization} onChange={set('organization')} />
                </Field>
                <Field label={L(['Source portal', 'सोर्स पोर्टल'])} htmlFor="pub-source" error={errors.source} required>
                  <Select id="pub-source" value={form.source} onChange={set('source')}>
                    <option value="">{t('common.select')}</option>
                    {meta.sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
                  </Select>
                </Field>
                <Field label={L(['Official listing URL', 'आधिकारिक लिस्टिंग URL'])} htmlFor="pub-url" error={errors.url} required>
                  <Input id="pub-url" type="url" value={form.url} onChange={set('url')} placeholder="https://" invalid={!!errors.url} />
                </Field>
              </div>

              {section === 'courses' ? (
                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label={L(['Difficulty', 'कठिनाई'])} htmlFor="pub-difficulty">
                    <Select id="pub-difficulty" value={form.difficulty} onChange={set('difficulty')}>
                      <option value="beginner">{t('common.beginner')}</option><option value="intermediate">{t('common.intermediate')}</option><option value="advanced">{t('common.advanced')}</option>
                    </Select>
                  </Field>
                  <Field label={L(['Weeks', 'सप्ताह'])} htmlFor="pub-weeks"><Input id="pub-weeks" type="number" min="1" value={form.weeks} onChange={set('weeks')} /></Field>
                  <Field label={L(['Hours', 'घंटे'])} htmlFor="pub-hours"><Input id="pub-hours" type="number" min="1" value={form.hours} onChange={set('hours')} /></Field>
                  <div className="flex flex-wrap items-end gap-3 pb-2">
                    <label className="flex items-center gap-2 text-[12px] font-medium"><input type="checkbox" checked={form.free} onChange={set('free')} />{L(['Free', 'मुफ़्त'])}</label>
                    <label className="flex items-center gap-2 text-[12px] font-medium"><input type="checkbox" checked={form.certificate} onChange={set('certificate')} />{L(['Certificate', 'प्रमाणपत्र'])}</label>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Field label={L(['Location', 'स्थान'])} htmlFor="pub-location"><Input id="pub-location" value={form.location} onChange={set('location')} placeholder="India / Bhopal / Remote" /></Field>
                  <Field label={L(['Work mode', 'कार्य मोड'])} htmlFor="pub-mode">
                    <Select id="pub-mode" value={form.mode} onChange={set('mode')}>
                      <option value="onsite">{t('common.onsite')}</option><option value="hybrid">{t('common.hybrid')}</option><option value="remote">{t('common.remote')}</option>
                    </Select>
                  </Field>
                  <Field label={L(['Role', 'भूमिका'])} htmlFor="pub-role"><Input id="pub-role" value={form.role} onChange={set('role')} /></Field>
                  <Field label={L(['Salary / stipend', 'वेतन / स्टाइपेंड'])} htmlFor="pub-comp"><Input id="pub-comp" value={form.compensation} onChange={set('compensation')} /></Field>
                  <Field label={L(['Experience', 'अनुभव'])} htmlFor="pub-experience">
                    <Select id="pub-experience" value={form.experienceLevel} onChange={set('experienceLevel')}>
                      <option value="any">{L(['Any experience', 'कोई भी अनुभव'])}</option>
                      <option value="entry">{L(['Entry level', 'शुरुआती स्तर'])}</option>
                      <option value="experienced">{L(['Experienced', 'अनुभवी'])}</option>
                    </Select>
                  </Field>
                </div>
              )}

              <div className="border-t border-line pt-4">
                <h3 className="text-[12.5px] font-bold">{L(['Student profile eligibility', 'छात्र प्रोफ़ाइल पात्रता'])}</h3>
                <div className="mt-3 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label={L(['Degree', 'डिग्री'])} htmlFor="pub-degree">
                    <Select id="pub-degree" value={form.degree} onChange={set('degree')}>
                      <option value="all">{L(['Any degree', 'कोई भी डिग्री'])}</option>
                      {DEGREES.map((degree) => <option key={degree} value={degree}>{degree}</option>)}
                    </Select>
                  </Field>
                  <Field label={L(['Branch', 'ब्रांच'])} htmlFor="pub-branch">
                    <Select id="pub-branch" value={form.branch} onChange={set('branch')}>
                      <option value="all">{L(['Any branch', 'कोई भी ब्रांच'])}</option>
                      {BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                    </Select>
                  </Field>
                  {section !== 'courses' ? <Field label={L(['Minimum CGPA', 'न्यूनतम CGPA'])} htmlFor="pub-cgpa"><Input id="pub-cgpa" type="number" min="0" max="10" step="0.1" value={form.minCgpa} onChange={set('minCgpa')} /></Field> : null}
                  <Field label={L(['Skill IDs (comma-separated)', 'स्किल ID (कॉमा से अलग)'])} htmlFor="pub-skills">
                    <Input id="pub-skills" value={form.skills} onChange={set('skills')} placeholder="python, sql, communication" />
                  </Field>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedSkills.map((id) => {
                    const skill = SKILLS.find((item) => item.id === id);
                    return <Badge key={id} tone={skill ? 'brand' : 'warn'}>{skill?.n?.[0] || id}</Badge>;
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <span className="muted text-[11px]">{L(['Publishing makes this item visible only to eligible student profiles.', 'प्रकाशित करने पर यह सामग्री केवल योग्य छात्र प्रोफ़ाइल को दिखेगी।'])}</span>
                <Button type="submit">{L(['Publish listing', 'लिस्टिंग प्रकाशित करें'])}</Button>
              </div>
            </form>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-[15px] font-bold">{L(['Current listings', 'मौजूदा लिस्टिंग'])}</h2>
              <Badge tone="muted">{visibleRecords.length}</Badge>
            </div>
            {visibleRecords.length ? (
              <ul className="mt-3 space-y-2">
                {visibleRecords.map((record) => (
                  <li key={record.id} className="rounded-lg border border-line bg-surface2/40 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-[12.5px] font-semibold">{record.title}</h3>
                        <p className="muted mt-0.5 truncate text-[10.5px]">{record.organization || record.provider || record.source} · {record.source}</p>
                      </div>
                      <Badge tone={record.status === 'published' ? 'ok' : 'muted'}>{record.status === 'published' ? L(['Published', 'प्रकाशित']) : L(['Unpublished', 'अप्रकाशित'])}</Badge>
                    </div>
                    <p className="muted mt-2 text-[10.5px]">{eligibilitySummary(record, L)}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <a href={record.url} target="_blank" rel="noreferrer noopener" className="muted truncate text-[10.5px] underline">{record.url}</a>
                      <div className="flex shrink-0 items-center gap-2">
                        {record.status !== 'published' ? (
                          <>
                            <Button size="sm" variant="primary" onClick={() => togglePublished(record)}>
                              {L(['Publish', 'प्रकाशित करें'])}
                            </Button>
                            {section === 'courses' ? (
                              <Button size="sm" variant="danger" icon={Trash2} onClick={() => deleteRecord(record)}>
                                {L(['Delete', 'हटाएँ'])}
                              </Button>
                            ) : null}
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => togglePublished(record)}>
                            {L(['Unpublish', 'अप्रकाशित करें'])}
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <EmptyState className="mt-2" title={L(['No listings in this section', 'इस सेक्शन में लिस्टिंग नहीं'])} body={L(['Published items will appear here with their eligibility rules.', 'प्रकाशित सामग्री अपनी पात्रता शर्तों के साथ यहाँ दिखेगी।'])} />}
          </Card>

          {section === 'courses' ? (
            <Card className="xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-[15px] font-bold">{L(['Courses already shown to students', 'छात्रों को पहले से दिख रहे कोर्स'])}</h2>
                <Badge tone="muted">{COURSES.filter((course) => course.url && !course.url.includes('.example')).length}</Badge>
              </div>
              <ul className="mt-3 grid gap-2 md:grid-cols-2">
                {COURSES.filter((course) => course.url && !course.url.includes('.example')).map((course) => {
                  const record = records.find((item) => item.id === `student-course-${course.id}`);
                  return (
                    <li key={course.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-surface2/40 p-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-semibold">{L(course.t)}</div>
                        <div className="muted truncate text-[10.5px]">{course.provider} · {course.weeks} {t('common.weeks')} · {course.hrs}h</div>
                      </div>
                      {record?.status === 'published' ? <Badge tone="ok">{L(['Published', 'प्रकाशित'])}</Badge> : null}
                      <Button size="sm" variant={record?.status === 'published' ? 'ghost' : 'primary'} onClick={() => publishCatalogCourse(course)}>
                        {record?.status === 'published' ? L(['Unpublish', 'अप्रकाशित करें']) : L(['Publish', 'प्रकाशित करें'])}
                      </Button>
                      {record && record.status !== 'published' ? (
                        <Button size="sm" variant="danger" icon={Trash2} onClick={() => deleteRecord(record)}>
                          {L(['Delete', 'हटाएँ'])}
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}