/**
 * Shared bits of the small mobile checkers (#727): log parsing, a logged-in API client and the Vietnam day.
 * The UI tests print `E2E_NOTE: <TAG> …` lines; a checker reads them from the xcodebuild log (or the Android notes file)
 * and compares them with the API. Run a checker AFTER the UI run and never log in with the account under test in between
 * (logins are single-session).
 */
const fs = require('fs');

const API = process.env.MOBILE_STAT_API_URL || `http://localhost:${process.env.E2E_API_PORT || 3195}`;
const ZONE = 'Asia/Ho_Chi_Minh';

function vnDay(offset = 0) {
  const d = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** lines `E2E_NOTE: <rest>` (iOS) or `ANDROID_NOTE: <rest>` of a log file */
function notes(file) {
  if (!file || !fs.existsSync(file)) throw new Error(`usage: <checker> <log file> (got ${file})`);
  return fs.readFileSync(file, 'utf8').split('\n').map((l) => /^(?:E2E_NOTE|ANDROID_NOTE): (.*)$/.exec(l)).filter(Boolean).map((m) => m[1]);
}

async function login(email, password) {
  const r = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) }).then((x) => x.json());
  const token = r?.data?.token || r?.data?.accessToken;
  if (!token) throw new Error(`login ${email} failed: ${r?.code || JSON.stringify(r).slice(0, 120)}`);
  return {
    token,
    get: (p) => fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json()).then((b) => b.data),
  };
}

/** "710001" from "#710001 · tạo T7 03/10" style text; every match */
function orderNumbers(text) {
  return [...String(text).matchAll(/#(\d{4,6})/g)].map((m) => m[1]);
}

function report(results, extra = '') {
  for (const r of results) console.log(`${r.status.padEnd(6)} ${r.name} - ${r.detail}`);
  const failed = results.filter((r) => r.status !== 'pass').length;
  console.log(`${results.length} checks, ${failed} failed${extra ? ` (${extra})` : ''}`);
  process.exit(failed ? 1 : 0);
}

const pass = (name, detail) => ({ status: 'pass', name, detail });
const fail = (name, detail) => ({ status: 'fail', name, detail });
const check = (cond, name, detail) => (cond ? pass(name, detail) : fail(name, detail));

module.exports = { API, ZONE, vnDay, notes, login, orderNumbers, report, pass, fail, check };
