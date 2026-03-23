import crypto from 'crypto';
import { env } from '@rentalshop/env';

type JsonApiBody = Record<string, unknown>;

export function assertLemonSqueezyEnv() {
  if (!env.LEMON_SQUEEZY_API_KEY) throw new Error('LEMON_SQUEEZY_API_KEY is not set');
  if (!env.LEMON_SQUEEZY_STORE_ID) throw new Error('LEMON_SQUEEZY_STORE_ID is not set');
}

export async function lemonSqueezyFetch(path: string, init: RequestInit & { body?: JsonApiBody } = {}) {
  assertLemonSqueezyEnv();

  const url = path.startsWith('http') ? path : `https://api.lemonsqueezy.com${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${env.LEMON_SQUEEZY_API_KEY}`,
      ...(init.headers || {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore json parse error; handle below
  }

  if (!res.ok) {
    const msg = json?.errors?.[0]?.detail || json?.message || `Lemon Squeezy API error (${res.status})`;
    const err = new Error(msg);
    (err as any).status = res.status;
    (err as any).payload = json ?? text;
    throw err;
  }

  return json;
}

/**
 * Verify Lemon Squeezy webhook signature.
 * Docs: https://docs.lemonsqueezy.com/help/webhooks/signing-requests
 */
export function verifyLemonSqueezyWebhookSignature(params: {
  rawBody: string;
  signature: string | null;
}) {
  if (!env.LEMON_SQUEEZY_WEBHOOK_SECRET) {
    throw new Error('LEMON_SQUEEZY_WEBHOOK_SECRET is not set');
  }
  if (!params.signature) return false;

  const expected = crypto
    .createHmac('sha256', env.LEMON_SQUEEZY_WEBHOOK_SECRET)
    .update(params.rawBody, 'utf8')
    .digest('hex');

  // constant-time compare
  const a = Buffer.from(expected);
  const b = Buffer.from(params.signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

