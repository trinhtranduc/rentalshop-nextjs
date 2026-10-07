/**
 * Regenerates `golden/income-daily-main-real.json`: the GET /api/analytics/income/daily responses of `origin/main-real`
 * (what installed apps talk to today), for the scenarios in `income-scenarios.ts`.
 * Not part of `yarn test` (no `.test.` in the name). Run from tests/:
 *
 *   git worktree add /tmp/release-base origin/main-real
 *   ln -s "$PWD/../node_modules" /tmp/release-base/node_modules   # third-party packages for that tree
 *   GOLDEN_ROOT=/tmp/release-base TZ=UTC npx jest --testMatch '<rootDir>/api-compat/generate-golden-income-daily.ts'
 */
import fs from 'fs';
import path from 'path';
import { NOW, runDailyScenarios } from './income-scenarios';
import { freezeClock } from './load-route';

it('writes the golden responses', async () => {
  const root = process.env.GOLDEN_ROOT;
  if (!root) throw new Error('Set GOLDEN_ROOT to a checkout of the commit to record');
  freezeClock(NOW);
  const responses = await runDailyScenarios(root);
  const file = path.join(__dirname, 'golden/income-daily-main-real.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(responses, null, 2) + '\n');
});
