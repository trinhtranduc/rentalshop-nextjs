'use client';

import React from 'react';

/** #1332 the note as the receipt prints it, for every role except the shop owner. No save, same text as the apps. */
export function ReadOnlyPrintNotes({
  notes,
  fieldLabel,
  empty,
  explanation,
}: {
  notes: Array<{ id: number; name: string; saved: string }>;
  fieldLabel: string;
  empty: string;
  explanation: string;
}) {
  return (
    <>
      <p data-print-note-readonly className="m-0 text-sm text-ar-muted">{explanation}</p>
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {notes.map((n) => (
          <li key={n.id}>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ar-ink">
              {notes.length > 1 ? n.name : fieldLabel}
              <textarea
                readOnly
                rows={3}
                value={n.saved}
                placeholder={empty}
                className="w-full resize-none rounded-xl border border-ar-line bg-ar-surface-muted px-3.5 py-2.5 text-[15px] font-normal text-ar-ink-2 focus:outline-none"
              />
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}
