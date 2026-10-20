/**
 * #1065: Settings › Admin Info, "Embedding backfill" card sent GET /api/admin/embedding-backfill ~200 times a second.
 * `useToast()` returned new functions every render, the card's loader listed them as deps, and an effect ran the
 * loader on every new identity: setStatus → render → new loader → effect → fetch → setStatus …
 *
 * The tests project has no jsdom / React Testing Library, so the real TSX is transpiled and run on a tiny hook
 * runtime (useState / useCallback / useMemo / useRef / useEffect / useContext with React's dependency rules).
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

type Hook = { value?: unknown; deps?: unknown[]; cleanup?: unknown };

/** One mounted component: renders, runs effects whose deps changed, re-renders while state changes. */
function createRuntime(contextValue?: unknown) {
  const hooks: Hook[] = [];
  let index = 0;
  let dirty = false;
  let effects: (() => unknown)[] = [];
  const changed = (prev: unknown[] | undefined, next: unknown[] | undefined) =>
    !prev || !next || prev.length !== next.length || prev.some((v, i) => !Object.is(v, next[i]));

  const useState = (init: unknown) => {
    const k = index++;
    if (!hooks[k]) hooks[k] = { value: typeof init === 'function' ? (init as () => unknown)() : init };
    const hook = hooks[k];
    const set = (next: unknown) => {
      const value = typeof next === 'function' ? (next as (v: unknown) => unknown)(hook.value) : next;
      if (!Object.is(value, hook.value)) {
        hook.value = value;
        dirty = true;
      }
    };
    return [hook.value, set];
  };
  const useMemo = (fn: () => unknown, deps?: unknown[]) => {
    const k = index++;
    if (!hooks[k] || changed(hooks[k].deps, deps)) hooks[k] = { value: fn(), deps };
    return hooks[k].value;
  };
  const useCallback = (fn: unknown, deps?: unknown[]) => useMemo(() => fn, deps);
  const useRef = (init: unknown) => useMemo(() => ({ current: init }), []);
  // #1095: like React, a re-run (deps changed) first calls the previous run's cleanup
  const useEffect = (fn: () => unknown, deps?: unknown[]) => {
    const k = index++;
    if (!hooks[k] || changed(hooks[k].deps, deps)) {
      const previous = hooks[k]?.cleanup;
      const hook: Hook = { deps };
      hooks[k] = hook;
      effects.push(() => {
        if (typeof previous === 'function') previous();
        hook.cleanup = fn();
      });
    }
  };
  const react = {
    useState, useMemo, useCallback, useRef, useEffect,
    useLayoutEffect: useEffect,
    useContext: () => contextValue,
    createContext: () => ({ Provider: 'Provider' }),
  };

  let renders = 0;
  let tree: unknown = null;
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  /** Renders until nothing changes, at most `limit` renders (a render loop stops at the limit). */
  async function settle(render: () => unknown, limit = 60) {
    dirty = true;
    let count = 0;
    while (dirty && count < limit) {
      count++;
      dirty = false;
      index = 0;
      renders++;
      tree = render();
      const run = effects;
      effects = [];
      run.forEach((fn) => fn());
      await flush();
      await flush();
    }
    return tree;
  }
  return { react: { ...react, default: react }, settle, renders: () => renders };
}

const jsxRuntime = {
  jsx: (type: unknown, props: unknown) => ({ type, props }),
  jsxs: (type: unknown, props: unknown) => ({ type, props }),
  Fragment: 'Fragment',
};

function load<T>(file: string, modules: Record<string, unknown>): T {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2019 },
  }).outputText;
  const mod = { exports: {} as T };
  const req = (name: string) => {
    if (name in modules) return modules[name];
    throw new Error(`unexpected import ${name}`);
  };
  new Function('require', 'module', 'exports', compiled)(req, mod, mod.exports);
  return mod.exports;
}

/** Finds the element whose text children equal `label` (a translation key: t returns the key). */
function findByText(node: unknown, label: string): { props: Record<string, unknown> } | null {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findByText(child, label);
      if (hit) return hit;
    }
    return null;
  }
  const el = node as { props?: Record<string, unknown> };
  if (!el.props) return null;
  if (el.props.children === label) return el as { props: Record<string, unknown> };
  return findByText(el.props.children, label);
}

function mountCard(opts: {
  pending?: () => number;
  top?: Array<{ id: number; name: string; missingEmbedding: number }>;
  /** #1107: the jobs GET throws while this returns true */
  jobsFail?: () => boolean;
  /** #1107: the status answer has no `model` (an API from before #1095) */
  noModel?: boolean;
} = {}) {
  const runtime = createRuntime();
  const calls = { status: 0, jobs: 0, run: [] as Record<string, unknown>[], statusArgs: [] as unknown[], jobsArgs: [] as Record<string, unknown>[] };
  const status = () => ({
    products: { withImages: 3, missingEmbedding: 1, withEmbedding: 2 },
    jobs: { PENDING: opts.pending ? opts.pending() : 0, RUNNING: 0, COMPLETED: 2, FAILED: 0 },
    topMerchants: opts.top ?? [],
    ...(opts.noModel ? {} : { model: { name: 'marqo-fashionclip', hfRepo: null, collection: 'product-images-dev', reachable: true } }),
  });
  const stub = () => null;
  const { EmbeddingBackfillCard } = load<{ EmbeddingBackfillCard: () => unknown }>(
    'apps/admin/app/settings/admin/EmbeddingBackfillCard.tsx',
    {
      react: runtime.react,
      'react/jsx-runtime': jsxRuntime,
      '@rentalshop/ui': {
        Button: stub, Card: stub, CardContent: stub, CardHeader: stub, CardTitle: stub,
        // New functions every call, as useToast() did before #1065: the card must not depend on their identity
        useToast: () => ({ toastError: () => undefined, toastSuccess: () => undefined }),
      },
      // A new t every render as well
      '@rentalshop/hooks': { useSettingsTranslations: () => (key: string) => key },
      '@rentalshop/utils': {
        systemApi: {
          getEmbeddingBackfillStatus: async (merchantId?: number) => {
            calls.status++;
            calls.statusArgs.push(merchantId);
            // A fresh object every answer, like a real response
            return { success: true, data: status() };
          },
          // #1095: the jobs table of the open tab, its counts and the progress of the last run
          getEmbeddingJobs: async (query: Record<string, unknown>) => {
            calls.jobs++;
            calls.jobsArgs.push(query);
            if (opts.jobsFail?.()) throw new Error('Failed to fetch');
            return {
              success: true,
              data: {
                rows: [],
                total: 0,
                page: 1,
                limit: 50,
                counts: { PENDING: 0, RUNNING: 0, COMPLETED: 0, FAILED: 0 },
                progress: { since: '', total: 0, done: 0, running: 0, failed: 0, pending: 0, completedLast10Min: 0, etaMinutes: null },
              },
            };
          },
          runEmbeddingBackfill: async (body: { dryRun: boolean }) => {
            calls.run.push(body);
            return { success: true, data: { dryRun: body.dryRun, merchants: 1, products: 1, queued: 1, skippedAlreadyQueued: 0, skippedFailed: 0 } };
          },
        },
      },
    },
  );
  return { runtime, calls, render: () => EmbeddingBackfillCard() };
}

describe('Embedding backfill card loads its status once (#1065)', () => {
  it('fetches the status once on mount, then the page sits idle', async () => {
    const { runtime, calls, render } = mountCard();
    await runtime.settle(render);
    expect(calls.status).toBe(1);
    expect(calls.jobs).toBe(1); // #1095: and the jobs table once
    expect(runtime.renders()).toBeLessThan(10);
  });

  // #1095: a tab reads its own rows once; nothing waits, so nothing polls
  it('a tab click reads that tab once, from page 1', async () => {
    const { runtime, calls, render } = mountCard();
    let tree = await runtime.settle(render);
    const failed = findByText(tree, 'embeddingBackfill.jobFailed');
    expect(failed).toBeNull(); // the label is followed by the count, so it is not the only child
    const tabs: any[] = [];
    const walk = (n: any) => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) return n.forEach(walk);
      if (n.type === 'button' && Array.isArray(n.props?.children) && n.props.children[0] === 'embeddingBackfill.jobFailed') tabs.push(n);
      walk(n.props?.children);
    };
    walk(tree);
    expect(tabs).toHaveLength(1);
    tabs[0].props.onClick();
    tree = await runtime.settle(render);
    expect(calls.jobs).toBe(2);
    expect(calls.jobsArgs[1]).toMatchObject({ status: 'FAILED', page: 1, limit: 50 });
    expect(calls.status).toBe(1);
  });

  it('a dry-run check posts once and does not reload the status; Refresh and a real run reload it once', async () => {
    const { runtime, calls, render } = mountCard();
    let tree = await runtime.settle(render);

    const check = findByText(tree, 'embeddingBackfill.check');
    expect(check).not.toBeNull();
    (check!.props.onClick as () => void)();
    tree = await runtime.settle(render);
    expect(calls.run).toEqual([{ dryRun: true, includeFailed: false }]);
    expect(calls.status).toBe(1);

    const refresh = findByText(tree, 'embeddingBackfill.refresh');
    expect(refresh).not.toBeNull();
    (refresh!.props.onClick as () => void)();
    tree = await runtime.settle(render);
    expect(calls.status).toBe(2);
  });

  // #1087: after a model change every product with photos is queued again
  it('"Đánh index lại tất cả" dry-runs with all, then the confirm runs with all and reloads the status once', async () => {
    const { runtime, calls, render } = mountCard();
    let tree = await runtime.settle(render);

    const reindex = findByText(tree, 'embeddingBackfill.reindexAll');
    expect(reindex).not.toBeNull();
    (reindex!.props.onClick as () => void)();
    tree = await runtime.settle(render);
    expect(calls.run).toEqual([{ dryRun: true, all: true }]);
    expect(findByText(tree, 'embeddingBackfill.reindexConfirmTitle')).not.toBeNull();

    const confirm = findByText(tree, 'embeddingBackfill.confirm');
    expect(confirm).not.toBeNull();
    (confirm!.props.onClick as () => void)();
    tree = await runtime.settle(render);
    expect(calls.run).toEqual([{ dryRun: true, all: true }, { dryRun: false, all: true }]);
    expect(calls.status).toBe(2);
  });
});

// #1089: one shop at a time
describe('Embedding backfill card for one shop (#1089)', () => {
  const top = [{ id: 32, name: 'Tiệm nhà Ann', missingEmbedding: 5 }];

  it('"Chọn" on a top shop reloads the status once for that shop, then sits idle', async () => {
    const { runtime, calls, render } = mountCard({ top });
    let tree = await runtime.settle(render);
    expect(calls.statusArgs).toEqual([undefined]);
    const pick = findByText(tree, 'embeddingBackfill.shopPick');
    expect(pick).not.toBeNull();
    (pick!.props.onClick as () => void)();
    tree = await runtime.settle(render);
    expect(calls.statusArgs).toEqual([undefined, 32]);
    await runtime.settle(render);
    expect(calls.status).toBe(2);
    expect(findByText(tree, 'embeddingBackfill.reindexShop')).not.toBeNull();
  });

  it('"Đánh index lại shop này" sends merchantId and processSeconds 45, then polls every 15 s until nothing waits', async () => {
    let waiting = 3;
    const timers: Array<{ fn: () => void; ms: number; cleared: boolean }> = [];
    const realSet = global.setInterval;
    const realClear = global.clearInterval;
    (global as any).setInterval = (fn: () => void, ms: number) => {
      const t = { fn, ms, cleared: false };
      timers.push(t);
      return t;
    };
    (global as any).clearInterval = (t: { cleared: boolean }) => {
      if (t) t.cleared = true;
    };
    try {
      const { runtime, calls, render } = mountCard({ top, pending: () => waiting });
      let tree = await runtime.settle(render);
      (findByText(tree, 'embeddingBackfill.shopPick')!.props.onClick as () => void)();
      tree = await runtime.settle(render);
      (findByText(tree, 'embeddingBackfill.reindexShop')!.props.onClick as () => void)();
      tree = await runtime.settle(render);
      expect(calls.run).toEqual([{ dryRun: true, all: true, merchantId: 32 }]);
      (findByText(tree, 'embeddingBackfill.confirm')!.props.onClick as () => void)();
      tree = await runtime.settle(render);
      expect(calls.run[1]).toEqual({ dryRun: false, all: true, merchantId: 32, processSeconds: 45 });

      const live = timers.filter((t) => !t.cleared);
      expect(live).toHaveLength(1);
      expect(live[0].ms).toBe(15000);
      expect(findByText(tree, 'embeddingBackfill.shopPolling')).not.toBeNull();
      const before = calls.status;
      live[0].fn();
      tree = await runtime.settle(render);
      expect(calls.status).toBe(before + 1); // one GET per tick
      waiting = 0;
      live[0].fn();
      tree = await runtime.settle(render);
      // Nothing waits: polling turns off (React then runs the effect cleanup that clears the interval;
      // this tiny runtime has no cleanups, so the flag is what is checked)
      expect(findByText(tree, 'embeddingBackfill.shopPolling')).toBeNull();
      // #1095: the runtime now runs effect cleanups, so the interval is really cleared
      expect(live[0].cleared).toBe(true);
    } finally {
      (global as any).setInterval = realSet;
      (global as any).clearInterval = realClear;
    }
  });
});

// #1107: an API error showed an empty table and no model line, with no hint that anything failed
describe('Embedding backfill card when the API fails (#1107)', () => {
  it('a failed jobs GET shows the error with Retry; Retry is one jobs GET and the notice goes once it answers', async () => {
    let failing = true;
    const { runtime, calls, render } = mountCard({ jobsFail: () => failing });
    let tree = await runtime.settle(render);
    expect(calls.jobs).toBe(1);
    expect(findByText(tree, 'embeddingBackfill.jobsLoadFailed')).not.toBeNull();
    expect(findByText(tree, 'embeddingBackfill.emptyTab')).toBeNull();
    const retry = findByText(tree, 'embeddingBackfill.retry');
    expect(retry).not.toBeNull();
    failing = false;
    (retry!.props.onClick as () => void)();
    tree = await runtime.settle(render);
    expect(calls.jobs).toBe(2);
    expect(calls.status).toBe(1);
    expect(findByText(tree, 'embeddingBackfill.jobsLoadFailed')).toBeNull();
  });

  it('a status without `model` shows the "model unknown" line instead of nothing', async () => {
    const { runtime, render } = mountCard({ noModel: true });
    const tree = await runtime.settle(render);
    expect(findByText(tree, 'embeddingBackfill.modelUnknown')).not.toBeNull();
  });
});

describe('useToast returns stable functions (#1065)', () => {
  it('toastError / toastSuccess / removeToast keep their identity across renders', async () => {
    const context = { toasts: [], addToast: () => 'id', removeToast: () => undefined };
    const runtime = createRuntime(context);
    const { useToast } = load<{ useToast: () => Record<string, unknown> }>('packages/ui/src/components/ui/toast.tsx', {
      react: runtime.react,
      'react/jsx-runtime': jsxRuntime,
      'react-dom': { createPortal: () => null },
      'lucide-react': {},
      '../../lib/utils': { cn: (...c: string[]) => c.join(' ') },
      './button': { Button: () => null },
      './toast-policy': require('../packages/ui/src/components/ui/toast-policy'),
    });
    const seen: Record<string, unknown>[] = [];
    // Three renders of a component that only calls useToast
    for (let n = 0; n < 3; n++) {
      await runtime.settle(() => {
        seen.push(useToast());
        return null;
      });
    }
    expect(seen).toHaveLength(3);
    for (const name of ['toastSuccess', 'toastError', 'toastWarning', 'toastInfo', 'removeToast', 'error', 'success']) {
      expect(typeof seen[0][name]).toBe('function');
      expect(seen[1][name]).toBe(seen[0][name]);
      expect(seen[2][name]).toBe(seen[0][name]);
    }
  });
});
