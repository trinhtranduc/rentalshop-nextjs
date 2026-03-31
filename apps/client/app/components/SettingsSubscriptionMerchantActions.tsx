'use client';

/**
 * Gắn vào tab Settings → subscription: giữ UI @rentalshop/ui (SubscriptionSection),
 * chỉ bổ sung dialog chọn gói / thanh toán (Lemon) và form gia hạn (chuyển khoản).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  SubscriptionSection,
  useToast,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@rentalshop/ui';
import type { SubscriptionPanelRenderProps } from '@rentalshop/ui';
import { subscriptionsApi } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';
import { ChoosePlanDialog } from './ChoosePlanDialog';

const SETTINGS_SUB_TAB = '/settings?tab=subscription';

/** Tạm tắt nút nâng cấp / gia hạn và dialog liên quan. Bật lại → đặt `true`. */
const SUBSCRIPTION_UPGRADE_EXTEND_ENABLED = false;

export function SettingsSubscriptionMerchantActions({
  subscriptionData,
  subscriptionLoading,
  onSubscriptionRefresh,
  currentUserRole,
}: SubscriptionPanelRenderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('subscription');
  const { toastSuccess, toastError, toastInfo } = useToast();

  const [showChoosePlanDialog, setShowChoosePlanDialog] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewForm, setRenewForm] = useState({
    duration: 1,
    method: 'TRANSFER' as const,
    transactionId: '',
    reference: '',
    description: '',
    paymentDate: '',
  });
  const [renewSubmitting, setRenewSubmitting] = useState(false);

  const refreshRef = useRef(onSubscriptionRefresh);
  refreshRef.current = onSubscriptionRefresh;

  const hasSub = Boolean(subscriptionData?.hasSubscription);
  const subId = subscriptionData?.subscription?.id as number | undefined;
  const currentPlanId = subscriptionData?.subscription?.plan?.id ?? null;
  const billingInterval = subscriptionData?.subscription?.interval ?? null;
  const isMerchant = currentUserRole === USER_ROLE.MERCHANT;

  // Trả về từ Lemon Squeezy (chỉ khi bật upgrade/extend)
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (!checkout) return;
    if (SUBSCRIPTION_UPGRADE_EXTEND_ENABLED) {
      if (checkout === 'success') {
        toastSuccess(t('page.checkoutSuccessTitle'), t('page.checkoutSuccessBody'));
        void refreshRef.current();
      } else if (checkout === 'cancel') {
        toastInfo(t('page.checkoutCancelTitle'), t('page.checkoutCancelBody'));
      }
    }
    router.replace('/settings?tab=subscription', { scroll: false });
  }, [searchParams, router, toastSuccess, toastInfo, t]);

  // Deep link: ?action=plans | ?action=renew
  useEffect(() => {
    const action = searchParams.get('action');
    if (!action) return;
    if (SUBSCRIPTION_UPGRADE_EXTEND_ENABLED) {
      if (action === 'plans') {
        setShowChoosePlanDialog(true);
      } else if (action === 'renew' && hasSub) {
        setShowRenewModal(true);
      }
    }
    if (action === 'plans' || action === 'renew') {
      router.replace('/settings?tab=subscription', { scroll: false });
    }
  }, [searchParams, hasSub, router]);

  const showUpgradeExtendUi = SUBSCRIPTION_UPGRADE_EXTEND_ENABLED && isMerchant;

  return (
    <>
      <SubscriptionSection
        subscriptionData={subscriptionData}
        subscriptionLoading={subscriptionLoading}
        currentUserRole={currentUserRole}
        onUpgradeClick={
          showUpgradeExtendUi && hasSub ? () => setShowChoosePlanDialog(true) : undefined
        }
        onExtendClick={
          showUpgradeExtendUi && hasSub ? () => setShowRenewModal(true) : undefined
        }
        onChoosePlanClick={
          showUpgradeExtendUi && !hasSub ? () => setShowChoosePlanDialog(true) : undefined
        }
      />

      {SUBSCRIPTION_UPGRADE_EXTEND_ENABLED ? (
        <>
      <ChoosePlanDialog
        open={showChoosePlanDialog}
        onOpenChange={setShowChoosePlanDialog}
        currentPlanId={currentPlanId}
        defaultBillingInterval={billingInterval}
        checkoutReturnPath={SETTINGS_SUB_TAB}
      />

      <Dialog open={showRenewModal} onOpenChange={setShowRenewModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('page.renewModalTitle')}</DialogTitle>
            <DialogDescription>{t('page.renewModalBankOnly')}</DialogDescription>
          </DialogHeader>

          <p className="text-sm text-muted-foreground -mt-2 mb-2">{t('page.transferHint')}</p>

          <div className="space-y-4">
            <div>
              <Label>{t('page.duration')}</Label>
              <Select
                value={String(renewForm.duration)}
                onValueChange={(v) =>
                  setRenewForm((p) => ({ ...p, duration: parseInt(v, 10) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('page.duration1m')}</SelectItem>
                  <SelectItem value="3">{t('page.duration3m')}</SelectItem>
                  <SelectItem value="6">{t('page.duration6m')}</SelectItem>
                  <SelectItem value="12">{t('page.duration12m')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('page.paymentMethod')}</Label>
              <Select value={renewForm.method} onValueChange={() => {}}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSFER">{t('page.bankTransfer')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-text-secondary mt-1">{t('page.transferHint')}</p>
            </div>

            <div>
              <Label>{t('page.transactionId')}</Label>
              <Input
                value={renewForm.transactionId}
                onChange={(e) =>
                  setRenewForm((p) => ({ ...p, transactionId: e.target.value }))
                }
                placeholder={t('page.transactionPlaceholder')}
              />
            </div>

            <div>
              <Label>{t('page.referenceOptional')}</Label>
              <Input
                value={renewForm.reference}
                onChange={(e) =>
                  setRenewForm((p) => ({ ...p, reference: e.target.value }))
                }
                placeholder={t('page.referencePlaceholder')}
              />
            </div>

            <div>
              <Label>{t('page.paymentDateOptional')}</Label>
              <Input
                type="date"
                value={renewForm.paymentDate}
                onChange={(e) =>
                  setRenewForm((p) => ({ ...p, paymentDate: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>{t('page.descriptionOptional')}</Label>
              <Textarea
                value={renewForm.description}
                onChange={(e) =>
                  setRenewForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder={t('page.descriptionPlaceholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRenewModal(false)}
              disabled={renewSubmitting}
            >
              {t('modals.upgrade.cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (!subId) return;
                if (!renewForm.transactionId.trim()) {
                  toastError(t('page.toastMissingTxTitle'), t('page.toastMissingTxBody'));
                  return;
                }
                setRenewSubmitting(true);
                try {
                  const resp = await subscriptionsApi.renew(subId, {
                    method: 'TRANSFER',
                    duration: renewForm.duration,
                    transactionId: renewForm.transactionId.trim(),
                    reference: renewForm.reference.trim() || undefined,
                    description: renewForm.description.trim() || undefined,
                    paymentDate: renewForm.paymentDate
                      ? new Date(renewForm.paymentDate).toISOString()
                      : undefined,
                  });
                  if (resp.success) {
                    toastSuccess(t('page.toastRenewSuccessTitle'), t('page.toastRenewSuccessBody'));
                    setShowRenewModal(false);
                    await onSubscriptionRefresh();
                  } else {
                    toastError(
                      t('page.toastRenewFailedTitle'),
                      typeof resp.message === 'string'
                        ? resp.message
                        : t('page.toastRenewFailedBody')
                    );
                  }
                } catch (e) {
                  console.error(e);
                  toastError(t('page.toastRenewFailedTitle'), t('page.toastRenewFailedBody'));
                } finally {
                  setRenewSubmitting(false);
                }
              }}
              disabled={renewSubmitting || !subId}
            >
              {renewSubmitting ? t('page.submitting') : t('page.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      ) : null}
    </>
  );
}
