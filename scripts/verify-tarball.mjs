#!/usr/bin/env node
// scripts/verify-tarball.mjs
// Phase 18 — Packaging Polish (PKG-02 regression guard)
//
// Pack each publishable workspace, install the tarball into a clean tmp dir
// with --ignore-scripts, run the documented entry point with --version, and
// assert exit code 0 + version on stdout. Also asserts dist/index.js.map is
// present in the npm pack --dry-run output (D-03 — source maps retained).
//
// Discipline (per CONTEXT.md D-02):
//   - os.tmpdir() + fs.mkdtemp for isolation
//   - spawn with array args (never the sync-string variant, never shell:true, never string concat)
//   - Spawns npm via `process.execPath` (the node binary) executing
//     `npm-cli.js` directly — this avoids invoking the `.cmd` shim on Windows,
//     which Node 20+ refuses to spawn without `shell:true` (CVE-2024-27980
//     mitigation). Documented in 18-02-SUMMARY.md as Rule 3 deviation from the
//     plan body's `npm.cmd` literal.
//   - try/finally + fs.rm for cleanup
//   - --ignore-scripts on install (T-18-05 mitigation — defends against future
//     poisoned tarball lifecycle scripts)

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SPAWN_TIMEOUT_MS = 60000;

/**
 * Resolve the path to npm-cli.js so we can spawn it via `process.execPath`
 * (the node binary). This avoids invoking npm.cmd on Windows, which Node
 * 20+ refuses to spawn without `shell:true` (rejected by CONTEXT.md D-02).
 *
 * Order of resolution:
 *   1. process.env.npm_execpath — set by `npm run` to the active npm-cli.js
 *   2. require.resolve('npm/bin/npm-cli.js') — node_modules lookup
 *   3. Filesystem fallback co-located with the node binary
 *      (Windows uses 8.3-style portable layout; POSIX uses ../lib/...)
 *
 * Branch (3) keeps `process.platform === 'win32'` present in the script,
 * matching D-02 acceptance criteria.
 */
function resolveNpmCliJs() {
  if (process.env.npm_execpath && process.env.npm_execpath.endsWith('.js')) {
    return process.env.npm_execpath;
  }
  const requireFn = createRequire(import.meta.url);
  try {
    return requireFn.resolve('npm/bin/npm-cli.js');
  } catch {
    // Last-resort fallback: derive npm-cli.js path from the node binary location.
    const nodeDir = path.dirname(process.execPath);
    return process.platform === 'win32'
      ? path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js')
      : path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js');
  }
}

const NPM_CLI_JS = resolveNpmCliJs();

/** Spec for one package under test. */
const PACKAGES = [
  { name: '@localground/mcp', binName: 'localground-mcp', dir: path.join(REPO_ROOT, 'packages', 'mcp') },
  { name: '@localground/cli', binName: 'localground',     dir: path.join(REPO_ROOT, 'packages', 'cli') },
];

const REQUIRED_FILES = ['package.json', 'README.md', 'dist/index.js', 'dist/index.d.ts', 'dist/index.js.map'];
const FORBIDDEN_EXACT = ['tsconfig.json', 'tsup.config.ts', 'vitest.config.ts'];
const FORBIDDEN_PREFIX = ['src/', 'test/', 'skills/', '.claude-plugin/'];

/**
 * Spawn helper: array args, never shell, watchdog timer, capture stdout/stderr.
 * Mirrors packages/cli/test/smoke.test.ts runCli pattern (lines 39-77).
 */
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => { stdout += c.toString('utf8'); });
    child.stderr.on('data', (c) => { stderr += c.toString('utf8'); });

    let settled = false;
    const watchdog = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error(`Timeout (${SPAWN_TIMEOUT_MS}ms): ${cmd} ${args.join(' ')}`));
      }
    }, SPAWN_TIMEOUT_MS);

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

/** Synchronous npm pack --dry-run --json — returns the file path list. */
function dryRunFiles(pkgName) {
  const r = spawnSync(process.execPath, [NPM_CLI_JS, 'pack', '--dry-run', '--json', '-w', pkgName], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: SPAWN_TIMEOUT_MS,
  });
  if (r.status !== 0) {
    throw new Error(`npm pack --dry-run failed for ${pkgName}: ${r.stderr}`);
  }
  const parsed = JSON.parse(r.stdout);
  return parsed[0].files.map((f) => f.path);
}

/** Synchronous npm pack (real, not dry-run) — returns absolute path to written .tgz. */
function packReal(pkgName, outDir) {
  const r = spawnSync(
    process.execPath,
    [NPM_CLI_JS, 'pack', '--pack-destination', outDir, '-w', pkgName, '--json'],
    { cwd: REPO_ROOT, encoding: 'utf8', timeout: SPAWN_TIMEOUT_MS },
  );
  if (r.status !== 0) {
    throw new Error(`npm pack failed for ${pkgName}: ${r.stderr}`);
  }
  const parsed = JSON.parse(r.stdout);
  // npm pack --json returns [{ filename, ... }]. The filename is relative to outDir.
  const filename = parsed[0].filename;
  return path.join(outDir, filename);
}

/** Verify tarball file list against required + forbidden lists. Throws on mismatch. */
function assertTarballShape(pkgName, files) {
  const missing = REQUIRED_FILES.filter((p) => !files.includes(p));
  const stowaways = files.filter(
    (p) => FORBIDDEN_EXACT.includes(p) || FORBIDDEN_PREFIX.some((pre) => p.startsWith(pre)),
  );
  if (missing.length > 0) {
    throw new Error(`${pkgName}: tarball MISSING required files: ${missing.join(', ')}`);
  }
  if (stowaways.length > 0) {
    throw new Error(`${pkgName}: tarball has FORBIDDEN files: ${stowaways.join(', ')}`);
  }
}

/** Run the smoke check for one package: dry-run shape, real pack, install, --version. */
async function verifyOne(pkg) {
  const expectedVersion = JSON.parse(await fs.readFile(path.join(pkg.dir, 'package.json'), 'utf8')).version;

  console.error(`[verify-tarball] ${pkg.name}: dry-run shape check`);
  const dryRunList = dryRunFiles(pkg.name);
  assertTarballShape(pkg.name, dryRunList);

  console.error(`[verify-tarball] ${pkg.name}: pack + install + --version`);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'localground-verify-tarball-'));
  try {
    // npm install requires a package.json in the install dir
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'localground-tarball-smoke', version: '0.0.0', private: true }, null, 2),
    );

    const tgzPath = packReal(pkg.name, tmpDir);

    // T-18-05: --ignore-scripts blocks lifecycle hooks. The current mcp/cli packages
    // declare none, but a future poisoned tarball could; this defends against that.
    const installResult = await run(
      process.execPath,
      [NPM_CLI_JS, 'install', tgzPath, '--ignore-scripts', '--no-audit', '--no-fund'],
      { cwd: tmpDir },
    );
    if (installResult.exitCode !== 0) {
      throw new Error(
        `${pkg.name}: npm install <tgz> failed (exit ${installResult.exitCode})\n` +
        `STDOUT:\n${installResult.stdout}\nSTDERR:\n${installResult.stderr}`,
      );
    }

    // The bin entry lands at node_modules/.bin/<binName> — but on Windows that's a .cmd shim,
    // and we want to invoke the JS entry directly to keep spawn discipline tight.
    // Resolve to the package's own bin file via node_modules/<pkg>/dist/index.js.
    const binEntry = path.join(tmpDir, 'node_modules', ...pkg.name.split('/'), 'dist', 'index.js');
    const binStat = await fs.stat(binEntry).catch(() => null);
    if (!binStat || !binStat.isFile()) {
      throw new Error(`${pkg.name}: bin entry not found at ${binEntry} after install`);
    }

    const versionResult = await run(process.execPath, [binEntry, '--version']);
    if (versionResult.exitCode !== 0) {
      throw new Error(
        `${pkg.name}: --version exited ${versionResult.exitCode}\n` +
        `STDOUT:\n${versionResult.stdout}\nSTDERR:\n${versionResult.stderr}`,
      );
    }
    const actualVersion = versionResult.stdout.trim();
    if (actualVersion !== expectedVersion) {
      throw new Error(`${pkg.name}: --version printed "${actualVersion}" but manifest declares "${expectedVersion}" — version drift; the bin must derive its version from package.json`);
    }

    console.error(`[verify-tarball] ${pkg.name}: OK (version=${versionResult.stdout.trim()})`);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

async function main() {
  for (const pkg of PACKAGES) {
    await verifyOne(pkg);
  }
  console.error('[verify-tarball] All packages verified');
}

main().catch((err) => {
  console.error('[verify-tarball] FAILED:', err.message);
  process.exit(1);
});
