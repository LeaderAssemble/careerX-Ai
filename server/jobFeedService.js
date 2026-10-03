import { XMLParser } from 'fast-xml-parser';

const MAX_FEED_BYTES = 2_000_000;
const MAX_ITEMS_PER_FEED = 100;
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: false,
  htmlEntities: true,
});

const FEEDS = {
  job: [
    { id: 'naukri', name: 'Naukri.com', env: 'JOB_FEED_NAUKRI_URL', hosts: ['naukri.com'] },
    { id: 'unstop', name: 'Unstop', env: 'JOB_FEED_UNSTOP_JOBS_URL', hosts: ['unstop.com'] },
    { id: 'linkedin', name: 'LinkedIn', env: 'JOB_FEED_LINKEDIN_JOBS_URL', hosts: ['linkedin.com'] },
  ],
  internship: [
    { id: 'unstop', name: 'Unstop', env: 'JOB_FEED_UNSTOP_INTERNSHIPS_URL', hosts: ['unstop.com'] },
    { id: 'linkedin', name: 'LinkedIn', env: 'JOB_FEED_LINKEDIN_INTERNSHIPS_URL', hosts: ['linkedin.com'] },
    { id: 'naukri', name: 'Naukri.com', env: 'JOB_FEED_NAUKRI_INTERNSHIPS_URL', hosts: ['naukri.com'] },
  ],
  government: [
    { id: 'upsc', name: 'UPSC', env: 'GOV_FEED_UPSC_URL', hosts: ['gov.in', 'nic.in'] },
    { id: 'ssc', name: 'SSC', env: 'GOV_FEED_SSC_URL', hosts: ['gov.in', 'nic.in'] },
    { id: 'mppsc', name: 'MPPSC', env: 'GOV_FEED_MPPSC_URL', hosts: ['gov.in', 'nic.in'] },
    { id: 'ncs', name: 'National Career Service', env: 'GOV_FEED_NCS_URL', hosts: ['gov.in', 'nic.in'] },
  ],
};

function hostMatches(hostname, allowedHosts) {
  const host = hostname.toLowerCase();
  return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function plainText(value) {
  if (Array.isArray(value)) return plainText(value[0]);
  if (value && typeof value === 'object') return plainText(value['#text'] || value._ || '');
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function firstLink(value) {
  if (Array.isArray(value)) return firstLink(value.find((entry) => entry?.['@_rel'] === 'alternate') || value[0]);
  if (value && typeof value === 'object') return String(value['@_href'] || value['#text'] || '').trim();
  return String(value || '').trim();
}

function normalizeItem(item, feed) {
  const title = plainText(item.title);
  const url = firstLink(item.link || item.guid || item.id);
  if (!title || !/^https?:\/\//i.test(url)) return null;
  return {
    id: `${feed.id}:${Buffer.from(url).toString('base64url').slice(0, 48)}`,
    title: title.slice(0, 240),
    url,
    description: plainText(item.description || item.summary || item['content:encoded'] || item.content).slice(0, 6000),
    publishedAt: plainText(item.pubDate || item.published || item.updated || item.date),
    source: feed.name,
    sourceId: feed.id,
  };
}

function entriesFromXml(xml, feed) {
  const document = parser.parse(xml);
  const rawEntries = document.rss?.channel?.item
    || document.feed?.entry
    || document.rdf?.item
    || [];
  const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];
  return entries.slice(0, MAX_ITEMS_PER_FEED).map((item) => normalizeItem(item, feed)).filter(Boolean);
}

async function fetchFeed(feed, rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { throw new Error('invalidFeedUrl'); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !hostMatches(url.hostname, feed.hosts)) {
    throw new Error('feedHostNotAllowed');
  }

  const response = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
  });
  if (!response.ok) throw new Error(`feedHttp${response.status}`);
  const length = Number(response.headers.get('content-length') || 0);
  if (length > MAX_FEED_BYTES) throw new Error('feedTooLarge');
  const xml = await response.text();
  if (Buffer.byteLength(xml) > MAX_FEED_BYTES) throw new Error('feedTooLarge');
  return entriesFromXml(xml, feed);
}

export async function getListingsFromFeeds(kind) {
  const feeds = FEEDS[kind];
  if (!feeds) return { items: [], unconfigured: [], errors: [] };
  const configured = feeds.map((feed) => ({ feed, url: String(process.env[feed.env] || '').trim() })).filter(({ url }) => url);
  const unconfigured = feeds.filter((feed) => !String(process.env[feed.env] || '').trim()).map((feed) => feed.name);
  const results = await Promise.all(configured.map(async ({ feed, url }) => {
    try { return { feed, items: await fetchFeed(feed, url) }; }
    catch (error) { return { feed, items: [], error: error?.message || 'feedUnavailable' }; }
  }));
  return {
    items: results.flatMap((result) => result.items).sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0, 100),
    unconfigured,
    errors: results.filter((result) => result.error).map((result) => ({ source: result.feed.name, error: result.error })),
  };
}
