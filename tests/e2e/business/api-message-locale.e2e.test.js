/**
 * #986: POST /api/auth/login with a wrong password.
 * message and error follow Accept-Language. code stays INVALID_CREDENTIALS and status stays 401.
 * No header, or a language other than English, is Vietnamese.
 */
const fs = require('fs');
const path = require('path');
const { describeE2E, request } = require('../helpers/api');

const root = path.resolve(__dirname, '../../..');
const en = JSON.parse(fs.readFileSync(path.join(root, 'locales/en/errors.json'), 'utf8'));
const vi = JSON.parse(fs.readFileSync(path.join(root, 'locales/vi/errors.json'), 'utf8'));

describeE2E('API message locale (#986)', () => {
  const cases = [
    ['missing header', undefined, vi.INVALID_CREDENTIALS],
    ['en', 'en', en.INVALID_CREDENTIALS],
    ['en-US', 'en-US,en;q=0.9,vi;q=0.8', en.INVALID_CREDENTIALS],
    ['vi', 'vi', vi.INVALID_CREDENTIALS],
    ['vi-VN', 'vi-VN', vi.INVALID_CREDENTIALS],
    ['ja', 'ja', vi.INVALID_CREDENTIALS],
  ];

  test.each(cases)('wrong password, %s', async (_name, acceptLanguage, sentence) => {
    const headers = {
      'x-forwarded-for': `10.86.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`,
    };
    if (acceptLanguage) headers['accept-language'] = acceptLanguage;
    const result = await request(null, 'POST', '/api/auth/login', {
      json: { email: 'nobody-986-e2e@example.invalid', password: 'WrongPass123' },
      headers,
    });
    expect(result.status).toBe(401);
    expect(result.body.code).toBe('INVALID_CREDENTIALS');
    expect(result.body.message).toBe(sentence);
    expect(result.body.error).toBe(sentence);
    expect(JSON.stringify(result.body)).not.toMatch(/prisma|P1001|Field:|database server/i);
  });
});
