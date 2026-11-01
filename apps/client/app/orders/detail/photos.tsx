'use client';

/**
 * #1420 condition photos: the block of the hand-over and return dialogs (layout A) and the add tile of the notes card.
 * Compression and picker as the note photos (settings.tsx). Files stay in memory until the order changed status.
 */
import React, { useRef, useState } from 'react';
import { compressImage } from '@rentalshop/utils';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import type { T } from '../list/parts';
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

/** "Thêm ảnh" of the notes card: the photos go as soon as they are picked */
export function AddPhotoTile({ room, onFiles, t }: { room: number; onFiles: (files: File[]) => void; t: T }) {
  const picker = usePhotoPicker(room, onFiles);
  return (
    <>
      <AddTile label={t('detail.settings.addPhoto')} busy={picker.compressing} onClick={picker.open} />
      {picker.input}
    </>
  );
}
