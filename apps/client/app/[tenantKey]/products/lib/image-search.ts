/**
 * #1128 — "Tìm bằng ảnh" on the public shop page: pure helpers for the panel (thin component).
 */
import type { PublicImageSearchResult } from '@rentalshop/utils';

/** The long edge after downscaling in the browser, before upload (the model reads 224 px anyway) */
export const IMAGE_SEARCH_MAX_EDGE = 1024;
/** What the page accepts from the picker before downscaling (the API takes ≤ 5 MB after it) */
export const IMAGE_SEARCH_MAX_PICK_BYTES = 15 * 1024 * 1024;

export function canSearchByImage(shop: { tenantKey?: string | null; imageSearchAvailable?: boolean | null }): boolean {
  return Boolean(shop.tenantKey && shop.imageSearchAvailable === true);
}

/** null when the picked file can be used, else the message key */
export function checkPickedImage(file: { type?: string; size: number }): 'invalidImage' | 'tooLarge' | null {
  if (!String(file.type || '').toLowerCase().startsWith('image/')) return 'invalidImage';
  if (file.size > IMAGE_SEARCH_MAX_PICK_BYTES) return 'tooLarge';
  return null;
}

export function downscaleSize(width: number, height: number, maxEdge: number = IMAGE_SEARCH_MAX_EDGE) {
  const edge = Math.max(width, height);
  if (edge <= maxEdge) return { width, height };
  const scale = maxEdge / edge;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function similarityPercent(similarity: number): number {
  return Math.round(Math.min(1, Math.max(0, similarity)) * 100);
}

export function imageSearchErrorKey(code: string): string {
  switch (code) {
    case 'IMAGE_SEARCH_RATE_LIMITED':
      return 'errorRateLimited';
    case 'SEARCH_TIMEOUT':
    case 'SEARCH_FAILED':
      return 'errorBusy';
    case 'IMAGE_VALIDATION_FAILED':
    case 'NO_IMAGE_FILE':
      return 'invalidImage';
    case 'NETWORK_ERROR':
      return 'errorNetwork';
    default:
      return 'errorGeneric';
  }
}

export type ImageSearchView =
  | { kind: 'idle' }
  | { kind: 'results'; products: NonNullable<PublicImageSearchResult['data']>['products'] }
  | { kind: 'empty' }
  | { kind: 'error'; messageKey: string };

export function imageSearchView(result: PublicImageSearchResult | null): ImageSearchView {
  if (!result) return { kind: 'idle' };
  if (!result.success) return { kind: 'error', messageKey: imageSearchErrorKey(result.code) };
  const products = result.data?.products ?? [];
  return products.length ? { kind: 'results', products } : { kind: 'empty' };
}

/** Browser only: the picked photo as a JPEG whose long edge is at most IMAGE_SEARCH_MAX_EDGE */
export async function downscaleForSearch(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = downscaleSize(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob ?? file;
  } catch {
    // Formats the browser cannot decode (e.g. HEIC on desktop Chrome) go as they are; the API checks the type
    return file;
  }
}
