import { useState } from 'react';
import { Search, Trash2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  source?: string;
}

const MOCK_LOGS: LogEntry[] = [
  { id: '1', level: 'log', message: 'Application initialized', timestamp: '12:34:01.234', source: 'app.js:12' },
  { id: '2', level: 'info', message: '[HMR] Hot module replacement enabled', timestamp: '12:34:01.456', source: 'vite.js:89' },
  { id: '3', level: 'warn', message: 'React.StrictMode is enabled — double renders expected', timestamp: '12:34:02.100', source: 'react-dom.js:421' },
  { id: '4', level: 'error', message: "TypeError: Cannot read properties of undefined (reading 'map')", timestamp: '12:34:02.890', source: 'UserList.tsx:34' },
  { id: '5', level: 'debug', message: 'Router navigation: / → /dashboard', timestamp: '12:34:03.012', source: 'router.ts:67' },
  { id: '6', level: 'log', message: 'Fetching user data from /api/users', timestamp: '12:34:03.500', source: 'api.ts:23' },
  { id: '7', level: 'info', message: 'WebSocket connection established', timestamp: '12:34:04.100', source: 'ws.ts:15' },
  { id: '8', level: 'warn', message: 'Deprecation warning: componentWillMount has been renamed', timestamp: '12:34:04.500', source: 'legacy.tsx:8' },
  { id: '9', level: 'error', message: 'Failed to fetch: net::ERR_CONNECTION_REFUSED', timestamp: '12:34:05.200', source: 'api.ts:45' },
  { id: '10', level: 'log', message: '> console.log("Hello Notilus!")', timestamp: '12:34:06.000' },
];

const LEVEL_STYLES: Record<LogLevel, string> = {
  log: 'text-foreground',
  info: 'text-blue-400',
  warn: 'text-yellow-400 bg-yellow-400/5',
  error: 'text-red-400 bg-red-400/5',
  debug: 'text-purple-400',
};

const LEVEL_BADGE: Record<LogLevel, string> = {
  log: 'bg-muted text-muted-foreground',
  info: 'bg-blue-500/20 text-blue-400',
  warn: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-red-500/20 text-red-400',
  debug: 'bg-purple-500/20 text-purple-400',
};

export function DevConsole() {
  const [logs, setLogs] = useState(MOCK_LOGS);
  const [filter, setFilter] = useState('');
  const [activeLevel, setActiveLevel] = useState<LogLevel | 'all'>('all');
  const [input, setInput] = useState('');

  const filtered = logs.filter(l => {
    if (activeLevel !== 'all' && l.level !== activeLevel) return false;
    if (filter && !l.message.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const newLog: LogEntry = {
      id: `user-${Date.now()}`,
      level: 'log',
      message: `> ${input}`,
      timestamp: new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 } as any),
    };
    setLogs(prev => [...prev, newLog]);
    setInput('');
  };

  const levels: (LogLevel | 'all')[] = ['all', 'log', 'info', 'warn', 'error', 'debug'];

  return (
    <div className="flex flex-col h-full text-[11px] font-mono">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-card/50 shrink-0">
        <button onClick={() => setLogs([])} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" title="Clear">
          <Trash2 size={12} />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        {levels.map(l => (
          <button
            key={l}
            onClick={() => setActiveLevel(l)}
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] transition-colors capitalize",
              activeLevel === l ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {l}
            {l !== 'all' && <span className="ml-0.5 opacity-60">({logs.filter(x => x.level === l).length})</span>}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center h-5 rounded bg-secondary/60 px-1.5 gap-1">
          <Search size={10} className="text-muted-foreground" />
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter..."
            className="w-24 bg-transparent text-[10px] text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.map(log => (
          <div key={log.id} className={cn("flex items-start gap-2 px-2 py-0.5 border-b border-border/30 hover:bg-muted/20", LEVEL_STYLES[log.level])}>
            <span className={cn("px-1 rounded text-[9px] shrink-0 mt-0.5", LEVEL_BADGE[log.level])}>{log.level}</span>
            <span className="flex-1 break-all">{log.message}</span>
            {log.source && <span className="text-[9px] text-muted-foreground shrink-0">{log.source}</span>}
            <span className="text-[9px] text-muted-foreground shrink-0">{log.timestamp}</span>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1 px-2 py-1 border-t border-border bg-card/50 shrink-0">
        <ChevronRight size={12} className="text-primary shrink-0" />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Enter expression..."
          className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground outline-none"
        />
      </form>
    </div>
  );
}
