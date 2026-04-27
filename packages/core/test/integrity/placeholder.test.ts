import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { placeholderDetect, detectPlatform } from '@localground/core';

describe('placeholderDetect', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'localground-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns success with hasPlaceholders: false for a normal directory', async () => {
    // Write a few normal (non-zero) files
    await fs.writeFile(path.join(tmpDir, 'readme.txt'), 'hello world', 'utf8');
    await fs.writeFile(path.join(tmpDir, 'data.json'), '{"key":"value"}', 'utf8');

    // Get the current platform to pass as the required second argument
    const platformResult = detectPlatform();
    expect(platformResult.success).toBe(true);
    if (!platformResult.success) return;

    const result = await placeholderDetect(tmpDir, platformResult.data.platform);
    expect(result.success).toBe(true);
    if (result.success) {
      // Normal files with content should not trigger placeholder detection
      expect(result.data.hasPlaceholders).toBe(false);
      expect(result.data.totalFiles).toBeGreaterThanOrEqual(2);
    }
  });

  it('returns dir_not_found for a non-existent directory', async () => {
    const platformResult = detectPlatform();
    expect(platformResult.success).toBe(true);
    if (!platformResult.success) return;

    const missing = path.join(tmpDir, 'does-not-exist');
    const result = await placeholderDetect(missing, platformResult.data.platform);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('dir_not_found');
    }
  });

  // On macOS, .icloud files are detected as placeholders.
  // This test only runs on macOS where the platform-specific detection path is active.
  it.skipIf(process.platform !== 'darwin')(
    'detects .icloud placeholder files on macOS',
    async () => {
      // Create enough .icloud files to exceed the 5% threshold
      for (let i = 0; i < 10; i++) {
        await fs.writeFile(path.join(tmpDir, `.file${i}.icloud`), '', 'utf8');
      }

      const result = await placeholderDetect(tmpDir, 'macos');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasPlaceholders).toBe(true);
        expect(result.data.placeholderCount).toBeGreaterThan(0);
      }
    },
  );

  it('returns structured result with all expected fields', async () => {
    await fs.writeFile(path.join(tmpDir, 'normal.txt'), 'content', 'utf8');

    const platformResult = detectPlatform();
    expect(platformResult.success).toBe(true);
    if (!platformResult.success) return;

    const result = await placeholderDetect(tmpDir, platformResult.data.platform);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.hasPlaceholders).toBe('boolean');
      expect(typeof result.data.placeholderCount).toBe('number');
      expect(typeof result.data.totalFiles).toBe('number');
      expect(typeof result.data.percentage).toBe('number');
      expect(Array.isArray(result.data.details)).toBe(true);
    }
  });
});
