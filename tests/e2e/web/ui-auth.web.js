#!/usr/bin/env node
/**
 * WEB-UI-AUTH: login, wrong password (vi and en), logout, protected routes, single-session kick,
 * forget / reset password and register pages (shop web apps/client). Catalogue: tests/e2e/TEST_CASES.md (WEB-UI).
 * Run: scripts/e2e/web-e2e.sh --ui auth
 */
const H = require('./ui-helpers');
const { CFG } = H;

/** Checks that fail on purpose until the named issue is fixed */
const KNOWN = {};

async function main() {
  const rec = H.recorder(KNOWN);
  const { check } = rec;
  const shot = H.shotter();
  const api = await H.apiLogin();
  const browser = await H.launch();
  const sp = (page) => ({ page, rec, shot });
  const fresh = async (opts = {}) => {
    const ctx = await H.openSession({ browser, api: null, ...opts });
    const page = await ctx.newPage();
    return { ctx, page, st: H.collect(page) };
  };
  const open = async (page, p) => {
    await page.goto(CFG.client + p, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await H.settle(page);
  };
  const submitLogin = async (page, email, password) => {
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: /^(Đăng nhập|Sign in|Login|Log in)$/i }).click();
  };
  /** The flag button opens a menu with one button per language ("🇻🇳 VI", "🇺🇸 EN") */
  const switchLang = async (page, code) => {
    await page.locator('button:visible').filter({ hasText: /^\S+\s*(VI|EN)$/ }).first().click();
    await page.locator('[role="menuitem"], [role="option"]').filter({ hasText: new RegExp(`${code}$`) }).first().click();
  };
  const stored = (page) => page.evaluate(() => localStorage.getItem('authData'));

  try {
    // ---- AUTH-01 login page renders
    {
      const { ctx, page, st } = await fresh();
      await H.runCase('WEB-UI-AUTH-01', 'login page renders in vi', async () => {
        await open(page, '/login');
        const t = await H.bodyText(page);
        check('AUTH-01 labels', /Địa chỉ Email/.test(t) && /Mật khẩu/.test(t) && /Quên mật khẩu\?/.test(t) && /Tạo cửa hàng mới/.test(t), t.slice(0, 200));
        check('AUTH-01 html lang = vi', (await page.evaluate(() => document.documentElement.lang)) === 'vi');
        const pr = await H.pageProblems(page, st);
        check('AUTH-01 healthy page (no raw keys, console errors, failed requests)', pr.length === 0, pr.join('; '));
      }, sp(page));

      // ---- AUTH-02 empty form
      await H.runCase('WEB-UI-AUTH-02', 'empty login form is not sent', async () => {
        await open(page, '/login');
        st.reset();
        await page.getByRole('button', { name: 'Đăng nhập' }).first().click();
        await page.waitForTimeout(800);
        const calls = st.http4xx.length;
        check('AUTH-02 stays on /login with no token', new URL(page.url()).pathname === '/login' && !(await stored(page)), page.url());
        check('AUTH-02 a message tells what is missing', /bắt buộc|nhập|không hợp lệ|required/i.test(await H.bodyText(page)), (await H.bodyText(page)).slice(-300));
        check('AUTH-02 no request was sent for an empty form', calls === 0, `4xx=${calls}`);
      }, sp(page));

      // ---- AUTH-03 wrong password (vi)
      await H.runCase('WEB-UI-AUTH-03', 'wrong password: vi message', async () => {
        await open(page, '/login');
        await submitLogin(page, CFG.email, 'WrongPass123');
        await page.getByText('Email hoặc mật khẩu không đúng').waitFor({ timeout: 15000 });
        const t = await H.bodyText(page);
        check('AUTH-03 message "Email hoặc mật khẩu không đúng"', true);
        check('AUTH-03 no raw key (errors.INVALID_CREDENTIALS)', H.rawKeys(t).length === 0, H.rawKeys(t).join());
        check('AUTH-03 stays on /login, no token', new URL(page.url()).pathname === '/login' && !(await stored(page)), page.url());
        // typing clears the message
        await page.locator('input[name="password"]').fill('x');
        check('AUTH-03 message disappears when typing', (await page.getByText('Email hoặc mật khẩu không đúng').count()) === 0);
      }, sp(page));

      // ---- AUTH-04 unknown email gives the same message (no account enumeration)
      await H.runCase('WEB-UI-AUTH-04', 'unknown email shows the same message', async () => {
        await open(page, '/login');
        await submitLogin(page, 'nobody-e2e@example.com', 'WrongPass123');
        await page.getByText('Email hoặc mật khẩu không đúng').waitFor({ timeout: 15000 });
        check('AUTH-04 same message as a wrong password', true);
      }, sp(page));
      await ctx.close();
    }

    // ---- AUTH-05 wrong password (en)
    {
      const { ctx, page } = await fresh({ locale: 'en-US', lang: 'en' });
      await H.runCase('WEB-UI-AUTH-05', 'wrong password: en message', async () => {
        await open(page, '/login');
        check('AUTH-05 en labels', /Email Address|Email/.test(await H.bodyText(page)) && /Forgot password\?/i.test(await H.bodyText(page)), (await H.bodyText(page)).slice(0, 300));
        await submitLogin(page, CFG.email, 'WrongPass123');
        await page.getByText('Invalid email or password').waitFor({ timeout: 15000 });
        check('AUTH-05 message "Invalid email or password"', true);
        check('AUTH-05 no raw key', H.rawKeys(await H.bodyText(page)).length === 0);
      }, sp(page));
      await ctx.close();
    }

    // ---- AUTH-06 language switch on the login page
    {
      const { ctx, page } = await fresh();
      await H.runCase('WEB-UI-AUTH-06', 'language switch vi <-> en on the login page', async () => {
        await open(page, '/login');
        await switchLang(page, 'EN');
        await page.getByText(/Forgot password\?/i).first().waitFor({ timeout: 15000 });
        check('AUTH-06 vi -> en: page shows English', true);
        check('AUTH-06 cookie NEXT_LOCALE=en', (await ctx.cookies()).some((c) => c.name === 'NEXT_LOCALE' && c.value === 'en'));
        await page.reload({ waitUntil: 'domcontentloaded' });
        await H.settle(page);
        check('AUTH-06 English survives a reload', /Forgot password\?/i.test(await H.bodyText(page)));
        await switchLang(page, 'VI');
        await page.getByText('Quên mật khẩu?').first().waitFor({ timeout: 15000 });
        check('AUTH-06 en -> vi: page shows Vietnamese', true);
      }, sp(page));
      await ctx.close();
    }

    // ---- AUTH-07 login, AUTH-08 logout, AUTH-09 protected route
    {
      const { ctx, page, st } = await fresh();
      await H.runCase('WEB-UI-AUTH-07', 'login with the right password opens the dashboard', async () => {
        await open(page, '/login');
        await submitLogin(page, CFG.email, CFG.password);
        await page.waitForURL(/\/dashboard/, { timeout: 60000 });
        await H.settle(page);
        const a = JSON.parse((await stored(page)) || '{}');
        check('AUTH-07 /dashboard opens', true, page.url());
        check('AUTH-07 session holds the merchant account', a.user?.email === CFG.email && !!a.token, a.user?.email);
        const t = await H.bodyText(page);
        check('AUTH-07 the shell shows the merchant name and role', /Chủ doanh nghiệp/.test(t), t.slice(0, 200));
        const pr = await H.pageProblems(page, st, { allow4xx: [/POST \/api\/auth\/login/] });
        check('AUTH-07 healthy dashboard', pr.length === 0, pr.join('; '));
      }, sp(page));

      await H.runCase('WEB-UI-AUTH-08', 'logout clears the session', async () => {
        await page.getByRole('button', { name: 'Đăng xuất' }).first().click();
        // a confirm dialog may ask first
        const confirm = page.getByRole('dialog').getByRole('button', { name: /Đăng xuất|Xác nhận/ });
        if (await confirm.count()) await confirm.first().click();
        await page.waitForURL(/\/login/, { timeout: 30000 });
        check('AUTH-08 back on /login', true, page.url());
        check('AUTH-08 localStorage authData removed', !(await stored(page)));
        await open(page, '/orders');
        await page.waitForURL(/\/login/, { timeout: 30000 }).catch(() => {});
        check('AUTH-08 /orders after logout redirects to /login', new URL(page.url()).pathname === '/login', page.url());
        await page.goBack().catch(() => {});
        await H.settle(page, 5000);
        check('AUTH-08 browser Back does not show the orders again', !/Tất cả đơn/.test(await H.bodyText(page)));
      }, sp(page));
      await ctx.close();
    }

    // ---- AUTH-09 protected routes without a session
    {
      const { ctx, page } = await fresh();
      await H.runCase('WEB-UI-AUTH-09', 'every shop screen redirects to /login without a session', async () => {
        for (const p of ['/dashboard', '/orders', '/orders/create', '/customers', '/products', '/settings', '/users', '/outlets', '/categories', '/calendar']) {
          await page.goto(CFG.client + p, { waitUntil: 'domcontentloaded', timeout: 180000 });
          await page.waitForURL(/\/login/, { timeout: 30000 }).catch(() => {});
          check(`AUTH-09 ${p} -> /login`, new URL(page.url()).pathname === '/login', page.url());
        }
      }, sp(page));
      await ctx.close();
    }

    // ---- AUTH-10 single-session kick (a real form login: the session then holds the refresh token too)
    {
      const { ctx, page, st } = await fresh();
      await H.runCase('WEB-UI-AUTH-10', 'a login elsewhere ends this session: the next screen goes to /login and the session is cleared', async () => {
        await open(page, '/login');
        await submitLogin(page, CFG.email, CFG.password);
        await page.waitForURL(/\/dashboard/, { timeout: 60000 });
        await H.settle(page);
        await H.apiLogin(CFG.email, CFG.password); // a second device takes the session
        await page.goto(CFG.client + '/orders', { waitUntil: 'domcontentloaded', timeout: 180000 });
        await page.waitForURL(/\/login/, { timeout: 60000 }).catch(() => {});
        await H.settle(page, 8000);
        const t = await H.bodyText(page);
        check('AUTH-10 sent to /login (and stays: no /login <-> /dashboard loop)', new URL(page.url()).pathname === '/login', page.url());
        await page.waitForTimeout(3000);
        check('AUTH-10 still on /login 3 s later', new URL(page.url()).pathname === '/login', page.url());
        check('AUTH-10 the stale session is removed from localStorage', !(await stored(page)));
        check('AUTH-10 no raw key', H.rawKeys(t).length === 0, H.rawKeys(t).join());
        check('AUTH-10 the only failed API calls are 401', st.http4xx.every((l) => /^401 /.test(l)), st.http4xx.join(' | '));
        // OWNER QUESTION: the login page shows no "signed in on another device" message (SESSION_REPLACED exists in errors.json).
      }, sp(page));
      await ctx.close();
    }

    // ---- AUTH-11 forget / reset password
    {
      const { ctx, page, st } = await fresh();
      await H.runCase('WEB-UI-AUTH-11', 'forget-password page and validation', async () => {
        await open(page, '/forget-password');
        const t = await H.bodyText(page);
        check('AUTH-11 page shows the email field and the send button', /Quên mật khẩu/.test(t) && /Gửi liên kết đặt lại/.test(t) && /Quay lại đăng nhập/.test(t));
        const pr = await H.pageProblems(page, st);
        check('AUTH-11 healthy page', pr.length === 0, pr.join('; '));
        await page.getByRole('button', { name: 'Gửi liên kết đặt lại' }).click();
        await page.waitForTimeout(600);
        check('AUTH-11 empty email: no success screen', !/Đã gửi|kiểm tra email/i.test(await H.bodyText(page)));
        await page.getByRole('button', { name: 'Quay lại đăng nhập' }).click();
        await page.waitForURL(/\/login/, { timeout: 20000 });
        check('AUTH-11 "Quay lại đăng nhập" opens /login', true);
      }, sp(page));

      await H.runCase('WEB-UI-AUTH-12', 'reset-password without or with a bad token', async () => {
        await open(page, '/reset-password');
        let t = await H.bodyText(page);
        check('AUTH-12 no token: "Liên kết không hợp lệ" and a way to request a new one', /Liên kết không hợp lệ/.test(t) && /Yêu cầu liên kết mới/.test(t), t.slice(0, 300));
        await page.getByRole('button', { name: 'Yêu cầu liên kết mới' }).click();
        await page.waitForURL(/\/forget-password/, { timeout: 20000 });
        check('AUTH-12 "Yêu cầu liên kết mới" opens /forget-password', true);
        st.reset();
        await open(page, '/reset-password?token=not-a-real-token');
        const pw = page.locator('input[type="password"]');
        if (await pw.count()) {
          await pw.nth(0).fill('NewPass123!');
          if ((await pw.count()) > 1) await pw.nth(1).fill('NewPass123!');
          await page.getByRole('button', { name: /Đặt lại|Đổi|Lưu|Reset/ }).first().click();
          await page.waitForTimeout(2500);
          t = await H.bodyText(page);
          check('AUTH-12 a bad token is refused with a readable message (no raw key)', /không hợp lệ|hết hạn|invalid|expired/i.test(t) && H.rawKeys(t).length === 0, t.slice(-300));
        } else {
          t = await H.bodyText(page);
          check('AUTH-12 a bad token shows the invalid-link screen', /không hợp lệ/.test(t), t.slice(0, 300));
        }
      }, sp(page));

      await H.runCase('WEB-UI-AUTH-13', 'register page: steps and validation', async () => {
        for (const p of ['/register', '/register-merchant']) {
          st.reset();
          await open(page, p);
          const t = await H.bodyText(page);
          check(`AUTH-13 ${p} step 1/2 form`, /Bước 1\/2/.test(t) && /Tạo tài khoản doanh nghiệp/.test(t) && /Xác nhận mật khẩu/.test(t), t.slice(0, 300));
          const pr = await H.pageProblems(page, st);
          check(`AUTH-13 ${p} healthy`, pr.length === 0, pr.join('; '));
        }
        await open(page, '/register');
        await page.locator('input[name="name"]').fill('E2E Shop Owner');
        await page.locator('input[name="login"]').fill('e2e-register@example.com');
        await page.locator('input[name="password"]').fill('Abcdef12!');
        await page.locator('input[name="confirmPassword"]').fill('Different12!');
        await page.getByRole('button', { name: /Tiếp tục đến thông tin doanh nghiệp/ }).click();
        await page.waitForTimeout(800);
        const t = await H.bodyText(page);
        check('AUTH-13 mismatching passwords stay on step 1 with a message', /Bước 1\/2/.test(t) && /khớp|không giống|match/i.test(t), t.slice(-300));
        check('AUTH-13 no raw key', H.rawKeys(t).length === 0, H.rawKeys(t).join());
      }, sp(page));
      await ctx.close();
    }
    void api;
  } finally {
    await browser.close();
  }
  return H.finish(rec.results, 'web-ui-auth-results.json');
}

if (require.main === module) H.main(main);
module.exports = { main };
