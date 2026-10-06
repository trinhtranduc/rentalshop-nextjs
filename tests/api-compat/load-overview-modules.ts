/**
 * Loads the Overview functions from a source tree: this checkout by default, or another checkout
 * (an older commit) when generating the golden responses. Prisma is replaced by the fake store.
 */
import path from 'path';
import type { OverviewModules } from './overview-scenarios';

export function loadOverviewModules(root = path.resolve(__dirname, '../..')): OverviewModules {
  const utils = path.join(root, 'packages/utils/src');
  const database = path.join(root, 'packages/database/src');

  jest.resetModules();
  jest.doMock('@rentalshop/utils', () => {
    const revenue = jest.requireActual(path.join(utils, 'core/revenue-calculator'));
    return {
      calculatePeriodRevenueBatch: revenue.calculatePeriodRevenueBatch,
      getOrderRevenueEvents: revenue.getOrderRevenueEvents,
      parseProductImages: () => [],
    };
  });
  // getOutletOperations reads the Prisma singleton; each call routes it to the store's prisma
  const client: { prisma: any } = { prisma: null };
  jest.doMock(path.join(database, 'client'), () => ({
    get prisma() {
      return client.prisma;
    },
  }));

  const { computeIncomePeriodSummary } = require(path.join(utils, 'analytics/income-period-summary'));
  const { buildAnalyticsPeriodReport } = require(path.join(utils, 'analytics/period-report'));
  const { getOutletOperations } = require(path.join(database, 'outlet-operations'));

  return {
    computeIncomePeriodSummary,
    buildAnalyticsPeriodReport,
    getOutletOperations: (prisma: any) => (query: any) => {
      client.prisma = prisma;
      return getOutletOperations(query);
    },
  };
}

/** Freezes `new Date()` at `now` without faking timers that promises rely on */
export function freezeClock(now: Date) {
  jest.useFakeTimers({
    now,
    doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'queueMicrotask', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'hrtime', 'performance'],
  });
}
