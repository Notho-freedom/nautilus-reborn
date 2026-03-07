import type {
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalSessionOpenRequest,
  TerminalSessionOpenResponse,
} from '../../shared/terminal-contract';
import {
  desktopCloseTerminalSession,
  desktopOpenTerminalSession,
  desktopResizeTerminalSession,
  desktopSendTerminalInput,
  isDesktopRuntime,
  onDesktopTerminalData,
  onDesktopTerminalExit,
} from './electronBridge';

export async function openTerminalSession(
  payload: TerminalSessionOpenRequest
): Promise<TerminalSessionOpenResponse | null> {
  if (!isDesktopRuntime()) return null;
  return desktopOpenTerminalSession(payload);
}

export async function sendTerminalInput(sessionId: string, data: string): Promise<void> {
  if (!isDesktopRuntime()) return;
  await desktopSendTerminalInput({ sessionId, data });
}

export async function resizeTerminalSession(
  sessionId: string,
  cols: number,
  rows: number
): Promise<void> {
  if (!isDesktopRuntime()) return;
  await desktopResizeTerminalSession({ sessionId, cols, rows });
}

export async function closeTerminalSession(sessionId: string): Promise<void> {
  if (!isDesktopRuntime()) return;
  await desktopCloseTerminalSession({ sessionId });
}

export function subscribeTerminalData(
  listener: (event: TerminalDataEvent) => void
): () => void {
  if (!isDesktopRuntime()) return () => {};
  return onDesktopTerminalData(listener);
}

export function subscribeTerminalExit(
  listener: (event: TerminalExitEvent) => void
): () => void {
  if (!isDesktopRuntime()) return () => {};
  return onDesktopTerminalExit(listener);
}
