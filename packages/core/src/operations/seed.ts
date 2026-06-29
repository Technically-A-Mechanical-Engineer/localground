// packages/core/src/operations/seed.ts

import fs from 'node:fs/promises';
import path from 'node:path';
import type { Result, SeedManifest, SeedMarker } from '../types.js';
import { checksumString } from '../integrity/checksum.js';
import { spawnTool } from '../util/spawn.js';

type SeedFailureReason =
  | 'not_a_directory'
  | 'not_a_git_repo'
  | 'test_file_exists'
  | 'write_error'
  | 'git_tag_failed';

/**
 * Hardcoded test file content.
 * UTF-8, no BOM, LF line endings.
 * The SHA-256 of this exact content is known and verified.
 */
const SEED_TEST_FILE_CONTENT =
  'LocalGround seed marker — do not modify\n' +
  'Created by LocalGround Toolkit\n' +
  'This file verifies migration integrity\n';

/** Expected SHA-256 of SEED_TEST_FILE_CONTENT */
const SEED_TEST_FILE_CHECKSUM = checksumString(SEED_TEST_FILE_CONTENT);

const SEED_TEST_FILE_NAME = '.localground-seed-test';
const SEED_MANIFEST_FILE_NAME = '.localground-seed-manifest.json';

/**
 * Plant verifiable seed markers in a project directory before migration.
 *
 * CORE-09: Plant seed markers (test file with hardcoded checksum, lightweight git tag, JSON manifest).
 *
 * Safety (D-04): seed() validates before writing.
 * - Refuses to overwrite an existing seed test file
 * - Checks that the project is a git repo before tagging
 * - Writes exactly two files: test file and manifest
 * - Creates exactly one lightweight git tag
 *
 * Markers planted:
 * 1. Test file: .localground-seed-test (exact content, known checksum)
 * 2. Git tag: localground/seed/{timestamp} (lightweight tag at HEAD)
 * 3. Manifest: .localground-seed-manifest.json (records all markers for verification)
 */
export async function seed(
  projectPath: string,
): Promise<Result<SeedManifest, SeedFailureReason>> {
  // Validate: directory exists
  try {
    const stat = await fs.stat(projectPath);
    if (!stat.isDirectory()) {
      return { success: false, reason: 'not_a_directory', detail: `Not a directory: ${projectPath}` };
    }
  } catch {
    return { success: false, reason: 'not_a_directory', detail: `Directory not found: ${projectPath}` };
  }

  // Validate: is a git repo (needed for git tag)
  const gitDir = path.join(projectPath, '.git');
  try {
    await fs.access(gitDir);
  } catch {
    return { success: false, reason: 'not_a_git_repo', detail: `No .git directory in: ${projectPath}` };
  }

  // Validate: test file does not already exist (D-04 safety)
  const testFilePath = path.join(projectPath, SEED_TEST_FILE_NAME);
  try {
    await fs.access(testFilePath);
    // File exists — refuse to overwrite
    return {
      success: false,
      reason: 'test_file_exists',
      detail: `Seed test file already exists: ${testFilePath}. Has this project already been seeded?`,
    };
  } catch {
    // File doesn't exist — safe to proceed
  }

  // Plant marker 1: test file
  try {
    await fs.writeFile(testFilePath, SEED_TEST_FILE_CONTENT, { encoding: 'utf8' });
  } catch (err: unknown) {
    return {
      success: false,
      reason: 'write_error',
      detail: `Failed to write seed test file: ${(err as Error).message}`,
    };
  }

  // Verify test file was written correctly
  const writtenContent = await fs.readFile(testFilePath, 'utf8');
  const writtenChecksum = checksumString(writtenContent);
  if (writtenChecksum !== SEED_TEST_FILE_CHECKSUM) {
    return {
      success: false,
      reason: 'write_error',
      detail: `Seed test file checksum mismatch after write. Expected: ${SEED_TEST_FILE_CHECKSUM}, Got: ${writtenChecksum}`,
    };
  }

  // Plant marker 2: lightweight git tag
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const tagName = `localground/seed/${timestamp}`;

  // Get current HEAD commit hash
  const headResult = spawnTool('git', ['rev-parse', 'HEAD'], { cwd: projectPath });
  const commitHash = headResult.success ? headResult.data.stdout.trim() : 'unknown';

  const tagResult = spawnTool('git', ['tag', tagName], { cwd: projectPath });
  if (!tagResult.success) {
    return {
      success: false,
      reason: 'git_tag_failed',
      detail: `Failed to create git tag "${tagName}": ${tagResult.detail}`,
    };
  }

  // Build markers list
  const markers: SeedMarker[] = [
    {
      type: 'test-file',
      path: testFilePath,
      checksum: SEED_TEST_FILE_CHECKSUM,
    },
    {
      type: 'git-tag',
      tag: tagName,
      commitHash,
    },
  ];

  // Build manifest
  const manifest: SeedManifest = {
    version: 1,
    toolkitVersion: '3.0.2',
    created: new Date().toISOString(),
    projectPath,
    projectName: path.basename(projectPath),
    markers,
  };

  // Write manifest
  const manifestPath = path.join(projectPath, SEED_MANIFEST_FILE_NAME);
  try {
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { encoding: 'utf8' });
  } catch (err: unknown) {
    return {
      success: false,
      reason: 'write_error',
      detail: `Failed to write manifest: ${(err as Error).message}`,
    };
  }

  return {
    success: true,
    data: manifest,
  };
}
