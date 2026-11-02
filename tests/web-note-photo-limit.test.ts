/**
 * #1425 note photos stop at 3 on the web. Orders holding 4 or 5 stay as they are; the API keeps accepting 5.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from '@jest/globals';
import { MAX_NOTE_IMAGES, noteCountLabel } from '../apps/client/app/orders/detail/actions-model';

const read = (path: string) => readFileSync(join(__dirname, '..', path), 'utf8');

describe('note photo limit', () => {
  it('is 3', () => {
    expect(MAX_NOTE_IMAGES).toBe(3);
  });

  it('the note editor and create order use that one constant', () => {
    for (const file of ['apps/client/app/orders/detail/settings.tsx', 'apps/client/app/orders/create/OrderEditor.tsx']) {
      const source = read(file);
      expect(source).not.toMatch(/const MAX_NOTE_IMAGES\s*=/);
      expect(source).toMatch(/MAX_NOTE_IMAGES/);
    }
  });

  it('the API limit stays 5: installed apps can still send 5', () => {
    expect(read('packages/constants/src/validation.ts')).toMatch(/MAX_ORDER_NOTE_IMAGES: 5,/);
  });
});

describe('noteCountLabel', () => {
  it('reads n/3 up to the limit', () => {
    expect(noteCountLabel(0)).toBe('0/3');
    expect(noteCountLabel(3)).toBe('3/3');
  });

  it('an old order above the limit shows only its count', () => {
    expect(noteCountLabel(5)).toBe('5');
  });
});
