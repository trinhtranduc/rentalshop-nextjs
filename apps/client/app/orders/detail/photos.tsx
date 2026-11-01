'use client';

/**
 * #1420 condition photos: the block of the hand-over dialog (layout A), the "Ảnh khi giao" card and the warning above the
 * cards. Compression and picker as the note photos (settings.tsx). Files stay in memory until they are uploaded.
 */
import React, { useEffect, useRef, useState } from 'react';
import { compressImage } from '@rentalshop/utils';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { cardClass, type T } from '../list/parts';
import { MAX_CONDITION_PHOTOS, photoRoom } from './actions-model';
import { NOTE_IMAGE_MAX_MB, PendingThumb } from './settings';

const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ar-primary';

function usePhotoPicker(room: number, onFiles: (files: File[]) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const pick = async (files: File[]) => {
    if (room <= 0 || files.length === 0) return;
    setCompressing(true);
    try {
      onFiles(
        await Promise.all(
          files.slice(0, room).map((file) => compressImage(file, { maxSizeMB: NOTE_IMAGE_MAX_MB, maxWidthOrHeight: 1920 }).catch(() => file)),
        ),
      );
    } finally {
      setCompressing(false);
    }
  };
  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple
      className="hidden"
      data-testid="orderPhotos.input"
      onChange={(e) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        e.target.value = '';
        void pick(files);
      }}
    />
  );
  return { compressing, input, open: () => inputRef.current?.click() };
}

export function PhotoBlock({ title, files, onChange, t }: { title: string; files: File[]; onChange: (files: File[]) => void; t: T }) {
  const room = photoRoom(files.length);
  const picker = usePhotoPicker(room, (added) => onChange([...files, ...added]));
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="font-semibold text-ar-ink-2">
          {title}{' '}
          <span className="font-normal tabular-nums text-ar-muted" data-testid="orderPhotos.count">
            ({files.length}/{MAX_CONDITION_PHOTOS})
          </span>
        </span>
        <span className="ml-auto text-[13px] text-ar-muted">{t('detail.dialog.photos.optional')}</span>
      </div>
      {files.length === 0 ? (
        <button
          type="button"
          disabled={picker.compressing}
          onClick={picker.open}
          data-testid="orderPhotos.choose"
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-ar-primary-ink bg-ar-primary-soft text-[15px] font-semibold text-ar-primary-ink disabled:opacity-60 ${ring}`}
        >
          <ShellIcon d={ICONS.plus} size={18} />
          {picker.compressing ? '…' : t('detail.dialog.photos.choose')}
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {files.map((file, i) => (
            <PendingThumb
              key={`${file.name}-${file.size}-${i}`}
              file={file}
              label={t('detail.settings.removePhoto')}
              onRemove={() => onChange(files.filter((_, j) => j !== i))}
            />
          ))}
          {room > 0 && <AddTile label={t('detail.settings.addPhoto')} busy={picker.compressing} onClick={picker.open} />}
        </div>
      )}
      {picker.input}
    </div>
  );
}

function AddTile({ label, busy, onClick }: { label: string; busy: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      data-testid="orderPhotos.add"
      className={`flex h-[72px] w-[72px] flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-ar-line-strong text-center text-xs text-ar-muted hover:bg-ar-subtle disabled:opacity-60 ${ring}`}
    >
      <ShellIcon d={ICONS.plus} size={18} />
      {busy ? '…' : label}
    </button>
  );
}

function PhotoLink({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="block h-[72px] w-[72px] overflow-hidden rounded-[10px] border border-ar-line bg-ar-subtle hover:opacity-90"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-cover" />
    </a>
  );
}

function WaitingPhoto({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <span className="block h-[72px] w-[72px] overflow-hidden rounded-[10px] border border-ar-line bg-ar-subtle opacity-45" data-testid="orderPhotos.waiting">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </span>
  );
}

/** "Ảnh lúc giao" of the return dialog: read only, to compare */
export function PickupPhotosCompare({ urls, t }: { urls: string[]; t: T }) {
  if (urls.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2" data-testid="orderPhotos.compare">
      <span className="text-sm font-semibold text-ar-ink-2">
        {t('detail.dialog.photos.pickupCompare')} <span className="font-normal tabular-nums text-ar-muted">({urls.length})</span>
      </span>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <PhotoLink key={url} url={url} label={t('detail.notes.photo', { n: i + 1 })} />
        ))}
      </div>
    </div>
  );
}

/** "Ảnh khi giao": uploaded photos, those on their way (faded) and "Thêm ảnh". There is no delete: an uploaded photo stays. */
export function PickupPhotosCard({
  urls,
  waiting,
  uploading,
  addRoom,
  onAddPhotos,
  t,
}: {
  urls: string[];
  waiting: File[];
  uploading: boolean;
  addRoom: number;
  onAddPhotos: (files: File[]) => void;
  t: T;
}) {
  return (
    <section className={`${cardClass} flex flex-col gap-3 px-5 py-4`} data-testid="orderPhotos.card">
      <h2 className="m-0 text-lg font-bold text-ar-ink">{t('detail.dialog.photos.cardTitle')}</h2>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <PhotoLink key={url} url={url} label={t('detail.notes.photo', { n: i + 1 })} />
        ))}
        {waiting.map((file, i) => (
          <WaitingPhoto key={`${file.name}-${i}`} file={file} />
        ))}
        {addRoom > 0 && <AddPhotoTile room={addRoom} onFiles={onAddPhotos} t={t} />}
      </div>
      {uploading && (
        <p className="m-0 text-sm text-ar-muted" data-testid="orderPhotos.uploading">
          {t('detail.dialog.photos.uploading')}
        </p>
      )}
    </section>
  );
}

/** "Chưa tải được N ảnh · Thử lại" above the cards; a click retries */
export function PhotoUploadWarning({ count, onRetry, t }: { count: number; onRetry: () => void; t: T }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      data-testid="orderPhotos.retry"
      className={`min-h-11 w-full rounded-xl bg-ar-late-bg px-4 py-2 text-left text-sm text-ar-late ${ring}`}
    >
      <span role="alert">{t('detail.dialog.photos.uploadFailed', { count })}</span> · <span className="font-semibold text-ar-primary-ink">{t('detail.dialog.photos.retry')}</span>
    </button>
  );
}

function AddPhotoTile({ room, onFiles, t }: { room: number; onFiles: (files: File[]) => void; t: T }) {
  const picker = usePhotoPicker(room, onFiles);
  return (
    <>
      <AddTile label={t('detail.settings.addPhoto')} busy={picker.compressing} onClick={picker.open} />
      {picker.input}
    </>
  );
}
