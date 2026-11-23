/**
 * #1200 — X-Client-Capabilities: no header = an old client (installed iOS / Android builds never send it).
 */
import { getClientCapabilities, hasCapability } from '../../apps/api/lib/client-capabilities';
import { CLIENT_CAPABILITIES, clientCapabilitiesHeader } from '../../packages/utils/src/core/client-capabilities';

const req = (value?: string) => ({ headers: { get: (name: string) => (name.toLowerCase() === 'x-client-capabilities' ? (value ?? null) : null) } });

describe('getClientCapabilities / hasCapability (#1200)', () => {
  it('absent header = no capability', () => {
    expect(getClientCapabilities(req()).size).toBe(0);
    expect(hasCapability(req(), 'installments')).toBe(false);
  });

  it('empty, blank and garbage values = no capability, never throws', () => {
    for (const value of ['', '   ', ',,,', '!!!', '<script>', 'a b c', 'x'.repeat(2000)]) {
      expect(getClientCapabilities(req(value)).size).toBe(0);
    }
    expect(getClientCapabilities(null).size).toBe(0);
    expect(getClientCapabilities(undefined).size).toBe(0);
    expect(getClientCapabilities({ headers: null }).size).toBe(0);
    expect(getClientCapabilities({ headers: { get: () => { throw new Error('boom'); } } }).size).toBe(0);
  });

  it('comma-separated, case-insensitive, trimmed tokens', () => {
    const r = req(' Installments , BLOCK-pricing ');
    expect(hasCapability(r, 'installments')).toBe(true);
    expect(hasCapability(r, 'block-pricing')).toBe(true);
  });

  it('a token only counts when listed', () => {
    expect(hasCapability(req('block-pricing'), 'installments')).toBe(false);
    expect(hasCapability(req('installments-extra'), 'installments')).toBe(false);
  });
});

describe('web client header (#1200)', () => {
  it('declares block-pricing (#1189), installments (#1199) and branch-listing (#1341), so authenticatedFetch sends the header', () => {
    expect(CLIENT_CAPABILITIES).toEqual(['block-pricing', 'installments', 'branch-listing']);
    expect(clientCapabilitiesHeader()).toEqual({ 'X-Client-Capabilities': 'block-pricing,installments,branch-listing' });
  });

  it('sends no header for an empty list', () => {
    expect(clientCapabilitiesHeader([])).toEqual({});
  });

  it('sends a comma-separated header once tokens exist', () => {
    expect(clientCapabilitiesHeader(['installments', 'block-pricing'])).toEqual({
      'X-Client-Capabilities': 'installments,block-pricing',
    });
  });
});

describe('CORS allows the header (#1200)', () => {
  it('apps/api/lib/cors.ts, cors-edge.ts and packages/utils cors.ts list X-Client-Capabilities', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    for (const file of ['apps/api/lib/cors.ts', 'apps/api/lib/cors-edge.ts', 'packages/utils/src/cors.ts']) {
      const source = fs.readFileSync(path.join(__dirname, '../..', file), 'utf8');
      expect(source).toContain('X-Client-Capabilities');
    }
  });
});
