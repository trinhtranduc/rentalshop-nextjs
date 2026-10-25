/**
 * Regenerates `golden/revenue-mapping-dev.json`: responses and Prisma `where`s of the revenue routes on the commit
 * BEFORE the mapper consolidation (issue #1199, `origin/dev` 37b3d6f48). Not part of `yarn test`. Run from tests/:
 *
 *   GOLDEN_ROOT=<checkout of that commit> TZ=UTC npx jest --testMatch '<rootDir>/api-compat/generate-golden-revenue-mapping.ts'
 */
import fs from 'fs';
import path from 'path';
import { NOW, runRevenueMappingScenarios } from './revenue-mapping-scenarios';
import { freezeClock } from './load-route';

it('writes the golden responses', async () => {
  const root = process.env.GOLDEN_ROOT;
  if (!root) throw new Error('Set GOLDEN_ROOT to a checkout of the commit to record');
  freezeClock(NOW);
  const responses = await runRevenueMappingScenarios(root);
  const file = path.join(__dirname, 'golden/revenue-mapping-dev.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(responses, null, 2) + '\n');
});
