/** SEO team dashboard: shared types. This module imports nothing from the host project. */

export type TeamMonths = 1 | 3 | 6;

export type StageId = "analyse" | "evaluate" | "select" | "write" | "image" | "review" | "publish";

/** Who does the stage today: an AI agent, the owner by hand, both, or nobody yet. */
export type StageMode = "ai" | "owner" | "mixed" | "missing";

export type StageDef = { id: StageId; title: string; does: string };

export type StageMetric = { label: string; value: number; unit?: string; href?: string };

export type StageOutput = { title: string; detail?: string; at: string; href?: string };

/** What the host returns for one stage. `events` are the dates of the things the stage produced inside the window. */
export type StageData = {
  mode: StageMode;
  doer: string;
  headline: { label: string; value: number };
  metrics: StageMetric[];
  events: Date[];
  outputs: StageOutput[];
  note?: string;
  href?: string;
};

export type TeamWindow = { months: TeamMonths; from: Date; to: Date };

export type TeamBucket = { label: string; from: Date; to: Date };

/** The host implements this once; the module does the rest. */
export interface TeamDataSource {
  load(window: TeamWindow): Promise<Record<StageId, StageData>>;
}

export type StageReport = StageDef &
  Omit<StageData, "events"> & {
    n: number;
    /** Count of events per bucket, oldest first; same length as `TeamReport.buckets`. */
    series: number[];
    /** ISO date of the latest event in the window, null when the stage produced nothing. */
    lastAt: string | null;
  };

/** JSON-safe: dates are ISO strings. */
export type TeamReport = {
  months: TeamMonths;
  from: string;
  to: string;
  bucketKind: "week" | "month";
  buckets: { label: string; from: string; to: string }[];
  stages: StageReport[];
};
