'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Printer } from 'lucide-react';
import { useOutletsTranslations, useSettingsTranslations } from '@rentalshop/hooks';
import { outletsApi } from '@rentalshop/utils';
import { Button } from '../../../ui/button';
import { useToast } from '@rentalshop/ui';

const MAX = 500;

type OutletNote = { id: number; name: string; saved: string; draft: string; saving: boolean };

/**
 * Receipt footer per outlet (Outlet.printNote, #347). The API scopes the list:
 * a merchant sees every outlet, an outlet admin only their own.
 */
export const ReceiptSection: React.FC = () => {
  const t = useSettingsTranslations();
  const to = useOutletsTranslations();
  const { toastSuccess, toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [outlets, setOutlets] = useState<OutletNote[]>([]);

  useEffect(() => {
    let alive = true;
    outletsApi
      .getOutlets()
      .then((res: any) => {
        const list = (res?.data?.outlets || res?.data || []) as Array<{ id: number; name: string; printNote?: string | null }>;
        if (alive) setOutlets(list.map((o) => ({ id: o.id, name: o.name, saved: o.printNote || '', draft: o.printNote || '', saving: false })));
      })
      .catch(() => alive && setOutlets([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const patch = (id: number, next: Partial<OutletNote>) =>
    setOutlets((prev) => prev.map((o) => (o.id === id ? { ...o, ...next } : o)));

  const save = async (o: OutletNote) => {
    patch(o.id, { saving: true });
    try {
      const res = await outletsApi.updateOutlet(o.id, { printNote: o.draft } as any);
      if (!res.success) throw new Error(res.error || '');
      patch(o.id, { saved: o.draft, saving: false });
      toastSuccess(t('messages.successTitle'), `${to('fields.printNote')} — ${o.name}`);
    } catch (error) {
      patch(o.id, { saving: false });
      toastError(t('messages.errorTitle'), error instanceof Error && error.message ? error.message : to('fields.printNote'));
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5" aria-labelledby="receipt-title">
      <h2 id="receipt-title" className="flex items-center gap-2 text-base font-semibold text-gray-900">
        <Printer className="h-4 w-4" aria-hidden="true" />
        {t('menuItems.receipt.label')}
      </h2>
      <p className="mt-1 text-sm text-gray-600">{to('fields.printNoteHint')}</p>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-500" aria-label={t('loading')} />
        </div>
      ) : (
        <ul className="mt-4 space-y-5">
          {outlets.map((o) => {
            const dirty = o.draft !== o.saved;
            const fieldId = `print-note-${o.id}`;
            return (
              <li key={o.id} className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
                <label htmlFor={fieldId} className="block text-sm font-medium text-gray-900">
                  {outlets.length > 1 ? o.name : to('fields.printNote')}
                </label>
                <textarea
                  id={fieldId}
                  rows={3}
                  maxLength={MAX}
                  value={o.draft}
                  onChange={(e) => patch(o.id, { draft: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <span className="text-xs tabular-nums text-gray-600">
                    {o.draft.length}/{MAX}
                  </span>
                  <div className="flex gap-2">
                    {dirty && (
                      <Button type="button" variant="outline" size="sm" onClick={() => patch(o.id, { draft: o.saved })} disabled={o.saving}>
                        {t('profile.cancel')}
                      </Button>
                    )}
                    <Button type="button" size="sm" onClick={() => save(o)} disabled={!dirty || o.saving}>
                      {o.saving ? t('profile.saving') : t('profile.save')}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
