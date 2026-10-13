'use client';

/**
 * Chấm công → Mã QR & vị trí (#945): the branches in scope (an outlet admin gets its own only) with QR status and
 * radius; "Mở ›" opens the branch page. Radius is not in GET /api/attendance/settings (list), so each branch
 * reads GET /api/attendance/settings?outletId= (no API change).
 */
import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { attendanceApi } from '@rentalshop/utils';
import type { AttendanceSettings } from '@rentalshop/types';
import { locationRow } from '../attendance-model';
import { AttendanceFrame, PageHead, Pill, cardClass, smallBtn, tdClass, thClass, useLoad, type AttT, type OutletOption } from '../parts';
import { attendanceLocationHref } from './hrefs';

function Locations({ outlets }: { outlets: OutletOption[] }) {
  const t = useTranslations('attendance') as unknown as AttT;
  const ids = outlets.map((o) => o.id).join(',');
  const settings = useLoad<Record<number, AttendanceSettings>>(async () => {
    const results = await Promise.allSettled(outlets.map((o) => attendanceApi.getSettings(o.id)));
    const map: Record<number, AttendanceSettings> = {};
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value?.success && r.value.data) map[outlets[i].id] = r.value.data;
    });
    return map;
  }, [ids]);

  const qrCell = (outletId: number) => {
    const row = locationRow(settings.data?.[outletId]);
    if (row.qr === null) return <span className="text-ar-faint">—</span>;
    if (row.qr === 'none') return <Pill tone="gray">{t('outlets.noQr')}</Pill>;
    return <Pill tone="ok">{t(row.qr === 'fixed' ? 'outlets.qrFixed' : 'outlets.qrDaily')}</Pill>;
  };
  const radiusText = (outletId: number) => {
    const r = locationRow(settings.data?.[outletId]).radiusM;
    return r == null ? '—' : t('locations.radius', { radius: r });
  };

  return (
    <>
      <PageHead title={t('locations.title')} sub={t('locations.subtitle')} />
      <div className={`${cardClass} overflow-x-auto p-0`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={thClass}>{t('locations.col.outlet')}</th>
              <th className={thClass}>{t('locations.col.address')}</th>
              <th className={thClass}>{t('locations.col.qr')}</th>
              <th className={thClass}>{t('locations.col.radius')}</th>
              <th className={thClass}>
                <span className="sr-only">{t('outlets.open')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {outlets.map((o) => (
              <tr key={o.id}>
                <td className={`${tdClass} font-semibold`}>{o.name}</td>
                <td className={`${tdClass} text-ar-ink-2`}>{o.address || <span className="text-ar-faint">—</span>}</td>
                <td className={tdClass}>{qrCell(o.id)}</td>
                <td className={`${tdClass} whitespace-nowrap`}>{radiusText(o.id)}</td>
                <td className={`${tdClass} text-right`}>
                  <Link href={attendanceLocationHref(o.id)} className={smallBtn}>
                    {t('outlets.open')}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function AttendanceLocationsPage() {
  return <AttendanceFrame>{({ outlets }) => <Locations outlets={outlets} />}</AttendanceFrame>;
}
