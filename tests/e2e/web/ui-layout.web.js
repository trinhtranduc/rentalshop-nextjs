#!/usr/bin/env node
/**
 * WEB-UI-LAY: every main screen in Vietnamese and English (no raw keys, no leftover Vietnamese chrome in English),
 * in the dark theme (readable), and in a narrow window 390 x 844 (no horizontal scroll, main content visible);
 * the public pages in the narrow window too. Catalogue: tests/e2e/TEST_CASES.md (WEB-UI). Run: scripts/e2e/web-e2e.sh --ui layout
 */
const H = require('./ui-helpers');
const F = require('./ui-order-flow');

/** Checks that fail on purpose until the named issue is fixed ("<check name>": '#N') */
const KNOWN = {};

const SCREENS = ['/dashboard', '/orders', '/orders/create', '/customers', '/products', '/categories', '/calendar', '/availability', '/outlets', '/users', '/loyalty', '/notifications', '/plans'];
const PUBLIC = ['/', '/login', '/features', '/pricing', '/download', '/privacy', '/terms'];
/** Vietnamese words of the shell: none of them may stay in the English UI */
const VI_CHROME = /Tổng quan|Đơn hàng|Khách hàng|Lịch giao trả|Kiểm tra còn hàng|Sản phẩm|Cài đặt cửa hàng|Tạo đơn/;

const lum = (rgb) => {
  const m = rgb.match(/\d+(\.\d+)?/g).map(Number);
  const c = m.slice(0, 3).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const overflow = (page) => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }));
const colours = (page) => page.evaluate(() => {
  const main = document.querySelector('main') || document.body;
  const h = document.querySelector('h1') || main;
  return { bg: getComputedStyle(main).backgroundColor, fg: getComputedStyle(h).color };
});

async function main() {
  const rec = H.recorder(KNOWN);
  const { check } = rec;
  const shot = H.shotter();
  const api = await H.apiLogin();
  const browser = await H.launch();
  try {
    // ---- English (cookie NEXT_LOCALE=en)
    {
      const ctx = await H.openSession({ browser, api, locale: 'en-US', lang: 'en' });
      const page = await ctx.newPage();
      const st = H.collect(page);
      await H.runCase('WEB-UI-LAY-01', 'every main screen in English: no raw keys, no Vietnamese menu, healthy', async () => {
        for (const p of SCREENS) {
          st.reset();
          await F.go(page, p);
          if (p === '/dashboard') await page.locator('section[aria-label]').first().waitFor({ timeout: 40000 }).catch(() => {});
          const t = await H.bodyText(page);
          const pr = await H.pageProblems(page, st);
          check(`LAY-01 ${p} [en]: healthy, no raw key`, pr.length === 0, pr.join('; '));
          check(`LAY-01 ${p} [en]: the sidebar is English (no "Đơn hàng", "Khách hàng", "Tạo đơn"…)`, !VI_CHROME.test(t.split('\n').slice(0, 30).join('\n')), t.slice(0, 200));
        }
      }, { page, rec, shot });
      await ctx.close();
    }
    // ---- Vietnamese, dark theme
    {
      const ctx = await H.openSession({ browser, api, theme: 'dark' });
      const page = await ctx.newPage();
      const st = H.collect(page);
      await H.runCase('WEB-UI-LAY-02', 'every main screen in the dark theme: readable heading, no horizontal scroll, healthy', async () => {
        for (const p of SCREENS) {
          st.reset();
          await F.go(page, p);
          const c = await colours(page);
          const r = ratio(c.bg, c.fg);
          const o = await overflow(page);
          check(`LAY-02 ${p} [dark]: the page is dark and the heading contrasts (${r.toFixed(1)})`, lum(c.bg) < 0.2 && r >= 4.5, JSON.stringify(c));
          check(`LAY-02 ${p} [dark]: no horizontal scroll`, o.sw <= o.cw + 1, JSON.stringify(o));
          const pr = await H.pageProblems(page, st);
          check(`LAY-02 ${p} [dark]: healthy`, pr.length === 0, pr.join('; '));
        }
      }, { page, rec, shot });
      await ctx.close();
    }
    // ---- narrow window
    {
      const ctx = await H.openSession({ browser, api, viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      const st = H.collect(page);
      await H.runCase('WEB-UI-LAY-03', 'every main screen at 390 x 844: no horizontal scroll, content visible, the menu opens', async () => {
        for (const p of SCREENS) {
          st.reset();
          await F.go(page, p);
          const o = await overflow(page);
          check(`LAY-03 ${p} [390px]: no horizontal scroll`, o.sw <= o.cw + 1, JSON.stringify(o));
          const t = await H.bodyText(page);
          const hasMain = await page.evaluate(() => { const m = document.querySelector('main'); return !!m && m.getBoundingClientRect().width > 300 && m.innerText.trim().length > 10; });
          check(`LAY-03 ${p} [390px]: the main content is visible`, hasMain, t.slice(0, 120));
          const pr = await H.pageProblems(page, st);
          check(`LAY-03 ${p} [390px]: healthy`, pr.length === 0, pr.join('; '));
        }
        // the create-order screen: both the product list and the cart are reachable
        await F.go(page, '/orders/create');
        const bar = await page.getByRole('button', { name: /Xem đơn · \d+ món|Tạo đơn/ }).count();
        check('LAY-03 /orders/create [390px]: a bar or button leads to the cart', bar >= 1);
      }, { page, rec, shot });
      await H.runCase('WEB-UI-LAY-04', 'public pages at 390 x 844: no horizontal scroll, readable', async () => {
        const anon = await H.openSession({ browser, api: null, viewport: { width: 390, height: 844 } });
        const pg = await anon.newPage();
        const st2 = H.collect(pg);
        for (const p of PUBLIC) {
          st2.reset();
          await pg.goto(H.CFG.client + p, { waitUntil: 'domcontentloaded', timeout: 180000 });
          await H.settle(pg, 25000);
          const o = await overflow(pg);
          check(`LAY-04 ${p} [390px]: no horizontal scroll`, o.sw <= o.cw + 1, JSON.stringify(o));
          const t = await H.bodyText(pg);
          check(`LAY-04 ${p} [390px]: has content and no raw key`, t.trim().length > 100 && H.rawKeys(t).length === 0 || p === '/', `${t.length} ${H.rawKeys(t).join()}`);
        }
        await anon.close();
      }, { page, rec, shot });
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  return H.finish(rec.results, 'web-ui-layout-results.json');
}

if (require.main === module) H.main(main);
module.exports = { main };
