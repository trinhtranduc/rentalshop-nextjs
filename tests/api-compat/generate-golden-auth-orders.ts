/**
 * Regenerates `golden/auth-orders-main-real.json`: the answers of `origin/main-real` (what installed apps talk to today)
 * for the scenarios in `auth-orders-scenarios.ts`. Not part of `yarn test` (no `.test.` in the name). Run from tests/:
 *
 *   git worktree add /tmp/release-base origin/main-real
 *   ln -s "$PWD/../node_modules" /tmp/release-base/node_modules   # third-party packages for that tree
 *   GOLDEN_ROOT=/tmp/release-base TZ=UTC npx jest --testMatch '<rootDir>/api-compat/generate-golden-auth-orders.ts'
 */
import fs from 'fs';
import path from 'path';
import { NOW, runAuthOrdersScenarios } from './auth-orders-scenarios';
import { freezeClock } from './load-route';

it('writes the golden responses', async () => {
  const root = process.env.GOLDEN_ROOT;
  if (!root) throw new Error('Set GOLDEN_ROOT to a checkout of the commit to record');
  freezeClock(NOW);
  const responses = await runAuthOrdersScenarios(root);
  const file = path.join(__dirname, 'golden/auth-orders-main-real.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(responses, null, 2) + '\n');
});
