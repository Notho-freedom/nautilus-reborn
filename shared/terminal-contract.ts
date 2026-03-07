export interface TerminalSessionOpenRequest {
  cwd?: string;
  shell?: string;
  cols: number;
  rows: number;
}

export interface TerminalSessionOpenResponse {
  sessionId: string;
}

export interface TerminalInputRequest {
  sessionId: string;
  data: string;
}

export interface TerminalResizeRequest {
  sessionId: string;
  cols: number;
  rows: number;
}

export interface TerminalCloseRequest {
  sessionId: string;
}

export interface TerminalDataEvent {
  sessionId: string;
  data: string;
}

export interface TerminalExitEvent {
  sessionId: string;
  code: number | null;
}
