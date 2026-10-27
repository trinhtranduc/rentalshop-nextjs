'use client';

/**
 * "Bảng giá theo ngày" (#1189) on the product detail page. #1249: read-only. The table is edited on the product form
 * ("Thuê theo ngày"), so there is one place to change a price and no second set of radio rows here.
 */
import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useFormatCurrency } from '@rentalshop/ui';
import { cardClass, outlineBtn, type T } from '../../orders/list/parts';
import { savedBlock, type BlockProductSource } from '../block-model';

export function BlockPricingCard({ product }: { product: BlockProductSource & { id: number } }) {
  const t = useTranslations('products.web') as unknown as T;
  const money = useFormatCurrency();
  const block = savedBlock(product);
  if (!block) return null;
  const last = block.startDay + block.tiers.length - 1;
  return (
    <section className={`${cardClass} flex flex-col gap-3 px-5 py-[18px]`} data-block-pricing-card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-lg font-bold text-ar-ink">{t('detail.block.title')}</h2>
        <Link href={`/products/${product.id}/edit`} className={outlineBtn}>
          {t('detail.block.edit')}
        </Link>
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {block.tiers.map((price, i) => (
          <li key={i} className="flex items-center justify-between border-t border-ar-subtle py-2 text-[15px] first:border-t-0">
            <span className="font-semibold text-ar-ink">{t('detail.block.dayRow', { n: block.startDay + i })}</span>
            <span className="tabular-nums text-ar-ink">{price == null ? '—' : money(price)}</span>
          </li>
        ))}
      </ul>
      <p className="m-0 text-sm text-ar-muted">
        {t('detail.block.beyond', { n: last })}:{' '}
        {block.extraMode === 'EXTRA_PER_DAY'
          ? `${t('detail.block.extraPerDay')} ${money(block.extraPrice ?? 0)}`
          : t('detail.block.holdLast')}
      </p>
    </section>
  );
}
