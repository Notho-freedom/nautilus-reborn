import { useState } from 'react';
import { cn } from '@/lib/utils';

type StorageTab = 'localStorage' | 'sessionStorage' | 'cookies';

const MOCK_DATA: Record<StorageTab, { key: string; value: string }[]> = {
  localStorage: [
    { key: 'notilus-theme', value: 'dark-red' },
    { key: 'notilus-sidebar', value: '{"open":true,"panel":"monitor"}' },
    { key: 'notilus-bookmarks', value: '[{"title":"GitHub","url":"https://github.com"}]' },
    { key: 'notilus-settings', value: '{"adBlocker":true,"searchEngine":"duckduckgo"}' },
    { key: 'notilus-ai-history', value: '[{"role":"user","content":"Hello"}]' },
  ],
  sessionStorage: [
    { key: 'notilus-active-tab', value: 'tab-1' },
    { key: 'notilus-scroll-pos', value: '{"x":0,"y":342}' },
    { key: 'notilus-devtools-height', value: '300' },
  ],
  cookies: [
    { key: 'session_id', value: 'abc123def456' },
    { key: 'csrf_token', value: 'xyz789_secure' },
    { key: 'preferred_lang', value: 'en' },
    { key: '_ga', value: 'GA1.1.123456789' },
  ],
};

export function DevApplication() {
  const [tab, setTab] = useState<StorageTab>('localStorage');
  const tabs: StorageTab[] = ['localStorage', 'sessionStorage', 'cookies'];

  return (
    <div className="flex flex-col h-full text-[11px] font-mono">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-card/50 shrink-0">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("px-2 py-0.5 rounded text-[10px] transition-colors", tab === t ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}
          >
            {t}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground">{MOCK_DATA[tab].length} entries</span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_2fr] gap-2 px-3 py-1 bg-secondary/30 text-[9px] text-muted-foreground uppercase tracking-wider border-b border-border shrink-0">
        <span>Key</span><span>Value</span>
      </div>

      {/* Data */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {MOCK_DATA[tab].map((entry, i) => (
          <div key={i} className="grid grid-cols-[1fr_2fr] gap-2 px-3 py-1.5 border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer">
            <span className="text-purple-400 truncate">{entry.key}</span>
            <span className="text-foreground truncate">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
