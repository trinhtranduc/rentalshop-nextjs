#!/usr/bin/env node
/**
 * #991 Person history: failed scans stay in the API audit but never appear in the web work history.
 * Requires a LOCAL seeded attendance dataset containing accepted scans, rejected scans and edits.
 * WEB_E2E_HEADED=1 WEB_E2E_API_URL=http://127.0.0.1:3286 WEB_E2E_CLIENT_URL=http://127.0.0.1:3374
 * WEB_E2E_EMAIL=merchant2@example.com WEB_E2E_PASSWORD=merchant123
 * WEB_E2E_ATTENDANCE_OUTLET_ID=2 WEB_E2E_ATTENDANCE_USER_ID=1004 WEB_E2E_ATTENDANCE_MONTH=2026-10
 * node tests/e2e/web/attendance-person.web.js
 */
const assert = require('node:assert/strict');
const H = require('./ui-helpers');

async function run() {
  assert.equal(H.CFG.headed, true, 'Every UI E2E must be visible: set WEB_E2E_HEADED=1');
  for (const url of [H.CFG.api, H.CFG.client]) {
    assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'Attendance E2E requires an isolated local stack');
  }
  const outletId = Number(process.env.WEB_E2E_ATTENDANCE_OUTLET_ID);
  const userId = Number(process.env.WEB_E2E_ATTENDANCE_USER_ID);
  const month = process.env.WEB_E2E_ATTENDANCE_MONTH;
  assert.ok(outletId > 0 && userId > 0 && /^\d{4}-\d{2}$/.test(month || ''), 'Set attendance fixture outlet/user/month');
  const api = await H.apiLogin();
  const path = `/api/attendance/people/${userId}/month?outletId=${outletId}&month=${month}`;
  const before = await api.get(path);
  assert.ok(before.rows.some((r) => r.result === 'ACCEPTED'), 'Fixture must contain successful scans');
  assert.ok(before.rows.some((r) => r.result === 'REJECTED'), 'Fixture must contain failed scans');
  for (const code of ['QR_WRONG_OUTLET', 'ATTENDANCE_NOT_CONFIGURED']) {
    assert.ok(before.rows.some((r) => r.errorCode === code), `Fixture must contain ${code}`);
  }
  assert.ok(before.rows.some((r) => r.kind === 'EDIT'), 'Fixture must contain edit history');
  const recorded = before.rows.filter((r) => r.result !== 'REJECTED');
  const rec = H.recorder();
  const browser = await H.launch();
  const ctx = await H.openSession({ browser, api });
  const page = await ctx.newPage();
  const shot = H.shotter();
  const sp = { page, rec, shot };
  const table = () => page.locator('main table').last();
  const history = () => table().locator('tbody tr');
  const filter = () => page.getByRole('combobox', { name: 'Lọc lượt quét' });
  try {
    await page.goto(`${H.CFG.client}/attendance/person?outletId=${outletId}&month=${month}&userId=${userId}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Chi tiết chấm công theo người' }).waitFor({ timeout: 60000 });
    await history().first().waitFor({ timeout: 30000 });
    await H.runCase('ATT-PER-01', 'failed scans hidden; accepted and edit rows preserved', async () => {
      const text = await table().innerText();
      rec.check('ATT-PER-01 no rejected attendance rows', !text.includes('Từ chối'), text);
      rec.check('ATT-PER-01 visible row count excludes only rejected rows', await history().count() === recorded.length, `${await history().count()} vs ${recorded.length}`);
      rec.check('ATT-PER-01 edit history remains', text.includes('Đã sửa'));
      rec.check('ATT-PER-01 wrong-outlet and missing-setup failures hidden', !text.includes('Mã QR của chi nhánh khác') && !text.includes('Chưa cài chấm công') && await history().count() === recorded.length);
      const options = await filter().locator('option').allTextContents();
      rec.check('ATT-PER-01 rejected filter removed', !options.some((s) => s.includes('Bị từ chối')) && options.length === 2, options);
      await shot(page, 'ATT-PER-01-recorded-only');
    }, sp);
    await H.runCase('ATT-PER-02', 'newest work day and timestamp first', async () => {
      const ordered = [...recorded].sort((a, b) => b.dateKey.localeCompare(a.dateKey) || Date.parse(b.at) - Date.parse(a.at));
      const format = (r) => {
        const at = new Date(r.at);
        const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(at);
        return time;
      };
      const first = await history().first().innerText();
      const key = ordered[0].dateKey;
      rec.check('ATT-PER-02 newest group is first', first.includes(`${key.slice(8, 10)}/${key.slice(5, 7)}`), first);
      rec.check('ATT-PER-02 newest event in that day is first', first.includes(format(ordered[0])), first);
      const visibleDay = [];
      for (let i = 0; i < ordered.filter((r) => r.dateKey === key).length; i += 1) visibleDay.push(await history().nth(i).innerText());
      rec.check('ATT-PER-02 event order matches descending timestamps', ordered.filter((r) => r.dateKey === key).every((r, i) => visibleDay[i].includes(format(r))), visibleDay);
    }, sp);
    await H.runCase('ATT-PER-03', 'suspected filter and restoring all', async () => {
      await filter().selectOption('suspected');
      const suspected = recorded.filter((r) => (r.suspectReasons || []).length > 0);
      if (suspected.length) rec.check('ATT-PER-03 suspected only counts recorded events', await history().count() === suspected.length);
      else {
        await page.getByText('Không có lượt quét nào.', { exact: true }).waitFor();
        rec.check('ATT-PER-03 empty state', true);
      }
      await filter().selectOption('all');
      await history().first().waitFor();
      rec.check('ATT-PER-03 all restores recorded events only', await history().count() === recorded.length);
    }, sp);
    await H.runCase('ATT-PER-04', 'latest record edit still resolves correctly', async () => {
      const edited = recorded.filter((r) => r.kind === 'EDIT' && r.recordId && r.after?.checkInAt && r.after?.checkOutAt)
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
      assert.ok(edited, 'Fixture needs an editable record with both times');
      const note = edited.note;
      const row = history().filter({ hasText: note }).first();
      await row.getByRole('button', { name: 'Sửa', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      const fmt = (s) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }).format(new Date(s));
      rec.check('ATT-PER-04 correct in/out values', await dialog.getByLabel('Giờ vào', { exact: true }).inputValue() === fmt(edited.after.checkInAt) && await dialog.getByLabel('Giờ ra', { exact: true }).inputValue() === fmt(edited.after.checkOutAt));
      await dialog.getByRole('button', { name: 'Huỷ', exact: true }).click();
    }, sp);
    await H.runCase('ATT-PER-05', 'viewing history does not delete raw audit data or alter totals', async () => {
      const after = await api.get(path);
      rec.check('ATT-PER-05 raw failed attempts preserved', after.rows.filter((r) => r.result === 'REJECTED').length === before.rows.filter((r) => r.result === 'REJECTED').length);
      rec.check('ATT-PER-05 summary unchanged', JSON.stringify(after.summary) === JSON.stringify(before.summary));
    }, sp);
    await H.runCase('ATT-PER-06', 'location badge regression', async () => {
      await page.goto(`${H.CFG.client}/attendance/locations`, { waitUntil: 'domcontentloaded' });
      const row = page.locator('main tbody tr').filter({ has: page.locator(`a[href="/attendance/locations/${outletId}"]`) });
      await row.getByText('Đã đặt vị trí', { exact: true }).waitFor({ timeout: 30000 });
      rec.check('ATT-PER-06 configured location badge preserved', (await row.innerText()).includes('Có mã QR'));
      await shot(page, 'ATT-PER-06-location-status');
    }, sp);
  } finally {
    await ctx.close();
    await browser.close();
  }
  return H.finish(rec.results, 'attendance-person-results.json', { outletId, userId, month });
}

module.exports = { run };
if (require.main === module) H.main(run);
