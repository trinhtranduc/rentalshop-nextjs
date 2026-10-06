/**
 * An in-memory stand-in for the Prisma `order` table and the `db` facade, enough for the analytics
 * code paths (where filters with equals / in / not / gt / gte / lt / lte / OR / AND, orderBy, take,
 * count and aggregate). Used by the API compatibility tests: the same store feeds the code before
 * and after a change, so any difference in an existing field comes from the change itself.
 */

type Row = Record<string, any>;

const OPERATORS = new Set(['equals', 'in', 'notIn', 'not', 'gt', 'gte', 'lt', 'lte']);

function asComparable(value: any): any {
  return value instanceof Date ? value.getTime() : value;
}

function matchesField(value: any, condition: any): boolean {
  if (condition === null) return value === null || value === undefined;
  const isOperatorObject =
    typeof condition === 'object' &&
    !(condition instanceof Date) &&
    !Array.isArray(condition) &&
    Object.keys(condition).length > 0 &&
    Object.keys(condition).every((k) => OPERATORS.has(k));
  if (!isOperatorObject) {
    if (typeof condition === 'object' && !(condition instanceof Date)) {
      throw new Error(`fake-order-store: unsupported condition ${JSON.stringify(condition)}`);
    }
    return asComparable(value) === asComparable(condition);
  }
  const v = asComparable(value);
  for (const [op, raw] of Object.entries(condition)) {
    if (raw === undefined) continue;
    const c = asComparable(raw);
    switch (op) {
      case 'equals':
        if (!matchesField(value, raw)) return false;
        break;
      case 'in':
        if (!(raw as any[]).map(asComparable).includes(v)) return false;
        break;
      case 'notIn':
        if ((raw as any[]).map(asComparable).includes(v)) return false;
        break;
      case 'not':
        if (raw === null ? value === null || value === undefined : v === c) return false;
        break;
      case 'gt':
        if (value === null || value === undefined || !(v > c)) return false;
        break;
      case 'gte':
        if (value === null || value === undefined || !(v >= c)) return false;
        break;
      case 'lt':
        if (value === null || value === undefined || !(v < c)) return false;
        break;
      case 'lte':
        if (value === null || value === undefined || !(v <= c)) return false;
        break;
    }
  }
  return true;
}

export function matchesWhere(row: Row, where: any): boolean {
  if (!where) return true;
  for (const [key, condition] of Object.entries(where)) {
    if (condition === undefined) continue;
    if (key === 'OR') {
      if (!(condition as any[]).some((w) => matchesWhere(row, w))) return false;
    } else if (key === 'AND') {
      const list = Array.isArray(condition) ? condition : [condition];
      if (!list.every((w) => matchesWhere(row, w))) return false;
    } else if (key === 'NOT') {
      const list = Array.isArray(condition) ? condition : [condition];
      if (list.some((w) => matchesWhere(row, w))) return false;
    } else if (!matchesField(row[key], condition)) {
      return false;
    }
  }
  return true;
}

function sortRows(rows: Row[], orderBy: any): Row[] {
  if (!orderBy) return rows;
  const [[key, dir]] = Object.entries(orderBy) as [string, string][];
  const sign = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const x = asComparable(a[key]);
    const y = asComparable(b[key]);
    if (x === y) return a.id - b.id;
    return x > y ? sign : -sign;
  });
}

/** Rows as Prisma would return them: deep copies, so code under test cannot change the store */
function copy(rows: Row[]): Row[] {
  return rows.map((r) => {
    const out: Row = {};
    for (const [k, v] of Object.entries(r)) out[k] = v instanceof Date ? new Date(v.getTime()) : v;
    return out;
  });
}

export function createFakeOrderStore(orders: Row[]) {
  const select = (args: any = {}) => {
    const matched = sortRows(orders.filter((o) => matchesWhere(o, args.where)), args.orderBy);
    return copy(args.take ? matched.slice(0, args.take) : matched);
  };

  const prisma: any = {
    order: {
      findMany: async (args: any) => select(args),
      count: async (args: any) => select({ where: args?.where }).length,
      aggregate: async (args: any) => {
        const rows = select({ where: args?.where });
        const _sum: Row = {};
        for (const field of Object.keys(args?._sum ?? {})) {
          _sum[field] = rows.length ? rows.reduce((s, r) => s + (r[field] ?? 0), 0) : null;
        }
        return { _sum, _count: { _all: rows.length } };
      },
      groupBy: async () => [],
    },
    outlet: { findMany: async () => [] },
    orderItem: { findMany: async () => [] },
    product: { findMany: async () => [] },
  };

  const db: any = {
    orders: {
      search: async (args: any) => {
        const data = select({ where: args?.where });
        return { total: data.length, data: data.slice(0, args?.limit ?? data.length) };
      },
      getStats: async (args: any) => select({ where: args?.where }).length,
    },
    orderItems: { groupBy: async () => [] },
    products: { findById: async () => null },
    customers: { findById: async () => null },
    merchants: { findById: async () => null },
    outlets: { findById: async () => null },
  };

  return { prisma, db };
}
