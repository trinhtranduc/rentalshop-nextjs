'use client';

/**
 * Cài đặt cửa hàng (#528, board Cai-dat). Left: the section list (old `?tab=` ids so links keep
 * working). Right: the section, drawn on the shell tokens. Every section and save action of the
 * old shared Settings component is kept with the same API calls; bank accounts and the
 * subscription panel are still the shared panels, wrapped in `.ar-legacy` for dark mode.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth, usePermissions } from '@rentalshop/hooks';
import { BankAccountSection, useCurrency, useToast } from '@rentalshop/ui';
import { merchantsApi, settingsApi, subscriptionsApi } from '@rentalshop/utils';
import type { CurrencyCode } from '@rentalshop/types';
import { SettingsSubscriptionMerchantActions } from '../components/SettingsSubscriptionMerchantActions';
import { Skeleton, type T } from '../orders/list/parts';
import {
  AccountSection,
  LANGUAGES,
  LanguageSection,
  LegacyPanel,
  OutletsSection,
  ProfileSection,
  ReceiptSection,
  ShareLinksSection,
  ShopInfoSection,
  type ProfileForm,
  type ShopForm,
} from './sections';
import { currencyForLocale, mapSubscriptionStatus, resolveTab, tabsForRole, type SettingsTab } from './settings-model';

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

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  const { tab, redirect } = resolveTab(searchParams.get('tab'), role);
  const tabs = useMemo(() => tabsForRole(role), [role]);

  useEffect(() => {
    if (!role) return;
    if (redirect) router.replace(redirect);
    else if (searchParams.get('tab') && searchParams.get('tab') !== tab) router.replace(`${pathname}?tab=${tab}`);
  }, [role, redirect, tab, searchParams, router, pathname]);

  const go = (next: SettingsTab) => router.push(`${pathname}?tab=${next}`, { scroll: false });

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
  const [subscriptionData, setSubscriptionData] = useState<ReturnType<typeof mapSubscriptionStatus> | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const refreshSubscription = useCallback(async () => {
    if (role !== 'MERCHANT') {
      setSubscriptionData(null);
      setSubscriptionLoading(false);
      return;
    }
    setSubscriptionLoading(true);
    try {
      const res = await subscriptionsApi.getCurrentUserSubscriptionStatus();
      setSubscriptionData(res.success && res.data ? mapSubscriptionStatus(res.data) : null);
    } catch {
      setSubscriptionData(null);
    } finally {
      setSubscriptionLoading(false);
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
          onClick={() => go(id)}
          className={`flex min-h-[40px] w-full items-center justify-between gap-3 whitespace-nowrap rounded-[10px] px-3 text-left text-[15px] ${
            on ? 'bg-ar-surface font-semibold text-ar-ink shadow-[0_1px_2px_rgba(15,23,42,0.08)]' : 'text-ar-ink-2 hover:bg-ar-subtle'
          }`}
        >
          {t(`nav.${id}`)}
          {id === 'language' && <span className="hidden font-normal text-ar-muted lg:inline">{languageName}</span>}
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
          <LegacyPanel title={t('subscription.title')}>
            <SettingsSubscriptionMerchantActions
              subscriptionData={subscriptionData}
              subscriptionLoading={subscriptionLoading}
              onSubscriptionRefresh={refreshSubscription}
              currentUserRole={user?.role}
            />
          </LegacyPanel>
        );
      case 'account':
        return <AccountSection userId={user?.id ?? null} onSignOut={signOut} t={t} />;
      case 'language':
        return <LanguageSection t={t} />;
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

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <h1 className="m-0 text-2xl font-bold">{t('title')}</h1>
      {!user ? (
        <div className="flex flex-col gap-4 lg:flex-row" aria-busy="true">
          <Skeleton className="h-40 w-full lg:w-[240px]" />
          <Skeleton className="h-[420px] w-full flex-1" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <nav aria-label={t('navLabel')} className="-mx-4 min-w-0 overflow-x-auto px-4 lg:mx-0 lg:w-[240px] lg:flex-none lg:overflow-visible lg:px-0">
            <ul className="m-0 flex list-none gap-1 p-0 lg:flex-col lg:gap-0.5">
              {shopTabs.map((x) => navItem(x.id))}
              {shopTabs.length > 0 && <li aria-hidden="true" className="mx-1 w-px flex-none self-stretch bg-ar-line lg:mx-3 lg:my-2 lg:h-px lg:w-auto" />}
              {meTabs.map((x) => navItem(x.id))}
            </ul>
          </nav>
          <div className="flex min-w-0 flex-1 flex-col gap-4">{section()}</div>
        </div>
      )}
    </div>
  );
}
