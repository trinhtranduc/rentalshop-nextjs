/**
 * Python API Client with Connection Pooling
 * 
 * ✅ FREE - Built into Node.js
 * ✅ Reduces network latency by reusing connections
 * ✅ Improves performance for repeated API calls
 */

import { Agent } from 'https';
import { Agent as HttpAgent } from 'http';

/**
 * HTTPS Agent with connection pooling
 * - keepAlive: Reuse connections
 * - maxSockets: Max concurrent connections
 * - maxFreeSockets: Keep connections alive when idle
 */
const httpsAgent = new Agent({
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 5,
  timeout: 30000,
  keepAliveMsecs: 1000,
});

/**
 * HTTP Agent with connection pooling
 */
const httpAgent = new HttpAgent({
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 5,
  timeout: 30000,
  keepAliveMsecs: 1000,
});

/**
 * Get appropriate agent for URL
 * Returns HTTPS agent for https:// URLs, HTTP agent for http:// URLs
 */
export function getAgentForUrl(url: string): Agent | HttpAgent {
  return url.startsWith('https') ? httpsAgent : httpAgent;
}

/**
 * Fetch with connection pooling
 * Wrapper around fetch that automatically uses connection pooling
 */
export async function fetchWithPooling(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Add agent to options if using node-fetch or similar
  // For native fetch, connection pooling is handled automatically
  // But we can still set Connection: keep-alive header
  
  const headers = {
    'Connection': 'keep-alive',
    ...(options.headers as Record<string, string> || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
