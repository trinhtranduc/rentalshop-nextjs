"use client";

/** Small chart parts for the SEO overview. Numbers stay in ink colours; colour only marks the segment or the bar. */

export type Segment = { key: string; label: string; value: number; color: string };

/** One horizontal bar split by share, with a legend that carries every number. A segment can be picked to see its detail. */
export function SegmentBar({ segments, picked, onPick, unit }: { segments: Segment[]; picked?: string | null; onPick?: (key: string | null) => void; unit: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const shown = segments.filter((s) => s.value > 0);
  return (
    <div>
      <div className="flex h-5 w-full gap-0.5 overflow-hidden rounded" role="img" aria-label={segments.map((s) => `${s.label}: ${s.value} ${unit}`).join(", ")}>
        {total === 0 ? <div className="h-full w-full bg-slate-100" /> : null}
        {shown.map((s) => (
          <div key={s.key} title={`${s.label}: ${s.value} ${unit} (${Math.round((s.value / total) * 100)}%)`} className="h-full first:rounded-l last:rounded-r" style={{ width: `${(s.value / total) * 100}%`, minWidth: 4, background: s.color, opacity: picked && picked !== s.key ? 0.35 : 1 }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-1.5 gap-y-1">
        {segments.map((s) => {
          const body = (
            <>
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="text-base font-semibold tabular-nums text-slate-950">{s.value.toLocaleString("vi-VN")}</span>
              <span className="text-xs text-slate-600">{s.label}</span>
            </>
          );
          return (
            <li key={s.key}>
              {onPick ? (
                <button type="button" onClick={() => onPick(picked === s.key ? null : s.key)} aria-pressed={picked === s.key} className={`flex items-center gap-1.5 rounded-md border px-2 py-1 ${picked === s.key ? "border-slate-900 bg-slate-50" : "border-transparent hover:bg-slate-50"}`}>
                  {body}
                </button>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-1">{body}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export type BarRow = { key: string; label: string; value: number; note?: string };

/** Horizontal bars, longest first as given. One hue: the bar length is the number. Each row can be picked. */
export function BarList({ rows, picked, onPick, color = "#2563eb", max }: { rows: BarRow[]; picked?: string | null; onPick?: (key: string | null) => void; color?: string; max?: number }) {
  const top = Math.max(max ?? 0, ...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-1">
      {rows.map((r) => {
        const on = picked === r.key;
        const body = (
          <>
            <span className="w-[38%] min-w-0 shrink-0 truncate text-left text-sm text-slate-900" title={r.label}>
              {r.label}
            </span>
            <span className="relative h-4 min-w-0 flex-1 rounded bg-slate-100">
              <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${Math.max(2, (r.value / top) * 100)}%`, background: color, opacity: picked && !on ? 0.35 : 1 }} />
            </span>
            <span className="min-w-16 shrink-0 whitespace-nowrap text-right text-sm font-semibold tabular-nums text-slate-950">
              {r.value.toLocaleString("vi-VN")}
              {r.note ? <span className="ml-1 text-[11px] font-normal text-slate-500">{r.note}</span> : null}
            </span>
          </>
        );
        return (
          <li key={r.key}>
            {onPick ? (
              <button type="button" onClick={() => onPick(on ? null : r.key)} aria-pressed={on} title={`${r.label}: ${r.value}`} className={`flex w-full items-center gap-2 rounded-md border px-1.5 py-1 ${on ? "border-slate-900 bg-slate-50" : "border-transparent hover:bg-slate-50"}`}>
                {body}
              </button>
            ) : (
              <span className="flex w-full items-center gap-2 px-1.5 py-1" title={`${r.label}: ${r.value}`}>
                {body}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Collapsed block for the full table or the long text behind a chart. */
export function More({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-semibold text-sky-700 underline-offset-2 hover:underline">{label}</summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

/** The bar of `SegmentBar` alone, for a tile: shares only, the numbers are in the tile's text. */
export function MiniBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div aria-hidden className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded">
      {total === 0 ? <div className="h-full w-full bg-slate-100" /> : null}
      {segments
        .filter((s) => s.value > 0)
        .map((s) => (
          <div key={s.key} className="h-full first:rounded-l last:rounded-r" style={{ width: `${(s.value / total) * 100}%`, minWidth: 3, background: s.color }} />
        ))}
    </div>
  );
}

/** Small columns for counts over time, oldest first. */
export function MiniColumns({ values, labels, color = "#2563eb" }: { values: number[]; labels?: string[]; color?: string }) {
  const top = Math.max(1, ...values);
  return (
    <div aria-hidden className="flex h-8 w-full items-end gap-1">
      {values.map((v, i) => (
        <div key={i} title={labels?.[i] ? `${labels[i]}: ${v}` : String(v)} className="min-w-0 flex-1 rounded-t" style={{ height: v === 0 ? 2 : `${Math.max(12, (v / top) * 100)}%`, background: v === 0 ? "#e2e8f0" : color }} />
      ))}
    </div>
  );
}

/** Trend line under a number. `lowerIsBetter` flips it, so "up" on screen always means better. Needs two points. */
export function Sparkline({ values, lowerIsBetter = false, color = "#2563eb" }: { values: number[]; lowerIsBetter?: boolean; color?: string }) {
  if (values.length < 2) return <div aria-hidden className="h-9" />;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const pts = values.map((v, i) => {
    const t = (v - min) / span;
    return `${((i / (values.length - 1)) * 240).toFixed(1)} ${((lowerIsBetter ? t : 1 - t) * 28 + 4).toFixed(1)}`;
  });
  const line = `M${pts.join(" L")}`;
  return (
    <svg aria-hidden viewBox="0 0 240 36" preserveAspectRatio="none" className="block h-9 w-full">
      <path d={`${line} L240 36 L0 36 Z`} fill={color} fillOpacity={0.1} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Ring split by share with the total in the middle. The legend beside it carries the numbers. */
export function Donut({ segments, unit }: { segments: Segment[]; unit: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const C = 2 * Math.PI * 46;
  let done = 0;
  return (
    <svg role="img" aria-label={segments.map((s) => `${s.label}: ${s.value} ${unit}`).join(", ")} viewBox="0 0 120 120" className="h-[104px] w-[104px] shrink-0">
      <circle cx={60} cy={60} r={46} fill="none" stroke="#f1f5f9" strokeWidth={16} />
      {total > 0
        ? segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const len = (s.value / total) * C;
              const offset = -done;
              done += len;
              return <circle key={s.key} cx={60} cy={60} r={46} fill="none" stroke={s.color} strokeWidth={16} strokeDasharray={`${Math.max(0, len - 2).toFixed(1)} ${(C - len + 2).toFixed(1)}`} strokeDashoffset={offset.toFixed(1)} transform="rotate(-90 60 60)" />;
            })
        : null}
      <text x={60} y={58} textAnchor="middle" className="fill-slate-950 text-[26px] font-bold">
        {total}
      </text>
      <text x={60} y={76} textAnchor="middle" className="fill-slate-500 text-[11px]">
        {unit}
      </text>
    </svg>
  );
}
