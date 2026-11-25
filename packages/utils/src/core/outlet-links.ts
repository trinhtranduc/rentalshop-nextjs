/**
 * #1643: links of a branch (web, Facebook, Instagram, TikTok, YouTube, Zalo, other) shown on the public shop page.
 * One set of rules for the API (what is stored and served) and the web / app forms (what is checked while typing).
 * Pure: no I/O, no dates.
 */

export const OUTLET_LINK_TYPES = ['website', 'facebook', 'instagram', 'tiktok', 'youtube', 'zalo', 'other'] as const;
export type OutletLinkType = (typeof OUTLET_LINK_TYPES)[number];

export interface OutletLink {
  type: OutletLinkType;
  url: string;
  /** Only for `other`: the name the owner gave the link */
  label?: string;
}

export const OUTLET_LINKS_MAX = 6;
export const OUTLET_LINK_URL_MAX = 300;
export const OUTLET_LINK_LABEL_MAX = 30;

/** `invalid` = not a usable http(s) address; `platform` = a valid address but not of the chosen network */
export type OutletLinkError = 'invalid' | 'platform' | 'labelRequired' | 'labelTooLong';

/** Hosts each network may use (a subdomain such as `www.` or `m.` also counts). `null` = any host. */
const HOSTS: Record<OutletLinkType, string[] | null> = {
  website: null,
  other: null,
  facebook: ['facebook.com', 'fb.com', 'fb.me'],
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'],
  zalo: ['zalo.me', 'zalo.com'],
};

/** Names of the networks, the same in every language; `website` and `other` are translated by the screens */
export const OUTLET_LINK_BRAND_NAMES: Partial<Record<OutletLinkType, string>> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  zalo: 'Zalo',
};

export const isOutletLinkType = (value: unknown): value is OutletLinkType =>
  typeof value === 'string' && (OUTLET_LINK_TYPES as readonly string[]).includes(value);

const hostMatches = (host: string, allowed: string[]) => allowed.some((h) => host === h || host.endsWith(`.${h}`));

/** `https://` added when the owner typed no scheme; anything else with a scheme (`javascript:`, `mailto:`) is refused. */
function toUrl(raw: string): URL | null {
  const text = raw.trim();
  if (!text || text.length > OUTLET_LINK_URL_MAX) return null;
  const hasHttp = /^https?:\/\//i.test(text);
  if (!hasHttp && /^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[^/\s:]+\.[^/\s:]+:\d+/.test(text)) return null;
  let url: URL;
  try {
    url = new URL(hasHttp ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  if (!url.hostname.includes('.') || url.hostname.startsWith('.') || url.hostname.endsWith('.')) return null;
  return url;
}

/** The address as stored: lower-case host, no trailing slash on a bare host. */
const stored = (url: URL): string => {
  const text = url.toString();
  return url.pathname === '/' && !url.search && !url.hash ? text.slice(0, -1) : text;
};

export function normalizeOutletLink(input: {
  type: OutletLinkType;
  url: string;
  label?: string | null;
}): { ok: true; link: OutletLink } | { ok: false; error: OutletLinkError } {
  const url = toUrl(input.url);
  if (!url) return { ok: false, error: 'invalid' };
  const allowed = HOSTS[input.type];
  if (allowed && !hostMatches(url.hostname, allowed)) return { ok: false, error: 'platform' };
  const link: OutletLink = { type: input.type, url: stored(url) };
  if (input.type === 'other') {
    const label = (input.label ?? '').trim();
    if (!label) return { ok: false, error: 'labelRequired' };
    if (label.length > OUTLET_LINK_LABEL_MAX) return { ok: false, error: 'labelTooLong' };
    link.label = label;
  }
  return { ok: true, link };
}

export type OutletLinksResult =
  | { ok: true; links: OutletLink[] }
  | { ok: false; error: 'tooMany' | 'invalid'; index?: number; reason?: OutletLinkError };

/** Checks a whole list (form submit / API body): normalises each, drops exact repeats, at most 6. */
export function normalizeOutletLinks(list: unknown): OutletLinksResult {
  if (!Array.isArray(list)) return { ok: false, error: 'invalid' };
  const links: OutletLink[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < list.length; index += 1) {
    const raw = list[index] as { type?: unknown; url?: unknown; label?: unknown } | null;
    if (!raw || typeof raw !== 'object' || !isOutletLinkType(raw.type) || typeof raw.url !== 'string') {
      return { ok: false, error: 'invalid', index, reason: 'invalid' };
    }
    const result = normalizeOutletLink({ type: raw.type, url: raw.url, label: typeof raw.label === 'string' ? raw.label : null });
    if (!result.ok) return { ok: false, error: 'invalid', index, reason: result.error };
    const key = `${result.link.type}|${result.link.url}|${result.link.label ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push(result.link);
  }
  if (links.length > OUTLET_LINKS_MAX) return { ok: false, error: 'tooMany' };
  return { ok: true, links };
}

/**
 * Reads the stored column (`null`, an old shape, junk) into a clean list. Never throws; keeps only links that still pass
 * the rules, so a public page never serves an address that is not http(s).
 */
export function parseStoredOutletLinks(value: unknown): OutletLink[] {
  if (!Array.isArray(value)) return [];
  const out: OutletLink[] = [];
  for (const item of value) {
    if (out.length >= OUTLET_LINKS_MAX) break;
    const raw = item as { type?: unknown; url?: unknown; label?: unknown } | null;
    if (!raw || typeof raw !== 'object' || !isOutletLinkType(raw.type) || typeof raw.url !== 'string') continue;
    const result = normalizeOutletLink({ type: raw.type, url: raw.url, label: typeof raw.label === 'string' ? raw.label : null });
    if (result.ok) out.push(result.link);
  }
  return out;
}
