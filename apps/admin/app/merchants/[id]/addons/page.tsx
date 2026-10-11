'use client';

import '../../../details.css';
import '../../../addons.css';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Breadcrumb, PageWrapper, useToast } from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { addonPricesApi, formatInShopZone } from '@rentalshop/utils';
import type { AddonPriceRow, AddonQuoteData, MerchantAddonItem, MerchantAddonsData, LimitKind } from '@rentalshop/utils';
import { useAuth, useApiError } from '@rentalshop/hooks';
import { KINDS, KIND_UNIT, formatVnd, plusLabel } from '../../../components/addon-labels';

const dayVn = (v: string | null | undefined) => formatInShopZone(v, 'vi', { year: 'numeric', month: '2-digit', day: '2-digit' });
const limitText = (n: number | undefined) => (n === undefined || n === null ? '—' : n === -1 ? 'Không giới hạn' : new Intl.NumberFormat('vi-VN').format(n));

function itemLabel(item: MerchantAddonItem): string {
  if (item.legacy) return `Add-on cũ: ${plusLabel(item.limitKind, item.packSize ?? 0)}`;
  return `${item.name} × ${item.packs} (${plusLabel(item.limitKind, (item.packSize || 0) * (item.packs || 1))})`;
}

/**
 * Merchants → shop → Add-on (#850). Pick a pack from the price list and a number of packs: the price comes from the
 * list, the charge now is prorated on the Vietnam days left in the period. Removal takes effect at the end of the
 * period. Shows the limits (plan + add-ons) and what a 1-month renewal will charge (plan + add-ons renewed).
 */
export default function MerchantAddonsPage() {
  const params = useParams();
  const merchantId = Number(params.id);
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN';
  const { toastSuccess, toastError } = useToast();
  const { translateError } = useApiError();
  // toast / translate change identity on every render: read them through a ref so loading runs once
  const ui = useRef({ toastError, translateError });
  ui.current = { toastError, translateError };

  const [data, setData] = useState<MerchantAddonsData | null>(null);
  const [prices, setPrices] = useState<AddonPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceId, setPriceId] = useState<number | null>(null);
  const [packs, setPacks] = useState('1');
  const [quote, setQuote] = useState<AddonQuoteData | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [shop, list] = await Promise.all([addonPricesApi.listForMerchant(merchantId), addonPricesApi.list()]);
      if (shop.success && shop.data) setData(shop.data);
      else ui.current.toastError(ui.current.translateError(shop));
      if (list.success && list.data) setPrices(list.data.addonPrices || []);
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    load();
  }, [load]);

  // Only rows on sale; an outlets row only for a multi-branch plan (#826)
  const sellable = useMemo(
    () => prices.filter((p) => p.isActive && (p.limitKind !== 'outlets' || data?.multiBranchPlan)),
    [prices, data?.multiBranchPlan]
  );
  useEffect(() => {
    if (priceId === null && sellable.length) setPriceId(sellable[0].id);
  }, [sellable, priceId]);

  const packCount = Number(packs);
  useEffect(() => {
    if (!priceId || !(packCount >= 1)) {
      setQuote(null);
      return;
    }
    let live = true;
    const t = setTimeout(async () => {
      try {
        const res = await addonPricesApi.quote(merchantId, priceId, packCount);
        if (!live) return;
        if (res.success && res.data) {
          setQuote(res.data);
          setQuoteError(null);
        } else {
          setQuote(null);
          setQuoteError(ui.current.translateError(res));
        }
      } catch (e) {
        if (live) {
          setQuote(null);
          setQuoteError(e instanceof Error ? e.message : String(e));
        }
      }
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [merchantId, priceId, packCount, data?.addons.length]);

  const add = async () => {
    if (!priceId || !(packCount >= 1)) return;
    setBusy(true);
    try {
      const res = await addonPricesApi.addToMerchant(merchantId, { addonPriceId: priceId, packs: packCount, method: 'TRANSFER' });
      if (res.success) {
        toastSuccess('Đã thêm add-on');
        setPacks('1');
        await load();
      } else toastError(translateError(res));
    } finally {
      setBusy(false);
    }
  };

  const mark = async (item: MerchantAddonItem, remove: boolean) => {
    setBusy(true);
    try {
      const res = await addonPricesApi.setRemoveAtPeriodEnd(merchantId, item.id, remove);
      if (res.success) {
        toastSuccess(remove ? 'Sẽ gỡ cuối kỳ' : 'Đã hoàn tác');
        await load();
      } else toastError(translateError(res));
    } finally {
      setBusy(false);
    }
  };

  const sub = data?.subscription;
  const selected = sellable.find((p) => p.id === priceId) || null;
  const breadcrumb: BreadcrumbItem[] = [
    { label: 'Merchants', href: '/merchants' },
    { label: data?.merchant.name || 'Merchant', href: `/merchants/${merchantId}` },
    { label: 'Add-on' },
  ];

  return (
    <PageWrapper>
      <div className="ar-detail ar-addons" data-testid="merchant-addons-page">
        <Breadcrumb items={breadcrumb} showHome={false} homeHref="/dashboard" />
        <div className="head">
          <div>
            <h1>{data?.merchant.name || '…'}</h1>
            <p>
              {sub ? `Gói ${sub.plan?.name ?? '—'} · kỳ ${dayVn(sub.currentPeriodStart)} – ${dayVn(sub.currentPeriodEnd)}${sub.status === 'TRIAL' ? ' · dùng thử' : ''}` : 'Chưa có gói'}
            </p>
          </div>
        </div>

        {loading && !data ? (
          <div className="muted">Đang tải…</div>
        ) : (
          <div className="grid2">
            <div className="card pad" data-testid="addon-add-card">
              <div className="card-title">Thêm add-on</div>
              {!sub && <div className="muted">Shop chưa có gói nên chưa thêm add-on được.</div>}
              {sub && sellable.length === 0 && <div className="muted">Chưa có gói add-on nào đang bán (Plans → Add-on prices).</div>}
              {sub && sellable.length > 0 && (
                <>
                  <div className="field">
                    <label htmlFor="ad-pack">Gói add-on</label>
                    <div className="input">
                      <select id="ad-pack" value={priceId ?? ''} onChange={(e) => setPriceId(Number(e.target.value))} disabled={!canEdit}>
                        {sellable.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({plusLabel(p.limitKind, p.packSize)} · {formatVnd(p.monthlyPrice)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="ad-qty">Số gói</label>
                    <div className="input">
                      <input id="ad-qty" inputMode="numeric" value={packs} disabled={!canEdit} onChange={(e) => setPacks(e.target.value.replace(/[^\d]/g, '').slice(0, 4))} />
                      {selected && <span>gói = {plusLabel(selected.limitKind, selected.packSize)}</span>}
                    </div>
                  </div>
                  {quoteError && <div className="muted">{quoteError}</div>}
                  {quote && (
                    <div className="kv" data-testid="addon-quote">
                      <span>Giá (lấy từ Add-on prices)</span>
                      <span className="num">{formatVnd(quote.addonPrice.monthlyPrice)} / gói / tháng</span>
                      <span>Kỳ này còn</span>
                      <span className="num">
                        {quote.remainingDays} / {quote.periodDays} ngày
                      </span>
                      {quote.reason === 'prorated' && (
                        <>
                          <span>
                            {quote.monthlyAmount === quote.cyclePrice
                              ? `${quote.packs} × ${new Intl.NumberFormat('vi-VN').format(quote.addonPrice.monthlyPrice)} × ${quote.remainingDays} ÷ ${quote.periodDays}`
                              : `${new Intl.NumberFormat('vi-VN').format(quote.cyclePrice)} (cả kỳ) × ${quote.remainingDays} ÷ ${quote.periodDays}`}
                          </span>
                          <span className="num">{formatVnd(quote.amountDue)}</span>
                        </>
                      )}
                      {quote.reason === 'trial' && (
                        <>
                          <span>Shop đang dùng thử</span>
                          <span className="num">tính từ lần gia hạn</span>
                        </>
                      )}
                      {quote.reason === 'ended' && (
                        <>
                          <span>Kỳ đã hết</span>
                          <span className="num">tính từ lần gia hạn</span>
                        </>
                      )}
                      <span className="tot">Thu bây giờ</span>
                      <span className="num tot">{formatVnd(quote.amountDue)}</span>
                    </div>
                  )}
                  {canEdit && (
                    <div className="row">
                      <button className="btn pri" type="button" onClick={add} disabled={busy || !quote}>
                        Thêm add-on · {formatVnd(quote?.amountDue ?? 0)}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="card pad" data-testid="addon-shop-card">
              <div className="card-title">Add-on của shop</div>
              {data && data.addons.length === 0 && <div className="muted">Chưa có add-on.</div>}
              <div className="items">
                {data?.addons.map((item) => (
                  <div className="item" key={item.id} data-testid={`shop-addon-${item.id}`}>
                    <span>
                      {itemLabel(item)}{' '}
                      {item.removeAtPeriodEnd ? (
                        <span className="pill warn">Gỡ cuối kỳ{item.endsAt ? ` (${dayVn(item.endsAt)})` : ''}</span>
                      ) : item.legacy ? (
                        <span className="pill off">Miễn phí</span>
                      ) : (
                        <span className="pill on">Đang dùng</span>
                      )}
                    </span>
                    <span className="num">{formatVnd(item.monthlyAmount)}/tháng</span>
                    {item.nextPacks != null && !item.removeAtPeriodEnd && (
                      <span className="muted">Từ kỳ sau: {item.nextPacks} gói</span>
                    )}
                    {canEdit && !item.legacy && !item.removeAtPeriodEnd && (
                      <PacksEditor merchantId={merchantId} item={item} busy={busy} onSaved={load} />
                    )}
                    {canEdit && (
                      <div className="actions">
                        {item.removeAtPeriodEnd ? (
                          <button className="btn" type="button" disabled={busy} onClick={() => mark(item, false)}>
                            Hoàn tác
                          </button>
                        ) : (
                          <button className="btn" type="button" disabled={busy} onClick={() => mark(item, true)}>
                            Gỡ cuối kỳ
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {data?.renewal && sub && (
                <>
                  <div className="card-title">Gia hạn 1 tháng sẽ thu</div>
                  <div className="kv" data-testid="addon-renewal">
                    <span>Gói {sub.plan?.name}</span>
                    <span className="num">{formatVnd(data.renewal.monthly.planPrice)}</span>
                    {data.addons.map((item) => (
                      <React.Fragment key={item.id}>
                        <span>
                          {item.legacy ? itemLabel(item) : `${item.name} × ${item.packs}`}
                          {item.removeAtPeriodEnd ? ' (gỡ cuối kỳ)' : !item.renews ? ' (đã tạm tắt)' : ''}
                        </span>
                        <span className="num">{formatVnd(item.renewMonthlyAmount)}</span>
                      </React.Fragment>
                    ))}
                    <span className="tot">Tổng</span>
                    <span className="num tot">{formatVnd(data.renewal.monthly.totalDue)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {data?.limits && (
          <div className="card limits tbl" data-testid="addon-limits">
            <table>
              <thead>
                <tr>
                  <th>Giới hạn</th>
                  <th className="num">Gói</th>
                  <th className="num">Add-on</th>
                  <th className="num">Tổng</th>
                  <th className="num">Đang dùng</th>
                </tr>
              </thead>
              <tbody>
                {KINDS.map((k: LimitKind) => (
                  <tr key={k} data-testid={`limit-${k}`}>
                    <td>{KIND_UNIT[k]}</td>
                    <td className="num">{limitText(data.limits!.plan?.[k])}</td>
                    <td className="num">{data.limits!.addons?.[k] ? `+${data.limits!.addons[k]}` : '—'}</td>
                    <td className="num">
                      <b>{limitText(data.limits!.total?.[k])}</b>
                    </td>
                    <td className="num">{limitText(data.limits!.usage?.[k])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="note">
          <b>Giá lấy từ trang Add-on prices.</b> Admin chỉ chọn gói và số gói, không gõ giá ở đây. Giá được ghi lại lúc mua và
          giữ đến hết kỳ đã trả. Gỡ có hiệu lực cuối kỳ, không hoàn tiền.
        </div>
      </div>
    </PageWrapper>
  );
}

/**
 * #870: number of packs of a bought item. More packs apply now and the extra packs are charged now (the quote of the
 * add form); fewer packs apply from the next period, no refund.
 */
function PacksEditor({ merchantId, item, busy, onSaved }: { merchantId: number; item: MerchantAddonItem; busy: boolean; onSaved: () => Promise<void> }) {
  const { toastSuccess, toastError } = useToast();
  const { translateError } = useApiError();
  const current = item.packs || 1;
  const [value, setValue] = useState(String(item.nextPacks ?? current));
  const [charge, setCharge] = useState<AddonQuoteData | null>(null);
  const [saving, setSaving] = useState(false);
  const target = Number(value);
  const extra = target - current;

  useEffect(() => {
    setValue(String(item.nextPacks ?? item.packs ?? 1));
  }, [item.nextPacks, item.packs]);

  useEffect(() => {
    if (!item.addonPriceId || !(extra > 0)) {
      setCharge(null);
      return;
    }
    let live = true;
    const t = setTimeout(async () => {
      const res = await addonPricesApi.quote(merchantId, item.addonPriceId as number, extra);
      if (live) setCharge(res.success && res.data ? res.data : null);
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [merchantId, item.addonPriceId, extra]);

  const unchanged = !(target >= 1) || target === (item.nextPacks ?? current);
  const save = async () => {
    setSaving(true);
    try {
      const res = await addonPricesApi.setPacks(merchantId, item.id, { packs: target, method: 'TRANSFER' });
      if (res.success) {
        toastSuccess(extra > 0 ? 'Đã thêm gói' : extra < 0 ? 'Giảm gói từ kỳ sau' : 'Đã cập nhật');
        await onSaved();
      } else toastError(translateError(res));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="kv" data-testid={`addon-packs-${item.id}`}>
      <label htmlFor={`packs-${item.id}`}>Số gói</label>
      <span className="input" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          id={`packs-${item.id}`}
          inputMode="numeric"
          style={{ width: 64 }}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
        />
        <button className="btn" type="button" disabled={busy || saving || unchanged} onClick={save}>
          Lưu
        </button>
      </span>
      {extra > 0 && (
        <>
          <span>Thu ngay (+{extra} gói)</span>
          <span className="num">{charge ? formatVnd(charge.amountDue) : '…'}</span>
        </>
      )}
      {extra < 0 && target >= 1 && <span className="muted">Còn {target} gói từ kỳ gia hạn sau, không hoàn tiền</span>}
    </div>
  );
}
