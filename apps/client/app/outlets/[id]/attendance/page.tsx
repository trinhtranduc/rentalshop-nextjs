'use client';

/**
 * Chi nhánh → Mở › → ⏱ Chấm công (#908, #907 rules 7–11): the outlet's location and radius (shop owner),
 * QR code (daily / fixed, print A5, new code) and the counter (kiosk) link. Name, address and phone are read only.
 */
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@rentalshop/ui';
import { attendanceApi, outletsApi } from '@rentalshop/utils';
import type { AttendanceQrMode, AttendanceSettings } from '@rentalshop/types';
import { canUseAttendanceWeb, dayOf, shortDate, shortDayLabel, todayKey } from '../../../attendance/attendance-model';
import {
  Dialog,
  DialogFooter,
  Note,
  cardClass,
  container,
  inputClass,
  must,
  outlineBtn,
  primaryBtn,
  useAttendanceAccess,
  useBusy,
  useLoad,
  weekdayLabels,
  type AttT,
} from '../../../attendance/parts';
import OutletMap, { type LatLng } from '../../../attendance/OutletMap';
import { outletAddress, type OutletLike } from '../../outlets-model';

type DialogKind = 'save' | 'print' | 'kiosk' | 'newCode' | null;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** A5 sheet in a new window: outlet name, the code and the help line. */
function printSheet(svg: string, title: string, outlet: string, help: string, valid: string) {
  const w = window.open('', '_blank', 'width=640,height=900');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} · ${esc(outlet)}</title>
<style>@page{size:A5;margin:12mm}body{font-family:system-ui,-apple-system,sans-serif;text-align:center;color:#0F172A;margin:0}
h1{font-size:30px;margin:6mm 0 1mm}h2{font-size:20px;font-weight:600;margin:0 0 6mm}.qr svg{width:105mm;height:105mm}
p{font-size:16px;margin:5mm 0 0}small{display:block;margin-top:3mm;font-size:13px;color:#475569}</style></head>
<body><h1>⏱ ${esc(title)}</h1><h2>${esc(outlet)}</h2><div class="qr">${svg}</div><p>${esc(help)}</p>${valid ? `<small>${esc(valid)}</small>` : ''}
<script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}

export default function OutletAttendancePage() {
  const t = useTranslations('attendance') as unknown as AttT;
  const { toastSuccess, toastError } = useToast();
  const params = useParams();
  const outletId = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const access = useAttendanceAccess();
  const labels = weekdayLabels(t);
  const today = todayKey();
  const { busy, run } = useBusy();
  const qrRef = useRef<HTMLDivElement>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [draft, setDraft] = useState<{ point: LatLng | null; radius: number }>({ point: null, radius: 100 });
  const [picking, setPicking] = useState(false);

  const enabled = access.allowed && outletId > 0;
  // There is no GET /api/outlets/:id: read the outlet from the caller's list (scoped by the API)
  const merchantId = access.user?.merchant?.id || access.user?.merchantId;
  const outlet = useLoad<OutletLike>(
    enabled && merchantId
      ? async () => {
          const data = await must(outletsApi.getOutlets({ merchantId: Number(merchantId), limit: 100 }));
          const found = ((data as unknown as { outlets?: OutletLike[] }).outlets || []).find((o) => Number(o.id) === outletId);
          if (!found) throw new Error('outlet not found');
          return found;
        }
      : null,
    [enabled, merchantId, outletId],
  );
  const settings = useLoad<AttendanceSettings>(enabled ? () => must(attendanceApi.getSettings(outletId)) : null, [enabled, outletId]);
  const s = settings.data;
  const saved: LatLng | null = s && s.latitude != null && s.longitude != null ? { lat: s.latitude, lng: s.longitude } : null;
  useEffect(() => {
    if (s) setDraft({ point: s.latitude != null && s.longitude != null ? { lat: s.latitude, lng: s.longitude } : null, radius: s.radiusM || 100 });
  }, [s]);

  const owner = access.owner;
  const radiusChanged = !!s && draft.radius !== s.radiusM;
  const pointChanged = !!draft.point && (!saved || draft.point.lat !== saved.lat || draft.point.lng !== saved.lng);
  const dirty = radiusChanged || pointChanged;
  const name = outlet.data?.name || '';
  const coords = (p: LatLng | null) => (p ? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}` : t('outlet.noLocation'));
  const kioskUrl = s?.kioskToken && typeof window !== 'undefined' ? `${window.location.origin}/kiosk/qr/${s.kioskToken}` : '';
  const qrDate = s?.qr?.validDate || today;

  const takeCurrent = () => {
    if (!navigator.geolocation) {
      toastError(t('outlet.geoFailed'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPicking(false);
        setDraft((d) => ({ ...d, point: { lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) } }));
      },
      () => toastError(t('outlet.geoFailed')),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const saveLocation = () =>
    run(async () => {
      await must(
        attendanceApi.updateSettings({
          outletId,
          ...(pointChanged && draft.point ? { latitude: draft.point.lat, longitude: draft.point.lng } : {}),
          ...(radiusChanged ? { radiusM: draft.radius } : {}),
        }),
      );
      toastSuccess(t('outlet.saved'));
      setDialog(null);
      settings.reload();
    });

  const setMode = (qrMode: AttendanceQrMode) =>
    run(async () => {
      await must(attendanceApi.updateSettings({ outletId, qrMode }));
      toastSuccess(t('outlet.modeSaved'));
      settings.reload();
    });

  const newQr = (first: boolean) =>
    run(async () => {
      await must(attendanceApi.newQr(outletId));
      toastSuccess(t(first ? 'outlet.qrCreated' : 'newCode.done'));
      setDialog(null);
      settings.reload();
    });

  const newLink = () =>
    run(async () => {
      await must(attendanceApi.newKioskLink(outletId));
      toastSuccess(t('kioskLink.created'));
      settings.reload();
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(kioskUrl);
      toastSuccess(t('kioskLink.copied'));
      setDialog(null);
    } catch {
      toastError(t('kioskLink.copyFailed'));
    }
  };

  const print = () => {
    const svg = qrRef.current?.querySelector('svg')?.outerHTML;
    if (!svg) return;
    printSheet(svg, t('title'), name, t('print.howTo'), s?.qrMode === 'DAILY' ? t('print.validOn', { date: shortDate(qrDate) }) : '');
    setDialog(null);
  };

  if (!access.ready) return <div className={container}>{t('common.loading')}</div>;
  if (!canUseAttendanceWeb(access.role) || !access.allowed) {
    return (
      <div className={container}>
        <p className={`${cardClass} m-0 px-5 py-6 text-ar-muted`}>{!canUseAttendanceWeb(access.role) ? t('common.noAccess') : t('common.notAvailable')}</p>
      </div>
    );
  }

  const mapCenter = draft.point;

  return (
    <div className={container}>
      <Link href="/outlets" className="text-[13px] font-semibold text-ar-primary no-underline">
        {t('outlet.back')}
      </Link>
      {outlet.error || settings.error ? (
        <p className={`${cardClass} m-0 px-5 py-6 text-ar-muted`}>{t('outlet.notFound')}</p>
      ) : !outlet.data || !s ? (
        <p className="m-0 text-ar-muted">{t('common.loading')}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="m-0 text-[22px] font-bold">{name}</h1>
              <p className="m-0 mt-1 text-sm text-ar-muted">
                {outletAddress(outlet.data) && <>📍 {outletAddress(outlet.data)}</>}
                {outlet.data.phone && <> · ☎ {outlet.data.phone}</>}
              </p>
            </div>
            {owner && (
              <button type="button" className={primaryBtn} disabled={!dirty || busy} onClick={() => setDialog('save')}>
                {t('common.save')}
              </button>
            )}
          </div>
          <h2 className="m-0 mt-1.5 text-[17px] font-bold">{t('outlet.section')}</h2>

          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            <section className={`${cardClass} flex min-w-0 flex-col gap-3 p-3.5`}>
              <span className="font-semibold">{t('outlet.location')}</span>
              <OutletMap
                center={mapCenter}
                radiusM={draft.radius}
                picking={picking}
                onPick={(p) => {
                  setDraft((d) => ({ ...d, point: { lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) } }));
                  setPicking(false);
                }}
                label={t('outlet.location')}
              />
              <div className={`${inputClass} flex h-auto items-center py-2`}>
                <span className="font-mono text-xs">{coords(draft.point)}</span>
              </div>
              {owner ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={outlineBtn} onClick={takeCurrent}>
                      {t('outlet.current')}
                    </button>
                    <button type="button" className={`${outlineBtn} ${picking ? 'border-ar-primary text-ar-primary' : ''}`} aria-pressed={picking} onClick={() => setPicking((v) => !v)}>
                      {t('outlet.pick')}
                    </button>
                  </div>
                  {picking && <p className="m-0 text-[13px] text-ar-primary">{t('outlet.picking')}</p>}
                </>
              ) : (
                <p className="m-0 text-[13px] text-ar-muted">{t('outlet.ownerOnly')}</p>
              )}
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-ar-ink-2">
                <span>
                  {t('outlet.radius')} <b>{draft.radius} m</b>
                </span>
                <input
                  type="range"
                  min={50}
                  max={500}
                  step={10}
                  value={draft.radius}
                  disabled={!owner}
                  onChange={(e) => setDraft((d) => ({ ...d, radius: Number(e.target.value) }))}
                />
                <small className="font-normal text-ar-muted">{t('outlet.radiusHint')}</small>
              </label>
              <Note>{t('outlet.checks')}</Note>
            </section>

            <section className={`${cardClass} flex min-w-0 flex-col gap-3 p-3.5`}>
              <span className="font-semibold">{t('outlet.qrTitle', { name })}</span>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-ar-ink-2">
                {t('outlet.qrMode')}
                <select className={inputClass} value={s.qrMode} disabled={busy} onChange={(e) => setMode(e.target.value as AttendanceQrMode)}>
                  <option value="DAILY">{t('outlet.daily')}</option>
                  <option value="FIXED">{t('outlet.fixed')}</option>
                </select>
                <small className="font-normal text-ar-muted">{s.qrMode === 'DAILY' ? t('outlet.dailyHint') : t('outlet.fixedHint')}</small>
              </label>
              {s.qr?.generated && s.qr.code ? (
                <>
                  <div className="flex flex-wrap items-center gap-3.5">
                    <div ref={qrRef} className="rounded-xl border border-ar-line bg-white p-2.5">
                      <QRCodeSVG value={s.qr.code} size={180} level="M" />
                    </div>
                    <small className="max-w-[220px] text-ar-muted">
                      {s.qrMode === 'DAILY'
                        ? t('outlet.todayCaption', { date: `${shortDayLabel(qrDate, labels)}/${qrDate.slice(2, 4)}` })
                        : t('outlet.fixedCaption', { date: s.qr.createdAt ? shortDate(dayOf(s.qr.createdAt)) : '' })}
                    </small>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={primaryBtn} onClick={() => setDialog('print')}>
                      {t('outlet.print')}
                    </button>
                    <button type="button" className={outlineBtn} onClick={() => setDialog('kiosk')}>
                      {t('outlet.kiosk')}
                    </button>
                    <button type="button" className={`${outlineBtn} text-ar-danger`} onClick={() => setDialog('newCode')}>
                      {t('outlet.newCode')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Note>
                    <span className="block py-3 text-center">{t('outlet.noQr')}</span>
                  </Note>
                  <button type="button" className={`${primaryBtn} self-start`} disabled={busy} onClick={() => newQr(true)}>
                    {t('outlet.createQr')}
                  </button>
                </>
              )}
            </section>
          </div>

          <Dialog
            open={dialog === 'save'}
            title={radiusChanged ? t('outlet.saveRadiusTitle') : t('outlet.saveLocationTitle')}
            sub={radiusChanged ? t('outlet.saveRadiusSub', { from: s.radiusM, to: draft.radius }) : t('outlet.saveLocationSub', { coords: coords(draft.point) })}
            onClose={() => setDialog(null)}
            footer={<DialogFooter onCancel={() => setDialog(null)} onOk={saveLocation} okLabel={t('common.save')} busy={busy} />}
          >
            {radiusChanged && pointChanged && <p className="m-0 text-[13px] text-ar-muted">{t('outlet.saveLocationSub', { coords: coords(draft.point) })}</p>}
            <Note>{t('outlet.saveNote')}</Note>
          </Dialog>

          <Dialog
            open={dialog === 'print'}
            title={t('print.title', { name })}
            onClose={() => setDialog(null)}
            footer={<DialogFooter onCancel={() => setDialog(null)} onOk={print} okLabel={t('print.confirm')} />}
          >
            <div className="flex items-center gap-4">
              {s.qr?.code && (
                <div className="flex-none rounded-[10px] border border-ar-line bg-white p-2">
                  <QRCodeSVG value={s.qr.code} size={140} level="M" />
                </div>
              )}
              <p className="m-0 text-[13px] text-ar-muted">
                {t('print.body')}
                {s.qrMode === 'DAILY' && (
                  <>
                    <br />
                    <br />
                    {t('print.dailyNote', { date: shortDate(qrDate) })}
                  </>
                )}
              </p>
            </div>
          </Dialog>

          <Dialog
            open={dialog === 'kiosk'}
            title={t('kioskLink.title')}
            onClose={() => setDialog(null)}
            footer={
              kioskUrl ? (
                <DialogFooter
                  onCancel={() => setDialog(null)}
                  onOk={copy}
                  okLabel={t('kioskLink.copy')}
                  busy={busy}
                  extra={
                    <button type="button" className={outlineBtn} disabled={busy} onClick={newLink}>
                      {t('kioskLink.newLink')}
                    </button>
                  }
                />
              ) : (
                <DialogFooter onCancel={() => setDialog(null)} onOk={newLink} okLabel={t('kioskLink.create')} busy={busy} />
              )
            }
          >
            {kioskUrl ? (
              <div className={`${inputClass} h-auto break-all py-2 font-mono text-xs`}>{kioskUrl}</div>
            ) : (
              <p className="m-0 text-[13px] text-ar-muted">{t('kioskLink.none')}</p>
            )}
            <Note>{t('kioskLink.note')}</Note>
          </Dialog>

          <Dialog
            open={dialog === 'newCode'}
            title={t('newCode.title')}
            onClose={() => setDialog(null)}
            footer={<DialogFooter onCancel={() => setDialog(null)} onOk={() => newQr(false)} okLabel={t('newCode.confirm')} busy={busy} />}
          >
            <Note tone="w">{t('newCode.body')}</Note>
          </Dialog>
        </>
      )}
    </div>
  );
}
