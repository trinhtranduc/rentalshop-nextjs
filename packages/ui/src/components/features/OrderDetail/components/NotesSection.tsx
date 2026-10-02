import React from 'react';
import { FileText } from 'lucide-react';
import { useOrderTranslations } from '@rentalshop/hooks';
import { formatCurrency } from '@rentalshop/utils';

/** Order shape needed for notes + images (OrderWithDetails or OrderData) */
interface NotesSectionOrder {
  notes?: string;
  notesImages?: string[];
  pickupNotes?: string;
  pickupNotesImages?: string[];
  returnNotes?: string;
  returnNotesImages?: string[];
  damageNotes?: string;
  damageNotesImages?: string[];
  bailAmount?: number;
  material?: string;
  damageFee?: number;
}

interface NotesSectionProps {
  order: NotesSectionOrder;
}

const imagesToArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];



/** All notes in one card: one labelled line each (general, pickup, return, damage), with the general note's photos. */
export const NotesSection: React.FC<NotesSectionProps> = ({ order }) => {
  const t = useOrderTranslations();
  const rows: Array<{ key: string; label: string; content?: string; images?: string[]; tone?: string }> = [
    { key: 'notes', label: t('detailNotes.general'), content: order.notes, images: imagesToArray(order.notesImages) },
    { key: 'pickup', label: t('detailNotes.pickup'), content: order.pickupNotes },
    { key: 'return', label: t('detailNotes.return'), content: order.returnNotes },
    { key: 'damage', label: t('detailNotes.damage'), content: order.damageNotes, tone: 'text-red-800' },
  ].filter((row) => row.content || (row.images && row.images.length > 0));
  const extras: Array<{ label: string; value: string }> = [];
  if (order.bailAmount && order.bailAmount > 0) extras.push({ label: t('detail.bailAmount'), value: formatCurrency(order.bailAmount, 'VND') });
  if (order.material) extras.push({ label: t('detail.material'), value: order.material });

  // No notes: show nothing instead of a large empty placeholder
  if (rows.length === 0 && extras.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="order-notes-title">
      <h2 id="order-notes-title" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <FileText className="h-4 w-4 text-slate-500" aria-hidden="true" />
        {t('detailNotes.title')}
      </h2>
      <dl className="divide-y divide-slate-100 text-sm">
        {rows.map((row) => (
          <div key={row.key} className="grid gap-1 py-2 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-3">
            <dt className="text-xs font-medium text-slate-600 sm:pt-0.5">{row.label}</dt>
            <dd className={`min-w-0 ${row.tone || 'text-slate-800'}`}>
              {row.content && <p className="whitespace-pre-wrap leading-relaxed">{row.content}</p>}
              {row.images && row.images.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {row.images.map((url, i) => (
                    <a key={`${url}-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="block h-14 w-14 overflow-hidden rounded-md border border-slate-200 bg-slate-100 hover:opacity-90">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </dd>
          </div>
        ))}
        {extras.map((row) => (
          <div key={row.label} className="grid gap-1 py-2 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-3">
            <dt className="text-xs font-medium text-slate-600 sm:pt-0.5">{row.label}</dt>
            <dd className="text-slate-800">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
