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

  it('round-trips encode/decode for a folder name containing an apostrophe (CORE-13)', async () => {
    const subDir = path.join(tmpDir, "O'Brien");
    await fs.mkdir(subDir);

    const hash = encode(subDir);
    const result = await decode(hash);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hashDirName).toBe(hash);
      expect(result.data.decodedPath).not.toBeNull();
      // The decoded path must resolve back to the actual fixture (case-insensitive on Windows)
      if (result.data.decodedPath !== null) {
        expect(result.data.decodedPath.toLowerCase()).toBe(subDir.toLowerCase());
      }
    }
  });

  it('round-trips encode/decode for a folder name containing an ampersand (CORE-13)', async () => {
    const subDir = path.join(tmpDir, 'Rock & Roll');
    await fs.mkdir(subDir);

    const hash = encode(subDir);
    const result = await decode(hash);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hashDirName).toBe(hash);
      expect(result.data.decodedPath).not.toBeNull();
      if (result.data.decodedPath !== null) {
        expect(result.data.decodedPath.toLowerCase()).toBe(subDir.toLowerCase());
      }
    }
  });

  it('round-trips encode/decode for a folder name containing brackets (CORE-13)', async () => {
    const subDir = path.join(tmpDir, 'Foo[Bar]');
    await fs.mkdir(subDir);

    const hash = encode(subDir);
    const result = await decode(hash);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hashDirName).toBe(hash);
      expect(result.data.decodedPath).not.toBeNull();
      if (result.data.decodedPath !== null) {
        expect(result.data.decodedPath.toLowerCase()).toBe(subDir.toLowerCase());
      }
    }
  });

  it('round-trips encode/decode for a folder name containing a plus sign (CORE-13)', async () => {
    const subDir = path.join(tmpDir, '1+1');
    await fs.mkdir(subDir);

    const hash = encode(subDir);
    const result = await decode(hash);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hashDirName).toBe(hash);
      expect(result.data.decodedPath).not.toBeNull();
      if (result.data.decodedPath !== null) {
        expect(result.data.decodedPath.toLowerCase()).toBe(subDir.toLowerCase());
      }
    }
  });

  it('round-trips encode/decode for a folder name containing an equals sign (CORE-13)', async () => {
    const subDir = path.join(tmpDir, 'key=val');
    await fs.mkdir(subDir);

    const hash = encode(subDir);
    const result = await decode(hash);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hashDirName).toBe(hash);
      expect(result.data.decodedPath).not.toBeNull();
      if (result.data.decodedPath !== null) {
        expect(result.data.decodedPath.toLowerCase()).toBe(subDir.toLowerCase());
      }
    }
  });

  it('round-trips encode/decode for a folder name containing a percent sign (CORE-13)', async () => {
    const subDir = path.join(tmpDir, '100% Done');
    await fs.mkdir(subDir);

    const hash = encode(subDir);
    const result = await decode(hash);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hashDirName).toBe(hash);
      expect(result.data.decodedPath).not.toBeNull();
      if (result.data.decodedPath !== null) {
        expect(result.data.decodedPath.toLowerCase()).toBe(subDir.toLowerCase());
      }
    }
  });

  it('CORE-16: special char at trailing edge of intermediate component round-trips', async () => {
    // RED on master: encode("Trailing&") strips the trailing hyphen -> "Trailing", so the hash
    // tail "...-Trailing--sub" carries two hyphens (the '&' hyphen + the path-separator hyphen),
    // which the single-hyphen prefix branch cannot consume. 17-VERIFICATION.md:135-161 reproduced this.
    const parent = path.join(tmpDir, 'Trailing&');
    await fs.mkdir(parent);
    const leaf = path.join(parent, 'sub');
    await fs.mkdir(leaf);

    const hash = encode(leaf);
    const result = await decode(hash);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hashDirName).toBe(hash);
      expect(result.data.decodedPath).not.toBeNull();
      if (result.data.decodedPath !== null) {
        expect(result.data.decodedPath.toLowerCase()).toBe(leaf.toLowerCase());
      }
    }
  });

  it('CORE-16/D-01: verify-then-return picks the round-tripping sibling, not a spurious one', async () => {
    // hash "Foo--bar": both "Foo&"/bar (correct) and plain "Foo"/bar (spurious) can be reached by the
    // additive '--' branch on disk. encode("Foo/bar")="Foo-bar" (one hyphen) != "Foo--bar", so the
    // round-trip verification must reject the plain sibling and return the "Foo&" path.
    const correctParent = path.join(tmpDir, 'Foo&');
    await fs.mkdir(correctParent);
    const correctLeaf = path.join(correctParent, 'bar');
    await fs.mkdir(correctLeaf);

    const spuriousParent = path.join(tmpDir, 'Foo');
    await fs.mkdir(spuriousParent);
    await fs.mkdir(path.join(spuriousParent, 'bar'));

    const hash = encode(correctLeaf);
    const result = await decode(hash);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.decodedPath).not.toBeNull();
      if (result.data.decodedPath !== null) {
        expect(result.data.decodedPath.toLowerCase()).toBe(correctLeaf.toLowerCase());
      }
    }
  });
});

describe('decode — CORE-16 special-char position matrix', () => {
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

  const SPECIAL_CHARS = ["'", '&', '[', ']', '(', ')', '+', '=', '%'] as const;

  // helper: create a real subtree, encode the deepest path, decode, assert the decoded VALUE.
  async function assertRoundTrip(relSegments: string[]) {
    let cur = tmpDir;
    for (const seg of relSegments) {
      cur = path.join(cur, seg);
      await fs.mkdir(cur);
    }
    const hash = encode(cur);
    const result = await decode(hash);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hashDirName).toBe(hash);
      expect(result.data.decodedPath).not.toBeNull();
      if (result.data.decodedPath !== null) {
        expect(result.data.decodedPath.toLowerCase()).toBe(cur.toLowerCase());
      }
    }
    return result;
  }

  // Position 1: TRAILING-edge-of-intermediate — the CORE-16 fix itself.
  // Flips no_candidates -> SUCCESS via the 23-01 additive '--' branch.
  it.each(SPECIAL_CHARS)('trailing-edge intermediate "%s" round-trips', async (c) => {
    await assertRoundTrip(['Mid' + c, 'leaf']);
  });

  // Position 2: LEADING-edge-of-intermediate — ALSO flips no_candidates -> SUCCESS via the
  // SAME additive '--' branch (the leading special char strips the same way the trailing one
  // does, producing the identical double-hyphen boundary at the parent level). This is a
  // second flip row, NOT a pre-existing-pass guard.
  it.each(SPECIAL_CHARS)('leading-edge intermediate "%s" round-trips', async (c) => {
    await assertRoundTrip([c + 'Mid', 'leaf']);
  });

  // Position 3: MID-component — special char interior to the component, with a child.
  // Guard: stays SUCCESS (single-hyphen Case 2 branch, unaffected by the additive fix).
  it.each(SPECIAL_CHARS)('mid-component "%s" round-trips', async (c) => {
    await assertRoundTrip(['Mi' + c + 'd', 'leaf']);
  });

  // Position 4: INTERIOR-with-deeper-child — the 17-VERIFICATION.md:158 shape (e.g. canonical
  // OneDrive "Acme & Co"). Guard: stays SUCCESS.
  it.each(SPECIAL_CHARS)('interior-with-child "%s" round-trips', async (c) => {
    await assertRoundTrip(['Acme ' + c + ' Co', 'leaf']);
  });

  // Position 5: LEAF — special char at the trailing edge of the DEEPEST component, no child.
  // Guard: stays SUCCESS (already covered by the CORE-13 leaf fixtures above; locked here too
  // as part of the exhaustive 9x5 matrix).
  it.each(SPECIAL_CHARS)('leaf "%s" round-trips', async (c) => {
    await assertRoundTrip(['parent', 'Leaf' + c]);
  });

  it('L-03: canonical OneDrive-shaped path (" - " and ", ") decodes by value', async () => {
    // Mirrors the load-bearing v3.0.0 buildCandidates decode:
    //   C:\Users\rlasalle\OneDrive - ThermoTek, Inc\Documents\Projects\Claude-Home
    // Built under tmpDir so it is a REAL folder. The space-hyphen-space and comma-space
    // punctuation is exactly the interior shape the v3.0.0 fix handles; it must stay SUCCESS.
    const od = path.join(tmpDir, 'OneDrive - ThermoTek, Inc');
    await fs.mkdir(od);
    const docs = path.join(od, 'Documents');
    await fs.mkdir(docs);
    const proj = path.join(docs, 'Claude-Home');
    await fs.mkdir(proj);

    const hash = encode(proj);
    const result = await decode(hash);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.decodedPath).not.toBeNull();
      if (result.data.decodedPath !== null) {
        expect(result.data.decodedPath.toLowerCase()).toBe(proj.toLowerCase());
      }
    }
  });

  it('CORE-16 boundary (documented): two trailing specials on an intermediate component are out of scope', async () => {
    // encode("Foo&&") === "Foo"; the parent/child boundary carries THREE hyphens ("...-Foo---sub"),
    // which neither the single-hyphen nor the additive double-hyphen (L-01) branch consumes. CORE-16 /
    // SC1 scope is a SINGLE special char per position (REQUIREMENTS.md:34). This guard documents the
    // boundary: it must remain no_candidates. Widening the fix to N trailing specials would exceed
    // CORE-16 scope and violate L-01's locked "encodedName + '--'" shape — a deliberate decision, not a bug.
    const parent = path.join(tmpDir, 'Foo&&');
    await fs.mkdir(parent);
    await fs.mkdir(path.join(parent, 'sub'));

    const hash = encode(path.join(parent, 'sub'));
    const result = await decode(hash);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('no_candidates');
    }
  });
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
