'use client';

/**
 * Public counter screen (#908, #907 rule 12): `/kiosk/qr/<token>` shows the outlet's attendance QR without a
 * login, with the last punches of today. Reloads after `refreshAfterSec` and at Vietnam midnight (daily code).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import { attendanceApi, type AttendanceKioskResult } from '@rentalshop/utils';
import { shopToday } from '../../../hooks/shop-today';
import { timeOf } from '../../../attendance/attendance-model';

type T = (key: string, values?: Record<string, string | number>) => string;

const RETRY_MS = 30_000;

export default function KioskQrPage() {
  const t = useTranslations('attendance') as unknown as T;
  const params = useParams();
  const token = String(Array.isArray(params.token) ? params.token[0] : params.token || '');
  const [state, setState] = useState<AttendanceKioskResult | null>(null);
  const [nonce, setNonce] = useState(0);

  const load = useCallback(async () => {
    try {
      setState(await attendanceApi.kioskQr(token));
    } catch {
      setState({ ok: false, status: 0, code: 'NETWORK' });
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load, nonce]);

  // Next reload: the API's refresh interval, a retry after an error, and never later than VN midnight
  useEffect(() => {
    if (!state) return;
    const wait = state.ok ? Math.max(10, state.data.refreshAfterSec || 60) * 1000 : RETRY_MS;
    const ms = Math.min(wait, shopToday(new Date()).msToNextDay + 1000);
    const id = window.setTimeout(() => setNonce((n) => n + 1), ms);
    return () => window.clearTimeout(id);
  }, [state]);

  let body: React.ReactNode;
  if (!state) {
    body = <p className="text-lg text-white/70">{t('kiosk.loading')}</p>;
  } else if (!state.ok) {
    const msg =
      state.status === 401
        ? t('kiosk.invalid')
        : state.code === 'MODULE_NOT_ENABLED'
          ? t('kiosk.moduleOff')
          : state.code === 'ATTENDANCE_NOT_CONFIGURED'
            ? t('kiosk.notConfigured')
            : t('kiosk.failed');
    body = <p className="max-w-[520px] text-center text-xl leading-relaxed text-white/85">{msg}</p>;
  } else {
    const d = state.data;
    body = (
      <div className="grid w-full max-w-[1000px] grid-cols-1 items-center gap-7 md:grid-cols-[auto_1fr]">
        <div className="mx-auto rounded-[14px] bg-white p-3.5">
          <QRCodeSVG value={d.code} size={320} level="M" />
        </div>
        <div className="min-w-0">
          <p className="m-0 text-sm uppercase tracking-[0.08em] text-white/60">⏱ {t('kiosk.title')}</p>
          <h1 className="m-0 mt-1 text-[32px] font-bold">{d.outlet.name}</h1>
          <p className="m-0 mt-2 text-lg text-white/80">{t('kiosk.help')}</p>
          <p className="m-0 mt-1 text-sm text-white/55">{d.qrMode === 'DAILY' ? t('kiosk.daily') : t('kiosk.fixed')}</p>
          <div className="mt-[18px] flex flex-col gap-2">
            <span className="text-sm font-semibold text-white/60">{t('kiosk.recent')}</span>
            {d.recent.length === 0 ? (
              <span className="text-[15px] text-white/60">{t('kiosk.none')}</span>
            ) : (
              d.recent.slice(0, 5).map((r, i) => (
                <div key={i} className="flex justify-between rounded-[10px] bg-white/[0.08] px-3 py-2.5 text-[15px]">
                  <span>{r.name}</span>
                  <span className="tabular-nums">
                    {r.action === 'OUT' ? t('kiosk.out') : t('kiosk.in')} {timeOf(r.at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#0F172A] p-7 text-white">{body}</main>;
}
