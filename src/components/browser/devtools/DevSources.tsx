import { FileText, FileCode, Image, File, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SourceFile } from '@/types/devtools';

interface DevSourcesProps {
  sources: SourceFile[];
  onRefresh: () => void;
}

const TYPE_ICONS = {
  js: FileCode,
  css: FileText,
  img: Image,
  other: File,
};

const TYPE_COLORS = {
  js: 'text-yellow-400',
  css: 'text-blue-400',
  img: 'text-green-400',
  other: 'text-muted-foreground',
};

function detectType(source: SourceFile): keyof typeof TYPE_ICONS {
  const url = source.url.toLowerCase();
  const mime = (source.mimeType ?? '').toLowerCase();
  if (mime.includes('javascript') || url.endsWith('.js') || url.endsWith('.mjs') || url.endsWith('.ts')) {
    return 'js';
  }
  if (mime.includes('css') || url.endsWith('.css')) {
    return 'css';
  }
  if (mime.startsWith('image/') || /\.(png|jpg|jpeg|svg|webp|gif|ico)$/.test(url)) {
    return 'img';
  }
  return 'other';
}

function formatSize(size?: number | null): string {
  if (size == null || Number.isNaN(size)) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function fileNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : parsed.hostname;
  } catch {
    const parts = url.split('/').filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : url;
  }
}

function pathFromUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    const pathname = parsed.pathname || '/';
    const index = pathname.lastIndexOf('/');
    return index > 0 ? pathname.slice(0, index + 1) : '/';
  } catch {
    const index = url.lastIndexOf('/');
    return index > 0 ? url.slice(0, index + 1) : '/';
  }
}

export function DevSources({ sources, onRefresh }: DevSourcesProps) {
  const grouped = sources.reduce<Record<string, SourceFile[]>>((acc, source) => {
    const path = pathFromUrl(source.url);
    if (!acc[path]) {
      acc[path] = [];
    }
    acc[path].push(source);
    return acc;
  }, {});

  return (
    <div className="flex h-full flex-col text-[11px] font-mono">
      <div className="flex items-center justify-between bg-notilus-surface-2/30 px-2 py-1 shrink-0">
        <span className="text-[10px] text-muted-foreground tabular-nums">{sources.length} files loaded</span>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-[10px] text-muted-foreground transition-colors hover:bg-notilus-surface-2/60 hover:text-foreground"
        >
          <RefreshCw size={11} strokeWidth={1.5} />
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {Object.entries(grouped).map(([path, files]) => (
          <div key={path}>
            <div className="sticky top-0 bg-notilus-surface-2/40 px-2 py-1 text-[9px] text-muted-foreground/70 uppercase tracking-[0.15em]">{path}</div>
            {files.map(source => {
              const type = detectType(source);
              const Icon = TYPE_ICONS[type];
              const fileName = fileNameFromUrl(source.url);
              return (
                <div
                  key={source.id}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1 transition-colors hover:bg-notilus-surface-2/40"
                >
                  <Icon size={12} strokeWidth={1.5} className={cn(TYPE_COLORS[type])} />
                  <span className="flex-1 truncate text-foreground">{fileName}</span>
                  <span className="text-[9px] text-muted-foreground tabular-nums">{formatSize(source.size)}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
