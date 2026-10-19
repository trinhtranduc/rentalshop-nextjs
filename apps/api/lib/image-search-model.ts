/**
 * #1095 — which image-search model and Qdrant collection the system uses, for the admin monitor's model line.
 * The model comes from the python embedding service `/health` (#1087 `model`, `hf_repo`); the collection from
 * `QDRANT_COLLECTION_ENV` with the same rule as `packages/database/src/ml/vector-store.ts`.
 */

export type ImageSearchModelInfo = {
  name: string | null;
  hfRepo: string | null;
  collection: string | null;
  reachable: boolean;
};

const HEALTH_TIMEOUT_MS = 2000;
/** A python service from before #1087 has no `model` in /health: it runs the default CLIP model */
const DEFAULT_MODEL = 'openai';

/** Same rule as ProductVectorStore: a `product-images-*` value is the name, else production → pro, else dev */
export function resolveCollectionName(env: string | undefined): string | null {
  if (!env) return null;
  const normalized = env.replace(/_/g, '-').toLowerCase();
  if (normalized.startsWith('product-images-')) return normalized;
  return normalized === 'production' || normalized === 'prod' ? 'product-images-pro' : 'product-images-dev';
}

function pythonBaseUrl(): string {
  const url = (process.env.PYTHON_EMBEDDING_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
}

type FetchLike = (input: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

export async function getImageSearchModelInfo(fetchFn: FetchLike = fetch as unknown as FetchLike): Promise<ImageSearchModelInfo> {
  const collection = resolveCollectionName(process.env.QDRANT_COLLECTION_ENV);
  try {
    const res = await fetchFn(`${pythonBaseUrl()}/health`, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
    if (!res.ok) return { name: null, hfRepo: null, collection, reachable: false };
    const body = (await res.json()) as { model?: unknown; hf_repo?: unknown } | null;
    return {
      name: typeof body?.model === 'string' ? body.model : DEFAULT_MODEL,
      hfRepo: typeof body?.hf_repo === 'string' ? body.hf_repo : null,
      collection,
      reachable: true,
    };
  } catch {
    return { name: null, hfRepo: null, collection, reachable: false };
  }
}
