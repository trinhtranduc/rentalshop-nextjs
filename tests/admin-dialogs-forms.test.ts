/**
 * #807 (step 5 of #802): dialogs and forms in the portal style. Presentation only: the formulas, rules and
 * payment fields are covered by subscription-renew-route.test.ts and the billing calculation tests.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SUB = 'packages/ui/src/components/features/Subscriptions/components/';

const THREE_DIALOGS = [
  SUB + 'ManualRenewalModal.tsx',
  SUB + 'SubscriptionChangePlanDialog.tsx',
  SUB + 'SubscriptionExtendDialogEnhanced.tsx',
];

describe('admin dialogs and forms (#807)', () => {
  it('forms.css exists, is loaded by the admin app, and styles dialogs, confirmations and forms', () => {
    const css = read('apps/admin/app/forms.css');
    expect(css).toMatch(/\.ar-dialog\b/);
    expect(css).toMatch(/\.ar-dialog-footer\b/);
    expect(css).toMatch(/\.ar-confirm\b/);
    expect(css).toMatch(/\.ar-form-section\b/);
    expect(css).toMatch(/min-height:\s*44px/);
    expect(read('apps/admin/app/providers/ToastProvider.tsx')).toMatch(/import ['"]\.\.\/forms\.css['"]/);
  });

  it.each(THREE_DIALOGS)('%s is a centered 32rem dialog on desktop with the portal surface', (file) => {
    const src = read(file);
    expect(src).toMatch(/<DialogContent className="[^"]*\bar-dialog\b/);
    expect(src).toMatch(/md:max-w-lg/);
    expect(src).not.toMatch(/\bmax-w-(2xl|4xl)\b/);
    expect(src).toMatch(/ar-dialog-footer/);
  });

  it('ManualRenewalModal drops the green and blue boxes for portal tokens', () => {
    const src = read(SUB + 'ManualRenewalModal.tsx');
    expect(src).not.toMatch(/bg-green-50|bg-blue-50 border border-blue-200/);
    expect(src).toMatch(/border-ar-line/);
  });

  it('the renew numbers still come from calculateRenewalTotal (no new formula in the dialog)', () => {
    const src = read(SUB + 'ManualRenewalModal.tsx');
    expect(src).toMatch(/calculateRenewalTotal/);
    expect(src).toMatch(/renewalIntervalForMonths/);
  });

  it('ConfirmationDialog carries ar-confirm and its type so admin can give danger a clear action', () => {
    const src = read('packages/ui/src/components/ui/confirmation-dialog.tsx');
    expect(src).toMatch(/ar-confirm/);
    expect(src).toMatch(/data-confirm-type=\{type\}/);
  });

  it('SubscriptionForm is split in sections with a bottom action bar', () => {
    const src = read(SUB + 'SubscriptionForm.tsx');
    expect((src.match(/ar-form-section/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(src).toMatch(/ar-form-actions/);
  });

  it('merchant edit form is split in sections', () => {
    const src = read('apps/admin/app/merchants/[id]/edit/page.tsx');
    expect((src.match(/ar-form-section/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(src).toMatch(/ar-form-actions/);
  });

  it('the add-on dialog uses the dialog surface and footer', () => {
    const src = read('apps/admin/app/merchants/[id]/plan-limit-addons/page.tsx');
    expect(src).toMatch(/<DialogContent className="[^"]*\bar-dialog\b/);
    expect(src).toMatch(/ar-dialog-footer/);
  });
});
