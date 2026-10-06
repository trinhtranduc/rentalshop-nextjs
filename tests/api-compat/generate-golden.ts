/**
 * Regenerates `golden/overview-before-492.json`: the Overview API responses of the code before
 * #492 (commit 852bd196^), for the scenarios in `overview-scenarios.ts`.
 * Not part of `yarn test` (no `.test.` in the name). Run from tests/:
 *
 *   git worktree add /tmp/before-492 852bd196^
 *   GOLDEN_ROOT=/tmp/before-492 TZ=UTC npx jest --testMatch '**' api-compat/generate-golden.ts
 */
import fs from 'fs';
import path from 'path';
import { NOW, runOverviewScenarios } from './overview-scenarios';
import { freezeClock, loadOverviewModules } from './load-overview-modules';

it('writes the golden responses', async () => {
  const root = process.env.GOLDEN_ROOT;
  if (!root) throw new Error('Set GOLDEN_ROOT to a checkout of the commit to record');
  freezeClock(NOW);
  const responses = await runOverviewScenarios(loadOverviewModules(root));
  const file = path.join(__dirname, 'golden/overview-before-492.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(responses, null, 2) + '\n');
});
