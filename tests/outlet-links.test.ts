/**
 * #1643: links of a branch. Pure rules shared by the API (what is stored and served) and the forms. No dates, so the
 * answers must not change under TZ=UTC or TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  OUTLET_LINKS_MAX,
  normalizeOutletLink,
  normalizeOutletLinks,
  parseStoredOutletLinks,
} from '../packages/utils/src/core/outlet-links';

const ok = (type: any, url: string, label?: string) => {
  const r = normalizeOutletLink({ type, url, label });
  if (!r.ok) throw new Error(`expected ok, got ${r.error} for ${url}`);
  return r.link;
};
const bad = (type: any, url: string, label?: string) => {
  const r = normalizeOutletLink({ type, url, label });
  return r.ok ? 'ok' : r.error;
};

describe('normalizeOutletLink', () => {
  it('adds https:// when the owner typed none, lower-cases the host, trims, drops a bare trailing slash', () => {
    expect(ok('website', '  Tenshop.VN ')).toEqual({ type: 'website', url: 'https://tenshop.vn' });
    expect(ok('website', 'http://tenshop.vn/')).toEqual({ type: 'website', url: 'http://tenshop.vn' });
    expect(ok('website', 'https://tenshop.vn/dat-lich?x=1')).toEqual({ type: 'website', url: 'https://tenshop.vn/dat-lich?x=1' });
    expect(ok('website', 'tenshop.vn:8080/x').url).toBe('https://tenshop.vn:8080/x');
  });

  it('refuses anything that is not a usable http(s) address', () => {
    for (const url of ['', '   ', 'facebook', 'javascript:alert(1)', 'mailto:a@b.com', 'ftp://tenshop.vn', 'data:text/html,hi', 'https://user:pw@tenshop.vn', 'https://.vn', 'ht tp://x.vn', `https://tenshop.vn/${'a'.repeat(300)}`]) {
      expect(bad('website', url)).toBe('invalid');
    }
  });

  it('each network accepts its own hosts (with www. / m.) and refuses others', () => {
    expect(ok('facebook', 'www.facebook.com/tenshop').url).toBe('https://www.facebook.com/tenshop');
    expect(ok('facebook', 'fb.me/tenshop').type).toBe('facebook');
    expect(ok('instagram', 'instagram.com/tenshop').type).toBe('instagram');
    expect(ok('tiktok', 'https://www.tiktok.com/@tenshop').type).toBe('tiktok');
    expect(ok('youtube', 'youtu.be/abc').type).toBe('youtube');
    expect(ok('zalo', 'https://zalo.me/0901234567').url).toBe('https://zalo.me/0901234567');
    expect(bad('instagram', 'tiktok.com/@tenshop')).toBe('platform');
    expect(bad('facebook', 'notfacebook.com/x')).toBe('platform');
    expect(bad('zalo', 'https://evilzalo.me/1')).toBe('platform');
    expect(bad('tiktok', 'https://tiktok.com.evil.vn/x')).toBe('platform');
  });

  it('website and other take any host; other needs a name of 1 to 30 characters', () => {
    expect(ok('website', 'https://shopee.vn/tenshop').type).toBe('website');
    expect(ok('other', 'https://shopee.vn/tenshop', ' Shopee ')).toEqual({ type: 'other', url: 'https://shopee.vn/tenshop', label: 'Shopee' });
    expect(bad('other', 'https://shopee.vn/x')).toBe('labelRequired');
    expect(bad('other', 'https://shopee.vn/x', '   ')).toBe('labelRequired');
    expect(bad('other', 'https://shopee.vn/x', 'x'.repeat(31))).toBe('labelTooLong');
    // a name on any other type is ignored, never stored
    expect(ok('website', 'https://a.vn', 'ignored')).toEqual({ type: 'website', url: 'https://a.vn' });
  });
});

describe('normalizeOutletLinks (a whole list)', () => {
  const l = (type: string, url: string) => ({ type, url });

  it('normalises each link and drops exact repeats', () => {
    const r = normalizeOutletLinks([l('website', 'a.vn'), l('website', 'https://a.vn/'), l('instagram', 'instagram.com/a')]);
    expect(r).toEqual({ ok: true, links: [{ type: 'website', url: 'https://a.vn' }, { type: 'instagram', url: 'https://instagram.com/a' }] });
  });

  it('empty list is fine (clears)', () => {
    expect(normalizeOutletLinks([])).toEqual({ ok: true, links: [] });
  });

  it('6 links pass, 7 do not', () => {
    const six = Array.from({ length: OUTLET_LINKS_MAX }, (_, i) => l('website', `https://s${i}.vn`));
    expect(normalizeOutletLinks(six).ok).toBe(true);
    expect(normalizeOutletLinks([...six, l('website', 'https://s9.vn')])).toEqual({ ok: false, error: 'tooMany' });
  });

  it('repeats do not count toward the limit', () => {
    const list = Array.from({ length: 8 }, () => l('website', 'https://same.vn'));
    expect(normalizeOutletLinks(list)).toEqual({ ok: true, links: [{ type: 'website', url: 'https://same.vn' }] });
  });

  it('names the bad row and why; junk shapes are invalid', () => {
    expect(normalizeOutletLinks([l('website', 'a.vn'), l('facebook', 'facebook')])).toEqual({ ok: false, error: 'invalid', index: 1, reason: 'invalid' });
    expect(normalizeOutletLinks([l('instagram', 'tiktok.com/@a')])).toMatchObject({ ok: false, index: 0, reason: 'platform' });
    expect(normalizeOutletLinks([l('mastodon', 'a.vn')])).toMatchObject({ ok: false, index: 0 });
    expect(normalizeOutletLinks('x')).toMatchObject({ ok: false });
    expect(normalizeOutletLinks([null])).toMatchObject({ ok: false, index: 0 });
  });
});

describe('parseStoredOutletLinks (reading the column)', () => {
  it('null, undefined, a string or an object are no links', () => {
    for (const v of [null, undefined, 'x', 3, {}, { type: 'website' }]) expect(parseStoredOutletLinks(v)).toEqual([]);
  });

  it('keeps good links, silently drops anything that no longer passes (a public page never serves it)', () => {
    const stored = [
      { type: 'website', url: 'https://a.vn' },
      { type: 'website', url: 'javascript:alert(1)' },
      { type: 'instagram', url: 'https://tiktok.com/@a' },
      { type: 'nope', url: 'https://a.vn' },
      { type: 'zalo', url: 'zalo.me/0901234567' },
      null,
    ];
    expect(parseStoredOutletLinks(stored)).toEqual([
      { type: 'website', url: 'https://a.vn' },
      { type: 'zalo', url: 'https://zalo.me/0901234567' },
    ]);
  });

  it('never serves more than 6', () => {
    const stored = Array.from({ length: 10 }, (_, i) => ({ type: 'website', url: `https://s${i}.vn` }));
    expect(parseStoredOutletLinks(stored)).toHaveLength(OUTLET_LINKS_MAX);
  });
});
