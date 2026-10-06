'use client';

/**
 * The paper slip of the shop web Hoá đơn (#562). Black on white in every theme: it is what prints.
 * Its CSS is self-contained (`SLIP_CSS`) so the screen preview and the 80mm print look the same.
 * Lines come from ./receipt-model; this file only lays them out and translates labels.
 */
import React from 'react';
import type { ReceiptModel } from './receipt-model';

type Tr = (key: string, values?: Record<string, string | number>) => string;

export const SLIP_CSS = `
.rc-slip{box-sizing:border-box;width:80mm;max-width:100%;padding:6mm 5mm 8mm;background:#fff;color:#000;
  font-family:var(--font-be-vietnam),Arial,Helvetica,sans-serif;font-size:12px;line-height:1.45;
  font-variant-numeric:tabular-nums;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rc-slip *{box-sizing:border-box}
.rc-shop{text-align:center;font-size:15px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;line-height:1.3}
.rc-center{text-align:center}
.rc-soft{color:#333}
.rc-rule{border:0;border-top:1px dashed #000;margin:8px 0}
.rc-rule-solid{border-top-style:solid}
.rc-title{text-align:center;font-size:14px;font-weight:700;margin:2px 0 6px}
.rc-row{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.rc-row>span:first-child{flex:none}
.rc-row>span:last-child{text-align:right;overflow-wrap:anywhere}
.rc-strong{font-weight:700}
.rc-block{display:block}
.rc-item{margin:0 0 5px}
.rc-item-name{overflow-wrap:anywhere}
.rc-calc{text-align:right;white-space:nowrap}
.rc-note{white-space:pre-wrap;overflow-wrap:anywhere}
.rc-total{font-size:15px;font-weight:700}
.rc-sign{display:flex;justify-content:space-between;text-align:center;margin-top:4px;min-height:22mm}
.rc-sign>span{width:48%}
.rc-foot{text-align:center;margin-top:6px}
`;

export function ReceiptSlip({ model, t, collateralLabel }: { model: ReceiptModel; t: Tr; collateralLabel: (type: string | null | undefined) => string }) {
  const { shop, customer } = model;
  return (
    <div className="rc-slip" data-receipt-content>
      <div className="rc-shop">{shop.name || 'AnyRent'}</div>
      {shop.phone && (
        <div className="rc-center rc-soft">
          {t('phone')}: {shop.phone}
        </div>
      )}
      {shop.address && (
        <div className="rc-center rc-soft">
          {t('address')}: {shop.address}
        </div>
      )}
      <hr className="rc-rule" />

      <div className="rc-title">{t('order', { number: model.orderNumber })}</div>
      <div className="rc-row">
        <span>{t('customer')}</span>
        <span>
          <span className="rc-strong">{customer.name || t('walkIn')}</span>
          {customer.phone && <span className="rc-block">{customer.phone}</span>}
        </span>
      </div>
      {model.rows.map((row) => {
        let value = row.value;
        if (row.key === 'deposit' && value == null) value = t('rows.noDeposit');
        if (row.key === 'collateral') value = [collateralLabel(row.collateralType), row.value].filter(Boolean).join(' · ');
        return (
          <div key={row.key} className="rc-row">
            <span>{t(`rows.${row.key}`)}</span>
            <span>{value}</span>
          </div>
        );
      })}
      <hr className="rc-rule" />

      {model.items.map((item) => (
        <div key={item.index} className="rc-item">
          <div className="rc-item-name">
            {item.index}. {item.name}
            {item.note ? ` (${item.note})` : ''}
          </div>
          <div className="rc-calc">{item.calc}</div>
        </div>
      ))}
      {model.note && (
        <div className="rc-note">
          <span className="rc-strong">{t('note')}:</span> {model.note}
        </div>
      )}
      <hr className="rc-rule" />

      <div className="rc-row">
        <span>{t('subtotal')}</span>
        <span>{model.subtotal}</span>
      </div>
      <div className="rc-row">
        <span>{model.discountPercent != null ? t('discountPercent', { percent: model.discountPercent }) : t('discount')}</span>
        <span>{model.discount}</span>
      </div>
      {model.loyaltyDiscount && (
        <div className="rc-row">
          <span>{t('loyaltyDiscount')}</span>
          <span>{model.loyaltyDiscount}</span>
        </div>
      )}
      <hr className="rc-rule rc-rule-solid" />
      <div className="rc-row rc-total">
        <span>{t('total')}</span>
        <span>{model.total}</span>
      </div>

      {model.isRent && (
        <>
          {model.printNote && (
            <>
              <hr className="rc-rule" />
              <div className="rc-note">{model.printNote}</div>
            </>
          )}
          <hr className="rc-rule" />
          <div className="rc-sign">
            <span>{t('customerSignature')}</span>
            <span>{t('storeSignature')}</span>
          </div>
        </>
      )}

      <hr className="rc-rule" />
      <div className="rc-foot rc-strong">{t('thankYou')}</div>
      <div className="rc-foot rc-soft">{t('downloadApp')}</div>
    </div>
  );
}
