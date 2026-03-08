import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StorageItem } from '@/types/devtools';

type StorageTab = 'localStorage' | 'sessionStorage' | 'cookie';

interface DevApplicationProps {
  storage: Record<StorageTab, StorageItem[]>;
  onRefresh: () => void;
}

export function DevApplication({ storage, onRefresh }: DevApplicationProps) {
  const [activeTab, setActiveTab] = useState<StorageTab>('localStorage');

  const tabs: StorageTab[] = ['localStorage', 'sessionStorage', 'cookie'];

  const entries = useMemo(() => storage[activeTab] ?? [], [activeTab, storage]);

  return (
    <div className="flex h-full flex-col text-[11px] font-mono">
      <div className="flex items-center gap-1 border-b border-border/35 bg-card/50 px-2 py-1 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded px-2 py-0.5 text-[10px] transition-colors',
              activeTab === tab
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-6 items-center gap-1 rounded px-2 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <RefreshCw size={11} />
          Refresh
        </button>
        <span className="text-[10px] text-muted-foreground">{entries.length} entries</span>
      </div>

      <div className="grid shrink-0 grid-cols-[1fr_2fr] gap-2 border-b border-border/35 bg-secondary/30 px-3 py-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        <span>Key</span>
        <span>Value</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {entries.map((entry, index) => (
          <div
            key={`${entry.key}-${index}`}
            className="grid cursor-pointer grid-cols-[1fr_2fr] gap-2 border-b border-border/30 px-3 py-1.5 transition-colors hover:bg-muted/20"
          >
            <span className="truncate text-purple-400">{entry.key}</span>
            <span className="truncate text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
