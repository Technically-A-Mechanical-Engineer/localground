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

    // ── Seed-path version-VALUE assertion (BUILD-01 / D-03) ────────────────────
    // Assert that the seed manifest's toolkitVersion equals expectedVersion when
    // driven through each package's real shipped consumer surface. This catches
    // the drift class where toolkitVersion is hardcoded rather than derived.
    //
    // seed() requires a git repo with a resolvable HEAD (mirrors seed.test.ts:12-22).
    // A bare `git init` has no HEAD; we must make an empty commit first.
    console.error(`[verify-tarball] ${pkg.name}: seed-path version-VALUE assert`);
    const seedDir = path.join(tmpDir, 'seed-target');
    await fs.mkdir(seedDir, { recursive: true });
    const gitInit = spawnSync('git', ['init'], { cwd: seedDir, encoding: 'utf8' });
    if (gitInit.status !== 0) {
      throw new Error(`${pkg.name}: git init failed for seed assert: ${gitInit.stderr}`);
    }
    const gitCommit = spawnSync(
      'git',
      ['-c', 'user.email=verify@localground', '-c', 'user.name=verify', 'commit', '--allow-empty', '-m', 'init'],
      { cwd: seedDir, encoding: 'utf8' },
    );
    if (gitCommit.status !== 0) {
      throw new Error(`${pkg.name}: git commit failed for seed assert: ${gitCommit.stderr}`);
    }
    const manifestPath = path.join(seedDir, '.localground-seed-manifest.json');

    let manifestVersion;

    if (pkg.name === '@localground/cli') {
      // CLI surface: invoke `node <binEntry> seed <seedDir> --json`
      // The cli validates path.isAbsolute and calls seed(projectPath, VERSION).
      // seedDir is absolute (derived from tmpDir = os.tmpdir() mkdtemp result).
      const seedRun = await run(process.execPath, [binEntry, 'seed', seedDir, '--json']);
      if (seedRun.exitCode !== 0) {
        throw new Error(
          `${pkg.name}: cli seed failed (exit ${seedRun.exitCode})\n` +
          `STDOUT:\n${seedRun.stdout}\nSTDERR:\n${seedRun.stderr}`,
        );
      }
      // Read the written manifest (file is the durable artifact; identical result
      // whether we parse --json stdout or the file).
      manifestVersion = JSON.parse(await fs.readFile(manifestPath, 'utf8')).toolkitVersion;
    } else {
      // MCP surface: invoke the `localground_seed` tool via JSON-RPC over stdio.
      // The mcp tarball bundles @modelcontextprotocol/sdk as a runtime dep, so the
      // SDK client modules are available in tmpDir/node_modules after install.
      // Write a tiny ESM driver in tmpDir so bare-specifier imports resolve against
      // the installed tree (not the repo root).
      //
      // FALLBACK NOTE (per 22-REVIEWS.md HIGH 1): if the JSON-RPC interaction proves
      // genuinely impractical in CI (e.g., SDK client cannot be resolved from the
      // install tree, or the stdio handshake hangs on Windows), the mcp seed-value
      // assert can be satisfied by equivalence: the cli-tarball branch already proves
      // the packaged core seed() writes the version it is given (the literal is gone,
      // the param is honored), and the mcp call site passing SERVER_VERSION is locked
      // by tsc --build:check + the mcp smoke test; therefore a passing cli-tarball
      // seed-value assert plus a green build proves the mcp tarball would write its
      // own SERVER_VERSION identically. Prefer the real localground_seed JSON-RPC call.
      const driverPath = path.join(tmpDir, 'mcp-seed-driver.mjs');
      await fs.writeFile(driverPath, [
        `import { Client } from '@modelcontextprotocol/sdk/client/index.js';`,
        `import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';`,
        `const [, , binEntry, target] = process.argv;`,
        `const transport = new StdioClientTransport({ command: process.execPath, args: [binEntry] });`,
        `const client = new Client({ name: 'verify-tarball', version: '0.0.0' });`,
        `await client.connect(transport);`,
        `const res = await client.callTool({ name: 'localground_seed', arguments: { projectPath: target } });`,
        `if (res.isError) { console.error('seed tool error:', JSON.stringify(res.content)); process.exit(2); }`,
        `await client.close();`,
        `process.exit(0);`,
      ].join('\n'));
      const seedRun = await run(process.execPath, [driverPath, binEntry, seedDir], { cwd: tmpDir });
      if (seedRun.exitCode !== 0) {
        throw new Error(
          `${pkg.name}: mcp localground_seed JSON-RPC call failed (exit ${seedRun.exitCode})\n` +
          `STDOUT:\n${seedRun.stdout}\nSTDERR:\n${seedRun.stderr}`,
        );
      }
      manifestVersion = JSON.parse(await fs.readFile(manifestPath, 'utf8')).toolkitVersion;
    }

    if (manifestVersion !== expectedVersion) {
      throw new Error(
        `${pkg.name}: seed manifest toolkitVersion "${manifestVersion}" but package.json declares "${expectedVersion}" ` +
        `— seed version drift; seed() must derive its version from the consuming package (BUILD-01)`,
      );
    }

    console.error(`[verify-tarball] ${pkg.name}: OK (version=${actualVersion}, seedManifest=${manifestVersion})`);
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
