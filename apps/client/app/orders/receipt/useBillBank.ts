'use client';

/**
 * Bank accounts of one outlet for the bill bank block (#628). Loaded once per outlet and kept for the page
 * session (a list with no account is fetched again next time, so a newly added account shows up). A failed
 * load returns null: the bill then shows no bank block and no error.
 */
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@rentalshop/hooks';
import { bankAccountsApi, generateVietQRString } from '@rentalshop/utils';
import { billBankState, type BillBankAccountInput, type BillBankState } from './bank-qr-model';

const cache = new Map<number, BillBankAccountInput[]>();
const inflight = new Map<number, Promise<BillBankAccountInput[] | null>>();

function loadAccounts(merchantId: number, outletId: number): Promise<BillBankAccountInput[] | null> {
  const running = inflight.get(outletId);
  if (running) return running;
  const p = bankAccountsApi
    .getBankAccounts(merchantId, outletId)
    .then((res) => {
      if (!res.success || !Array.isArray(res.data)) return null;
      if (res.data.length > 0) cache.set(outletId, res.data);
      return res.data as BillBankAccountInput[];
    })
    .catch(() => null)
    .finally(() => inflight.delete(outletId));
  inflight.set(outletId, p);
  return p;
}

/** Active accounts of `outletId` (null = none asked, loading, or failed). Pass null to skip loading. */
export function useOutletBankAccounts(outletId: number | null | undefined): BillBankAccountInput[] | null {
  const { user } = useAuth();
  const merchantId = Number(user?.merchant?.id || user?.merchantId || 0);
  const [accounts, setAccounts] = useState<BillBankAccountInput[] | null>(() => (outletId ? cache.get(outletId) ?? null : null));
  useEffect(() => {
    if (!outletId || !merchantId) {
      setAccounts(null);
      return;
    }
    const hit = cache.get(outletId);
    if (hit) {
      setAccounts(hit);
      return;
    }
    setAccounts(null);
    let live = true;
    loadAccounts(merchantId, outletId).then((list) => {
      if (live) setAccounts(list);
    });
    return () => {
      live = false;
    };
  }, [outletId, merchantId]);
  return accounts;
}

/** What the bill shows for an outlet whose `printBankQr` is `enabled` (accounts load only when it is on). */
export function useBillBank(outletId: number | null | undefined, enabled: boolean | null | undefined): BillBankState {
  const accounts = useOutletBankAccounts(enabled === true ? outletId : null);
  return useMemo(() => billBankState(enabled, accounts, generateVietQRString), [enabled, accounts]);
}
