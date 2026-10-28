'use client';

/**
 * The carts of the create-order page (#1293): the list, the one in use, and the saved copy in localStorage
 * (`anyrent.draftCarts.<userId>`, like the apps). Editing an order uses one cart and never touches storage.
 * State is kept in a ref as well, so a move made right after another (add, then fill) sees the first.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  activeOf,
  addCart,
  initialState,
  patchCart,
  removeCart,
  restore,
  serialize,
  storageKey,
  switchCart,
  canAddCart,
  type CartsState,
  type DraftCart,
} from './cart-store';

type Patch = Partial<DraftCart> | ((cart: DraftCart) => Partial<DraftCart>);

const read = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, text: string | null) => {
  try {
    if (text == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, text);
  } catch {
    // private window or full storage: the carts just stay in the page
  }
};

export function useDraftCarts({ persist, userId, first }: { persist: boolean; userId: number | null; first?: DraftCart }) {
  const [state, setState] = useState<CartsState>(() => initialState(first));
  const ref = useRef(state);
  // Saved carts are read once the user is known; until then nothing is written over them
  const [loaded, setLoaded] = useState(!persist);
  const loadedFor = useRef<number | null>(null);

  const commit = useCallback((next: CartsState) => {
    ref.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    if (!persist || !userId || loadedFor.current === userId) return;
    loadedFor.current = userId;
    const saved = restore(read(storageKey(userId)));
    if (saved) {
      // Keep the outlet the page already picked for a cart that was saved without one
      commit(saved);
    }
    setLoaded(true);
  }, [persist, userId, commit]);

  useEffect(() => {
    if (!persist || !userId || !loaded) return;
    write(storageKey(userId), serialize(state));
  }, [persist, userId, loaded, state]);

  const patch = useCallback(
    (id: string, p: Patch) => {
      const cart = ref.current.carts.find((c) => c.id === id);
      if (!cart) return;
      commit(patchCart(ref.current, id, typeof p === 'function' ? p(cart) : p));
    },
    [commit],
  );
  const patchActive = useCallback((p: Patch) => patch(ref.current.activeId, p), [patch]);

  /** Opens a new cart and returns its id; null at the limit. */
  const add = useCallback(
    (init: Partial<DraftCart> = {}): string | null => {
      const next = addCart(ref.current, init);
      if (next === ref.current) return null;
      commit(next);
      return next.activeId;
    },
    [commit],
  );
  const switchTo = useCallback((id: string) => commit(switchCart(ref.current, id)), [commit]);
  const remove = useCallback((id: string) => commit(removeCart(ref.current, id)), [commit]);

  return {
    carts: state.carts,
    active: activeOf(state),
    loaded,
    canAdd: canAddCart(state),
    getActiveId: () => ref.current.activeId,
    patch,
    patchActive,
    add,
    switchTo,
    remove,
  };
}
