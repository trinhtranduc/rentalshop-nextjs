'use client';

/**
 * Máy in settings of this browser (#623). Reads after mount (no SSR mismatch), saves at once, and
 * keeps every open screen (and other tabs) on the same values.
 */
import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PRINT_SETTINGS, PRINT_SETTINGS_KEY, readPrintSettings, writePrintSettings, type PrintSettings } from '../../lib/print-settings';

const EVENT = 'anyrent-print-settings';

export function usePrintSettings(): [PrintSettings, (next: PrintSettings) => void] {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);
  useEffect(() => {
    const sync = () => setSettings(readPrintSettings());
    const onStorage = (e: StorageEvent) => {
      if (e.key === PRINT_SETTINGS_KEY) sync();
    };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  const save = useCallback((next: PrintSettings) => {
    setSettings(next);
    // Storage blocked: keep the choice for this screen only (other screens read the defaults).
    if (writePrintSettings(next)) window.dispatchEvent(new Event(EVENT));
  }, []);
  return [settings, save];
}
