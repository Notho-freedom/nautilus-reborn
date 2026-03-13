import { ipcMain } from 'electron';
import { BrowserIpcChannels } from '../../../shared/browser-contract';
import { SystemMetricsManager } from '../system-metrics-manager';

interface RegisterSystemIpcOptions {
  systemMetricsManager: SystemMetricsManager;
  debug: boolean;
}

function removeExistingHandlers() {
  ipcMain.removeHandler(BrowserIpcChannels.systemGetMetrics);
  ipcMain.removeHandler(BrowserIpcChannels.systemSubscribe);
  ipcMain.removeHandler(BrowserIpcChannels.systemUnsubscribe);
}

export function registerSystemIpc({
  systemMetricsManager,
  debug,
}: RegisterSystemIpcOptions) {
  removeExistingHandlers();

  ipcMain.handle(BrowserIpcChannels.systemGetMetrics, () => {
    if (debug) {
      console.info(`[ipc] ${BrowserIpcChannels.systemGetMetrics}`);
    }
    return systemMetricsManager.getSnapshot();
  });

  ipcMain.handle(BrowserIpcChannels.systemSubscribe, () => {
    if (debug) {
      console.info(`[ipc] ${BrowserIpcChannels.systemSubscribe}`);
    }
    systemMetricsManager.subscribe();
  });

  ipcMain.handle(BrowserIpcChannels.systemUnsubscribe, () => {
    if (debug) {
      console.info(`[ipc] ${BrowserIpcChannels.systemUnsubscribe}`);
    }
    systemMetricsManager.unsubscribe();
  });
}
