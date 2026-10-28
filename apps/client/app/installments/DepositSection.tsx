'use client';

/**
 * Cài đặt › Thu tiền › "Cách thu cọc" (#1199). Owner only (the API refuses every other role).
 * Two radio rows: "Thu cọc 1 lần" (today's behaviour, shown read-only as two stages) and "Thu cọc theo giai đoạn"
 * (shop templates, cancellation policy). Turning staged mode on asks first, because staff on an old app keep
 * collecting the per-product deposit. Stages of a template are a percentage of the order and a due day;
 * the last stage is the automatic rest and cannot be edited.
 */
import React, { useEffect, useId, useMemo, useState } from 'react';
import { useToast } from '@rentalshop/ui';
import { installmentsApi, type DepositMode, type DepositSettings, type DepositTemplate } from '@rentalshop/utils';
import { cardClass, outlineBtn, primaryBtn, Skeleton, type T } from '../orders/list/parts';
import { fieldClass } from '../orders/create/parts';
import {
  DUE_PRESETS,
  dueOptionsFor,
  dueRuleText,
  dueRuleValue,
  newTemplate,
  parseDueValue,
  percentSum,
  removeTemplate,
  restPercent,
  setDefaultTemplate,
  templateProblem,
  templateSummary,
  templatesOf,
} from './installments-model';
import { useDepositSettings } from './useDepositSettings';

const MAX_STAGES = 3;
const MAX_TEMPLATES = 10;
const smallBtn =
  'inline-flex h-9 items-center justify-center whitespace-nowrap rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 text-sm font-semibold text-ar-ink hover:bg-ar-subtle disabled:opacity-50';
const inputClass = `${fieldClass} font-normal`;

function TemplateEditor({
  template,
  onChange,
  onDefault,
  onRemove,
  canRemove,
  td,
}: {
  template: DepositTemplate;
  onChange: (next: DepositTemplate) => void;
  onDefault: () => void;
  onRemove: () => void;
  canRemove: boolean;
  td: (key: string, values?: Record<string, string | number>) => string;
}) {
  const problem = templateProblem(template);
  const setItem = (index: number, patch: Partial<DepositTemplate['items'][number]>) =>
    onChange({ ...template, items: template.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const rest = restPercent(template.items);
  const sum = percentSum(template.items);
  return (
    <div className="flex flex-col gap-3 border-t border-ar-subtle bg-ar-surface-muted px-4 py-4" data-deposit-template-editor>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ar-ink-2">
        {td('templateName')}
        <input className={inputClass} value={template.name} maxLength={80} onChange={(e) => onChange({ ...template, name: e.target.value })} />
      </label>
      <p className="m-0 text-xs text-ar-muted">{td('templateHint')}</p>
      {template.items.map((item, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-xl border border-ar-line bg-ar-surface px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-ar-ink">{td('stage', { n: index + 1 })}</span>
            {template.items.length > 1 && (
              <button
                type="button"
                className="text-sm font-semibold text-ar-danger hover:underline"
                onClick={() => onChange({ ...template, items: template.items.filter((_, i) => i !== index) })}
              >
                {td('removeStage')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_110px_1fr]">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-ar-muted">
              {td('stageName')}
              <input className={inputClass} value={item.label} maxLength={60} onChange={(e) => setItem(index, { label: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-ar-muted">
              {td('stagePercent')}
              <span className="relative block">
                <input
                  className={`${inputClass} pr-8 tabular-nums`}
                  inputMode="decimal"
                  value={Number.isFinite(item.value) && item.value !== 0 ? String(item.value) : ''}
                  placeholder="0"
                  onChange={(e) => setItem(index, { value: Math.min(100, Number(e.target.value.replace(/[^\d.]/g, '')) || 0) })}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ar-muted">%</span>
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-ar-muted">
              {td('stageDue')}
              <select className={`${inputClass} cursor-pointer`} value={dueRuleValue(item.dueRule)} onChange={(e) => setItem(index, { dueRule: parseDueValue(e.target.value) })}>
                {dueOptionsFor(item.dueRule).map((rule) => (
                  <option key={dueRuleValue(rule)} value={dueRuleValue(rule)}>
                    {dueRuleText(rule, td)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-ar-line bg-ar-surface px-3.5 py-3 text-sm">
        <span className="flex flex-col">
          <span className="font-bold text-ar-ink">{td('restTitle', { n: template.items.length + 1 })}</span>
          <span className="text-xs text-ar-muted">{td('restHint')}</span>
        </span>
        <span className="text-base font-bold tabular-nums text-ar-ink">{rest}%</span>
      </div>
      {template.items.length < MAX_STAGES && (
        <button
          type="button"
          className="self-start text-sm font-semibold text-ar-primary-ink hover:underline"
          onClick={() =>
            onChange({ ...template, items: [...template.items, { label: td('newStageName'), type: 'PERCENT', value: Math.min(30, Math.max(1, rest)), dueRule: DUE_PRESETS[3] }] })
          }
        >
          + {td('addStage')}
        </button>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-ar-line pt-2.5 text-sm">
        <span className="font-bold text-ar-ink">{td('total')}</span>
        <span className={`font-semibold tabular-nums ${problem === 'over' ? 'text-ar-danger' : 'text-ar-done'}`}>
          {td('totalLine', { sum, rest, all: Math.round((sum + rest) * 100) / 100 })}
        </span>
      </div>
      {problem && (
        <p role="alert" className="m-0 text-sm font-medium text-ar-danger">
          {td(`problem.${problem}`)}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {!template.isDefault && (
          <button type="button" className={smallBtn} onClick={onDefault}>
            {td('makeDefault')}
          </button>
        )}
        {canRemove && (
          <button type="button" className={`${smallBtn} text-ar-danger`} onClick={onRemove}>
            {td('removeTemplate')}
          </button>
        )}
      </div>
    </div>
  );
}

export function DepositSection({ t }: { t: T }) {
  const td = (key: string, values?: Record<string, string | number>) => t(`deposit.${key}`, values);
  const { toastSuccess, toastError } = useToast();
  const { settings, loading, setSettings } = useDepositSettings();
  const name = useId();
  const [mode, setMode] = useState<DepositMode>('ONE_TIME');
  const [templates, setTemplates] = useState<DepositTemplate[]>([]);
  const [policy, setPolicy] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = (s: DepositSettings) => {
    setMode(s.depositMode);
    setTemplates(templatesOf(s));
    setPolicy(s.cancellationPolicy || '');
  };
  useEffect(() => {
    if (settings) load(settings);
    // Loaded once per answer from the server
  }, [settings]);

  const baseline = useMemo(
    () => (settings ? JSON.stringify({ m: settings.depositMode, t: templatesOf(settings), p: settings.cancellationPolicy || '' }) : ''),
    [settings]
  );
  const dirty = !!settings && JSON.stringify({ m: mode, t: templates, p: policy }) !== baseline;
  const invalid = mode === 'STAGED' && templates.some((x) => templateProblem(x) !== null);

  if (loading && !settings) return <Skeleton className="h-[320px] w-full" />;
  if (!settings) {
    return (
      <section className={`${cardClass} px-5 py-4 text-sm text-ar-muted`} role="alert">
        {td('loadFailed')}
      </section>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      const res = await installmentsApi.updateDepositSettings({
        depositMode: mode,
        cancellationPolicy: policy.trim(),
        ...(templates.length > 0 ? { templates } : {}),
      });
      if (!res.success || !res.data) throw new Error(res.error || '');
      setSettings(res.data);
      load(res.data);
      toastSuccess(td('saved'));
    } catch (e) {
      toastError(td('saveFailed'), e instanceof Error && e.message ? e.message : '');
    } finally {
      setSaving(false);
    }
  };

  const rows: Array<{ key: DepositMode; title: string; hint: string }> = [
    { key: 'ONE_TIME', title: td('oneTime'), hint: td('oneTimeHint') },
    { key: 'STAGED', title: td('staged'), hint: td('stagedHint') },
  ];

  return (
    <section className={`${cardClass} flex flex-col gap-4 px-5 py-[18px]`} data-deposit-setting>
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-lg font-bold">{td('title')}</h2>
        <p className="m-0 text-sm text-ar-muted">{td('hint')}</p>
      </div>

      <div role="radiogroup" aria-label={td('title')} className="overflow-hidden rounded-xl border border-ar-line">
        {rows.map((r) => (
          <label key={r.key} className="flex min-h-[56px] cursor-pointer items-center gap-3 border-t border-ar-subtle px-4 py-2.5 first:border-t-0">
            <input type="radio" name={name} checked={mode === r.key} disabled={saving} onChange={() => setMode(r.key)} className="h-5 w-5 flex-none" />
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold text-ar-ink">{r.title}</span>
              <span className="text-xs text-ar-muted">{r.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {mode === 'ONE_TIME' && (
        <div className="flex flex-col gap-2" data-deposit-one-time>
          <h3 className="m-0 text-sm font-bold text-ar-ink-2">{td('twoStages')}</h3>
          <ol className="m-0 flex list-none flex-col overflow-hidden rounded-xl border border-ar-line p-0">
            {[1, 2].map((n) => (
              <li key={n} className="flex items-center gap-3 border-t border-ar-subtle px-4 py-3 first:border-t-0">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ar-primary-soft text-sm font-bold text-ar-primary-ink">{n}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold text-ar-ink">{td(n === 1 ? 'stage1Title' : 'stage2Title')}</span>
                  <span className="text-xs text-ar-muted">{td(n === 1 ? 'stage1Hint' : 'stage2Hint')}</span>
                </span>
                <span className="rounded-md bg-ar-subtle px-2 py-0.5 text-xs font-semibold text-ar-ink-2">{td('viewOnly')}</span>
              </li>
            ))}
          </ol>
          <p className="m-0 text-xs text-ar-muted">{td('productDepositNote')}</p>
          <p className="m-0 text-xs text-ar-muted">{td('newOrdersOnly')}</p>
        </div>
      )}

      {mode === 'STAGED' && (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="m-0 text-sm font-bold text-ar-ink-2">{td('templates')}</h3>
              <span className="text-xs text-ar-muted">{td('templateCount', { count: templates.length })}</span>
            </div>
            <ul className="m-0 flex list-none flex-col overflow-hidden rounded-xl border border-ar-line p-0">
              {templates.map((template) => {
                const expanded = open === template.id;
                return (
                  <li key={template.id} className="border-t border-ar-subtle first:border-t-0">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : template.id)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ar-subtle ${expanded ? 'bg-ar-primary-soft' : 'bg-ar-surface'}`}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="font-semibold text-ar-ink">{template.name}</span>
                        <span className="break-words text-xs text-ar-muted">{templateSummary(template, td)}</span>
                      </span>
                      <span className="flex flex-none items-center gap-2">
                        {template.isDefault && <span className="rounded-full bg-ar-done-bg px-2.5 py-0.5 text-xs font-semibold text-ar-done">{td('default')}</span>}
                        <span aria-hidden="true" className="text-ar-muted">
                          {expanded ? '⌄' : '›'}
                        </span>
                      </span>
                    </button>
                    {expanded && (
                      <TemplateEditor
                        template={template}
                        td={td}
                        canRemove={templates.length > 1}
                        onChange={(next) => setTemplates((cur) => cur.map((x) => (x.id === template.id ? next : x)))}
                        onDefault={() => setTemplates((cur) => setDefaultTemplate(cur, template.id))}
                        onRemove={() => {
                          setTemplates((cur) => removeTemplate(cur, template.id));
                          setOpen(null);
                        }}
                      />
                    )}
                  </li>
                );
              })}
              {templates.length < MAX_TEMPLATES && (
                <li className="border-t border-ar-subtle">
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left text-sm font-semibold text-ar-primary-ink hover:bg-ar-subtle"
                    onClick={() => {
                      const created = newTemplate(td('newTemplateName'), td('newStageName'));
                      setTemplates((cur) => [...cur, templates.length === 0 ? { ...created, isDefault: true } : created]);
                      setOpen(created.id);
                    }}
                  >
                    + {td('newTemplate')}
                  </button>
                </li>
              )}
            </ul>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ar-ink-2">
            {td('policy')}
            <textarea
              className={`${fieldClass} h-auto min-h-[96px] resize-y py-2.5 font-normal`}
              value={policy}
              maxLength={1000}
              onChange={(e) => setPolicy(e.target.value)}
              placeholder={td('policyPlaceholder')}
            />
            <span className="text-xs font-normal text-ar-muted">{td('policyHint')}</span>
          </label>
        </>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-ar-subtle pt-3.5">
        <button type="button" className={outlineBtn} disabled={!dirty || saving} onClick={() => load(settings)}>
          {td('cancel')}
        </button>
        <button type="button" className={primaryBtn} disabled={!dirty || saving || invalid} onClick={() => void save()}>
          {saving ? td('saving') : td('save')}
        </button>
      </div>
    </section>
  );
}
