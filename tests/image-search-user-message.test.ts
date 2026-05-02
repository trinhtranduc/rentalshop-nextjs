import { describe, expect, it } from '@jest/globals';
import { getFriendlyImageSearchUserMessage } from '../packages/utils/src/api/response-builder';

describe('getFriendlyImageSearchUserMessage', () => {
  it('returns friendly SEARCH_FAILED for Python upstream noise', () => {
    const msg = getFriendlyImageSearchUserMessage({
      message:
        'Python Search API error (404): {"detail":"Image search failed: Unexpected Response: 404 (Not Found)\\nRaw response content:\\nb\'404 page not found\\\\n\'"}',
    });
    expect(msg).not.toContain('Python');
    expect(msg).not.toContain('404');
    expect(msg.length).toBeGreaterThan(10);
  });

  it('maps Railway Application not found to friendly text', () => {
    const msg = getFriendlyImageSearchUserMessage({
      message:
        '{"status":"error","code":404,"message": "Application not found","request_id":"x"}',
    });
    expect(msg).not.toContain('request_id');
    expect(msg).not.toContain('Application not found');
  });

  it('respects SEARCH_TIMEOUT code', () => {
    const msg = getFriendlyImageSearchUserMessage({ code: 'SEARCH_TIMEOUT' });
    expect(msg.toLowerCase()).toContain('long');
  });
});
