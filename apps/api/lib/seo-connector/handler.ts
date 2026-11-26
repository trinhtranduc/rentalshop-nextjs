/**
 * #1665 SEO Agent Hub connector, contract v1 (`seo-agent-hub/docs/connector-contract.md`).
 *
 * Eleven calls under `/api/seo-connector/v1`. The Hub runs the AI team; AnyRent only answers: it lists pages, images and
 * rules, keeps drafts as `Post` rows with `status = DRAFT` (never public, never in the sitemap) and publishes one only when
 * the Hub sends `publish` after the owner confirmed there. Every answer is `{ ok: true, data }` or
 * `{ ok: false, error: { code, message } }`. The route calls `handleConnector`, which returns plain objects.
 *
 * - The key is checked before anything else, on every path (unknown ones included).
 * - Write calls need `Idempotency-Key`; the first successful answer is stored and replayed unchanged.
 * - The connector only edits, publishes and unpublishes drafts it created (author = `SEO_CONNECTOR_AUTHOR_ID`), never a post
 *   the owner wrote by hand.
 */
import { db } from '@rentalshop/database';
import { PUBLIC_LOCALES, PUBLIC_PAGES, isPublicLocale, publicHomePath, publicPagePath, publicPostPath, type PublicLocale } from '@rentalshop/constants';
import { listS3Files } from '@rentalshop/utils/server';
import { BodyTooComplexError, htmlToTipTap } from './html-to-tiptap';
import { keyOk } from './security';

export interface ConnectorResult {
  status: number;
  body: { ok: true; data: unknown } | { ok: false; error: { code: string; message: string; details?: unknown } };
}
export interface ConnectorRequest {
  method: string;
  /** Path segments after `/api/seo-connector/v1` */
  path: string[];
  authorization: string | null;
  idempotencyKey: string | null;
  /** Raw body text of a write call (empty for GET) */
  rawBody: string;
  searchParams: URLSearchParams;
}

const MAX_BODY_BYTES = 1_000_000;
const MAX_LIST = 300;
const MEDIA_PREFIX = 'media/blog/';
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ok = (data: unknown, status = 200): ConnectorResult => ({ status, body: { ok: true, data } });
export const fail = (code: string, message: string, status: number, details?: unknown): ConnectorResult => ({
  status,
  body: { ok: false, error: { code, message, ...(details === undefined ? {} : { details }) } },
});

const siteUrl = () => (process.env.SEO_SITE_URL || process.env.CLIENT_URL || 'https://anyrent.shop').replace(/\/+$/, '');
const adminUrl = () => (process.env.ADMIN_URL || 'https://admin.anyrent.shop').replace(/\/+$/, '');
const authorId = (): number | null => {
  const n = Number(process.env.SEO_CONNECTOR_AUTHOR_ID);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** What the writer is told about AnyRent's voice and limits (the `write-article` rules). */
export const RULES = {
  disclosure: false,
  riskPath: null,
  voice:
    'Nói với chủ shop cho thuê đồ bằng ngôn ngữ của bài (tiếng Việt là ngôn ngữ gốc), rõ ràng, thực tế, không thuật ngữ khó. Không hứa kết quả, không dùng "độc quyền", "hàng đầu", "rẻ nhất". Chỉ nêu tính năng AnyRent đã có.',
  locales: [...PUBLIC_LOCALES],
  wordRange: { min: 800, max: 3000 },
} as const;

const PAGE_TITLES: Record<string, string> = {
  pricing: 'Bảng giá AnyRent',
  features: 'Tính năng AnyRent',
  download: 'Tải ứng dụng AnyRent',
  'image-search': 'Tìm sản phẩm bằng hình ảnh',
};

const toIso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : null);
const postUrl = (locale: string, slug: string) => `${siteUrl()}${publicPostPath(isPublicLocale(locale) ? locale : 'vi', slug)}`;

async function loadMedia(): Promise<Array<{ key: string; url: string; name: string }>> {
  try {
    const result = await listS3Files({ prefix: MEDIA_PREFIX, maxKeys: MAX_LIST });
    return (result.files ?? []).filter((f: { key: string }) => /\.(jpe?g|png|webp|gif)$/i.test(f.key));
  } catch (error) {
    // S3 not configured (local, dev): no library, the calendar of drafts still works
    console.error('[seo-connector] image library unavailable:', error);
    return [];
  }
}

const imageAlt = (name: string) => name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim();

type PostRow = { id: number; slug: string; locale: string; status: string; authorId: number; publishedAt: Date | null; title?: string };

/** A draft this connector made: found, not the owner's own post. Null result = already an error answer. */
async function ownPost(rawId: string): Promise<{ post: PostRow } | { error: ConnectorResult }> {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return { error: fail('not_found', 'No such draft.', 404) };
  const post = (await db.prisma.post.findUnique({
    where: { id },
    select: { id: true, slug: true, locale: true, status: true, authorId: true, publishedAt: true, title: true },
  })) as PostRow | null;
  if (!post) return { error: fail('not_found', 'No such draft.', 404) };
  const author = authorId();
  if (author === null || post.authorId !== author) {
    return { error: fail('forbidden', 'This post was not created by the connector.', 403) };
  }
  return { post };
}

const str = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

async function readCalls(req: ConnectorRequest): Promise<ConnectorResult | null> {
  const [head, id] = req.path;
  if (req.method !== 'GET') return null;

  if (head === 'meta' && req.path.length === 1) {
    return ok({ name: 'AnyRent', baseUrl: siteUrl(), locales: [...PUBLIC_LOCALES], contractVersion: 'v1', supports: [] });
  }

  if (head === 'pages' && req.path.length === 1) {
    const pages: Array<{ path: string; title: string; kind: string }> = [
      { path: publicHomePath('vi'), title: 'Trang chủ AnyRent', kind: 'home' },
      ...PUBLIC_PAGES.map((p) => ({ path: publicPagePath('vi', p), title: PAGE_TITLES[p] ?? p, kind: 'page' })),
      { path: publicPostPath('vi'), title: 'Blog AnyRent', kind: 'page' },
    ];
    const posts = (await db.prisma.post.findMany({
      where: { status: 'PUBLISHED', locale: 'vi' },
      orderBy: { publishedAt: 'desc' },
      take: MAX_LIST,
      select: { slug: true, title: true },
    })) as Array<{ slug: string; title: string }>;
    for (const p of posts) pages.push({ path: publicPostPath('vi', p.slug), title: p.title, kind: 'article' });
    return ok(pages);
  }

  if (head === 'images' && req.path.length === 1) {
    const files = await loadMedia();
    return ok(files.map((f) => ({ id: f.key, url: f.url, alt: imageAlt(f.name), tags: ['blog'] })));
  }

  if (head === 'facts' && id) {
    // Optional call: AnyRent has no fact sets yet, so the Hub says "no numbers to check against".
    return fail('not_found', 'Unknown fact set.', 404);
  }

  if (head === 'rules' && req.path.length === 1) return ok(RULES);

  if (head === 'articles' && req.path.length === 1) {
    const sinceRaw = req.searchParams.get('since');
    let since: Date | null = null;
    if (sinceRaw) {
      since = new Date(sinceRaw);
      if (Number.isNaN(since.getTime())) return fail('invalid', '`since` must be an ISO 8601 date.', 400);
    }
    const rows = (await db.prisma.post.findMany({
      where: { status: 'PUBLISHED', ...(since ? { updatedAt: { gte: since } } : {}) },
      orderBy: { publishedAt: 'desc' },
      take: MAX_LIST,
      select: { id: true, slug: true, title: true, locale: true, publishedAt: true, updatedAt: true },
    })) as Array<{ id: number; slug: string; title: string; locale: string; publishedAt: Date | null; updatedAt: Date }>;
    return ok(
      rows.map((r) => ({
        id: String(r.id),
        url: postUrl(r.locale, r.slug),
        title: r.title,
        locale: r.locale,
        publishedAt: toIso(r.publishedAt),
        updatedAt: toIso(r.updatedAt),
      }))
    );
  }
  return null;
}

async function createDraft(body: Record<string, unknown>): Promise<ConnectorResult> {
  const author = authorId();
  if (author === null) return fail('server', 'SEO_CONNECTOR_AUTHOR_ID is not configured on the site.', 500);

  const title = str(body.title, 200);
  const slug = str(body.slug, 120);
  const html = typeof body.body === 'string' ? body.body : '';
  const details: Record<string, string> = {};
  if (!title) details.title = 'required, up to 200 characters';
  if (!slug || !SLUG_RE.test(slug)) details.slug = 'required, lowercase letters, digits and hyphens';
  if (!html.trim()) details.body = 'required (HTML)';
  const locale = body.locale === undefined ? 'vi' : body.locale;
  if (!isPublicLocale(locale)) details.locale = `one of ${PUBLIC_LOCALES.join(', ')}`;
  // #1672 a language the site does not have is 422 (the draft is never stored in another language); other field errors stay 400
  if (Object.keys(details).length) return fail('invalid', 'Missing or wrong fields.', details.locale ? 422 : 400, details);

  const loc = locale as PublicLocale;
  const taken = await db.prisma.post.findUnique({ where: { slug_locale: { slug: slug!, locale: loc } }, select: { id: true } });
  if (taken) return fail('conflict', 'Slug already exists in this locale.', 409);

  let content: string;
  try {
    content = JSON.stringify(htmlToTipTap(html));
  } catch (error) {
    if (error instanceof BodyTooComplexError) return fail('invalid', 'Body is too complex: too many elements or nested too deeply.', 400, { body: 'too complex' });
    throw error;
  }

  const meta = (body.meta && typeof body.meta === 'object' ? body.meta : {}) as Record<string, unknown>;
  const excerpt = str(body.excerpt, 500);
  const keywords = Array.isArray(meta.seoKeywords) ? meta.seoKeywords.filter((k) => typeof k === 'string').join(', ') : str(meta.seoKeywords, 300);

  const post = await db.posts.create({
    title: title!,
    slug: slug!,
    locale: loc,
    content,
    excerpt,
    seoTitle: str(meta.seoTitle, 200) ?? title,
    seoDescription: str(meta.seoDescription, 320) ?? excerpt,
    seoKeywords: keywords || undefined,
    status: 'DRAFT',
    authorId: author,
  });
  return ok({ id: String(post.id), previewUrl: `${adminUrl()}/posts/${post.id}/edit` }, 201);
}

async function writeCalls(req: ConnectorRequest): Promise<ConnectorResult | null> {
  const [head, id, sub] = req.path;
  if (head !== 'drafts') return null;

  let body: Record<string, unknown> = {};
  if (req.rawBody.trim()) {
    try {
      const parsed = JSON.parse(req.rawBody);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
      else return fail('invalid', 'Body must be a JSON object.', 400);
    } catch {
      return fail('invalid', 'Body must be valid JSON.', 400);
    }
  }

  if (req.method === 'POST' && !id) return createDraft(body);
  if (!id) return null;

  const found = await ownPost(id);
  if ('error' in found) return found.error;
  const { post } = found;

  if (req.method === 'PUT' && !sub) {
    if (post.status !== 'DRAFT') return fail('conflict', 'The post is already published; unpublish it first.', 409);
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const t = str(body.title, 200);
      if (!t) return fail('invalid', 'title must be a non-empty string.', 400, { title: 'invalid' });
      data.title = t;
    }
    if (body.excerpt !== undefined) data.excerpt = str(body.excerpt, 500) ?? null;
    if (body.body !== undefined) {
      if (typeof body.body !== 'string' || !body.body.trim()) return fail('invalid', 'body must be non-empty HTML.', 400, { body: 'invalid' });
      try {
        data.content = JSON.stringify(htmlToTipTap(body.body));
      } catch (error) {
        if (error instanceof BodyTooComplexError) return fail('invalid', 'Body is too complex: too many elements or nested too deeply.', 400, { body: 'too complex' });
        throw error;
      }
    }
    if (Object.keys(data).length) await db.prisma.post.update({ where: { id: post.id }, data });
    return ok({ id: String(post.id) });
  }

  if (req.method === 'PUT' && sub === 'cover') {
    if (post.status !== 'DRAFT') return fail('conflict', 'The post is already published; unpublish it first.', 409);
    const imageId = str(body.imageId, 500);
    if (!imageId || !imageId.startsWith(MEDIA_PREFIX) || imageId.includes('..')) return fail('invalid', 'Unknown imageId.', 400, { imageId: 'not in the image library' });
    const file = (await loadMedia()).find((f) => f.key === imageId);
    if (!file) return fail('invalid', 'Unknown imageId.', 400, { imageId: 'not in the image library' });
    await db.prisma.post.update({ where: { id: post.id }, data: { featuredImage: file.url } });
    return ok({ coverUrl: file.url });
  }

  if (req.method === 'POST' && sub === 'publish') {
    if (post.status === 'PUBLISHED') return ok({ url: postUrl(post.locale, post.slug), publishedAt: toIso(post.publishedAt) });
    if (post.status !== 'DRAFT') return fail('conflict', 'Only a draft can be published.', 409);
    const published = (await db.posts.publish(post.id)) as { publishedAt: Date | null };
    return ok({ url: postUrl(post.locale, post.slug), publishedAt: toIso(published.publishedAt) });
  }

  if (req.method === 'POST' && sub === 'unpublish') {
    if (post.status === 'PUBLISHED') await db.posts.unpublish(post.id);
    return ok({ id: String(post.id) });
  }
  return null;
}

/** Looks up the stored answer of a write call. */
async function replay(key: string): Promise<ConnectorResult | null> {
  const seen = (await db.prisma.seoConnectorKey.findUnique({ where: { key } })) as { status: number; response: ConnectorResult['body'] } | null;
  return seen ? { status: seen.status, body: seen.response } : null;
}

async function remember(key: string, result: ConnectorResult): Promise<void> {
  try {
    await db.prisma.seoConnectorKey.upsert({
      where: { key },
      create: { key, status: result.status, response: result.body as object },
      update: {},
    });
  } catch (error) {
    // the answer is already right; a lost record only means a repeat is processed again
    console.error('[seo-connector] could not store the idempotency record:', error);
  }
}

export async function handleConnector(req: ConnectorRequest): Promise<ConnectorResult> {
  // 1. the key, before anything else (unknown paths included)
  if (!keyOk(req.authorization)) return fail('unauthorized', 'Bad or missing site key.', 401);

  try {
    if (req.rawBody.length > MAX_BODY_BYTES) return fail('invalid', 'Body is too large (limit 1 MB).', 400, { body: 'too large' });

    if (req.method === 'GET') {
      return (await readCalls(req)) ?? fail('not_found', `No such call: GET /${req.path.join('/')}`, 404);
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      // 2. every write call carries an Idempotency-Key
      const key = req.idempotencyKey?.trim();
      if (!key) return fail('invalid', 'Idempotency-Key header is required.', 400);
      if (key.length > 200) return fail('invalid', 'Idempotency-Key is too long.', 400);
      const seen = await replay(key);
      if (seen) return seen;
      const result = await writeCalls(req);
      if (!result) return fail('not_found', `No such call: ${req.method} /${req.path.join('/')}`, 404);
      if (result.body.ok) await remember(key, result);
      return result;
    }
    return fail('not_found', `No such call: ${req.method} /${req.path.join('/')}`, 404);
  } catch (error) {
    console.error('[seo-connector] error:', error);
    return fail('server', 'The site could not answer this call.', 500);
  }
}
