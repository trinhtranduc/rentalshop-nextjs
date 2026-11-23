/**
 * Pure reading of one of the site's own pages: what a search engine sees in the HTML now. Regex only, so it is an
 * approximation of the rendered page; every figure is counted from the HTML given, never estimated.
 */

export const AUDIT_LIMITS = { title: 60, description: 155, minWords: 300, minInternalLinks: 3 } as const;

export type PageFacts = {
  status: number;
  title: string | null;
  description: string | null;
  h1: string | null;
  h1Count: number;
  /** Path of the canonical link, or the full URL when it points to another host; null when absent. */
  canonical: string | null;
  noindex: boolean;
  /** Words of visible text inside <main>, or <body> when there is no <main>. */
  words: number;
  /** Distinct same-site paths linked from that text, the page itself excluded. */
  internalLinks: number;
  jsonLd: number;
  /** Images with no alt attribute at all; an empty alt marks a decorative image and is not counted. */
  imagesNoAlt: number;
};

export type PageIssue = { id: string; label: string };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s: string) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => (e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) || m : (ENTITIES[e.toLowerCase()] ?? m)));
const clean = (s: string) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  return out;
}

const normalPath = (p: string) => (p.split(/[?#]/)[0] ?? "").replace(/\/+$/, "") || "/";

/** Reads the facts out of the HTML. `path` is the page's own path and `siteHost` its host without www. */
export function readPage(html: string, input: { status: number; path: string; siteHost: string }): PageFacts {
  const site = input.siteHost.toLowerCase().replace(/^www\./, "");
  const sameHost = (host: string) => host.toLowerCase().replace(/^www\./, "") === site;
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const title = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || null;
  const description = metas.find((m) => m.name?.toLowerCase() === "description")?.content?.trim() || null;
  const robots = metas.filter((m) => ["robots", "googlebot"].includes(m.name?.toLowerCase() ?? "")).map((m) => m.content ?? "").join(",");
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => clean(m[1])).filter(Boolean);

  let canonical: string | null = null;
  const href = links.find((l) => l.rel?.toLowerCase().split(/\s+/).includes("canonical"))?.href?.trim();
  if (href) {
    try {
      const u = new URL(href, `https://${site}`);
      canonical = sameHost(u.hostname) ? normalPath(u.pathname) : u.href.slice(0, 300);
    } catch {
      canonical = href.slice(0, 300);
    }
  }

  const scope = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const visible = scope.replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, " ");
  const text = clean(visible);
  const self = normalPath(input.path);
  const targets = new Set<string>();
  for (const m of visible.matchAll(/<a\b[^>]*>/gi)) {
    const h = attrs(m[0]).href?.trim();
    if (!h || /^(#|mailto:|tel:|javascript:)/i.test(h)) continue;
    try {
      const u = new URL(h, `https://${site}${self}`);
      if (sameHost(u.hostname) && normalPath(u.pathname) !== self) targets.add(normalPath(u.pathname));
    } catch {
      // An unreadable href is not a link a crawler follows.
    }
  }
  return {
    status: input.status,
    title,
    description,
    h1: h1s[0]?.slice(0, 300) ?? null,
    h1Count: h1s.length,
    canonical,
    noindex: /noindex/i.test(robots),
    words: text ? text.split(" ").length : 0,
    internalLinks: targets.size,
    jsonLd: [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>/gi)].length,
    imagesNoAlt: [...visible.matchAll(/<img\b[^>]*>/gi)].filter((m) => !/\salt(\s*=|[\s/>])/i.test(m[0])).length,
  };
}

/** Fixed rules over the facts. An empty list means nothing was found by these rules, not that the page is good. */
export function pageIssues(facts: PageFacts, path: string): PageIssue[] {
  const out: PageIssue[] = [];
  const add = (id: string, label: string) => out.push({ id, label });
  if (facts.status !== 200) {
    add("status", `Trang trả mã ${facts.status || "lỗi kết nối"}`);
    return out;
  }
  if (facts.noindex) add("noindex", "Trang đang đặt noindex");
  if (!facts.title) add("title", "Thiếu thẻ title");
  else if (facts.title.length > AUDIT_LIMITS.title) add("title", `Title dài ${facts.title.length} ký tự (chuẩn ${AUDIT_LIMITS.title})`);
  if (!facts.description) add("description", "Thiếu mô tả meta");
  else if (facts.description.length > AUDIT_LIMITS.description) add("description", `Mô tả dài ${facts.description.length} ký tự (chuẩn ${AUDIT_LIMITS.description})`);
  if (facts.h1Count !== 1) add("h1", facts.h1Count === 0 ? "Không có H1" : `Có ${facts.h1Count} thẻ H1`);
  const self = (path.split(/[?#]/)[0] ?? "").replace(/\/+$/, "") || "/";
  if (!facts.canonical) add("canonical", "Thiếu canonical");
  else if (facts.canonical !== self) add("canonical", `Canonical trỏ sang ${facts.canonical}`);
  if (facts.words < AUDIT_LIMITS.minWords) add("words", `Chỉ ${facts.words} từ (dưới ${AUDIT_LIMITS.minWords})`);
  if (facts.internalLinks < AUDIT_LIMITS.minInternalLinks) add("links", `Chỉ ${facts.internalLinks} liên kết nội bộ`);
  if (facts.jsonLd === 0) add("jsonld", "Không có dữ liệu có cấu trúc (JSON-LD)");
  if (facts.imagesNoAlt > 0) add("alt", `${facts.imagesNoAlt} ảnh thiếu alt`);
  return out;
}

/** Only same-site paths are read: a path must start with one slash and resolve to the site's own host. */
export function auditUrl(siteUrl: string, path: string): string | null {
  if (!/^\/(?!\/)/.test(path) || /[\s\\]/.test(path)) return null;
  try {
    const base = new URL(siteUrl);
    const u = new URL(path, base);
    return u.origin === base.origin ? u.href : null;
  } catch {
    return null;
  }
}
