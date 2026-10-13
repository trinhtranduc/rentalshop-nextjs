'use client';

/**
 * #927 "Ai cần chấm công ở chi nhánh này": one checkbox per person of the outlet (the shop owner too).
 * Only people picked here see the app clock card, can get shifts and appear in Xếp ca / Bảng công.
 * Saved on each toggle; the owner's row is read only for an outlet admin.
 */
import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@rentalshop/ui';
import { attendanceApi } from '@rentalshop/utils';
import type { AttendanceMember } from '@rentalshop/types';
import { canEditMember } from '../../../attendance/attendance-model';
import { cardClass, must, useBusy, useLoad, type AttT } from '../../../attendance/parts';

export default function MembersCard({ outletId, callerRole }: { outletId: number; callerRole: string }) {
  const t = useTranslations('attendance') as unknown as AttT;
  const tc = useTranslations('common') as unknown as AttT;
  const { toastSuccess } = useToast();
  const { busy, run } = useBusy();
  const loaded = useLoad<{ items: AttendanceMember[] }>(() => must(attendanceApi.listMembers(outletId)), [outletId]);
  const [items, setItems] = useState<AttendanceMember[]>([]);
  useEffect(() => {
    if (loaded.data) setItems(loaded.data.items || []);
  }, [loaded.data]);

  const toggle = (m: AttendanceMember) =>
    run(async () => {
      const saved = await must(attendanceApi.setMember({ outletId, userId: m.userId, required: !m.required }));
      setItems((list) => list.map((x) => (x.userId === saved.userId ? saved : x)));
      toastSuccess(t(saved.required ? 'members.on' : 'members.off', { name: saved.name || m.name }));
    });

  return (
    <section className={`${cardClass} flex min-w-0 flex-col gap-1.5 p-3.5`} aria-labelledby="att-members-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span id="att-members-title" className="font-semibold">
          {t('members.title')}
        </span>
        <small className="text-ar-muted">{t('members.hint')}</small>
      </div>
      {loaded.loading && !loaded.data ? (
        <p className="m-0 py-2 text-ar-muted">{t('common.loading')}</p>
      ) : loaded.error ? (
        <p className="m-0 py-2 text-ar-muted">{t('outlet.notFound')}</p>
      ) : items.length === 0 ? (
        <p className="m-0 py-2 text-ar-muted">{t('members.empty')}</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((m) => {
            const editable = canEditMember(callerRole, m.role);
            return (
              <li key={m.userId} className="border-b border-ar-line-soft">
                <label className={`flex items-center justify-between gap-3 py-2 ${editable ? 'cursor-pointer' : 'cursor-default'}`}>
                  <span className="min-w-0">
                    <b>{m.name}</b>
                    {m.role && <small className="text-ar-muted"> · {tc(`roles.${m.role}`)}</small>}
                    {!editable && <small className="block text-ar-faint">{t('members.ownerOnly')}</small>}
                  </span>
                  <input
                    type="checkbox"
                    className="h-[18px] w-[18px] flex-none"
                    checked={m.required}
                    disabled={!editable || busy}
                    onChange={() => toggle(m)}
                    aria-label={t('members.toggle', { name: m.name })}
                  />
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <small className="text-ar-muted">{t('members.note')}</small>
    </section>
  );
}
