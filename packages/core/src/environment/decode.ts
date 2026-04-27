// packages/core/src/environment/decode.ts

import fs from 'node:fs/promises';
import path from 'node:path';
import type { Result, PathHashEntry } from '../types.js';

type DecodeFailureReason = 'invalid_hash' | 'no_candidates' | 'projects_dir_not_found';

/**
 * Decode a Claude Code path-hash directory name to a filesystem path.
 *
 * CORE-02: Decode Claude Code path-hash directory names to filesystem paths and vice versa.
 *
 * Claude Code encodes project paths into directory names by replacing special characters
 * (backslash, forward slash, colon, space, comma, etc.) with a single hyphen each.
 * Consecutive hyphens are NOT collapsed — each special character becomes exactly one hyphen.
 *
 * Decoding strategy: filesystem-listing reverse encode.
 * At each recursion level, list the actual subdirectory entries in currentPath, encode
 * each entry's name with encode(), and prefix-match the encoded form against the remaining
 * hash. This sidesteps separator guessing entirely — any folder that physically exists
 * decodes correctly regardless of mixed punctuation (' - ', ', ', '.', etc.).
 *
 * Bounded by maxCandidates=20 to prevent runaway recursion when a hash matches many
 * sibling subtrees.
 *
 * Example:
 *   Encoded: "C--Users-rlasalle-OneDrive---ThermoTek--Inc-Documents-Projects-Claude-Home"
 *   Decoded: "C:\\Users\\rlasalle\\OneDrive - ThermoTek, Inc\\Documents\\Projects\\Claude-Home"
 */
export async function decode(
  hashDirName: string,
): Promise<Result<PathHashEntry, DecodeFailureReason>> {
  if (!hashDirName || hashDirName.trim().length === 0) {
    return {
      success: false,
      reason: 'invalid_hash',
      detail: 'Empty path-hash directory name',
    };
  }

  const segments = hashDirName.split('-');
  if (segments.length < 2) {
    return {
      success: false,
      reason: 'invalid_hash',
      detail: `Path-hash "${hashDirName}" has fewer than 2 segments — not a valid encoded path`,
    };
  }

  const isWindows = process.platform === 'win32';
  const candidates = await reconstructPath(segments, isWindows);

  if (candidates.length === 0) {
    return {
      success: false,
      reason: 'no_candidates',
      detail: `Could not decode path-hash "${hashDirName}" — no valid filesystem path found`,
    };
  }

  // Return the first (most likely) candidate
  const decodedPath = candidates[0];
  let exists = false;
  try {
    await fs.access(decodedPath);
    exists = true;
  } catch {
    exists = false;
  }

  return {
    success: true,
    data: {
      hashDirName,
      decodedPath,
      exists,
    },
  };
}

/**
 * Encode a filesystem path to a Claude Code path-hash directory name.
 * Each special character (\\, /, :, space, comma, etc.) becomes a single hyphen.
 * Consecutive hyphens are NOT collapsed.
 */
export function encode(filePath: string): string {
  // Replace each special character with a single hyphen
  return filePath.replace(/[\\/: ,().'&\[\]+=%]/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Reconstruct a filesystem path from a path-hash directory name.
 * Uses filesystem-aware reverse-encode validation.
 *
 * Limits to 20 candidates to prevent combinatorial explosion.
 */
async function reconstructPath(
  segments: string[],
  isWindows: boolean,
): Promise<string[]> {
  const maxCandidates = 20;
  const candidates: string[] = [];

  if (isWindows) {
    // Windows: first segment is the drive letter (e.g., "C").
    // The colon and backslash that follow each encode as one hyphen, producing
    // two consecutive hyphens after the drive letter. Splitting on '-' therefore
    // produces an empty-string segment between the drive letter and the first
    // path component (e.g., ['C', '', 'Users', ...]). Skip BOTH segments[0]
    // (drive letter) and segments[1] (empty) to land on the path-under-root hash.
    const driveLetter = segments[0];
    if (/^[A-Za-z]$/.test(driveLetter)) {
      const root = `${driveLetter.toUpperCase()}:\\`;
      const remainingHash = segments.slice(2).join('-');
      const paths = await buildCandidates(root, remainingHash, maxCandidates);
      candidates.push(...paths);
    }
  } else {
    // Unix: encode strips a leading hyphen via /^-+|-+$/g. The hash starts with
    // the first path component directly (e.g., "home-bob-Projects-foo"), so
    // pass it as-is (rejoined from segments for symmetry with the Windows branch).
    const root = '/';
    const remainingHash = segments.join('-');
    const paths = await buildCandidates(root, remainingHash, maxCandidates);
    candidates.push(...paths);
  }

  return candidates;
}

/**
 * Recursively build path candidates by listing actual subdirectory entries at currentPath
 * and prefix-matching each entry's encoded name against the remaining hash.
 *
 * This is the inverse of encode(): instead of guessing which separator each hyphen
 * represents, we let the filesystem tell us — every real subdirectory's encode() is
 * compared as a prefix of remainingHash. If it matches exactly, that subdirectory is
 * the final segment. If it matches as `encoded + '-'`, the original folder name is
 * that subdirectory and the rest of the hash represents the deeper path.
 *
 * Bounded by maxCandidates to cap branching when many siblings could match.
 */
async function buildCandidates(
  currentPath: string,
  remainingHash: string,
  maxCandidates: number,
): Promise<string[]> {
  // Base case: nothing left to match — currentPath is a complete decoded path
  if (remainingHash.length === 0) {
    return [currentPath];
  }

  let entries;
  try {
    entries = await fs.readdir(currentPath, { withFileTypes: true });
  } catch {
    // Directory cannot be read (does not exist, permission denied, etc.)
    return [];
  }

  const results: string[] = [];

  for (const entry of entries) {
    if (results.length >= maxCandidates) break;

    // Accept directories AND symbolic links (and other reparse points). On Windows,
    // OneDrive folders under the user home are reparse points that report
    // isDirectory()=false and isSymbolicLink()=true even though they resolve to
    // directories. Filtering by isDirectory() alone would incorrectly drop them and
    // prevent decoding of any path under OneDrive. Files (true files) are excluded.
    // If a symlink points to a non-directory, the recursive fs.readdir on it will
    // throw and the catch block returns [] — graceful handling preserved.
    if (entry.isFile()) continue;

    const encodedName = encode(entry.name);
    if (encodedName.length === 0) continue;

    // Case 1: exact match — this entry IS the final folder, no path remains
    if (encodedName === remainingHash) {
      results.push(path.join(currentPath, entry.name));
      continue;
    }

    // Case 2: prefix match — this entry's name encoded, followed by '-' (path separator),
    // followed by the rest of the hash representing the deeper path
    const prefix = encodedName + '-';
    if (remainingHash.startsWith(prefix)) {
      const nextRemaining = remainingHash.slice(prefix.length);
      const subResults = await buildCandidates(
        path.join(currentPath, entry.name),
        nextRemaining,
        maxCandidates - results.length,
      );
      results.push(...subResults);
    }
  }

  return results;
}
