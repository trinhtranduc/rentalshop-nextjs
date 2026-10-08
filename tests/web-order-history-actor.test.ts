/**
 * #670 — the web order "Lịch sử" card says who did each step, from GET /api/orders/{id}/changes.
 */
import { describe, expect, it } from '@jest/globals';
import {
  actorInitials,
  attachHistoryActors,
  type HistoryEntryLike,
  type HistoryEvent,
} from '../apps/client/app/orders/orders-model';

const owner = { name: 'Trinh Trần', role: 'MERCHANT' };
const lan = { name: 'Lan Anh', role: 'OUTLET_STAFF' };
const minh = { name: 'Minh Tú', role: 'OUTLET_ADMIN' };

// Newest first, as the API sends them
const entries: HistoryEntryLike[] = [
  { kind: 'ORDER_RETURNED', at: '2026-10-07T11:05:00.000Z', actor: lan },
  { kind: 'ORDER_PAYMENT', at: '2026-10-07T11:04:10.000Z', actor: lan, changes: [{ field: 'paymentCollected', to: 500000 }] },
  { kind: 'ORDER_PICKED_UP', at: '2026-10-05T01:30:00.000Z', actor: minh },
  { kind: 'ORDER_ITEMS', at: '2026-10-04T02:00:00.000Z', actor: owner },
  { kind: 'ORDER_CREATED', at: '2026-10-03T08:10:00.000Z', actor: owner },
];

const events: HistoryEvent[] = [
  { kind: 'returned', at: '2026-10-07T11:05:01.000Z' },
  { kind: 'payment', at: '2026-10-07T11:04:00.000Z', amount: 500000, refund: false },
  { kind: 'pickedUp', at: '2026-10-05T01:30:00.000Z' },
  { kind: 'created', at: '2026-10-03T08:10:00.000Z', by: 'Trinh Trần' },
];

describe('order history actors (#670)', () => {
  it('names who created, handed out, collected and took the return', () => {
    const out = attachHistoryActors(events, entries);
    expect(out.map((e) => e.actor)).toEqual([
      { name: 'Lan Anh', staff: true },
      { name: 'Lan Anh', staff: true },
      { name: 'Minh Tú', staff: true },
      { name: 'Trinh Trần', staff: false },
    ]);
  });

  it('a payment needs the same amount, direction and time to take a name', () => {
    const [refund] = attachHistoryActors([{ kind: 'payment', at: '2026-10-07T11:04:00.000Z', amount: 500000, refund: true }], entries);
    expect(refund.actor).toBeUndefined();
    const [other] = attachHistoryActors([{ kind: 'payment', at: '2026-10-07T11:04:00.000Z', amount: 300000, refund: false }], entries);
    expect(other.actor).toBeUndefined();
    const [late] = attachHistoryActors([{ kind: 'payment', at: '2026-10-07T12:30:00.000Z', amount: 500000, refund: false }], entries);
    expect(late.actor).toBeUndefined();
  });

  it('two equal payments each take their own entry', () => {
    const two: HistoryEntryLike[] = [
      { kind: 'ORDER_PAYMENT', at: '2026-10-07T11:10:00.000Z', actor: lan, changes: [{ field: 'paymentCollected', to: 100000 }] },
      { kind: 'ORDER_PAYMENT', at: '2026-10-07T11:00:00.000Z', actor: owner, changes: [{ field: 'paymentCollected', to: 100000 }] },
    ];
    const out = attachHistoryActors(
      [
        { kind: 'payment', at: '2026-10-07T11:10:05.000Z', amount: 100000, refund: false },
        { kind: 'payment', at: '2026-10-07T11:00:05.000Z', amount: 100000, refund: false },
      ],
      two
    );
    expect(out.map((e) => e.actor?.name)).toEqual(['Lan Anh', 'Trinh Trần']);
  });

  it('older orders without recorded users: no name, creator falls back to the order', () => {
    const out = attachHistoryActors(events, []);
    expect(out.slice(0, 3).every((e) => e.actor === undefined)).toBe(true);
    expect(out[3].actor).toEqual({ name: 'Trinh Trần', staff: false });
    const blank = attachHistoryActors([{ kind: 'pickedUp', at: '2026-10-05T01:30:00.000Z' }], [
      { kind: 'ORDER_PICKED_UP', at: '2026-10-05T01:30:00.000Z', actor: { name: '  ', role: 'OUTLET_STAFF' } },
    ]);
    expect(blank[0].actor).toBeUndefined();
  });

  it('initials like iOS: first and last word', () => {
    expect(actorInitials('Lan Anh')).toBe('LA');
    expect(actorInitials('Trần Văn Minh')).toBe('TM');
    expect(actorInitials('minh')).toBe('M');
    expect(actorInitials('')).toBe('?');
  });
});
