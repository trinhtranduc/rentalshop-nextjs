#!/usr/bin/env node
// Publish <work-dir>/publish/*.json as linked translations of the source post (#1115). The owner runs it:
//   node publish.mjs <work-dir> --dry-run              # show what would be sent, nothing is written
//   node publish.mjs <work-dir>                        # production, status PUBLISHED
//   node publish.mjs <work-dir> --draft --only ru,en   # some languages, as drafts
//   --api https://dev-api.anyrent.shop                 # only when the source post was exported from dev
// It asks for the admin e-mail and password in the terminal (or reads ANYRENT_EMAIL / ANYRENT_PASSWORD).
// A language that already has this slug is skipped, so running it twice is safe.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import readline from 'node:readline';

const args = process.argv.slice(2);
const WORK = args.find((a, i) => !a.startsWith('--') && !['--api', '--only'].includes(args[i - 1]));
if (!WORK) { console.error('Usage: node publish.mjs <work-dir> [--dry-run] [--draft] [--only ru,en] [--api URL]'); process.exit(2); }
const flag = (n) => args.includes(n);
const value = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const API = (value('--api') || 'https://api.anyrent.shop').replace(/\/$/, '');
const DRY = flag('--dry-run');
const ALL = readdirSync(join(WORK, 'publish')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
const LOCALES = value('--only') ? value('--only').split(',').map((s) => s.trim()) : ALL;

function ask(question, hidden = false) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  if (hidden) rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
  return new Promise((res) => rl.question(question, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); res(a.trim()); }));
}

async function exists(locale, slug) {
  const r = await fetch(`${API}/api/posts/public?locale=${encodeURIComponent(locale)}&limit=100`);
  const j = await r.json();
  return (j?.data?.data || []).some((p) => p.slug === slug);
}

const bodies = LOCALES.map((l) => {
  const b = JSON.parse(readFileSync(join(WORK, 'publish', `${l}.json`), 'utf8'));
  if (flag('--draft')) b.status = 'DRAFT';
  return b;
});

console.log(`API: ${API} · ${bodies.length} bản dịch · trạng thái ${bodies[0].status}${DRY ? ' · CHẠY THỬ (không ghi)' : ''}`);
for (const b of bodies) console.log(`  ${b.locale.padEnd(6)} ${b.slug}  —  ${b.title}`);
if (DRY) process.exit(0);

const email = process.env.ANYRENT_EMAIL || (await ask('Email admin: '));
const password = process.env.ANYRENT_PASSWORD || (await ask('Mật khẩu: ', true));
const login = await fetch(`${API}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
});
const lj = await login.json().catch(() => ({}));
const token = lj?.data?.token;
if (!login.ok || !token) { console.error(`Đăng nhập lỗi (${login.status}): ${lj?.message || ''}`); process.exit(1); }

let ok = 0, skipped = 0, failed = 0;
for (const b of bodies) {
  if (await exists(b.locale, b.slug)) { console.log(`= ${b.locale}: đã có, bỏ qua`); skipped++; continue; }
  const r = await fetch(`${API}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(b),
  });
  const j = await r.json().catch(() => ({}));
  if (r.ok && j?.success !== false) { ok++; console.log(`✓ ${b.locale}: id ${j?.data?.id ?? '?'} · https://www.anyrent.shop/${b.locale}/post/${b.slug}`); }
  else { failed++; console.log(`✗ ${b.locale}: ${r.status} ${j?.code || ''} ${j?.message || ''}`); }
}
console.log(`Xong: ${ok} tạo mới, ${skipped} bỏ qua, ${failed} lỗi.`);
process.exit(failed ? 1 : 0);
