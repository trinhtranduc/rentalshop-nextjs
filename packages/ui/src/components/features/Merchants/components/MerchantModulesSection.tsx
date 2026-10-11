'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { Plus, Building2, CreditCard } from 'lucide-react';
import {
  billingModulesApi,
  type BillingModuleCatalogItem,
  type MerchantModuleRow,
  type MerchantModuleQuote,
} from '@rentalshop/utils';
import { ResponsiveDialogFooter } from '../../Subscriptions/components/ResponsiveDialogFooter';
import { formatVnd, describeModule, moduleErrorText, PHONE_DIALOG_CLASS, PHONE_DIALOG_BODY_CLASS } from '../../BillingModules/format';

export const MERCHANT_MODULES_ANCHOR = 'merchant-modules';

interface MerchantModulesSectionProps {
  merchantId: number;
  planName?: string | null;
  /** Monthly plan price in VND. */
  planPrice?: number | null;
  onChanged?: () => void;
}

// ---------------------------------------------------------------------------
// Add dialog
// ---------------------------------------------------------------------------
function AddModuleDialog({
  merchantId,
  open,
  onClose,
  onAdded,
}: {
  merchantId: number;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [catalog, setCatalog] = useState<BillingModuleCatalogItem[]>([]);
  const [moduleId, setModuleId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [method, setMethod] = useState<'TRANSFER' | 'STRIPE'>('TRANSFER');
  const [transactionId, setTransactionId] = useState('');
  const [quote, setQuote] = useState<MerchantModuleQuote | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selected = catalog.find((m) => String(m.id) === moduleId) || null;
  const isFeature = selected?.kind === 'feature';
  const qty = isFeature ? 1 : Math.floor(Number(quantity));

  useEffect(() => {
    if (!open) return;
    setModuleId('');
    setQuantity('1');
    setMethod('TRANSFER');
    setTransactionId('');
    setQuote(null);
    setQuoteError('');
    setError('');
    billingModulesApi.listCatalog().then((res) => {
      if (res.success && res.data) setCatalog((res.data.modules || []).filter((m) => m.isActive));
      else setError(moduleErrorText(res, 'Không tải được danh sách.'));
    }).catch((e) => setError(e?.message || 'Không tải được danh sách.'));
  }, [open]);

  // Live quote from the API
  useEffect(() => {
    setQuote(null);
    setQuoteError('');
    if (!open || !selected || !Number.isFinite(qty) || qty < 1) return;
    let cancelled = false;
    setQuoting(true);
    const t = setTimeout(() => {
      billingModulesApi.quote(merchantId, selected.id, qty).then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setQuote(res.data);
        else setQuoteError(moduleErrorText(res, 'Không tính được số tiền.'));
      }).catch((e) => !cancelled && setQuoteError(e?.message || 'Không tính được số tiền.'))
        .finally(() => !cancelled && setQuoting(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, merchantId, selected?.id, qty]);

  const submit = async () => {
    if (!selected) return setError('Chọn một Add-on / Module.');
    if (!Number.isFinite(qty) || qty < 1) return setError('Số lượng phải từ 1 trở lên.');
    if (!transactionId.trim()) return setError('Nhập mã giao dịch.');
    setError('');
    setSaving(true);
    try {
      const res = await billingModulesApi.addToMerchant(merchantId, {
        moduleId: selected.id,
        quantity: qty,
        method,
        transactionId: transactionId.trim(),
      });
      if (!res.success) {
        setError(moduleErrorText(res, 'Không thêm được.'));
        return;
      }
      onAdded();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Không thêm được.');
    } finally {
      setSaving(false);
    }
  };

  const ctl = 'max-md:min-h-11';
  const amountText = quote ? formatVnd(quote.amountDueRounded) : undefined;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={PHONE_DIALOG_CLASS}>
        <DialogHeader className="flex-shrink-0 max-md:pr-10 max-md:pb-3">
          <DialogTitle>Thêm module</DialogTitle>
          <DialogDescription>Thu tiền phần còn lại của kỳ hiện tại.</DialogDescription>
        </DialogHeader>

        <div className={PHONE_DIALOG_BODY_CLASS}>
          <div>
            <Label>Add-on / Module</Label>
            <Select value={moduleId} onValueChange={setModuleId}>
              <SelectTrigger className={ctl} aria-label="Add-on / Module">
                <SelectValue placeholder="Chọn..." />
              </SelectTrigger>
              <SelectContent>
                {catalog.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name} ({m.kind === 'quantity' ? 'Add-on' : 'Module'}) {formatVnd(m.monthlyPrice)}/tháng
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && <p className="text-xs text-gray-500 mt-1">{describeModule(selected)}</p>}
          </div>

          {selected && !isFeature && (
            <div>
              <Label htmlFor="mm-qty">Số lượng</Label>
              <Input id="mm-qty" className={ctl} type="number" inputMode="numeric" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          )}

          {selected && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm" data-testid="module-quote">
              {quoteError ? (
                <span className="text-red-600">{quoteError}</span>
              ) : quote ? (
                <span>
                  <span className="font-semibold text-blue-900">Cần thu: {formatVnd(quote.amountDueRounded)}</span>
                  {' — còn '}{quote.remainingDays}/{quote.periodDays} ngày
                </span>
              ) : (
                <span className="text-gray-600">{quoting ? 'Đang tính...' : 'Nhập số lượng để tính tiền.'}</span>
              )}
            </div>
          )}

          <div>
            <Label>Hình thức thanh toán</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Button type="button" variant="outline" onClick={() => setMethod('TRANSFER')}
                className={`justify-start h-auto p-3 border-2 max-md:min-h-11 ${method === 'TRANSFER' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <Building2 className="w-5 h-5 mr-2 text-gray-600" />
                Chuyển khoản
              </Button>
              <Button type="button" variant="outline" onClick={() => setMethod('STRIPE')}
                className={`justify-start h-auto p-3 border-2 max-md:min-h-11 ${method === 'STRIPE' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <CreditCard className="w-5 h-5 mr-2 text-gray-600" />
                Stripe
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="mm-txn">Mã giao dịch</Label>
            <Input id="mm-txn" className={ctl} value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder={method === 'STRIPE' ? 'txn_1234567890' : 'Mã tham chiếu ngân hàng'} />
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>

        <ResponsiveDialogFooter
          className="md:border-t md:pt-4 md:mt-4 max-md:-mx-4"
          summaryLabel="Cần thu"
          summaryAmount={amountText}
          secondary={<Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>}
          primary={<Button onClick={submit} disabled={saving || !quote}>{saving ? 'Đang xử lý...' : 'Xác nhận'}</Button>}
        />
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Remove / undo confirmation
// ---------------------------------------------------------------------------
function RemoveDialog({
  merchantId,
  row,
  onClose,
  onDone,
}: {
  merchantId: number;
  row: MerchantModuleRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setError(''), [row?.id]);

  const confirm = async () => {
    if (!row) return;
    setBusy(true);
    setError('');
    try {
      const res = await billingModulesApi.setRemoveAtPeriodEnd(merchantId, row.id, true);
      if (!res.success) return setError(moduleErrorText(res, 'Không thực hiện được.'));
      onDone();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Không thực hiện được.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={PHONE_DIALOG_CLASS.replace('max-w-xl', 'max-w-md')}>
        <DialogHeader className="flex-shrink-0 max-md:pr-10 max-md:pb-3">
          <DialogTitle>Bỏ cuối kỳ</DialogTitle>
          <DialogDescription>
            {row ? `"${row.name}" ×${row.quantity} vẫn dùng đến hết kỳ hiện tại, sau đó không gia hạn. Không hoàn tiền. Có thể hoàn tác trước khi hết kỳ.` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className={PHONE_DIALOG_BODY_CLASS}>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
        <ResponsiveDialogFooter
          className="md:border-t md:pt-4 md:mt-4 max-md:-mx-4"
          secondary={<Button variant="outline" onClick={onClose} disabled={busy}>Hủy</Button>}
          primary={<Button onClick={confirm} disabled={busy}>{busy ? 'Đang xử lý...' : 'Bỏ cuối kỳ'}</Button>}
        />
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------
function ModuleRows({
  rows,
  onRemove,
  onUndo,
  busyId,
  readOnly,
}: {
  rows: MerchantModuleRow[];
  onRemove?: (r: MerchantModuleRow) => void;
  onUndo?: (r: MerchantModuleRow) => void;
  busyId?: number | null;
  readOnly?: boolean;
}) {
  return (
    <table className="table-cards w-full text-sm">
      <thead className="bg-bg-secondary border-b">
        <tr className="text-left">
          <th className="px-3 py-2 font-medium">Tên</th>
          <th className="px-3 py-2 font-medium">Số lượng</th>
          <th className="px-3 py-2 font-medium text-right">Đơn giá</th>
          <th className="px-3 py-2 font-medium">Trạng thái</th>
          <th className="px-3 py-2" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b last:border-0" data-testid={`merchant-module-${r.id}`}>
            <td data-primary className="px-3 py-2 font-medium">
              {r.name}
              {r.kind === 'feature' && <Badge variant="outline" className="ml-2 text-xs">Chưa bật tính năng</Badge>}
            </td>
            <td data-label="Số lượng" className="px-3 py-2">×{r.quantity}</td>
            <td data-label="Đơn giá" className="px-3 py-2 text-right">{formatVnd(r.unitPrice)}</td>
            <td data-label="Trạng thái" className="px-3 py-2">
              {readOnly ? (
                <span className="text-gray-500">Đã kết thúc{r.endedAt ? ` ${new Date(r.endedAt).toLocaleDateString('vi-VN')}` : ''}</span>
              ) : r.removeAtPeriodEnd ? (
                <Badge variant="secondary">Bỏ cuối kỳ</Badge>
              ) : (
                <span className="text-gray-600" title="Đã thu đến hết kỳ hiện tại; gia hạn sẽ tính tiếp.">Hết cùng kỳ</span>
              )}
            </td>
            <td data-actions={readOnly ? undefined : ''} className="px-3 py-2 text-right">
              {!readOnly && (r.removeAtPeriodEnd ? (
                <Button variant="outline" size="sm" className="max-md:min-h-11" disabled={busyId === r.id} onClick={() => onUndo?.(r)}>Hoàn tác</Button>
              ) : (
                <Button variant="outline" size="sm" className="max-md:min-h-11" onClick={() => onRemove?.(r)}>Bỏ cuối kỳ</Button>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MerchantModulesSection({ merchantId, planName, planPrice, onChanged }: MerchantModulesSectionProps) {
  const [rows, setRows] = useState<MerchantModuleRow[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<MerchantModuleRow | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showEnded, setShowEnded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await billingModulesApi.listForMerchant(merchantId);
      if (res.success && res.data) {
        setRows(res.data.modules || []);
        setMonthlyTotal(res.data.monthlyTotal || 0);
        setError('');
      } else {
        setError(moduleErrorText(res, 'Không tải được module.'));
      }
    } catch (e: any) {
      setError(e?.message || 'Không tải được module.');
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    load();
  }, [load]);

  const changed = () => {
    load();
    onChanged?.();
  };

  const undo = async (r: MerchantModuleRow) => {
    setBusyId(r.id);
    setError('');
    try {
      const res = await billingModulesApi.setRemoveAtPeriodEnd(merchantId, r.id, false);
      if (!res.success) setError(moduleErrorText(res, 'Không hoàn tác được.'));
      else changed();
    } catch (e: any) {
      setError(e?.message || 'Không hoàn tác được.');
    } finally {
      setBusyId(null);
    }
  };

  const active = rows.filter((r) => r.isActive);
  const ended = rows.filter((r) => !r.isActive);
  const plan = planPrice || 0;

  return (
    <Card id={MERCHANT_MODULES_ANCHOR} className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Gói & Module</span>
          <Button className="shrink-0 max-md:min-h-11" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Thêm module
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span>Gói: <span className="font-semibold">{planName || '-'}</span></span>
          <span className="font-semibold">{formatVnd(plan)}/tháng</span>
        </div>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Đang tải...</p>
        ) : active.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có Add-on / Module nào.</p>
        ) : (
          <div className="rounded-lg border">
            <ModuleRows rows={active} onRemove={setRemoving} onUndo={undo} busyId={busyId} />
          </div>
        )}

        <div className="flex items-baseline justify-between gap-3 rounded-lg bg-bg-secondary p-3 text-sm" data-testid="next-renewal">
          <span>Gia hạn kế tiếp (1 tháng): gói + module</span>
          <span className="font-bold text-base">= {formatVnd(plan + monthlyTotal)}</span>
        </div>

        {ended.length > 0 && (
          <div>
            <button type="button" aria-expanded={showEnded} onClick={() => setShowEnded((v) => !v)}
              className="text-sm font-medium text-action-primary underline min-h-11 md:min-h-0">
              Đã kết thúc ({ended.length})
            </button>
            {showEnded && (
              <div className="rounded-lg border mt-2">
                <ModuleRows rows={ended} readOnly />
              </div>
            )}
          </div>
        )}
      </CardContent>

      <AddModuleDialog merchantId={merchantId} open={adding} onClose={() => setAdding(false)} onAdded={changed} />
      <RemoveDialog merchantId={merchantId} row={removing} onClose={() => setRemoving(null)} onDone={changed} />
    </Card>
  );
}
