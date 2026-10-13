/**
 * #924 scripts/mobile-e2e/api-local.sh start must never report "healthy" for an API it did not start:
 * - a port that is already listening fails at once (also when `lsof` is not on PATH, e.g. no /usr/sbin);
 * - a port taken by another process while ours starts fails with an ownership message, and the other
 *   process is left running;
 * - our own API (the started process or its child listens) still starts and stops.
 * A fake `npx` on PATH stands in for `next start`; no database is touched.
 */
import { spawn, execFileSync } from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';

jest.setTimeout(60_000);

const SCRIPT = path.resolve(__dirname, '..', 'scripts/mobile-e2e/api-local.sh');
const NODE_DIR = path.dirname(process.execPath);

let tmp: string;
let apiDir: string;
let binDir: string;
let serverJs: string;
const extraPids: number[] = [];

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, () => {
      const port = (s.address() as net.AddressInfo).port;
      s.close(() => resolve(port));
    });
  });
}

function run(args: string[], env: Record<string, string>): Promise<{ code: number | null; out: string }> {
  return new Promise((resolve) => {
    const child = spawn('bash', [SCRIPT, ...args], { env: { ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code, out }));
  });
}

function baseEnv(port: number, pathPrefix = ''): Record<string, string> {
  return {
    HOME: process.env.HOME || tmp,
    PATH: `${pathPrefix}${NODE_DIR}:/usr/bin:/bin:/usr/sbin:/sbin`,
    E2E_API_PORT: String(port),
    E2E_API_DIR: apiDir,
    E2E_OUT: path.join(tmp, 'out'),
    E2E_DATABASE_URL: 'postgresql://nobody@localhost:5432/anyrent_api_local_port_test',
  };
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function writeFakeNpx(body: string) {
  const f = path.join(binDir, 'npx');
  fs.writeFileSync(f, `#!/bin/bash\n${body}\n`);
  fs.chmodSync(f, 0o755);
}

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-local-port-'));
  apiDir = path.join(tmp, 'api');
  binDir = path.join(tmp, 'bin');
  fs.mkdirSync(path.join(apiDir, '.next'), { recursive: true });
  fs.mkdirSync(binDir);
  serverJs = path.join(tmp, 'server.js');
  // A stand-in API: answers /api/health with 200 and writes its pid.
  fs.writeFileSync(
    serverJs,
    `const http=require('http');const fs=require('fs');const [port,pidFile]=process.argv.slice(2);
     http.createServer((q,r)=>{r.writeHead(200);r.end('ok')}).listen(Number(port),()=>{if(pidFile)fs.writeFileSync(pidFile,String(process.pid))});`
  );
});

afterAll(() => {
  for (const pid of extraPids) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* gone */
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

async function startOther(port: number): Promise<number> {
  const pidFile = path.join(tmp, `other-${port}.pid`);
  const child = spawn(process.execPath, [serverJs, String(port), pidFile], { detached: true, stdio: 'ignore' });
  child.unref();
  for (let i = 0; i < 50 && !fs.existsSync(pidFile); i++) await new Promise((r) => setTimeout(r, 100));
  const pid = Number(fs.readFileSync(pidFile, 'utf8'));
  extraPids.push(pid);
  return pid;
}

describe('api-local.sh start: port checks (#924)', () => {
  it('fails when the port is already listening, and leaves that process alone', async () => {
    const port = await freePort();
    const other = await startOther(port);
    writeFakeNpx('echo "fake npx must not run" >&2; exit 3');
    const res = await run(['start'], baseEnv(port, `${binDir}:`));
    expect(res.code).toBe(1);
    expect(res.out).toMatch(new RegExp(`Port ${port} is already in use \\(pid ${other}`));
    expect(res.out).not.toMatch(/API healthy/);
    expect(alive(other)).toBe(true);
  });

  it('finds the listener without /usr/sbin on PATH (lsof lives there on macOS)', async () => {
    const port = await freePort();
    const other = await startOther(port);
    writeFakeNpx('echo "fake npx must not run" >&2; exit 3');
    const env = baseEnv(port);
    env.PATH = `${binDir}:${NODE_DIR}:/usr/bin:/bin`;
    const res = await run(['start'], env);
    expect(res.code).toBe(1);
    expect(res.out).toMatch(new RegExp(`Port ${port} is already in use \\(pid ${other}`));
    expect(alive(other)).toBe(true);
  });

  it('fails when another process answers on the port instead of the API it started', async () => {
    const port = await freePort();
    const otherPidFile = path.join(tmp, `race-${port}.pid`);
    // Our "API" never listens; another process (not our child: its parent exits) takes the port meanwhile.
    writeFakeNpx(`( "${process.execPath}" "${serverJs}" ${port} "${otherPidFile}" & ) ; exec sleep 60`);
    const res = await run(['start'], baseEnv(port, `${binDir}:`));
    const other = Number(fs.readFileSync(otherPidFile, 'utf8'));
    extraPids.push(other);
    expect(res.code).toBe(1);
    expect(res.out).toMatch(new RegExp(`Port ${port} answered but pid ${other} is not the API this script started`));
    expect(res.out).not.toMatch(/API healthy/);
    expect(alive(other)).toBe(true);
    // our own process was stopped
    const ours = Number(res.out.match(/started pid (\d+)/)?.[1]);
    expect(ours).toBeGreaterThan(0);
    expect(alive(ours)).toBe(false);
  });

  it('starts and stops its own API (a child of the started process listens)', async () => {
    const port = await freePort();
    writeFakeNpx(`"${process.execPath}" "${serverJs}" ${port}`);
    const env = baseEnv(port, `${binDir}:`);
    const res = await run(['start'], env);
    expect(res.out).toMatch(/API healthy/);
    expect(res.code).toBe(0);
    const stopped = await run(['stop'], env);
    expect(stopped.code).toBe(0);
    expect(execFileSync('bash', ['-c', `/usr/sbin/lsof -nP -tiTCP:${port} -sTCP:LISTEN || true`]).toString().trim()).toBe('');
  });
});
