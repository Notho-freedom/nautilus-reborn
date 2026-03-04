import { ipcMain } from 'electron';
import type { StudioCssRequest, StudioScriptRequest, StudioViewportRequest } from '../../../shared/browser-contract';
import { BrowserIpcChannels } from '../../../shared/browser-contract';
import { StudioManager } from '../studio-manager';

interface RegisterStudioIpcOptions {
  studioManager: StudioManager;
  debug: boolean;
}

function removeExistingHandlers() {
  ipcMain.removeHandler(BrowserIpcChannels.studioResizeWindow);
  ipcMain.removeHandler(BrowserIpcChannels.studioCaptureViewport);
  ipcMain.removeHandler(BrowserIpcChannels.studioCaptureFullPage);
  ipcMain.removeHandler(BrowserIpcChannels.studioApplyCss);
  ipcMain.removeHandler(BrowserIpcChannels.studioClearCss);
  ipcMain.removeHandler(BrowserIpcChannels.studioRunScript);
  ipcMain.removeHandler(BrowserIpcChannels.studioStartRecording);
  ipcMain.removeHandler(BrowserIpcChannels.studioStopRecording);
  ipcMain.removeHandler(BrowserIpcChannels.studioGetRecording);
}

export function registerStudioIpc({ studioManager, debug }: RegisterStudioIpcOptions) {
  const log = (channel: string, payload?: unknown) => {
    if (!debug) return;
    const serialized = payload ? JSON.stringify(payload) : '';
    console.info(`[ipc] ${channel} ${serialized}`);
  };

  removeExistingHandlers();

  ipcMain.handle(BrowserIpcChannels.studioResizeWindow, (_event, payload: StudioViewportRequest) => {
    log(BrowserIpcChannels.studioResizeWindow, payload);
    studioManager.resizeWindow(payload);
  });

  ipcMain.handle(BrowserIpcChannels.studioCaptureViewport, async () => {
    log(BrowserIpcChannels.studioCaptureViewport);
    return studioManager.captureViewport();
  });

  ipcMain.handle(BrowserIpcChannels.studioCaptureFullPage, async () => {
    log(BrowserIpcChannels.studioCaptureFullPage);
    return studioManager.captureFullPage();
  });

  ipcMain.handle(BrowserIpcChannels.studioApplyCss, async (_event, payload: StudioCssRequest) => {
    log(BrowserIpcChannels.studioApplyCss);
    await studioManager.applyCss(payload.css);
  });

  ipcMain.handle(BrowserIpcChannels.studioClearCss, async () => {
    log(BrowserIpcChannels.studioClearCss);
    await studioManager.clearCss();
  });

  ipcMain.handle(BrowserIpcChannels.studioRunScript, async (_event, payload: StudioScriptRequest) => {
    log(BrowserIpcChannels.studioRunScript);
    return studioManager.runScript(payload.script);
  });

  ipcMain.handle(BrowserIpcChannels.studioStartRecording, async () => {
    log(BrowserIpcChannels.studioStartRecording);
    return studioManager.startRecording();
  });

  ipcMain.handle(BrowserIpcChannels.studioStopRecording, async () => {
    log(BrowserIpcChannels.studioStopRecording);
    return studioManager.stopRecording();
  });

  ipcMain.handle(BrowserIpcChannels.studioGetRecording, () => {
    log(BrowserIpcChannels.studioGetRecording);
    return studioManager.getRecording();
  });
}
