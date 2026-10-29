#!/usr/bin/env node
/**
 * #1315 owner side of the settings-sync mobile flows: change a shop / outlet setting through the API as the shop owner,
 * so the device under test (a staff or manager account) only has to READ it. Logs in as the owner, so the owner must NOT be
 * signed in on a device at the same time (logins are single-session).
 *
 *   settings-sync-api.js set currency VND|USD
 *   settings-sync-api.js set overlap true|false
 *   settings-sync-api.js set print "<note>" true|false     print note + bank QR of the owner's / staff's own outlet
 *   settings-sync-api.js get currency|overlap|print
 * Env: MOBILE_STAT_API_URL (default http://localhost:$E2E_API_PORT), E2E_MERCHANT_EMAIL / _PASSWORD, E2E_STAFF_EMAIL (outlet to edit).
 */
const API = process.env.MOBILE_STAT_API_URL || `http://localhost:${process.env.E2E_API_PORT || 3180}`;
const owner = { email: process.env.E2E_MERCHANT_EMAIL || 'merchant1@example.com', password: process.env.E2E_MERCHANT_PASSWORD || 'merchant123' };

async function call(token, method, path, json) {
  const r = await fetch(`${API}${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(json ? { 'content-type': 'application/json' } : {}) }, body: json ? JSON.stringify(json) : undefined });
  const body = await r.json().catch(() => null);
  if (!r.ok || body?.success === false) throw new Error(`${method} ${path} -> HTTP ${r.status} ${body?.code || ''}`);
  return body.data;
}

(async () => {
  const [verb, what, a, b] = process.argv.slice(2);
  const login = await fetch(`${API}/api/mobile/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.9.9.9' },
    body: JSON.stringify({ ...owner, deviceId: 'settings-sync-owner' })
  }).then((x) => x.json());
  const token = login?.data?.token;
  if (!token) throw new Error(`owner login failed: ${login?.code}`);
  // the outlet whose bill settings change: the one of the staff account (first outlet of the owner's list when unknown)
  const outlets = await call(token, 'GET', '/api/outlets?limit=50');
  const list = Array.isArray(outlets) ? outlets : outlets.outlets || outlets.items || [];
  const outlet = list.find((o) => o.isDefault) || list[0];
  if (verb === 'set' && what === 'currency') console.log(JSON.stringify(await call(token, 'PUT', '/api/settings/currency', { currency: a })));
  else if (verb === 'set' && what === 'overlap') console.log(JSON.stringify(await call(token, 'PUT', '/api/settings/merchant', { allowOverlappingOrders: a === 'true' })));
  else if (verb === 'set' && what === 'print') console.log(JSON.stringify(await call(token, 'PUT', `/api/outlets?outletId=${outlet.id}`, { printNote: a, printBankQr: b === 'true' })));
  else if (verb === 'get' && what === 'currency') console.log((await call(token, 'GET', '/api/settings/currency')).currency);
  else if (verb === 'get' && what === 'overlap') console.log((await call(token, 'GET', '/api/users/profile')).merchant?.allowOverlappingOrders);
  else if (verb === 'get' && what === 'print') console.log(JSON.stringify({ note: outlet.printNote, qr: outlet.printBankQr }));
  else { console.error('usage: settings-sync-api.js set|get currency|overlap|print [...]'); process.exit(64); }
})().catch((e) => { console.error(e.message); process.exit(1); });
