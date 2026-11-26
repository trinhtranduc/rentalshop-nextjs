import { NextRequest, NextResponse } from 'next/server';
import { handleConnector } from '../../../../lib/seo-connector/handler';

/**
 * #1665 SEO Agent Hub connector (contract v1): `GET/POST/PUT /api/seo-connector/v1/*`.
 *
 * One optional catch-all at `/api/seo-connector` so that EVERY path below it (other versions, no path at all) is answered
 * here with JSON, never a Next.js HTML 404. Public in the middleware (no user JWT); the site key is checked inside
 * `handleConnector` before anything else. The calls, the key rules and the idempotency rules are in
 * `apps/api/lib/seo-connector/handler.ts`.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handle(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  const { path = [] } = await Promise.resolve(params);
  const method = request.method.toUpperCase();
  const rawBody = method === 'GET' || method === 'HEAD' ? '' : await request.text();
  const result = await handleConnector({
    method,
    // only v1 is spoken; any other first segment reaches the handler as an unknown call (404 JSON after the key check)
    path: path[0] === 'v1' ? path.slice(1) : ['unsupported-version', ...path],
    authorization: request.headers.get('authorization'),
    idempotencyKey: request.headers.get('idempotency-key'),
    rawBody,
    searchParams: new URL(request.url).searchParams,
  });
  return NextResponse.json(result.body, { status: result.status });
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE, handle as PATCH };
