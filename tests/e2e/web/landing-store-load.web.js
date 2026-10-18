/* Local-only, headed: BASE_URL=http://localhost:3388 node tests/e2e/web/landing-store-load.web.js */
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://localhost:3388';
assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const output = process.env.OUTPUT_DIR || '/private/tmp/anyrent-992-e2e';
fs.mkdirSync(output, { recursive: true });
const safari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36';
const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';
(async () => {
  const browser = await chromium.launch({ headless: false, channel: 'chrome', slowMo: 180 });
  const results = [];
  try {
    for (const scenario of [
      { name: 'iphone', ua: safari, store: 'https://apps.apple.com/vn/app/anyrent/id6754793592' },
      { name: 'android', ua: android, store: 'https://play.google.com/store/apps/details?id=anyrent.shop' },
      { name: 'ipad-desktop', ua: mac, touch: 5, store: 'https://apps.apple.com/vn/app/anyrent/id6754793592' },
      { name: 'desktop', ua: mac },
      { name: 'web-opt-out', ua: safari, query: '?web=1' },
      { name: 'remembered-opt-out', ua: android, cookie: true },
      { name: 'bot', ua: android + ' Googlebot' },
    ]) {
      const context = await browser.newContext({ userAgent: scenario.ua, viewport: { width: 390, height: 844 } });
      if (scenario.cookie) await context.addCookies([{ name: 'anyrent_web', value: '1', url: base }]);
      await context.addInitScript(touch => {
        Object.defineProperty(navigator, 'maxTouchPoints', { value: touch });
        window.__loaded = false;
        window.addEventListener('load', () => { window.__loaded = true; console.log('ANYRENT_E2E_LOAD:' + JSON.stringify({ loaded: true, ready: document.readyState, heading: !!document.querySelector('h1') })); });
      }, scenario.touch || 0);
      const page = await context.newPage();
      let release; const gate = new Promise(resolve => { release = resolve; });
      let storeRequest = null; let observedLoad = null;
      page.on('console', msg => { if(msg.text().startsWith('ANYRENT_E2E_LOAD:')) observedLoad = JSON.parse(msg.text().slice('ANYRENT_E2E_LOAD:'.length)); });
      await page.route('**/*', async route => {
        const url = route.request().url();
        if (url.startsWith('https://apps.apple.com/') || url.startsWith('https://play.google.com/')) {
          storeRequest = { url, observed: observedLoad };
          return route.fulfill({ contentType: 'text/html', body: '<h1>Store navigation intercepted</h1>' });
        }
        if (url === base + '/__landing-load-gate.png') {
          await gate;
          return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
        }
        if (route.request().isNavigationRequest() && url.startsWith(base + '/')) {
          const response = await route.fetch();
          assert.equal(response.status(), 200, 'landing must not return store redirect');
          const html = (await response.text()).replace('</body>', '<img src="/__landing-load-gate.png" width="1" height="1" alt="" /></body>');
          return route.fulfill({ response, body: html });
        }
        // No real API, telemetry or remote asset calls are needed for this navigation test.
        if (!url.startsWith(base + '/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        return route.continue();
      });
      await page.goto(base + '/' + (scenario.query || ''), { waitUntil: 'domcontentloaded' });
      await page.locator('h1').first().waitFor({ state: 'visible' });
      assert.equal(storeRequest, null, 'landing remains visible before load');
      assert.notEqual(await page.evaluate(() => document.readyState), 'complete');
      await page.screenshot({ path: output + '/' + scenario.name + '-landing-before-load.png' });
      release();
      if (scenario.store) {
        await page.waitForURL(scenario.store, { waitUntil: 'load' });
        assert.equal(storeRequest.url, scenario.store);
        assert.deepEqual(storeRequest.observed, { loaded: true, ready: 'complete', heading: true });
      } else {
        await page.waitForLoadState('load');
        // More than two frames must pass to prove the redirect stays disabled.
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
        assert.equal(storeRequest, null);
        assert.equal(new URL(page.url()).origin, base);
        if (scenario.query) assert.equal((await context.cookies()).find(c => c.name === 'anyrent_web')?.value, '1');
      }
      results.push({ scenario: scenario.name, pass: true, storeRequest });
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      await context.close();
    }
    fs.writeFileSync(output + '/results.json', JSON.stringify(results, null, 2));
    console.log('PASS: ' + results.length + ' headed scenarios; landing visible before load, correct post-load store, desktop/bot/query/cookie stay on web');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
