// packages/cli/test/smoke.test.ts
// Smoke tests: spawn dist/index.js as a child process, run each of the 7 CLI commands,
// verify exit codes and --json output is parseable.
//
// D-01 thin smoke layer — catches wiring regressions (wrong argument wiring, broken
// JSON serialization, unexpected process crashes) that pure-core tests cannot see.
// All spawns use process.execPath + array args — never shell mode, never execSync.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_PATH = path.resolve(__dirname, '..', 'dist', 'index.js');

// Module-scoped children array — populated by runCli, reaped by per-describe afterEach hooks.
// Each describe block clears its slice via `children.length = 0` in afterEach to avoid bleed.
const children: ChildProcess[] = [];

// EXIT_SUCCESS = 0, EXIT_FAILURE = 1, EXIT_ERROR = 2 (from packages/cli/src/format.ts)
const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;

interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Run the CLI as a child process and collect stdout, stderr, and exit code.
 * Uses process.execPath + array args — never shell: true, never string concat.
 * A watchdog timer kills the process and rejects after 25s to prevent hung tests.
 */
function runCli(args: string[], opts: { cwd?: string } = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [DIST_PATH, ...args], {
      cwd: opts.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(child);

    let stdout = '';
    let stderr = '';
    child.stdout!.on('data', (c: Buffer) => { stdout += c.toString('utf8'); });
    child.stderr!.on('data', (c: Buffer) => { stderr += c.toString('utf8'); });

    let settled = false;
    const watchdog = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error(`CLI run timeout for args: ${args.join(' ')}`));
      }
    }, 25000);

    child.on('close', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(watchdog);
        resolve({ exitCode: code ?? -1, stdout, stderr });
      }
    });

    child.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(watchdog);
        reject(err);
      }
    });
  });
}

/**
 * Reap any child processes still alive at end of test — kills + awaits exit
 * (with 1000ms timeout fallback) to prevent the Vitest cleanup hang that
 * happens when child.kill() is called but exit is never awaited.
 */
async function reapChildren(): Promise<void> {
  for (const c of children) {
    if (c.exitCode === null) {
      c.kill();
      await Promise.race([
        once(c, 'exit'),
        new Promise((r) => setTimeout(r, 1000)),
      ]);
    }
  }
  children.length = 0;
}

// ---------------------------------------------------------------------------
// Read-only commands (no fixture needed)
// ---------------------------------------------------------------------------

describe('CLI smoke: read-only commands', () => {
  afterEach(async () => {
    await reapChildren();
  });

  it('detect --json returns parseable env JSON with platform field', async () => {
    const result = await runCli(['detect', '--json']);
    expect(result.exitCode).toBe(EXIT_SUCCESS);
    const parsed = JSON.parse(result.stdout) as { platform?: unknown };
    expect(parsed).toHaveProperty('platform');
  });
});

// ---------------------------------------------------------------------------
// Commands requiring a filesystem fixture
// ---------------------------------------------------------------------------

describe('CLI smoke: fixture-based commands', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'localground-cli-test-'));
  });

  afterEach(async () => {
    // Order is load-bearing: drain children before fs.rm so a future test that
    // intentionally leaves a child alive cannot hold a Windows file handle inside
    // tmpDir and trigger EBUSY.
    await reapChildren();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // audit with --projects on a local git fixture — avoids auto-discovery which may hit slow cloud paths
  it('audit --projects --json runs on a git-init fixture and returns parseable JSON', async () => {
    const gitInit = spawnSync('git', ['init'], { cwd: tmpDir, encoding: 'utf8' });
    expect(gitInit.status).toBe(0);
    spawnSync(
      'git',
      ['-c', 'user.email=test@test.com', '-c', 'user.name=Test', 'commit', '--allow-empty', '-m', 'init'],
      { cwd: tmpDir, encoding: 'utf8' },
    );

    const result = await runCli(['audit', '--projects', tmpDir, '--json']);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    const parsed = JSON.parse(result.stdout) as { summary?: unknown };
    expect(parsed).toHaveProperty('summary');
  });

  // cleanup-scan requires a dirPath argument; runs against tmpDir (always exits 0 on success)
  it('cleanup-scan --json runs on tmpDir and returns parseable JSON', async () => {
    const result = await runCli(['cleanup-scan', tmpDir, '--json']);
    expect(result.exitCode).toBe(EXIT_SUCCESS);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  // seed requires a git-initialized project; use array args for git (no shell mode, no execSync)
  it('seed runs against a git-init fixture and exits 0', async () => {
    const gitInit = spawnSync('git', ['init'], { cwd: tmpDir, encoding: 'utf8' });
    expect(gitInit.status).toBe(0);

    // Create an initial commit so git tag (used by seed) works
    spawnSync(
      'git',
      ['-c', 'user.email=test@test.com', '-c', 'user.name=Test', 'commit', '--allow-empty', '-m', 'init'],
      { cwd: tmpDir, encoding: 'utf8' },
    );

    const result = await runCli(['seed', tmpDir]);
    expect(result.exitCode).toBe(EXIT_SUCCESS);

    // Seed creates a manifest file; confirm it exists
    const manifestPath = path.join(tmpDir, '.localground-seed-manifest.json');
    const manifestExists = await fs.access(manifestPath).then(() => true, () => false);
    expect(manifestExists).toBe(true);
  });

  // verify requires a previously-seeded project
  it('verify runs against a seeded fixture', async () => {
    const gitInit = spawnSync('git', ['init'], { cwd: tmpDir, encoding: 'utf8' });
    expect(gitInit.status).toBe(0);
    spawnSync(
      'git',
      ['-c', 'user.email=test@test.com', '-c', 'user.name=Test', 'commit', '--allow-empty', '-m', 'init'],
      { cwd: tmpDir, encoding: 'utf8' },
    );

    // First seed the project
    const seedResult = await runCli(['seed', tmpDir]);
    expect(seedResult.exitCode).toBe(EXIT_SUCCESS);

    // Then verify it — should pass (manifest was just planted)
    const verifyResult = await runCli(['verify', tmpDir]);
    expect(verifyResult.exitCode).toBe(EXIT_SUCCESS);
  });

  // reap requires a project; exit code 0 (all checks pass) or 1 (some WARNs) are both acceptable
  it('reap runs against a git-init fixture (exit 0 or 1 accepted)', async () => {
    const gitInit = spawnSync('git', ['init'], { cwd: tmpDir, encoding: 'utf8' });
    expect(gitInit.status).toBe(0);
    spawnSync(
      'git',
      ['-c', 'user.email=test@test.com', '-c', 'user.name=Test', 'commit', '--allow-empty', '-m', 'init'],
      { cwd: tmpDir, encoding: 'utf8' },
    );

    const result = await runCli(['reap', tmpDir]);
    // Exit 0 = all checks pass, exit 1 = at least one WARN/FAIL (expected for a fresh tmpDir)
    expect([EXIT_SUCCESS, EXIT_FAILURE]).toContain(result.exitCode);
  });

  // copy copies src to dst
  it('copy copies fixture files end-to-end', async () => {
    const src = path.join(tmpDir, 'src');
    const dst = path.join(tmpDir, 'dst');
    await fs.mkdir(src);
    await fs.writeFile(path.join(src, 'a.txt'), 'alpha');
    await fs.writeFile(path.join(src, 'b.txt'), 'beta');

    const result = await runCli(['copy', src, dst]);
    expect(result.exitCode).toBe(EXIT_SUCCESS);

    const dstFiles = await fs.readdir(dst);
    expect(dstFiles.sort()).toEqual(['a.txt', 'b.txt']);
  });
});
