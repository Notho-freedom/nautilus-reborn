import { ipcMain } from 'electron';
import type {
  TerminalCloseRequest,
  TerminalInputRequest,
  TerminalResizeRequest,
  TerminalSessionOpenRequest,
} from '../../../shared/terminal-contract';
import { BrowserIpcChannels } from '../../../shared/browser-contract';
import { TerminalManager } from '../terminal-manager';

interface RegisterTerminalIpcOptions {
  terminalManager: TerminalManager;
  debug: boolean;
}

function removeExistingHandlers() {
  ipcMain.removeHandler(BrowserIpcChannels.terminalOpen);
  ipcMain.removeHandler(BrowserIpcChannels.terminalInput);
  ipcMain.removeHandler(BrowserIpcChannels.terminalResize);
  ipcMain.removeHandler(BrowserIpcChannels.terminalClose);
}

export function registerTerminalIpc({ terminalManager, debug }: RegisterTerminalIpcOptions) {
  removeExistingHandlers();

  const log = (channel: string, payload?: unknown) => {
    if (!debug) return;
    const serialized = payload ? JSON.stringify(payload) : '';
    console.info(`[ipc] ${channel} ${serialized}`);
  };

  ipcMain.handle(
    BrowserIpcChannels.terminalOpen,
    (_event, payload: TerminalSessionOpenRequest) => {
      log(BrowserIpcChannels.terminalOpen, payload);
      return terminalManager.openSession(payload);
    }
  );

  ipcMain.handle(BrowserIpcChannels.terminalInput, (_event, payload: TerminalInputRequest) => {
    log(BrowserIpcChannels.terminalInput, payload);
    terminalManager.sendInput(payload);
  });

  ipcMain.handle(
    BrowserIpcChannels.terminalResize,
    (_event, payload: TerminalResizeRequest) => {
      log(BrowserIpcChannels.terminalResize, payload);
      terminalManager.resizeSession(payload);
    }
  );

  ipcMain.handle(BrowserIpcChannels.terminalClose, (_event, payload: TerminalCloseRequest) => {
    log(BrowserIpcChannels.terminalClose, payload);
    terminalManager.closeSession(payload);
  });
}
