import { useState } from 'react';

const INITIAL_LINES = [
  { type: 'system', text: '╔══════════════════════════════════╗' },
  { type: 'system', text: '║  NOTILUS TERMINAL v2.0.0         ║' },
  { type: 'system', text: '╚══════════════════════════════════╝' },
  { type: 'system', text: 'Type "help" for available commands.' },
  { type: 'prompt', text: '' },
];

const COMMANDS: Record<string, string> = {
  help: 'Available commands: help, clear, version, whoami, date, neofetch, theme, status',
  version: 'Notilus Browser v2.0.0-beta | Engine: React 18 + Vite',
  whoami: 'developer@notilus',
  date: new Date().toLocaleString(),
  theme: 'Active theme: Rouge Notilus (#FF2D55)',
  status: '● System: Online\n● Tabs: Active\n● AI: Ready\n● DevTools: Available',
  neofetch: `
  ╔══════════════════╗    OS: Notilus OS
  ║   N O T I L U S  ║    Host: Web Browser
  ║   ░░░░░░░░░░░░   ║    Kernel: React 18.3
  ║   ░░██░░░░██░░   ║    Shell: Notilus Terminal
  ║   ░░░░░░░░░░░░   ║    Resolution: ${window.innerWidth}x${window.innerHeight}
  ║   ░░░████░░░░░   ║    Theme: Rouge Notilus
  ║   ░░░░░░░░░░░░   ║    Engine: Vite + TypeScript
  ╚══════════════════╝    Font: Orbitron + Rajdhani`,
};

export function TerminalPanel() {
  const [lines, setLines] = useState(INITIAL_LINES);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim().toLowerCase();
    if (!cmd) return;

    setHistory(prev => [cmd, ...prev]);
    setHistIdx(-1);
    const newLines = [...lines.slice(0, -1), { type: 'input', text: `$ ${input}` }];

    if (cmd === 'clear') {
      setLines([{ type: 'system', text: 'Terminal cleared.' }, { type: 'prompt', text: '' }]);
    } else if (COMMANDS[cmd]) {
      newLines.push({ type: 'output', text: COMMANDS[cmd] });
      newLines.push({ type: 'prompt', text: '' });
      setLines(newLines);
    } else {
      newLines.push({ type: 'error', text: `notilus: command not found: ${cmd}` });
      newLines.push({ type: 'prompt', text: '' });
      setLines(newLines);
    }
    setInput('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' && history.length > 0) {
      const idx = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(idx);
      setInput(history[idx]);
    } else if (e.key === 'ArrowDown') {
      const idx = histIdx - 1;
      if (idx < 0) { setHistIdx(-1); setInput(''); }
      else { setHistIdx(idx); setInput(history[idx]); }
    }
  };

  return (
    <div className="flex flex-col h-full p-2">
      <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest px-1 pb-2">
        Terminal
      </h3>
      <div className="flex-1 bg-background/50 rounded-lg border border-border p-2 overflow-y-auto scrollbar-thin font-mono text-xs space-y-0.5">
        {lines.map((line, i) => {
          if (line.type === 'prompt') return null;
          return (
            <div key={i} className={
              line.type === 'system' ? 'text-muted-foreground' :
              line.type === 'input' ? 'text-primary' :
              line.type === 'error' ? 'text-error' :
              'text-foreground whitespace-pre-wrap'
            }>
              {line.text}
            </div>
          );
        })}
        <form onSubmit={handleSubmit} className="flex items-center gap-1">
          <span className="text-primary font-display text-[10px]">❯</span>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            className="flex-1 bg-transparent outline-none text-foreground caret-primary"
            autoFocus
          />
        </form>
      </div>
    </div>
  );
}
