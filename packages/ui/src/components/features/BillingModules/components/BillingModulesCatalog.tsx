'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentalshop/ui';
import { Plus, Pencil } from 'lucide-react';
import {
  billingModulesApi,
  type BillingModuleCatalogItem,
  type BillingModuleLimits,
} from '@rentalshop/utils';
import { ResponsiveDialogFooter } from '../../Subscriptions/components/ResponsiveDialogFooter';
import {
  formatVnd,
  moduleErrorText,
  describeModule,
  LIMIT_FIELDS,
  FEATURE_LABELS,
  PHONE_DIALOG_CLASS,
  PHONE_DIALOG_BODY_CLASS,
} from '../format';

type Kind = 'quantity' | 'feature';

interface FormState {
  kind: Kind;
  name: string;
  limits: Record<string, string>;
  featureKey: string;
  price: string;
  isActive: boolean;
}

const emptyForm = (): FormState => ({
  kind: 'quantity',
  name: '',
  limits: {},
  featureKey: 'loyalty',
  price: '',
  isActive: true,
});

function CatalogDialog({
  item,
  open,
  onClose,
  onSaved,
}: {
  item: BillingModuleCatalogItem | null; // null = create
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!item;
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (item) {
      const limits: Record<string, string> = {};
      LIMIT_FIELDS.forEach((f) => {
        const v = item.limits?.[f.key];
        if (v) limits[f.key] = String(v);
      });
      setForm({
        kind: item.kind,
        name: item.name,
        limits,
        featureKey: item.featureKey || 'loyalty',
        price: String(item.monthlyPrice ?? ''),
        isActive: item.isActive,
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, item]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    const name = form.name.trim();
    const price = Number(form.price);
    if (!name) return setError('Nhập tên.');
    if (form.price === '' || !Number.isFinite(price) || price < 0) return setError('Giá/tháng không hợp lệ.');
    let limits: BillingModuleLimits | undefined;
    if (!editing && form.kind === 'quantity') {
      limits = {};
      LIMIT_FIELDS.forEach((f) => {
        const n = Number(form.limits[f.key] || 0);
        if (n > 0) limits![f.key] = Math.floor(n);
      });
      if (Object.keys(limits).length === 0) return setError('Nhập ít nhất một số lượng lớn hơn 0.');
    }
    setError('');
    setSaving(true);
    try {
      const res = editing
        ? await billingModulesApi.updateCatalogItem(item!.id, { name, monthlyPrice: price, isActive: form.isActive })
        : await billingModulesApi.createCatalogItem({
            name,
            kind: form.kind,
            ...(form.kind === 'quantity' ? { limits } : { featureKey: form.featureKey }),
            monthlyPrice: price,
            isActive: form.isActive,
          });
      if (!res.success) {
        setError(moduleErrorText(res, 'Không lưu được.'));
        return;
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Không lưu được.');
    } finally {
      setSaving(false);
    }
  };

  const ctl = 'max-md:min-h-11';
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={PHONE_DIALOG_CLASS}>
        <DialogHeader className="flex-shrink-0 max-md:pr-10 max-md:pb-3">
          <DialogTitle>{editing ? 'Sửa' : 'Thêm Add-on / Module'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Chỉ đổi được tên, giá và bật/tắt. Loại và số lượng không đổi.' : 'Giá tính cho cả cửa hàng, theo tháng.'}
          </DialogDescription>
        </DialogHeader>

        <div className={PHONE_DIALOG_BODY_CLASS}>
          <div>
            <Label>Loại</Label>
            <Select value={form.kind} onValueChange={(v) => set({ kind: v as Kind })} disabled={editing}>
              <SelectTrigger className={ctl} aria-label="Loại">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quantity">Add-on (thêm số lượng)</SelectItem>
                <SelectItem value="feature">Module (bật tính năng)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="bm-name">Tên</Label>
            <Input id="bm-name" className={ctl} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder={form.kind === 'quantity' ? 'Thêm nhân viên' : 'Loyalty'} />
          </div>

          {form.kind === 'quantity' && (
            <div>
              <Label>Mỗi đơn vị thêm</Label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                {LIMIT_FIELDS.map((f) => (
                  <div key={f.key}>
                    <Label htmlFor={`bm-lim-${f.key}`} className="text-xs text-gray-600">{f.label}</Label>
                    <Input
                      id={`bm-lim-${f.key}`}
                      className={ctl}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      disabled={editing}
                      value={form.limits[f.key] || ''}
                      onChange={(e) => set({ limits: { ...form.limits, [f.key]: e.target.value } })}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {form.kind === 'feature' && (
            <div>
              <Label>Tính năng</Label>
              <Select value={form.featureKey} onValueChange={(v) => set({ featureKey: v })} disabled={editing}>
                <SelectTrigger className={ctl} aria-label="Tính năng">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loyalty">Loyalty</SelectItem>
                  <SelectItem value="payroll">Bảng lương</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-amber-700 mt-1">Chưa bật tính năng: bước sau. Hiện chỉ tính giá và thu tiền.</p>
            </div>
          )}

          <div>
            <Label htmlFor="bm-price">Giá/tháng (VND)</Label>
            <Input id="bm-price" className={ctl} type="number" inputMode="numeric" min={0} value={form.price} onChange={(e) => set({ price: e.target.value })} placeholder="30000" />
          </div>

          <label className="flex items-center gap-3 min-h-11 cursor-pointer">
            <input type="checkbox" className="h-5 w-5" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
            <span className="text-sm">Bật (cho phép thêm vào cửa hàng)</span>
          </label>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>

        <ResponsiveDialogFooter
          className="md:border-t md:pt-4 md:mt-4 max-md:-mx-4"
          secondary={<Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>}
          primary={<Button onClick={submit} disabled={saving}>{saving ? 'Đang lưu...' : editing ? 'Lưu' : 'Thêm'}</Button>}
        />
      </DialogContent>
    </Dialog>
  );
}

export function BillingModulesCatalog() {
  const [loadError, setLoadError] = useState('');
  const [items, setItems] = useState<BillingModuleCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; item: BillingModuleCatalogItem | null }>({ open: false, item: null });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await billingModulesApi.listCatalog();
      if (res.success && res.data) setItems(res.data.modules || []);
      else setLoadError(moduleErrorText(res, 'Không tải được danh sách.'));
    } catch (e: any) {
      setLoadError(e?.message || 'Không tải được danh sách.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600">Add-on (thêm chi nhánh, nhân viên) và Module (bật tính năng), giá theo tháng cho cả cửa hàng.</p>
        <Button className="shrink-0 max-md:min-h-11" onClick={() => setDialog({ open: true, item: null })}>
          <Plus className="h-4 w-4 mr-1" />
          Thêm
        </Button>
      </div>

      <div className="rounded-lg border bg-bg-card">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Đang tải...</p>
        ) : loadError ? (
          <p role="alert" className="p-6 text-sm text-red-600">{loadError}</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">Chưa có Add-on / Module nào. Bấm "Thêm" để tạo.</p>
        ) : (
          <table className="table-cards w-full text-sm">
            <thead className="bg-bg-secondary border-b">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Tên</th>
                <th className="px-4 py-3 font-medium">Loại</th>
                <th className="px-4 py-3 font-medium">Thêm / bật</th>
                <th className="px-4 py-3 font-medium text-right">Giá/tháng</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-b last:border-0" data-testid={`catalog-row-${m.id}`}>
                  <td data-primary className="px-4 py-3 font-medium">{m.name}</td>
                  <td data-label="Loại" className="px-4 py-3">
                    <Badge variant="outline">{m.kind === 'quantity' ? 'Add-on' : 'Module'}</Badge>
                  </td>
                  <td data-label={m.kind === 'quantity' ? 'Mỗi đơn vị' : 'Tính năng'} className="px-4 py-3">
                    <span>{describeModule(m)}</span>
                    {m.kind === 'feature' && (
                      <span className="ml-2 text-xs text-amber-700 max-md:ml-0">Chưa bật tính năng</span>
                    )}
                  </td>
                  <td data-label="Giá/tháng" className="px-4 py-3 text-right font-semibold">{formatVnd(m.monthlyPrice)}</td>
                  <td data-label="Trạng thái" className="px-4 py-3">
                    <Badge variant={m.isActive ? 'default' : 'secondary'}>{m.isActive ? 'Bật' : 'Tắt'}</Badge>
                  </td>
                  <td data-actions className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" className="max-md:min-h-11" onClick={() => setDialog({ open: true, item: m })}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Sửa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CatalogDialog item={dialog.item} open={dialog.open} onClose={() => setDialog({ open: false, item: null })} onSaved={load} />
    </div>
  );
}

export { FEATURE_LABELS };
