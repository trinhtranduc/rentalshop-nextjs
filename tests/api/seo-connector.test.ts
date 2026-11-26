/**
 * #1665 SEO Agent Hub connector, contract v1: key, idempotency, the five read calls, the five draft calls, and the
 * route that answers every path under /api/seo-connector with JSON. Database and S3 are mocked; no network.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

const store = new Map<string, any>();
const mockDb: any = {
  prisma: {
    post: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    user: { findFirst: jest.fn() },
    seoConnectorKey: {
      findUnique: jest.fn(async ({ where }: any) => store.get(where.key) ?? null),
      upsert: jest.fn(async ({ where, create }: any) => {
        if (!store.has(where.key)) store.set(where.key, create);
        return store.get(where.key);
      }),
    },
  },
  posts: { create: jest.fn(), publish: jest.fn(), unpublish: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb }));
const listS3Files = jest.fn();
jest.mock('@rentalshop/utils/server', () => ({ listS3Files: (...a: any[]) => listS3Files(...a) }));

import { handleConnector, RULES, type ConnectorRequest } from '../../apps/api/lib/seo-connector/handler';
import { keyFingerprint, keyOk } from '../../apps/api/lib/seo-connector/security';
import { GET as routeGet, POST as routePost } from '../../apps/api/app/api/seo-connector/[[...path]]/route';

const KEY = 'sk_' + 'a'.repeat(64);
const AUTHOR = 42;

function call(method: string, path: string, opts: Partial<ConnectorRequest> & { body?: unknown; key?: string | null; idem?: string | null } = {}) {
  const [p, q] = path.split('?');
  return handleConnector({
    method,
    path: p.split('/').filter(Boolean),
    authorization: opts.key === null ? null : `Bearer ${opts.key ?? KEY}`,
    idempotencyKey: opts.idem === undefined ? null : opts.idem,
    rawBody: opts.rawBody ?? (opts.body === undefined ? '' : JSON.stringify(opts.body)),
    searchParams: new URLSearchParams(q ?? ''),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  store.clear();
  process.env.SEO_CONNECTOR_KEY_SHA256 = keyFingerprint(KEY);
  process.env.SEO_CONNECTOR_AUTHOR_ID = String(AUTHOR);
  process.env.SEO_SITE_URL = 'https://anyrent.shop';
  process.env.ADMIN_URL = 'https://admin.anyrent.shop';
  listS3Files.mockResolvedValue({ files: [] });
  mockDb.prisma.post.findMany.mockResolvedValue([]);
  mockDb.prisma.post.findUnique.mockResolvedValue(null);
  mockDb.posts.create.mockImplementation(async (d: any) => ({ id: 301, ...d }));
  mockDb.prisma.user.findFirst.mockResolvedValue(null);
});

describe('the site key', () => {
  it('accepts the key whose SHA-256 is stored, and refuses a missing, wrong or fingerprint-as-key value', () => {
    expect(keyOk(`Bearer ${KEY}`)).toBe(true);
    expect(keyOk(`bearer ${KEY}`)).toBe(true);
    expect(keyOk(null)).toBe(false);
    expect(keyOk('Bearer ')).toBe(false);
    expect(keyOk('Bearer sk_wrong')).toBe(false);
    expect(keyOk(`Bearer ${keyFingerprint(KEY)}`)).toBe(false); // pasting the fingerprint instead of the key
  });

  it('refuses everything when no fingerprint (or a malformed one) is configured', () => {
    delete process.env.SEO_CONNECTOR_KEY_SHA256;
    expect(keyOk(`Bearer ${KEY}`)).toBe(false);
    process.env.SEO_CONNECTOR_KEY_SHA256 = 'not-hex';
    expect(keyOk(`Bearer ${KEY}`)).toBe(false);
  });

  it('answers 401 JSON on every path, before anything else (unknown paths and writes without Idempotency-Key included)', async () => {
    for (const [method, path] of [['GET', 'meta'], ['GET', 'no/such/thing'], ['POST', 'drafts'], ['PUT', 'drafts/1/cover'], ['DELETE', 'drafts/1']]) {
      const r = await call(method, path, { key: null });
      expect(r.status).toBe(401);
      expect(r.body).toEqual({ ok: false, error: { code: 'unauthorized', message: expect.any(String) } });
    }
    const wrong = await call('GET', 'meta', { key: 'sk_nope' });
    expect(wrong.status).toBe(401);
    expect(mockDb.prisma.seoConnectorKey.findUnique).not.toHaveBeenCalled();
  });
});

describe('read calls', () => {
  it('GET /meta names the site, its locales and contract v1', async () => {
    const r = await call('GET', 'meta');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      ok: true,
      data: { name: 'AnyRent', baseUrl: 'https://anyrent.shop', locales: expect.arrayContaining(['vi', 'en', 'ja']), contractVersion: 'v1', supports: [] },
    });
  });

  it('GET /pages lists the Vietnamese public pages and the published Vietnamese posts, with paths starting with /', async () => {
    mockDb.prisma.post.findMany.mockResolvedValue([{ slug: 'cho-thue-ao-dai', title: 'Cho thuê áo dài' }]);
    const r: any = await call('GET', 'pages');
    expect(mockDb.prisma.post.findMany.mock.calls[0][0].where).toEqual({ status: 'PUBLISHED', locale: 'vi' });
    const paths = r.body.data.map((p: any) => p.path);
    expect(paths).toEqual(expect.arrayContaining(['/', '/pricing', '/features', '/download', '/post', '/post/cho-thue-ao-dai']));
    expect(paths.every((p: string) => p.startsWith('/'))).toBe(true);
    expect(r.body.data.find((p: any) => p.path === '/').kind).toBe('home');
    expect(r.body.data.find((p: any) => p.path === '/post/cho-thue-ao-dai').kind).toBe('article');
  });

  it('GET /images lists the blog media with full urls; an unavailable library gives []', async () => {
    listS3Files.mockResolvedValue({
      files: [
        { key: 'media/blog/bia-tet.jpg', url: 'https://cdn.example/media/blog/bia-tet.jpg', name: 'bia-tet.jpg' },
        { key: 'media/blog/readme.txt', url: 'https://cdn.example/media/blog/readme.txt', name: 'readme.txt' },
      ],
    });
    const r: any = await call('GET', 'images');
    expect(r.body.data).toEqual([{ id: 'media/blog/bia-tet.jpg', url: 'https://cdn.example/media/blog/bia-tet.jpg', alt: 'bia tet', tags: ['blog'] }]);
    listS3Files.mockRejectedValue(new Error('no bucket'));
    const none: any = await call('GET', 'images');
    expect(none.status).toBe(200);
    expect(none.body.data).toEqual([]);
  });

  it('GET /facts/:set is 404 not_found (optional call, AnyRent has no fact sets yet)', async () => {
    const r = await call('GET', 'facts/brokers');
    expect(r.status).toBe(404);
    expect((r.body as any).error.code).toBe('not_found');
  });

  it('GET /rules gives the AnyRent article rules', async () => {
    const r: any = await call('GET', 'rules');
    expect(r.body.data).toEqual(RULES);
    expect(r.body.data).toMatchObject({ disclosure: false, riskPath: null, wordRange: { min: 800, max: 3000 } });
    expect(typeof r.body.data.voice).toBe('string');
  });

  it('#1672 GET /rules lists every public language, the same as /meta, or the Hub skips them; the voice does not force Vietnamese', async () => {
    const rules: any = await call('GET', 'rules');
    const meta: any = await call('GET', 'meta');
    expect(rules.body.data.locales).toEqual(meta.body.data.locales);
    expect(rules.body.data.locales).toEqual(expect.arrayContaining(['vi', 'en', 'ja', 'ko', 'zh', 'zh-TW', 'th']));
    expect(rules.body.data.voice).toMatch(/ngôn ngữ của bài/);
  });

  it('GET /articles lists published posts with full public urls; `since` filters on updatedAt; a bad date is invalid', async () => {
    const publishedAt = new Date('2026-11-20T03:00:00.000Z');
    const updatedAt = new Date('2026-11-21T09:12:00.000Z');
    mockDb.prisma.post.findMany.mockResolvedValue([
      { id: 88, slug: 'rebate', title: 'Một', locale: 'vi', publishedAt, updatedAt },
      { id: 89, slug: 'pricing-guide', title: 'Two', locale: 'en', publishedAt, updatedAt },
    ]);
    const r: any = await call('GET', 'articles?since=2026-11-01T00:00:00Z');
    expect(mockDb.prisma.post.findMany.mock.calls[0][0].where).toEqual({ status: 'PUBLISHED', updatedAt: { gte: new Date('2026-11-01T00:00:00Z') } });
    expect(r.body.data).toEqual([
      { id: '88', url: 'https://anyrent.shop/post/rebate', title: 'Một', locale: 'vi', publishedAt: '2026-11-20T03:00:00.000Z', updatedAt: '2026-11-21T09:12:00.000Z' },
      { id: '89', url: 'https://anyrent.shop/en/post/pricing-guide', title: 'Two', locale: 'en', publishedAt: '2026-11-20T03:00:00.000Z', updatedAt: '2026-11-21T09:12:00.000Z' },
    ]);
    const bad = await call('GET', 'articles?since=yesterday');
    expect(bad.status).toBe(400);
    expect((bad.body as any).error.code).toBe('invalid');
  });

  it('an unknown call is 404 JSON (after the key check)', async () => {
    const r = await call('GET', 'nope');
    expect(r.status).toBe(404);
    expect((r.body as any).error.code).toBe('not_found');
  });
});

describe('POST /drafts', () => {
  const draft = { title: 'Rebate là gì', slug: 'rebate-la-gi', locale: 'vi', body: '<h2>Mở đầu</h2><p>Nội dung <a href="/pricing">giá</a></p>', excerpt: 'Tóm tắt', sourceId: 'idea_1' };

  it('needs an Idempotency-Key (400 invalid) and writes nothing without it', async () => {
    const r = await call('POST', 'drafts', { body: draft });
    expect(r.status).toBe(400);
    expect((r.body as any).error.code).toBe('invalid');
    expect(mockDb.posts.create).not.toHaveBeenCalled();
  });

  it('creates a DRAFT by the connector author with TipTap JSON content and returns 201 + an admin preview url', async () => {
    const r: any = await call('POST', 'drafts', { body: draft, idem: 'k1' });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ ok: true, data: { id: '301', previewUrl: 'https://admin.anyrent.shop/posts/301/edit' } });
    const arg = mockDb.posts.create.mock.calls[0][0];
    expect(arg).toMatchObject({ title: 'Rebate là gì', slug: 'rebate-la-gi', locale: 'vi', status: 'DRAFT', authorId: AUTHOR, excerpt: 'Tóm tắt', seoTitle: 'Rebate là gì', seoDescription: 'Tóm tắt' });
    const doc = JSON.parse(arg.content);
    expect(doc.type).toBe('doc');
    expect(doc.content[0]).toMatchObject({ type: 'heading', attrs: { level: 2 } });
    expect(arg.publishedAt).toBeUndefined();
  });

  it('uses meta for the SEO fields when the Hub sends it, and ignores unknown fields (sourceId, future ones)', async () => {
    await call('POST', 'drafts', { body: { ...draft, meta: { seoTitle: 'SEO tiêu đề', seoDescription: 'SEO mô tả', seoKeywords: ['a', 'b'] }, future: 1 }, idem: 'k2' });
    const arg = mockDb.posts.create.mock.calls[0][0];
    expect(arg).toMatchObject({ seoTitle: 'SEO tiêu đề', seoDescription: 'SEO mô tả', seoKeywords: 'a, b' });
    expect(arg.sourceId).toBeUndefined();
    expect(arg.future).toBeUndefined();
  });

  it('answers the same stored result when the same Idempotency-Key comes again, and creates only one post', async () => {
    const first: any = await call('POST', 'drafts', { body: draft, idem: 'same' });
    const second: any = await call('POST', 'drafts', { body: draft, idem: 'same' });
    expect(second).toEqual(first);
    expect(second.status).toBe(201);
    expect(mockDb.posts.create).toHaveBeenCalledTimes(1);
  });

  it('409 conflict when the slug already exists in the locale (and the failure is not stored, so a fixed retry works)', async () => {
    mockDb.prisma.post.findUnique.mockResolvedValueOnce({ id: 9 });
    const r: any = await call('POST', 'drafts', { body: draft, idem: 'dup' });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('conflict');
    expect(mockDb.posts.create).not.toHaveBeenCalled();
    expect(store.has('dup')).toBe(false);
    expect(mockDb.prisma.post.findUnique.mock.calls[0][0].where).toEqual({ slug_locale: { slug: 'rebate-la-gi', locale: 'vi' } });
  });

  it('400 invalid with field details for a missing title, a bad slug and no body', async () => {
    const r: any = await call('POST', 'drafts', { body: { title: '', slug: 'Bad Slug', body: '', locale: 'vi' }, idem: 'bad' });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('invalid');
    expect(Object.keys(r.body.error.details).sort()).toEqual(['body', 'slug', 'title']);
    expect(mockDb.posts.create).not.toHaveBeenCalled();
  });

  it('#1672 422 invalid with details.locale for a language the site does not have, and nothing is stored', async () => {
    const r: any = await call('POST', 'drafts', { body: { ...draft, locale: 'xx' }, idem: 'badloc' });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe('invalid');
    expect(Object.keys(r.body.error.details)).toEqual(['locale']);
    expect(mockDb.prisma.post.findUnique).not.toHaveBeenCalled();
    expect(mockDb.posts.create).not.toHaveBeenCalled();
  });

  it('400 invalid for a body that is not JSON, not an object, or over 1 MB', async () => {
    expect((await call('POST', 'drafts', { rawBody: '{oops', idem: 'j1' })).status).toBe(400);
    expect((await call('POST', 'drafts', { rawBody: '[1]', idem: 'j2' })).status).toBe(400);
    const big = await call('POST', 'drafts', { rawBody: 'x'.repeat(1_000_001), idem: 'j3' });
    expect(big.status).toBe(400);
  });

  it('answers server (not a crash) when no author is set and the site has no ARTICLE or ADMIN account', async () => {
    delete process.env.SEO_CONNECTOR_AUTHOR_ID;
    const r: any = await call('POST', 'drafts', { body: draft, idem: 'noauthor' });
    expect(r.status).toBe(500);
    expect(r.body.error.code).toBe('server');
    expect(mockDb.posts.create).not.toHaveBeenCalled();
  });

  it('#1682 no SEO_CONNECTOR_AUTHOR_ID and no default account: drafts go under the first ARTICLE account', async () => {
    delete process.env.SEO_CONNECTOR_AUTHOR_ID;
    mockDb.prisma.user.findFirst.mockImplementation(async ({ where }: any) => (where.role === 'ARTICLE' ? { id: 7 } : where.role === 'ADMIN' ? { id: 1 } : null));
    const r: any = await call('POST', 'drafts', { body: draft, idem: 'art' });
    expect(r.status).toBe(201);
    expect(mockDb.posts.create.mock.calls[0][0].authorId).toBe(7);
    expect(mockDb.prisma.user.findFirst.mock.calls[1][0]).toMatchObject({ where: { role: 'ARTICLE' }, orderBy: { id: 'asc' } });
  });

  it('#1682 no SEO_CONNECTOR_AUTHOR_ID: the default author account is found by email, ahead of ARTICLE and ADMIN', async () => {
    delete process.env.SEO_CONNECTOR_AUTHOR_ID;
    mockDb.prisma.user.findFirst.mockImplementation(async ({ where }: any) => (where.email ? { id: 55 } : { id: 1 }));
    const r: any = await call('POST', 'drafts', { body: draft, idem: 'mail' });
    expect(r.status).toBe(201);
    expect(mockDb.posts.create.mock.calls[0][0].authorId).toBe(55);
    expect(mockDb.prisma.user.findFirst.mock.calls[0][0].where).toEqual({ email: { equals: 'kathypham28088@gmail.com', mode: 'insensitive' } });
  });

  it('#1682 no SEO_CONNECTOR_AUTHOR_ID and no ARTICLE account: the first ADMIN', async () => {
    delete process.env.SEO_CONNECTOR_AUTHOR_ID;
    mockDb.prisma.user.findFirst.mockImplementation(async ({ where }: any) => (where.role === 'ADMIN' ? { id: 1 } : null));
    const r: any = await call('POST', 'drafts', { body: draft, idem: 'adm' });
    expect(r.status).toBe(201);
    expect(mockDb.posts.create.mock.calls[0][0].authorId).toBe(1);
  });

  it('#1682 SEO_CONNECTOR_AUTHOR_ID still wins and no account lookup is made', async () => {
    const r: any = await call('POST', 'drafts', { body: draft, idem: 'env' });
    expect(r.status).toBe(201);
    expect(mockDb.posts.create.mock.calls[0][0].authorId).toBe(AUTHOR);
    expect(mockDb.prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('#1682 a draft is editable by the connector when the author came from the fallback', async () => {
    delete process.env.SEO_CONNECTOR_AUTHOR_ID;
    mockDb.prisma.user.findFirst.mockImplementation(async ({ where }: any) => (where.role === 'ARTICLE' ? { id: 7 } : null));
    mockDb.prisma.post.findUnique.mockResolvedValue({ id: 301, slug: 's', locale: 'vi', status: 'DRAFT', authorId: 7, publishedAt: null, title: 'T' });
    mockDb.prisma.post.update.mockResolvedValue({});
    const r: any = await call('PUT', 'drafts/301', { body: { title: 'Mới' }, idem: 'put7' });
    expect(r.status).toBe(200);
    const other = { id: 302, slug: 's', locale: 'vi', status: 'DRAFT', authorId: 99, publishedAt: null, title: 'T' };
    mockDb.prisma.post.findUnique.mockResolvedValue(other);
    expect(((await call('PUT', 'drafts/302', { body: { title: 'X' }, idem: 'put99' })) as any).status).toBe(403);
  });

  it('never leaks a database error message', async () => {
    mockDb.posts.create.mockRejectedValue(new Error('connection string postgres://secret'));
    const r: any = await call('POST', 'drafts', { body: draft, idem: 'boom' });
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toMatch(/postgres|secret/);
  });
});

describe('draft edits, cover, publish and unpublish (only drafts the connector made)', () => {
  const mine = (over: any = {}) => ({ id: 301, slug: 'rebate-la-gi', locale: 'vi', status: 'DRAFT', authorId: AUTHOR, publishedAt: null, title: 'T', ...over });

  it('PUT /drafts/:id edits title, excerpt and body (HTML to TipTap) and returns the id', async () => {
    mockDb.prisma.post.findUnique.mockResolvedValue(mine());
    const r: any = await call('PUT', 'drafts/301', { body: { title: 'Mới', body: '<p>Sửa</p>', excerpt: 'Ngắn' }, idem: 'p1' });
    expect(r.body).toEqual({ ok: true, data: { id: '301' } });
    const data = mockDb.prisma.post.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ title: 'Mới', excerpt: 'Ngắn' });
    expect(JSON.parse(data.content).content[0].type).toBe('paragraph');
  });

  it('refuses a post the connector did not create (403), a missing one (404) and an already published one (409)', async () => {
    mockDb.prisma.post.findUnique.mockResolvedValue(mine({ authorId: 7 }));
    expect((await call('PUT', 'drafts/301', { body: { title: 'X' }, idem: 'a1' })).status).toBe(403);
    expect((await call('POST', 'drafts/301/publish', { idem: 'a2' })).status).toBe(403);
    mockDb.prisma.post.findUnique.mockResolvedValue(null);
    expect((await call('PUT', 'drafts/999', { body: { title: 'X' }, idem: 'a3' })).status).toBe(404);
    expect((await call('PUT', 'drafts/abc', { body: { title: 'X' }, idem: 'a4' })).status).toBe(404);
    mockDb.prisma.post.findUnique.mockResolvedValue(mine({ status: 'PUBLISHED' }));
    const r: any = await call('PUT', 'drafts/301', { body: { title: 'X' }, idem: 'a5' });
    expect(r.status).toBe(409);
    expect(mockDb.prisma.post.update).not.toHaveBeenCalled();
    expect(mockDb.posts.publish).not.toHaveBeenCalled();
  });

  it('PUT /drafts/:id/cover takes an imageId from the library only', async () => {
    mockDb.prisma.post.findUnique.mockResolvedValue(mine());
    listS3Files.mockResolvedValue({ files: [{ key: 'media/blog/bia.jpg', url: 'https://cdn.example/media/blog/bia.jpg', name: 'bia.jpg' }] });
    const ok: any = await call('PUT', 'drafts/301/cover', { body: { imageId: 'media/blog/bia.jpg' }, idem: 'c1' });
    expect(ok.body).toEqual({ ok: true, data: { coverUrl: 'https://cdn.example/media/blog/bia.jpg' } });
    expect(mockDb.prisma.post.update.mock.calls[0][0]).toEqual({ where: { id: 301 }, data: { featuredImage: 'https://cdn.example/media/blog/bia.jpg' } });
    for (const imageId of ['media/blog/missing.jpg', 'other/folder/x.jpg', 'media/blog/../secret.jpg', undefined]) {
      const bad: any = await call('PUT', 'drafts/301/cover', { body: { imageId }, idem: `c-${String(imageId)}` });
      expect(bad.status).toBe(400);
    }
  });

  it('POST /drafts/:id/publish publishes a draft, answers the public url and date; a repeat with a new key changes nothing', async () => {
    const publishedAt = new Date('2026-11-26T04:00:00.000Z');
    mockDb.prisma.post.findUnique.mockResolvedValueOnce(mine());
    mockDb.posts.publish.mockResolvedValue({ id: 301, publishedAt });
    const r: any = await call('POST', 'drafts/301/publish', { idem: 'pub1' });
    expect(r.body).toEqual({ ok: true, data: { url: 'https://anyrent.shop/post/rebate-la-gi', publishedAt: '2026-11-26T04:00:00.000Z' } });
    expect(mockDb.posts.publish).toHaveBeenCalledWith(301);
    // the same key: the stored answer, the post is not touched again
    const again: any = await call('POST', 'drafts/301/publish', { idem: 'pub1' });
    expect(again).toEqual(r);
    expect(mockDb.posts.publish).toHaveBeenCalledTimes(1);
    // a different key on a post that is now published: same url, no second publish
    mockDb.prisma.post.findUnique.mockResolvedValue(mine({ status: 'PUBLISHED', publishedAt }));
    const other: any = await call('POST', 'drafts/301/publish', { idem: 'pub2' });
    expect(other.body.data).toEqual(r.body.data);
    expect(mockDb.posts.publish).toHaveBeenCalledTimes(1);
  });

  it('publish uses the locale prefix for a non-Vietnamese post', async () => {
    mockDb.prisma.post.findUnique.mockResolvedValue(mine({ locale: 'en', slug: 'guide' }));
    mockDb.posts.publish.mockResolvedValue({ id: 301, publishedAt: new Date('2026-11-26T04:00:00.000Z') });
    const r: any = await call('POST', 'drafts/301/publish', { idem: 'pub-en' });
    expect(r.body.data.url).toBe('https://anyrent.shop/en/post/guide');
  });

  it('POST /drafts/:id/unpublish takes a published post back to draft; an unpublished one is left alone', async () => {
    mockDb.prisma.post.findUnique.mockResolvedValueOnce(mine({ status: 'PUBLISHED' }));
    const r: any = await call('POST', 'drafts/301/unpublish', { idem: 'u1' });
    expect(r.body).toEqual({ ok: true, data: { id: '301' } });
    expect(mockDb.posts.unpublish).toHaveBeenCalledWith(301);
    mockDb.prisma.post.findUnique.mockResolvedValueOnce(mine());
    await call('POST', 'drafts/301/unpublish', { idem: 'u2' });
    expect(mockDb.posts.unpublish).toHaveBeenCalledTimes(1);
  });

  it('is the only call that publishes: no other call touches status', async () => {
    mockDb.prisma.post.findUnique.mockResolvedValue(mine());
    const res: any = await call('PUT', 'drafts/301', { body: { title: 'a', body: '<p>x</p>', excerpt: 'e', status: 'PUBLISHED', publishedAt: '2026-01-01' }, idem: 'n1' });
    expect(res.status).toBe(200);
    const data = mockDb.prisma.post.update.mock.calls[0][0].data;
    expect(data.status).toBeUndefined();
    expect(data.publishedAt).toBeUndefined();
    expect(mockDb.posts.publish).not.toHaveBeenCalled();
    mockDb.prisma.post.findUnique.mockResolvedValue(null); // the slug is free
    await call('POST', 'drafts', { body: { title: 'T', slug: 's', body: '<p>x</p>', status: 'PUBLISHED' }, idem: 'n2' });
    expect(mockDb.posts.create.mock.calls[0][0].status).toBe('DRAFT');
  });

  it('an unknown write call is 404 JSON', async () => {
    mockDb.prisma.post.findUnique.mockResolvedValue(mine());
    const r = await call('POST', 'drafts/301/explode', { idem: 'x1' });
    expect(r.status).toBe(404);
    const r2 = await call('POST', 'elsewhere', { idem: 'x2' });
    expect(r2.status).toBe(404);
  });
});

describe('the route at /api/seo-connector/[[...path]]', () => {
  const req = (method: string, url: string, headers: Record<string, string> = {}, text = '') =>
    ({ method, url, headers: { get: (k: string) => headers[k.toLowerCase()] ?? null }, text: async () => text }) as any;

  it('maps /v1/... to the calls and answers JSON with the status', async () => {
    const res: any = await routeGet(req('GET', 'https://api.anyrent.shop/api/seo-connector/v1/meta', { authorization: `Bearer ${KEY}` }), { params: { path: ['v1', 'meta'] } });
    expect(res.status).toBe(200);
    expect(res.body.data.contractVersion).toBe('v1');
  });

  it('answers 401 JSON for every path below /api/seo-connector without a key: other versions, no path, deep paths', async () => {
    for (const path of [undefined, ['v1'], ['v2', 'meta'], ['v1', 'a', 'b', 'c']]) {
      const res: any = await routeGet(req('GET', 'https://api.anyrent.shop/api/seo-connector'), { params: { path } as any });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('unauthorized');
    }
  });

  it('answers 404 JSON (with the key) for another version or no path', async () => {
    for (const path of [undefined, ['v1'], ['v2', 'meta']]) {
      const res: any = await routeGet(req('GET', 'https://api.anyrent.shop/api/seo-connector', { authorization: `Bearer ${KEY}` }), { params: { path } as any });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('not_found');
    }
  });

  it('passes the Idempotency-Key header and the raw body to a write call', async () => {
    const res: any = await routePost(
      req('POST', 'https://api.anyrent.shop/api/seo-connector/v1/drafts', { authorization: `Bearer ${KEY}`, 'idempotency-key': 'route-1' }, JSON.stringify({ title: 'T', slug: 'rt', body: '<p>x</p>' })),
      { params: { path: ['v1', 'drafts'] } }
    );
    expect(res.status).toBe(201);
    expect(store.get('route-1')).toMatchObject({ status: 201 });
  });
});
