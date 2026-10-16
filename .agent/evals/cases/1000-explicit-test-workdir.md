# Root-relative edits accidentally run from tests/

Status: active · Added: 2026-10-16 · Source: #1000 agent verification

The agent repeatedly combined root-relative file edits with a tests/ workdir, producing FileNotFoundError or a test command in the wrong project. No product data changed.

## Detect

From the repository root, `test -f tests/package.json && test -f apps/client/package.json`, then `yarn --cwd tests test public-post-locales --runInBand`. Keep root-relative edits in a separate tool call with an explicit repository-root workdir.

## Pass

Both manifest checks pass and the intended suite actually runs. A later successful shell command does not hide an earlier failed edit; inspect each result.
