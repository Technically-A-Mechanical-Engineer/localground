// packages/mcp/src/index.ts
// @localground/mcp — MCP Server exposing LocalGround operations as Claude Code tool calls

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  detect, decode, placeholderDetect, detectPlatform, seed, verify, scan,
  classify, chunk, copy, gitCheck, compare, isPathCloudSynced, looksLikeProject,
} from '@localground/core';
import type { Result, Success, ChunkPlan, CopyData, PathHashEntry } from '@localground/core';
import { z } from 'zod';
import path from 'node:path';
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';

// --- Constants ---

const SERVER_NAME = 'localground';
const SERVER_VERSION = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version as string;

// --- Server Instance ---

const server = new McpServer(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { capabilities: { logging: {} } },
);

// --- Result-to-MCP Translation ---

/**
 * Translate a core Result<T,R> into a CallToolResult for MCP responses.
 *
 * Success: JSON-serialized data in a text content block.
 * Failure: reason + detail as human-readable text with isError flag.
 *
 * Per D-05: MCP layer does NOT re-implement safety logic. It calls core
 * functions and translates Result types. Stack traces never reach the user.
 */
function resultToMcp<T>(result: Result<T, string>): {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
} {
  if (result.success) {
    return {
      content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
    };
  }
  return {
    content: [{ type: 'text', text: `${result.reason}: ${result.detail}` }],
    isError: true,
  };
}

// --- Health Check Result Type ---

/** Per-check result for localground_health_check composite tool. */
interface HealthCheck {
  check: string;
  status: 'PASS' | 'WARN' | 'FAIL' | 'N/A';
  detail: string;
}

// --- Copy Token (Continuation Token for Chunked Copy) ---

/** State persisted between chunked copy calls via base64 JSON token. */
interface CopyToken {
  source: string;
  target: string;
  plan: ChunkPlan;
  currentIndex: number;
  filesCopied: number;
  maxExitCode: number;
}

function encodeCopyToken(state: CopyToken): string {
  return Buffer.from(JSON.stringify(state)).toString('base64');
}

function decodeCopyToken(token: string): CopyToken | null {
  try {
    const parsed = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    // Validate expected shape — do not spread
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.source === 'string' &&
      typeof parsed.target === 'string' &&
      typeof parsed.plan === 'object' &&
      parsed.plan !== null &&
      Array.isArray(parsed.plan.chunks) &&
      typeof parsed.plan.totalChunks === 'number' &&
      typeof parsed.currentIndex === 'number' &&
      typeof parsed.filesCopied === 'number' &&
      typeof parsed.maxExitCode === 'number'
    ) {
      // Validate source and target are absolute paths — reject relative/traversal paths
      if (!path.isAbsolute(parsed.source) || !path.isAbsolute(parsed.target)) {
        return null;
      }
      return {
        source: parsed.source,
        target: parsed.target,
        plan: parsed.plan as ChunkPlan,
        currentIndex: parsed.currentIndex,
        filesCopied: parsed.filesCopied,
        maxExitCode: parsed.maxExitCode,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Copy all entries within one chunk by iterating per-entry.
 *
 * Directories are copied via copy(). Files are copied via fs.copyFile().
 * The root target directory must already exist before calling this function.
 *
 * Returns aggregated filesCopied count and the max exit code across entries.
 */
async function copyChunkEntries(
  rootSource: string,
  rootTarget: string,
  entries: string[],
): Promise<Result<{ filesCopied: number; maxExitCode: number }, string>> {
  let totalFilesCopied = 0;
  let maxExitCode = 0;

  for (const entryName of entries) {
    const entrySrc = path.join(rootSource, entryName);
    const entryTgt = path.join(rootTarget, entryName);

    // Determine if entry is a file or directory
    let stat;
    try {
      stat = await fs.stat(entrySrc);
    } catch {
      return {
        success: false,
        reason: 'copy_error',
        detail: `Source entry not found: ${entrySrc}`,
      };
    }

    if (stat.isDirectory()) {
      const copyResult = await copy(entrySrc, entryTgt);
      if (!copyResult.success) {
        return {
          success: false,
          reason: copyResult.reason,
          detail: copyResult.detail,
        };
      }
      totalFilesCopied += copyResult.data.filesCopied;
      maxExitCode = Math.max(maxExitCode, copyResult.data.exitCode);
    } else if (stat.isFile()) {
      try {
        await fs.copyFile(entrySrc, entryTgt);
        totalFilesCopied += 1;
      } catch (err: unknown) {
        return {
          success: false,
          reason: 'copy_error',
          detail: `Failed to copy file ${entrySrc}: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
  }

  return {
    success: true,
    data: { filesCopied: totalFilesCopied, maxExitCode },
  };
}

// --- Tool Registrations ---

// localground_detect — zero-argument, read-only environment detection
server.registerTool('localground_detect', {
  description:
    'Detect OS, shell, cloud sync status, project inventory, and Claude Code path-hash entries. Returns structured environment JSON.',
  annotations: {
    title: 'Detect Environment',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
}, async (_extra) => {
  const result = await detect();
  if (!result.success) {
    return resultToMcp(result);
  }

  // Honor the downstream contract documented in packages/core/src/environment/detect.ts:50,58-64.
  // Core detect() returns decodedPath: null and projects: [] by design — consumers must
  // invoke decode() per entry. This matches the localground_audit pattern below.
  const decodedResults = await Promise.all(
    result.data.pathHashes.map((h) => decode(h.hashDirName))
  );

  const enrichedPathHashes: PathHashEntry[] = decodedResults.map((r, i) => {
    if (r.success) {
      return r.data;
    }
    return result.data.pathHashes[i];
  });

  const enrichedProjects = decodedResults
    .filter((r): r is Success<PathHashEntry> => r.success && r.data.decodedPath !== null && r.data.exists)
    .map((r) => r.data.decodedPath as string)
    .filter(looksLikeProject)
    .map((p) => {
      const name = path.basename(p);
      const synced = isPathCloudSynced(p, result.data.cloud.syncRoot);
      return {
        name,
        path: p,
        isCloudSynced: synced,
        cloudService: synced ? result.data.cloud.service : ('none' as const),
      };
    });

  const enriched = {
    ...result.data,
    pathHashes: enrichedPathHashes,
    projects: enrichedProjects,
  };

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(enriched, null, 2),
    }],
  };
});

// localground_decode_path_hash — decode Claude Code path-hash directory names
server.registerTool('localground_decode_path_hash', {
  description:
    'Decode a Claude Code path-hash directory name (e.g., "C--Users-bob-Projects-myapp") to its original filesystem path. Returns the decoded path and whether the directory exists.',
  inputSchema: {
    hashDirName: z.string().describe('The path-hash directory name from ~/.claude/projects/ (e.g., "C--Users-bob-Projects-myapp")'),
  },
  annotations: {
    title: 'Decode Path Hash',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
}, async ({ hashDirName }, _extra) => {
  const result = await decode(hashDirName);
  return resultToMcp(result);
});

// localground_placeholder_check — detect cloud storage placeholder files
server.registerTool('localground_placeholder_check', {
  description:
    'Detect cloud storage placeholder files (Files On-Demand / Smart Sync stubs) in a directory. These are files that appear in the filesystem but have not been downloaded — they will cause copy failures or data loss.',
  inputSchema: {
    dirPath: z.string().describe('Absolute path to the directory to scan for placeholder files'),
  },
  annotations: {
    title: 'Placeholder Check',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
}, async ({ dirPath }, _extra) => {
  const platformResult = detectPlatform();
  if (!platformResult.success) {
    return resultToMcp(platformResult);
  }
  const result = await placeholderDetect(dirPath, platformResult.data.platform);
  return resultToMcp(result);
});

// localground_seed — plant verifiable markers before migration
server.registerTool('localground_seed', {
  description:
    'Plant verifiable markers (test file with known checksum + lightweight git tag) in a project directory before migration. Returns a seed manifest that the verify tool checks after migration.',
  inputSchema: {
    projectPath: z.string().describe('Absolute path to the project directory to seed'),
  },
  annotations: {
    title: 'Seed Markers',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
}, async ({ projectPath }, _extra) => {
  const result = await seed(projectPath, SERVER_VERSION);
  return resultToMcp(result);
});

// localground_verify — verify seed markers against manifest
server.registerTool('localground_verify', {
  description:
    'Verify seed markers against the manifest created by the seed tool. Checks that the test file checksum matches and the git tag is present. Returns per-marker pass/fail results.',
  inputSchema: {
    projectPath: z.string().describe('Absolute path to the project directory to verify'),
    manifestPath: z.string().optional().describe('Path to the seed manifest JSON file. Defaults to .localground-seed-manifest.json in projectPath.'),
  },
  annotations: {
    title: 'Verify Markers',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
}, async ({ projectPath, manifestPath }, _extra) => {
  const result = await verify(projectPath, manifestPath);
  return resultToMcp(result);
});

// localground_cleanup_scan — read-only scan for stale cloud path references
server.registerTool('localground_cleanup_scan', {
  description:
    'Read-only scan identifying stale cloud storage path references, orphan path-hash directories, and source folder candidates for cleanup. Never deletes — returns a list of findings for review.',
  inputSchema: {
    dirPath: z.string().describe('Absolute path to the directory to scan for stale references'),
  },
  annotations: {
    title: 'Cleanup Scan',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
}, async ({ dirPath }, _extra) => {
  const result = await scan(dirPath);
  return resultToMcp(result);
});

// localground_copy — chunked project copy with continuation token
server.registerTool('localground_copy', {
  description:
    'Copy one project directory using robocopy (Windows) or rsync (macOS/Linux). Large directories are chunked across multiple calls using a continuation token. First call plans the operation and copies chunk 0. Pass the returned token on subsequent calls to copy remaining chunks.',
  inputSchema: {
    source: z.string().describe('Absolute path to the source project directory'),
    target: z.string().describe('Absolute path to the target directory (must not exist)'),
    token: z.string().optional().describe('Continuation token from a previous call. Omit for the first call.'),
  },
  annotations: {
    title: 'Copy Project',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
}, async ({ source, target, token }, extra) => {
  // --- FIRST CALL (no token): plan and copy chunk 0 ---
  if (!token) {
    const planResult = await chunk(source, target);
    if (!planResult.success) {
      return resultToMcp(planResult);
    }

    const plan = planResult.data;

    // Single-chunk case: copy the whole thing directly
    if (plan.totalChunks <= 1) {
      const copyResult = await copy(source, target);
      if (!copyResult.success) {
        return resultToMcp(copyResult);
      }
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ done: true, result: copyResult.data }, null, 2),
        }],
      };
    }

    // Multi-chunk case: pre-create root target, then copy first chunk per-entry
    // Safety: refuse to overwrite existing target (same contract as copy())
    try {
      await fs.access(target);
      return {
        content: [{ type: 'text' as const, text: 'target_exists: Target directory already exists. Refusing to overwrite (safety model).' }],
        isError: true,
      };
    } catch {
      // Target does not exist — safe to proceed
    }

    // Create root target directory so per-entry copy calls can write into it
    try {
      await fs.mkdir(target, { recursive: true });
    } catch (err: unknown) {
      return {
        content: [{ type: 'text' as const, text: `copy_error: Failed to create target directory: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }

    const firstChunk = plan.chunks[0];
    const chunkResult = await copyChunkEntries(source, target, firstChunk.entries);
    if (!chunkResult.success) {
      return {
        content: [{ type: 'text' as const, text: `${chunkResult.reason}: ${chunkResult.detail}` }],
        isError: true,
      };
    }

    const state: CopyToken = {
      source,
      target,
      plan,
      currentIndex: 1,
      filesCopied: chunkResult.data.filesCopied,
      maxExitCode: chunkResult.data.maxExitCode,
    };

    // Send progress notification if client requested it
    if (extra._meta?.progressToken !== undefined) {
      await extra.sendNotification({
        method: 'notifications/progress',
        params: {
          progressToken: extra._meta.progressToken,
          progress: 1,
          total: plan.totalChunks,
          message: `Copied chunk 1/${plan.totalChunks}: ${firstChunk.entries.join(', ')}`,
        },
      });
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          done: false,
          token: encodeCopyToken(state),
          progress: `1/${plan.totalChunks} chunks copied`,
          currentFolder: firstChunk.entries.join(', '),
        }, null, 2),
      }],
    };
  }

  // --- SUBSEQUENT CALLS (with token): decode and copy next chunk ---
  const state = decodeCopyToken(token);
  if (!state) {
    return {
      content: [{ type: 'text' as const, text: 'invalid_token: The continuation token could not be decoded or has an invalid structure.' }],
      isError: true,
    };
  }

  // Security: verify token source/target match the input parameters
  if (state.source !== source || state.target !== target) {
    return {
      content: [{ type: 'text' as const, text: 'token_mismatch: The source and target in the continuation token do not match the provided source and target parameters.' }],
      isError: true,
    };
  }

  if (state.currentIndex >= state.plan.totalChunks) {
    return {
      content: [{ type: 'text' as const, text: 'token_exhausted: All chunks have already been copied. No continuation needed.' }],
      isError: true,
    };
  }

  const currentChunk = state.plan.chunks[state.currentIndex];
  const chunkResult = await copyChunkEntries(state.source, state.target, currentChunk.entries);
  if (!chunkResult.success) {
    return {
      content: [{ type: 'text' as const, text: `${chunkResult.reason}: ${chunkResult.detail}` }],
      isError: true,
    };
  }

  const newIndex = state.currentIndex + 1;
  const totalFilesCopied = state.filesCopied + chunkResult.data.filesCopied;
  const newMaxExitCode = Math.max(state.maxExitCode, chunkResult.data.maxExitCode);

  // Send progress notification
  if (extra._meta?.progressToken !== undefined) {
    await extra.sendNotification({
      method: 'notifications/progress',
      params: {
        progressToken: extra._meta.progressToken,
        progress: newIndex,
        total: state.plan.totalChunks,
        message: `Copied chunk ${newIndex}/${state.plan.totalChunks}: ${currentChunk.entries.join(', ')}`,
      },
    });
  }

  // Check if this was the last chunk
  if (newIndex >= state.plan.totalChunks) {
    const tool = process.platform === 'win32' ? 'robocopy' : 'rsync';
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          done: true,
          result: {
            source: state.source,
            target: state.target,
            tool,
            exitCode: newMaxExitCode,
            filesCopied: totalFilesCopied,
            summary: `Copied ${state.plan.totalChunks} chunks (${totalFilesCopied} files total)`,
          } satisfies CopyData,
        }, null, 2),
      }],
    };
  }

  // More chunks remain
  const updatedState: CopyToken = {
    ...state,
    currentIndex: newIndex,
    filesCopied: totalFilesCopied,
    maxExitCode: newMaxExitCode,
  };

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        done: false,
        token: encodeCopyToken(updatedState),
        progress: `${newIndex}/${state.plan.totalChunks} chunks copied`,
        currentFolder: currentChunk.entries.join(', '),
      }, null, 2),
    }],
  };
});

// localground_health_check — six-check composite tool for one project
server.registerTool('localground_health_check', {
  description:
    'Run six health checks on one project: git integrity, placeholder files, cloud sync status, path-hash validity, seed marker verification, and source/target alignment. Returns per-check PASS/WARN/FAIL/N/A status.',
  inputSchema: {
    projectPath: z.string().describe('Absolute path to the project directory to check'),
    manifestPath: z.string().optional().describe('Path to seed manifest. Defaults to .localground-seed-manifest.json in projectPath. Checks 5-6 return N/A if no manifest exists.'),
    sourcePath: z.string().optional().describe('Original source path for source/target comparison (check 6). Required for check 6; if omitted, check 6 returns N/A.'),
  },
  annotations: {
    title: 'Health Check',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
}, async ({ projectPath, manifestPath, sourcePath }, _extra) => {
  const checks: HealthCheck[] = [];
  const platformResult = detectPlatform();
  const platform = platformResult.success ? platformResult.data.platform : 'linux';

  // Check 1: Git integrity
  try {
    const gitResult = await gitCheck(projectPath);
    if (!gitResult.success) {
      checks.push({ check: 'git_integrity', status: 'FAIL', detail: `${gitResult.reason}: ${gitResult.detail}` });
    } else {
      const g = gitResult.data;
      if (!g.fsck.passed) {
        checks.push({ check: 'git_integrity', status: 'FAIL', detail: `git fsck failed: ${g.fsck.output}` });
      } else if (!g.status.clean || g.dubiousOwnership) {
        checks.push({ check: 'git_integrity', status: 'WARN', detail: g.dubiousOwnership ? 'Dubious ownership detected' : `Uncommitted changes: ${g.status.output}` });
      } else {
        checks.push({ check: 'git_integrity', status: 'PASS', detail: `Branch: ${g.branch}, commit: ${g.commitHash.slice(0, 8)}` });
      }
    }
  } catch (err: unknown) {
    checks.push({ check: 'git_integrity', status: 'FAIL', detail: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` });
  }

  // Check 2: Placeholder files
  try {
    const phResult = await placeholderDetect(projectPath, platform);
    if (!phResult.success) {
      checks.push({ check: 'placeholder_files', status: 'FAIL', detail: `${phResult.reason}: ${phResult.detail}` });
    } else if (phResult.data.hasPlaceholders) {
      checks.push({ check: 'placeholder_files', status: 'WARN', detail: `${phResult.data.placeholderCount} placeholder files detected (${phResult.data.percentage.toFixed(1)}% of ${phResult.data.totalFiles} files)` });
    } else {
      checks.push({ check: 'placeholder_files', status: 'PASS', detail: `No placeholder files detected in ${phResult.data.totalFiles} files` });
    }
  } catch (err: unknown) {
    checks.push({ check: 'placeholder_files', status: 'FAIL', detail: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` });
  }

  // Shared detect() call for checks 3 and 4 — avoids redundant filesystem scan
  const envResult = await detect();

  // Check 3: Cloud sync active
  try {
    if (!envResult.success) {
      checks.push({ check: 'cloud_sync', status: 'FAIL', detail: `${envResult.reason}: ${envResult.detail}` });
    } else {
      const synced = isPathCloudSynced(projectPath, envResult.data.cloud.syncRoot);
      if (synced) {
        checks.push({ check: 'cloud_sync', status: 'WARN', detail: `Project is on cloud-synced storage (${envResult.data.cloud.service})` });
      } else {
        checks.push({ check: 'cloud_sync', status: 'PASS', detail: 'Project is on local (non-cloud-synced) storage' });
      }
    }
  } catch (err: unknown) {
    checks.push({ check: 'cloud_sync', status: 'FAIL', detail: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` });
  }

  // Check 4: Path-hash validity
  // decode() each path-hash entry first — detect() returns decodedPath: null by design
  try {
    if (!envResult.success) {
      checks.push({ check: 'path_hash_validity', status: 'FAIL', detail: `${envResult.reason}: ${envResult.detail}` });
    } else {
      // Decode all path-hash entries to get real filesystem paths
      const decoded = await Promise.all(
        envResult.data.pathHashes.map((h) => decode(h.hashDirName))
      );
      // Filter for entries that decoded successfully and match this project path
      const projectEntries = decoded
        .filter((r): r is Success<PathHashEntry> =>
          r.success && r.data.decodedPath !== null &&
          r.data.decodedPath.toLowerCase() === projectPath.toLowerCase()
        )
        .map((r) => r.data);

      if (projectEntries.length === 0) {
        checks.push({ check: 'path_hash_validity', status: 'PASS', detail: 'No path-hash entries found for this project path' });
      } else {
        const classifications = await Promise.all(projectEntries.map((entry) => classify(entry)));
        const stale = classifications.filter((c) => c.success && c.data.classification === 'stale');
        const orphan = classifications.filter((c) => c.success && c.data.classification === 'orphan');
        if (stale.length > 0 || orphan.length > 0) {
          checks.push({ check: 'path_hash_validity', status: 'WARN', detail: `Found ${stale.length} stale and ${orphan.length} orphan path-hash entries` });
        } else {
          checks.push({ check: 'path_hash_validity', status: 'PASS', detail: `${projectEntries.length} valid path-hash entries` });
        }
      }
    }
  } catch (err: unknown) {
    checks.push({ check: 'path_hash_validity', status: 'FAIL', detail: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` });
  }

  // Check 5: Seed markers (N/A if no manifest)
  try {
    const verifyResult = await verify(projectPath, manifestPath);
    if (!verifyResult.success) {
      if (verifyResult.reason === 'manifest_not_found') {
        checks.push({ check: 'seed_markers', status: 'N/A', detail: 'No seed manifest found — seed was not run for this project' });
      } else {
        checks.push({ check: 'seed_markers', status: 'FAIL', detail: `${verifyResult.reason}: ${verifyResult.detail}` });
      }
    } else if (verifyResult.data.allPassed) {
      checks.push({ check: 'seed_markers', status: 'PASS', detail: `All ${verifyResult.data.results.length} markers verified` });
    } else {
      const failed = verifyResult.data.results.filter((r) => !r.passed);
      checks.push({ check: 'seed_markers', status: 'FAIL', detail: `${failed.length} of ${verifyResult.data.results.length} markers failed verification` });
    }
  } catch (err: unknown) {
    checks.push({ check: 'seed_markers', status: 'FAIL', detail: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` });
  }

  // Check 6: Source/target alignment (N/A if no sourcePath)
  if (!sourcePath) {
    checks.push({ check: 'source_target_alignment', status: 'N/A', detail: 'No source path provided — cannot compare source and target' });
  } else {
    try {
      const compareResult = await compare(sourcePath, projectPath);
      if (!compareResult.success) {
        checks.push({ check: 'source_target_alignment', status: 'FAIL', detail: `${compareResult.reason}: ${compareResult.detail}` });
      } else {
        const c = compareResult.data;
        if (c.fileCountMatch && c.sizeMatch) {
          checks.push({ check: 'source_target_alignment', status: 'PASS', detail: `Source and target match: ${c.source.fileCount} files, ${c.source.totalSize} bytes` });
        } else {
          const mismatches: string[] = [];
          if (!c.fileCountMatch) mismatches.push(`file count: source=${c.source.fileCount} vs target=${c.target.fileCount}`);
          if (!c.sizeMatch) mismatches.push(`size: source=${c.source.totalSize} vs target=${c.target.totalSize}`);
          checks.push({ check: 'source_target_alignment', status: 'WARN', detail: `Mismatch: ${mismatches.join('; ')}` });
        }
      }
    } catch (err: unknown) {
      checks.push({ check: 'source_target_alignment', status: 'FAIL', detail: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ checks }, null, 2),
    }],
  };
});

// localground_audit — environment-wide read-only audit with progress notifications
server.registerTool('localground_audit', {
  description:
    'Environment-wide read-only audit. Discovers all projects and path-hash entries, runs health checks on each, and returns structured findings with traffic-light scoring. Sends per-project progress notifications during scan.',
  inputSchema: {
    projectPaths: z.array(z.string()).optional().describe('Specific project paths to audit. If omitted, auto-discovers all projects via detect().'),
  },
  annotations: {
    title: 'Audit Environment',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
}, async ({ projectPaths }, extra) => {
  // Step 1: Discover projects
  const envResult = await detect();
  if (!envResult.success) {
    return resultToMcp(envResult);
  }

  // Auto-discover project paths by decoding path-hash entries.
  // detect() returns projects: [] by design — decode() is the discovery mechanism.
  // looksLikeProject filters out filesystem root and home directory entries
  // that decode validly but are not projects. Explicit projectPaths from the
  // caller are NOT filtered — input is respected.
  const autoDiscovered = (
    await Promise.all(
      envResult.data.pathHashes.map((h) => decode(h.hashDirName))
    )
  ).filter((r): r is Success<PathHashEntry> => r.success && r.data.decodedPath !== null && r.data.exists)
   .map((r) => r.data.decodedPath as string)
   .filter(looksLikeProject);

  const paths = projectPaths ?? autoDiscovered;
  const platformResult = detectPlatform();
  const platform = platformResult.success ? platformResult.data.platform : 'linux';

  const auditResults: Array<{
    projectPath: string;
    checks: HealthCheck[];
  }> = [];

  // Step 2: Run health checks per project with progress
  for (let i = 0; i < paths.length; i++) {
    const projectPath = paths[i];
    const checks: HealthCheck[] = [];

    // Abbreviated health checks for audit (checks 1-4 only — no manifest/source needed)
    // Check 1: Git integrity
    try {
      const gitResult = await gitCheck(projectPath);
      if (!gitResult.success) {
        checks.push({ check: 'git_integrity', status: 'FAIL', detail: `${gitResult.reason}: ${gitResult.detail}` });
      } else if (!gitResult.data.fsck.passed) {
        checks.push({ check: 'git_integrity', status: 'FAIL', detail: `git fsck failed` });
      } else if (!gitResult.data.status.clean || gitResult.data.dubiousOwnership) {
        checks.push({ check: 'git_integrity', status: 'WARN', detail: gitResult.data.dubiousOwnership ? 'Dubious ownership' : 'Uncommitted changes' });
      } else {
        checks.push({ check: 'git_integrity', status: 'PASS', detail: `OK` });
      }
    } catch {
      checks.push({ check: 'git_integrity', status: 'FAIL', detail: 'Unexpected error' });
    }

    // Check 2: Placeholder files
    try {
      const phResult = await placeholderDetect(projectPath, platform);
      if (!phResult.success) {
        checks.push({ check: 'placeholder_files', status: 'FAIL', detail: `${phResult.reason}` });
      } else if (phResult.data.hasPlaceholders) {
        checks.push({ check: 'placeholder_files', status: 'WARN', detail: `${phResult.data.placeholderCount} placeholders` });
      } else {
        checks.push({ check: 'placeholder_files', status: 'PASS', detail: 'None' });
      }
    } catch {
      checks.push({ check: 'placeholder_files', status: 'FAIL', detail: 'Unexpected error' });
    }

    // Check 3: Cloud sync
    const synced = isPathCloudSynced(projectPath, envResult.data.cloud.syncRoot);
    checks.push({
      check: 'cloud_sync',
      status: synced ? 'WARN' : 'PASS',
      detail: synced ? `Cloud-synced (${envResult.data.cloud.service})` : 'Local storage',
    });

    // Check 4: Stale references
    try {
      const scanResult = await scan(projectPath);
      if (!scanResult.success) {
        checks.push({ check: 'stale_references', status: 'FAIL', detail: `${scanResult.reason}` });
      } else if (scanResult.data.matchCount > 0) {
        checks.push({ check: 'stale_references', status: 'WARN', detail: `${scanResult.data.matchCount} stale references in ${scanResult.data.filesScanned} files` });
      } else {
        checks.push({ check: 'stale_references', status: 'PASS', detail: `Clean (${scanResult.data.filesScanned} files scanned)` });
      }
    } catch {
      checks.push({ check: 'stale_references', status: 'FAIL', detail: 'Unexpected error' });
    }

    auditResults.push({ projectPath, checks });

    // Send progress notification per project
    if (extra._meta?.progressToken !== undefined) {
      await extra.sendNotification({
        method: 'notifications/progress',
        params: {
          progressToken: extra._meta.progressToken,
          progress: i + 1,
          total: paths.length,
          message: `Audited ${i + 1}/${paths.length}: ${projectPath}`,
        },
      });
    }
  }

  // Step 3: Compute summary
  const allChecks = auditResults.flatMap((r) => r.checks);
  const failCount = allChecks.filter((c) => c.status === 'FAIL').length;
  const warnCount = allChecks.filter((c) => c.status === 'WARN').length;
  const passCount = allChecks.filter((c) => c.status === 'PASS').length;

  const summary = {
    projectsAudited: auditResults.length,
    totalChecks: allChecks.length,
    pass: passCount,
    warn: warnCount,
    fail: failCount,
    overallStatus: failCount > 0 ? 'FAIL' : warnCount > 0 ? 'WARN' : 'PASS',
  };

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ summary, projects: auditResults }, null, 2),
    }],
  };
});

// --- Server Startup ---

/**
 * Returns true if any argv token is a recognised version-request flag.
 * Case-sensitive and exact — `--Version`/`--VERSION` are NOT version requests (D-13).
 * Over-broad near-misses `--versions`/`--versioned` are also NOT version requests (D-13).
 * Tokens after the `--` end-of-options terminator are operands, not flags, so
 * `-- --version` falls through to normal startup (POSIX convention).
 * No argument-parser dependency — hand-rolled predicate only (D-14).
 */
function isVersionRequest(argv: string[]): boolean {
  for (const arg of argv) {
    if (arg === '--') break; // end-of-options terminator: stop scanning for flags
    if (
      arg === '--version' ||
      arg.startsWith('--version=') ||
      arg === '-v' ||
      arg === '-V'
    ) {
      return true;
    }
  }
  return false;
}

async function main(): Promise<void> {
  // Smoke-check escape hatch: respond to a version request without booting the MCP server.
  // Used by scripts/verify-tarball.mjs to confirm the published tarball's bin
  // entry executes end-to-end. Must run BEFORE StdioServerTransport setup —
  // a transport on stdio would block forever waiting for a JSON-RPC client.
  // Recognized: --version, --version=…, -v, -V (case-sensitive, D-12/D-13/D-14).
  if (isVersionRequest(process.argv.slice(2))) {
    process.stdout.write(`${SERVER_VERSION}\n`);
    process.exit(0);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} MCP server v${SERVER_VERSION} running on stdio`);
}

main().catch((error: unknown) => {
  console.error('Fatal error starting MCP server:', error);
  process.exit(1);
});
