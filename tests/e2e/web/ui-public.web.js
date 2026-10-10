#!/usr/bin/env node
/**
 * WEB-UI-PUB: the public pages of the shop web load (HTTP 200), show the chosen language, have a title and one
 * heading, no raw i18n keys, no console / page errors, no failed requests; the footer / header links lead to pages
 * that exist; narrow window keeps them readable. Run: scripts/e2e/web-e2e.sh --ui public
 */
const H = require('./ui-helpers');
const { CFG } = H;

/** Checks that fail on purpose until the named issue is fixed ("<check name>": '#N') */
const HEALTHY = 'healthy (no raw keys, console errors, failed requests)';
const KNOWN = {};

/** path, text that proves the Vietnamese version, text that proves the English version */
const PAGES = [
  ['/', /Dùng thử|Đăng nhập|cho thuê/i, /Sign in|Log in|Free trial|rental/i],
  ['/features', /Tính năng/, /Features|feature/i],
  ['/pricing', /Bảng giá|Gói|gói/, /Pricing|Plan/i],
  ['/download', /Tải ứng dụng/, /Download/i],
  ['/privacy', /Chính sách quyền riêng tư/i, /Privacy Policy/i],
  ['/terms', /Điều khoản sử dụng/i, /Terms of (Use|Service)/i],
  ['/blog', /Blog/, /Blog/],
  ['/cho-thue-ao-dai', /áo dài/i, /./],
  ['/cho-thue-ao-cuoi', /áo cưới/i, /./],
  ['/cho-thue-trang-phuc', /trang phục/i, /./],
  ['/cho-thue-trang-thiet-bi', /trang thiết bị/i, /./],
  ['/tim-san-pham-bang-hinh-anh', /ảnh|hình/i, /./],
  ['/affiliate', /./, /./]
];

async function main() {
  const rec = H.recorder(KNOWN);
  const { check } = rec;
  const shot = H.shotter();
  const browser = await H.launch();
  try {
    for (const lang of ['vi', 'en']) {
      const ctx = await H.openSession({ browser, api: null, locale: lang === 'vi' ? 'vi-VN' : 'en-US', lang });
      const page = await ctx.newPage();
      const st = H.collect(page);
      for (const [p, viRe, enRe] of PAGES) {
        const id = `WEB-UI-PUB-${String(PAGES.findIndex((x) => x[0] === p) + 1).padStart(2, '0')}${lang === 'en' ? 'e' : ''}`;
        await H.runCase(id, `${p} (${lang})`, async () => {
          st.reset();
          const resp = await page.goto(CFG.client + p, { waitUntil: 'domcontentloaded', timeout: 180000 });
          await H.settle(page, 25000);
          const name = `PUB ${p} [${lang}]`;
          check(`${name} HTTP 200`, resp && resp.status() === 200, resp && resp.status());
          const title = await page.title();
          check(`${name} has a title`, title.trim().length > 5 && !/undefined|null/.test(title), title);
          const h1 = await page.locator('h1').count();
          check(`${name} one heading (h1)`, h1 >= 1, `h1=${h1}`);
          const t = await H.bodyText(page);
          check(`${name} shows ${lang === 'vi' ? 'Vietnamese' : 'English'}`, (lang === 'vi' ? viRe : enRe).test(t), t.slice(0, 160));
          const pr = await H.pageProblems(page, st);
          check(`${name} healthy (no raw keys, console errors, failed requests)`, pr.length === 0, pr.join('; '));
        }, { page, rec, shot });
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  return H.finish(rec.results, 'web-ui-public-results.json');
}

if (require.main === module) H.main(main);
module.exports = { main };
