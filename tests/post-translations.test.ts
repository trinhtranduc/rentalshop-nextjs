jest.mock('../packages/database/src/client', () => {
  const rows = new Map<number, any>();
  let sequence = 0;
  const match = (p: any, where: any) => Object.entries(where ?? {}).every(([k, v]: [string, any]) =>
    v && typeof v === 'object' && 'not' in v ? p[k] !== v.not : p[k] === v);
  const post = {
    findUnique: jest.fn(async ({ where }: any) => where.id !== undefined ? rows.get(where.id) ?? null : [...rows.values()].find(p => match(p, where.slug_locale)) ?? null),
    findFirst: jest.fn(async ({ where }: any) => [...rows.values()].find(p => match(p, where)) ?? null),
    findMany: jest.fn(async ({ where }: any) => [...rows.values()].filter(p => match(p, where))),
    create: jest.fn(async ({ data }: any) => {
      if ([...rows.values()].some(p => p.locale === data.locale && (p.slug === data.slug || (data.translationKey && p.translationKey === data.translationKey)))) {
        throw Object.assign(new Error('unique'), { code: 'P2002' });
      }
      const row = { id: ++sequence, translationKey: null, ...data };
      rows.set(row.id, row); return row;
    }),
    update: jest.fn(async ({ where, data }: any) => { const row = { ...rows.get(where.id), ...data }; rows.set(where.id, row); return row; }),
  };
  const tx = { post, $queryRaw: jest.fn(async () => []) };
  return { prisma: { ...tx, $transaction: (f: any) => f(tx) }, __rows: rows };
});
import { create, update, translationsOf } from '../packages/database/src/post';
const rows: Map<number, any> = require('../packages/database/src/client').__rows;
const input = { title: 'Source', slug: 'source', locale: 'vi' as const, content: '{"type":"doc"}', authorId: 9, status: 'PUBLISHED' as const };

describe('translated post editions (#1000)', () => {
  beforeEach(() => rows.clear());
  it('links different slugs atomically without copying or overwriting source content', async () => {
    const source = await create(input);
    const russian = await create({ ...input, locale: 'ru', slug: 'russian-title', title: 'Русский', content: 'Russian text', status: 'DRAFT', translationSourceId: source.id });
    expect(rows.get(source.id).translationKey).toBe(russian.translationKey);
    expect(rows.get(source.id).title).toBe('Source');
    await update(russian.id, { title: 'Updated Russian', content: 'Updated only this edition' });
    expect(rows.get(source.id).content).toBe(input.content);
    expect(rows.get(russian.id).content).toBe('Updated only this edition');
  });
  it('never exposes a draft or archived edition to public language links', async () => {
    const source = await create(input);
    const ru = await create({ ...input, locale: 'ru', slug: 'ru-edition', status: 'DRAFT', translationSourceId: source.id });
    expect((await translationsOf(rows.get(source.id))).map(p => p.id)).toEqual([source.id]);
    expect(await translationsOf(rows.get(source.id), false)).toHaveLength(2);
    await update(ru.id, { status: 'PUBLISHED' });
    expect(await translationsOf(rows.get(source.id))).toHaveLength(2);
    await update(ru.id, { status: 'ARCHIVED' });
    expect(await translationsOf(rows.get(source.id))).toHaveLength(1);
  });
  it('rejects unknown source and duplicate locale in a translation group', async () => {
    await expect(create({ ...input, translationSourceId: 999 })).rejects.toThrow('POST_NOT_FOUND');
    const source = await create(input);
    await create({ ...input, locale: 'ru', slug: 'first-ru', translationSourceId: source.id });
    await expect(create({ ...input, locale: 'ru', slug: 'second-ru', translationSourceId: source.id })).rejects.toMatchObject({ code: 'P2002' });
  });
  it('checks slug conflicts even when an editor only changes the language', async () => {
    const source = await create(input);
    await create({ ...input, locale: 'ru' });
    await expect(update(source.id, { locale: 'ru' })).rejects.toThrow('already exists');
  });
  it('keeps legacy same-slug language editions independently editable', async () => {
    const vi = await create(input);
    const en = await create({ ...input, locale: 'en', title: 'English' });
    expect(await translationsOf(vi)).toHaveLength(2);
    await update(en.id, { title: 'Updated English' });
    expect(rows.get(vi.id).title).toBe('Source');
  });
});
