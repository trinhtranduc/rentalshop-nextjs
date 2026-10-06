'use client';

/**
 * Collateral, fees and notes of an order (#516): a summary card and an inline editor on the shell
 * tokens. Same fields and save path as the shared OrderSettingsCard (PUT /api/orders/[id], then the
 * new note photos as multipart on the same route).
 */
import React, { useEffect, useRef, useState } from 'react';
import { compressImage } from '@rentalshop/utils';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { cardClass, outlineBtn, primaryBtn, type Money, type T } from '../list/parts';

export interface SettingsForm {
  damageFee: number;
  securityDeposit: number;
  collateralType: string;
  collateralDetails: string;
  notes: string;
  notesImages: string[];
}

export interface PendingFiles {
  notesImages?: File[];
}

const MAX_NOTE_IMAGES = 5;
const NOTE_IMAGE_MAX_MB = 0.18;

const fieldClass =
  'h-11 w-full rounded-[10px] border border-ar-line bg-ar-surface px-3 text-[15px] text-ar-ink placeholder:text-ar-faint disabled:bg-ar-surface-muted disabled:text-ar-muted';
const labelClass = 'flex flex-col gap-1.5 text-sm font-semibold text-ar-ink-2';

/** Display card in the right column. */
export function SettingsSummary({
  settings,
  collateralLabel,
  onEdit,
  t,
  to,
  money,
}: {
  settings: SettingsForm;
  collateralLabel: string;
  onEdit: () => void;
  t: T;
  to: T;
  money: Money;
}) {
  const holding = [collateralLabel, settings.collateralDetails && settings.collateralDetails !== collateralLabel ? settings.collateralDetails : '']
    .filter(Boolean)
    .join(' · ');
  const lines: Array<[string, string, string?]> = [];
  if (settings.securityDeposit > 0) lines.push([to('amount.securityDeposit'), money(settings.securityDeposit)]);
  if (holding) lines.push([to('detailSettings.holding'), holding]);
  if (settings.damageFee > 0) lines.push([to('amount.damageFee'), money(settings.damageFee), 'text-ar-danger']);
  return (
    <section className={`${cardClass} flex flex-col gap-2.5 px-5 py-4`}>
      <h2 className="m-0 mb-0.5 text-lg font-bold text-ar-ink">{to('detailSettings.title')}</h2>
      {lines.length === 0 ? (
        <p className="m-0 text-[15px] text-ar-muted">{to('detailSettings.empty')}</p>
      ) : (
        lines.map(([label, value, tone]) => (
          <div key={label} className="flex justify-between gap-3 text-[15px]">
            <span className="text-ar-ink">{label}</span>
            <span className={`min-w-0 text-right tabular-nums ${tone || 'text-ar-ink'}`}>{value}</span>
          </div>
        ))
      )}
      <button type="button" onClick={onEdit} className={`${outlineBtn} mt-1 h-9 text-sm`}>
        {t('detail.settings.edit')}
      </button>
    </section>
  );
}

function PendingThumb({ file, onRemove, label }: { file: File; onRemove: () => void; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return <Thumb url={url} onRemove={onRemove} label={label} />;
}

function Thumb({ url, onRemove, label }: { url: string | null; onRemove: () => void; label: string }) {
  return (
    <span className="relative block h-[72px] w-[72px] overflow-hidden rounded-[10px] border border-ar-line bg-ar-subtle">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        aria-label={label}
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75"
      >
        <ShellIcon d={ICONS.close} size={14} />
      </button>
    </span>
  );
}

/** Inline editor, shown in place of the notes card. */
export function SettingsEditor({
  initial,
  enabled,
  collateralOptions,
  saving,
  onSave,
  onCancel,
  t,
  to,
}: {
  initial: SettingsForm;
  enabled: { damageFee: boolean; securityDeposit: boolean; collateral: boolean };
  collateralOptions: Array<{ value: string; label: string }>;
  saving: boolean;
  onSave: (settings: SettingsForm, pending: PendingFiles) => void;
  onCancel: () => void;
  t: T;
  to: T;
}) {
  const [form, setForm] = useState<SettingsForm>(initial);
  const [pending, setPending] = useState<File[]>([]);
  const [compressing, setCompressing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const firstRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => firstRef.current?.focus(), []);

  const set = (patch: Partial<SettingsForm>) => setForm((f) => ({ ...f, ...patch }));
  const num = (raw: string) => Math.max(0, parseFloat(raw.replace(/[^\d.]/g, '')) || 0);
  const photoCount = form.notesImages.length + pending.length;

  const addFiles = async (files: File[]) => {
    const room = MAX_NOTE_IMAGES - photoCount;
    if (room <= 0 || files.length === 0) return;
    setCompressing(true);
    try {
      const compressed = await Promise.all(
        files.slice(0, room).map((file) => compressImage(file, { maxSizeMB: NOTE_IMAGE_MAX_MB, maxWidthOrHeight: 1920 }).catch(() => file)),
      );
      setPending((p) => [...p, ...compressed]);
    } finally {
      setCompressing(false);
    }
  };

  const hasCollateralOption = collateralOptions.some((o) => o.value === form.collateralType);

  return (
    <form
      className={`${cardClass} flex flex-col gap-4 px-5 py-4`}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form, pending.length ? { notesImages: pending } : {});
      }}
    >
      <h2 className="m-0 text-lg font-bold text-ar-ink">{t('detail.settings.title')}</h2>

      <label className={labelClass}>
        {t('detail.notes.general')}
        <textarea
          ref={firstRef}
          rows={3}
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder={to('messages.enterOrderNotes')}
          className={`${fieldClass} h-auto py-2.5 leading-[22px]`}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ar-ink-2">
          {t('detail.settings.photos')} <span className="font-normal text-ar-muted">({photoCount}/{MAX_NOTE_IMAGES})</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {form.notesImages.map((url) => (
            <Thumb key={url} url={url} label={t('detail.settings.removePhoto')} onRemove={() => set({ notesImages: form.notesImages.filter((u) => u !== url) })} />
          ))}
          {pending.map((file, i) => (
            <PendingThumb
              key={`${file.name}-${file.size}-${i}`}
              file={file}
              label={t('detail.settings.removePhoto')}
              onRemove={() => setPending((p) => p.filter((_, j) => j !== i))}
            />
          ))}
          {photoCount < MAX_NOTE_IMAGES && (
            <button
              type="button"
              disabled={compressing}
              onClick={() => fileRef.current?.click()}
              className="flex h-[72px] w-[72px] flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-ar-line-strong text-xs text-ar-muted hover:bg-ar-subtle disabled:opacity-60"
            >
              <ShellIcon d={ICONS.plus} size={18} />
              {compressing ? '…' : t('detail.settings.addPhoto')}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              e.target.value = '';
              void addFiles(files);
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          {to('amount.securityDeposit')}
          <input
            inputMode="decimal"
            disabled={!enabled.securityDeposit}
            value={form.securityDeposit ? String(form.securityDeposit) : ''}
            placeholder="0"
            onChange={(e) => set({ securityDeposit: num(e.target.value) })}
            className={`${fieldClass} text-right tabular-nums`}
          />
        </label>
        <label className={labelClass}>
          {to('amount.damageFee')}
          <input
            inputMode="decimal"
            disabled={!enabled.damageFee}
            value={form.damageFee ? String(form.damageFee) : ''}
            placeholder="0"
            onChange={(e) => set({ damageFee: num(e.target.value) })}
            className={`${fieldClass} text-right tabular-nums`}
          />
        </label>
        <label className={labelClass}>
          {to('amount.collateralType')}
          <select
            disabled={!enabled.collateral}
            value={hasCollateralOption ? form.collateralType : 'Other'}
            onChange={(e) => set({ collateralType: e.target.value })}
            className={`${fieldClass} cursor-pointer`}
          >
            {collateralOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          {to('amount.collateralDetails')}
          <input
            disabled={!enabled.collateral}
            value={form.collateralDetails}
            onChange={(e) => set({ collateralDetails: e.target.value })}
            placeholder={to('messages.enterCollateralDetails')}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={saving} className={outlineBtn}>
          {to('detail.cancel')}
        </button>
        <button type="submit" disabled={saving || compressing} className={primaryBtn}>
          {saving ? to('detail.saving') : to('detail.saveChanges')}
        </button>
      </div>
    </form>
  );
}
