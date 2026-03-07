import { randomUUID } from 'node:crypto';
import pty from 'node-pty';
import type {
  TerminalCloseRequest,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalInputRequest,
  TerminalResizeRequest,
  TerminalSessionOpenRequest,
  TerminalSessionOpenResponse,
} from '../../shared/terminal-contract';

interface TerminalManagerOptions {
  debug: boolean;
  onData: (event: TerminalDataEvent) => void;
  onExit: (event: TerminalExitEvent) => void;
}

interface TerminalSession {
  process: pty.IPty;
  cleanup: () => void;
}

function resolveDefaultShell(): string {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'powershell.exe';
  }
  return process.env.SHELL || '/bin/bash';
}

export class TerminalManager {
  private readonly sessions = new Map<string, TerminalSession>();
  private readonly debug: boolean;
  private readonly onData: (event: TerminalDataEvent) => void;
  private readonly onExit: (event: TerminalExitEvent) => void;

  constructor(options: TerminalManagerOptions) {
    this.debug = options.debug;
    this.onData = options.onData;
    this.onExit = options.onExit;
  }

  openSession(payload: TerminalSessionOpenRequest): TerminalSessionOpenResponse {
    const sessionId = randomUUID();
    const shell = payload.shell?.trim() || resolveDefaultShell();
    const cwd = payload.cwd?.trim() || process.cwd();

    const proc = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: Math.max(40, payload.cols),
      rows: Math.max(10, payload.rows),
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
      },
    });

    const dataDisposable = proc.onData(data => {
      this.onData({ sessionId, data });
    });
    const exitDisposable = proc.onExit(({ exitCode }) => {
      this.onExit({ sessionId, code: Number.isFinite(exitCode) ? exitCode : null });
      this.closeSession({ sessionId });
    });

    this.sessions.set(sessionId, {
      process: proc,
      cleanup: () => {
        dataDisposable.dispose();
        exitDisposable.dispose();
      },
    });
    this.log('terminal:open', `${sessionId} shell=${shell} cwd=${cwd}`);
    return { sessionId };
  }

  sendInput(payload: TerminalInputRequest): void {
    const session = this.sessions.get(payload.sessionId);
    if (!session) return;
    session.process.write(payload.data);
  }

  resizeSession(payload: TerminalResizeRequest): void {
    const session = this.sessions.get(payload.sessionId);
    if (!session) return;
    session.process.resize(Math.max(40, payload.cols), Math.max(10, payload.rows));
  }

  closeSession(payload: TerminalCloseRequest): void {
    const session = this.sessions.get(payload.sessionId);
    if (!session) return;
    try {
      session.process.kill();
    } catch {
      // Ignore already closed process.
    }
    session.cleanup();
    this.sessions.delete(payload.sessionId);
    this.log('terminal:close', payload.sessionId);
  }

  dispose(): void {
    for (const sessionId of [...this.sessions.keys()]) {
      this.closeSession({ sessionId });
    }
  }

  private log(event: string, message: string): void {
    if (!this.debug) return;
    console.info(`[terminal-manager] ${event} ${message}`);
  }
}
