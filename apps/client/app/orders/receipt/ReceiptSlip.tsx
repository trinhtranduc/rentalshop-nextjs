'use client';

/**
 * The paper slip of the shop web Hoá đơn (#562). Black on white in every theme: it is what prints.
 * Its CSS is self-contained (`SLIP_CSS`, plus `SLIP_58_CSS` on 58mm paper) so the screen preview and the print look the same.
 * Lines come from ./receipt-model; this file only lays them out and translates labels.
 */
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { ReceiptModel } from './receipt-model';
import { billQrSizeMm, type BillBankBlock } from './bank-qr-model';

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
.rc-bank{text-align:center}
.rc-bank-acc{font-size:14px;font-weight:700;letter-spacing:.02em}
.rc-qr{display:block;width:32mm;height:32mm;margin:6px auto 0;background:#fff}
`;

/** 58mm paper (#623, Cài đặt → Máy in): narrower slip, 3mm sides, smaller text. 80mm keeps SLIP_CSS alone. */
export const SLIP_58_CSS = `
.rc-slip.rc-58{width:58mm;padding:6mm 3mm 8mm;font-size:11px}
.rc-58 .rc-shop{font-size:13px}
.rc-58 .rc-title,.rc-58 .rc-total{font-size:13px}
.rc-58 .rc-bank-acc{font-size:12px}
.rc-58 .rc-qr{width:28mm;height:28mm}
`;

export function ReceiptSlip({
  model,
  t,
  collateralLabel,
  width = 80,
  bank = null,
}: {
  model: ReceiptModel;
  t: Tr;
  collateralLabel: (type: string | null | undefined) => string;
  /** Paper width in mm (80 or 58). */
  width?: 80 | 58;
  /** Bank account + VietQR of the outlet (#628), when its `printBankQr` is on and it has a default account. */
  bank?: BillBankBlock | null;
}) {
  const { shop, customer } = model;
  return (
    <div className={width === 58 ? 'rc-slip rc-58' : 'rc-slip'} data-receipt-content>
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

      {bank && (
        <>
          <hr className="rc-rule" />
          <div className="rc-bank" data-bill-bank>
            <div className="rc-strong">{t('bankTitle')}</div>
            {bank.bankName && (
              <div>
                {t('bankName')}: {bank.bankName}
              </div>
            )}
            <div className="rc-bank-acc">
              {t('bankAccount')}: {bank.accountNumber}
            </div>
            {bank.holder && (
              <div>
                {t('bankHolder')}: {bank.holder}
              </div>
            )}
            {bank.qr && (
              <QRCodeSVG
                value={bank.qr}
                level="M"
                size={billQrSizeMm(width) * 4}
                bgColor="#ffffff"
                fgColor="#000000"
                className="rc-qr"
                role="img"
                aria-label={t('bankTitle')}
              />
            )}
          </div>
        </>
      )}

      <hr className="rc-rule" />
      <div className="rc-foot rc-strong">{t('thankYou')}</div>
      <div className="rc-foot rc-soft">{t('downloadApp')}</div>
    </div>
  );
}
