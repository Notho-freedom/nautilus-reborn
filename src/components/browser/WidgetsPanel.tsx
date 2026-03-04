import { useState, useEffect } from 'react';
import { Clock, Cloud, Quote, Zap, Terminal, Plus, LayoutGrid, Cpu, MemoryStick, Wifi, Layers } from 'lucide-react';
import { SidebarPanelShell } from './SidebarPanelShell';

const DEV_QUOTES = [
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
];

interface WidgetsPanelProps {
  onClose?: () => void;
}

export function WidgetsPanel({ onClose }: WidgetsPanelProps = {}) {
  const [time, setTime] = useState(new Date());
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setQuoteIdx(i => (i + 1) % DEV_QUOTES.length), 10000);
    return () => clearInterval(iv);
  }, []);

  const quote = DEV_QUOTES[quoteIdx];

  return (
    <SidebarPanelShell title="Widgets" icon={LayoutGrid} onClose={onClose ?? (() => {})}>
      <div className="p-3 space-y-3">
        <div className="glass rounded-xl p-3 text-center">
          <Clock size={14} className="text-primary mx-auto mb-1" />
          <div className="text-xl font-display text-foreground tracking-wider">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-[11px] font-body text-muted-foreground">
            {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>

        <div className="glass rounded-xl p-3">
          <div className="flex items-center gap-2">
            <Cloud size={22} className="text-info" />
            <div>
              <div className="text-base font-display text-foreground">22°C</div>
              <div className="text-[11px] font-body text-muted-foreground">Partly Cloudy • Paris</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-3 space-y-2">
          <div className="text-[10px] font-display text-muted-foreground uppercase tracking-widest mb-1">System</div>
          {[
            { icon: Cpu, label: 'CPU', value: '23%' },
            { icon: MemoryStick, label: 'RAM', value: '67%' },
            { icon: Wifi, label: 'Net', value: '↓ 2.3 MB/s' },
            { icon: Layers, label: 'Tabs', value: '4' },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-2 text-[11px] font-body">
              <m.icon size={11} className="text-muted-foreground" />
              <span className="text-muted-foreground flex-1">{m.label}</span>
              <span className="text-foreground font-display text-[10px]">{m.value}</span>
            </div>
          ))}
        </div>

        <div className="glass rounded-xl p-3">
          <Quote size={13} className="text-primary mb-1.5" />
          <p className="text-xs font-body text-foreground italic leading-relaxed">"{quote.text}"</p>
          <p className="text-[10px] font-body text-muted-foreground mt-1.5">— {quote.author}</p>
        </div>

        <div className="glass rounded-xl p-3">
          <div className="text-[10px] font-display text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1">
            <Zap size={10} /> Quick Actions
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { icon: Terminal, label: 'Terminal' },
              { icon: Plus, label: 'New Tab' },
            ].map(a => (
              <button key={a.label} className="flex items-center gap-1.5 px-2 py-2 rounded-lg bg-notilus-surface-1 border border-border text-[11px] font-body text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2 transition-colors duration-fast">
                <a.icon size={11} /> {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SidebarPanelShell>
  );
}
