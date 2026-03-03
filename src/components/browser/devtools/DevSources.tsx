import { FileText, FileCode, Image, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SourceFile {
  name: string;
  path: string;
  type: 'js' | 'css' | 'img' | 'other';
  size: string;
}

const MOCK_SOURCES: SourceFile[] = [
  { name: 'index.html', path: '/', type: 'other', size: '1.2 KB' },
  { name: 'main.tsx', path: '/src/', type: 'js', size: '845 B' },
  { name: 'App.tsx', path: '/src/', type: 'js', size: '2.1 KB' },
  { name: 'BrowserShell.tsx', path: '/src/components/browser/', type: 'js', size: '3.4 KB' },
  { name: 'SpeedDial.tsx', path: '/src/components/browser/', type: 'js', size: '4.2 KB' },
  { name: 'index.css', path: '/src/', type: 'css', size: '3.8 KB' },
  { name: 'utils.ts', path: '/src/lib/', type: 'js', size: '256 B' },
  { name: 'useBrowserState.ts', path: '/src/hooks/', type: 'js', size: '2.8 KB' },
  { name: 'favicon.ico', path: '/public/', type: 'img', size: '4.1 KB' },
  { name: 'logo.svg', path: '/public/', type: 'img', size: '1.1 KB' },
  { name: 'vite.config.ts', path: '/', type: 'js', size: '512 B' },
  { name: 'tailwind.config.ts', path: '/', type: 'js', size: '1.8 KB' },
];

const TYPE_ICONS = { js: FileCode, css: FileText, img: Image, other: File };
const TYPE_COLORS = { js: 'text-yellow-400', css: 'text-blue-400', img: 'text-green-400', other: 'text-muted-foreground' };

export function DevSources() {
  const grouped = MOCK_SOURCES.reduce((acc, s) => {
    (acc[s.path] = acc[s.path] || []).push(s);
    return acc;
  }, {} as Record<string, SourceFile[]>);

  return (
    <div className="flex flex-col h-full text-[11px] font-mono">
      <div className="flex items-center gap-2 px-2 py-1 border-b border-border bg-card/50 shrink-0">
        <span className="text-[10px] text-muted-foreground">{MOCK_SOURCES.length} files loaded</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {Object.entries(grouped).map(([path, files]) => (
          <div key={path}>
            <div className="px-2 py-1 bg-secondary/30 text-[9px] text-muted-foreground sticky top-0">{path}</div>
            {files.map(f => {
              const Icon = TYPE_ICONS[f.type];
              return (
                <div key={f.name} className="flex items-center gap-2 px-3 py-1 hover:bg-muted/20 transition-colors cursor-pointer">
                  <Icon size={12} className={cn(TYPE_COLORS[f.type])} />
                  <span className="text-foreground flex-1">{f.name}</span>
                  <span className="text-muted-foreground text-[9px]">{f.size}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
