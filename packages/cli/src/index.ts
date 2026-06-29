// packages/cli/src/index.ts
// @localground/cli — Standalone CLI for LocalGround Toolkit
// Calls @localground/core directly (D-05). Does NOT go through MCP server.

import { Command } from 'commander';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import {
  detect, seed, verify, copy, scan, gitCheck, placeholderDetect, detectPlatform,
  isPathCloudSynced, decode, classify, compare, looksLikeProject,
} from '@localground/core';
import type { EnvironmentInfo, Success, PathHashEntry, ProjectEntry } from '@localground/core';
import { formatKeyValue, formatTable, formatSummary, formatError, formatStatus, EXIT_SUCCESS, EXIT_FAILURE, EXIT_ERROR } from './format.js';

const VERSION = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version as string;

const program = new Command();

program
  .name('localground')
  .description('LocalGround Toolkit — migrate Claude Code projects off cloud-synced storage')
  .version(VERSION)
  .option('--json', 'Output as JSON instead of human-readable text');

// --- detect ---
program
  .command('detect')
  .description('Detect environment: OS, shell, cloud sync status, projects, path-hashes')
  .action(async () => {
    const result = await detect();
    const jsonMode = program.opts().json;

    if (!result.success) {
      if (jsonMode) {
        console.log(JSON.stringify({ success: false, reason: result.reason, detail: result.detail }, null, 2));
      } else {
        console.error(formatError(result.reason, result.detail));
      }
      process.exit(EXIT_ERROR);
    }

    // Honor the downstream contract documented in packages/core/src/environment/detect.ts:50,58-64.
    // Core detect() returns decodedPath: null and projects: [] by design — consumers must
    // invoke decode() per entry to populate them. This pattern matches the audit handler
    // (see lines ~450-455 in this file) so the two surfaces stay consistent.
    const decodedResults = await Promise.all(
      result.data.pathHashes.map((h) => decode(h.hashDirName))
    );

    // Replace the null decodedPath values in pathHashes with real decoded paths.
    // Failed decodes keep decodedPath: null (rendered as `(undecodable)` below).
    const enrichedPathHashes: PathHashEntry[] = decodedResults.map((r, i) => {
      if (r.success) {
        return r.data;
      }
      return result.data.pathHashes[i]; // keep the null decodedPath shape on decode failure
    });

    // Auto-populate projects[] from successful decodes whose paths exist.
    // Same filter as audit (decode-success + exists) — see plan 14-10 for project-shape scoping.
    const enrichedProjects: ProjectEntry[] = decodedResults
      .filter((r): r is Success<PathHashEntry> => r.success && r.data.decodedPath !== null && r.data.exists)
      .map((r) => {
        const p = r.data.decodedPath as string;
        const name = path.basename(p);
        const synced = isPathCloudSynced(p, result.data.cloud.syncRoot);
        return {
          name,
          path: p,
          isCloudSynced: synced,
          cloudService: synced ? result.data.cloud.service : ('none' as const),
        };
      });

    const env: EnvironmentInfo = {
      ...result.data,
      pathHashes: enrichedPathHashes,
      projects: enrichedProjects,
    };

    if (jsonMode) {
      console.log(JSON.stringify(env, null, 2));
      process.exit(EXIT_SUCCESS);
    }

    const output = formatKeyValue([
      ['OS', `${env.platform.platform} (${env.platform.shell})`],
      ['Home', env.platform.homeDir],
      ['Cloud sync', env.cloud.service === 'none' ? 'None detected' : `${env.cloud.service} (${env.cloud.syncRoot ?? 'unknown root'})`],
      ['Cloud synced', env.cloud.isCloudSynced ? 'Yes' : 'No'],
      ['Projects', env.projects.length > 0 ? `${env.projects.length} discovered` : 'None discovered'],
      ['Path-hashes', `${env.pathHashes.length} entries in ${env.claudeConfigDir}`],
    ]);
    console.log(output);

    if (env.projects.length > 0) {
      console.log('\nProjects:');
      for (const p of env.projects) {
        const cloudLabel = p.isCloudSynced ? ` [${p.cloudService}]` : '';
        console.log(`  ${p.name}${cloudLabel}: ${p.path}`);
      }
    }

    if (env.pathHashes.length > 0) {
      console.log('\nPath-hash entries:');
      for (const h of env.pathHashes) {
        const decoded = h.decodedPath ?? '(undecodable)';
        const existsLabel = h.exists ? '' : ' [missing]';
        console.log(`  ${h.hashDirName} -> ${decoded}${existsLabel}`);
      }
    }

    process.exit(EXIT_SUCCESS);
  });

// --- seed ---
program
  .command('seed')
  .description('Plant verifiable markers in a project before migration')
  .argument('<projectPath>', 'Absolute path to the project directory')
  .action(async (projectPath: string) => {
    const jsonMode = program.opts().json;

    if (!path.isAbsolute(projectPath)) {
      const msg = 'projectPath must be an absolute path';
      if (jsonMode) {
        console.log(JSON.stringify({ success: false, reason: 'invalid_argument', detail: msg }, null, 2));
      } else {
        console.error(formatError('invalid_argument', msg));
      }
      process.exit(EXIT_ERROR);
    }

    const result = await seed(projectPath);

    if (!result.success) {
      if (jsonMode) {
        console.log(JSON.stringify({ success: false, reason: result.reason, detail: result.detail }, null, 2));
      } else {
        console.error(formatError(result.reason, result.detail));
      }
      process.exit(EXIT_ERROR);
    }

    if (jsonMode) {
      console.log(JSON.stringify(result.data, null, 2));
      process.exit(EXIT_SUCCESS);
    }

    const manifest = result.data;
    console.log(formatKeyValue([
      ['Project', manifest.projectName],
      ['Path', manifest.projectPath],
      ['Markers', `${manifest.markers.length} planted`],
      ['Manifest', `${projectPath}/.localground-seed-manifest.json`],
    ]));
    console.log('\nMarkers:');
    for (const m of manifest.markers) {
      if (m.type === 'test-file') {
        console.log(`  ${formatStatus('PASS')}  Test file: ${m.path} (checksum: ${m.checksum?.slice(0, 12) ?? 'N/A'})`);
      } else if (m.type === 'git-tag') {
        console.log(`  ${formatStatus('PASS')}  Git tag: ${m.tag ?? 'N/A'} (commit: ${m.commitHash?.slice(0, 8) ?? 'N/A'})`);
      }
    }

    process.exit(EXIT_SUCCESS);
  });

// --- copy ---
program
  .command('copy')
  .description('Copy a project directory to a local path')
  .argument('<source>', 'Absolute path to the source project directory')
  .argument('<target>', 'Absolute path to the target directory (must not exist)')
  .action(async (source: string, target: string) => {
    const jsonMode = program.opts().json;

    if (!path.isAbsolute(source) || !path.isAbsolute(target)) {
      const msg = 'Both source and target must be absolute paths';
      if (jsonMode) {
        console.log(JSON.stringify({ success: false, reason: 'invalid_argument', detail: msg }, null, 2));
      } else {
        console.error(formatError('invalid_argument', msg));
      }
      process.exit(EXIT_ERROR);
    }

    // TIER 1 progress feedback: announce the operation before the long-running call.
    // Routed to stderr so JSON consumers reading stdout stay clean.
    // Gated on !jsonMode so JSON mode produces zero chatter.
    if (!jsonMode) {
      const tool = process.platform === 'win32' ? 'robocopy' : 'rsync';
      console.error(`Copying from ${source}`);
      console.error(`         to ${target}`);
      console.error(`        via ${tool}...`);
    }

    const result = await copy(source, target);

    if (!result.success) {
      if (jsonMode) {
        console.log(JSON.stringify({ success: false, reason: result.reason, detail: result.detail }, null, 2));
      } else {
        console.error(formatError(result.reason, result.detail));
      }
      process.exit(EXIT_ERROR);
    }

    if (jsonMode) {
      console.log(JSON.stringify(result.data, null, 2));
      process.exit(EXIT_SUCCESS);
    }

    console.log(formatKeyValue([
      ['Source', result.data.source],
      ['Target', result.data.target],
      ['Tool', result.data.tool],
      ['Files copied', String(result.data.filesCopied)],
      ['Exit code', String(result.data.exitCode)],
      ['Status', result.data.summary],
    ]));

    process.exit(EXIT_SUCCESS);
  });

// --- verify ---
program
  .command('verify')
  .description('Verify seed markers against manifest')
  .argument('<projectPath>', 'Absolute path to the project directory')
  .option('--manifest <path>', 'Path to seed manifest JSON (defaults to .localground-seed-manifest.json in projectPath)')
  .action(async (projectPath: string, options: { manifest?: string }) => {
    const jsonMode = program.opts().json;

    if (!path.isAbsolute(projectPath)) {
      const msg = 'projectPath must be an absolute path';
      if (jsonMode) {
        console.log(JSON.stringify({ success: false, reason: 'invalid_argument', detail: msg }, null, 2));
      } else {
        console.error(formatError('invalid_argument', msg));
      }
      process.exit(EXIT_ERROR);
    }

    const result = await verify(projectPath, options.manifest);

    if (!result.success) {
      if (jsonMode) {
        console.log(JSON.stringify({ success: false, reason: result.reason, detail: result.detail }, null, 2));
      } else {
        console.error(formatError(result.reason, result.detail));
      }
      process.exit(EXIT_ERROR);
    }

    if (jsonMode) {
      console.log(JSON.stringify(result.data, null, 2));
      process.exit(EXIT_SUCCESS);
    }

    const rows = result.data.results.map((r) => ({
      status: r.passed ? 'PASS' as const : 'FAIL' as const,
      label: r.marker.type === 'test-file' ? `Test file checksum` : `Git tag ${r.marker.tag ?? ''}`,
      detail: r.detail,
    }));

    console.log(formatTable(rows));
    console.log('');
    console.log(formatSummary(rows));

    process.exit(result.data.allPassed ? EXIT_SUCCESS : EXIT_FAILURE);
  });

// --- reap ---
program
  .command('reap')
  .description('Post-migration health check: verify markers + 6-check health assessment')
  .argument('<projectPath>', 'Absolute path to the project directory')
  .option('--manifest <path>', 'Path to seed manifest JSON')
  .option('--source <path>', 'Original source path for source/target comparison')
  .action(async (projectPath: string, options: { manifest?: string; source?: string }) => {
    const jsonMode = program.opts().json;

    if (!path.isAbsolute(projectPath)) {
      const msg = 'projectPath must be an absolute path';
      if (jsonMode) {
        console.log(JSON.stringify({ success: false, reason: 'invalid_argument', detail: msg }, null, 2));
      } else {
        console.error(formatError('invalid_argument', msg));
      }
      process.exit(EXIT_ERROR);
    }

    interface CheckRow {
      check: string;
      status: 'PASS' | 'WARN' | 'FAIL' | 'N/A';
      detail: string;
    }

    const checks: CheckRow[] = [];
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

    // Check 3: Cloud sync status (uses detect())
    const envResult = await detect();
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

    // Check 4: Path-hash validity (uses detect() + decode() + classify())
    try {
      if (!envResult.success) {
        checks.push({ check: 'path_hash_validity', status: 'FAIL', detail: `${envResult.reason}: ${envResult.detail}` });
      } else {
        const decoded = await Promise.all(
          envResult.data.pathHashes.map((h) => decode(h.hashDirName))
        );
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
      const verifyResult = await verify(projectPath, options.manifest);
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

    // Check 6: Source/target alignment (N/A if no --source)
    if (!options.source) {
      checks.push({ check: 'source_target_alignment', status: 'N/A', detail: 'No --source path provided — cannot compare source and target' });
    } else {
      if (!path.isAbsolute(options.source)) {
        const msg = '--source must be an absolute path';
        if (jsonMode) {
          console.log(JSON.stringify({ success: false, reason: 'invalid_argument', detail: msg }, null, 2));
        } else {
          console.error(formatError('invalid_argument', msg));
        }
        process.exit(EXIT_ERROR);
      }

      try {
        const compareResult = await compare(options.source, projectPath);
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

    // Output
    if (jsonMode) {
      console.log(JSON.stringify({ checks }, null, 2));
      process.exit(checks.some((c) => c.status === 'FAIL') ? EXIT_FAILURE : EXIT_SUCCESS);
    }

    const checkLabels: Record<string, string> = {
      git_integrity: 'Git integrity',
      placeholder_files: 'Placeholder files',
      cloud_sync: 'Cloud sync status',
      path_hash_validity: 'Path-hash validity',
      seed_markers: 'Seed markers',
      source_target_alignment: 'Source/target alignment',
    };

    const rows = checks.map((c) => ({
      status: c.status,
      label: checkLabels[c.check] ?? c.check,
      detail: c.detail,
    }));

    console.log(formatTable(rows));
    console.log('');
    console.log(formatSummary(rows));

    process.exit(checks.some((c) => c.status === 'FAIL') ? EXIT_FAILURE : EXIT_SUCCESS);
  });

// --- audit ---
program
  .command('audit')
  .description('Environment-wide audit: discover projects, run health checks, traffic-light report')
  .option('--projects <paths...>', 'Specific project paths to audit (auto-discovers if omitted)')
  .action(async (options: { projects?: string[] }) => {
    const jsonMode = program.opts().json;

    // Step 1: Discover projects
    const envResult = await detect();
    if (!envResult.success) {
      if (jsonMode) {
        console.log(JSON.stringify({ success: false, reason: envResult.reason, detail: envResult.detail }, null, 2));
      } else {
        console.error(formatError(envResult.reason, envResult.detail));
      }
      process.exit(EXIT_ERROR);
    }

    // Validate user-supplied project paths are absolute
    if (options.projects) {
      const invalidPath = options.projects.find((p) => !path.isAbsolute(p));
      if (invalidPath) {
        const msg = `All project paths must be absolute. Invalid: ${invalidPath}`;
        if (jsonMode) {
          console.log(JSON.stringify({ success: false, reason: 'invalid_argument', detail: msg }, null, 2));
        } else {
          console.error(formatError('invalid_argument', msg));
        }
        process.exit(EXIT_ERROR);
      }
    }

    // Auto-discover project paths by decoding path-hash entries.
    // looksLikeProject scopes auto-discovery to project-shaped paths only —
    // excluding filesystem root and home directory (which decode validly but
    // are not projects). User-supplied paths via --projects are NOT filtered;
    // explicit input is respected.
    const autoDiscovered = (
      await Promise.all(
        envResult.data.pathHashes.map((h) => decode(h.hashDirName))
      )
    ).filter((r): r is Success<PathHashEntry> => r.success && r.data.decodedPath !== null && r.data.exists)
     .map((r) => r.data.decodedPath as string)
     .filter(looksLikeProject);

    const paths = options.projects ?? autoDiscovered;

    if (paths.length === 0) {
      if (jsonMode) {
        console.log(JSON.stringify({ summary: { projectsAudited: 0, totalChecks: 0, pass: 0, warn: 0, fail: 0, overallStatus: 'PASS' }, projects: [] }, null, 2));
      } else {
        console.log('No projects found to audit.');
      }
      process.exit(EXIT_SUCCESS);
    }

    const platformResult = detectPlatform();
    const platform = platformResult.success ? platformResult.data.platform : 'linux';

    interface AuditCheck {
      check: string;
      status: 'PASS' | 'WARN' | 'FAIL' | 'N/A';
      detail: string;
    }

    const auditResults: Array<{ projectPath: string; checks: AuditCheck[] }> = [];

    // TIER 1 progress feedback: announce audit scope before the per-project loop.
    // Routed to stderr so JSON consumers reading stdout stay clean.
    // Gated on !jsonMode so JSON mode produces zero chatter.
    if (!jsonMode) {
      console.error(`Auditing ${paths.length} project${paths.length === 1 ? '' : 's'}...`);
    }

    // Step 2: Run 4 abbreviated health checks per project
    for (let i = 0; i < paths.length; i++) {
      const projectPath = paths[i];

      if (!jsonMode) {
        console.error(`  [${i + 1}/${paths.length}] ${projectPath}`);
      }

      const checks: AuditCheck[] = [];

      // Check 1: Git integrity
      try {
        const gitResult = await gitCheck(projectPath);
        if (!gitResult.success) {
          checks.push({ check: 'git_integrity', status: 'FAIL', detail: `${gitResult.reason}: ${gitResult.detail}` });
        } else if (!gitResult.data.fsck.passed) {
          checks.push({ check: 'git_integrity', status: 'FAIL', detail: 'git fsck failed' });
        } else if (!gitResult.data.status.clean || gitResult.data.dubiousOwnership) {
          checks.push({ check: 'git_integrity', status: 'WARN', detail: gitResult.data.dubiousOwnership ? 'Dubious ownership' : 'Uncommitted changes' });
        } else {
          checks.push({ check: 'git_integrity', status: 'PASS', detail: 'OK' });
        }
      } catch {
        checks.push({ check: 'git_integrity', status: 'FAIL', detail: 'Unexpected error' });
      }

      // Check 2: Placeholder files
      try {
        const phResult = await placeholderDetect(projectPath, platform);
        if (!phResult.success) {
          checks.push({ check: 'placeholder_files', status: 'FAIL', detail: phResult.reason });
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
          checks.push({ check: 'stale_references', status: 'FAIL', detail: scanResult.reason });
        } else if (scanResult.data.matchCount > 0) {
          checks.push({ check: 'stale_references', status: 'WARN', detail: `${scanResult.data.matchCount} stale references in ${scanResult.data.filesScanned} files` });
        } else {
          checks.push({ check: 'stale_references', status: 'PASS', detail: `Clean (${scanResult.data.filesScanned} files scanned)` });
        }
      } catch {
        checks.push({ check: 'stale_references', status: 'FAIL', detail: 'Unexpected error' });
      }

      auditResults.push({ projectPath, checks });
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

    if (jsonMode) {
      console.log(JSON.stringify({ summary, projects: auditResults }, null, 2));
      process.exit(failCount > 0 ? EXIT_FAILURE : EXIT_SUCCESS);
    }

    // Human-readable output: per-project section + overall summary
    for (const project of auditResults) {
      console.log(`\n${project.projectPath}`);
      const rows = project.checks.map((c) => ({
        status: c.status,
        label: c.check.replace(/_/g, ' '),
        detail: c.detail,
      }));
      console.log(formatTable(rows));
    }

    console.log('');
    console.log(formatSummary(allChecks.map((c) => ({ status: c.status }))));

    process.exit(failCount > 0 ? EXIT_FAILURE : EXIT_SUCCESS);
  });

// --- cleanup-scan ---
program
  .command('cleanup-scan')
  .description('Scan for stale cloud path references and cleanup candidates (read-only)')
  .argument('<dirPath>', 'Absolute path to the directory to scan')
  .action(async (dirPath: string) => {
    const jsonMode = program.opts().json;

    if (!path.isAbsolute(dirPath)) {
      const msg = 'dirPath must be an absolute path';
      if (jsonMode) {
        console.log(JSON.stringify({ success: false, reason: 'invalid_argument', detail: msg }, null, 2));
      } else {
        console.error(formatError('invalid_argument', msg));
      }
      process.exit(EXIT_ERROR);
    }

    const result = await scan(dirPath);

    if (!result.success) {
      if (jsonMode) {
        console.log(JSON.stringify({ success: false, reason: result.reason, detail: result.detail }, null, 2));
      } else {
        console.error(formatError(result.reason, result.detail));
      }
      process.exit(EXIT_ERROR);
    }

    if (jsonMode) {
      console.log(JSON.stringify(result.data, null, 2));
      process.exit(EXIT_SUCCESS);
    }

    console.log(formatKeyValue([
      ['Directory', dirPath],
      ['Files scanned', String(result.data.filesScanned)],
      ['Matches found', String(result.data.matchCount)],
    ]));

    if (result.data.matches.length > 0) {
      console.log('\nStale references:');
      for (const match of result.data.matches) {
        console.log(`  ${match.file}:${match.line}`);
        console.log(`    Cloud path: ${match.cloudPath}`);
        console.log(`    Content: ${match.content.trim()}`);
      }
    } else {
      console.log('\nNo stale cloud path references found.');
    }

    process.exit(EXIT_SUCCESS);
  });

await program.parseAsync(process.argv);
