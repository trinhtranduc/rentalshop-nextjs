'use client';

/**
 * Cài đặt cửa hàng (#528, board Cai-dat), shown in the shell's Cài đặt dialog (#539). Left: the
 * section list. Right: the section, drawn on the shell tokens. Every section and save action of the
 * old shared Settings component is kept with the same API calls; bank accounts is still the
 * shared panel, wrapped in `.ar-legacy` for dark mode. Gói dịch vụ is `SubscriptionTab` (#557).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth, usePermissions } from '@rentalshop/hooks';
import { BankAccountSection, useCurrency, useToast } from '@rentalshop/ui';
import { merchantsApi, settingsApi, subscriptionsApi } from '@rentalshop/utils';
import { SettingsSubscriptionMerchantActions } from '../components/SettingsSubscriptionMerchantActions';
import { Skeleton, type T } from '../orders/list/parts';
import { ICONS, ShellIcon } from '../components/shell/Icon';
import { useTheme } from '../providers/ThemeProvider';
import {
  AccountSection,
  AppearanceSection,
  BlockOldAppsSection,
  LanguageSection,
  LegacyPanel,
  OnlineBookingSection,
  OverlapSection,
  OutletsLinkRow,
  ProfileSection,
  PublicPageSection,
  ReceiptSection,
  ShareLinksSection,
  ShopInfoSection,
  type ProfileForm,
  type ShopForm,
} from './sections';
import { DepositSection } from '../installments/DepositSection';
import { blockOldAppsFlag, canChangeCurrency, canChangeOverlap, canChangeShareOrderNote, canEditPrintSettings, groupedTabs, onlineBookingFlag, overlapFlag, settingsOutletChoice, shareOrderNoteFlag, shopCurrency, showPublicPriceFlag, tabsForRole, type SettingsTab } from './settings-model';
import { useBranchOptions } from '../dashboard/useBranchOptions';
import type { BranchOption } from '../dashboard/branch-model';
import type { SubscriptionLoad } from './SubscriptionTab';
import type { SubscriptionStatus } from './subscription-model';

/** Loose view of the signed-in user (login payload carries merchant / outlet objects). */
interface SettingsUser {
  id?: number;
  role?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  merchantId?: number;
  publicProductLink?: string | null;
  merchant?: Record<string, string | null | undefined> | null;
  outlet?: (Record<string, string | null | undefined> & { merchant?: Record<string, string | null | undefined> | null }) | null;
}

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

function updateStoredUser(mutate: (user: Record<string, unknown>) => void) {
  try {
    const raw = window.localStorage.getItem('authData');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data?.user) {
      mutate(data.user);
      window.localStorage.setItem('authData', JSON.stringify(data));
    }
  } catch {
    // Storage blocked: the next login refreshes it.
  }
}

interface SettingsPanelProps {
  /** Tab to show, already resolved for the role (`resolveTab`). */
  tab: SettingsTab;
  onTab: (tab: SettingsTab) => void;
  onClose: () => void;
  /** id for the dialog title, so the dialog can point aria-labelledby at it. */
  titleId: string;
  /** #852: `?settingsOutlet=` — the owner's branch on the bank-accounts / receipt tabs */
  outletParam?: string | null;
  onOutlet?: (outletId: number) => void;
  /** #1140: phone shows the grouped section list (`?settings=` with no tab); desktop ignores it */
  list?: boolean;
  /** Phone back button: return to the list */
  onList?: () => void;
}

/** #852: "Chi nhánh" select on top of the per-branch tabs (owner with 2+ active branches) */
function BranchSelect({ options, value, onChange, t }: { options: BranchOption[]; value: number; onChange: (id: number) => void; t: T }) {
  return (
    <label data-settings-branch className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-ar-primary bg-ar-primary-soft px-4 py-3 text-sm font-semibold text-ar-primary-ink">
      {t('home.branches.label')}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 min-w-0 flex-1 rounded-[10px] border border-ar-line bg-ar-surface px-3 text-[15px] font-normal text-ar-ink sm:max-w-[320px]"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.isDefault ? `${o.name} (${t('home.branches.default')})` : o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SettingsPanel({ tab, onTab, onClose, titleId, outletParam = null, onOutlet, list = false, onList }: SettingsPanelProps) {
  const t = useTranslations('settings.web') as unknown as T;
  const td = useTranslations('dashboard') as unknown as T;
  const ts = useTranslations('settings');
  const tu = useTranslations('users');
  const { user: authUser, logout, refreshUser } = useAuth();
  const { canManageMerchants, canManageOutlets } = usePermissions();
  const { toastSuccess, toastError } = useToast();
  const { setCurrency } = useCurrency();
  const user = authUser as unknown as SettingsUser | null;
  const role = String(user?.role || '').toUpperCase();

  const { enabled: themeSwitch } = useTheme();
  const groups = useMemo(() => groupedTabs(tabsForRole(role)), [role]);

  // #852: the owner sets bank accounts and the receipt per branch (active branches; default first)
  const perBranch = role === 'MERCHANT' && (tab === 'payment' || tab === 'receipt');
  const allBranches = useBranchOptions(perBranch);
  const branchOptions = useMemo(() => (allBranches ?? []).filter((o) => o.isActive), [allBranches]);
  const branchId = perBranch ? settingsOutletChoice(branchOptions, outletParam) : null;
  const branchSelect =
    perBranch && branchId !== null && branchOptions.length >= 2 ? (
      <BranchSelect options={branchOptions} value={branchId} onChange={(id) => onOutlet?.(id)} t={td} />
    ) : null;

  // ---------------------------------------------------------------- merchant
  const [fetchedMerchant, setFetchedMerchant] = useState<Record<string, string> | null>(null);
  const merchant = useMemo(() => ({ ...(fetchedMerchant || {}), ...(user?.merchant || {}) }), [fetchedMerchant, user?.merchant]);
  const tenantKey = str(user?.merchant?.tenantKey) || str(fetchedMerchant?.tenantKey);

  // tenantKey normally comes with login; fetch the merchant only when it is missing (old behaviour).
  useEffect(() => {
    if (role !== 'MERCHANT' || !user?.merchantId || str(user?.merchant?.tenantKey)) return;
    let alive = true;
    merchantsApi
      .getMerchantById(user.merchantId)
      .then((res) => {
        if (!alive || !res.success || !res.data) return;
        const data = res.data as unknown as { merchant?: Record<string, string> } & Record<string, string>;
        setFetchedMerchant(data.merchant || data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [role, user?.merchantId, user?.merchant?.tenantKey]);

  // #1143: opening Settings or changing the UI language never changes the shop currency (set at sign-up)

  // #1138: login has no onlineBookingEnabled; load the profile once so the switch shows the stored value
  const bookingFlag = onlineBookingFlag(merchant);
  const priceFlag = showPublicPriceFlag(merchant);
  const showsBooking = tab === 'merchant' || (tab === 'outlet' && role === 'OUTLET_ADMIN');
  const oldAppsFlag = blockOldAppsFlag(merchant as { blockPricing?: { oldApps?: unknown } });
  const overlapValue = overlapFlag(merchant);
  // #1344: every role reads it (profile), only the owner changes it
  const shareNoteValue = shareOrderNoteFlag(merchant as { shareOrderNote?: unknown });
  const needsProfile =
    (showsBooking && bookingFlag === null) ||
    (tab === 'receipt' && shareNoteValue === null) ||
    (tab === 'public-page' && priceFlag === null) ||
    (tab === 'merchant' && role === 'MERCHANT' && (oldAppsFlag === null || overlapValue === null));
  const profileLoaded = useRef(false);
  useEffect(() => {
    if (!needsProfile || !user?.merchant || profileLoaded.current) return;
    profileLoaded.current = true;
    void refreshUser?.();
  }, [needsProfile, user?.merchant, refreshUser]);

  const merchantForm: ShopForm = {
    name: str(merchant.name),
    phone: str(merchant.phone),
    address: str(merchant.address),
    city: str(merchant.city),
    state: str(merchant.state),
    zipCode: str(merchant.zipCode),
    country: str(merchant.country),
    businessType: str(merchant.businessType),
    pricingType: str(merchant.pricingType),
    taxId: str(merchant.taxId),
    tenantKey: str(merchant.tenantKey) || tenantKey,
    description: str(merchant.description),
    // #1145 "Tiền tệ" (owner only)
    ...(canChangeCurrency(role) ? { currency: shopCurrency(merchant.currency) } : {}),
  };

  const saveMerchant = async (form: ShopForm) => {
    const { currency: nextCurrency, ...info } = form;
    const currencyChanged = canChangeCurrency(role) && !!nextCurrency && nextCurrency !== merchantForm.currency;
    const infoChanged = JSON.stringify(info) !== JSON.stringify({ ...merchantForm, currency: undefined });
    if (currencyChanged && nextCurrency) {
      try {
        const res = await settingsApi.updateMerchantCurrency({ currency: nextCurrency });
        if (!res.success) {
          toastError(ts('messages.errorTitle'), res.error || ts('messages.currencyUpdateFailed'));
          return false;
        }
        setCurrency(nextCurrency);
        updateStoredUser((u) => {
          const m = u.merchant as Record<string, unknown> | undefined;
          if (m) m.currency = nextCurrency;
        });
      } catch {
        toastError(ts('messages.errorTitle'), ts('messages.currencyUpdateFailed'));
        return false;
      }
      if (!infoChanged) {
        await refreshUser();
        toastSuccess(ts('messages.successTitle'), ts('messages.currencyUpdated'));
        return true;
      }
    }
    const payload = {
      name: info.name,
      phone: info.phone,
      address: info.address,
      city: info.city,
      state: info.state,
      zipCode: info.zipCode,
      country: info.country,
      businessType: info.businessType || '',
      pricingType: info.pricingType || '',
      taxId: info.taxId || '',
      tenantKey: info.tenantKey || '',
      description: info.description || '',
    };
    try {
      const res = await settingsApi.updateMerchantInfo(payload);
      if (res.success) {
        await refreshUser();
        toastSuccess(ts('messages.successTitle'), ts('messages.businessInfoUpdated'));
        return true;
      }
      toastError(ts('messages.errorTitle'), res.error || ts('messages.businessInfoUpdateFailed'));
    } catch {
      toastError(ts('messages.errorTitle'), ts('messages.businessInfoUpdateFailed'));
    }
    return false;
  };

  // ------------------------------------------------------------------ outlet
  const outlet = user?.outlet || {};
  // The outlet form shows only what PUT /api/settings/outlet stores (name, address, phone, description).
  const outletForm: ShopForm = {
    name: str(outlet.name),
    phone: str(outlet.phone),
    address: str(outlet.address),
    city: '',
    state: '',
    zipCode: '',
    country: '',
    description: str(outlet.description),
  };
  const saveOutlet = async (form: ShopForm) => {
    const payload = {
      name: form.name.trim(),
      phone: form.phone,
      address: form.address.trim(),
      description: form.description || '',
    };
    try {
      const res = await settingsApi.updateOutletInfo(payload);
      if (res.success) {
        await refreshUser();
        toastSuccess(ts('messages.successTitle'), ts('messages.outletInfoUpdated'));
        return true;
      }
      toastError(ts('messages.errorTitle'), res.error || ts('messages.outletInfoUpdateFailed'));
    } catch {
      toastError(ts('messages.errorTitle'), ts('messages.outletInfoUpdateFailed'));
    }
    return false;
  };

  // ----------------------------------------------------------------- profile
  const profileForm: ProfileForm = { firstName: str(user?.firstName), lastName: str(user?.lastName), phone: str(user?.phone) };
  const saveProfile = async (form: ProfileForm) => {
    try {
      const res = await settingsApi.updateUserProfile(form);
      if (res.success) {
        const name = `${form.firstName} ${form.lastName}`;
        updateStoredUser((u) => Object.assign(u, form, { name }));
        if (authUser) Object.assign(authUser, form, { name });
        await refreshUser();
        toastSuccess(ts('messages.successTitle'), ts('messages.personalProfileUpdated'));
        return true;
      }
      toastError(ts('messages.errorTitle'), res.error || ts('messages.personalProfileUpdateFailed'));
    } catch {
      toastError(ts('messages.errorTitle'), ts('messages.personalProfileUpdateFailed'));
    }
    return false;
  };

  // ------------------------------------------------------------ subscription
  // The flat status payload (#557 reads it directly; no merchant subscription → 'none').
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [subscriptionLoad, setSubscriptionLoad] = useState<SubscriptionLoad>('loading');
  const refreshSubscription = useCallback(async () => {
    if (role !== 'MERCHANT') {
      setSubscriptionStatus(null);
      setSubscriptionLoad('none');
      return;
    }
    setSubscriptionLoad('loading');
    try {
      const res = await subscriptionsApi.getCurrentUserSubscriptionStatus();
      if (res.success && res.data) {
        setSubscriptionStatus(res.data as SubscriptionStatus);
        setSubscriptionLoad('ok');
      } else {
        setSubscriptionStatus(null);
        setSubscriptionLoad(res.code === 'NO_SUBSCRIPTION_FOUND' ? 'none' : 'failed');
      }
    } catch {
      setSubscriptionStatus(null);
      setSubscriptionLoad('failed');
    }
  }, [role]);
  useEffect(() => {
    if (tab === 'subscription') void refreshSubscription();
  }, [tab, refreshSubscription]);

  const signOut = () => {
    // logout clears local auth even when the request fails.
    void Promise.resolve()
      .then(() => logout())
      .catch(() => undefined);
  };

  // ------------------------------------------------------------------ render
  // #1140: one line per row, no side text (it wrapped "Ngôn ngữ & giao diện" onto 4 lines)
  const navItem = (id: SettingsTab) => {
    const on = id === tab;
    return (
      <li key={id}>
        <button
          type="button"
          aria-current={on ? 'page' : undefined}
          onClick={() => onTab(id)}
          className={`flex min-h-[48px] w-full items-center justify-between gap-3 bg-ar-surface px-4 text-left text-[15px] text-ar-ink hover:bg-ar-subtle lg:min-h-[40px] lg:rounded-[10px] lg:bg-transparent lg:px-3 ${
            on ? 'lg:bg-ar-surface lg:font-semibold lg:shadow-[0_1px_2px_rgba(15,23,42,0.08)]' : 'lg:text-ar-ink-2'
          }`}
        >
          <span className="min-w-0 truncate whitespace-nowrap">{t(`nav.${id}`)}</span>
          <span className="flex-none text-ar-muted lg:hidden">
            <ShellIcon d={ICONS.chevronRight} />
          </span>
        </button>
      </li>
    );
  };

  const section = () => {
    switch (tab) {
      case 'merchant':
        return (
          <>
            <ShopInfoSection
              kind="merchant"
              initial={merchantForm}
              email={str(merchant.email)}
              canEdit={canManageMerchants}
              canEditCurrency={canChangeCurrency(role)}
              onSave={saveMerchant}
              t={t}
            />
            <OnlineBookingSection
              t={t}
              enabled={bookingFlag === true}
              canEditShop={role === 'MERCHANT'}
              canEditOutlets={canManageOutlets}
              onShopChanged={() => void refreshUser?.()}
            />
            {canChangeOverlap(role) && <OverlapSection t={t} allowed={overlapValue !== false} onChanged={() => void refreshUser?.()} />}
            {role === 'MERCHANT' && (
              <BlockOldAppsSection t={t} value={oldAppsFlag ?? 'recompute'} canEdit onChanged={() => void refreshUser?.()} />
            )}
            <OutletsLinkRow t={t} />
          </>
        );
      case 'public-page':
        return (
          <PublicPageSection
            tenantKey={merchantForm.tenantKey || ''}
            publicProductLink={user?.publicProductLink || str(user?.merchant?.publicProductLink)}
            canEdit={canManageMerchants}
            showPublicPrice={priceFlag !== false}
            canEditPrice={role === 'MERCHANT'}
            onPriceChanged={() => void refreshUser?.()}
            onSave={(key) => saveMerchant({ ...merchantForm, tenantKey: key })}
            t={t}
          />
        );
      case 'outlet':
        return (
          <>
            <ShopInfoSection kind="outlet" initial={outletForm} canEdit={canManageOutlets} onSave={saveOutlet} t={t} />
            {role === 'OUTLET_ADMIN' && (
              <OnlineBookingSection
                t={t}
                enabled={bookingFlag === true}
                canEditShop={false}
                canEditOutlets={canManageOutlets}
              />
            )}
            <ShareLinksSection
              publicProductLink={str(user?.outlet?.merchant?.publicProductLink)}
              tenantKey={str(user?.outlet?.merchant?.tenantKey) || str(user?.merchant?.tenantKey)}
              referralCode={str(user?.outlet?.merchant?.referralLink)}
              t={t}
            />
          </>
        );
      case 'payment':
        // #1259 Thu tiền: bank accounts (owner / outlet admin), then "Cách thu cọc" (owner only, as before)
        if (role === 'MERCHANT') {
          // The owner has no outlet of its own: the shared panel reads the picked branch
          if (allBranches === null) return <Skeleton className="h-[320px] w-full" />;
          return (
            <>
              {branchSelect}
              <LegacyPanel title={t('bank.title')}>
                <BankAccountSection
                  key={branchId ?? 'none'}
                  user={{ ...(authUser as object), outletId: branchId ?? undefined, outlet: branchId ? { id: branchId } : null }}
                />
              </LegacyPanel>
              <DepositSection t={t} />
            </>
          );
        }
        return (
          <LegacyPanel title={t('bank.title')}>
            <BankAccountSection user={authUser} />
          </LegacyPanel>
        );
      case 'receipt':
        if (role === 'MERCHANT' && allBranches === null) return <Skeleton className="h-[420px] w-full" />;
        return (
          <>
            {branchSelect}
            <ReceiptSection
              t={t}
              canEditNote={canEditPrintSettings(role)}
              outletId={role === 'MERCHANT' ? branchId : undefined}
              shareOrderNote={shareNoteValue}
              canEditShareOrderNote={canChangeShareOrderNote(role)}
              onShareOrderNoteChanged={() => void refreshUser?.()}
              bankLink={role === 'OUTLET_ADMIN' || role === 'MERCHANT' ? { kind: 'tab', open: () => onTab('payment') } : null}
            />
          </>
        );
      case 'subscription':
        return (
          <SettingsSubscriptionMerchantActions
            status={subscriptionStatus}
            load={subscriptionLoad}
            onSubscriptionRefresh={refreshSubscription}
            currentUserRole={user?.role}
          />
        );
      case 'language':
        // #1140: Ngôn ngữ & giao diện on one page; the theme kill switch still hides Giao diện
        return (
          <>
            <LanguageSection t={t} />
            {themeSwitch && <AppearanceSection t={t} />}
          </>
        );
      case 'profile':
      default:
        // #1259 Hồ sơ & bảo mật: the profile, then change password, logout and delete account
        return (
          <>
            <ProfileSection
              initial={profileForm}
              email={str(user?.email)}
              roleLabel={role ? tu(`roles.${role}`) : '—'}
              onSave={saveProfile}
              t={t}
            />
            <AccountSection userId={user?.id ?? null} onSignOut={signOut} t={t} />
          </>
        );
    }
  };

  const closeButton = (className: string) => (
    <button
      type="button"
      onClick={onClose}
      aria-label={t('close')}
      className={`h-10 w-10 flex-none items-center justify-center rounded-[10px] text-ar-ink-2 hover:bg-ar-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-ar-primary ${className}`}
    >
      <ShellIcon d={ICONS.close} />
    </button>
  );

  // #1140: desktop = nav + page side by side; phone = the grouped list, or one page with back
  return (
    <div className="flex h-full min-h-0 flex-col text-ar-ink lg:flex-row">
      <nav
        aria-label={t('navLabel')}
        className={`${list ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col overflow-y-auto bg-ar-subtle px-4 pb-6 pt-3 lg:flex lg:w-[240px] lg:flex-none lg:border-r lg:border-ar-line lg:px-3 lg:py-5`}
      >
        <div className="mb-1 flex items-center justify-between lg:mb-2 lg:px-3">
          <h2 id={titleId} className="m-0 text-lg font-bold">
            {t('dialogTitle')}
          </h2>
          {closeButton('flex lg:hidden')}
        </div>
        {!user ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          groups.map(({ group, tabs }) => (
            <div key={group}>
              <h3 className="m-0 px-1 pb-1.5 pt-4 text-xs font-semibold uppercase tracking-wide text-ar-muted lg:px-3 lg:pb-1 lg:pt-3">{t(`groups.${group}`)}</h3>
              <ul className="m-0 flex list-none flex-col divide-y divide-ar-line overflow-hidden rounded-xl border border-ar-line p-0 lg:gap-0.5 lg:divide-y-0 lg:overflow-visible lg:rounded-none lg:border-0">
                {tabs.map((x) => navItem(x.id))}
              </ul>
            </div>
          ))
        )}
      </nav>
      <div className={`${list ? 'hidden' : 'flex'} min-h-0 min-w-0 flex-1 flex-col lg:flex`}>
        {/* Phone: back to the list + page title. Desktop: each section card carries its own title, so only ✕. */}
        <div className="flex flex-none items-center gap-1 border-b border-ar-line px-2 py-2 lg:hidden">
          <button
            type="button"
            onClick={onList}
            aria-label={t('back')}
            className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] text-ar-ink-2 hover:bg-ar-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-ar-primary"
          >
            <ShellIcon d={ICONS.chevronLeft} />
          </button>
          <span className="min-w-0 flex-1 truncate text-lg font-bold">{t(`nav.${tab}`)}</span>
          {closeButton('flex')}
        </div>
        <div className="hidden flex-none justify-end px-3 pt-3 lg:flex">{closeButton('flex')}</div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4 lg:px-8 lg:pt-0">
          {!user ? (
            <Skeleton className="h-[420px] w-full" />
          ) : (
            <div className="flex flex-col gap-4">{section()}</div>
          )}
        </div>
      </div>
    </div>
  );
}
