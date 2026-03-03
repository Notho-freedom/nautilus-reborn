import { useState, useEffect } from 'react';
import { Download, Pause, Play, X, FolderOpen, CheckCircle2, AlertCircle, FileText, Image, Archive, Film } from 'lucide-react';

interface DownloadItem {
  id: string;
  name: string;
  size: string;
  progress: number;
  status: 'downloading' | 'paused' | 'completed' | 'failed';
  icon: 'file' | 'image' | 'archive' | 'video';
  speed?: string;
}

const ICONS = { file: FileText, image: Image, archive: Archive, video: Film };

const INITIAL_DOWNLOADS: DownloadItem[] = [
  { id: '1', name: 'notilus-v2.3.0.tar.gz', size: '45.2 MB', progress: 67, status: 'downloading', icon: 'archive', speed: '2.3 MB/s' },
  { id: '2', name: 'screenshot-2024.png', size: '1.8 MB', progress: 34, status: 'paused', icon: 'image' },
  { id: '3', name: 'react-docs.pdf', size: '12.4 MB', progress: 100, status: 'completed', icon: 'file' },
  { id: '4', name: 'demo-video.mp4', size: '234 MB', progress: 12, status: 'failed', icon: 'video' },
  { id: '5', name: 'tailwind-cheatsheet.pdf', size: '3.1 MB', progress: 100, status: 'completed', icon: 'file' },
];

export function DownloadsPanel() {
  const [downloads, setDownloads] = useState<DownloadItem[]>(INITIAL_DOWNLOADS);

  useEffect(() => {
    const iv = setInterval(() => {
      setDownloads(prev => prev.map(d => {
        if (d.status === 'downloading' && d.progress < 100) {
          const newP = Math.min(100, d.progress + Math.random() * 3);
          return { ...d, progress: Math.round(newP), status: newP >= 100 ? 'completed' : 'downloading' };
        }
        return d;
      }));
    }, 500);
    return () => clearInterval(iv);
  }, []);

  const togglePause = (id: string) => {
    setDownloads(prev => prev.map(d => {
      if (d.id === id) {
        if (d.status === 'downloading') return { ...d, status: 'paused' };
        if (d.status === 'paused') return { ...d, status: 'downloading' };
      }
      return d;
    }));
  };

  const cancel = (id: string) => setDownloads(prev => prev.filter(d => d.id !== id));

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-mono font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
          <Download size={12} /> Downloads
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {downloads.map(d => {
          const Icon = ICONS[d.icon];
          return (
            <div key={d.id} className="px-3 py-2.5 border-b border-border/50 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-2">
                <Icon size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-foreground truncate">{d.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-muted-foreground">{d.size}</span>
                    {d.speed && d.status === 'downloading' && (
                      <span className="text-[9px] text-primary">{d.speed}</span>
                    )}
                    {d.status === 'completed' && (
                      <span className="flex items-center gap-0.5 text-[9px] text-green-500"><CheckCircle2 size={8} /> Done</span>
                    )}
                    {d.status === 'failed' && (
                      <span className="flex items-center gap-0.5 text-[9px] text-destructive"><AlertCircle size={8} /> Failed</span>
                    )}
                    {d.status === 'paused' && (
                      <span className="text-[9px] text-yellow-500">Paused</span>
                    )}
                  </div>
                  {(d.status === 'downloading' || d.status === 'paused') && (
                    <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full notilus-gradient transition-all duration-300"
                        style={{ width: `${d.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {(d.status === 'downloading' || d.status === 'paused') && (
                    <>
                      <button onClick={() => togglePause(d.id)} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors">
                        {d.status === 'downloading' ? <Pause size={10} /> : <Play size={10} />}
                      </button>
                      <button onClick={() => cancel(d.id)} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors">
                        <X size={10} />
                      </button>
                    </>
                  )}
                  {d.status === 'completed' && (
                    <button className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors">
                      <FolderOpen size={10} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t border-border">
        <div className="text-[9px] text-muted-foreground text-center">
          {downloads.filter(d => d.status === 'downloading').length} active • Ctrl+J
        </div>
      </div>
    </div>
  );
}
