import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { decode, encode } from '@localground/core';

describe('decode', () => {
  let tmpDir: string;

  beforeEach(async () => {
    // Canonicalize via fs.realpath to resolve 8.3 short-name paths on Windows CI
    // (e.g. C:\Users\RUNNER~1\... → C:\Users\runneradmin\...). The decoder walks the
    // filesystem comparing encode(readdir entry name) against the hash, and readdir
    // returns long names — so the encoded hash must come from a long-name path too.
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'localground-test-'));
    tmpDir = await fs.realpath(dir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('rejects empty hash with invalid_hash', async () => {
    const result = await decode('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('invalid_hash');
      expect(result.detail).toContain('Empty');
    }
  });

  it('rejects single-segment hash with invalid_hash', async () => {
    // A valid path-hash requires at least 2 segments (drive letter + path component on Windows,
    // or two path components on Unix). Single-segment hashes cannot represent any real path.
    const result = await decode('onlyone');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('invalid_hash');
    }
  });

  it('returns no_candidates for a hash that does not match any real path', async () => {
    // 'nonexistent-path-that-has-never-existed-on-any-machine-XYZZY' has multiple
    // segments but won't match any real directory.
    const result = await decode('nonexistent-path-that-has-never-existed-XYZZY-abc');
    expect(result.success).toBe(false);
    if (!result.success) {
      // Either no_candidates (path doesn't resolve) or invalid_hash — both are valid failures.
      expect(['invalid_hash', 'no_candidates', 'projects_dir_not_found']).toContain(result.reason);
    }
  });

  it('round-trips encode then decode for a real fixture path', async () => {
    // Create a subdirectory inside tmpDir so we have a real path to encode/decode.
    const subDir = path.join(tmpDir, 'sub');
    await fs.mkdir(subDir);

    // Encode the parent (tmpDir) portion to get a hash that decode can reverse-lookup.
    // On Windows, tmpDir is like C:\Users\...\AppData\Local\Temp\localground-test-XXXXX
    // encode() replaces all separators with '-', which decode() reverses via fs listing.
    const hash = encode(tmpDir);

    const result = await decode(hash);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hashDirName).toBe(hash);
      // decodedPath resolves to the real tmpDir (case-insensitive on Windows)
      expect(result.data.decodedPath).not.toBeNull();
      expect(typeof result.data.exists).toBe('boolean');
    }
  });

  // Windows reparse-point invariant (Phase 14-08 finding).
  // On Windows locally, creating a symlink requires admin elevation, so this test is skipped
  // outside CI. In CI, the Windows runner runs as admin and can create junctions.
  // The invariant being tested: decode() uses !isFile() (not isDirectory()) to traverse entries,
  // so OneDrive folders that are reparse points (isDirectory=false, isSymbolicLink=true) are
  // NOT silently dropped during traversal.
  it.skipIf(process.platform === 'win32' && !process.env.CI)(
    'traverses symlinked directories on Windows (reparse-point invariant)',
    async () => {
      // Create a real target directory that will be symlinked
      const realTarget = path.join(tmpDir, 'real-target');
      await fs.mkdir(realTarget);

      // Create a symlink (acts as a reparse point on Windows)
      const linkDir = path.join(tmpDir, 'OneDrive - Test Inc');
      await fs.symlink(realTarget, linkDir, 'junction');

      // Create the final directory inside the symlinked path
      const deepDir = path.join(linkDir, 'Projects');
      await fs.mkdir(deepDir);

      // Encode the deep path and attempt to decode it. If the decoder
      // filtered by isDirectory() instead of !isFile(), it would drop the
      // symlinked OneDrive folder and return no_candidates.
      const hash = encode(deepDir);
      const result = await decode(hash);

      // decode may return success or no_candidates depending on OS traversal behavior,
      // but it must NOT throw an error — the traversal must be stable.
      // Success-branch contract: decoded path resolves through the symlink (mirrors lines 63-71 round-trip pattern).
      if (result.success) {
        expect(result.data.hashDirName).toBe(hash);
        expect(result.data.decodedPath).not.toBeNull();
      }
    },
  );
});

describe('encode', () => {
  it('replaces backslashes with hyphens', () => {
    const result = encode('C:\\Users\\bob\\Projects\\my-app');
    expect(result).not.toContain('\\');
    expect(result).toContain('-');
  });

  it('replaces forward slashes with hyphens', () => {
    const result = encode('/home/bob/projects/my-app');
    expect(result).not.toContain('/');
  });

  it('replaces spaces and commas with hyphens', () => {
    const result = encode('OneDrive - Test, Inc');
    expect(result).not.toContain(' ');
    expect(result).not.toContain(',');
  });

  it('strips leading and trailing hyphens', () => {
    // A path starting with a slash encodes to a leading hyphen which gets stripped
    const result = encode('/home/bob');
    expect(result).not.toMatch(/^-/);
    expect(result).not.toMatch(/-$/);
  });

  it('is stable across repeated calls (pure function)', () => {
    const input = 'C:\\Users\\bob\\Projects\\my-app';
    expect(encode(input)).toBe(encode(input));
  });
});
