/**
 * #1661: the Cài đặt › Cửa hàng card "Giá theo khối ngày với app cũ" is hidden on the owner's request.
 * The card, its flag and its strings stay in the code so it can be shown again; the server setting is unchanged.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const read = (file: string) => fs.readFileSync(path.resolve(__dirname, '../apps/client/app/settings', file), 'utf8');

describe('hidden card "Giá theo khối ngày với app cũ" (#1661)', () => {
  const panel = read('SettingsPanel.tsx');

  it('the settings panel no longer renders the card or loads the profile for it', () => {
    expect(panel).not.toMatch(/<BlockOldAppsSection/);
    expect(panel).not.toMatch(/blockOldAppsFlag\(/);
    expect(panel).not.toMatch(/oldAppsFlag/);
  });

  it('keeps the other cards of the Cửa hàng tab', () => {
    expect(panel).toMatch(/<OnlineBookingSection/);
    expect(panel).toMatch(/<OverlapSection/);
    expect(panel).toMatch(/<OutletsLinkRow/);
  });

  it('keeps the component, its flag and its strings so it can come back', () => {
    expect(read('sections.tsx')).toMatch(/export function BlockOldAppsSection/);
    expect(read('settings-model.ts')).toMatch(/export function blockOldAppsFlag/);
    const vi = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/vi/settings.json'), 'utf8'));
    expect(vi.web?.blockPricing?.title).toBe('Giá theo khối ngày với app cũ');
  });
});
