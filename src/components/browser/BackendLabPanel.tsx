import { useState } from 'react';
import { Server, Copy, Check, Play } from 'lucide-react';
import { SidebarPanelShell } from './SidebarPanelShell';

interface BackendLabPanelProps {
  onClose?: () => void;
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return { copied, copy };
}

function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const { copied, copy } = useCopy();

  const format = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
      setOutput('');
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder='{"key": "value"}'
        className="w-full h-20 rounded-md bg-notilus-surface-1 border border-border px-2 py-1.5 text-[10px] font-mono text-foreground placeholder:text-muted-foreground outline-none resize-none"
      />
      <div className="flex gap-1">
        <button onClick={format} className="px-2 py-1 rounded-md notilus-gradient text-[10px] text-primary-foreground">Format</button>
        {output && (
          <button onClick={() => copy(output)} className="px-2 py-1 rounded-md bg-notilus-surface-1 text-[10px] text-muted-foreground hover:text-foreground">
            {copied ? <Check size={9} /> : <Copy size={9} />}
          </button>
        )}
      </div>
      {error && <div className="text-[10px] text-error">{error}</div>}
      {output && <pre className="w-full max-h-32 overflow-auto rounded-md bg-notilus-surface-1 border border-border p-2 text-[9px] font-mono text-foreground">{output}</pre>}
    </div>
  );
}

function Base64Tool() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const { copied, copy } = useCopy();

  const result = (() => {
    try {
      return mode === 'encode' ? btoa(input) : atob(input);
    } catch {
      return 'Invalid input';
    }
  })();

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <button onClick={() => setMode('encode')} className={`px-2 py-1 rounded-md text-[10px] ${mode === 'encode' ? 'bg-primary/15 text-primary' : 'bg-notilus-surface-1 text-muted-foreground'}`}>Encode</button>
        <button onClick={() => setMode('decode')} className={`px-2 py-1 rounded-md text-[10px] ${mode === 'decode' ? 'bg-primary/15 text-primary' : 'bg-notilus-surface-1 text-muted-foreground'}`}>Decode</button>
      </div>
      <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Enter text..." className="w-full h-16 rounded-md bg-notilus-surface-1 border border-border px-2 py-1.5 text-[10px] font-mono text-foreground placeholder:text-muted-foreground outline-none resize-none" />
      <div className="flex items-center gap-1">
        <pre className="flex-1 rounded-md bg-notilus-surface-1 border border-border p-2 text-[9px] font-mono text-foreground truncate">{result}</pre>
        <button onClick={() => copy(result)} className="text-muted-foreground hover:text-foreground">
          {copied ? <Check size={9} /> : <Copy size={9} />}
        </button>
      </div>
    </div>
  );
}

function JwtDecoder() {
  const [token, setToken] = useState('');

  const decoded = (() => {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      return { header, payload };
    } catch {
      return null;
    }
  })();

  return (
    <div className="space-y-2">
      <textarea value={token} onChange={e => setToken(e.target.value)} placeholder="Paste JWT token..." className="w-full h-16 rounded-md bg-notilus-surface-1 border border-border px-2 py-1.5 text-[10px] font-mono text-foreground placeholder:text-muted-foreground outline-none resize-none" />
      {decoded && (
        <div className="space-y-1.5">
          <div>
            <div className="text-[9px] text-muted-foreground uppercase">Header</div>
            <pre className="rounded-md bg-notilus-surface-1 border border-border p-1.5 text-[9px] font-mono text-foreground overflow-auto max-h-20">{JSON.stringify(decoded.header, null, 2)}</pre>
          </div>
          <div>
            <div className="text-[9px] text-muted-foreground uppercase">Payload</div>
            <pre className="rounded-md bg-notilus-surface-1 border border-border p-1.5 text-[9px] font-mono text-foreground overflow-auto max-h-24">{JSON.stringify(decoded.payload, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('gi');
  const [testStr, setTestStr] = useState('');

  const matches = (() => {
    if (!pattern || !testStr) return [];
    try {
      const regex = new RegExp(pattern, flags);
      return Array.from(testStr.matchAll(regex)).map(m => ({
        match: m[0],
        index: m.index ?? 0,
        groups: m.slice(1),
      }));
    } catch {
      return [];
    }
  })();

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <input value={pattern} onChange={e => setPattern(e.target.value)} placeholder="Pattern..." className="flex-1 h-7 rounded-md bg-notilus-surface-1 border border-border px-2 text-[10px] font-mono text-foreground outline-none" />
        <input value={flags} onChange={e => setFlags(e.target.value)} className="w-10 h-7 rounded-md bg-notilus-surface-1 border border-border px-1 text-[10px] font-mono text-foreground outline-none text-center" />
      </div>
      <textarea value={testStr} onChange={e => setTestStr(e.target.value)} placeholder="Test string..." className="w-full h-14 rounded-md bg-notilus-surface-1 border border-border px-2 py-1.5 text-[10px] font-mono text-foreground placeholder:text-muted-foreground outline-none resize-none" />
      <div className="text-[10px]">
        <span className="text-muted-foreground">{matches.length} match{matches.length !== 1 ? 'es' : ''}</span>
        {matches.length > 0 && (
          <div className="mt-1 space-y-0.5 max-h-20 overflow-auto">
            {matches.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-[9px]">
                <span className="text-muted-foreground">@{m.index}</span>
                <span className="text-primary font-mono">"{m.match}"</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UuidGenerator() {
  const [uuid, setUuid] = useState(() => crypto.randomUUID());
  const { copied, copy } = useCopy();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <code className="flex-1 text-[10px] font-mono text-foreground bg-notilus-surface-1 rounded-md border border-border px-2 py-1.5">{uuid}</code>
        <button onClick={() => copy(uuid)} className="text-muted-foreground hover:text-foreground p-1">
          {copied ? <Check size={10} /> : <Copy size={10} />}
        </button>
      </div>
      <button onClick={() => setUuid(crypto.randomUUID())} className="px-3 py-1.5 rounded-md notilus-gradient text-[10px] text-primary-foreground">Generate New</button>
    </div>
  );
}

function TimestampConverter() {
  const [ts, setTs] = useState(() => String(Math.floor(Date.now() / 1000)));

  const date = (() => {
    const num = Number(ts);
    if (Number.isNaN(num)) return null;
    const ms = ts.length <= 10 ? num * 1000 : num;
    return new Date(ms);
  })();

  return (
    <div className="space-y-2">
      <input value={ts} onChange={e => setTs(e.target.value)} placeholder="Unix timestamp..." className="w-full h-7 rounded-md bg-notilus-surface-1 border border-border px-2 text-[10px] font-mono text-foreground outline-none" />
      <div className="flex gap-1">
        <button onClick={() => setTs(String(Math.floor(Date.now() / 1000)))} className="px-2 py-1 rounded-md bg-notilus-surface-1 text-[10px] text-muted-foreground hover:text-foreground">Now (s)</button>
        <button onClick={() => setTs(String(Date.now()))} className="px-2 py-1 rounded-md bg-notilus-surface-1 text-[10px] text-muted-foreground hover:text-foreground">Now (ms)</button>
      </div>
      {date && !Number.isNaN(date.getTime()) && (
        <div className="space-y-0.5 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">UTC</span><span className="text-foreground font-mono">{date.toUTCString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Local</span><span className="text-foreground font-mono">{date.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">ISO</span><span className="text-foreground font-mono text-[9px]">{date.toISOString()}</span></div>
        </div>
      )}
    </div>
  );
}

const TOOLS = [
  { id: 'json', label: 'JSON', component: JsonFormatter },
  { id: 'base64', label: 'Base64', component: Base64Tool },
  { id: 'jwt', label: 'JWT', component: JwtDecoder },
  { id: 'regex', label: 'Regex', component: RegexTester },
  { id: 'uuid', label: 'UUID', component: UuidGenerator },
  { id: 'timestamp', label: 'Timestamp', component: TimestampConverter },
];

export function BackendLabPanel({ onClose }: BackendLabPanelProps) {
  const [activeTool, setActiveTool] = useState('json');
  const ActiveComponent = TOOLS.find(t => t.id === activeTool)?.component;

  return (
    <SidebarPanelShell title="Backend Lab" icon={Server} onClose={onClose ?? (() => {})}>
      <div className="p-2">
        <div className="flex flex-wrap gap-1 mb-3">
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`px-2 py-1 rounded-md text-[10px] font-body transition-colors ${
                activeTool === tool.id
                  ? 'bg-primary/15 text-primary'
                  : 'bg-notilus-surface-1 text-muted-foreground hover:text-foreground'
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>
        {ActiveComponent && <ActiveComponent />}
      </div>
    </SidebarPanelShell>
  );
}
