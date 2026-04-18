import { useMemo, useState } from 'react';
import { Search, Trash2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConsoleEntry, DevtoolsConsoleLevel } from '@/types/devtools';

interface DevConsoleProps {
  logs: ConsoleEntry[];
  onExecute: (script: string) => Promise<string | null>;
  onClear: () => void;
}

const LEVEL_STYLES: Record<DevtoolsConsoleLevel, string> = {
  log: 'text-foreground',
  info: 'text-blue-400',
  warn: 'text-yellow-400 bg-yellow-400/5',
  error: 'text-red-400 bg-red-400/5',
  debug: 'text-purple-400',
  table: 'text-pink-400',
};

const LEVEL_BADGE: Record<DevtoolsConsoleLevel, string> = {
  log: 'bg-muted/40 text-muted-foreground',
  info: 'bg-blue-500/15 text-blue-400',
  warn: 'bg-yellow-500/15 text-yellow-400',
  error: 'bg-red-500/15 text-red-400',
  debug: 'bg-purple-500/15 text-purple-400',
  table: 'bg-pink-500/15 text-pink-400',
};

type ConsoleFilterLevel = DevtoolsConsoleLevel | 'all';

interface LocalConsoleEntry extends ConsoleEntry {
  local?: boolean;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '--:--:--.---';
  return date.toLocaleTimeString('en-GB', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions);
}

export function DevConsole({ logs, onExecute, onClear }: DevConsoleProps) {
  const [filter, setFilter] = useState('');
  const [activeLevel, setActiveLevel] = useState<ConsoleFilterLevel>('all');
  const [input, setInput] = useState('');
  const [localEntries, setLocalEntries] = useState<LocalConsoleEntry[]>([]);

  const levels: ConsoleFilterLevel[] = ['all', 'log', 'info', 'warn', 'error', 'debug', 'table'];

  const mergedLogs = useMemo(() => {
    const normalizedRemote = logs.map(entry => ({ ...entry, local: false }));
    return [...normalizedRemote, ...localEntries].sort((a, b) => a.timestamp - b.timestamp);
  }, [localEntries, logs]);

  const filteredLogs = useMemo(() => {
    return mergedLogs.filter(entry => {
      if (activeLevel !== 'all' && entry.level !== activeLevel) return false;
      if (filter && !entry.message.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [activeLevel, filter, mergedLogs]);

  const countByLevel = useMemo(() => {
    return levels.reduce<Record<string, number>>((acc, level) => {
      if (level === 'all') {
        acc[level] = mergedLogs.length;
        return acc;
      }
      acc[level] = mergedLogs.filter(entry => entry.level === level).length;
      return acc;
    }, {});
  }, [levels, mergedLogs]);

  const handleClear = () => {
    setLocalEntries([]);
    onClear();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const script = input.trim();
    if (!script) return;

    const commandEntry: LocalConsoleEntry = {
      id: `command-${Date.now()}`,
      level: 'log',
      message: `> ${script}`,
      timestamp: Date.now(),
      source: 'Notilus DevTools',
      local: true,
    };

    setLocalEntries(previous => [...previous, commandEntry]);
    setInput('');

    const result = await onExecute(script);
    if (result == null || result.trim() === '') {
      return;
    }

    const outputEntry: LocalConsoleEntry = {
      id: `output-${Date.now()}`,
      level: result.startsWith('Error:') ? 'error' : 'info',
      message: result,
      timestamp: Date.now(),
      source: 'Notilus DevTools',
      local: true,
    };

    setLocalEntries(previous => [...previous, outputEntry]);
  };

  return (
    <div className="flex h-full flex-col text-[11px] font-mono">
      <div className="flex items-center gap-1 bg-notilus-surface-2/30 px-2 py-1 shrink-0">
        <button
          type="button"
          onClick={handleClear}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-notilus-surface-2/60 hover:text-foreground"
          title="Clear"
        >
          <Trash2 size={12} strokeWidth={1.5} />
        </button>
        <div className="mx-1 h-4 w-px bg-border/30" />
        {levels.map(level => (
          <button
            key={level}
            type="button"
            onClick={() => setActiveLevel(level)}
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] capitalize transition-colors',
              activeLevel === level
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2/60'
            )}
          >
            {level}
            {level !== 'all' ? <span className="ml-0.5 opacity-60 tabular-nums">({countByLevel[level] ?? 0})</span> : null}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex h-5 items-center gap-1 rounded-md bg-notilus-surface-2/60 px-1.5">
          <Search size={10} strokeWidth={1.5} className="text-muted-foreground" />
          <input
            value={filter}
            onChange={event => setFilter(event.target.value)}
            placeholder="Filter..."
            className="w-32 bg-transparent text-[10px] text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredLogs.map(entry => (
          <div
            key={entry.id}
            className={cn(
              'flex items-start gap-2 px-2 py-0.5 hover:bg-notilus-surface-2/40 transition-colors',
              LEVEL_STYLES[entry.level]
            )}
          >
            <span className={cn('mt-0.5 shrink-0 rounded px-1 text-[9px]', LEVEL_BADGE[entry.level])}>
              {entry.level}
            </span>
            <span className="flex-1 break-all">{entry.message}</span>
            {entry.source ? (
              <span className="shrink-0 text-[9px] text-muted-foreground">{entry.source}</span>
            ) : null}
            <span className="shrink-0 text-[9px] text-muted-foreground tabular-nums">
              {formatTimestamp(entry.timestamp)}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-1 bg-notilus-surface-2/30 px-2 py-1 shrink-0">
        <ChevronRight size={12} strokeWidth={1.5} className="shrink-0 text-primary" />
        <input
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Enter expression..."
          className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground outline-none"
        />
      </form>
    </div>
  );
}
