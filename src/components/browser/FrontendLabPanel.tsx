import { useState, useMemo } from 'react';
import { FlaskConical, Copy, Check } from 'lucide-react';
import { SidebarPanelShell } from './SidebarPanelShell';

interface FrontendLabPanelProps {
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

function ColorPicker() {
  const [color, setColor] = useState('#FF2D55');
  const { copied, copy } = useCopy();

  const hsl = useMemo(() => {
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return `hsl(0, 0%, ${Math.round(l * 100)}%)`;
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  }, [color]);

  const rgb = useMemo(() => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgb(${r}, ${g}, ${b})`;
  }, [color]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
        <div className="flex-1 space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">HEX</span>
            <span className="text-foreground font-mono">{color}</span>
            <button onClick={() => copy(color)} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check size={9} strokeWidth={1.5} /> : <Copy size={9} strokeWidth={1.5} />}
            </button>
          </div>
          <div className="flex items-center gap-1"><span className="text-muted-foreground">HSL</span><span className="text-foreground font-mono text-[9px]">{hsl}</span></div>
          <div className="flex items-center gap-1"><span className="text-muted-foreground">RGB</span><span className="text-foreground font-mono text-[9px]">{rgb}</span></div>
        </div>
      </div>
    </div>
  );
}

function UnitConverter() {
  const [px, setPx] = useState(16);
  const baseFontSize = 16;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <input type="number" value={px} onChange={e => setPx(Number(e.target.value))} className="w-16 h-7 rounded-md bg-notilus-surface-2/50 px-2 text-xs font-mono text-foreground outline-none focus:ring-1 focus:ring-primary/25" />
        <span className="text-muted-foreground">px</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <div className="rounded-md bg-notilus-surface-2/40 p-1.5 text-center">
          <div className="text-muted-foreground">rem</div>
          <div className="text-foreground font-mono tabular-nums">{(px / baseFontSize).toFixed(3)}</div>
        </div>
        <div className="rounded-md bg-notilus-surface-2/40 p-1.5 text-center">
          <div className="text-muted-foreground">em</div>
          <div className="text-foreground font-mono tabular-nums">{(px / baseFontSize).toFixed(3)}</div>
        </div>
        <div className="rounded-md bg-notilus-surface-2/40 p-1.5 text-center">
          <div className="text-muted-foreground">pt</div>
          <div className="text-foreground font-mono tabular-nums">{(px * 0.75).toFixed(1)}</div>
        </div>
      </div>
    </div>
  );
}

function BoxShadowGenerator() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(4);
  const [blur, setBlur] = useState(12);
  const [spread, setSpread] = useState(0);
  const [shadowColor, setShadowColor] = useState('#00000040');
  const { copied, copy } = useCopy();

  const shadow = `${x}px ${y}px ${blur}px ${spread}px ${shadowColor}`;

  return (
    <div className="space-y-2">
      <div className="w-full h-16 rounded-lg bg-notilus-surface-2/40 flex items-center justify-center">
        <div className="w-12 h-8 rounded bg-card" style={{ boxShadow: shadow }} />
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        {[
          { label: 'X', value: x, set: setX },
          { label: 'Y', value: y, set: setY },
          { label: 'Blur', value: blur, set: setBlur },
          { label: 'Spread', value: spread, set: setSpread },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1">
            <span className="text-muted-foreground w-8">{s.label}</span>
            <input type="range" min={-50} max={50} value={s.value} onChange={e => s.set(Number(e.target.value))} className="flex-1 h-1 accent-primary" />
            <span className="text-foreground w-6 text-right font-mono tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <code className="flex-1 text-[9px] font-mono text-foreground bg-notilus-surface-2/50 rounded px-2 py-1 truncate">{shadow}</code>
        <button onClick={() => copy(`box-shadow: ${shadow};`)} className="text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check size={9} strokeWidth={1.5} /> : <Copy size={9} strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  );
}

function GradientGenerator() {
  const [from, setFrom] = useState('#FF2D55');
  const [to, setTo] = useState('#5856D6');
  const [angle, setAngle] = useState(135);
  const { copied, copy } = useCopy();

  const gradient = `linear-gradient(${angle}deg, ${from}, ${to})`;

  return (
    <div className="space-y-2">
      <div className="w-full h-10 rounded-lg" style={{ background: gradient }} />
      <div className="flex items-center gap-2">
        <input type="color" value={from} onChange={e => setFrom(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
        <input type="range" min={0} max={360} value={angle} onChange={e => setAngle(Number(e.target.value))} className="flex-1 h-1 accent-primary" />
        <input type="color" value={to} onChange={e => setTo(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
      </div>
      <div className="flex items-center gap-1">
        <code className="flex-1 text-[9px] font-mono text-foreground bg-notilus-surface-2/50 rounded px-2 py-1 truncate">{gradient}</code>
        <button onClick={() => copy(`background: ${gradient};`)} className="text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check size={9} strokeWidth={1.5} /> : <Copy size={9} strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  );
}

function ContrastChecker() {
  const [fg, setFg] = useState('#FFFFFF');
  const [bg, setBg] = useState('#1A1A2E');

  const luminance = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const linearize = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
  };

  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  const passAA = ratio >= 4.5;
  const passAAA = ratio >= 7;

  return (
    <div className="space-y-2">
      <div className="w-full h-12 rounded-lg flex items-center justify-center text-sm font-display" style={{ backgroundColor: bg, color: fg }}>
        Sample Text
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <input type="color" value={fg} onChange={e => setFg(e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0 p-0" />
          <span className="text-[9px] text-muted-foreground">FG</span>
        </div>
        <div className="flex items-center gap-1">
          <input type="color" value={bg} onChange={e => setBg(e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0 p-0" />
          <span className="text-[9px] text-muted-foreground">BG</span>
        </div>
        <div className="flex-1 text-right text-[10px]">
          <span className="font-mono text-foreground tabular-nums">{ratio.toFixed(2)}:1</span>
          <span className={`ml-1 ${passAAA ? 'text-success' : passAA ? 'text-warning' : 'text-error'}`}>
            {passAAA ? 'AAA ✓' : passAA ? 'AA ✓' : 'Fail ✗'}
          </span>
        </div>
      </div>
    </div>
  );
}

const TOOLS = [
  { id: 'color', label: 'Color Picker', component: ColorPicker },
  { id: 'units', label: 'Unit Converter', component: UnitConverter },
  { id: 'shadow', label: 'Box Shadow', component: BoxShadowGenerator },
  { id: 'gradient', label: 'Gradient', component: GradientGenerator },
  { id: 'contrast', label: 'Contrast', component: ContrastChecker },
];

export function FrontendLabPanel({ onClose }: FrontendLabPanelProps) {
  const [activeTool, setActiveTool] = useState('color');
  const ActiveComponent = TOOLS.find(t => t.id === activeTool)?.component;

  return (
    <SidebarPanelShell title="Frontend Lab" icon={FlaskConical} onClose={onClose ?? (() => {})}>
      <div className="p-3">
        <div className="flex flex-wrap gap-1 mb-3">
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-body transition-colors ${
                activeTool === tool.id
                  ? 'bg-primary/15 text-primary'
                  : 'bg-notilus-surface-2/40 text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2/70'
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>
        {ActiveComponent && (
          <div className="rounded-lg bg-notilus-surface-2/30 p-3">
            <ActiveComponent />
          </div>
        )}
      </div>
    </SidebarPanelShell>
  );
}
