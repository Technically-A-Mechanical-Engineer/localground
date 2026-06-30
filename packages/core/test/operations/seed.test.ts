import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { seed } from '@localground/core';

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

describe('seed', () => {
  let tmpDir: string;

  const TOOLKIT_VERSION = '9.9.9-test';

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'localground-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns success with a manifest on a valid git repo', async () => {
    initGitRepo(tmpDir);

    const result = await seed(tmpDir, TOOLKIT_VERSION);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(1);
      expect(result.data.projectPath).toBe(tmpDir);
      expect(result.data.projectName).toBe(path.basename(tmpDir));
      expect(Array.isArray(result.data.markers)).toBe(true);
      expect(result.data.markers.length).toBeGreaterThanOrEqual(2);

      // Verify marker types are present
      const types = result.data.markers.map((m) => m.type);
      expect(types).toContain('test-file');
      expect(types).toContain('git-tag');
    }
  });

  it('creates the seed test file on disk', async () => {
    initGitRepo(tmpDir);
    const result = await seed(tmpDir, TOOLKIT_VERSION);
    expect(result.success).toBe(true);

    // The test file should exist after seeding
    const testFilePath = path.join(tmpDir, '.localground-seed-test');
    const exists = await fs.access(testFilePath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('creates the manifest file on disk', async () => {
    initGitRepo(tmpDir);
    const result = await seed(tmpDir, TOOLKIT_VERSION);
    expect(result.success).toBe(true);

    const manifestPath = path.join(tmpDir, '.localground-seed-manifest.json');
    const exists = await fs.access(manifestPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('returns test_file_exists on second call (idempotent refusal)', async () => {
    // Per STATE.md Phase 13 decision: seed is idempotentHint: false.
    // seed() checks for the test file before writing — repeated calls fail by design.
    initGitRepo(tmpDir);

    const first = await seed(tmpDir, TOOLKIT_VERSION);
    expect(first.success).toBe(true);

    const second = await seed(tmpDir, TOOLKIT_VERSION);
    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.reason).toBe('test_file_exists');
    }
  });

  it('returns not_a_git_repo for a directory with no .git folder', async () => {
    // tmpDir has no git init — seed should refuse with not_a_git_repo
    const result = await seed(tmpDir, TOOLKIT_VERSION);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('not_a_git_repo');
    }
  });

  it('returns not_a_directory for a non-existent path', async () => {
    const missing = path.join(tmpDir, 'does-not-exist');
    const result = await seed(missing, TOOLKIT_VERSION);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('not_a_directory');
    }
  });

  it('writes the toolkitVersion passed to seed() into the manifest', async () => {
    initGitRepo(tmpDir);
    const result = await seed(tmpDir, TOOLKIT_VERSION);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.toolkitVersion).toBe(TOOLKIT_VERSION);   // value-equality, not shape
    }
  });
});
