/**
 * Regenerates `golden/subscription-login-main-real.json`: the answers of `origin/main-real` (what installed apps talk to
 * today) for the scenarios in `subscription-login-scenarios.ts` (#1459). Not part of `yarn test`. Run from tests/:
 *
 *   git worktree add /tmp/release-base origin/main-real
 *   ln -s "$PWD/../node_modules" /tmp/release-base/node_modules   # third-party packages for that tree
 *   GOLDEN_ROOT=/tmp/release-base TZ=UTC npx jest --testMatch '<rootDir>/api-compat/generate-golden-subscription-login.ts'
 */
import fs from 'fs';
import path from 'path';
import { NOW, runSubscriptionLoginScenarios } from './subscription-login-scenarios';
import { freezeClock } from './load-route';

it('writes the golden responses', async () => {
  const root = process.env.GOLDEN_ROOT;
  if (!root) throw new Error('Set GOLDEN_ROOT to a checkout of the commit to record');
  freezeClock(NOW);
  const responses = await runSubscriptionLoginScenarios(root);
  const file = path.join(__dirname, 'golden/subscription-login-main-real.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(responses, null, 2) + '\n');
});
