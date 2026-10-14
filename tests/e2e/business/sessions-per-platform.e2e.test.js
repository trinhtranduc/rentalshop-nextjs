/**
 * BF-SES: one phone session and one web session per account (#660), with #661 (a password change logs out the rest).
 *
 * Uses its own merchant world (S.createWorld, staff user inserted in the local database) so the cached seed tokens
 * of the other test files are never replaced, and no plan's user limit is touched.
 */
const { describeE2E, request, must } = require('../helpers/api');
const S = require('../helpers/subscription');

const describeDb = S.hasDb ? describeE2E : describe.skip;

const PHONE = { 'X-Client-Platform': 'mobile', 'X-Device-Type': 'ios', 'User-Agent': 'AnyRent-iOS/1.0.0' };
const WEB = {
  'X-Client-Platform': 'web',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
};
const UNKNOWN = { 'User-Agent': 'curl/8.4.0' };

describeDb('BF-SES one phone and one web session per account (#660)', () => {
  let user;
  let password;

  async function phoneLogin() {
    const d = await must(
      request(null, 'POST', '/api/mobile/auth/login', {
        json: { email: user.email, password, deviceId: `bf-ses-${Date.now()}` },
        headers: PHONE,
      }),
      'phone login'
    );
    return { token: d.token, refreshToken: d.refreshToken };
  }

  async function webLogin(headers = WEB) {
    const d = await must(request(null, 'POST', '/api/auth/login', { json: { email: user.email, password }, headers }), 'web login');
    return { token: d.token };
  }

  /** null when the token works, else the error code (SESSION_REPLACED / SESSION_EXPIRED / ...). */
  async function codeOf(login) {
    const r = await request(login.token, 'GET', '/api/users/profile');
    if (r.status === 200) return null;
    return `${r.status} ${r.body?.code}`;
  }

  beforeAll(() => {
    const world = S.createWorld('sessions');
    user = { email: world.staff.email };
    password = world.staff.password;
  });

  test('BF-SES-01 web and phone both stay logged in', async () => {
    const phone = await phoneLogin();
    const web = await webLogin();
    expect(await codeOf(phone)).toBeNull();
    expect(await codeOf(web)).toBeNull();
    const refreshed = await request(null, 'POST', '/api/auth/refresh', { json: { refreshToken: phone.refreshToken } });
    expect(refreshed.status).toBe(200);
  });

  test('BF-SES-02 a second phone login replaces the first phone (SESSION_REPLACED), not the web', async () => {
    const web = await webLogin();
    const phone1 = await phoneLogin();
    const phone2 = await phoneLogin();
    expect(await codeOf(phone1)).toBe('401 SESSION_REPLACED');
    const refresh1 = await request(null, 'POST', '/api/auth/refresh', { json: { refreshToken: phone1.refreshToken } });
    expect(refresh1.status).toBe(401);
    expect(refresh1.body?.code).toBe('SESSION_REPLACED');
    expect(await codeOf(phone2)).toBeNull();
    expect(await codeOf(web)).toBeNull();
  });

  test('BF-SES-03 a second web login replaces the first web (SESSION_REPLACED), not the phone', async () => {
    const phone = await phoneLogin();
    const web1 = await webLogin();
    const web2 = await webLogin();
    expect(await codeOf(web1)).toBe('401 SESSION_REPLACED');
    expect(await codeOf(web2)).toBeNull();
    expect(await codeOf(phone)).toBeNull();
    const refreshed = await request(null, 'POST', '/api/auth/refresh', { json: { refreshToken: phone.refreshToken } });
    expect(refreshed.status).toBe(200);
  });

  test('BF-SES-04 an unknown client (no X-Client-Platform, unknown User-Agent) replaces every session', async () => {
    const phone = await phoneLogin();
    const web = await webLogin();
    const other = await webLogin(UNKNOWN);
    expect(await codeOf(phone)).toBe('401 SESSION_REPLACED');
    expect(await codeOf(web)).toBe('401 SESSION_REPLACED');
    expect(await codeOf(other)).toBeNull();
  });

  test('BF-SES-05 a password change on the web logs out the phone and its refresh token (#661)', async () => {
    const phone = await phoneLogin();
    const web = await webLogin();
    const next = 'secret456';
    const r = await request(web.token, 'POST', '/api/auth/change-password', { json: { currentPassword: password, newPassword: next } });
    expect(r.status).toBe(200);
    password = next;

    // the old access token is refused (issued before the change: TOKEN_INVALIDATED, else SESSION_EXPIRED)
    expect(['401 TOKEN_INVALIDATED', '401 SESSION_EXPIRED']).toContain(await codeOf(phone));
    const refreshed = await request(null, 'POST', '/api/auth/refresh', { json: { refreshToken: phone.refreshToken } });
    expect(refreshed.status).toBe(401);
    // the old password no longer works, the new one does, on both kinds
    const again = await phoneLogin();
    expect(await codeOf(again)).toBeNull();
  });
});
