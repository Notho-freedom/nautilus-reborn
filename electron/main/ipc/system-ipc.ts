import { ipcMain } from 'electron';
import { BrowserIpcChannels } from '../../../shared/browser-contract';
import { SystemMetricsManager } from '../system-metrics-manager';

interface RegisterSystemIpcOptions {
  systemMetricsManager: SystemMetricsManager;
  debug: boolean;
}

function removeExistingHandlers() {
  ipcMain.removeHandler(BrowserIpcChannels.systemGetMetrics);
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
}
