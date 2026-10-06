/**
 * Logs each seed account in once per run (#498). The API allows 10 logins per 15 minutes per IP and one
 * session per account, so test files reuse these tokens (helpers/api.js Session.login reads the cache).
 * A cached token that still works is kept, so running one file again does not log in again.
 */
const { ACCOUNTS, BASE, hasApi, passwordLogin, readTokenCache, writeTokenCache, request } = require('./helpers/api');

module.exports = async () => {
  if (!hasApi) {
    console.log('\n[business-e2e] E2E_API_URL is not set: every business e2e test is skipped.\n');
    return;
  }
  const cache = readTokenCache();
  for (const account of Object.keys(ACCOUNTS)) {
    const hit = cache[account];
    if (hit) {
      const probe = await request(hit.token, 'GET', '/api/products?limit=1');
      if (probe.status === 200) continue;
    }
    cache[account] = await passwordLogin(account);
  }
  writeTokenCache(cache);
  console.log(`\n[business-e2e] API ${BASE}; accounts: ${Object.values(ACCOUNTS).map((a) => a.email).join(', ')}\n`);
};
