'use client';

/**
 * Cài đặt cửa hàng (#528, board Cai-dat), shown in the shell's Cài đặt dialog (#539). Left: the
 * section list. Right: the section, drawn on the shell tokens. Every section and save action of the
 * old shared Settings component is kept with the same API calls; bank accounts is still the
 * shared panel, wrapped in `.ar-legacy` for dark mode. Gói dịch vụ is `SubscriptionTab` (#557).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth, usePermissions } from '@rentalshop/hooks';
import { BankAccountSection, useCurrency, useToast } from '@rentalshop/ui';
import { merchantsApi, settingsApi, subscriptionsApi } from '@rentalshop/utils';
import type { CurrencyCode } from '@rentalshop/types';
import { SettingsSubscriptionMerchantActions } from '../components/SettingsSubscriptionMerchantActions';
import { Skeleton, type T } from '../orders/list/parts';
import { ICONS, ShellIcon } from '../components/shell/Icon';
import { useTheme } from '../providers/ThemeProvider';
import {
  AccountSection,
  AppearanceSection,
  LANGUAGES,
  LanguageSection,
  LegacyPanel,
  OutletsSection,
  PrinterSection,
  ProfileSection,
  ReceiptSection,
  ShareLinksSection,
  ShopInfoSection,
  type ProfileForm,
  type ShopForm,
} from './sections';
import { currencyForLocale, tabsForRole, type SettingsTab } from './settings-model';
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
}

export function SettingsPanel({ tab, onTab, onClose, titleId }: SettingsPanelProps) {
  const locale = useLocale();
  const t = useTranslations('settings.web') as unknown as T;
  const ts = useTranslations('settings');
  const tu = useTranslations('users');
  const { user: authUser, logout, refreshUser } = useAuth();
  const { canManageMerchants, canManageOutlets } = usePermissions();
  const { currency, setCurrency } = useCurrency();
  const { toastSuccess, toastError } = useToast();
  const user = authUser as unknown as SettingsUser | null;
  const role = String(user?.role || '').toUpperCase();

  const { enabled: themeSwitch, choice: themeChoice } = useTheme();
  const tabs = useMemo(() => tabsForRole(role, { themeSwitch }), [role, themeSwitch]);

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

  const changeCurrency = useCallback(
    async (next: CurrencyCode) => {
      try {
        const res = await settingsApi.updateMerchantCurrency({ currency: next });
        if (res.success) {
          setCurrency(next);
          updateStoredUser((u) => {
            const m = u.merchant as Record<string, unknown> | undefined;
            if (m) m.currency = next;
          });
          toastSuccess(ts('messages.successTitle'), ts('messages.currencyUpdated'));
        } else toastError(ts('messages.errorTitle'), res.error || ts('messages.currencyUpdateFailed'));
      } catch {
        toastError(ts('messages.errorTitle'), ts('messages.currencyUpdateFailed'));
      }
    },
    [setCurrency, toastSuccess, toastError, ts],
  );

  // The old merchant tab kept the shop currency on the UI language (vi → VND, else USD). Kept.
  const currencySynced = useRef<string | null>(null);
  useEffect(() => {
    if (tab !== 'merchant' || role !== 'MERCHANT' || !user?.merchant) return;
    const target = currencyForLocale(locale);
    const key = `${locale}-${target}`;
    if (currencySynced.current === key) return;
    currencySynced.current = key;
    if (currency !== target) changeCurrency(target as CurrencyCode);
  }, [tab, role, user?.merchant, locale, currency, changeCurrency]);

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
  };

  const saveMerchant = async (form: ShopForm) => {
    const payload = {
      name: form.name,
      phone: form.phone,
      address: form.address,
      city: form.city,
      state: form.state,
      zipCode: form.zipCode,
      country: form.country,
      businessType: form.businessType || '',
      pricingType: form.pricingType || '',
      taxId: form.taxId || '',
      tenantKey: form.tenantKey || '',
      description: form.description || '',
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
  const languageName = LANGUAGES.find((l) => l.value === locale)?.label || locale;
  const navItem = (id: SettingsTab) => {
    const on = id === tab;
    return (
      <li key={id} className="flex-none lg:flex-auto">
        <button
          type="button"
          aria-current={on ? 'page' : undefined}
          onClick={() => onTab(id)}
          className={`flex min-h-[40px] w-full items-center justify-between gap-3 whitespace-nowrap rounded-[10px] px-3 text-left text-[15px] ${
            on ? 'bg-ar-surface font-semibold text-ar-ink shadow-[0_1px_2px_rgba(15,23,42,0.08)]' : 'text-ar-ink-2 hover:bg-ar-subtle'
          }`}
        >
          {t(`nav.${id}`)}
          {id === 'language' && <span className="hidden font-normal text-ar-muted lg:inline">{languageName}</span>}
          {id === 'appearance' && <span className="hidden font-normal text-ar-muted lg:inline">{t(`appearance.${themeChoice}`)}</span>}
        </button>
      </li>
    );
  };

  const section = () => {
    switch (tab) {
      case 'merchant':
        return (
          <>
            <ShopInfoSection kind="merchant" initial={merchantForm} email={str(merchant.email)} canEdit={canManageMerchants} onSave={saveMerchant} t={t} />
            <OutletsSection t={t} />
            <ShareLinksSection
              publicProductLink={user?.publicProductLink || str(user?.merchant?.publicProductLink)}
              tenantKey={merchantForm.tenantKey}
              t={t}
            />
          </>
        );
      case 'outlet':
        return (
          <>
            <ShopInfoSection kind="outlet" initial={outletForm} canEdit={canManageOutlets} onSave={saveOutlet} t={t} />
            <ShareLinksSection
              publicProductLink={str(user?.outlet?.merchant?.publicProductLink)}
              tenantKey={str(user?.outlet?.merchant?.tenantKey) || str(user?.merchant?.tenantKey)}
              referralCode={str(user?.outlet?.merchant?.referralLink)}
              t={t}
            />
          </>
        );
      case 'bank-accounts':
        return (
          <LegacyPanel title={t('bank.title')}>
            <BankAccountSection user={authUser} />
          </LegacyPanel>
        );
      case 'receipt':
        return <ReceiptSection t={t} />;
      case 'subscription':
        return (
          <SettingsSubscriptionMerchantActions
            status={subscriptionStatus}
            load={subscriptionLoad}
            onSubscriptionRefresh={refreshSubscription}
            currentUserRole={user?.role}
          />
        );
      case 'account':
        return <AccountSection userId={user?.id ?? null} onSignOut={signOut} t={t} />;
      case 'language':
        return <LanguageSection t={t} />;
      case 'appearance':
        return <AppearanceSection t={t} />;
      case 'printer':
        return <PrinterSection t={t} />;
      case 'profile':
      default:
        return (
          <ProfileSection
            initial={profileForm}
            email={str(user?.email)}
            roleLabel={role ? tu(`roles.${role}`) : '—'}
            onSave={saveProfile}
            t={t}
          />
        );
    }
  };

  const shopTabs = tabs.filter((x) => x.group === 'shop');
  const meTabs = tabs.filter((x) => x.group === 'me');

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

  return (
    <div className="flex h-full min-h-0 flex-col text-ar-ink lg:flex-row">
      <nav
        aria-label={t('navLabel')}
        className="flex-none border-b border-ar-line bg-ar-subtle px-4 pb-3 pt-3 lg:w-[240px] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-3 lg:py-5"
      >
        <div className="mb-2 flex items-center justify-between lg:mb-3 lg:px-3">
          <h2 id={titleId} className="m-0 text-lg font-bold">
            {t('dialogTitle')}
          </h2>
          {closeButton('flex lg:hidden')}
        </div>
        {!user ? (
          <Skeleton className="h-10 w-full lg:h-40" />
        ) : (
          <ul className="-mx-4 m-0 flex list-none gap-1 overflow-x-auto p-0 px-4 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
            {shopTabs.map((x) => navItem(x.id))}
            {shopTabs.length > 0 && <li aria-hidden="true" className="mx-1 w-px flex-none self-stretch bg-ar-line lg:mx-3 lg:my-2 lg:h-px lg:w-auto" />}
            {meTabs.map((x) => navItem(x.id))}
          </ul>
        )}
      </nav>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Each section card carries its own title, so the right side only needs ✕. */}
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
