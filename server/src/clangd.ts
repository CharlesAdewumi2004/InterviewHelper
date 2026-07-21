import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { CLANGD, toolchainEnv } from './toolchain.js';

// One clangd per WebSocket connection, speaking LSP over stdio. The client
// ships the whole buffer with every request; we own document sync (full-text
// didChange) so the editor side stays a dumb request/response bridge.
// Booted eagerly at connect: the first parse of <bits/stdc++.h> takes
// seconds, and doing it during pre-warm means completions are instant by the
// time the user types.

export type LspQueryKind = 'completion' | 'signature' | 'hover';

const METHODS: Record<LspQueryKind, string> = {
  completion: 'textDocument/completion',
  signature: 'textDocument/signatureHelp',
  hover: 'textDocument/hover',
};

const RPC_TIMEOUT_MS = 15_000; // generous: the first query may wait on the preamble build

interface RpcMessage {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
}

export class ClangdSession {
  private child: ChildProcessWithoutNullStreams | null = null;
  private stdoutBuf = Buffer.alloc(0);
  private nextId = 1;
  private pending = new Map<number, { resolve: (r: unknown) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();
  private readyPromise: Promise<boolean> | null = null;
  private dead = false;
  private disposed = false;

  private readonly uri: string;
  private text: string;
  private version = 1;

  constructor(initialBuffer: string) {
    const dir = path.join(os.tmpdir(), 'practice-ide', 'lsp');
    fs.mkdirSync(dir, { recursive: true });
    this.uri = pathToFileURL(path.join(dir, `live-${randomUUID().slice(0, 8)}.cpp`)).href;
    this.text = initialBuffer;
  }

  /** Resolves true once clangd is initialized; false if it can't run here. */
  ready(): Promise<boolean> {
    this.readyPromise ??= this.boot().catch(() => false);
    return this.readyPromise;
  }

  private async boot(): Promise<boolean> {
    if (!CLANGD || this.disposed) return false;
    try {
      this.child = spawn(
        CLANGD,
        ['--header-insertion=never', '--completion-style=detailed', '--background-index=false', '--log=error', '--limit-results=50'],
        { env: { ...process.env, ...toolchainEnv() }, stdio: ['pipe', 'pipe', 'pipe'] },
      );
    } catch {
      return false;
    }
    this.child.on('error', () => this.fail('clangd failed to start'));
    this.child.on('exit', () => this.fail('clangd exited'));
    this.child.stdout.on('data', (chunk: Buffer) => this.onData(chunk));
    this.child.stderr.on('data', () => {}); // --log=error keeps this quiet; drain regardless
    // A write racing clangd's death emits EPIPE on stdin — without a handler
    // that's an uncaught stream error that takes down the whole server.
    this.child.stdin.on('error', () => {});

    await this.rpc('initialize', {
      processId: process.pid,
      rootUri: null,
      capabilities: {
        textDocument: {
          completion: {
            completionItem: { snippetSupport: true, documentationFormat: ['plaintext', 'markdown'] },
          },
          signatureHelp: { signatureInformation: { documentationFormat: ['plaintext', 'markdown'] } },
          hover: { contentFormat: ['markdown', 'plaintext'] },
        },
      },
      initializationOptions: { fallbackFlags: ['-std=c++23', '-xc++'] },
    });
    this.notify('initialized', {});
    this.notify('textDocument/didOpen', {
      textDocument: { uri: this.uri, languageId: 'cpp', version: this.version, text: this.text },
    });
    return true;
  }

  /**
   * Sync the buffer and run one query. Monaco coordinates in (1-based);
   * returns the raw LSP result, or null when clangd is unavailable/errored.
   */
  async query(kind: LspQueryKind, buffer: string, line: number, column: number): Promise<unknown> {
    if (this.dead || this.disposed) return null;
    if (!(await this.ready())) return null;
    if (buffer !== this.text) {
      this.text = buffer;
      this.version += 1;
      this.notify('textDocument/didChange', {
        textDocument: { uri: this.uri, version: this.version },
        contentChanges: [{ text: buffer }], // rangeless change = full document
      });
    }
    try {
      return await this.rpc(METHODS[kind], {
        textDocument: { uri: this.uri },
        position: { line: line - 1, character: column - 1 },
      });
    } catch {
      return null;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.fail('session disposed');
    this.child?.kill();
    this.child = null;
  }

  // --- JSON-RPC plumbing ------------------------------------------------------

  private fail(reason: string): void {
    this.dead = true;
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error(reason));
    }
    this.pending.clear();
  }

  private write(msg: RpcMessage): void {
    const child = this.child;
    if (!child || this.dead) return;
    const body = Buffer.from(JSON.stringify(msg), 'utf8');
    child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
    child.stdin.write(body);
  }

  private notify(method: string, params: unknown): void {
    this.write({ jsonrpc: '2.0', method, params });
  }

  private rpc(method: string, params: unknown): Promise<unknown> {
    if (this.dead) return Promise.reject(new Error('clangd is not running'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`clangd ${method} timed out`));
      }, RPC_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      this.write({ jsonrpc: '2.0', id, method, params });
    });
  }

  private onData(chunk: Buffer): void {
    this.stdoutBuf = Buffer.concat([this.stdoutBuf, chunk]);
    for (;;) {
      const headerEnd = this.stdoutBuf.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;
      const header = this.stdoutBuf.subarray(0, headerEnd).toString('ascii');
      const lenMatch = /Content-Length:\s*(\d+)/i.exec(header);
      if (!lenMatch) {
        this.stdoutBuf = this.stdoutBuf.subarray(headerEnd + 4);
        continue;
      }
      const bodyEnd = headerEnd + 4 + Number(lenMatch[1]);
      if (this.stdoutBuf.length < bodyEnd) return;
      const body = this.stdoutBuf.subarray(headerEnd + 4, bodyEnd).toString('utf8');
      this.stdoutBuf = this.stdoutBuf.subarray(bodyEnd);
      try {
        this.dispatch(JSON.parse(body) as RpcMessage);
      } catch {
        // malformed frame — skip
      }
    }
  }

  private dispatch(msg: RpcMessage): void {
    if (msg.id !== undefined && msg.method) {
      // Server→client request (registerCapability, workDoneProgress/create…):
      // acknowledge with an empty result so clangd doesn't stall.
      this.write({ jsonrpc: '2.0', id: msg.id, result: null });
      return;
    }
    if (msg.id !== undefined) {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result ?? null);
      return;
    }
    // Notifications (publishDiagnostics etc.) are deliberately dropped:
    // surfacing live squiggles would change interview practice conditions —
    // finding out at compile time is part of the drill.
  }
}
