'use client';

import '../../../details.css';
import '../../../addons.css';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Breadcrumb, Dialog, DialogContent, DialogHeader, DialogTitle, PageWrapper, useToast } from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { addonPricesApi, formatInShopZone, isBasicPlanName, MAX_ADDON_PACKS, merchantModulesApi } from '@rentalshop/utils';
import type { AddonPriceRow, AddonQuoteData, MerchantAddonItem, MerchantAddonsData, LimitKind } from '@rentalshop/utils';
import { useAuth, useApiError } from '@rentalshop/hooks';
import { FEATURE_LABEL, KINDS, KIND_UNIT, amountLabel, amountText, featureSourceLabel, formatVnd, isFeatureKind, isUnitRow, plusLabel, priceUnit } from '../../../components/addon-labels';

/** Dialog surface of the admin forms (#802): full screen on a phone. */
const PHONE_DIALOG = 'ar-dialog md:max-w-lg max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:w-full max-md:max-w-full max-md:rounded-none max-md:border-0 max-md:top-0 max-md:left-0 max-md:translate-x-0 max-md:translate-y-0 max-md:p-4 max-md:overflow-y-auto max-md:content-start';
const PHONE_FOOTER = 'ar-dialog-footer flex justify-end gap-2 flex-wrap';
const grouped = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n));
type PayMethod = 'TRANSFER' | 'CASH';

const dayVn = (v: string | null | undefined) => formatInShopZone(v, 'vi', { year: 'numeric', month: '2-digit', day: '2-digit' });
const limitText = (n: number | undefined) => (n === undefined || n === null ? '—' : n === -1 ? 'Không giới hạn' : new Intl.NumberFormat('vi-VN').format(n));

function itemLabel(item: MerchantAddonItem): string {
  if (isFeatureKind(item.limitKind)) return item.name || FEATURE_LABEL[item.featureKey || '']?.name || 'Tính năng';
  if (item.legacy) return `Add-on cũ: ${plusLabel(item.limitKind, item.packSize ?? 0)}`;
  return item.name || KIND_UNIT[item.limitKind as LimitKind];
}

const isLoyaltyRow = (p: AddonPriceRow) => isFeatureKind(p.limitKind) && p.featureKey === 'loyalty';

/** #782 second line of a row: "+100 sản phẩm"; an older pack row also says how many packs. */
function itemDetail(item: MerchantAddonItem): string {
  if (isFeatureKind(item.limitKind)) return 'Tính năng cho cả shop';
  if (item.legacy) return '';
  const units = plusLabel(item.limitKind, (item.packSize || 0) * (item.packs || 1));
  return isUnitRow(item) ? units : `${item.packs} gói, ${units}`;
}

/**
 * Merchants → shop → Add-on (#850). "+ Thêm add-on" opens one dialog (#782): pick a row of the price list and type the
 * amount; the price comes from the list, the charge now is prorated on the Vietnam days left in the period. Removal
 * takes effect at the end of the period. Shows the limits (plan + add-ons) and what a 1-month renewal will charge.
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
  // #782: one dialog: the row, the amount, the price, the period, the charge, how it is paid
  const [adding, setAdding] = useState(false);
  // #782: "Sửa số lượng" opens the amount editor of one item
  const [editingId, setEditingId] = useState<number | null>(null);
  const [method, setMethod] = useState<PayMethod>('TRANSFER');
  const [transactionId, setTransactionId] = useState('');
  // #943: "Tắt từ kỳ sau" of a feature asks first
  const [turningOff, setTurningOff] = useState<MerchantAddonItem | null>(null);

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

  // Only rows on sale; a feature the shop already has (add-on or plan) is not offered (#943 / #967).
  // #1187: an outlets row is sold on any plan (Professional / Basic included).
  const ownedFeatures = useMemo(
    () => new Set((data?.addons || []).filter((a) => isFeatureKind(a.limitKind) && a.featureKey).map((a) => a.featureKey as string)),
    [data?.addons]
  );
  // #967: a feature the plan already includes (loyalty) is not offered either
  const planFeatures = useMemo(
    () => new Set((data?.featureSources || []).filter((f) => f.plan).map((f) => f.key)),
    [data?.featureSources]
  );
  // #782 (owner): loyalty is not sold to Basic until it can be set up on the phone. The API refuses it too.
  const isBasic = isBasicPlanName(data?.subscription?.plan?.name);
  const sellable = useMemo(
    () =>
      prices.filter(
        (p) =>
          p.isActive &&
          !(isBasic && isLoyaltyRow(p)) &&
          !(isFeatureKind(p.limitKind) && p.featureKey && (ownedFeatures.has(p.featureKey) || planFeatures.has(p.featureKey)))
      ),
    [prices, ownedFeatures, planFeatures, isBasic]
  );
  const loyaltyHeldBack = isBasic && prices.some((p) => p.isActive && isLoyaltyRow(p)) && !ownedFeatures.has('loyalty') && !planFeatures.has('loyalty');
  useEffect(() => {
    if (priceId !== null && sellable.length && !sellable.some((p) => p.id === priceId)) setPriceId(sellable[0].id);
  }, [sellable, priceId]);
  useEffect(() => {
    if (priceId === null && sellable.length) setPriceId(sellable[0].id);
  }, [sellable, priceId]);

  const selectedRow = sellable.find((p) => p.id === priceId) || null;
  const selectedFeature = isFeatureKind(selectedRow?.limitKind);
  const packCount = selectedFeature ? 1 : Number(packs);
  const amountOk = packCount >= 1 && packCount <= MAX_ADDON_PACKS;
  // #782: on a plan unlimited for this kind the add-on would change nothing (`calculateTotalLimit`, plan-limits.ts)
  const unlimitedKind = !!selectedRow && !selectedFeature && data?.limits?.plan?.[selectedRow.limitKind as LimitKind] === -1;
  useEffect(() => {
    if (!adding || !priceId || !amountOk) {
      setQuote(null);
      setQuoteError(null);
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
  }, [merchantId, adding, priceId, packCount, amountOk, data?.addons.length]);

  const openAdd = () => {
    setPacks('1');
    setMethod('TRANSFER');
    setTransactionId('');
    setAdding(true);
  };

  const add = async () => {
    if (!priceId || !amountOk || unlimitedKind) return;
    setBusy(true);
    try {
      const res = await addonPricesApi.addToMerchant(merchantId, {
        addonPriceId: priceId,
        packs: packCount,
        method,
        ...(transactionId.trim() ? { transactionId: transactionId.trim() } : {}),
      });
      if (res.success) {
        toastSuccess('Đã thêm add-on');
        setAdding(false);
        await load();
      } else toastError(translateError(res));
    } finally {
      setBusy(false);
    }
  };

  // #782: only turning off: a shop on the old free switch keeps it until admin turns it off. New shops buy the add-on.
  const turnOffLegacyLoyalty = async () => {
    setBusy(true);
    try {
      const res = await merchantModulesApi.update(merchantId, 'loyalty', { enabled: false });
      if (res.success) {
        toastSuccess('Đã tắt Khách thân thiết');
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
        const feature = isFeatureKind(item.limitKind);
        toastSuccess(remove ? (feature ? 'Sẽ tắt từ kỳ sau' : 'Sẽ gỡ cuối kỳ') : 'Đã hoàn tác');
        setTurningOff(null);
        await load();
      } else toastError(translateError(res));
    } finally {
      setBusy(false);
    }
  };

  const sub = data?.subscription;
  const selected = selectedRow;
  const legacyOn = (data?.legacyModules || []).filter((m) => m.active);
  // #967: features that are on, and where from ("Khách thân thiết: theo gói")
  const featuresOn = (data?.featureSources || [])
    .map((f) => ({ key: f.key, label: featureSourceLabel(f) }))
    .filter((f): f is { key: string; label: string } => !!f.label);
  const loyaltySource = (data?.featureSources || []).find((f) => f.key === 'loyalty');
  const canDisableLegacyLoyalty =
    canEdit && !!loyaltySource?.active && loyaltySource.legacy && !loyaltySource.plan && !loyaltySource.addon;
  const formula =
    quote && quote.reason === 'prorated'
      ? selectedFeature
        ? `${grouped(quote.discountedMonthlyPrice)} ÷ 30 × ${quote.remainingDays} ngày`
        : `${grouped(quote.discountedMonthlyPrice)} ÷ 30 × ${grouped(quote.packs)} × ${quote.remainingDays} ngày`
      : null;
  const priceLine =
    quote && selected
      ? selectedFeature
        ? `${formatVnd(quote.monthlyAmount)}/tháng`
        : `${amountText(selected, quote.packs)} × ${grouped(selected.monthlyPrice)} = ${formatVnd(quote.monthlyAmount)}/tháng`
      : '';
  const kind = selected && !selectedFeature ? (selected.limitKind as LimitKind) : null;
  const totalNow = kind ? data?.limits?.total?.[kind] : undefined;
  const limitLine =
    kind && quote && totalNow !== undefined && totalNow !== -1
      ? `Giới hạn ${KIND_UNIT[kind]}: ${grouped(totalNow)} → ${grouped(totalNow + (selected?.packSize || 1) * quote.packs)}, có hiệu lực ngay.`
      : null;
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
          {canEdit && sub && sellable.length > 0 && (
            <button className="btn pri" type="button" data-testid="addon-open" onClick={openAdd} disabled={busy}>
              + Thêm add-on
            </button>
          )}
        </div>

        {loading && !data ? (
          <div className="muted">Đang tải…</div>
        ) : (
          <>
            {!sub && <div className="muted">Shop chưa có gói nên chưa thêm add-on được.</div>}
            {sub && sellable.length === 0 && <div className="muted">Chưa có loại add-on nào đang bán (Plans → Add-on prices).</div>}
            <div className="card pad" data-testid="addon-shop-card">
              <div className="card-title">Add-on của shop</div>
              {canDisableLegacyLoyalty && (
                <div className="row" data-testid="loyalty-switch">
                  <button className="btn" type="button" data-testid="disable-loyalty" disabled={busy} onClick={turnOffLegacyLoyalty}>
                    Tắt Khách thân thiết
                  </button>
                </div>
              )}
              {featuresOn.length > 0 && (
                <div className="kv" data-testid="addon-feature-sources">
                  {featuresOn.map((f) => (
                    <React.Fragment key={f.key}>
                      <span>{FEATURE_LABEL[f.key]?.name ?? f.key}</span>
                      <span className="pill on" data-testid={`feature-source-${f.key}`}>
                        {f.label}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}
              {legacyOn.length > 0 && (
                <div className="muted" data-testid="addon-legacy-modules">
                  {legacyOn
                    .map((m) => `${FEATURE_LABEL[m.key]?.name ?? m.key} đang bật kiểu cũ (Module, không tính tiền${m.endDate ? `, đến ${m.endDate.split('-').reverse().join('/')}` : ''})`)
                    .join('; ')}
                  . Thêm add-on để chuyển sang tính tiền; kiểu cũ tự tắt khi thêm.
                </div>
              )}
              {data && data.addons.length === 0 && <div className="muted">Chưa có add-on.</div>}
              <div className="items">
                {data?.addons.map((item) => (
                  <div className="item" key={item.id} data-testid={`shop-addon-${item.id}`}>
                    <span>
                      <b>{itemLabel(item)}</b>{' '}
                      {item.removeAtPeriodEnd ? (
                        <span className="pill warn">
                          {isFeatureKind(item.limitKind) ? 'Dùng đến' : 'Gỡ cuối kỳ'}
                          {item.endsAt ? ` (${dayVn(item.endsAt)})` : ''}
                        </span>
                      ) : item.legacy ? (
                        <span className="pill off">Miễn phí</span>
                      ) : (
                        <span className="pill on">Đang dùng</span>
                      )}
                      {itemDetail(item) && <small>{itemDetail(item)}</small>}
                    </span>
                    <span className="num">{formatVnd(item.monthlyAmount)}/tháng</span>
                    {item.nextPacks != null && !item.removeAtPeriodEnd && (
                      <span className="muted">Từ kỳ sau: {amountText(item, item.nextPacks)}</span>
                    )}
                    {canEdit && editingId === item.id && !item.legacy && !item.removeAtPeriodEnd && !isFeatureKind(item.limitKind) && (
                      <PacksEditor
                        merchantId={merchantId}
                        item={item}
                        busy={busy}
                        onSaved={async () => {
                          setEditingId(null);
                          await load();
                        }}
                      />
                    )}
                    {canEdit && (
                      <div className="actions">
                        {item.removeAtPeriodEnd ? (
                          <button className="btn" type="button" disabled={busy} onClick={() => mark(item, false)}>
                            Hoàn tác
                          </button>
                        ) : isFeatureKind(item.limitKind) ? (
                          <button className="btn" type="button" disabled={busy} onClick={() => setTurningOff(item)}>
                            Tắt từ kỳ sau
                          </button>
                        ) : (
                          <>
                            {!item.legacy && (
                              <button className="btn" type="button" disabled={busy} onClick={() => setEditingId(editingId === item.id ? null : item.id)}>
                                Sửa số lượng
                              </button>
                            )}
                            <button className="btn" type="button" disabled={busy} onClick={() => mark(item, true)}>
                              Gỡ cuối kỳ
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>
          </>
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
                    <td className="num">{data.limits!.addons?.[k] ? `+${grouped(data.limits!.addons[k])}` : '—'}</td>
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

        {data?.renewal && sub && (
          <div className="card pad">
            <div className="card-title">Gia hạn 1 tháng sẽ thu</div>
                  <div className="kv" data-testid="addon-renewal">
                    <span>Gói {sub.plan?.name}</span>
                    <span className="num">{formatVnd(data.renewal.monthly.planPrice)}</span>
                    {data.addons.map((item) => (
                      <React.Fragment key={item.id}>
                        <span>
                          {item.legacy || isFeatureKind(item.limitKind) ? itemLabel(item) : isUnitRow(item) ? `${item.name}, ${plusLabel(item.limitKind, item.packs)}` : `${item.name} × ${item.packs}`}
                          {item.removeAtPeriodEnd
                            ? isFeatureKind(item.limitKind)
                              ? ' (tắt từ kỳ sau)'
                              : ' (gỡ cuối kỳ)'
                            : !item.renews
                              ? ' (đã tạm tắt)'
                              : ''}
                        </span>
                        <span className="num">{formatVnd(item.renewMonthlyAmount)}</span>
                      </React.Fragment>
                    ))}
                    <span className="tot">Tổng</span>
                    <span className="num tot">{formatVnd(data.renewal.monthly.totalDue)}</span>
                  </div>
          </div>
        )}

        <Dialog open={adding} onOpenChange={(v) => !v && setAdding(false)}>
          <DialogContent className={PHONE_DIALOG}>
            <DialogHeader>
              <DialogTitle>Thêm add-on · {data?.merchant.name}</DialogTitle>
            </DialogHeader>
            <div className="ar-addons" style={{ gap: 14 }} data-testid="addon-dialog">
              <div className="field">
                <label htmlFor="ad-pack">Add-on</label>
                <div className="input">
                  <select id="ad-pack" value={priceId ?? ''} onChange={(e) => setPriceId(Number(e.target.value))}>
                    {sellable.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {formatVnd(p.monthlyPrice)} / {priceUnit(p)}
                      </option>
                    ))}
                  </select>
                </div>
                {loyaltyHeldBack && (
                  <span className="muted" data-testid="addon-basic-loyalty">
                    Khách thân thiết chưa bán cho gói Basic vì chưa cài đặt được trên điện thoại.
                  </span>
                )}
              </div>
              {selected && !selectedFeature && (
                <div className="field">
                  <label htmlFor="addon-amount">{amountLabel(selected)}</label>
                  <div className="input">
                    <input
                      id="addon-amount"
                      inputMode="numeric"
                      value={packs}
                      onChange={(e) => setPacks(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                    />
                    {!isUnitRow(selected) && <span>gói = {plusLabel(selected.limitKind, selected.packSize)}</span>}
                  </div>
                  {packCount > MAX_ADDON_PACKS ? (
                    <span className="muted">Tối đa {grouped(MAX_ADDON_PACKS)}.</span>
                  ) : (
                    isUnitRow(selected) && <span className="muted">Gõ số bất kỳ, không có cỡ block cố định.</span>
                  )}
                </div>
              )}
              {selectedFeature && <div className="muted">Tính năng bật cho cả shop, không có số lượng.</div>}
              {unlimitedKind && selected && (
                <div className="ar-addons-note" data-testid="addon-unlimited">
                  Gói của shop đã không giới hạn {KIND_UNIT[selected.limitKind as LimitKind]}, nên add-on này không thay đổi gì.
                </div>
              )}
              {quoteError && <div className="muted">{quoteError}</div>}
              {quote && sub && (
                <div className="kv" data-testid="addon-quote">
                  <span>Giá</span>
                  <span className="num" data-testid="addon-price-line">{priceLine}</span>
                  <span>Kỳ</span>
                  <span className="num" data-testid="addon-period">
                    Đến {dayVn(sub.currentPeriodEnd)}, còn {quote.remainingDays} ngày
                  </span>
                  <span className="tot">Thu bây giờ</span>
                  <span className="num tot" data-testid="addon-charge-now">{formatVnd(quote.amountDue)}</span>
                </div>
              )}
              {quote && (
                <div className="muted" data-testid="addon-how">
                  {quote.reason === 'prorated' && `${formula}. `}
                  {quote.reason === 'trial' && 'Shop đang dùng thử nên chưa thu, tính từ lần gia hạn. '}
                  {quote.reason === 'ended' && 'Kỳ đã hết nên chưa thu, tính từ lần gia hạn. '}
                  {limitLine ? `${limitLine} ` : ''}
                  {selected && isLoyaltyRow(selected) && 'Thêm xong là chương trình chạy ngay, admin không phải bật công tắc thứ hai. '}
                  Từ kỳ sau tự gia hạn cùng gói.
                </div>
              )}
              {kind === 'orders' && (
                <div className="ar-addons-note" data-testid="addon-orders-warning">
                  Đơn được đếm từ trước đến nay, không tính lại theo tháng. Shop dùng hết phần thêm rồi thì không gỡ được add-on này.
                </div>
              )}
              {quote && quote.amountDue > 0 && (
                <>
                  <div className="field">
                    <label htmlFor="ad-method">Hình thức thu</label>
                    <div className="input">
                      <select id="ad-method" value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
                        <option value="TRANSFER">Chuyển khoản</option>
                        <option value="CASH">Tiền mặt</option>
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="ad-ref">Mã giao dịch (tuỳ chọn)</label>
                    <div className="input">
                      <input id="ad-ref" value={transactionId} maxLength={200} onChange={(e) => setTransactionId(e.target.value)} />
                    </div>
                  </div>
                </>
              )}
              <div className={PHONE_FOOTER}>
                <button className="btn" type="button" onClick={() => setAdding(false)} disabled={busy}>
                  Huỷ
                </button>
                <button className="btn pri" type="button" data-testid="addon-submit" onClick={add} disabled={busy || !quote || !amountOk || unlimitedKind}>
                  {busy ? 'Đang lưu…' : `Thêm · ${formatVnd(quote?.amountDue ?? 0)}`}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!turningOff} onOpenChange={(v) => !v && setTurningOff(null)}>
          <DialogContent className={PHONE_DIALOG}>
            <DialogHeader>
              <DialogTitle>Tắt {turningOff ? itemLabel(turningOff) : ''} từ kỳ sau?</DialogTitle>
            </DialogHeader>
            <div className="ar-addons" style={{ gap: 14 }} data-testid="addon-turn-off">
              <div className="ar-addons-note">
                Shop vẫn dùng đến hết <b>{sub ? dayVn(sub.currentPeriodEnd) : '—'}</b>. Từ kỳ sau shop không dùng và không xem được;
                dữ liệu giữ nguyên, bật lại là thấy. Không hoàn tiền.
              </div>
              <div className={PHONE_FOOTER}>
                <button className="btn" type="button" onClick={() => setTurningOff(null)} disabled={busy}>
                  Huỷ
                </button>
                <button className="btn pri" type="button" onClick={() => turningOff && mark(turningOff, true)} disabled={busy}>
                  Tắt từ kỳ sau
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="note">
          <b>Giá lấy từ trang Add-on prices.</b> Admin chỉ chọn loại và gõ số lượng, không gõ tiền ở đây. Giá được ghi lại lúc mua
          và giữ đến hết kỳ đã trả. Gỡ có hiệu lực cuối kỳ, không hoàn tiền.
        </div>
      </div>
    </PageWrapper>
  );
}

/**
 * #870: amount of a bought item (packs; #782 on a unit row the typed number). More applies now and the extra is charged
 * now (the quote of the add dialog); fewer applies from the next period, no refund.
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
    if (!item.addonPriceId || !(extra > 0) || target > MAX_ADDON_PACKS) {
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

  const unchanged = !(target >= 1) || target > MAX_ADDON_PACKS || target === (item.nextPacks ?? current);
  const save = async () => {
    setSaving(true);
    try {
      const res = await addonPricesApi.setPacks(merchantId, item.id, { packs: target, method: 'TRANSFER' });
      if (res.success) {
        toastSuccess(extra > 0 ? 'Đã thêm' : extra < 0 ? 'Giảm từ kỳ sau' : 'Đã cập nhật');
        await onSaved();
      } else toastError(translateError(res));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="kv" data-testid={`addon-packs-${item.id}`}>
      <label htmlFor={`packs-${item.id}`}>{amountLabel(item)}</label>
      <span className="input" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          id={`packs-${item.id}`}
          inputMode="numeric"
          style={{ width: 96 }}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
        />
        <button className="btn" type="button" disabled={busy || saving || unchanged} onClick={save}>
          Lưu
        </button>
      </span>
      {extra > 0 && (
        <>
          <span>Thu ngay (+{amountText(item, extra)})</span>
          <span className="num">{charge ? formatVnd(charge.amountDue) : '…'}</span>
        </>
      )}
      {extra < 0 && target >= 1 && <span className="muted">Còn {amountText(item, target)} từ kỳ gia hạn sau, không hoàn tiền</span>}
    </div>
  );
}
