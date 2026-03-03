import { useState, useEffect } from 'react';
import { Clock, Cloud, Quote, Zap, Terminal, Plus, LayoutGrid } from 'lucide-react';

const DEV_QUOTES = [
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
];

export function WidgetsPanel() {
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
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-mono font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
          <LayoutGrid size={12} /> Widgets
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {/* Clock Widget */}
        <div className="glass rounded-lg p-3 text-center">
          <Clock size={14} className="text-primary mx-auto mb-1" />
          <div className="text-lg font-mono text-foreground">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>

        {/* Weather Placeholder */}
        <div className="glass rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Cloud size={20} className="text-blue-400" />
            <div>
              <div className="text-sm font-mono text-foreground">22°C</div>
              <div className="text-[10px] text-muted-foreground">Partly Cloudy • Paris</div>
            </div>
          </div>
        </div>

        {/* Dev Quote */}
        <div className="glass rounded-lg p-3">
          <Quote size={12} className="text-primary mb-1.5" />
          <p className="text-[11px] text-foreground italic leading-relaxed">"{quote.text}"</p>
          <p className="text-[9px] text-muted-foreground mt-1">— {quote.author}</p>
        </div>

        {/* Quick Actions */}
        <div className="glass rounded-lg p-3">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <Zap size={10} /> Quick Actions
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { icon: Terminal, label: 'Terminal' },
              { icon: Plus, label: 'New Tab' },
            ].map(a => (
              <button key={a.label} className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-secondary/60 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <a.icon size={10} /> {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
