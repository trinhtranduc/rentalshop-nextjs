"use client";

/** What the diagram needs from the host: the agents with their latest result, and the rows of the latest runs. */
export type FlowState = {
  running: boolean;
  phases: readonly { id: string; name: string; note: string }[];
  agents: { id: string; person: string; name: string; does: string; phase: string; paused: boolean; last: { status: string; summary: string; startedAt: string } | null }[];
  /** Newest first. `trigger` is "single" when one agent was run alone. */
  runs: { batchId: string; agent: string; status: string; trigger: string }[];
};

type Agent = FlowState["agents"][number];
type Live = "running" | "queued" | "done" | "failed" | "skipped" | "paused" | "idle";

const W = 720;
const H = 1040;
const GUTTER = 140;
const NODE = { w: 200, h: 60 };
/** Top-left corner of each agent's box inside the diagram. */
const POS: Record<string, [number, number]> = {
  analyse: [20, 120],
  rank: [20, 215],
  site: [260, 120],
  competitor: [500, 120],
  evaluate: [260, 340],
  select: [260, 430],
  write: [260, 520],
  image: [260, 610],
  review: [260, 700],
  video: [20, 700],
  publish: [260, 880],
  translate: [260, 970],
};
const OWNER: [number, number] = [260, 790];
/** Each line and the agent it leads into; `arrow` is false for the two side lines that join the middle one. */
const EDGES: { d: string; to: string; arrow: boolean }[] = [
  { d: "M360 60 V90 H120 V114", to: "analyse", arrow: true },
  { d: "M360 60 V114", to: "site", arrow: true },
  { d: "M360 60 V90 H600 V114", to: "competitor", arrow: true },
  { d: "M120 180 V209", to: "rank", arrow: true },
  { d: "M120 275 V310 H360", to: "evaluate", arrow: false },
  { d: "M360 180 V334", to: "evaluate", arrow: true },
  { d: "M600 180 V310 H360", to: "evaluate", arrow: false },
  { d: "M360 400 V424", to: "select", arrow: true },
  { d: "M360 490 V514", to: "write", arrow: true },
  { d: "M360 580 V604", to: "image", arrow: true },
  { d: "M360 670 V694", to: "review", arrow: true },
  { d: "M260 730 H226", to: "video", arrow: true },
  { d: "M360 760 V784", to: "publish", arrow: true },
  { d: "M360 850 V874", to: "publish", arrow: true },
  { d: "M360 940 V964", to: "translate", arrow: true },
];
const BANDS: [number, number][] = [
  [100, 190],
  [325, 175],
  [505, 265],
  [775, 260],
];
export const LIVE_PILL: Record<Live, { label: string; tone: string }> = {
  running: { label: "Đang chạy", tone: "bg-sky-100 text-sky-900" },
  queued: { label: "Chờ tới lượt", tone: "bg-slate-100 text-slate-600" },
  done: { label: "Xong", tone: "bg-emerald-100 text-emerald-900" },
  failed: { label: "Lỗi", tone: "bg-red-100 text-red-900" },
  skipped: { label: "Bỏ qua", tone: "bg-slate-100 text-slate-600" },
  paused: { label: "Đã dừng", tone: "bg-red-100 text-red-900" },
  idle: { label: "Chưa chạy", tone: "bg-slate-100 text-slate-500" },
};

/** What an agent is doing now: its row in the run in progress, else the result of its latest run. */
export function liveStatus(agent: Agent, state: Pick<FlowState, "running" | "runs">): Live {
  if (state.running) {
    const batch = state.runs[0]?.batchId;
    const row = state.runs.find((r) => r.batchId === batch && r.agent === agent.id);
    if (row) return row.status as Live;
    // One agent run alone: the others are not waiting for anything.
    if (state.runs[0]?.trigger !== "single") return agent.paused ? "paused" : "queued";
  }
  if (agent.paused) return "paused";
  return agent.last ? (agent.last.status === "running" ? "failed" : (agent.last.status as Live)) : "idle";
}

/** One team run drawn top to bottom: three analysis branches side by side, joined at the evaluator, then one line down. */
export function TeamFlow({ state, selected, onSelect }: { state: FlowState; selected: string | null; onSelect: (id: string | null) => void }) {
  const live = new Map(state.agents.map((a) => [a.id as string, liveStatus(a, state)]));
  const stroke = (to: string) => {
    const s = live.get(to);
    if (!state.running) return { color: "#94a3b8", width: 2, moving: false };
    if (s === "running") return { color: "#2563eb", width: 4, moving: true };
    return s === "done" || s === "skipped" || s === "failed" ? { color: "#0f172a", width: 2, moving: false } : { color: "#94a3b8", width: 2, moving: false };
  };
  const phaseOn = (id: string) => state.running && state.agents.some((a) => a.phase === id && live.get(a.id) === "running");
  const waiting = state.agents.find((a) => a.id === "publish")?.last?.summary ?? "";

  return (
    <div className="overflow-x-auto">
      <style>{"@keyframes seoFlowDash{to{stroke-dashoffset:-16}}@keyframes seoFlowRing{0%{box-shadow:0 0 0 0 rgba(2,132,199,.55)}100%{box-shadow:0 0 0 12px rgba(2,132,199,0)}}@media (prefers-reduced-motion: reduce){.seo-flow-move{animation:none!important}}"}</style>
      <div className="relative mx-auto" style={{ width: W + GUTTER, height: H }}>
        {state.phases.map((p, i) => (
          <div key={p.id} className={`absolute left-0 rounded-lg border border-dashed ${phaseOn(p.id) ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-slate-50"}`} style={{ top: BANDS[i][0], height: BANDS[i][1], width: W + GUTTER }}>
            <p className="absolute left-2.5 top-2 w-[120px] text-xs leading-snug text-slate-600">
              <b className="block text-sm text-slate-950">
                {i + 1}. {p.name}
              </b>
              {p.note}
            </p>
          </div>
        ))}
        <svg aria-hidden viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute top-0" style={{ left: GUTTER }}>
          <defs>
            <marker id="seo-flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M0 0 L10 5 L0 10 Z" fill="#475569" />
            </marker>
          </defs>
          {EDGES.map((e) => {
            const s = stroke(e.to);
            return (
              <path
                key={e.d}
                d={e.d}
                fill="none"
                stroke={s.color}
                strokeWidth={s.width}
                strokeLinejoin="round"
                strokeDasharray={s.moving ? "8 8" : undefined}
                className={s.moving ? "seo-flow-move" : undefined}
                style={s.moving ? { animation: "seoFlowDash .6s linear infinite" } : undefined}
                markerEnd={e.arrow ? "url(#seo-flow-arrow)" : undefined}
              />
            );
          })}
          <path d="M460 724 H530 V556 H466" fill="none" stroke="#b45309" strokeWidth={2} strokeDasharray="5 5" markerEnd="url(#seo-flow-arrow)" />
          <g fontSize={12} fill="#475569">
            <text x={132} y={304}>từ khoá tụt hạng</text>
            <text x={372} y={262}>hiện trạng trang</text>
            <text x={500} y={304}>ai đứng trên mình</text>
            <text x={538} y={644} fill="#92400e">Chưa đạt: bạn sửa</text>
            <text x={538} y={660} fill="#92400e">hoặc cho viết lại</text>
          </g>
        </svg>
        <div className="absolute flex flex-col items-center justify-center rounded-full bg-slate-900 text-xs leading-snug text-white" style={{ left: GUTTER + 260, top: 10, width: NODE.w, height: 50 }}>
          <b>Bắt đầu lượt chạy</b>
          Theo lịch hoặc chạy tay
        </div>
        {state.agents.map((a) => {
          const at = POS[a.id];
          if (!at) return null;
          const s = live.get(a.id) ?? "idle";
          const on = selected === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(on ? null : a.id)}
              aria-pressed={on}
              title={a.last?.summary ?? a.does}
              className={`absolute flex flex-col justify-center gap-1 rounded-lg px-2.5 text-left ${
                s === "running"
                  ? "seo-flow-move z-10 border-[3px] border-sky-600 bg-sky-50"
                  : `border-2 bg-white ${on ? "border-slate-900" : s === "failed" || s === "paused" ? "border-red-300" : "border-slate-200 hover:border-slate-400"} ${state.running && s === "queued" ? "opacity-60" : ""}`
              } ${on && s === "running" ? "outline outline-2 outline-offset-2 outline-slate-900" : ""}`}
              style={{ left: GUTTER + at[0], top: at[1], width: NODE.w, height: NODE.h, ...(s === "running" ? { animation: "seoFlowRing 1.2s ease-out infinite" } : {}) }}
              aria-current={s === "running" ? "step" : undefined}
            >
              <span className="truncate text-[13px] text-slate-600">
                <b className="font-semibold text-slate-950">{a.person}</b> · {a.name}
              </span>
              <span className="flex items-center gap-1.5">
                {s === "running" ? <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-sky-600" /> : null}
                <span className={`rounded-full px-2 py-px text-[11px] font-semibold ${LIVE_PILL[s].tone}`}>{LIVE_PILL[s].label}</span>
              </span>
            </button>
          );
        })}
        <div className="absolute flex flex-col justify-center gap-0.5 rounded-lg border-2 border-amber-300 bg-amber-50 px-2.5" style={{ left: GUTTER + OWNER[0], top: OWNER[1], width: NODE.w, height: NODE.h }} title={waiting}>
          <span className="text-[13px] font-semibold text-amber-950">◆ Bạn duyệt</span>
          <span className="truncate text-[11px] text-amber-900">Đội không tự đăng bài</span>
        </div>
      </div>
    </div>
  );
}
