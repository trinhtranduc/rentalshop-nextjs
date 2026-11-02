# Plan #1450

1. `load-route.ts`: option `realAuth` runs the real auth of the tree under test. The default stays as it is.
2. Add scenarios, generator and test. Generate from a clean checkout of `origin/main-real`, with `node_modules` linked as the generator's header says.
3. Add the LOG row.
4. Verify: `api-compat` in both time zones, full jest against base.
