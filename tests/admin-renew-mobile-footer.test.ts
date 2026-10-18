/**
 * #1050: on a phone, admin could not find the confirm button after Extend Plan / Change Plan.
 * The phone dialogs were pinned to 100dvh, which Safari iOS and Chrome Android do not shrink when the on-screen
 * keyboard opens, so the sticky footer sat under the keyboard. Change Plan also kept its button disabled with no
 * reason while the payment fields were below the fold.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SUB = 'packages/ui/src/components/features/Subscriptions/components/';
const VV_FILE = SUB + 'visual-viewport.ts';

const PHONE_DIALOGS = [
  SUB + 'ManualRenewalModal.tsx',
  SUB + 'SubscriptionChangePlanDialog.tsx',
  SUB + 'SubscriptionExtendDialogEnhanced.tsx',
  'packages/ui/src/components/features/Merchants/components/MerchantPlanManagement.tsx',
];

function fakeStyle() {
  const props: Record<string, string> = {};
  return {
    props,
    setProperty: (name: string, value: string) => { props[name] = value; },
    removeProperty: (name: string) => { delete props[name]; },
  };
}

describe('admin renew / change plan on a phone (#1050)', () => {
  it('applyVisualViewportVars exposes the visible viewport as --ar-vvh / --ar-vvt and clears them', () => {
    expect(fs.existsSync(path.join(ROOT, VV_FILE))).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { applyVisualViewportVars } = require(path.join(ROOT, VV_FILE));
    const style = fakeStyle();
    // keyboard open: the window is 667 px, the visible part 367.4 px, scrolled 12 px
    applyVisualViewportVars(style, { height: 367.4, offsetTop: 12 });
    expect(style.props['--ar-vvh']).toBe('367px');
    expect(style.props['--ar-vvt']).toBe('12px');
    applyVisualViewportVars(style, null);
    expect(style.props['--ar-vvh']).toBeUndefined();
    expect(style.props['--ar-vvt']).toBeUndefined();
  });

  it('ResponsiveDialogFooter follows window.visualViewport while a dialog is open', () => {
    const src = read(SUB + 'ResponsiveDialogFooter.tsx');
    expect(src).toMatch(/useVisualViewportVars\(/);
    const vv = read(VV_FILE);
    expect(vv).toMatch(/visualViewport/);
    expect(vv).toMatch(/addEventListener\('resize'/);
    expect(vv).toMatch(/removeEventListener\('resize'/);
  });

  it.each(PHONE_DIALOGS)('%s sizes the phone dialog to the visible viewport, not a fixed 100dvh', (file) => {
    const src = read(file);
    expect(src).toMatch(/max-md:h-\[var\(--ar-vvh,100dvh\)\]/);
    expect(src).toMatch(/max-md:max-h-\[var\(--ar-vvh,100dvh\)\]/);
    expect(src).toMatch(/max-md:top-\[var\(--ar-vvt,0px\)\]/);
    expect(src).not.toMatch(/max-md:h-\[100dvh\]/);
    // desktop stays the centered dialog
    expect(src).toMatch(/max-h-\[90vh\]/);
  });

  it('Change Plan tells the user what is missing while its button is disabled', () => {
    const src = read(SUB + 'SubscriptionChangePlanDialog.tsx');
    expect(src).toMatch(/hint=\{[^}]*paymentReady/);
    const footer = read(SUB + 'ResponsiveDialogFooter.tsx');
    expect(footer).toMatch(/data-testid="dialog-footer-hint"/);
  });
});
