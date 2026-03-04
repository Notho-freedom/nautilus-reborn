import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, Link2, SendHorizontal, StickyNote, Trash2, X } from 'lucide-react';
import {
  addFlouNote,
  clearFlouEntries,
  getFlouEntries,
  removeFlouEntry,
  subscribeToFlouUpdates,
  type FlouEntry,
} from '@/lib/flou';

interface FlouPanelProps {
  onNavigate?: (url: string) => void;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function FlouPanel({ onNavigate }: FlouPanelProps) {
  const [entries, setEntries] = useState<FlouEntry[]>([]);
  const [noteDraft, setNoteDraft] = useState('');

  const refreshEntries = useCallback(() => {
    setEntries(getFlouEntries());
  }, []);

  useEffect(() => {
    refreshEntries();
    return subscribeToFlouUpdates(refreshEntries);
  }, [refreshEntries]);

  const orderedEntries = useMemo(() => [...entries], [entries]);

  const submitNote = (event: React.FormEvent) => {
    event.preventDefault();
    const created = addFlouNote(noteDraft);
    if (!created) return;
    setNoteDraft('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest">
            Flou
          </h3>
          <button
            onClick={clearFlouEntries}
            className="h-7 px-2 rounded-md text-[10px] font-body text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-fast"
            title="Clear all entries"
          >
            Clear all
          </button>
        </div>
        <form onSubmit={submitNote} className="flex items-center gap-1.5">
          <input
            value={noteDraft}
            onChange={event => setNoteDraft(event.target.value)}
            placeholder="Drop a quick note..."
            className="flex-1 h-8 rounded-md bg-notilus-surface-1 border border-border px-2 text-xs font-body text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
          />
          <button
            type="submit"
            className="h-8 px-2 rounded-md notilus-gradient text-[11px] font-body text-primary-foreground flex items-center gap-1"
            title="Add note"
          >
            <SendHorizontal size={11} />
            Add
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
        {orderedEntries.map(entry => (
          <div
            key={entry.id}
            className="group rounded-lg border border-border bg-notilus-surface-1 p-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {entry.type === 'page' ? (
                  <Link2 size={12} className="text-primary shrink-0" />
                ) : (
                  <StickyNote size={12} className="text-info shrink-0" />
                )}
                <span className="text-xs font-body text-foreground truncate">{entry.title}</span>
              </div>
              <button
                onClick={() => removeFlouEntry(entry.id)}
                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-fast opacity-0 group-hover:opacity-100 shrink-0"
                title="Remove entry"
              >
                <X size={10} />
              </button>
            </div>

            <div className="mt-1.5 rounded-md bg-notilus-surface-2/80 px-2 py-1.5">
              {entry.type === 'page' ? (
                <>
                  <div className="text-[11px] font-body text-foreground break-all">{entry.url}</div>
                  <button
                    onClick={() => onNavigate?.(entry.url)}
                    className="mt-1 text-[10px] font-body text-primary hover:text-primary/80 transition-colors duration-fast"
                  >
                    Open page
                  </button>
                </>
              ) : (
                <div className="text-[11px] font-body text-foreground whitespace-pre-wrap break-words">
                  {entry.text}
                </div>
              )}
            </div>

            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-body text-muted-foreground">
              <Clock3 size={10} />
              {formatTime(entry.createdAt)}
            </div>
          </div>
        ))}

        {orderedEntries.length === 0 && (
          <div className="h-full min-h-[180px] flex items-center justify-center">
            <div className="text-center">
              <Trash2 size={14} className="text-muted-foreground mx-auto mb-1.5" />
              <p className="text-xs font-body text-muted-foreground">
                Flou is empty. Send pages or add notes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
