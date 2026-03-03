import { useState } from 'react';

const INITIAL_LINES = [
  { type: 'system', text: 'Notilus Terminal v1.0.0' },
  { type: 'system', text: 'Type "help" for available commands.' },
  { type: 'prompt', text: '' },
];

const COMMANDS: Record<string, string> = {
  help: 'Available commands: help, clear, version, whoami, date, neofetch',
  version: 'Notilus Browser v2.0.0-beta',
  whoami: 'developer@notilus',
  date: new Date().toLocaleString(),
  neofetch: `
  ╔══════════════════╗    OS: Notilus OS
  ║   N O T I L U S  ║    Host: Web Browser
  ║   ░░░░░░░░░░░░   ║    Kernel: React 18.3
  ║   ░░██░░░░██░░   ║    Shell: Notilus Terminal
  ║   ░░░░░░░░░░░░   ║    Resolution: ${window.innerWidth}x${window.innerHeight}
  ║   ░░░████░░░░░   ║    Theme: Dark [Pink]
  ║   ░░░░░░░░░░░░   ║    Engine: Vite + TypeScript
  ╚══════════════════╝`,
};

export function TerminalPanel() {
  const [lines, setLines] = useState(INITIAL_LINES);
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim().toLowerCase();
    const newLines = [...lines.slice(0, -1), { type: 'input', text: `$ ${input}` }];

    if (cmd === 'clear') {
      setLines([{ type: 'system', text: 'Terminal cleared.' }, { type: 'prompt', text: '' }]);
    } else if (COMMANDS[cmd]) {
      newLines.push({ type: 'output', text: COMMANDS[cmd] });
      newLines.push({ type: 'prompt', text: '' });
      setLines(newLines);
    } else if (cmd) {
      newLines.push({ type: 'error', text: `Command not found: ${cmd}` });
      newLines.push({ type: 'prompt', text: '' });
      setLines(newLines);
    }
    setInput('');
  };

  return (
    <div className="flex flex-col h-full p-2">
      <h3 className="text-xs font-mono font-semibold text-primary uppercase tracking-wider px-1 pb-2">
        Terminal
      </h3>
      <div className="flex-1 bg-background/50 rounded-md p-2 overflow-y-auto scrollbar-thin font-mono text-xs space-y-0.5">
        {lines.map((line, i) => {
          if (line.type === 'prompt') return null;
          return (
            <div key={i} className={
              line.type === 'system' ? 'text-muted-foreground' :
              line.type === 'input' ? 'text-primary' :
              line.type === 'error' ? 'text-destructive' :
              'text-foreground whitespace-pre-wrap'
            }>
              {line.text}
            </div>
          );
        })}
        <form onSubmit={handleSubmit} className="flex items-center gap-1">
          <span className="text-primary">$</span>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 bg-transparent outline-none text-foreground caret-primary"
            autoFocus
          />
        </form>
      </div>
    </div>
  );
}
