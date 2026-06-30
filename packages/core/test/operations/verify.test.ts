import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { seed, verify } from '@localground/core';

/**
 * Initialize a git repo in the given directory with an empty initial commit.
 * Uses spawnSync with array args (never execSync or shell: true — security mandate).
 */
function initGitRepo(dir: string): void {
  const initResult = spawnSync('git', ['init'], { cwd: dir, encoding: 'utf8' });
  if (initResult.status !== 0) {
    throw new Error(`git init failed: ${initResult.stderr}`);
  }
  spawnSync(
    'git',
    ['-c', 'user.email=test@example.com', '-c', 'user.name=Test', 'commit', '--allow-empty', '-m', 'init'],
    { cwd: dir, encoding: 'utf8' },
  );
}

describe('verify', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'localground-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns success with allPassed: true for a freshly-seeded fixture', async () => {
    initGitRepo(tmpDir);
    const seedResult = await seed(tmpDir, '9.9.9-test');
    expect(seedResult.success).toBe(true);

    // verify() auto-resolves manifest path to projectPath/.localground-seed-manifest.json
    const result = await verify(tmpDir);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allPassed).toBe(true);
      expect(Array.isArray(result.data.results)).toBe(true);
      expect(result.data.results.length).toBeGreaterThanOrEqual(1);

      // Every marker should have passed
      for (const markerResult of result.data.results) {
        expect(markerResult.passed).toBe(true);
      }
    }
  });

  it('includes the manifestPath in the result', async () => {
    initGitRepo(tmpDir);
    await seed(tmpDir, '9.9.9-test');

    const result = await verify(tmpDir);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.manifestPath).toContain('.localground-seed-manifest.json');
    }
  });

  it('returns manifest_not_found when no manifest exists', async () => {
    // No seed() called — manifest file doesn't exist
    const result = await verify(tmpDir);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('manifest_not_found');
    }
  });

  it('returns manifest_parse_error for a malformed manifest file', async () => {
    // Write garbage JSON to the manifest path
    const manifestPath = path.join(tmpDir, '.localground-seed-manifest.json');
    await fs.writeFile(manifestPath, 'this is not valid JSON {{{', 'utf8');

    const result = await verify(tmpDir);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('manifest_parse_error');
    }
  });

  it('accepts an explicit manifestPath argument', async () => {
    initGitRepo(tmpDir);
    await seed(tmpDir, '9.9.9-test');

    // Pass the manifest path explicitly (same as default)
    const explicitManifestPath = path.join(tmpDir, '.localground-seed-manifest.json');
    const result = await verify(tmpDir, explicitManifestPath);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.manifestPath).toBe(explicitManifestPath);
    }
  });
});
