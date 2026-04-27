// packages/mcp/test/smoke.test.ts
// Smoke tests: spawn dist/index.js as a child process, verify 9 tools register,
// verify single-tool round-trip via JSON-RPC.
//
// D-01 thin smoke layer — catches wiring regressions like the Phase 14 decoder bugs.
// All spawns use process.execPath (the running Node binary) + array args — never shell mode.

import { describe, it, expect, afterEach } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_PATH = path.resolve(__dirname, '..', 'dist', 'index.js');

function spawnServer() {
  return spawn(process.execPath, [DIST_PATH], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

/**
 * Write a single JSON-RPC frame to the server's stdin as a newline-terminated JSON string.
 * MCP stdio transport is newline-delimited (no Content-Length framing needed here).
 */
function writeFrame(child: ReturnType<typeof spawn>, request: object): void {
  child.stdin!.write(JSON.stringify(request) + '\n');
}

/**
 * Read stdout until a JSON-RPC frame with the given id arrives.
 * Buffers incomplete lines and parses each complete line as JSON.
 */
async function readResponse(
  child: ReturnType<typeof spawn>,
  expectedId: number,
  timeoutMs = 10000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(
      () => reject(new Error(`No response for id=${expectedId} within ${timeoutMs}ms`)),
      timeoutMs,
    );

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line) as { id?: unknown };
          if (msg.id === expectedId) {
            clearTimeout(timer);
            child.stdout!.off('data', onData);
            resolve(msg);
            return;
          }
        } catch {
          // Not a complete JSON frame — skip; buffer handles partial lines above
        }
      }
    };

    child.stdout!.on('data', onData);
  });
}

/**
 * Full JSON-RPC handshake: initialize + notifications/initialized.
 * Must be completed before calling tools/list or tools/call.
 */
async function handshake(child: ReturnType<typeof spawn>): Promise<void> {
  writeFrame(child, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'smoke-test', version: '1.0' },
    },
  });
  await readResponse(child, 1);
  writeFrame(child, { jsonrpc: '2.0', method: 'notifications/initialized' });
}

describe('MCP server smoke', () => {
  let children: ChildProcess[] = [];

  function trackedSpawnServer(): ChildProcess {
    const c = spawnServer();
    children.push(c);
    return c;
  }

  afterEach(async () => {
    for (const c of children) {
      if (c.exitCode === null) {
        c.kill();
        await Promise.race([
          once(c, 'exit'),
          new Promise((r) => setTimeout(r, 1000)),
        ]);
      }
    }
    children = [];
  });

  it('registers all 9 MCP tools (tools/list round-trip)', async () => {
    const child = trackedSpawnServer();
    await handshake(child);

    writeFrame(child, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const response = (await readResponse(child, 2)) as {
      result: { tools: Array<{ name: string }> };
    };

    expect(response.result.tools).toHaveLength(9);

    const names = response.result.tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'localground_audit',
      'localground_cleanup_scan',
      'localground_copy',
      'localground_decode_path_hash',
      'localground_detect',
      'localground_health_check',
      'localground_placeholder_check',
      'localground_seed',
      'localground_verify',
    ]);
  });

  it('localground_detect tool returns structured JSON content', async () => {
    const child = trackedSpawnServer();
    await handshake(child);

    writeFrame(child, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'localground_detect', arguments: {} },
    });
    const response = (await readResponse(child, 3, 15000)) as {
      result: { content: Array<{ type: string; text: string }> };
    };

    expect(response.result.content[0].type).toBe('text');

    // The text body is JSON-serialized core Result data — must parse as JSON
    const parsed = JSON.parse(response.result.content[0].text) as { platform?: unknown };
    expect(parsed).toHaveProperty('platform');
  });
});
