'use client';

/**
 * Nhập sản phẩm từ Excel (#526), 3 steps: choose a file → check rows (errors shown, not imported)
 * → result. The file is read with `xlsx` (the library behind the old import dialog's parser) so the
 * table keeps the file's own row numbers and Vietnamese headers; checks live in ./import-model
 * (unit-tested). Saves through `productsApi.bulkImport` (max 3000 rows, the API's cap).
 * #1533: with 2+ branches the shop picks the branch of the file's quantity and sets "Hiện" + quantity per branch
 * (./import-branches, unit-tested).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useToast } from '@rentalshop/ui';
import { useAuth, usePermissions } from '@rentalshop/hooks';
import { isOutletRole } from '@rentalshop/constants';
import { categoriesApi, outletsApi, productsApi } from '@rentalshop/utils';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { Skeleton, cardClass, outlineBtn, primaryBtn, type T } from '../../orders/list/parts';
import {
  MAX_IMPORT_ROWS,
  TABLE_FIELDS,
  checkSheet,
  orderRows,
  readOutcome,
  sheetFromMatrix,
  type CheckResult,
  type CheckedRow,
  type FileProblem,
  type ImportOutcome,
} from './import-model';
import {
  buildBranchImport,
  copyColumn,
  defaultCells,
  importBranchMode,
  readByOutlet,
  rowHasBranch,
  setQty,
  toggleCell,
  turnColumnOn,
  type BranchImportOptions,
  type Cells,
  type ImportOutlet,
  type OutletResult,
} from './import-branches';

type Step = 'choose' | 'check' | 'result';
const STEPS: Step[] = ['choose', 'check', 'result'];
const ROWS_STEP = 100;
const FILE_ICON = 'M6 3h9l4 4v14H6zM14 3v5h5M9 12l5 5M14 12l-5 5';
const UPLOAD_ICON = 'M12 20V9M7 14l5-5 5 5M5 4h14';
const th = 'px-2 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-ar-muted';
const checkbox = 'h-[18px] w-[18px] cursor-pointer accent-ar-primary disabled:cursor-not-allowed';
const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });

/** First sheet as a cell matrix plus the Excel row number of its first row. */
async function readMatrix(file: File): Promise<{ matrix: unknown[][]; firstRow: number }> {
  const XLSX = await import('xlsx');
  const isCsv = /\.csv$/i.test(file.name);
  const wb = isCsv ? XLSX.read(await file.text(), { type: 'string', raw: true }) : XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws || !ws['!ref']) return { matrix: [], firstRow: 1 };
  const range = XLSX.utils.decode_range(ws['!ref']);
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: true }) as unknown[][];
  return { matrix, firstRow: range.s.r + 1 };
}

function saveBlob(blob: Blob, name: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function ImportProductsPage() {
  const t = useTranslations('products.web.import') as unknown as T;
  const { toastError } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { canManageProducts } = usePermissions();

  // #1533 branches: the owner picks from the shop's active branches; a branch role imports into its own branch only
  const typedUser = user as unknown as {
    role?: string;
    merchantId?: number;
    merchant?: { id?: number };
    outletId?: number;
    outlet?: { id?: number; name?: string };
  } | null;
  const merchantId = Number(typedUser?.merchant?.id || typedUser?.merchantId) || null;
  const branchRole = isOutletRole(typedUser?.role);
  const ownOutletId = Number(typedUser?.outlet?.id || typedUser?.outletId) || null;
  const ownOutletName = typedUser?.outlet?.name || '';
  const [outlets, setOutlets] = useState<ImportOutlet[] | null>(null);
  useEffect(() => {
    if (branchRole || !merchantId) return;
    let cancelled = false;
    outletsApi
      .getOutletsByMerchant(merchantId)
      .then((res) => {
        if (cancelled) return;
        const list = ((res.data as { outlets?: ImportOutlet[] } | undefined)?.outlets || []).map((o) => ({
          id: Number(o.id),
          name: String(o.name || ''),
          isDefault: o.isDefault ?? null,
          isActive: o.isActive ?? null,
        }));
        setOutlets(res.success ? list : []);
      })
      .catch(() => {
        if (!cancelled) setOutlets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [branchRole, merchantId]);
  const mode = useMemo(
    () =>
      importBranchMode({
        branchRole,
        ownOutlet: ownOutletId ? { id: ownOutletId, name: ownOutletName } : null,
        outlets: outlets ?? [],
      }),
    [branchRole, ownOutletId, ownOutletName, outlets],
  );
  /** Branch columns of the table (none: one "Số lượng" column as before). */
  const columns: Array<{ id: number; name: string }> = useMemo(
    () => (mode.kind === 'pick' ? mode.outlets.map((o) => ({ id: o.id, name: o.name })) : mode.kind === 'own' ? [mode.outlet] : []),
    [mode],
  );
  const [pickedTarget, setPickedTarget] = useState<number | null>(null);
  const target = mode.kind === 'own' ? mode.outlet.id : mode.kind === 'pick' ? pickedTarget ?? mode.target : null;
  const branchName = (id: number) => columns.find((c) => c.id === id)?.name || `#${id}`;
  const [cells, setCells] = useState<Cells>({});
  const [byOutlet, setByOutlet] = useState<OutletResult[] | null>(null);
  const [updated, setUpdated] = useState(0);

  // Category names, for "Danh mục chưa có" (the API rejects the whole file on an unknown category)
  const categoriesRef = useRef<Promise<string[]> | null>(null);
  const loadCategories = useCallback(() => {
    if (!categoriesRef.current) {
      categoriesRef.current = categoriesApi
        .getCategories()
        .then((res) => (res.success && Array.isArray(res.data) ? res.data.map((c) => String(c.name || '')) : []))
        .catch(() => {
          categoriesRef.current = null;
          return [];
        });
    }
    return categoriesRef.current;
  }, []);
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const [step, setStep] = useState<Step>('choose');
  const [reading, setReading] = useState(false);
  const [problem, setProblem] = useState<{ code: FileProblem | 'type' | 'unreadable'; count?: number } | null>(null);
  const [file, setFile] = useState<{ name: string; readAt: string } | null>(null);
  const [checked, setChecked] = useState<CheckResult | null>(null);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [errorsFirst, setErrorsFirst] = useState(true);
  const [shown, setShown] = useState(ROWS_STEP);
  const [importing, setImporting] = useState(false);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setStep('choose');
    setProblem(null);
    setFile(null);
    setChecked(null);
    setChosen(new Set());
    setOutcome(null);
    setByOutlet(null);
    setUpdated(0);
    setRequestError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // #1533: a new file or another branch for the file's quantity: every cell back to its default
  const columnKey = columns.map((c) => c.id).join(',');
  useEffect(() => {
    if (!checked || target === null) return setCells({});
    setCells(defaultCells(checked.rows, columns.map((c) => c.id), target));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- columns change only with columnKey
  }, [checked, target, columnKey]);

  const takeFile = async (f: File | undefined | null) => {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      setProblem({ code: 'type' });
      return;
    }
    setReading(true);
    setProblem(null);
    try {
      const [{ matrix, firstRow }, names] = await Promise.all([readMatrix(f), loadCategories()]);
      const sheet = sheetFromMatrix(matrix, firstRow);
      const result = checkSheet(sheet, names);
      if (result.problem) {
        setProblem({ code: result.problem, count: sheet.rows.length });
        return;
      }
      setFile({ name: f.name, readAt: clock.format(new Date()) });
      setChecked(result);
      setChosen(new Set(result.rows.filter((r) => r.payload).map((r) => r.row)));
      setErrorsFirst(result.errorCount > 0);
      setShown(ROWS_STEP);
      setStep('check');
    } catch {
      setProblem({ code: 'unreadable' });
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const downloadTemplate = async () => {
    try {
      saveBlob(await productsApi.downloadSampleFile(), 'mau-nhap-san-pham.xlsx');
    } catch {
      toastError(t('templateFailed'));
    }
  };

  const validRows = useMemo(() => (checked ? checked.rows.filter((r) => r.payload) : []), [checked]);
  const viewRows = useMemo(() => (checked ? orderRows(checked.rows, errorsFirst) : []), [checked, errorsFirst]);
  const hasUnknownCategory = !!checked?.rows.some((r) => r.errors.some((e) => e.code === 'categoryUnknown'));
  const byBranch = columns.length > 0 && target !== null;
  const importOptions: BranchImportOptions = byBranch
    ? { kind: 'cells', target: target as number, outletIds: columns.map((c) => c.id), cells }
    : { kind: 'single', outletId: mode.kind === 'single' ? mode.outletId : null };
  const plan = useMemo(() => (checked ? buildBranchImport(checked.rows, chosen, importOptions) : null), [checked, chosen, cells, target, columnKey, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  /** Rows that will be sent (chosen, valid, at least one branch on). */
  const chosenCount = plan ? plan.body.products.length : 0;
  const chosenValid = validRows.filter((r) => chosen.has(r.row)).length;
  /** Table columns from the file; with branch columns, "Số lượng" moves into them. */
  const fields = byBranch ? TABLE_FIELDS.filter((f) => f !== 'stock') : TABLE_FIELDS;

  const runImport = async () => {
    if (!checked || !plan || chosenCount === 0) return;
    const { body, fileRows } = plan;
    setImporting(true);
    setRequestError(null);
    try {
      const res = await productsApi.bulkImport(body.products, body.outletId ? { outletId: body.outletId } : undefined);
      if (res.success) {
        setOutcome(readOutcome(res.data, fileRows));
        setByOutlet(readByOutlet(res.data));
        const u = (res.data as { updated?: unknown } | undefined)?.updated;
        setUpdated(typeof u === 'number' && u > 0 ? u : 0);
      } else setRequestError(res.message || res.error || '');
    } catch (e) {
      setRequestError(e instanceof Error ? e.message : '');
    } finally {
      setImporting(false);
      setStep('result');
    }
  };

  const errorText = (r: CheckedRow) => r.errors.map((e) => (e.code === 'barcodeDuplicate' ? t('error.barcodeDuplicate', { row: e.ref ?? '' }) : t(`error.${e.code}`))).join(' · ');

  // ------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------

  const stepIndex = STEPS.indexOf(step);
  const stepper = (
    <ol aria-label={t('steps')} className="m-0 grid list-none grid-cols-3 gap-3 p-0">
      {STEPS.map((s, i) => {
        const current = i === stepIndex;
        return (
          <li key={s} aria-current={current ? 'step' : undefined} className="flex min-w-0 flex-col gap-2">
            <span className={`h-1 rounded-full ${i <= stepIndex ? 'bg-ar-primary' : 'bg-ar-line'}`} />
            <span className={`text-[15px] ${current ? 'font-bold text-ar-primary-ink' : 'font-semibold text-ar-ink'}`}>{t(`step${i + 1}`)}</span>
            {i === 0 ? (
              <button type="button" onClick={downloadTemplate} className="hidden self-start text-left text-sm font-semibold text-ar-primary hover:underline sm:block">
                {t('template')}
              </button>
            ) : (
              <span className="hidden text-sm text-ar-muted sm:block">{t(`step${i + 1}Hint`, { max: MAX_IMPORT_ROWS.toLocaleString('vi-VN') })}</span>
            )}
          </li>
        );
      })}
    </ol>
  );

  const header = (
    <>
      <Link href="/products" className="flex min-h-8 items-center gap-1 self-start text-sm font-semibold text-ar-primary no-underline">
        <ShellIcon d={ICONS.chevronLeft} size={16} />
        {t('back')}
      </Link>
      <h1 className="m-0 text-2xl font-bold text-ar-ink">{t('title')}</h1>
    </>
  );

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-5 text-ar-ink sm:px-8">{children}</div>
  );

  if (authLoading) return shell(<Skeleton className="h-40 w-full" />);
  if (!canManageProducts) {
    return shell(
      <>
        {header}
        <p className={`${cardClass} m-0 px-5 py-6 text-[15px] text-ar-muted`}>{t('noPermission')}</p>
      </>,
    );
  }

  const problemText = problem
    ? t(`problem.${problem.code}`, { count: (problem.count ?? 0).toLocaleString('vi-VN'), max: MAX_IMPORT_ROWS.toLocaleString('vi-VN') })
    : '';

  return shell(
    <>
      {header}
      {stepper}

      {step === 'choose' && (
        <section className={`${cardClass} flex flex-col gap-4 p-4 sm:p-6`}>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              takeFile(e.dataTransfer.files?.[0]);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-10 text-center ${
              dragging ? 'border-ar-primary bg-ar-primary-soft' : 'border-ar-line bg-ar-surface-muted hover:border-ar-line-strong'
            }`}
          >
            <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-xl bg-ar-done-bg text-ar-done">
              <ShellIcon d={UPLOAD_ICON} size={22} />
            </span>
            <span className="text-[15px] font-semibold text-ar-ink">{reading ? t('reading') : t('drop')}</span>
            <span className="text-sm text-ar-muted">{t('step1Hint', { max: MAX_IMPORT_ROWS.toLocaleString('vi-VN') })}</span>
            <span className={`${primaryBtn} pointer-events-none`}>{t('pick')}</span>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              disabled={reading}
              onChange={(e) => takeFile(e.target.files?.[0])}
              className="sr-only"
            />
          </label>
          {problem && (
            <p role="alert" className="m-0 rounded-xl bg-ar-danger-soft px-4 py-3 text-[15px] font-semibold text-ar-danger">
              {problemText}
            </p>
          )}
          <p className="m-0 text-sm text-ar-muted">{t('columnsHint')}</p>
          <button type="button" onClick={downloadTemplate} className={`${outlineBtn} self-start sm:hidden`}>
            <ShellIcon d={ICONS.download} size={18} />
            {t('template')}
          </button>
        </section>
      )}

      {step === 'check' && checked && file && (
        <section className={`${cardClass} overflow-hidden`}>
          <div className="flex flex-wrap items-center gap-3 border-b border-ar-subtle px-4 py-3.5">
            <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-ar-done-bg text-ar-done">
              <ShellIcon d={FILE_ICON} size={20} />
            </span>
            <span className="flex min-w-0 flex-[1_1_200px] flex-col">
              <span className="break-all text-[15px] font-semibold">{file.name}</span>
              <span className="text-sm text-ar-muted">{t('fileRows', { count: checked.rows.length, time: file.readAt })}</span>
            </span>
            <span className="rounded-lg bg-ar-done-bg px-2.5 py-1 text-sm font-bold text-ar-done">{t('okCount', { count: checked.okCount })}</span>
            {checked.errorCount > 0 && (
              <span className="rounded-lg bg-ar-danger-soft px-2.5 py-1 text-sm font-bold text-ar-danger">{t('errCount', { count: checked.errorCount })}</span>
            )}
            <button
              type="button"
              onClick={() => {
                reset();
                window.setTimeout(() => inputRef.current?.click(), 0);
              }}
              className="h-9 rounded-[10px] border border-ar-line bg-ar-surface px-3 text-sm font-semibold text-ar-ink hover:bg-ar-subtle"
            >
              {t('change')}
            </button>
          </div>

          {checked.errorCount > 0 && (
            <div role="tablist" aria-label={t('filter.label')} className="flex flex-wrap gap-2 border-b border-ar-subtle px-4 py-3">
              {[false, true].map((ef) => (
                <button
                  key={String(ef)}
                  type="button"
                  role="tab"
                  aria-selected={errorsFirst === ef}
                  onClick={() => setErrorsFirst(ef)}
                  className={`h-[34px] rounded-full px-3 text-sm ${
                    errorsFirst === ef ? 'bg-ar-ink font-semibold text-ar-page' : 'border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle'
                  }`}
                >
                  {ef ? t('filter.errorsFirst', { count: checked.errorCount }) : t('filter.all', { count: checked.rows.length })}
                </button>
              ))}
            </div>
          )}

          {hasUnknownCategory && (
            <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-ar-subtle bg-ar-unprepared-bg px-4 py-2.5 text-sm text-ar-unprepared">
              <span>{t('categoryHint')}</span>
              <Link href="/categories" className="font-semibold text-ar-unprepared underline">
                {t('openCategories')}
              </Link>
            </p>
          )}

          {byBranch && target !== null && (
            <div data-import-branch className="flex flex-col gap-3 border-b border-ar-subtle bg-ar-primary-soft/40 px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label htmlFor="import-branch" className="text-xs font-bold uppercase tracking-[0.06em] text-ar-muted">
                  {t('branch.label')}
                </label>
                {mode.kind === 'pick' ? (
                  <select
                    id="import-branch"
                    value={target}
                    onChange={(e) => setPickedTarget(Number(e.target.value))}
                    className="h-10 min-w-[200px] rounded-[10px] border border-ar-line bg-ar-surface px-3 text-[15px] font-semibold text-ar-ink"
                  >
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span id="import-branch" className="inline-flex h-10 items-center rounded-[10px] bg-ar-subtle px-3 text-[15px] font-semibold text-ar-ink-2">
                    {t('branch.locked', { name: branchName(target) })}
                  </span>
                )}
                <span className="min-w-0 flex-[1_1_320px] text-sm text-ar-ink-2">
                  {mode.kind === 'pick' ? t('branch.hint', { name: branchName(target) }) : t('branch.lockedHint')}
                </span>
              </div>
              <p className="m-0 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ar-muted">
                <span className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked readOnly tabIndex={-1} aria-hidden="true" className={`${checkbox} pointer-events-none`} />
                  {t('legend.on')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={false} readOnly tabIndex={-1} aria-hidden="true" className={`${checkbox} pointer-events-none`} />
                  {t('legend.off')}
                </span>
                <span>{t('legend.zero')}</span>
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-[15px]">
              <thead>
                <tr className="bg-ar-surface-muted text-left">
                  <th scope="col" className="w-7 py-2.5 pl-4">
                    <input
                      type="checkbox"
                      aria-label={t('selectValid')}
                      checked={validRows.length > 0 && chosenValid === validRows.length}
                      disabled={validRows.length === 0}
                      onChange={() => setChosen(chosenValid === validRows.length ? new Set() : new Set(validRows.map((r) => r.row)))}
                      className={checkbox}
                    />
                  </th>
                  <th scope="col" className={th}>{t('cols.row')}</th>
                  {fields.map((f) => (
                    <th key={f} scope="col" className={th}>{t(`cols.${f}`)}</th>
                  ))}
                  {byBranch &&
                    target !== null &&
                    columns.map((c) => (
                      <th
                        key={`outlet-${c.id}`}
                        scope="col"
                        data-branch-col={c.id}
                        className="min-w-[150px] max-w-[200px] border-l border-ar-subtle bg-ar-primary-soft/40 px-2 py-2.5 text-left align-bottom"
                      >
                        <span className="block break-words text-[13px] font-bold leading-snug text-ar-ink">{c.name}</span>
                        {c.id === target && <span className="block text-xs font-medium text-ar-muted">{t('col.fromFile')}</span>}
                        <span className="mt-1 flex flex-wrap gap-x-2 text-xs font-semibold leading-snug">
                          <button type="button" onClick={() => setCells((cs) => turnColumnOn(cs, c.id))} className="text-left text-ar-primary hover:underline">
                            {t('col.allOn')}
                          </button>
                          {c.id !== target && (
                            <button type="button" onClick={() => setCells((cs) => copyColumn(cs, target, c.id))} className="text-left text-ar-primary hover:underline">
                              {t('col.copy', { name: branchName(target) })}
                            </button>
                          )}
                        </span>
                      </th>
                    ))}
                  <th scope="col" className={`${th} pr-4`}>{t('cols.check')}</th>
                </tr>
              </thead>
              <tbody>
                {viewRows.slice(0, shown).map((r) => {
                  const bad = r.errors.length > 0;
                  const badFields = new Set(r.errors.map((e) => e.field));
                  const noBranch = !bad && byBranch && chosen.has(r.row) && !!cells[r.row] && !rowHasBranch(cells, r.row);
                  return (
                    <tr key={r.row} className={`border-t border-ar-subtle ${bad ? 'bg-ar-danger-soft/30' : ''}`}>
                      <td className="py-2.5 pl-4">
                        <input
                          type="checkbox"
                          aria-label={t('selectRow', { row: r.row })}
                          checked={!bad && chosen.has(r.row)}
                          disabled={bad}
                          onChange={() =>
                            setChosen((prev) => {
                              const next = new Set(prev);
                              if (next.has(r.row)) next.delete(r.row);
                              else next.add(r.row);
                              return next;
                            })
                          }
                          className={checkbox}
                        />
                      </td>
                      <td className="px-2 py-2.5 tabular-nums text-ar-muted">{r.row}</td>
                      {fields.map((f) => {
                        const v = r.values[f];
                        const cls = badFields.has(f) ? 'bg-ar-danger-soft font-semibold text-ar-danger' : v ? 'text-ar-ink' : 'text-ar-faint';
                        return (
                          <td key={f} className={`max-w-[220px] truncate px-2 py-2.5 ${f === 'name' ? '' : 'tabular-nums'} ${cls}`} title={v || undefined}>
                            {v || '—'}
                          </td>
                        );
                      })}
                      {byBranch &&
                        columns.map((c) => {
                          const cell = cells[r.row]?.[c.id];
                          return (
                            <td key={`outlet-${c.id}`} className="border-l border-ar-subtle bg-ar-primary-soft/20 px-2 py-1.5">
                              {cell ? (
                                <span className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    aria-label={t('cell.show', { name: c.name, row: r.row })}
                                    checked={cell.on}
                                    onChange={() => setCells((cs) => toggleCell(cs, r.row, c.id))}
                                    className={checkbox}
                                  />
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    step={1}
                                    aria-label={t('cell.qty', { name: c.name, row: r.row })}
                                    disabled={!cell.on}
                                    value={cell.on ? cell.qty : ''}
                                    placeholder="—"
                                    onChange={(e) => setCells((cs) => setQty(cs, r.row, c.id, e.target.value === '' ? 0 : Number(e.target.value)))}
                                    className="h-9 w-[72px] rounded-lg border border-ar-line bg-ar-surface px-2 text-right tabular-nums text-ar-ink disabled:border-dashed disabled:bg-ar-subtle disabled:text-ar-faint"
                                  />
                                  {cell.on && cell.qty === 0 && <span className="whitespace-nowrap text-xs text-ar-muted">{t('cell.outOfStock')}</span>}
                                </span>
                              ) : (
                                <span className="text-ar-faint">—</span>
                              )}
                            </td>
                          );
                        })}
                      <td className="py-2.5 pl-2 pr-4">
                        <span className={`whitespace-nowrap text-sm font-semibold ${bad || noBranch ? 'text-ar-danger' : 'text-ar-done'}`}>
                          {bad ? errorText(r) : noBranch ? t('error.noBranch') : t('ok')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {viewRows.length > shown && (
            <div className="flex flex-wrap items-center gap-3 border-t border-ar-subtle px-4 py-3 text-sm text-ar-muted">
              <span>{t('shown', { shown, total: viewRows.length })}</span>
              <button type="button" onClick={() => setShown((n) => n + ROWS_STEP * 5)} className="h-9 rounded-[10px] border border-ar-line px-3 font-semibold text-ar-ink hover:bg-ar-subtle">
                {t('showMore')}
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ar-subtle bg-ar-surface-muted px-4 py-3.5">
            <span className="min-w-0 flex-[1_1_260px] text-sm text-ar-muted">{t('footerHint')}</span>
            <div className="flex gap-2">
              <Link href="/products" className={`${outlineBtn} h-11 rounded-xl px-[18px]`}>
                {t('cancel')}
              </Link>
              <button type="button" onClick={runImport} disabled={importing || chosenCount === 0} className={`${primaryBtn} h-11 rounded-xl px-[22px]`}>
                {importing ? t('importing', { count: chosenCount }) : t('cta', { count: chosenCount })}
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 'result' && (
        <section className={`${cardClass} flex flex-col gap-4 p-4 sm:p-6`} aria-live="polite">
          {outcome && (outcome.imported > 0 || updated > 0) ? (
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-ar-done-bg text-ar-done">
                <ShellIcon d="M5 12l5 5 9-10" size={22} />
              </span>
              <h2 className="m-0 text-xl font-bold">
                {outcome.imported > 0 ? t('result.done', { count: outcome.imported }) : t('result.updatedOnly', { count: updated })}
              </h2>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-ar-danger-soft text-ar-danger">
                <ShellIcon d={ICONS.close} size={20} />
              </span>
              <h2 className="m-0 text-xl font-bold">{requestError !== null ? t('result.failed') : t('result.none')}</h2>
            </div>
          )}
          {requestError && <p className="m-0 text-[15px] text-ar-danger">{requestError}</p>}
          {outcome && outcome.imported > 0 && updated > 0 && <p className="m-0 text-[15px] text-ar-ink-2">{t('result.updated', { count: updated })}</p>}
          {outcome && outcome.skipped > 0 && (
            <p className="m-0 text-[15px] text-ar-ink-2">{t(byOutlet ? 'result.skippedBranch' : 'result.skipped', { count: outcome.skipped })}</p>
          )}
          {byOutlet && byOutlet.some((o) => o.listed > 0 || o.skipped > 0) && (
            <div data-import-by-outlet className="grid max-w-[720px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
              {byOutlet
                .filter((o) => o.listed > 0 || o.skipped > 0)
                .map((o) => (
                  <div key={o.outletId} className="rounded-xl border border-ar-line-soft px-4 py-3">
                    <h3 className="m-0 mb-1 text-[15px] font-bold text-ar-ink">{branchName(o.outletId)}</h3>
                    <p className="m-0 text-[15px] text-ar-ink-2">
                      {t('result.branchListed', { count: o.listed })}
                      {o.outOfStock > 0 && ` · ${t('result.branchOutOfStock', { count: o.outOfStock })}`}
                    </p>
                    {o.skipped > 0 && <p className="m-0 text-[15px] text-ar-ink-2">{t('result.branchSkipped', { count: o.skipped })}</p>}
                  </div>
                ))}
            </div>
          )}
          {outcome && outcome.imported === 0 && outcome.errors.length > 0 && (
            <p className="m-0 text-[15px] text-ar-ink-2">{t('result.rejected', { count: outcome.errors.length })}</p>
          )}
          {outcome && outcome.errors.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="m-0 text-sm font-bold uppercase tracking-[0.06em] text-ar-muted">{t('result.errorsTitle')}</h3>
              <ul className="m-0 flex max-h-[360px] list-none flex-col overflow-y-auto rounded-xl border border-ar-line-soft p-0">
                {outcome.errors.map((e, i) => (
                  <li key={i} className="flex gap-3 border-t border-ar-subtle px-4 py-2.5 text-sm first:border-t-0">
                    {e.row !== null && <span className="flex-none font-semibold tabular-nums text-ar-ink">{t('result.rowLabel', { row: e.row })}</span>}
                    <span className="min-w-0 break-words text-ar-danger">{e.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Link href="/products" className={primaryBtn}>
              {t('result.toList')}
            </Link>
            <button type="button" onClick={reset} className={outlineBtn}>
              {t('result.again')}
            </button>
          </div>
        </section>
      )}
    </>,
  );
}
