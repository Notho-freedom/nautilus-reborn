import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Download,
  FileText,
  FolderOpen,
  Image,
  Pause,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import type { DownloadDescriptor } from '../../../shared/browser-contract';
import {
  cancelDownload,
  clearCompletedDownloads,
  getDownloads,
  initializeDownloadsBridge,
  openDownload,
  pauseDownload,
  removeDownload,
  resumeDownload,
  showDownloadInFolder,
  subscribeToDownloadsUpdates,
} from '@/lib/downloads';

type DownloadIcon = 'file' | 'image' | 'archive' | 'video';

const ICONS = {
  file: FileText,
  image: Image,
  archive: Archive,
  video: FileText,
} as const;

function getDownloadIcon(item: DownloadDescriptor): DownloadIcon {
  const lower = item.name.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(lower)) return 'image';
  if (/\.(zip|rar|7z|tar|gz|bz2)$/i.test(lower)) return 'archive';
  if (/\.(mp4|mkv|avi|mov|webm)$/i.test(lower)) return 'video';
  return 'file';
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value >= 10 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function formatSpeed(speedBytesPerSecond: number | null): string {
  if (!speedBytesPerSecond || speedBytesPerSecond <= 0) return '';
  return `${formatBytes(speedBytesPerSecond)}/s`;
}

export function DownloadsPanel() {
  const [downloads, setDownloads] = useState<DownloadDescriptor[]>([]);

  const refresh = useCallback(() => {
    setDownloads(getDownloads());
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribeLocal = subscribeToDownloadsUpdates(refresh);
    let unsubscribeDesktop: (() => void) | null = null;

    void initializeDownloadsBridge().then(unsubscribe => {
      unsubscribeDesktop = unsubscribe;
      refresh();
    });

    return () => {
      unsubscribeLocal();
      unsubscribeDesktop?.();
    };
  }, [refresh]);

  const activeCount = useMemo(
    () => downloads.filter(item => item.status === 'downloading' || item.status === 'paused').length,
    [downloads]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest flex items-center gap-1.5">
            <Download size={12} /> Downloads
          </h3>
          <button
            onClick={() => void clearCompletedDownloads()}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2 transition-colors duration-fast"
            title="Clear completed downloads"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {downloads.map(item => {
          const Icon = ICONS[getDownloadIcon(item)];
          const progress =
            item.totalBytes && item.totalBytes > 0
              ? Math.round((item.receivedBytes / item.totalBytes) * 100)
              : 0;
          const isActive = item.status === 'downloading' || item.status === 'paused';

          return (
            <div
              key={item.id}
              className="px-3 py-2.5 border-b border-border/50 hover:bg-muted/30 transition-colors duration-fast"
            >
              <div className="flex items-start gap-2">
                <Icon size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-body text-foreground truncate">{item.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-body text-muted-foreground">
                      {item.totalBytes ? formatBytes(item.totalBytes) : formatBytes(item.receivedBytes)}
                    </span>
                    {item.status === 'downloading' && (
                      <span className="text-[10px] font-body text-primary">
                        {formatSpeed(item.speedBytesPerSecond)}
                      </span>
                    )}
                    {item.status === 'completed' && (
                      <span className="flex items-center gap-0.5 text-[10px] font-body text-success">
                        <CheckCircle2 size={9} /> Done
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span className="flex items-center gap-0.5 text-[10px] font-body text-error">
                        <AlertCircle size={9} /> Failed
                      </span>
                    )}
                    {item.status === 'cancelled' && (
                      <span className="text-[10px] font-body text-muted-foreground">Cancelled</span>
                    )}
                    {item.status === 'paused' && (
                      <span className="text-[10px] font-body text-warning">Paused</span>
                    )}
                  </div>
                  {isActive && (
                    <div className="mt-1.5 h-1 rounded-full bg-notilus-surface-2 overflow-hidden">
                      <div
                        className="h-full rounded-full notilus-gradient transition-all duration-300"
                        style={{ width: `${Math.max(2, progress)}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {item.status === 'downloading' && (
                    <button
                      onClick={() => void pauseDownload(item.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors duration-fast"
                      title="Pause"
                    >
                      <Pause size={11} />
                    </button>
                  )}
                  {item.status === 'paused' && (
                    <button
                      onClick={() => void resumeDownload(item.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors duration-fast"
                      title="Resume"
                    >
                      <Play size={11} />
                    </button>
                  )}
                  {isActive && (
                    <button
                      onClick={() => void cancelDownload(item.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors duration-fast"
                      title="Cancel"
                    >
                      <X size={11} />
                    </button>
                  )}
                  {item.status === 'completed' && (
                    <>
                      <button
                        onClick={() => void openDownload(item.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors duration-fast"
                        title="Open file"
                      >
                        <Play size={11} />
                      </button>
                      <button
                        onClick={() => void showDownloadInFolder(item.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors duration-fast"
                        title="Show in folder"
                      >
                        <FolderOpen size={11} />
                      </button>
                    </>
                  )}
                  {(item.status === 'completed' ||
                    item.status === 'failed' ||
                    item.status === 'cancelled') && (
                    <button
                      onClick={() => void removeDownload(item.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors duration-fast"
                      title="Remove"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {downloads.length === 0 && (
          <div className="p-6 text-center text-xs font-body text-muted-foreground">
            No downloads yet
          </div>
        )}
      </div>

      <div className="p-2 border-t border-border">
        <div className="text-[10px] font-body text-muted-foreground text-center">
          {activeCount} active • Ctrl+J
        </div>
      </div>
    </div>
  );
}
