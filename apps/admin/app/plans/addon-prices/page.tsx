'use client';

import '../../addons.css';
import '../../forms.css';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, PageWrapper, useToast } from '@rentalshop/ui';
import { addonPricesApi } from '@rentalshop/utils';
import type { AddonPriceRow, LimitKind } from '@rentalshop/utils';
import { useAuth, useApiError } from '@rentalshop/hooks';
import { KINDS, KIND_DEFAULT_NAME, KIND_UNIT, appliesTo, formatVnd, plusLabel } from '../../components/addon-labels';

/** Dialog surface of the admin forms (#802): full screen on a phone. */
const PHONE_DIALOG = 'ar-dialog md:max-w-lg max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:w-full max-md:max-w-full max-md:rounded-none max-md:border-0 max-md:top-0 max-md:left-0 max-md:translate-x-0 max-md:translate-y-0 max-md:p-4 max-md:overflow-y-auto max-md:content-start';
const PHONE_FOOTER = 'ar-dialog-footer flex justify-end gap-2 flex-wrap';

type Draft = { name: string; limitKind: LimitKind; packSize: string; monthlyPrice: string; isActive: boolean };
const digits = (v: string) => v.replace(/[^\d]/g, '');
const grouped = (v: string) => (v === '' ? '' : new Intl.NumberFormat('vi-VN').format(Number(v)));

/**
 * Plans → Add-on prices (#850). Each row = one limit kind + pack size + VND price per pack per month.
 * ADMIN adds and edits; OPS only reads. A new price applies to new purchases and later renewals.
 */
export default function AddonPricesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN';
  const { toastSuccess, toastError } = useToast();
  const { translateError } = useApiError();
  // toast / translate change identity on every render: read them through a ref so loading runs once
  const ui = useRef({ toastError, translateError });
  ui.current = { toastError, translateError };
  const [rows, setRows] = useState<AddonPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AddonPriceRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>({ name: '', limitKind: 'users', packSize: '1', monthlyPrice: '', isActive: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await addonPricesApi.list();
      if (res.success && res.data) setRows(res.data.addonPrices || []);
      else ui.current.toastError(ui.current.translateError(res));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setDraft({ name: KIND_DEFAULT_NAME.users, limitKind: 'users', packSize: '1', monthlyPrice: '', isActive: true });
    setCreating(true);
  };
  const openEdit = (row: AddonPriceRow) => {
    setDraft({ name: row.name, limitKind: row.limitKind, packSize: String(row.packSize), monthlyPrice: String(row.monthlyPrice), isActive: row.isActive });
    setEditing(row);
  };
  const close = () => {
    setCreating(false);
    setEditing(null);
  };

  const save = async () => {
    const packSize = Number(draft.packSize);
    const monthlyPrice = Number(draft.monthlyPrice);
    if (!draft.name.trim() || !(packSize >= 1) || draft.monthlyPrice === '') {
      toastError('Nhập tên, số lượng mỗi gói và giá.');
      return;
    }
    setSaving(true);
    try {
      const res = editing
        ? await addonPricesApi.update(editing.id, {
            name: draft.name.trim(),
            monthlyPrice,
            isActive: draft.isActive,
            ...(packSize !== editing.packSize ? { packSize } : {}),
          })
        : await addonPricesApi.create({ name: draft.name.trim(), limitKind: draft.limitKind, packSize, monthlyPrice, isActive: draft.isActive });
      if (res.success) {
        toastSuccess(editing ? 'Đã lưu giá' : 'Đã thêm loại add-on');
        close();
        await load();
      } else {
        toastError(translateError(res));
      }
    } finally {
      setSaving(false);
    }
  };

  const open = creating || !!editing;
  const unit = KIND_UNIT[draft.limitKind];
  const priceChanged = editing && draft.monthlyPrice !== '' && Number(draft.monthlyPrice) !== editing.monthlyPrice;

  return (
    <PageWrapper>
      <div className="ar-addons" data-testid="addon-prices-page">
        <div className="crumb">Plans / Add-on prices</div>
        <div className="head">
          <div>
            <h1>Add-on prices</h1>
            <p>Giá mỗi gói mỗi tháng (VND). Shop mua giữa kỳ thì trả theo số ngày còn lại.</p>
          </div>
          {canEdit && (
            <button className="btn pri" type="button" onClick={openCreate}>
              + Thêm loại add-on
            </button>
          )}
        </div>

        <div className="card tbl">
          <table>
            <thead>
              <tr>
                <th>Loại add-on</th>
                <th>Cộng thêm</th>
                <th className="num">Giá / tháng</th>
                <th>Áp dụng cho gói</th>
                <th>Đang dùng</th>
                <th>Trạng thái</th>
                {canEdit && <th aria-label="Thao tác"></th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="muted">Đang tải…</td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">Chưa có loại add-on nào.</td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} data-testid={`addon-price-${row.id}`}>
                  <td>
                    <b>{row.name}</b>
                    <div className="sub2">{row.limitKind}</div>
                  </td>
                  <td>{plusLabel(row.limitKind, row.packSize)}</td>
                  <td className="num">
                    <span className="price">{formatVnd(row.monthlyPrice)}</span>{' '}
                    <span className="unit">/ {row.packSize === 1 ? KIND_UNIT[row.limitKind] : `gói ${row.packSize} ${KIND_UNIT[row.limitKind]}`}</span>
                  </td>
                  <td>{appliesTo(row.limitKind)}</td>
                  <td>{row.shopsUsing} shop</td>
                  <td>
                    <span className={`pill ${row.isActive ? 'on' : 'off'}`}>{row.isActive ? 'Đang bán' : 'Tạm tắt'}</span>
                  </td>
                  {canEdit && (
                    <td>
                      <button className="btn" type="button" onClick={() => openEdit(row)}>
                        Sửa giá
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="note">
          <b>Mỗi dòng cộng một loại giới hạn, với số lượng mỗi gói và giá riêng.</b> Cùng một loại có thể có nhiều gói, ví dụ
          1 user 30.000 ₫ và gói 2 user 40.000 ₫. Shop muốn thêm cả user lẫn chi nhánh thì mua hai dòng. &quot;Tạm tắt&quot;
          nghĩa là ngừng bán mới, shop đang dùng vẫn giữ đến hết kỳ.
        </div>
        <ul className="rules">
          <li>Đổi giá chỉ áp dụng từ lần mua hoặc gia hạn sau. Kỳ shop đã trả giữ nguyên giá cũ.</li>
          <li>Chỉ ADMIN sửa được giá. OPS chỉ xem.</li>
        </ul>

        <Dialog open={open} onOpenChange={(v) => !v && close()}>
          <DialogContent className={PHONE_DIALOG}>
            <DialogHeader>
              <DialogTitle>{editing ? `Sửa: ${editing.name}` : 'Thêm loại add-on'}</DialogTitle>
            </DialogHeader>
            <div className="ar-addons" style={{ gap: 14 }}>
              <div className="field">
                <label htmlFor="ap-name">Tên</label>
                <div className="input">
                  <input id="ap-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={100} />
                </div>
              </div>
              {!editing && (
                <div className="field">
                  <label htmlFor="ap-kind">Loại giới hạn</label>
                  <div className="input">
                    <select
                      id="ap-kind"
                      value={draft.limitKind}
                      onChange={(e) => {
                        const kind = e.target.value as LimitKind;
                        const keepName = draft.name && !Object.values(KIND_DEFAULT_NAME).includes(draft.name);
                        setDraft({ ...draft, limitKind: kind, name: keepName ? draft.name : KIND_DEFAULT_NAME[kind] });
                      }}
                    >
                      {KINDS.map((k) => (
                        <option key={k} value={k}>
                          {k} ({KIND_UNIT[k]})
                        </option>
                      ))}
                    </select>
                  </div>
                  {draft.limitKind === 'outlets' && <span className="muted">Chỉ bán cho gói nhiều chi nhánh (Enterprise).</span>}
                </div>
              )}
              <div className="field">
                <label htmlFor="ap-pack">Mỗi gói cộng thêm</label>
                <div className="input">
                  <input
                    id="ap-pack"
                    inputMode="numeric"
                    value={draft.packSize}
                    disabled={!!editing && editing.shopsUsing > 0}
                    onChange={(e) => setDraft({ ...draft, packSize: digits(e.target.value) })}
                  />
                  <span>{unit}</span>
                </div>
                {editing && editing.shopsUsing > 0 && <span className="muted">Đang có shop dùng nên không đổi được. Muốn gói khác thì thêm dòng mới.</span>}
              </div>
              <div className="field">
                <label htmlFor="ap-price">Giá mỗi gói mỗi tháng</label>
                <div className="input">
                  <input
                    id="ap-price"
                    inputMode="numeric"
                    value={grouped(draft.monthlyPrice)}
                    onChange={(e) => setDraft({ ...draft, monthlyPrice: digits(e.target.value) })}
                  />
                  <span>₫ / gói / tháng</span>
                </div>
              </div>
              <label className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44 }}>
                <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
                Đang bán (bỏ chọn = Tạm tắt: ngừng bán mới, shop đang dùng giữ đến hết kỳ)
              </label>
              {editing && (
                <div className="ar-addons-cmp">
                  <span>Giá hiện tại</span>
                  <span className="num">{formatVnd(editing.monthlyPrice)}</span>
                  <span>Giá mới</span>
                  <span className="num">
                    <b>{draft.monthlyPrice === '' ? '—' : formatVnd(Number(draft.monthlyPrice))}</b>
                  </span>
                  <span>{editing.shopsUsing} shop đang dùng</span>
                  <span className="num">{priceChanged ? `giữ ${formatVnd(editing.monthlyPrice)} đến hết kỳ đã trả` : 'không đổi'}</span>
                </div>
              )}
              <div className="ar-addons-note">Giá mới áp dụng cho lần mua và lần gia hạn sau.</div>
              <div className={PHONE_FOOTER}>
                <button className="btn" type="button" onClick={close} disabled={saving}>
                  Huỷ
                </button>
                <button className="btn pri" type="button" onClick={save} disabled={saving}>
                  {saving ? 'Đang lưu…' : editing ? 'Lưu giá' : 'Thêm'}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
}
