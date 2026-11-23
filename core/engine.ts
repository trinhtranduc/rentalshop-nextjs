/**
 * The run engine: which agent runs when, what is skipped, what stops the rest, and what each run records. It knows nothing
 * about a database, an AI provider or a site. The host supplies the steps and the storage through `TeamRunHost`.
 */
import { ANALYSIS_TRACKS, TEAM_AGENTS, type TeamAgentId } from "./teamRun";

export type LogLine = { at: string; text: string };
export type StepOutcome = { status: "done" | "skipped"; summary: string };
export type AgentResult = { agent: TeamAgentId; status: "done" | "skipped" | "failed"; summary: string };
/** What a step receives: the host's shared state, a logger for its own run, and whether it runs alone. */
export type StepContext<S extends object> = S & { log: (text: string) => void; alone: boolean };

export interface TeamRunHost<S extends object> {
  /** State every step of this run shares (for example what an earlier step found). */
  shared: S;
  /** Agents the owner has paused; skipped in a team run, still run when asked for alone. */
  paused: readonly TeamAgentId[];
  /** One function per agent. Throwing marks the run failed. */
  steps: Record<TeamAgentId, (ctx: StepContext<S>) => Promise<StepOutcome>>;
  /** Agents whose failure does not stop the agents after them. */
  independent: ReadonlySet<TeamAgentId>;
  /** Records that an agent started; returns the id used to finish it. */
  startRun(input: { batchId: string; agent: TeamAgentId; trigger: string }): Promise<number | string>;
  finishRun(id: number | string, result: { status: string; summary: string; log: LogLine[]; costUsd: number }): Promise<void>;
  /** Records an agent that did not run, with the reason. */
  skipRun(input: { batchId: string; agent: TeamAgentId; trigger: string; summary: string }): Promise<void>;
  /** Money spent so far this month; a step's cost is the difference around it. Return 0 when nothing is tracked. */
  spentUsd(): Promise<number>;
}

/**
 * One run. A team run: the analysis tracks side by side, then the rest in order. With `only`: that agent alone, even when
 * paused, recorded with the trigger "single". Returns one result per agent that was considered, in team order.
 */
export async function runAgents<S extends object>(host: TeamRunHost<S>, input: { batchId: string; trigger: "schedule" | "manual"; only?: TeamAgentId }): Promise<AgentResult[]> {
  const { batchId, only } = input;
  const trigger = only ? "single" : input.trigger;
  const byId = (id: TeamAgentId) => TEAM_AGENTS.find((a) => a.id === id)!;
  const outcomes = new Map<TeamAgentId, Omit<AgentResult, "agent">>();
  let stopped: string | null = null;

  async function runAgent(agent: (typeof TEAM_AGENTS)[number]): Promise<void> {
    const skip = stopped ? `Không chạy vì khâu "${stopped}" lỗi.` : !only && host.paused.includes(agent.id) ? "Agent đang bị dừng." : null;
    if (skip) {
      await host.skipRun({ batchId, agent: agent.id, trigger, summary: skip });
      outcomes.set(agent.id, { status: "skipped", summary: skip });
      return;
    }
    const lines: LogLine[] = [];
    const log = (text: string) => lines.push({ at: new Date().toISOString(), text });
    const id = await host.startRun({ batchId, agent: agent.id, trigger });
    const spentBefore = await host.spentUsd().catch(() => 0);
    let outcome: Omit<AgentResult, "agent">;
    try {
      log("Bắt đầu.");
      outcome = await host.steps[agent.id]({ ...host.shared, log, alone: Boolean(only) });
    } catch (err) {
      outcome = { status: "failed", summary: err instanceof Error ? err.message.slice(0, 400) : "Lỗi không rõ." };
      if (!host.independent.has(agent.id)) stopped = agent.name;
    }
    log(`Kết thúc: ${outcome.summary}`);
    // Analysis agents run side by side, so a difference around one of them would mix in the others; they are costed at 0.
    const costUsd = agent.phase === "analysis" && !only ? 0 : Math.max(0, (await host.spentUsd().catch(() => spentBefore)) - spentBefore);
    await host.finishRun(id, { status: outcome.status, summary: outcome.summary, log: lines, costUsd });
    outcomes.set(agent.id, outcome);
  }

  if (only) {
    await runAgent(byId(only));
    return [{ agent: only, ...outcomes.get(only)! }];
  }
  await Promise.all(
    ANALYSIS_TRACKS.map(async (track) => {
      for (const id of track) await runAgent(byId(id));
    })
  );
  for (const agent of TEAM_AGENTS) if (agent.phase !== "analysis") await runAgent(agent);
  return TEAM_AGENTS.map((agent) => ({ agent: agent.id, ...outcomes.get(agent.id)! }));
}
