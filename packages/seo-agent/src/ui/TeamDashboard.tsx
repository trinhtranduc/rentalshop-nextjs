"use client";

import { Fragment, type ComponentType, type ReactNode } from "react";
import type { StageMode, StageReport, TeamMonths, TeamReport } from "../core/types";

type LinkProps = { href: string; className?: string; children: ReactNode };
export type TeamLink = ComponentType<LinkProps>;

const PlainLink: TeamLink = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

const MODE: Record<StageMode, { label: string; badge: string; dot: string }> = {
  ai: { label: "AI làm", badge: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  mixed: { label: "AI + bạn", badge: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  owner: { label: "Bạn làm tay", badge: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  missing: { label: "Chưa có agent", badge: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
};

const num = (n: number) => n.toLocaleString("vi-VN");
const metric = (value: number, unit?: string) => (unit === "USD" ? `$${value.toFixed(2)}` : `${num(value)}${unit ? ` ${unit}` : ""}`);
const day = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
};

const PERIODS: { value: TeamMonths; label: string }[] = [
  { value: 1, label: "1 tháng" },
  { value: 3, label: "3 tháng" },
  { value: 6, label: "6 tháng" },
];

export function PeriodToggle({ value, onChange }: { value: TeamMonths; onChange: (months: TeamMonths) => void }) {
  return (
    <div className="flex gap-1.5" role="tablist" aria-label="Khoảng thời gian">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          role="tab"
          aria-selected={value === p.value}
          onClick={() => onChange(p.value)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${value === p.value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function ModeBadge({ mode }: { mode: StageMode }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${MODE[mode].badge}`}>{MODE[mode].label}</span>;
}

/** The seven stages in one row, with the headline number of each. Scrolls sideways on narrow screens. */
function Pipeline({ stages }: { stages: StageReport[] }) {
  return (
    <section aria-label="Dây chuyền" className="overflow-x-auto rounded-md border border-slate-200 bg-white p-3">
      <ol className="flex min-w-max items-stretch gap-1">
        {stages.map((s, i) => (
          <Fragment key={s.id}>
            {i > 0 ? (
              <li aria-hidden className="flex items-center px-0.5 text-slate-300">
                →
              </li>
            ) : null}
            <li className="min-w-36 flex-1 rounded-md border border-slate-200 bg-slate-50 p-2.5">
              <a href={`#stage-${s.id}`} className="block">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <span className={`h-2 w-2 rounded-full ${MODE[s.mode].dot}`} />
                  {s.n}. {MODE[s.mode].label}
                </span>
                <span className="mt-1 block text-sm font-semibold leading-tight text-slate-950">{s.title}</span>
                <span className={`mt-2 block text-2xl font-semibold ${s.headline.value > 0 ? "text-slate-950" : "text-slate-300"}`}>{num(s.headline.value)}</span>
                <span className="block text-[11px] leading-tight text-slate-500">{s.headline.label}</span>
              </a>
            </li>
          </Fragment>
        ))}
      </ol>
    </section>
  );
}

function StageCard({ s, Link }: { s: StageReport; Link: TeamLink }) {
  return (
    <article id={`stage-${s.id}`} className="scroll-mt-4 rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-950">
          {s.n}. {s.title}
        </h3>
        <ModeBadge mode={s.mode} />
      </div>
      <p className="mt-1 text-xs text-slate-600">{s.does}</p>
      <p className="mt-1 text-xs text-slate-500">
        <b className="font-semibold text-slate-700">Ai làm:</b> {s.doer}
        {s.lastAt ? ` · gần nhất ${day(s.lastAt)}` : " · chưa có hoạt động trong kỳ"}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {s.metrics.map((m) => (
          <div key={m.label} className="rounded-md bg-slate-50 px-2.5 py-2">
            <dd className={`text-lg font-semibold ${m.value > 0 ? "text-slate-950" : "text-slate-400"}`}>{metric(m.value, m.unit)}</dd>
            <dt className="text-[11px] leading-tight text-slate-500">{m.label}</dt>
          </div>
        ))}
      </dl>

      <h4 className="mt-3 text-xs font-semibold text-slate-700">Sản phẩm gần nhất</h4>
      {s.outputs.length === 0 ? (
        <p className="mt-1 text-xs text-slate-400">Chưa có gì trong kỳ này.</p>
      ) : (
        <ul className="mt-1 divide-y divide-slate-100">
          {s.outputs.map((o, i) => (
            <li key={`${o.title}-${o.at}-${i}`} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="min-w-0">
                {o.href ? (
                  <Link href={o.href} className="font-medium text-slate-900 underline-offset-2 hover:underline">
                    {o.title}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-900">{o.title}</span>
                )}
                {o.detail ? <span className="block text-xs text-slate-500">{o.detail}</span> : null}
              </span>
              <time dateTime={o.at} className="shrink-0 text-xs text-slate-400">
                {day(o.at)}
              </time>
            </li>
          ))}
        </ul>
      )}

      {s.note ? <p className="mt-3 rounded-md bg-slate-50 px-2.5 py-2 text-xs text-slate-600">{s.note}</p> : null}
      {s.href ? (
        <p className="mt-3">
          <Link href={s.href} className="text-xs font-semibold text-sky-700 underline-offset-2 hover:underline">
            Mở trang làm việc →
          </Link>
        </p>
      ) : null}
    </article>
  );
}

/** Stage by time: how many things each stage produced in each week or month of the period. */
function Timeline({ report }: { report: TeamReport }) {
  const max = Math.max(1, ...report.stages.flatMap((s) => s.series));
  return (
    <section aria-label="Sản lượng theo thời gian" className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">Sản lượng theo {report.bucketKind === "week" ? "tuần" : "tháng"}</h2>
      <p className="mt-1 text-xs text-slate-500">
        Số sản phẩm mỗi khâu tạo ra. {report.bucketKind === "week" ? "Mỗi cột là 7 ngày, tính lùi từ hôm nay." : "Mỗi cột là một tháng dương lịch; cột đầu có thể không đủ tháng."}
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th scope="col" className="py-1.5 pr-3 font-medium">
                Khâu
              </th>
              {report.buckets.map((b) => (
                <th key={b.from} scope="col" className="px-2 py-1.5 text-right font-medium">
                  {b.label}
                </th>
              ))}
              <th scope="col" className="py-1.5 pl-3 text-right font-medium">
                Tổng
              </th>
            </tr>
          </thead>
          <tbody>
            {report.stages.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <th scope="row" className="py-1.5 pr-3 text-left font-medium text-slate-800">
                  {s.n}. {s.title}
                </th>
                {s.series.map((v, i) => (
                  <td key={report.buckets[i].from} className="px-2 py-1.5 text-right">
                    <span
                      className={`inline-block min-w-8 rounded px-1.5 py-0.5 ${v === 0 ? "text-slate-300" : v / max > 0.5 ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-900"}`}
                    >
                      {num(v)}
                    </span>
                  </td>
                ))}
                <td className="py-1.5 pl-3 text-right font-semibold text-slate-950">{num(s.series.reduce((a, b) => a + b, 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Read-only view of a `TeamReport`. Pass the host router's link component as `Link` for client-side navigation. */
export function TeamDashboard({ report, Link = PlainLink }: { report: TeamReport; Link?: TeamLink }) {
  const gaps = report.stages.filter((s) => s.mode === "missing");
  return (
    <div className="space-y-3">
      <Pipeline stages={report.stages} />
      {gaps.length > 0 ? (
        <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          <b className="font-semibold text-slate-800">Khâu chưa có agent:</b> {gaps.map((s) => s.title).join(", ")}. Các khâu này đang do bạn làm tay hoặc chưa làm.
        </p>
      ) : null}
      <Timeline report={report} />
      <section aria-label="Chi tiết từng khâu" className="grid gap-3 xl:grid-cols-2">
        {report.stages.map((s) => (
          <StageCard key={s.id} s={s} Link={Link} />
        ))}
      </section>
    </div>
  );
}
