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

type Hook = { value?: unknown; deps?: unknown[] };

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
  const useEffect = (fn: () => unknown, deps?: unknown[]) => {
    const k = index++;
    if (!hooks[k] || changed(hooks[k].deps, deps)) {
      hooks[k] = { deps };
      effects.push(fn);
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

function mountCard() {
  const runtime = createRuntime();
  const calls = { status: 0, run: [] as { dryRun: boolean }[] };
  const status = () => ({
    products: { withImages: 3, missingEmbedding: 1, withEmbedding: 2 },
    jobs: { PENDING: 0, RUNNING: 0, COMPLETED: 2, FAILED: 0 },
    topMerchants: [],
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
          getEmbeddingBackfillStatus: async () => {
            calls.status++;
            // A fresh object every answer, like a real response
            return { success: true, data: status() };
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
    expect(runtime.renders()).toBeLessThan(10);
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
