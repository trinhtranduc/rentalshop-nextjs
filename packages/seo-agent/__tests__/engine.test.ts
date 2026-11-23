import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ANALYSIS_TRACKS, TEAM_AGENTS, formatIssues, isDue, lintArticle, runAgents, upcomingRuns, type TeamAgentId, type TeamRunHost } from '../entries';

type Row = { batchId: string; agent: TeamAgentId; trigger: string; status: string; summary: string };

function memoryHost(options: { paused?: TeamAgentId[]; fail?: TeamAgentId[] } = {}) {
  const rows: Row[] = [];
  const order: TeamAgentId[] = [];
  const steps = Object.fromEntries(
    TEAM_AGENTS.map((a) => [
      a.id,
      async () => {
        order.push(a.id);
        if (options.fail?.includes(a.id)) throw new Error(`boom ${a.id}`);
        return { status: 'done' as const, summary: `ok ${a.id}` };
      },
    ])
  ) as unknown as TeamRunHost<object>['steps'];
  const host: TeamRunHost<object> = {
    shared: {},
    paused: options.paused ?? [],
    independent: new Set<TeamAgentId>(['site', 'competitor', 'image', 'video', 'translate']),
    steps,
    startRun: async (run) => rows.push({ ...run, status: 'running', summary: '' }) - 1,
    finishRun: async (id, result) => {
      rows[Number(id)] = { ...rows[Number(id)], status: result.status, summary: result.summary };
    },
    skipRun: async (run) => {
      rows.push({ ...run, status: 'skipped' });
    },
    spentUsd: async () => 0,
  };
  return { host, rows, order };
}

describe('@rentalshop/seo-agent', () => {
  it('runs every agent once, analysis first', async () => {
    const { host, rows, order } = memoryHost();
    const results = await runAgents(host, { batchId: 'b1', trigger: 'manual' });
    expect(results.map((r) => r.agent)).toEqual(TEAM_AGENTS.map((a) => a.id));
    expect(results.every((r) => r.status === 'done')).toBe(true);
    expect(rows).toHaveLength(TEAM_AGENTS.length);
    const analysis = new Set<string>(ANALYSIS_TRACKS.flat());
    const firstLater = order.findIndex((id) => !analysis.has(id));
    expect(order.slice(0, firstLater).sort()).toEqual([...analysis].sort());
  });

  it('skips a paused agent, and a failure stops the agents that depend on it', async () => {
    const paused = await runAgents(memoryHost({ paused: ['translate'] }).host, { batchId: 'b2', trigger: 'schedule' });
    expect(paused.find((r) => r.agent === 'translate')?.status).toBe('skipped');

    const failed = await runAgents(memoryHost({ fail: ['evaluate'] }).host, { batchId: 'b3', trigger: 'manual' });
    expect(failed.find((r) => r.agent === 'evaluate')?.status).toBe('failed');
    expect(failed.find((r) => r.agent === 'write')?.status).toBe('skipped');

    const independent = await runAgents(memoryHost({ fail: ['site'] }).host, { batchId: 'b4', trigger: 'manual' });
    expect(independent.find((r) => r.agent === 'evaluate')?.status).toBe('done');
  });

  it('runs one agent alone, even when paused', async () => {
    const { host, rows } = memoryHost({ paused: ['rank'] });
    const results = await runAgents(host, { batchId: 'b5', trigger: 'manual', only: 'rank' });
    expect(results).toEqual([{ agent: 'rank', status: 'done', summary: 'ok rank' }]);
    expect(rows[0].trigger).toBe('single');
  });

  it('computes the schedule and the reviewer checks without a host', () => {
    const weekly = { freq: 'weekly' as const, day: 1, time: '08:00' };
    expect(isDue(weekly, null, new Date('2026-11-23T01:05:00Z'))).toBe(true);
    expect(upcomingRuns(weekly, new Date('2026-11-23T01:05:00Z'), new Date('2026-11-23T05:00:00Z'), 2).map((d) => d.toISOString())).toEqual(['2026-11-30T01:00:00.000Z', '2026-12-07T01:00:00.000Z']);
    expect(formatIssues('<h2>One</h2><p>text</p>')).toHaveLength(1);
    const checks = lintArticle({ title: 'x'.repeat(61), seoDescription: null, thumbnail: null, content: '<p>short</p>' });
    expect(checks).toHaveLength(16);
    expect(checks.every((c) => !c.ok)).toBe(true);
  });

  it('keeps the shared folder free of imports from this repository', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(name)) files.push(path);
      }
    };
    walk(join(__dirname, '..', 'src'));
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const outside = [...readFileSync(file, 'utf8').matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]).filter((spec) => !spec.startsWith('.') && spec !== 'react');
      expect({ file, outside }).toEqual({ file, outside: [] });
    }
  });
});
