'use client';

/**
 * Nhập khách hàng từ Excel (#526), 3 steps: choose a file → check rows with errors → result.
 * Same parser, column mapping and calls as before (`parseExcelFile`, `CUSTOMER_COLUMN_MAPPING`,
 * `customersApi.downloadSampleFile`, `customersApi.bulkImport`, max 3000 rows). Row checks live in
 * ./import-model (unit-tested); rows with errors are left out instead of blocking the file.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useToast } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { CUSTOMER_COLUMN_MAPPING, customersApi, mapExcelColumnsToFields, parseExcelFile } from '@rentalshop/utils';
import type { CustomerInput } from '@rentalshop/types';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { Skeleton, cardClass, outlineBtn, primaryBtn, type T } from '../../orders/list/parts';
import {
  COLUMNS,
  MAX_IMPORT_ROWS,
  ROWS_STEP,
  acceptsFile,
  badColumn,
  cellOf,
  checkRows,
  clockText,
  counts,
  initialSelection,
  orderRows,
  payloadOf,
  resultOf,
  rowsToSend,
  type ImportResult,
  type ImportRow,
} from './import-model';

type Step = 'choose' | 'check' | 'result';
const STEPS: Step[] = ['choose', 'check', 'result'];
const th = 'px-2 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-ar-muted';
const check = 'h-[18px] w-[18px] cursor-pointer accent-[rgb(var(--ar-primary))] disabled:cursor-not-allowed';
const SHEET_ICON = 'M6 3h9l4 4v14H6zM14 3v5h5M9 12l5 5M14 12l-5 5';
const UPLOAD_ICON = 'M12 16V4M7 9l5-5 5 5M5 20h14';

export default function CustomerImportPage() {
  const t = useTranslations('customers.web.import') as unknown as T;
  const { user, loading: authLoading } = useAuth();
  const { toastError } = useToast();
  const merchantId = Number(user?.merchant?.id || user?.merchantId) || undefined;

  const [step, setStep] = useState<Step>('choose');
  const [fileInfo, setFileInfo] = useState<{ name: string; time: string } | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [errorsFirst, setErrorsFirst] = useState(true);
  const [shown, setShown] = useState(ROWS_STEP);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const total = counts(rows);
  const ordered = useMemo(() => orderRows(rows, errorsFirst), [rows, errorsFirst]);
  const toSend = useMemo(() => rowsToSend(rows, selected), [rows, selected]);
  const validIds = useMemo(() => rows.filter((r) => !r.issue).map((r) => r.index), [rows]);
  const allValidOn = validIds.length > 0 && validIds.every((i) => selected.has(i));

  const downloadSample = async () => {
    setDownloading(true);
    try {
      const blob = await customersApi.downloadSampleFile();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'customers-import-sample.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toastError(t('templateFailed'));
    } finally {
      setDownloading(false);
    }
  };

  const readFile = useCallback(
    async (file: File) => {
      setFileError(null);
      if (!acceptsFile(file.name)) {
        setFileError(t('notSpreadsheet'));
        return;
      }
      setReading(true);
      try {
        const parsed = await parseExcelFile(file);
        if (!parsed.success) {
          setFileError(t('fileFailed', { message: parsed.errors.map((e) => e.message).join('; ') }));
          return;
        }
        if (parsed.data.length === 0) {
          setFileError(t('emptyFile'));
          return;
        }
        if (parsed.data.length > MAX_IMPORT_ROWS) {
          setFileError(t('tooMany', { count: parsed.data.length.toLocaleString('vi-VN'), max: MAX_IMPORT_ROWS.toLocaleString('vi-VN') }));
          return;
        }
        const checked = checkRows(mapExcelColumnsToFields(parsed.data, CUSTOMER_COLUMN_MAPPING));
        setRows(checked);
        setSelected(initialSelection(checked));
        setErrorsFirst(checked.some((r) => r.issue));
        setShown(ROWS_STEP);
        setFileInfo({ name: file.name, time: clockText(new Date()) });
        setRequestFailed(false);
        setStep('check');
      } catch (error) {
        setFileError(t('fileFailed', { message: error instanceof Error ? error.message : String(error) }));
      } finally {
        setReading(false);
      }
    },
    [t],
  );

  const runImport = async () => {
    if (toSend.length === 0) return;
    setImporting(true);
    setRequestFailed(false);
    try {
      const res = await customersApi.bulkImport(toSend.map((r) => payloadOf(r, merchantId)) as unknown as CustomerInput[]);
      // A refused request is toasted by the global API error handler; keep the rows to retry
      if (res.success) {
        setResult(resultOf(res.data, toSend));
        setStep('result');
      } else setRequestFailed(true);
    } catch {
      setRequestFailed(true);
    } finally {
      setImporting(false);
    }
  };

  const restart = () => {
    setStep('choose');
    setRows([]);
    setSelected(new Set());
    setResult(null);
    setFileInfo(null);
    setFileError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const stepIndex = STEPS.indexOf(step);

  if (!merchantId && authLoading) {
    return (
      <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-5 sm:px-8" aria-busy="true">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!merchantId) {
    return (
      <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-5 text-ar-ink sm:px-8">
        <BackLink t={t} />
        <h1 className="m-0 text-2xl font-bold">{t('title')}</h1>
        <p className={`${cardClass} m-0 px-5 py-6 text-[15px] text-ar-muted`}>{t('noMerchant')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-5 text-ar-ink sm:px-8">
      <BackLink t={t} />
      <h1 className="m-0 text-2xl font-bold">{t('title')}</h1>

      <ol aria-label={t('steps.label')} className="m-0 grid list-none grid-cols-3 gap-3 p-0">
        {STEPS.map((s, i) => {
          const current = i === stepIndex;
          return (
            <li key={s} aria-current={current ? 'step' : undefined} className="flex min-w-0 flex-col gap-2">
              <span className={`h-1 rounded-full ${i <= stepIndex ? 'bg-ar-primary' : 'bg-ar-line'}`} />
              <span className={`text-[15px] ${current ? 'font-bold text-ar-primary-ink' : i < stepIndex ? 'font-semibold' : 'font-semibold text-ar-muted'}`}>{t(`steps.${s}`)}</span>
              {s === 'choose' ? (
                <button
                  type="button"
                  onClick={downloadSample}
                  disabled={downloading}
                  className="self-start p-0 text-left text-sm font-semibold text-ar-primary-ink hover:underline disabled:opacity-60"
                >
                  {downloading ? t('templateLoading') : t('template')}
                </button>
              ) : (
                <span className="hidden text-sm text-ar-muted sm:block">{t(s === 'check' ? 'steps.checkHint' : 'steps.resultHint')}</span>
              )}
            </li>
          );
        })}
      </ol>

      {step === 'choose' && (
        <section className={`${cardClass} flex flex-col gap-4 p-4 sm:p-5`}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) readFile(file);
            }}
            className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-10 text-center ${
              dragging ? 'border-ar-primary bg-ar-primary-soft' : 'border-ar-line bg-ar-surface-muted'
            }`}
          >
            <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-xl bg-ar-done-bg text-ar-done">
              <ShellIcon d={reading ? SHEET_ICON : UPLOAD_ICON} size={24} />
            </span>
            {reading ? (
              <span className="flex w-full max-w-[280px] flex-col items-center gap-2" aria-busy="true">
                <span className="text-[15px] font-semibold">{t('drop.reading')}</span>
                <Skeleton className="h-2 w-full" />
              </span>
            ) : (
              <>
                <span className="text-[15px] font-semibold">{t('drop.title')}</span>
                <span className="text-sm text-ar-muted">{t('drop.hint', { max: MAX_IMPORT_ROWS.toLocaleString('vi-VN') })}</span>
                <button type="button" onClick={() => inputRef.current?.click()} className={primaryBtn}>
                  {t('drop.button')}
                </button>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readFile(file);
                e.target.value = '';
              }}
            />
          </div>
          {fileError && (
            <p role="alert" className="m-0 rounded-xl bg-ar-danger-soft px-4 py-3 text-sm font-semibold text-ar-danger">
              {fileError}
            </p>
          )}
          <p className="m-0 text-sm text-ar-muted">{t('columnsHint')}</p>
        </section>
      )}

      {step === 'check' && fileInfo && (
        <section className={`${cardClass} overflow-hidden`}>
          <div className="flex flex-wrap items-center gap-3 border-b border-ar-subtle px-4 py-3.5">
            <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-ar-done-bg text-ar-done">
              <ShellIcon d={SHEET_ICON} size={20} />
            </span>
            <span className="flex min-w-0 flex-[1_1_200px] flex-col">
              <span className="truncate text-[15px] font-semibold">{fileInfo.name}</span>
              <span className="text-sm text-ar-muted">{t('fileRows', { count: total.all, time: fileInfo.time })}</span>
            </span>
            <span className="rounded-lg bg-ar-done-bg px-2.5 py-1 text-sm font-bold text-ar-done">{t('okCount', { count: total.ok })}</span>
            {total.bad > 0 && <span className="rounded-lg bg-ar-danger-soft px-2.5 py-1 text-sm font-bold text-ar-danger">{t('errCount', { count: total.bad })}</span>}
            <button type="button" onClick={restart} className={`${outlineBtn} h-9 px-3 text-sm`}>
              {t('change')}
            </button>
          </div>

          {total.bad > 0 && (
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
                  {ef ? t('filter.errors', { count: total.bad }) : t('filter.all', { count: total.all })}
                </button>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-[15px]">
              <thead>
                <tr className="bg-ar-surface-muted text-left">
                  <th scope="col" className="w-[28px] py-2.5 pl-4">
                    <input
                      type="checkbox"
                      aria-label={t('selectAll')}
                      checked={allValidOn}
                      disabled={validIds.length === 0}
                      onChange={() => setSelected(allValidOn ? new Set() : new Set(validIds))}
                      className={check}
                    />
                  </th>
                  <th scope="col" className={th}>{t('cols.row')}</th>
                  {COLUMNS.map((c) => (
                    <th key={c} scope="col" className={th}>
                      {t(`cols.${c}`)}
                    </th>
                  ))}
                  <th scope="col" className={`${th} pr-4`}>{t('cols.check')}</th>
                </tr>
              </thead>
              <tbody>
                {ordered.slice(0, shown).map((r) => {
                  const bad = badColumn(r);
                  return (
                    <tr key={r.index} className={`border-t border-ar-subtle ${r.issue ? 'bg-ar-danger-soft/40' : ''}`}>
                      <td className="py-2.5 pl-4">
                        <input
                          type="checkbox"
                          aria-label={t('selectRow', { n: r.n })}
                          checked={!r.issue && selected.has(r.index)}
                          disabled={!!r.issue}
                          onChange={() =>
                            setSelected((s) => {
                              const next = new Set(s);
                              if (next.has(r.index)) next.delete(r.index);
                              else next.add(r.index);
                              return next;
                            })
                          }
                          className={check}
                        />
                      </td>
                      <td className="px-2 py-2.5 tabular-nums text-ar-muted">{r.n}</td>
                      {COLUMNS.map((c) => {
                        const v = cellOf(r, c);
                        return (
                          <td
                            key={c}
                            className={`max-w-[220px] truncate px-2 py-2.5 ${
                              bad === c ? 'bg-ar-danger-soft font-semibold text-ar-danger' : v ? 'text-ar-ink' : 'text-ar-faint'
                            } ${c === 'phone' ? 'tabular-nums' : ''}`}
                          >
                            {v || '—'}
                          </td>
                        );
                      })}
                      <td className="py-2.5 pl-2 pr-4">
                        <span className={`whitespace-nowrap text-sm font-semibold ${r.issue ? 'text-ar-danger' : 'text-ar-done'}`}>
                          {r.issue ? t(`issue.${r.issue}`) : t('ok')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {ordered.length > shown && (
            <div className="flex justify-center border-t border-ar-subtle px-4 py-3">
              <button type="button" onClick={() => setShown((n) => n + ROWS_STEP)} className={`${outlineBtn} h-9 text-sm`}>
                {t('more', { count: Math.min(ROWS_STEP, ordered.length - shown) })}
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ar-subtle bg-ar-surface-muted px-4 py-3.5">
            <span className="min-w-0 flex-[1_1_260px] text-sm text-ar-muted">
              {requestFailed ? <span className="font-semibold text-ar-danger">{t('requestFailed')}</span> : t('footerHint')}
            </span>
            <div className="flex gap-2">
              <Link href="/customers" className={`${outlineBtn} h-11 rounded-xl px-[18px]`}>
                {t('cancel')}
              </Link>
              <button type="button" onClick={runImport} disabled={importing || toSend.length === 0} className={`${primaryBtn} h-11 rounded-xl px-[22px]`}>
                {importing ? t('importing') : t('submit', { count: toSend.length })}
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 'result' && result && <ResultCard result={result} onAgain={restart} t={t} />}
    </div>
  );
}

function BackLink({ t }: { t: T }) {
  return (
    <Link href="/customers" className="flex min-h-[32px] items-center gap-1 self-start text-sm font-semibold text-ar-primary-ink no-underline hover:underline">
      <ShellIcon d={ICONS.chevronLeft} size={16} />
      {t('back')}
    </Link>
  );
}

function ResultCard({ result, onAgain, t }: { result: ImportResult; onAgain: () => void; t: T }) {
  const refused = result.failed > 0 || result.errors.length > 0;
  const stat = (label: string, value: number, tone: string) => (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-ar-surface-muted px-4 py-3">
      <span className="text-sm text-ar-muted">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</span>
    </div>
  );
  return (
    <section className={`${cardClass} flex flex-col gap-4 p-4 sm:p-5`} aria-live="polite">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${refused ? 'bg-ar-danger-soft text-ar-danger' : 'bg-ar-done-bg text-ar-done'}`}
        >
          <ShellIcon d={refused ? ICONS.close : 'M5 12l5 5 9-10'} size={20} />
        </span>
        <h2 className="m-0 text-xl font-bold">{refused ? t('result.failedTitle') : t('result.title')}</h2>
      </div>
      {refused ? (
        <p className="m-0 text-[15px] text-ar-ink-2">{t('result.failedBody')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {stat(t('result.imported'), result.imported, 'text-ar-done')}
          {stat(t('result.updated'), result.updated, 'text-ar-ink')}
          {stat(t('result.skipped'), result.skipped, 'text-ar-muted')}
        </div>
      )}
      {result.errors.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-ar-line-soft">
          <div className="bg-ar-surface-muted px-4 py-2 text-xs font-bold uppercase tracking-[0.06em] text-ar-muted">{t('result.errorsTitle')}</div>
          <ul className="m-0 max-h-[360px] list-none overflow-y-auto p-0">
            {result.errors.map((e, i) => (
              <li key={i} className="flex gap-3 border-t border-ar-subtle px-4 py-2.5 text-sm">
                <span className="w-16 flex-none font-semibold tabular-nums text-ar-danger">{e.n !== null ? t('result.errorRow', { n: e.n }) : '—'}</span>
                <span className="min-w-0 break-words text-ar-ink">{e.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onAgain} className={outlineBtn}>
          {t('result.again')}
        </button>
        <Link href="/customers" className={primaryBtn}>
          {t('result.toList')}
        </Link>
      </div>
    </section>
  );
}
