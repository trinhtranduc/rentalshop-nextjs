'use client';

/**
 * #907 "Module" card on the admin merchant page (approved mockup). ADMIN switches a module on or off with an
 * optional inclusive end date (VN day); OPS only reads. Tính lương is listed as not available yet.
 * The end date travels as the `YYYY-MM-DD` string of the date input, never through a Date.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@rentalshop/ui';
import { merchantModulesApi, type MerchantModuleView } from '@rentalshop/utils';
import { useApiError } from '@rentalshop/hooks';

const LABELS: Record<string, { name: string; hint: string }> = {
  attendance: { name: 'Chấm công', hint: 'QR, GPS, ca, bảng công' },
};

/** `2026-11-11` → `11/11/26` (string only). */
function shortDay(key: string | null): string {
  if (!key) return '—';
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

function statusOf(m: MerchantModuleView): { label: string; tone: 'success' | 'warning' | 'neutral' } {
  if (m.active) return { label: 'Đang bật', tone: 'success' };
  if (m.enabled) return { label: 'Hết hạn', tone: 'warning' };
  return { label: 'Đang tắt', tone: 'neutral' };
}

export function MerchantModulesCard({
  merchantId,
  merchantName,
  canEdit,
}: {
  merchantId: number;
  merchantName: string;
  canEdit: boolean;
}) {
  const { translateError } = useApiError();
  // useApiError returns a new function each render; keep the latest in a ref so loading runs once
  const translateRef = useRef(translateError);
  translateRef.current = translateError;
  const [modules, setModules] = useState<MerchantModuleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MerchantModuleView | null>(null);
  const [draftEnabled, setDraftEnabled] = useState(false);
  const [draftEndDate, setDraftEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await merchantModulesApi.list(merchantId);
      if (res.success && res.data) {
        setModules(res.data);
        setError(null);
      } else {
        setError(translateRef.current(res));
      }
    } catch (e) {
      setError(translateRef.current(e));
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEditor = (m: MerchantModuleView) => {
    setEditing(m);
    setDraftEnabled(m.enabled);
    setDraftEndDate(m.endDate ?? '');
    setError(null);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await merchantModulesApi.update(merchantId, editing.key, {
        enabled: draftEnabled,
        endDate: draftEndDate || null,
      });
      if (res.success) {
        setEditing(null);
        await load();
      } else {
        setError(translateRef.current(res));
      }
    } catch (e) {
      setError(translateRef.current(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-4" data-testid="merchant-modules-card">
      <CardHeader>
        <CardTitle>Module</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Chỉ ADMIN bật/tắt; OPS chỉ xem. Shop chưa bật thì không thấy Chấm công (web và app).
        </p>
      </CardHeader>
      <CardContent>
        {error && !editing && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="py-2 pr-3 font-medium">Module</th>
                <th className="py-2 pr-3 font-medium">Trạng thái</th>
                <th className="py-2 pr-3 font-medium">Hết hạn</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {loading && modules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-3 text-gray-500">
                    Đang tải…
                  </td>
                </tr>
              ) : (
                modules.map((m) => {
                  const status = statusOf(m);
                  const label = LABELS[m.key] ?? { name: m.key, hint: '' };
                  return (
                    <tr key={m.key} className="border-t border-ar-line" data-module={m.key}>
                      <td className="py-3 pr-3">
                        <div className="font-semibold">{label.name}</div>
                        <div className="text-xs text-gray-500">{label.hint}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`ar-pill ar-pill-${status.tone}`}>{status.label}</span>
                      </td>
                      <td className="py-3 pr-3">{shortDay(m.endDate)}</td>
                      <td className="py-3 text-right">
                        {canEdit && (
                          <Button size="sm" variant="outline" onClick={() => openEditor(m)}>
                            Sửa
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
              <tr className="border-t border-ar-line">
                <td className="py-3 pr-3">
                  <div className="font-semibold">Tính lương</div>
                  <div className="text-xs text-gray-500">Cần Chấm công · làm sau</div>
                </td>
                <td className="py-3 pr-3">
                  <span className="ar-pill ar-pill-neutral">Chưa có</span>
                </td>
                <td className="py-3 pr-3">—</td>
                <td className="py-3 text-right">
                  {canEdit && (
                    <Button size="sm" variant="outline" disabled>
                      Bật
                    </Button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && !saving && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Module {editing ? LABELS[editing.key]?.name ?? editing.key : ''} · {merchantName}
            </DialogTitle>
            <DialogDescription>
              Tắt hoặc hết hạn: dữ liệu chấm công giữ nguyên, shop không chấm và không xem được cho tới khi bật lại.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Trạng thái</p>
              <div className="inline-flex rounded-lg border border-ar-line overflow-hidden" role="group">
                <Button type="button" variant={draftEnabled ? 'default' : 'ghost'} onClick={() => setDraftEnabled(true)}>
                  Bật
                </Button>
                <Button type="button" variant={!draftEnabled ? 'default' : 'ghost'} onClick={() => setDraftEnabled(false)}>
                  Tắt
                </Button>
              </div>
            </div>
            <div>
              <label htmlFor="module-end-date" className="text-sm font-medium block mb-2">
                Hết hạn (tuỳ chọn)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  id="module-end-date"
                  type="date"
                  className="border border-ar-line rounded-md px-3 py-2 text-sm bg-transparent"
                  value={draftEndDate}
                  onChange={(e) => setDraftEndDate(e.target.value)}
                />
                {draftEndDate && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setDraftEndDate('')}>
                    Bỏ hạn
                  </Button>
                )}
              </div>
            </div>
            {error && editing && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Huỷ
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
