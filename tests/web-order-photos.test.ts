/**
 * #1420 condition photos on the web: limits, the resend rule, the toast and the keys. Same rule as the phones.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from '@jest/globals';
import {
  MAX_CONDITION_PHOTOS,
  buildNoteViews,
  canAddPickupPhotos,
  decidePhotoSend,
  photoRoom,
  showPickupPhotosCard,
  uploadWarningCount,
  withoutApiErrorToast,
} from '../apps/client/app/orders/detail/actions-model';

const read = (path: string) => readFileSync(join(__dirname, '..', path), 'utf8');

describe('limits', () => {
  it('condition photos stop at 3', () => {
    expect(MAX_CONDITION_PHOTOS).toBe(3);
  });

  it('room is what is left, never negative', () => {
    expect(photoRoom(0)).toBe(3);
    expect(photoRoom(2)).toBe(1);
    expect(photoRoom(3)).toBe(0);
    expect(photoRoom(5)).toBe(0);
  });
});

describe('decidePhotoSend', () => {
  it('a lost reply is not sent again', () => {
    expect(decidePhotoSend(3, 0, 3)).toEqual({ kind: 'alreadyUploaded' });
    expect(decidePhotoSend(3, 2, 1)).toEqual({ kind: 'alreadyUploaded' });
  });

  it('nothing arrived: everything goes', () => {
    expect(decidePhotoSend(0, 0, 3)).toEqual({ kind: 'send', count: 3 });
  });

  it('a photo from another device leaves only the room', () => {
    expect(decidePhotoSend(1, 0, 3)).toEqual({ kind: 'send', count: 2 });
    expect(decidePhotoSend(3, 0, 4)).toEqual({ kind: 'noRoom' });
  });
});

describe('canAddPickupPhotos (same rule as the phones)', () => {
  it('only while the goods are out, with 1 or 2 photos and nothing waiting', () => {
    expect(canAddPickupPhotos('PICKUPED', 1, false)).toBe(true);
    expect(canAddPickupPhotos('PICKUPED', 2, false)).toBe(true);
    expect(canAddPickupPhotos('PICKUPED', 3, false)).toBe(false);
    expect(canAddPickupPhotos('PICKUPED', 1, true)).toBe(false);
    expect(canAddPickupPhotos('RESERVED', 1, false)).toBe(false);
    expect(canAddPickupPhotos('RETURNED', 1, false)).toBe(false);
  });

  it('0 photos: no tile, the card is not there', () => {
    expect(canAddPickupPhotos('PICKUPED', 0, false)).toBe(false);
  });
});

describe('showPickupPhotosCard', () => {
  it('hidden at 0 photos unless photos are on their way in this tab', () => {
    expect(showPickupPhotosCard(0, 0)).toBe(false);
    expect(showPickupPhotosCard(1, 0)).toBe(true);
    expect(showPickupPhotosCard(0, 2)).toBe(true);
  });
});

describe('uploadWarningCount', () => {
  it('names the photos only while the upload stands failed', () => {
    expect(uploadWarningCount({ files: [1, 2, 3], status: 'failed' })).toBe(3);
    expect(uploadWarningCount({ files: [1, 2, 3], status: 'uploading' })).toBeNull();
    expect(uploadWarningCount(undefined)).toBeNull();
  });
});

describe('buildNoteViews', () => {
  const labels = { notes: 'N', pickup: 'P', return: 'R', damage: 'D' };
  const order = {
    notes: 'n',
    notesImages: ['note.jpg'],
    pickupNotes: 'pickup text',
    pickupNotesImages: ['pickup.jpg'],
    returnNotes: 'return text',
    returnNotesImages: ['return.jpg'],
    damageNotes: 'damage text',
    damageNotesImages: ['damage.jpg'],
  };

  it('pickup photos are not in the notes card', () => {
    const views = buildNoteViews(order, labels);
    expect(views.flatMap((v) => v.images)).not.toContain('pickup.jpg');
  });

  it('pickup text, note, return and damage text and photos stay', () => {
    const views = Object.fromEntries(buildNoteViews(order, labels).map((v) => [v.key, v]));
    expect(views.pickup.text).toBe('pickup text');
    expect(views.pickup.images).toEqual([]);
    expect(views.notes.images).toEqual(['note.jpg']);
    expect(views.return).toMatchObject({ text: 'return text', images: ['return.jpg'] });
    expect(views.damage).toMatchObject({ text: 'damage text', images: ['damage.jpg'], danger: true });
  });

  it('an order with only pickup photos has no pickup group in the notes card', () => {
    expect(buildNoteViews({ pickupNotesImages: ['pickup.jpg'] }, labels)).toEqual([]);
  });
});

describe('withoutApiErrorToast', () => {
  const fire = (target: EventTarget, code: string) => target.dispatchEvent(Object.assign(new Event('api-error'), { detail: { code } }));

  it('hides a failed upload from the global handler, and only while it runs', async () => {
    const target = new EventTarget();
    const seen: string[] = [];
    // A browser runs a capture listener first even on a target added later (checked in headed Chrome on the order page).
    // Node's EventTarget keeps insertion order, so here the handler comes second.
    await withoutApiErrorToast(async () => {
      target.addEventListener('api-error', (e) => seen.push((e as unknown as { detail: { code: string } }).detail.code));
      fire(target, 'IMAGE_VALIDATION_FAILED');
    }, target);
    expect(seen).toEqual([]);
    fire(target, 'OTHER');
    expect(seen).toEqual(['OTHER']);
  });

  it('a subscription error still reaches it', async () => {
    const target = new EventTarget();
    const seen: string[] = [];
    target.addEventListener('api-error', (e) => seen.push((e as unknown as { detail: { code: string } }).detail.code));
    await withoutApiErrorToast(async () => fire(target, 'SUBSCRIPTION_EXPIRED'), target);
    expect(seen).toEqual(['SUBSCRIPTION_EXPIRED']);
  });

  it('removes itself when the upload throws', async () => {
    const target = new EventTarget();
    const seen: string[] = [];
    target.addEventListener('api-error', () => seen.push('x'));
    await expect(withoutApiErrorToast(async () => { throw new Error('5xx'); }, target)).rejects.toThrow('5xx');
    fire(target, 'OTHER');
    expect(seen).toEqual(['x']);
  });
});

describe('keys', () => {
  it.each(['en', 'vi', 'ja', 'ko', 'zh'])('%s has the 8 keys', (locale) => {
    const photos = JSON.parse(read(`locales/${locale}/orders.json`)).web.detail.dialog.photos;
    expect(Object.keys(photos).sort()).toEqual(['cardTitle', 'choose', 'conditionTitle', 'optional', 'pickupCompare', 'retry', 'uploadFailed', 'uploading']);
    expect(photos.uploadFailed).toContain('{count}');
  });
});

describe('no delete control, no capture at return', () => {
  it('the new card has no remove control', () => {
    const card = read('apps/client/app/orders/detail/photos.tsx');
    expect(card.slice(card.indexOf('export function PickupPhotosCard'))).not.toMatch(/removePhoto|onRemove/);
  });

  it('nothing on the order page sends return photos', () => {
    expect(read('apps/client/app/orders/[id]/page.tsx')).not.toMatch(/returnNotesImages:/);
    expect(read('apps/client/app/orders/detail/dialogs.tsx')).not.toMatch(/returnTitle/);
  });
});
